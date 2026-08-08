-- MeetCute initial schema
-- Anonymity model: users can only ever read their own rows. The `matches`
-- table has RLS enabled with NO user policies (deny-all); all match data
-- reaches clients exclusively through the get_current_match() RPC which
-- redacts the other user's identity.

create type public.gender as enum ('man', 'woman', 'nonbinary');

create type public.match_status as enum (
  'pending',      -- created by the daily matcher, neither user has responded
  'accepted_a',   -- user_a accepted, waiting on user_b
  'accepted_b',   -- user_b accepted, waiting on user_a
  'committed',    -- both accepted: venue + window assigned and revealed
  'declined',     -- someone declined (terminal)
  'expired',      -- accept deadline passed (terminal)
  'completed'     -- meet window ended (terminal)
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  birthdate date,
  gender public.gender,
  spot_hint text not null default '',
  lat double precision,
  lng double precision,
  location_updated_at timestamptz,
  expo_push_token text,
  is_paused boolean not null default false,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "select own profile" on public.profiles
  for select using (auth.uid() = user_id);
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- preferences
-- ---------------------------------------------------------------------------
create table public.preferences (
  user_id uuid primary key references public.profiles (user_id) on delete cascade,
  interested_genders public.gender[] not null default '{}',
  age_min int not null default 18 check (age_min >= 18),
  age_max int not null default 99 check (age_max >= 18),
  radius_km int not null default 10 check (radius_km between 1 and 100),
  check (age_min <= age_max)
);

alter table public.preferences enable row level security;

create policy "select own preferences" on public.preferences
  for select using (auth.uid() = user_id);
create policy "insert own preferences" on public.preferences
  for insert with check (auth.uid() = user_id);
create policy "update own preferences" on public.preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- interests catalog + per-user picks
-- ---------------------------------------------------------------------------
create table public.interests (
  id serial primary key,
  slug text unique not null,
  label text not null,
  emoji text not null default ''
);

alter table public.interests enable row level security;

create policy "interests readable" on public.interests
  for select using (auth.role() = 'authenticated');

create table public.profile_interests (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  interest_id int not null references public.interests (id) on delete cascade,
  primary key (user_id, interest_id)
);

alter table public.profile_interests enable row level security;

create policy "select own interests" on public.profile_interests
  for select using (auth.uid() = user_id);
create policy "insert own interests" on public.profile_interests
  for insert with check (auth.uid() = user_id);
create policy "delete own interests" on public.profile_interests
  for delete using (auth.uid() = user_id);

insert into public.interests (slug, label, emoji) values
  ('coffee', 'Coffee', '☕'),
  ('books', 'Books', '📚'),
  ('music', 'Live music', '🎶'),
  ('hiking', 'Hiking', '🥾'),
  ('food', 'Food adventures', '🍜'),
  ('film', 'Film', '🎬'),
  ('art', 'Art & museums', '🎨'),
  ('fitness', 'Fitness', '🏋️'),
  ('travel', 'Travel', '✈️'),
  ('gaming', 'Gaming', '🎮'),
  ('photography', 'Photography', '📷'),
  ('cooking', 'Cooking', '🍳'),
  ('dancing', 'Dancing', '💃'),
  ('pets', 'Pets', '🐾'),
  ('startups', 'Startups & tech', '🚀'),
  ('spirituality', 'Spirituality', '🧘'),
  ('sports', 'Sports', '🏏'),
  ('writing', 'Writing', '✍️'),
  ('nature', 'Nature', '🌿'),
  ('comedy', 'Comedy', '😂');

-- ---------------------------------------------------------------------------
-- matches (deny-all RLS; server-only writes, RPC-only reads)
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (user_id) on delete cascade,
  user_b uuid not null references public.profiles (user_id) on delete cascade,
  status public.match_status not null default 'pending',
  accept_deadline timestamptz not null,
  venue_name text,
  venue_address text,
  venue_lat double precision,
  venue_lng double precision,
  venue_maps_url text,
  window_start timestamptz,
  window_end timestamptz,
  created_at timestamptz not null default now(),
  check (user_a <> user_b)
);

alter table public.matches enable row level security;
-- no policies: only service role and security-definer RPCs can touch this

-- one non-terminal match per user, enforced at the DB level
create unique index one_active_match_a on public.matches (user_a)
  where status in ('pending', 'accepted_a', 'accepted_b', 'committed');
create unique index one_active_match_b on public.matches (user_b)
  where status in ('pending', 'accepted_a', 'accepted_b', 'committed');

-- ---------------------------------------------------------------------------
-- match_history: server-side archive after user-facing deletion.
-- Prevents re-matching the same pair and preserves an abuse-report trail.
-- ---------------------------------------------------------------------------
create table public.match_history (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  user_a uuid not null,
  user_b uuid not null,
  outcome text not null check (outcome in ('declined', 'expired', 'completed')),
  matched_on date not null,
  archived_at timestamptz not null default now()
);

alter table public.match_history enable row level security;
-- no policies: server-only

create index match_history_pair on public.match_history (user_a, user_b);

-- ---------------------------------------------------------------------------
-- reports (trust & safety)
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles (user_id) on delete cascade,
  match_history_id uuid references public.match_history (id),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "insert own report" on public.reports
  for insert with check (auth.uid() = reporter);
create policy "select own reports" on public.reports
  for select using (auth.uid() = reporter);

-- ---------------------------------------------------------------------------
-- Explicit grants (new Supabase projects do not auto-expose tables to API
-- roles). Note: `matches` and `match_history` get NO grants for
-- authenticated - they are reachable only via service role and RPCs.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.preferences to authenticated;
grant select on public.interests to authenticated;
grant select, insert, delete on public.profile_interests to authenticated;
grant select, insert on public.reports to authenticated;

grant all on public.profiles, public.preferences, public.interests,
  public.profile_interests, public.matches, public.match_history,
  public.reports to service_role;
grant usage, select on all sequences in schema public to service_role;
