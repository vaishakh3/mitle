// Housekeeping (cron, hourly):
//  1. Pending matches past their accept deadline -> archived as 'expired'
//  2. Committed matches past their meet window   -> archived as 'completed'
// Archived matches are DELETED from `matches` (the user-facing store); only
// the pair + outcome survive in `match_history` for re-match prevention and
// trust & safety.
import { adminClient, checkCronSecret, json } from '../_shared/db.ts';
import { sendPush } from '../_shared/push.ts';

interface MatchRow {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
}

Deno.serve(async (req) => {
  if (!checkCronSecret(req)) return json({ error: 'forbidden' }, 403);
  const db = adminClient();
  const now = new Date().toISOString();

  async function archive(rows: MatchRow[], outcome: 'expired' | 'completed') {
    if (rows.length === 0) return;
    await db.from('match_history').insert(
      rows.map((m) => ({
        match_id: m.id,
        user_a: m.user_a,
        user_b: m.user_b,
        outcome,
        matched_on: m.created_at.slice(0, 10),
      })),
    );
    await db
      .from('matches')
      .delete()
      .in('id', rows.map((m) => m.id));
  }

  const { data: stale, error: sErr } = await db
    .from('matches')
    .select('id, user_a, user_b, created_at')
    .in('status', ['pending', 'accepted_a', 'accepted_b'])
    .lt('accept_deadline', now);
  if (sErr) return json({ error: sErr.message }, 500);
  await archive((stale ?? []) as MatchRow[], 'expired');

  const { data: done, error: dErr } = await db
    .from('matches')
    .select('id, user_a, user_b, created_at')
    .eq('status', 'committed')
    .lt('window_end', now);
  if (dErr) return json({ error: dErr.message }, 500);
  await archive((done ?? []) as MatchRow[], 'completed');

  // A gentle goodbye to users whose meet window just closed
  if (done && done.length > 0) {
    const ids = done.flatMap((m) => [m.user_a, m.user_b]);
    const { data: people } = await db
      .from('profiles')
      .select('expo_push_token')
      .in('user_id', ids);
    await sendPush(
      (people ?? [])
        .map((p) => p.expo_push_token)
        .filter((t): t is string => !!t)
        .map((to) => ({
          to,
          title: 'This story now lives offline',
          body: 'Your match has faded from the app. If you met — the rest is up to you two.',
        })),
    );
  }

  return json({ expired: stale?.length ?? 0, completed: done?.length ?? 0 });
});
