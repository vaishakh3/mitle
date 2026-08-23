// Shoots README screenshots of the running web app (Metro on :8081) at an
// iPhone viewport, staging demo users + matches for every product state.
//   npm run db:start && npx expo start --web   (in apps/mobile)
//   node scripts/screenshots.mjs
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { localSupabaseEnv } from './local-env.mjs';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8081';
const OUT = new URL('../docs/screens/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const { url, serviceKey, anonKey } = localSupabaseEnv();
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const PASSWORD = 'meetcute-shot-123';

async function ensureUser(email, profile, prefs) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: PASSWORD,
    });
    if (error) throw error;
    user = data.user;
  }
  if (profile) {
    const { error } = await admin
      .from('profiles')
      .upsert({ user_id: user.id, ...profile });
    if (error) throw error;
  }
  if (prefs) {
    const { error } = await admin.from('preferences').upsert({ user_id: user.id, ...prefs });
    if (error) throw error;
  }
  return user;
}

async function sessionFor(email) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return data.session;
}

const BLR = { lat: 12.9716, lng: 77.5946 };
const nowIso = () => new Date().toISOString();

// --- stage demo users ------------------------------------------------------
const demoProfile = (name, gender, hint) => ({
  display_name: name,
  birthdate: '1999-03-14',
  gender,
  spot_hint: hint,
  lat: BLR.lat,
  lng: BLR.lng,
  location_updated_at: nowIso(),
  onboarding_complete: true,
  is_paused: true, // never leak into the real matching pool
});
const demoPrefs = { interested_genders: ['man', 'woman'], age_min: 21, age_max: 35, radius_km: 25 };

const ada = await ensureUser('shot-ada@test.dev', demoProfile('Ada', 'woman', 'Red scarf, probably reading a book'), demoPrefs);
const leo = await ensureUser('shot-leo@test.dev', demoProfile('Leo', 'man', 'Green jacket, doodling on a napkin'), demoPrefs);
const noa = await ensureUser('shot-noa@test.dev', demoProfile('Noa', 'woman', 'Big headphones, bigger smile'), demoPrefs);
const fin = await ensureUser('shot-fin@test.dev', demoProfile('Fin', 'man', 'Yellow sneakers, people-watching'), demoPrefs);
const rawUser = await ensureUser('shot-raw@test.dev', null, null); // onboarding state

// --- stage match states ----------------------------------------------------
// clean any previous staging
const demoIds = [ada.id, leo.id, noa.id, fin.id];
await admin.from('matches').delete().or(
  demoIds.flatMap((id) => [`user_a.eq.${id}`, `user_b.eq.${id}`]).join(','),
);

// Ada x Leo: pending (sealed letter / accept card)
const deadline = new Date(Date.now() + 5 * 3600e3 + 23 * 60e3).toISOString();
const { error: mErr } = await admin.from('matches').insert({
  user_a: ada.id,
  user_b: leo.id,
  status: 'pending',
  accept_deadline: deadline,
});
if (mErr) throw mErr;

// Noa x Fin: committed tomorrow 18:00 local (the ticket)
const windowStart = new Date();
windowStart.setDate(windowStart.getDate() + 1);
windowStart.setHours(18, 0, 0, 0);
const windowEnd = new Date(windowStart.getTime() + 3600e3);
const { error: cErr } = await admin.from('matches').insert({
  user_a: noa.id,
  user_b: fin.id,
  status: 'committed',
  accept_deadline: nowIso(),
  venue_name: "Koshy's",
  venue_address: '39 St Marks Rd, Bengaluru',
  venue_lat: 12.9733,
  venue_lng: 77.6016,
  venue_maps_url: 'https://maps.google.com/?q=Koshys+Bangalore',
  window_start: windowStart.toISOString(),
  window_end: windowEnd.toISOString(),
});
if (cErr) throw cErr;

// Ada also gets a completed history entry awaiting feedback? No - Ada has a
// pending match; feedback card shows only without an active match. Use a
// dedicated user for the feedback state:
const eve = await ensureUser('shot-eve@test.dev', demoProfile('Eve', 'woman', 'Blue kurta, window seat'), demoPrefs);
await admin.from('matches').delete().or(`user_a.eq.${eve.id},user_b.eq.${eve.id}`);
await admin.from('meet_feedback').delete().eq('user_id', eve.id);
const { data: hist, error: hErr } = await admin
  .from('match_history')
  .insert({
    match_id: crypto.randomUUID(),
    user_a: eve.id,
    user_b: fin.id,
    outcome: 'completed',
    matched_on: new Date().toISOString().slice(0, 10),
  })
  .select()
  .single();
if (hErr) throw hErr;

// --- shoot -----------------------------------------------------------------
const storageKeyHost = new URL(
  execSync(`grep EXPO_PUBLIC_SUPABASE_URL ${new URL('../apps/mobile/.env', import.meta.url).pathname} | cut -d= -f2`, { encoding: 'utf8' }).trim(),
).hostname.split('.')[0];

const browser = await chromium.launch();

async function shoot(name, session, { before, waitMs = 3200 } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    permissions: ['geolocation'],
    geolocation: { latitude: BLR.lat, longitude: BLR.lng },
  });
  if (session) {
    const payload = JSON.stringify(session);
    await context.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key, value);
      },
      [`sb-${storageKeyHost}-auth-token`, payload],
    );
  }
  const page = await context.newPage();
  await page.goto(APP_URL, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(waitMs);
  if (before) await before(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await context.close();
  console.log(`shot ${name}.png`);
}

await shoot('01-signin', null);
await shoot('02-sealed', await sessionFor('shot-ada@test.dev'));
await shoot('03-match', await sessionFor('shot-ada@test.dev'), {
  before: async (page) => {
    // click the wax seal (sits ~90px above its caption)
    const caption = await page.getByText('BREAK THE SEAL').boundingBox();
    if (caption) {
      await page.mouse.click(caption.x + caption.width / 2, caption.y - 90);
    }
    await page.waitForTimeout(2000);
  },
});
await shoot('04-ticket', await sessionFor('shot-noa@test.dev'));
await shoot('05-feedback', await sessionFor('shot-eve@test.dev'));
await shoot('06-onboarding', await sessionFor('shot-raw@test.dev'));

await browser.close();
console.log(`done -> ${OUT}`);
