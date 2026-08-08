// Daily matcher (cron). Builds the pool of eligible users, runs the hidden
// algorithm, inserts pending matches, and notifies both users.
import { adminClient, checkCronSecret, json } from '../_shared/db.ts';
import { ageFromBirthdate, Candidate, Gender, pairKey, pairPool } from '../_shared/matching.ts';
import { sendPush } from '../_shared/push.ts';

const ACCEPT_WINDOW_HOURS = 6;
const LOCATION_MAX_AGE_DAYS = 30;

Deno.serve(async (req) => {
  if (!checkCronSecret(req)) return json({ error: 'forbidden' }, 403);
  const db = adminClient();

  // 1. Pool: complete, unpaused profiles with a fresh location
  const locationCutoff = new Date(
    Date.now() - LOCATION_MAX_AGE_DAYS * 24 * 3600 * 1000,
  ).toISOString();
  const { data: profiles, error: pErr } = await db
    .from('profiles')
    .select(
      'user_id, birthdate, gender, lat, lng, expo_push_token, preferences(interested_genders, age_min, age_max, radius_km), profile_interests(interest_id)',
    )
    .eq('onboarding_complete', true)
    .eq('is_paused', false)
    .not('lat', 'is', null)
    .gte('location_updated_at', locationCutoff);
  if (pErr) return json({ error: pErr.message }, 500);

  // 2. Exclude users with an active match
  const { data: active, error: aErr } = await db
    .from('matches')
    .select('user_a, user_b')
    .in('status', ['pending', 'accepted_a', 'accepted_b', 'committed']);
  if (aErr) return json({ error: aErr.message }, 500);
  const busy = new Set<string>();
  for (const m of active ?? []) {
    busy.add(m.user_a);
    busy.add(m.user_b);
  }

  // 3. Never re-match a previous pair
  const { data: history, error: hErr } = await db
    .from('match_history')
    .select('user_a, user_b');
  if (hErr) return json({ error: hErr.message }, 500);
  const previousPairs = new Set((history ?? []).map((h) => pairKey(h.user_a, h.user_b)));

  const pool: Candidate[] = [];
  for (const p of profiles ?? []) {
    const prefs = Array.isArray(p.preferences) ? p.preferences[0] : p.preferences;
    if (busy.has(p.user_id) || !prefs || !p.birthdate || !p.gender) continue;
    pool.push({
      userId: p.user_id,
      gender: p.gender as Gender,
      age: ageFromBirthdate(p.birthdate),
      lat: p.lat!,
      lng: p.lng!,
      interestedGenders: prefs.interested_genders as Gender[],
      ageMin: prefs.age_min,
      ageMax: prefs.age_max,
      radiusKm: prefs.radius_km,
      interests: (p.profile_interests ?? []).map((i: { interest_id: number }) =>
        String(i.interest_id),
      ),
    });
  }

  // 4. Run the hidden algorithm
  const pairs = pairPool(pool, previousPairs);

  // 5. Insert pending matches + notify
  const deadline = new Date(Date.now() + ACCEPT_WINDOW_HOURS * 3600 * 1000).toISOString();
  const tokenByUser = new Map(
    (profiles ?? []).map((p) => [p.user_id, p.expo_push_token as string | null]),
  );
  let created = 0;
  for (const pair of pairs) {
    const { error } = await db.from('matches').insert({
      user_a: pair.a,
      user_b: pair.b,
      status: 'pending',
      accept_deadline: deadline,
    });
    if (error) {
      console.error('insert match failed', error.message);
      continue;
    }
    created++;
    await sendPush(
      [pair.a, pair.b]
        .map((u) => tokenByUser.get(u))
        .filter((t): t is string => !!t)
        .map((to) => ({
          to,
          title: 'You have a match today',
          body: 'Someone out there just got matched with you. Accept before it slips away.',
        })),
    );
  }

  return json({ pool: pool.length, pairs: pairs.length, created });
});
