-- Product foundations:
--   * availability-aware matching inputs
--   * an anonymous day-of coordination channel (status only, never chat)
--   * a shared recognition phrase for finding the right stranger
--   * an active-match safety report path that ends the match immediately
--   * explicit, optimized RLS policies for the user-owned tables

alter table public.profiles
  add column rules_acknowledged_at timestamptz;

alter table public.profiles
  add constraint profiles_display_name_length
    check (char_length(display_name) between 1 and 50),
  add constraint profiles_spot_hint_length
    check (char_length(spot_hint) <= 120);

-- Eligibility is a product boundary, not just a client-side validation rule.
-- A trigger keeps direct API writes from creating under-18 accounts while
-- avoiding a time-dependent CHECK constraint that can behave poorly on restore.
create or replace function public.enforce_adult_birthdate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birthdate is not null and (
    new.birthdate > current_date - interval '18 years'
    or new.birthdate < current_date - interval '100 years'
  ) then
    raise exception 'birthdate must indicate an age between 18 and 100'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_adult_birthdate() from public;

create trigger profiles_enforce_adult_birthdate
  before insert or update of birthdate on public.profiles
  for each row execute function public.enforce_adult_birthdate();

alter table public.preferences
  add column available_days smallint[] not null default array[0, 1, 2, 3, 4, 5, 6]::smallint[],
  add column preferred_hour smallint not null default 18;

alter table public.preferences
  add constraint preferences_available_days_valid
    check (
      cardinality(available_days) between 1 and 7
      and available_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    ),
  add constraint preferences_preferred_hour_valid
    check (preferred_hour between 17 and 21);

alter table public.matches
  add column signal_a text,
  add column signal_b text,
  add column signal_a_updated_at timestamptz,
  add column signal_b_updated_at timestamptz,
  add column meeting_phrase text;

alter table public.matches
  add constraint matches_signal_a_valid
    check (signal_a is null or signal_a in ('heading_there', 'arrived', 'running_late', 'cant_make_it')),
  add constraint matches_signal_b_valid
    check (signal_b is null or signal_b in ('heading_there', 'arrived', 'running_late', 'cant_make_it')),
  add constraint matches_meeting_phrase_length
    check (meeting_phrase is null or char_length(meeting_phrase) between 3 and 40);

create unique index match_history_match_id_unique on public.match_history (match_id);
create index profile_interests_interest_id_idx on public.profile_interests (interest_id);
create index meet_feedback_user_id_idx on public.meet_feedback (user_id);
create index reports_match_history_id_idx on public.reports (match_history_id);
create index reports_reporter_idx on public.reports (reporter);

-- These tables are intentionally RPC/service-role only. Explicit false
-- policies document the deny-all contract and make automated audits unambiguous.
create policy "deny client access" on public.matches
  for all to authenticated using (false) with check (false);
create policy "deny client access" on public.match_history
  for all to authenticated using (false) with check (false);
create policy "deny client access" on public.meet_feedback
  for all to authenticated using (false) with check (false);

-- Replace the first-pass policies with explicit role targets and cached
-- auth.uid() evaluation. This keeps authorization clear and avoids evaluating
-- auth.uid() once per row on larger tables.
drop policy "select own profile" on public.profiles;
drop policy "insert own profile" on public.profiles;
drop policy "update own profile" on public.profiles;
create policy "select own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "select own preferences" on public.preferences;
drop policy "insert own preferences" on public.preferences;
drop policy "update own preferences" on public.preferences;
create policy "select own preferences" on public.preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own preferences" on public.preferences
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own preferences" on public.preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "interests readable" on public.interests;
create policy "interests readable" on public.interests
  for select to authenticated using (true);

drop policy "select own interests" on public.profile_interests;
drop policy "insert own interests" on public.profile_interests;
drop policy "delete own interests" on public.profile_interests;
create policy "select own interests" on public.profile_interests
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own interests" on public.profile_interests
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "delete own interests" on public.profile_interests
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy "insert own report" on public.reports;
drop policy "select own reports" on public.reports;
create policy "insert own report" on public.reports
  for insert to authenticated with check ((select auth.uid()) = reporter);
create policy "select own reports" on public.reports
  for select to authenticated using ((select auth.uid()) = reporter);

-- get_current_match v3: adds status-only coordination and reveals the shared
-- recognition phrase shortly before the window. Identities stay fully redacted.
create or replace function public.get_current_match()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.matches%rowtype;
  other uuid;
  other_hint text;
  my_accepted boolean;
  their_accepted boolean;
  my_signal text;
  other_signal text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into m
  from public.matches
  where (user_a = uid or user_b = uid)
    and (
      status in ('pending', 'accepted_a', 'accepted_b')
      or (status = 'committed' and window_end > now())
    )
  order by created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  other := case when m.user_a = uid then m.user_b else m.user_a end;
  my_accepted := m.status = 'committed'
    or (m.status = 'accepted_a' and m.user_a = uid)
    or (m.status = 'accepted_b' and m.user_b = uid);
  their_accepted := m.status = 'committed'
    or (m.status = 'accepted_a' and m.user_b = uid)
    or (m.status = 'accepted_b' and m.user_a = uid);
  my_signal := case when m.user_a = uid then m.signal_a else m.signal_b end;
  other_signal := case when m.user_a = uid then m.signal_b else m.signal_a end;

  if m.status = 'committed' then
    select spot_hint into other_hint from public.profiles where user_id = other;
  end if;

  return jsonb_build_object(
    'match_id', m.id,
    'status', case when m.status = 'committed' then 'committed' else 'pending' end,
    'you_accepted', my_accepted,
    'they_accepted', their_accepted,
    'accept_deadline', m.accept_deadline,
    'venue', case when m.status = 'committed' then jsonb_build_object(
      'name', m.venue_name,
      'address', m.venue_address,
      'lat', m.venue_lat,
      'lng', m.venue_lng,
      'maps_url', m.venue_maps_url
    ) end,
    'window_start', m.window_start,
    'window_end', m.window_end,
    'their_spot_hint', other_hint,
    'your_signal', case when m.status = 'committed' then my_signal end,
    'their_signal', case when m.status = 'committed' then other_signal end,
    'meeting_phrase', case
      when m.status = 'committed' and now() >= m.window_start - interval '30 minutes'
      then m.meeting_phrase
    end
  );
end;
$$;

-- A safety report on a live match both creates the confidential report and
-- dissolves the match. The client never learns the subject's user id.
create or replace function public.report_active_match(
  p_match_id uuid,
  p_category text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.matches%rowtype;
  h_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_category not in ('safety', 'harassment', 'identity', 'other') then
    raise exception 'invalid category';
  end if;
  if char_length(trim(p_reason)) < 10 or char_length(trim(p_reason)) > 1000 then
    raise exception 'report must be between 10 and 1000 characters';
  end if;

  select * into m from public.matches where id = p_match_id for update;
  if not found or (m.user_a <> uid and m.user_b <> uid) then
    raise exception 'match not found';
  end if;

  insert into public.match_history (match_id, user_a, user_b, outcome, matched_on)
  values (m.id, m.user_a, m.user_b, 'declined', m.created_at::date)
  on conflict (match_id) do update set match_id = excluded.match_id
  returning id into h_id;

  insert into public.reports (reporter, match_history_id, reason)
  values (uid, h_id, '[' || p_category || '] ' || trim(p_reason));

  delete from public.matches where id = m.id;
end;
$$;

revoke all on function public.report_active_match(uuid, text, text) from public;
grant execute on function public.report_active_match(uuid, text, text) to authenticated;
