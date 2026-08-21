// Seeds the LOCAL Supabase stack with fake users around a city center so the
// daily matcher has a pool to work with. Idempotent-ish: skips existing emails.
//
//   npm run db:start && npm run seed
import { createClient } from '@supabase/supabase-js';
import { localSupabaseEnv } from './local-env.mjs';

const { url, serviceKey } = localSupabaseEnv();
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// Bangalore-ish center; spread users a few km apart
const CENTER = { lat: 12.9716, lng: 77.5946 };

const SEED_USERS = [
  { email: 'asha@test.dev', name: 'Asha', gender: 'woman', birthdate: '1998-04-12', into: ['man'], interests: ['coffee', 'books', 'film'], intent: 'long_term', energy: 'quiet', style: 'coffee', budget: 1 },
  { email: 'meera@test.dev', name: 'Meera', gender: 'woman', birthdate: '1996-11-02', into: ['man', 'woman'], interests: ['music', 'art', 'coffee'], intent: 'open', energy: 'lively', style: 'activity', budget: 2 },
  { email: 'diya@test.dev', name: 'Diya', gender: 'woman', birthdate: '2000-01-25', into: ['man'], interests: ['hiking', 'nature', 'photography'], intent: 'figuring_out', energy: 'balanced', style: 'sober', budget: 1 },
  { email: 'rohan@test.dev', name: 'Rohan', gender: 'man', birthdate: '1995-07-19', into: ['woman'], interests: ['coffee', 'books', 'startups'], intent: 'long_term', energy: 'quiet', style: 'coffee', budget: 1 },
  { email: 'arjun@test.dev', name: 'Arjun', gender: 'man', birthdate: '1997-09-30', into: ['woman'], interests: ['music', 'film', 'comedy'], intent: 'open', energy: 'lively', style: 'activity', budget: 2 },
  { email: 'kabir@test.dev', name: 'Kabir', gender: 'man', birthdate: '1999-03-08', into: ['woman', 'nonbinary'], interests: ['hiking', 'fitness', 'travel'], intent: 'figuring_out', energy: 'balanced', style: 'sober', budget: 1 },
  { email: 'sam@test.dev', name: 'Sam', gender: 'nonbinary', birthdate: '1998-12-14', into: ['nonbinary', 'man'], interests: ['art', 'writing', 'coffee'], intent: 'open', energy: 'balanced', style: 'anything', budget: 2 },
];

const HINTS = [
  'Red scarf, probably reading a book',
  'Green jacket, doodling on a napkin',
  'Big headphones, bigger smile',
  'Blue kurta, window seat if I can get it',
  'Tote bag full of books',
  'Curly hair, iced coffee no matter the weather',
  'Yellow sneakers, people-watching',
];

const { data: interestRows, error: iErr } = await db.from('interests').select('id, slug');
if (iErr) throw iErr;
const interestBySlug = new Map(interestRows.map((r) => [r.slug, r.id]));

const { data: existing } = await db.auth.admin.listUsers({ perPage: 1000 });
const existingByEmail = new Map((existing?.users ?? []).map((u) => [u.email, u.id]));

let created = 0;
for (let i = 0; i < SEED_USERS.length; i++) {
  const u = SEED_USERS[i];
  let userId = existingByEmail.get(u.email);
  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      email_confirm: true,
      password: 'meetcute-test-123',
    });
    if (error) throw error;
    userId = data.user.id;
    created++;
  }

  // scatter within ~4km of center
  const lat = CENTER.lat + (Math.random() - 0.5) * 0.07;
  const lng = CENTER.lng + (Math.random() - 0.5) * 0.07;

  const { error: pErr } = await db.from('profiles').upsert({
    user_id: userId,
    display_name: u.name,
    birthdate: u.birthdate,
    gender: u.gender,
    spot_hint: HINTS[i % HINTS.length],
    lat,
    lng,
    location_updated_at: new Date().toISOString(),
    onboarding_complete: true,
  });
  if (pErr) throw pErr;

  const { error: prErr } = await db.from('preferences').upsert({
    user_id: userId,
    interested_genders: u.into,
    age_min: 21,
    age_max: 40,
    radius_km: 25,
    relationship_intent: u.intent,
    social_energy: u.energy,
    date_style: u.style,
    budget_level: u.budget,
  });
  if (prErr) throw prErr;

  await db.from('profile_interests').delete().eq('user_id', userId);
  const ids = u.interests.map((s) => interestBySlug.get(s)).filter(Boolean);
  if (ids.length > 0) {
    const { error: piErr } = await db
      .from('profile_interests')
      .insert(ids.map((id) => ({ user_id: userId, interest_id: id })));
    if (piErr) throw piErr;
  }
}

console.log(`Seeded ${SEED_USERS.length} users (${created} newly created).`);
console.log('All seed users sign in with OTP, or password meetcute-test-123.');
