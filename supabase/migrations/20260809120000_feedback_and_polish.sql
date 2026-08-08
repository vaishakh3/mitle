-- Product hardening round:
--  1. meet_feedback: anonymous post-window "did you meet?" signal (+ closure UX)
--  2. matches.reminder_sent: dedupes the "window opens soon" push
--  3. get_current_match v2: committed matches disappear from view the moment
--     the window ends (the cron archives them shortly after)
--  4. Feedback/report RPCs so clients never touch match_history directly

alter table public.matches add column reminder_sent boolean not null default false;

create table public.meet_feedback (
  history_id uuid not null references public.match_history (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  outcome text not null check (outcome in ('met', 'no_show', 'didnt_go')),
  created_at timestamptz not null default now(),
  primary key (history_id, user_id)
);

alter table public.meet_feedback enable row level security;
-- no client policies/grants: RPC-only
grant all on public.meet_feedback to service_role;

-- ---------------------------------------------------------------------------
-- get_current_match v2: treat committed-past-window as gone
-- ---------------------------------------------------------------------------
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
    'their_spot_hint', other_hint
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Post-meet feedback: the latest completed match awaiting this user's answer
-- ---------------------------------------------------------------------------
create or replace function public.get_pending_feedback()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  h public.match_history%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into h
  from public.match_history
  where (user_a = uid or user_b = uid)
    and outcome = 'completed'
    and archived_at > now() - interval '7 days'
    and not exists (
      select 1 from public.meet_feedback f
      where f.history_id = match_history.id and f.user_id = uid
    )
  order by archived_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object('history_id', h.id, 'matched_on', h.matched_on);
end;
$$;

create or replace function public.submit_meet_feedback(
  p_history_id uuid,
  p_outcome text,
  p_report_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  h public.match_history%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_outcome not in ('met', 'no_show', 'didnt_go') then
    raise exception 'invalid outcome';
  end if;

  select * into h from public.match_history where id = p_history_id;
  if not found or (h.user_a <> uid and h.user_b <> uid) then
    raise exception 'not your match';
  end if;

  insert into public.meet_feedback (history_id, user_id, outcome)
  values (p_history_id, uid, p_outcome)
  on conflict (history_id, user_id) do nothing;

  if p_report_reason is not null and length(trim(p_report_reason)) > 0 then
    insert into public.reports (reporter, match_history_id, reason)
    values (uid, p_history_id, trim(p_report_reason));
  end if;
end;
$$;

revoke all on function public.get_pending_feedback() from public;
grant execute on function public.get_pending_feedback() to authenticated;
revoke all on function public.submit_meet_feedback(uuid, text, text) from public;
grant execute on function public.submit_meet_feedback(uuid, text, text) to authenticated;
