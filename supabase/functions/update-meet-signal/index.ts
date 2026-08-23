// Status-only coordination for the day of a meet. This deliberately stays
// smaller than chat: four operational signals, no free-form messages and no
// identity disclosure.
import { adminClient, json, userFromRequest } from '../_shared/db.ts';
import { sendPush } from '../_shared/push.ts';

const SIGNALS = ['heading_there', 'arrived', 'running_late', 'cant_make_it'] as const;
type MeetSignal = (typeof SIGNALS)[number];

const MESSAGE: Record<MeetSignal, string> = {
  heading_there: 'Your stranger is on the way.',
  arrived: 'Your stranger has arrived.',
  running_late: 'Your stranger is running about 10 minutes late.',
  cant_make_it: 'Your stranger can no longer make it today.',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const user = await userFromRequest(req);
  if (!user) return json({ error: 'not authenticated' }, 401);

  const { matchId, signal } = await req.json().catch(() => ({}));
  if (!matchId || !SIGNALS.includes(signal)) {
    return json({ error: 'expected { matchId, signal }' }, 400);
  }

  const db = adminClient();
  const { data: match, error } = await db
    .from('matches')
    .select('id, user_a, user_b, status, window_start, window_end')
    .eq('id', matchId)
    .single();
  if (error || !match || (match.user_a !== user.id && match.user_b !== user.id)) {
    return json({ error: 'match not found' }, 404);
  }
  if (match.status !== 'committed') return json({ error: 'match is not committed' }, 409);

  const now = Date.now();
  const opens = new Date(match.window_start).getTime();
  const closes = new Date(match.window_end).getTime();
  if (now < opens - 3 * 3600_000 || now > closes) {
    return json({ error: 'day-of status opens three hours before the meet' }, 409);
  }

  const isA = match.user_a === user.id;
  const updatedAt = new Date().toISOString();
  const patch = isA
    ? { signal_a: signal, signal_a_updated_at: updatedAt }
    : { signal_b: signal, signal_b_updated_at: updatedAt };
  const { data: updated, error: updateError } = await db
    .from('matches')
    .update(patch)
    .eq('id', match.id)
    .eq('status', 'committed')
    .select('id');
  if (updateError) return json({ error: updateError.message }, 500);
  if (!updated?.length) return json({ error: 'match is no longer active' }, 409);

  const otherId = isA ? match.user_b : match.user_a;
  const { data: other } = await db
    .from('profiles')
    .select('expo_push_token')
    .eq('user_id', otherId)
    .maybeSingle();
  if (other?.expo_push_token) {
    await sendPush([
      {
        to: other.expo_push_token,
        title: 'A day-of update',
        body: MESSAGE[signal as MeetSignal],
      },
    ]);
  }

  return json({ status: signal, updated_at: updatedAt });
});
