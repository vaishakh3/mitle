// Accept/decline a match. On the second accept, picks the venue and time
// window (the meet-cute) and reveals it to both users.
import { adminClient, json, userFromRequest } from '../_shared/db.ts';
import { midpoint } from '../_shared/matching.ts';
import { sendPush } from '../_shared/push.ts';
import { nextEveningWindow } from '../_shared/time.ts';
import { pickVenue } from '../_shared/venues.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const user = await userFromRequest(req);
  if (!user) return json({ error: 'not authenticated' }, 401);

  const { matchId, action } = await req.json().catch(() => ({}));
  if (!matchId || !['accept', 'decline'].includes(action)) {
    return json({ error: 'expected { matchId, action: accept|decline }' }, 400);
  }

  const db = adminClient();
  const { data: match, error: mErr } = await db
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();
  if (mErr || !match) return json({ error: 'match not found' }, 404);
  if (match.user_a !== user.id && match.user_b !== user.id) {
    return json({ error: 'match not found' }, 404);
  }
  if (!['pending', 'accepted_a', 'accepted_b'].includes(match.status)) {
    return json({ error: 'match is no longer open' }, 409);
  }
  if (new Date(match.accept_deadline) < new Date()) {
    return json({ error: 'the acceptance window has passed' }, 409);
  }

  const isA = match.user_a === user.id;
  const otherId = isA ? match.user_b : match.user_a;

  if (action === 'decline') {
    await db.from('match_history').insert({
      match_id: match.id,
      user_a: match.user_a,
      user_b: match.user_b,
      outcome: 'declined',
      matched_on: match.created_at.slice(0, 10),
    });
    await db.from('matches').delete().eq('id', match.id);
    return json({ status: 'declined' });
  }

  const alreadyAcceptedByMe =
    (match.status === 'accepted_a' && isA) || (match.status === 'accepted_b' && !isA);
  if (alreadyAcceptedByMe) return json({ status: 'waiting' });

  let otherAccepted =
    (match.status === 'accepted_a' && !isA) || (match.status === 'accepted_b' && isA);

  if (!otherAccepted) {
    // Guarded first-accept: if 0 rows update, the other user accepted in the
    // meantime (race) - fall through to the commit path instead.
    const { data: updated, error } = await db
      .from('matches')
      .update({ status: isA ? 'accepted_a' : 'accepted_b' })
      .eq('id', match.id)
      .eq('status', 'pending')
      .select('id');
    if (error) return json({ error: error.message }, 500);
    if (updated && updated.length > 0) return json({ status: 'waiting' });
    otherAccepted = true;
  }

  // Both accepted: commit. Pick the venue near their midpoint & set the window.
  const { data: people, error: pErr } = await db
    .from('profiles')
    .select('user_id, lat, lng, expo_push_token')
    .in('user_id', [match.user_a, match.user_b]);
  if (pErr || !people || people.length !== 2) {
    return json({ error: 'could not load participants' }, 500);
  }
  const [pa, pb] = people;
  const mid = midpoint({ lat: pa.lat, lng: pa.lng }, { lat: pb.lat, lng: pb.lng });
  const venue = await pickVenue(mid.lat, mid.lng, Deno.env.get('GOOGLE_PLACES_API_KEY'));
  const tz = Deno.env.get('MEETCUTE_TZ') ?? 'Asia/Kolkata';
  const window = nextEveningWindow(tz);

  // Commit exactly once: only the transition from the other-accepted state
  // wins; a racing second committer matches 0 rows and returns quietly.
  const { data: committed, error: uErr } = await db
    .from('matches')
    .update({
      status: 'committed',
      venue_name: venue.name,
      venue_address: venue.address,
      venue_lat: venue.lat,
      venue_lng: venue.lng,
      venue_maps_url: venue.mapsUrl,
      window_start: window.start.toISOString(),
      window_end: window.end.toISOString(),
    })
    .eq('id', match.id)
    .eq('status', isA ? 'accepted_b' : 'accepted_a')
    .select('id');
  if (uErr) return json({ error: uErr.message }, 500);
  if (!committed || committed.length === 0) return json({ status: 'committed' });

  const timeLabel = window.start.toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
  await sendPush(
    people
      .map((p) => p.expo_push_token)
      .filter((t): t is string => !!t)
      .map((to) => ({
        to,
        title: "It's on ✨",
        body: `${venue.name}, ${timeLabel}. Look for the spot hint. Good luck.`,
      })),
  );

  return json({ status: 'committed' });
});
