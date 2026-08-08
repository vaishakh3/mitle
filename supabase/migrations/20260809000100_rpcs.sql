-- Secure RPCs. These are the ONLY read path for match data, so the other
-- user's identity (name, photo-less profile, anything) can never leak.

-- Returns the caller's current non-terminal match, redacted:
--   * before commit: only status/deadline (no identity, no venue)
--   * after commit:  venue, window, and the other user's spot hint
-- Returns null when there is no active match.
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
    and status in ('pending', 'accepted_a', 'accepted_b', 'committed')
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

revoke all on function public.get_current_match() from public;
grant execute on function public.get_current_match() to authenticated;

-- Full account deletion (cascades through profiles -> everything).
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
