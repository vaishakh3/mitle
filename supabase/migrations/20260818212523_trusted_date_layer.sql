-- Trusted-date layer:
--   * private compatibility signals that improve pairing without profiles
--   * a 24-hour attendance confirmation ladder
--   * a mutual-only "Second Chapter" note after a completed meet

alter table public.preferences
  add column relationship_intent text not null default 'open',
  add column social_energy text not null default 'balanced',
  add column date_style text not null default 'coffee',
  add column budget_level smallint not null default 2;

alter table public.preferences
  add constraint preferences_relationship_intent_valid
    check (relationship_intent in ('long_term', 'open', 'figuring_out')),
  add constraint preferences_social_energy_valid
    check (social_energy in ('quiet', 'balanced', 'lively')),
  add constraint preferences_date_style_valid
    check (date_style in ('coffee', 'activity', 'sober', 'anything')),
  add constraint preferences_budget_level_valid
    check (budget_level between 1 and 3);

alter table public.matches
  add column confirmation_a_at timestamptz,
  add column confirmation_b_at timestamptz;

alter table public.meet_feedback
  add column second_chapter boolean,
  add column second_chapter_note text,
  add column second_chapter_seen_at timestamptz;

alter table public.meet_feedback
  add constraint meet_feedback_second_chapter_valid
    check (
      second_chapter is not true
      or (
        outcome = 'met'
        and second_chapter_note is not null
        and char_length(second_chapter_note) between 8 and 240
      )
    ),
  add constraint meet_feedback_second_chapter_note_length
    check (second_chapter_note is null or char_length(second_chapter_note) <= 240);

-- Match payload v4. Confirmations remain anonymous: a participant learns only
-- whether each side reaffirmed the plan, never who the other member is.
create or replace function public.get_current_match()
returns jsonb
language plpgsql
security definer
set search_path = ''
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
  my_confirmation timestamptz;
  other_confirmation timestamptz;
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
  my_confirmation := case
    when m.user_a = uid then m.confirmation_a_at else m.confirmation_b_at end;
  other_confirmation := case
    when m.user_a = uid then m.confirmation_b_at else m.confirmation_a_at end;

  if m.status = 'committed' then
    select spot_hint into other_hint
    from public.profiles
    where user_id = other;
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
    'you_confirmed', case when m.status = 'committed' then my_confirmation is not null end,
    'they_confirmed', case when m.status = 'committed' then other_confirmation is not null end,
    'confirmation_opens_at', case
      when m.status = 'committed' then m.window_start - interval '24 hours' end,
    'meeting_phrase', case
      when m.status = 'committed' and now() >= m.window_start - interval '30 minutes'
      then m.meeting_phrase
    end
  );
end;
$$;

-- A second, deliberate confirmation makes the commitment legible without
-- introducing chat or exposing identity.
create or replace function public.confirm_meet(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  m public.matches%rowtype;
  confirmed_at timestamptz := now();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into m
  from public.matches
  where id = p_match_id
  for update;

  if not found or (m.user_a <> uid and m.user_b <> uid) then
    raise exception 'match not found';
  end if;
  if m.status <> 'committed' or m.window_end <= now() then
    raise exception 'match is not open for confirmation';
  end if;
  if now() < m.window_start - interval '24 hours' then
    raise exception 'confirmation opens 24 hours before the meet';
  end if;

  if m.user_a = uid then
    update public.matches
    set confirmation_a_at = coalesce(confirmation_a_at, confirmed_at)
    where id = p_match_id
    returning confirmation_a_at into confirmed_at;
  else
    update public.matches
    set confirmation_b_at = coalesce(confirmation_b_at, confirmed_at)
    where id = p_match_id
    returning confirmation_b_at into confirmed_at;
  end if;

  return jsonb_build_object('confirmed_at', confirmed_at);
end;
$$;

revoke all on function public.confirm_meet(uuid) from public, anon;
grant execute on function public.confirm_meet(uuid) to authenticated;

-- Extend private feedback with an optional mutual-only note. A note is never
-- returned unless both people independently asked for a Second Chapter.
drop function public.submit_meet_feedback(uuid, text, text);

create function public.submit_meet_feedback(
  p_history_id uuid,
  p_outcome text,
  p_report_reason text default null,
  p_second_chapter boolean default null,
  p_second_chapter_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  h public.match_history%rowtype;
  clean_note text := nullif(trim(p_second_chapter_note), '');
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_outcome not in ('met', 'no_show', 'didnt_go') then
    raise exception 'invalid outcome';
  end if;

  select * into h
  from public.match_history
  where id = p_history_id;
  if not found or (h.user_a <> uid and h.user_b <> uid) then
    raise exception 'not your match';
  end if;

  if p_outcome <> 'met' then
    p_second_chapter := null;
    clean_note := null;
  elsif p_second_chapter is true
    and (clean_note is null or char_length(clean_note) < 8 or char_length(clean_note) > 240)
  then
    raise exception 'a Second Chapter note must be between 8 and 240 characters';
  elsif p_second_chapter is not true then
    clean_note := null;
  end if;

  insert into public.meet_feedback (
    history_id,
    user_id,
    outcome,
    second_chapter,
    second_chapter_note
  ) values (
    p_history_id,
    uid,
    p_outcome,
    p_second_chapter,
    clean_note
  )
  on conflict (history_id, user_id) do nothing;

  if p_report_reason is not null and char_length(trim(p_report_reason)) > 0 then
    insert into public.reports (reporter, match_history_id, reason)
    values (uid, p_history_id, left(trim(p_report_reason), 1000));
  end if;
end;
$$;

revoke all on function public.submit_meet_feedback(uuid, text, text, boolean, text)
  from public, anon;
grant execute on function public.submit_meet_feedback(uuid, text, text, boolean, text)
  to authenticated;

create or replace function public.get_second_chapter_result()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select jsonb_build_object(
    'history_id', h.id,
    'matched_on', h.matched_on,
    'note', theirs.second_chapter_note
  ) into result
  from public.match_history h
  join public.meet_feedback mine
    on mine.history_id = h.id and mine.user_id = uid
  join public.meet_feedback theirs
    on theirs.history_id = h.id and theirs.user_id <> uid
  where (h.user_a = uid or h.user_b = uid)
    and h.outcome = 'completed'
    and h.archived_at > now() - interval '7 days'
    and mine.outcome = 'met'
    and theirs.outcome = 'met'
    and mine.second_chapter is true
    and theirs.second_chapter is true
    and mine.second_chapter_seen_at is null
  order by h.archived_at desc
  limit 1;

  return result;
end;
$$;

revoke all on function public.get_second_chapter_result() from public, anon;
grant execute on function public.get_second_chapter_result() to authenticated;

create or replace function public.dismiss_second_chapter(p_history_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update public.meet_feedback mine
  set second_chapter_seen_at = now()
  where mine.history_id = p_history_id
    and mine.user_id = uid
    and mine.second_chapter is true
    and exists (
      select 1
      from public.meet_feedback theirs
      where theirs.history_id = mine.history_id
        and theirs.user_id <> uid
        and theirs.outcome = 'met'
        and theirs.second_chapter is true
    );
end;
$$;

revoke all on function public.dismiss_second_chapter(uuid) from public, anon;
grant execute on function public.dismiss_second_chapter(uuid) to authenticated;
