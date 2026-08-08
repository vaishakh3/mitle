// End-to-end verification of the full match loop on the local stack.
// Requires: db:start + seed + functions:serve + at least one trigger:match run.
//   npm run verify:e2e
import { createClient } from '@supabase/supabase-js';
import { localSupabaseEnv } from './local-env.mjs';

const { url, serviceKey, anonKey } = localSupabaseEnv();
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
  if (!cond) failures++;
}

// --- find a pending match created by daily-match
const { data: matches } = await admin.from('matches').select('*').eq('status', 'pending');
check('daily-match created pending matches', matches.length > 0, `${matches.length} pending`);
const m = matches[0];

const { data: profs } = await admin
  .from('profiles')
  .select('user_id, display_name, spot_hint')
  .in('user_id', [m.user_a, m.user_b]);
const profA = profs.find((p) => p.user_id === m.user_a);
const profB = profs.find((p) => p.user_id === m.user_b);

const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
const emailOf = (id) => users.users.find((u) => u.id === id)?.email;

async function signIn(userId) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: emailOf(userId),
    password: 'meetcute-test-123',
  });
  if (error) throw error;
  return { client, session: data.session };
}

const a = await signIn(m.user_a);
const b = await signIn(m.user_b);
console.log(`\nMatched pair: ${profA.display_name} + ${profB.display_name}\n`);

// --- RLS leak checks
const { data: directMatches } = await a.client.from('matches').select('*');
check('RLS: direct select on matches returns nothing', (directMatches ?? []).length === 0);
const { data: otherProfile } = await a.client
  .from('profiles')
  .select('*')
  .eq('user_id', m.user_b);
check('RLS: cannot read the other user profile', (otherProfile ?? []).length === 0);
const { data: ownProfile } = await a.client.from('profiles').select('*');
check('RLS: can read own profile', ownProfile?.length === 1);

// --- pending state via RPC (redacted)
const { data: cmA } = await a.client.rpc('get_current_match');
check('RPC: A sees a pending match', cmA?.status === 'pending');
check('RPC: no venue before commit', cmA?.venue == null);
check('RPC: no spot hint before commit', cmA?.their_spot_hint == null);
check(
  'RPC: no identity fields leak',
  !JSON.stringify(cmA).includes(profB.display_name) && !JSON.stringify(cmA).includes(m.user_b),
);

// --- accept flow
async function respond(session, action) {
  const res = await fetch(`${url}/functions/v1/respond-match`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ matchId: m.id, action }),
  });
  return { status: res.status, body: await res.json() };
}

const r1 = await respond(a.session, 'accept');
check('accept #1 -> waiting', r1.status === 200 && r1.body.status === 'waiting', JSON.stringify(r1.body));

const { data: cmB1 } = await b.client.rpc('get_current_match');
check('B sees they_accepted=true after A accepts', cmB1?.they_accepted === true);
check('B still sees no venue', cmB1?.venue == null);

const r2 = await respond(b.session, 'accept');
check('accept #2 -> committed', r2.status === 200 && r2.body.status === 'committed', JSON.stringify(r2.body));

const { data: cmA2 } = await a.client.rpc('get_current_match');
check('committed: venue revealed', !!cmA2?.venue?.name, cmA2?.venue?.name);
check('committed: window set', !!cmA2?.window_start && !!cmA2?.window_end);
check(
  'committed: A sees B spot hint',
  cmA2?.their_spot_hint === profB.spot_hint,
  `"${cmA2?.their_spot_hint}"`,
);
const { data: cmB2 } = await b.client.rpc('get_current_match');
check('committed: B sees A spot hint', cmB2?.their_spot_hint === profA.spot_hint);
check('committed: still no names/ids leak', !JSON.stringify(cmA2).includes(profB.display_name));

// --- double-accept is idempotent-safe
const r3 = await respond(a.session, 'accept');
check('re-accepting a committed match is rejected', r3.status === 409, JSON.stringify(r3.body));

// --- expiry: force the window into the past, run the sweeper
await admin
  .from('matches')
  .update({
    window_start: new Date(Date.now() - 2 * 3600e3).toISOString(),
    window_end: new Date(Date.now() - 3600e3).toISOString(),
  })
  .eq('id', m.id);
const sweep = await fetch(`${url}/functions/v1/expire-matches`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${anonKey}` },
});
const sweepBody = await sweep.json();
check('expire-matches sweeps ended windows', sweepBody.completed >= 1, JSON.stringify(sweepBody));

const { data: gone } = await admin.from('matches').select('*').eq('id', m.id);
check('match row deleted after window', gone.length === 0);
const { data: hist } = await admin.from('match_history').select('*').eq('match_id', m.id);
check('match archived to history as completed', hist.length === 1 && hist[0].outcome === 'completed');
const { data: cmA3 } = await a.client.rpc('get_current_match');
check('RPC returns null after deletion', cmA3 === null);

// --- decline flow on a second pending match
const { data: rest } = await admin.from('matches').select('*').eq('status', 'pending');
if (rest.length > 0) {
  const m2 = rest[0];
  const c = await signIn(m2.user_a);
  const res = await fetch(`${url}/functions/v1/respond-match`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId: m2.id, action: 'decline' }),
  });
  const body = await res.json();
  check('decline dissolves the match', res.status === 200 && body.status === 'declined');
  const { data: gone2 } = await admin.from('matches').select('*').eq('id', m2.id);
  const { data: hist2 } = await admin.from('match_history').select('*').eq('match_id', m2.id);
  check('declined match deleted + archived', gone2.length === 0 && hist2[0]?.outcome === 'declined');
}

// --- non-participant cannot respond to someone else's match
const { data: rest2 } = await admin.from('matches').select('*').eq('status', 'pending');
if (rest2.length > 0) {
  const m3 = rest2[0];
  const outsiderId = users.users.find(
    (u) => u.id !== m3.user_a && u.id !== m3.user_b && u.email?.endsWith('@test.dev'),
  )?.id;
  const o = await signIn(outsiderId);
  const res = await fetch(`${url}/functions/v1/respond-match`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${o.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId: m3.id, action: 'accept' }),
  });
  check('outsider cannot respond to a match', res.status === 404);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
