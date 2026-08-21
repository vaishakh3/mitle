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

// --- find a pending match created by daily-match (seed users only: real
// accounts sign in via OTP and have no test password)
const { data: usersAll } = await admin.auth.admin.listUsers({ perPage: 1000 });
const seedIds = new Set(
  usersAll.users.filter((u) => u.email?.endsWith('@test.dev')).map((u) => u.id),
);
const { data: allPending } = await admin.from('matches').select('*').eq('status', 'pending');
const matches = (allPending ?? []).filter((m) => seedIds.has(m.user_a) && seedIds.has(m.user_b));
check('daily-match created pending matches', matches.length > 0, `${matches.length} pending`);
const m = matches[0];

const { data: profs } = await admin
  .from('profiles')
  .select('user_id, display_name, spot_hint')
  .in('user_id', [m.user_a, m.user_b]);
const profA = profs.find((p) => p.user_id === m.user_a);
const profB = profs.find((p) => p.user_id === m.user_b);

const users = usersAll;
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
const under18Date = new Date();
under18Date.setUTCFullYear(under18Date.getUTCFullYear() - 16);
const { error: under18Error } = await a.client
  .from('profiles')
  .update({ birthdate: under18Date.toISOString().slice(0, 10) })
  .eq('user_id', m.user_a);
check(
  'eligibility: database rejects an under-18 birthdate',
  under18Error?.code === '23514',
  under18Error?.message,
);

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
check('recognition phrase stays hidden until shortly before the meet', cmA2?.meeting_phrase == null);
check('commitment starts unconfirmed on both sides', cmA2?.you_confirmed === false && cmA2?.they_confirmed === false);
const { error: tooEarlyConfirmation } = await a.client.rpc('confirm_meet', { p_match_id: m.id });
check(
  'attendance confirmation cannot be made early',
  tooEarlyConfirmation?.message?.includes('opens 24 hours'),
  tooEarlyConfirmation?.message,
);
check(
  'committed: A sees B spot hint',
  cmA2?.their_spot_hint === profB.spot_hint,
  `"${cmA2?.their_spot_hint}"`,
);
const { data: cmB2 } = await b.client.rpc('get_current_match');
check('committed: B sees A spot hint', cmB2?.their_spot_hint === profA.spot_hint);
check('committed: still no names/ids leak', !JSON.stringify(cmA2).includes(profB.display_name));

// --- day-of coordination: reveal the recognition phrase and exchange a
// status-only signal without identity leakage
await admin
  .from('matches')
  .update({
    window_start: new Date(Date.now() + 20 * 60000).toISOString(),
    window_end: new Date(Date.now() + 80 * 60000).toISOString(),
  })
  .eq('id', m.id);
const { data: cmDayOf } = await a.client.rpc('get_current_match');
check('recognition phrase appears near the meet', typeof cmDayOf?.meeting_phrase === 'string');
const { error: confirmationAError } = await a.client.rpc('confirm_meet', { p_match_id: m.id });
check('A can reaffirm within 24 hours', !confirmationAError, confirmationAError?.message);
const { data: cmBConfirmation } = await b.client.rpc('get_current_match');
check('B sees A as anonymously confirmed', cmBConfirmation?.they_confirmed === true && cmBConfirmation?.you_confirmed === false);
const { error: confirmationBError } = await b.client.rpc('confirm_meet', { p_match_id: m.id });
check('B can reaffirm within 24 hours', !confirmationBError, confirmationBError?.message);
const { data: cmBothConfirmed } = await a.client.rpc('get_current_match');
check('both sides see a current mutual commitment', cmBothConfirmed?.you_confirmed === true && cmBothConfirmed?.they_confirmed === true);
const signalRes = await fetch(`${url}/functions/v1/update-meet-signal`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${a.session.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ matchId: m.id, signal: 'arrived' }),
});
check('day-of status endpoint accepts a valid signal', signalRes.status === 200, await signalRes.text());
const { data: cmAfterSignal } = await b.client.rpc('get_current_match');
check('other person sees the anonymous arrival status', cmAfterSignal?.their_signal === 'arrived');
check('day-of status still leaks no identity', !JSON.stringify(cmAfterSignal).includes(m.user_a));

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
const { data: cmPastWindow } = await a.client.rpc('get_current_match');
check('RPC hides committed match once window ends (pre-sweep)', cmPastWindow === null);
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

// --- feedback flow on the completed match
const { data: fbA } = await a.client.rpc('get_pending_feedback');
check('pending feedback offered after completion', fbA?.history_id === hist[0].id);
const noteA = 'Coffee again? I am @the-other-side-of-the-table.';
const noteB = 'I would like that. Find me at @still-curious.';
const { error: fbErr } = await a.client.rpc('submit_meet_feedback', {
  p_history_id: fbA.history_id,
  p_outcome: 'met',
  p_report_reason: null,
  p_second_chapter: true,
  p_second_chapter_note: noteA,
});
check('Second Chapter note submits without error', !fbErr, fbErr?.message);
const { data: fbA2 } = await a.client.rpc('get_pending_feedback');
check('feedback prompt clears after submit', fbA2 === null);
const { data: chapterBeforeMutual } = await a.client.rpc('get_second_chapter_result');
check('Second Chapter stays sealed after one yes', chapterBeforeMutual === null);
const { error: fbBErr } = await b.client.rpc('submit_meet_feedback', {
  p_history_id: fbA.history_id,
  p_outcome: 'met',
  p_report_reason: null,
  p_second_chapter: true,
  p_second_chapter_note: noteB,
});
check('other person can independently choose a Second Chapter', !fbBErr, fbBErr?.message);
const { data: chapterA } = await a.client.rpc('get_second_chapter_result');
const { data: chapterB } = await b.client.rpc('get_second_chapter_result');
check('mutual choice reveals only the other note to A', chapterA?.note === noteB);
check('mutual choice reveals only the other note to B', chapterB?.note === noteA);
check(
  'Second Chapter response leaks no member identity',
  !JSON.stringify(chapterA).includes(m.user_b) && !JSON.stringify(chapterA).includes(profB.display_name),
);
const { error: dismissErr } = await a.client.rpc('dismiss_second_chapter', { p_history_id: fbA.history_id });
check('A can close the revealed chapter', !dismissErr, dismissErr?.message);
const { data: chapterAfterDismiss } = await a.client.rpc('get_second_chapter_result');
check('a closed chapter is not shown again', chapterAfterDismiss === null);
const { data: fbRows } = await admin.from('meet_feedback').select('*').eq('history_id', fbA.history_id);
check('both feedback rows are recorded', fbRows.length === 2 && fbRows.every((row) => row.outcome === 'met'));
const { error: fbOtherErr } = await b.client.rpc('submit_meet_feedback', {
  p_history_id: fbA.history_id,
  p_outcome: 'met',
  p_report_reason: 'test report',
  p_second_chapter: true,
  p_second_chapter_note: noteB,
});
check('other side can report via feedback', !fbOtherErr);
const { data: repRows } = await admin.from('reports').select('*').eq('match_history_id', fbA.history_id);
check('report row recorded', repRows.length === 1);

// --- non-participant cannot respond to someone else's match
const { data: outsiderTargetAll } = await admin.from('matches').select('*').eq('status', 'pending');
const outsiderTargets = (outsiderTargetAll ?? []).filter((x) => seedIds.has(x.user_a) && seedIds.has(x.user_b));
if (outsiderTargets.length > 0) {
  const outsiderTarget = outsiderTargets[0];
  const outsiderId = users.users.find(
    (u) => u.id !== outsiderTarget.user_a && u.id !== outsiderTarget.user_b && u.email?.endsWith('@test.dev'),
  )?.id;
  const outsider = await signIn(outsiderId);
  const res = await fetch(`${url}/functions/v1/respond-match`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${outsider.session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId: outsiderTarget.id, action: 'accept' }),
  });
  check('outsider cannot respond to a match', res.status === 404);
}

// --- decline flow on a second pending match
const { data: restAll } = await admin.from('matches').select('*').eq('status', 'pending');
const rest = (restAll ?? []).filter((x) => seedIds.has(x.user_a) && seedIds.has(x.user_b));
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

// --- a live safety report creates a confidential record and dissolves the match
const { data: reportableAll } = await admin.from('matches').select('*').eq('status', 'pending');
const reportable = (reportableAll ?? []).filter((x) => seedIds.has(x.user_a) && seedIds.has(x.user_b));
if (reportable.length > 0) {
  const target = reportable[0];
  const reporter = await signIn(target.user_a);
  const { error: reportErr } = await reporter.client.rpc('report_active_match', {
    p_match_id: target.id,
    p_category: 'safety',
    p_reason: 'End-to-end test report with enough detail.',
  });
  check('active-match safety report submits', !reportErr, reportErr?.message);
  const { data: reportedGone } = await admin.from('matches').select('id').eq('id', target.id);
  const { data: reportHistory } = await admin.from('match_history').select('id').eq('match_id', target.id);
  const { data: activeReportRows } = await admin.from('reports').select('id').eq('match_history_id', reportHistory?.[0]?.id);
  check('active report dissolves and archives the match', reportedGone.length === 0 && reportHistory.length === 1);
  check('active report creates a confidential report row', activeReportRows.length === 1);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
