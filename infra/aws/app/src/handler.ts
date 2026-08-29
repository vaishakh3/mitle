import {
  BatchGetCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { AdminDeleteUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import {
  INTERESTS,
  defaultUser,
  generateUsername,
  matchTiming,
  meetingPhrase,
  nextEveningWindow,
  nextLocalWeekday,
  pairPool,
  toCandidate,
  validateUser,
  withPoolIndex,
  type FeedbackItem,
  type HistoryItem,
  type MatchItem,
  type MeetOutcome,
  type MeetSignal,
  type UserItem,
} from './domain.js';
import { chooseVenue, VenueUnavailableError } from './places.js';
import { sendPush } from './push.js';

const TABLE_NAME = process.env.TABLE_NAME!;
const USER_POOL_ID = process.env.USER_POOL_ID!;
const TIMEZONE = process.env.MILTE_TZ ?? 'Asia/Kolkata';
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const cognito = new CognitoIdentityProviderClient({});

type ApiEvent = {
  rawPath?: string;
  requestContext?: {
    http?: { method?: string; sourceIp?: string };
    authorizer?: { jwt?: { claims?: Record<string, string> } };
  };
  body?: string | null;
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event: ApiEvent): Record<string, unknown> {
  if (!event.body) return {};
  try {
    const value = JSON.parse(event.body);
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    return value;
  } catch {
    throw new HttpError(400, 'invalid JSON body');
  }
}

function userId(event: ApiEvent): string {
  const id = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!id) throw new HttpError(401, 'not signed in');
  return id;
}

function nowIso() {
  return new Date().toISOString();
}

function ttl(days: number) {
  return Math.floor(Date.now() / 1000) + days * 86400;
}

function requiredId(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)) throw new HttpError(400, `invalid ${field}`);
  return value;
}

async function getUser(id: string, create = true): Promise<UserItem | null> {
  const result = await db.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${id}`, SK: 'PROFILE' },
  }));
  if (result.Item) {
    const existing = { ...defaultUser(id), ...result.Item } as UserItem;
    if (existing.username) return existing;
    for (let attempt = 0; attempt < 16; attempt++) {
      const username = generateUsername();
      try {
        await db.send(new TransactWriteCommand({ TransactItems: [
          { Put: {
            TableName: TABLE_NAME,
            Item: { PK: `USERNAME#${username}`, SK: 'OWNER', entityType: 'USERNAME', username, userId: id, created_at: nowIso() },
            ConditionExpression: 'attribute_not_exists(PK)',
          } },
          { Update: {
            TableName: TABLE_NAME,
            Key: { PK: `USER#${id}`, SK: 'PROFILE' },
            UpdateExpression: 'SET username = :username',
            ConditionExpression: 'attribute_exists(PK) AND (attribute_not_exists(username) OR username = :empty)',
            ExpressionAttributeValues: { ':username': username, ':empty': '' },
          } },
        ] }));
        return { ...existing, username };
      } catch (error) {
        if (!['ConditionalCheckFailedException', 'TransactionCanceledException'].includes((error as { name?: string }).name ?? '')) throw error;
        const current = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `USER#${id}`, SK: 'PROFILE' } }));
        if (typeof current.Item?.username === 'string' && current.Item.username) return { ...defaultUser(id), ...current.Item } as UserItem;
      }
    }
    throw new Error('could not reserve an anonymous username');
  }
  if (!create) return null;
  for (let attempt = 0; attempt < 16; attempt++) {
    const username = generateUsername();
    const item = { ...defaultUser(id), username };
    try {
      await db.send(new TransactWriteCommand({ TransactItems: [
        { Put: { TableName: TABLE_NAME, Item: item, ConditionExpression: 'attribute_not_exists(PK)' } },
        { Put: {
          TableName: TABLE_NAME,
          Item: { PK: `USERNAME#${username}`, SK: 'OWNER', entityType: 'USERNAME', username, userId: id, created_at: nowIso() },
          ConditionExpression: 'attribute_not_exists(PK)',
        } },
      ] }));
      return item;
    } catch (error) {
      if (!['ConditionalCheckFailedException', 'TransactionCanceledException'].includes((error as { name?: string }).name ?? '')) throw error;
      const current = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `USER#${id}`, SK: 'PROFILE' } }));
      if (current.Item) return getUser(id, false);
    }
  }
  throw new Error('could not reserve an anonymous username');
}

async function saveUser(item: UserItem) {
  validateUser(item);
  const expectedRevision = Number.isInteger(item.revision) ? item.revision : 0;
  const next = withPoolIndex({ ...item, revision: expectedRevision + 1 });
  await db.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: next,
    ConditionExpression: 'attribute_not_exists(revision) OR revision = :expectedRevision',
    ExpressionAttributeValues: { ':expectedRevision': expectedRevision },
  })).catch((error) => {
    if ((error as { name?: string }).name === 'ConditionalCheckFailedException') throw new HttpError(409, 'your account changed on another device; reload and try again');
    throw error;
  });
  return next;
}

async function pushUsers(users: Array<UserItem | null>, title: string, body: string) {
  const recipients = users.filter((user): user is UserItem => !!user?.expo_push_token);
  const invalid = await sendPush(recipients.map((user) => ({ to: user.expo_push_token!, title, body })));
  if (!invalid.length) return;
  await Promise.all(recipients.filter((user) => invalid.includes(user.expo_push_token!)).map((user) => db.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: user.PK, SK: user.SK },
    UpdateExpression: 'REMOVE expo_push_token',
    ConditionExpression: 'expo_push_token = :token',
    ExpressionAttributeValues: { ':token': user.expo_push_token },
  })).catch(() => undefined)));
}

function publicProfile(item: UserItem) {
  return {
    user_id: item.userId,
    username: item.username,
    display_name: item.display_name,
    birthdate: item.birthdate,
    gender: item.gender,
    avatar_id: item.avatar_id,
    spot_hint: item.spot_hint,
    lat: item.lat,
    lng: item.lng,
    location_updated_at: item.location_updated_at,
    expo_push_token: item.expo_push_token,
    is_paused: item.is_paused,
    is_suspended: item.is_suspended,
    onboarding_complete: item.onboarding_complete,
    rules_acknowledged_at: item.rules_acknowledged_at,
    terms_accepted_at: item.terms_accepted_at,
    terms_version: item.terms_version,
    privacy_accepted_at: item.privacy_accepted_at,
    privacy_version: item.privacy_version,
    community_accepted_at: item.community_accepted_at,
    community_version: item.community_version,
    safety_acknowledged_at: item.safety_acknowledged_at,
  };
}

function publicPreferences(item: UserItem) {
  return {
    user_id: item.userId,
    interested_genders: item.interested_genders,
    age_min: item.age_min,
    age_max: item.age_max,
    radius_km: item.radius_km,
    available_days: item.available_days,
    preferred_hour: item.preferred_hour,
    relationship_intent: item.relationship_intent,
    social_energy: item.social_energy,
    date_style: item.date_style,
    budget_level: item.budget_level,
  };
}

const PROFILE_FIELDS = [
  'display_name', 'birthdate', 'gender', 'avatar_id', 'spot_hint', 'lat', 'lng',
  'location_updated_at', 'expo_push_token', 'is_paused', 'onboarding_complete',
  'rules_acknowledged_at', 'terms_accepted_at', 'terms_version',
  'privacy_accepted_at', 'privacy_version', 'community_accepted_at',
  'community_version', 'safety_acknowledged_at',
] as const;
const PREFERENCE_FIELDS = [
  'interested_genders', 'age_min', 'age_max', 'radius_km', 'available_days',
  'preferred_hour', 'relationship_intent', 'social_energy', 'date_style', 'budget_level',
] as const;

function applyPatch<T extends UserItem>(item: T, body: Record<string, unknown>, fields: readonly string[]): T {
  const unsupported = Object.keys(body).find((field) => !fields.includes(field));
  if (unsupported) throw new HttpError(400, `invalid field: ${unsupported}`);
  const next = { ...item };
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
    const value = body[field];
    (next as Record<string, unknown>)[field] = typeof value === 'string' && ['display_name', 'spot_hint'].includes(field)
      ? value.trim()
      : Array.isArray(value)
        ? [...new Set(value)]
        : value;
  }
  const changesLocation = Object.prototype.hasOwnProperty.call(body, 'lat') || Object.prototype.hasOwnProperty.call(body, 'lng');
  if (changesLocation) {
    if (typeof body.lat !== 'number' || typeof body.lng !== 'number') throw new HttpError(400, 'invalid location coordinates');
    next.lat = Math.round(body.lat * 1000) / 1000;
    next.lng = Math.round(body.lng * 1000) / 1000;
    next.location_updated_at = nowIso();
  } else if (Object.prototype.hasOwnProperty.call(body, 'location_updated_at')) {
    throw new HttpError(400, 'invalid location update');
  }
  return next;
}

async function getMatch(id: string): Promise<MatchItem | null> {
  const result = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `MATCH#${id}`, SK: 'META' } }));
  return result.Item as MatchItem ?? null;
}

async function activeMatchFor(id: string): Promise<MatchItem | null> {
  const pointer = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `USER#${id}`, SK: 'ACTIVE' } }));
  if (!pointer.Item?.matchId) return null;
  const match = await getMatch(String(pointer.Item.matchId));
  if (!match) await db.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: `USER#${id}`, SK: 'ACTIVE' } }));
  return match;
}

function assertMember(match: MatchItem, id: string) {
  if (match.user_a !== id && match.user_b !== id) throw new HttpError(404, 'match not found');
}

function accepted(match: MatchItem, id: string) {
  return match.status === 'committed'
    || (match.status === 'accepted_a' && match.user_a === id)
    || (match.status === 'accepted_b' && match.user_b === id);
}

function signalFor(match: MatchItem, id: string) {
  return match.user_a === id ? match.signal_a ?? null : match.signal_b ?? null;
}

function confirmedFor(match: MatchItem, id: string) {
  return match.user_a === id ? !!match.confirmation_a_at : !!match.confirmation_b_at;
}

async function currentMatchResponse(match: MatchItem, id: string) {
  assertMember(match, id);
  const otherId = match.user_a === id ? match.user_b : match.user_a;
  const committed = match.status === 'committed';
  const other = committed ? await getUser(otherId, false) : null;
  const timing = match.window_start ? matchTiming(match.window_start) : null;
  const phraseOpen = timing ? Date.now() >= new Date(timing.phraseOpensAt).getTime() : false;
  return {
    match_id: match.id,
    status: committed ? 'committed' : 'pending',
    you_accepted: accepted(match, id),
    they_accepted: accepted(match, otherId),
    accept_deadline: match.accept_deadline,
    venue: committed ? {
      name: match.venue_name,
      address: match.venue_address,
      lat: match.venue_lat,
      lng: match.venue_lng,
      maps_url: match.venue_maps_url,
    } : null,
    window_start: committed ? match.window_start ?? null : null,
    window_end: committed ? match.window_end ?? null : null,
    their_spot_hint: committed ? other?.spot_hint ?? null : null,
    your_signal: signalFor(match, id),
    their_signal: signalFor(match, otherId),
    you_confirmed: confirmedFor(match, id),
    they_confirmed: confirmedFor(match, otherId),
    confirmation_opens_at: committed ? timing?.confirmationOpensAt ?? null : null,
    meeting_phrase: committed && phraseOpen ? match.meeting_phrase ?? null : null,
    cancelled: committed && !!match.cancelled_at,
    cancelled_by_you: committed && match.cancelled_by === id,
  };
}

async function archiveMatch(match: MatchItem, outcome: HistoryItem['outcome']) {
  const archivedAt = nowIso();
  const historyId = crypto.randomUUID();
  const history: HistoryItem = {
    PK: `HISTORY#${historyId}`,
    SK: 'META',
    entityType: 'HISTORY',
    id: historyId,
    match_id: match.id,
    user_a: match.user_a,
    user_b: match.user_b,
    outcome,
    matched_on: match.created_at,
    archived_at: archivedAt,
    expiresAt: ttl(400),
  };
  const historyRef = (id: string) => ({
    PK: `USER#${id}`, SK: `HISTORY#${archivedAt}#${historyId}`,
    entityType: 'HISTORY_REF', historyId, outcome, matched_on: match.created_at,
    expiresAt: ttl(400),
  });
  const pairRef = (id: string, other: string) => ({
    PK: `USER#${id}`, SK: `PAIR#${other}`, entityType: 'PAIR_REF',
    otherId: other, lastMatchedAt: archivedAt, expiresAt: ttl(1095),
  });
  try {
    await db.send(new TransactWriteCommand({ TransactItems: [
      { Delete: { TableName: TABLE_NAME, Key: { PK: match.PK, SK: match.SK }, ConditionExpression: 'attribute_exists(PK)' } },
      { Delete: { TableName: TABLE_NAME, Key: { PK: `USER#${match.user_a}`, SK: 'ACTIVE' } } },
      { Delete: { TableName: TABLE_NAME, Key: { PK: `USER#${match.user_b}`, SK: 'ACTIVE' } } },
      { Put: { TableName: TABLE_NAME, Item: history } },
      { Put: { TableName: TABLE_NAME, Item: historyRef(match.user_a) } },
      { Put: { TableName: TABLE_NAME, Item: historyRef(match.user_b) } },
      { Put: { TableName: TABLE_NAME, Item: pairRef(match.user_a, match.user_b) } },
      { Put: { TableName: TABLE_NAME, Item: pairRef(match.user_b, match.user_a) } },
    ] }));
  } catch (error) {
    if ((error as { name?: string }).name !== 'TransactionCanceledException') throw error;
    if (await getMatch(match.id)) throw error;
  }
  return history;
}

async function respondToMatch(id: string, body: Record<string, unknown>) {
  const matchId = requiredId(body, 'matchId');
  const action = body.action;
  if (!matchId || (action !== 'accept' && action !== 'decline')) throw new HttpError(400, 'invalid match response');
  const match = await getMatch(matchId);
  if (!match) throw new HttpError(404, 'match not found');
  assertMember(match, id);
  if (action === 'decline') {
    if (match.status === 'committed') throw new HttpError(409, 'this date is already committed');
    await archiveMatch(match, 'declined');
    return { status: 'declined' };
  }
  if (new Date(match.accept_deadline).getTime() <= Date.now()) {
    await archiveMatch(match, 'expired');
    throw new HttpError(410, 'the decision window has closed');
  }
  if (match.status === 'committed') return { status: 'committed' };
  if (accepted(match, id)) return { status: 'waiting' };

  const otherAccepted = match.status === (match.user_a === id ? 'accepted_b' : 'accepted_a');
  if (!otherAccepted) {
    const nextStatus = match.user_a === id ? 'accepted_a' : 'accepted_b';
    try {
      await db.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...match, status: nextStatus },
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':pending': 'pending' },
      }));
      return { status: 'waiting' };
    } catch (error) {
      if ((error as { name?: string }).name !== 'ConditionalCheckFailedException') throw error;
      return respondToMatch(id, body);
    }
  }

  const [a, b] = await Promise.all([getUser(match.user_a, false), getUser(match.user_b, false)]);
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) throw new HttpError(409, 'both locations must be refreshed');
  const preferredHour = Math.round((a.preferred_hour + b.preferred_hour) / 2);
  const window = nextEveningWindow(TIMEZONE, preferredHour);
  const venue = await chooseVenue({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }, window.start);
  const committed: MatchItem = {
    ...match,
    status: 'committed',
    venue_name: venue.name,
    venue_address: venue.address,
    venue_lat: venue.lat,
    venue_lng: venue.lng,
    venue_maps_url: venue.maps_url,
    window_start: window.start.toISOString(),
    window_end: window.end.toISOString(),
    meeting_phrase: meetingPhrase(),
    GSI1PK: 'MATCH#committed',
    GSI1SK: window.start.toISOString(),
  };
  try {
    await db.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: committed,
      ConditionExpression: '#status = :expected',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':expected': match.status },
    }));
  } catch (error) {
    if ((error as { name?: string }).name !== 'ConditionalCheckFailedException') throw error;
    const current = await getMatch(match.id);
    if (current?.status === 'committed') return { status: 'committed' };
    throw new HttpError(409, 'this match is no longer active');
  }
  await pushUsers([a, b], 'Two private yeses.', `${venue.name} is waiting inside Milte.`);
  return { status: 'committed' };
}

async function updateSignal(id: string, body: Record<string, unknown>) {
  const match = await getMatch(requiredId(body, 'matchId'));
  const signal = body.signal as MeetSignal;
  if (!match) throw new HttpError(404, 'match not found');
  assertMember(match, id);
  if (match.status !== 'committed') throw new HttpError(409, 'the venue has not been revealed');
  if (!['heading_there', 'arrived', 'running_late', 'cant_make_it'].includes(signal)) throw new HttpError(400, 'invalid signal');
  const key = match.user_a === id ? 'signal_a' : 'signal_b';
  const cancelling = signal === 'cant_make_it';
  await db.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: match.PK, SK: match.SK },
    UpdateExpression: cancelling
      ? 'SET #signal = :signal, cancelled_at = if_not_exists(cancelled_at, :now), cancelled_by = if_not_exists(cancelled_by, :userId)'
      : 'SET #signal = :signal',
    ConditionExpression: cancelling
      ? '#status = :committed AND (attribute_not_exists(cancelled_at) OR cancelled_by = :userId)'
      : '#status = :committed AND attribute_not_exists(cancelled_at)',
    ExpressionAttributeNames: { '#signal': key, '#status': 'status' },
    ExpressionAttributeValues: cancelling
      ? { ':signal': signal, ':committed': 'committed', ':now': nowIso(), ':userId': id }
      : { ':signal': signal, ':committed': 'committed' },
  })).catch((error) => {
    if ((error as { name?: string }).name === 'ConditionalCheckFailedException') throw new HttpError(409, 'this plan has already been cancelled');
    throw error;
  });
  const other = await getUser(match.user_a === id ? match.user_b : match.user_a, false);
  await pushUsers([other], 'A small update', signal === 'running_late' ? 'Your match is running a little late.' : signal === 'cant_make_it' ? 'Your match cannot make it.' : signal === 'arrived' ? 'Your match has arrived.' : 'Your match is heading there.');
}

async function confirmMeet(id: string, body: Record<string, unknown>) {
  const match = await getMatch(requiredId(body, 'matchId'));
  if (!match) throw new HttpError(404, 'match not found');
  assertMember(match, id);
  if (match.status !== 'committed' || !match.window_start) throw new HttpError(409, 'confirmation is not open');
  if (Date.now() < new Date(matchTiming(match.window_start).confirmationOpensAt).getTime()) throw new HttpError(409, 'confirmation opens 24 hours before the date');
  const key = match.user_a === id ? 'confirmation_a_at' : 'confirmation_b_at';
  await db.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: match.PK, SK: match.SK },
    UpdateExpression: 'SET #confirmation = if_not_exists(#confirmation, :now)',
    ConditionExpression: '#status = :committed AND attribute_not_exists(cancelled_at)',
    ExpressionAttributeNames: { '#confirmation': key, '#status': 'status' },
    ExpressionAttributeValues: { ':now': nowIso(), ':committed': 'committed' },
  })).catch((error) => {
    if ((error as { name?: string }).name === 'ConditionalCheckFailedException') throw new HttpError(409, 'this meet is no longer active');
    throw error;
  });
}

async function reportMatch(id: string, body: Record<string, unknown>) {
  const match = await getMatch(requiredId(body, 'matchId'));
  const category = typeof body.category === 'string' ? body.category : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!match) throw new HttpError(404, 'match not found');
  assertMember(match, id);
  if (!['safety', 'harassment', 'identity', 'other'].includes(category) || reason.length < 3 || reason.length > 1000) throw new HttpError(400, 'invalid report');
  await db.send(new PutCommand({ TableName: TABLE_NAME, Item: {
    PK: `REPORT#${crypto.randomUUID()}`, SK: 'META', entityType: 'REPORT',
    reporter_id: id, reported_user_id: match.user_a === id ? match.user_b : match.user_a,
    match_id: match.id, category, reason, created_at: nowIso(), expiresAt: ttl(1095),
  } }));
  await archiveMatch(match, 'declined');
}

async function userHistoryRefs(id: string) {
  const result = await db.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': `USER#${id}`, ':prefix': 'HISTORY#' },
    ScanIndexForward: false,
    Limit: 30,
  }));
  return result.Items ?? [];
}

async function getPendingFeedback(id: string) {
  for (const ref of await userHistoryRefs(id)) {
    if (ref.outcome !== 'completed') continue;
    const own = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `HISTORY#${ref.historyId}`, SK: `FEEDBACK#${id}` } }));
    if (!own.Item) return { history_id: ref.historyId, matched_on: ref.matched_on };
  }
  return null;
}

async function submitFeedback(id: string, body: Record<string, unknown>) {
  const historyId = requiredId(body, 'historyId');
  const outcome = body.outcome as MeetOutcome;
  const historyResult = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `HISTORY#${historyId}`, SK: 'META' } }));
  const history = historyResult.Item as HistoryItem | undefined;
  if (!history || (history.user_a !== id && history.user_b !== id)) throw new HttpError(404, 'meet history not found');
  if (history.outcome !== 'completed') throw new HttpError(409, 'feedback opens after the meet');
  if (!['met', 'no_show', 'didnt_go'].includes(outcome)) throw new HttpError(400, 'invalid outcome');
  if (body.secondChapterNote != null && typeof body.secondChapterNote !== 'string') throw new HttpError(400, 'invalid second chapter note');
  const note = body.secondChapterNote == null ? null : body.secondChapterNote.trim();
  if (note && note.length > 240) throw new HttpError(400, 'note is too long');
  const feedback: FeedbackItem = {
    PK: `HISTORY#${historyId}`,
    SK: `FEEDBACK#${id}`,
    entityType: 'FEEDBACK',
    history_id: historyId,
    user_id: id,
    outcome,
    second_chapter: outcome === 'met' && typeof body.secondChapter === 'boolean' ? body.secondChapter : null,
    second_chapter_note: outcome === 'met' && body.secondChapter === true ? note : null,
    second_chapter_seen_at: null,
    created_at: nowIso(),
    expiresAt: history.expiresAt,
  };
  await db.send(new PutCommand({ TableName: TABLE_NAME, Item: feedback, ConditionExpression: 'attribute_not_exists(PK)' })).catch((error) => {
    if ((error as { name?: string }).name === 'ConditionalCheckFailedException') throw new HttpError(409, 'feedback was already submitted');
    throw error;
  });
  if (body.reportReason != null && typeof body.reportReason !== 'string') throw new HttpError(400, 'invalid report reason');
  const reportReason = body.reportReason == null ? '' : body.reportReason.trim();
  if (reportReason) await db.send(new PutCommand({ TableName: TABLE_NAME, Item: {
    PK: `REPORT#${crypto.randomUUID()}`, SK: 'META', entityType: 'REPORT', reporter_id: id,
    reported_user_id: history.user_a === id ? history.user_b : history.user_a,
    history_id: historyId, category: 'post_meet', reason: reportReason.slice(0, 1000), created_at: nowIso(), expiresAt: ttl(1095),
  } }));
}

async function secondChapter(id: string) {
  for (const ref of await userHistoryRefs(id)) {
    const historyResult = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `HISTORY#${ref.historyId}`, SK: 'META' } }));
    const history = historyResult.Item as HistoryItem | undefined;
    if (!history || Date.now() - new Date(history.archived_at).getTime() > 7 * 86400_000) continue;
    const otherId = history.user_a === id ? history.user_b : history.user_a;
    const result = await db.send(new BatchGetCommand({ RequestItems: { [TABLE_NAME]: { Keys: [
      { PK: `HISTORY#${history.id}`, SK: `FEEDBACK#${id}` },
      { PK: `HISTORY#${history.id}`, SK: `FEEDBACK#${otherId}` },
    ] } } }));
    const feedback = (result.Responses?.[TABLE_NAME] ?? []) as FeedbackItem[];
    const mine = feedback.find((item) => item.user_id === id);
    const theirs = feedback.find((item) => item.user_id === otherId);
    if (mine?.second_chapter_seen_at || mine?.outcome !== 'met' || theirs?.outcome !== 'met') continue;
    if (mine.second_chapter && theirs.second_chapter) return {
      history_id: history.id,
      matched_on: history.matched_on,
      note: theirs.second_chapter_note || 'They would like a second chapter too.',
    };
  }
  return null;
}

async function dismissSecondChapter(id: string, body: Record<string, unknown>) {
  const historyId = requiredId(body, 'historyId');
  const result = await db.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `HISTORY#${historyId}`, SK: `FEEDBACK#${id}` } }));
  if (!result.Item) throw new HttpError(404, 'second chapter not found');
  await db.send(new PutCommand({ TableName: TABLE_NAME, Item: { ...result.Item, second_chapter_seen_at: nowIso() } }));
}

async function deleteAccount(id: string) {
  const profile = await getUser(id, false);
  const active = await activeMatchFor(id);
  if (active) await archiveMatch(active, 'declined');
  let cursor: Record<string, unknown> | undefined;
  do {
    const result = await db.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${id}` },
      ExclusiveStartKey: cursor,
    }));
    await Promise.all((result.Items ?? []).map((item) => db.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: item.PK, SK: item.SK } }))));
    cursor = result.LastEvaluatedKey;
  } while (cursor);
  if (profile?.username) await db.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: `USERNAME#${profile.username}`, SK: 'OWNER' } }));
  await cognito.send(new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: id }));
}

async function setSuspension(id: string, suspended: boolean) {
  const user = await getUser(id, false);
  if (!user) throw new Error('operator target not found');
  if (suspended) {
    const active = await activeMatchFor(id);
    if (active) await archiveMatch(active, 'declined');
  }
  await saveUser({
    ...user,
    is_suspended: suspended,
    suspended_at: suspended ? nowIso() : null,
  });
  return { userId: id, suspended };
}

async function queryAllByIndex(partition: string, max = 250): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let cursor: Record<string, unknown> | undefined;
  do {
    const result = await db.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'EntityIndex',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': partition },
      ExclusiveStartKey: cursor,
      Limit: Math.min(100, max - items.length),
    }));
    items.push(...(result.Items ?? []));
    cursor = result.LastEvaluatedKey;
  } while (cursor && items.length < max);
  return items;
}

async function dailyMatch() {
  const weekday = nextLocalWeekday(TIMEZONE);
  const freshAfter = Date.now() - 30 * 86400_000;
  const users = (await queryAllByIndex('POOL', 100) as unknown as UserItem[]).filter((item) =>
    item.available_days.includes(weekday)
    && !!item.location_updated_at
    && new Date(item.location_updated_at!).getTime() >= freshAfter,
  );
  if (users.length < 2) return { eligible: users.length, created: 0 };
  const pointerResult = await db.send(new BatchGetCommand({ RequestItems: { [TABLE_NAME]: { Keys: users.map((user) => ({ PK: `USER#${user.userId}`, SK: 'ACTIVE' })) } } }));
  const active = new Set((pointerResult.Responses?.[TABLE_NAME] ?? []).map((item) => String(item.PK).slice(5)));
  const available = users.filter((item) => !active.has(item.userId));
  const previous = new Set<string>();
  await Promise.all(available.map(async (user) => {
    const result = await db.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': `USER#${user.userId}`, ':prefix': 'PAIR#' },
      ProjectionExpression: 'SK',
    }));
    for (const item of result.Items ?? []) {
      const other = String(item.SK).slice(5);
      previous.add(user.userId < other ? `${user.userId}:${other}` : `${other}:${user.userId}`);
    }
  }));
  const candidates = available.map(toCandidate).filter((item): item is NonNullable<ReturnType<typeof toCandidate>> => !!item);
  const pairs = pairPool(candidates, previous);
  let created = 0;
  for (const pair of pairs) {
    const matchId = crypto.randomUUID();
    const createdAt = nowIso();
    const deadline = new Date(Date.now() + 12 * 3600_000).toISOString();
    const match: MatchItem = {
      PK: `MATCH#${matchId}`, SK: 'META', entityType: 'MATCH', id: matchId,
      user_a: pair.a, user_b: pair.b, status: 'pending', accept_deadline: deadline,
      created_at: createdAt, score: pair.score, GSI1PK: 'MATCH#pending', GSI1SK: deadline,
      expiresAt: ttl(3),
    };
    try {
      await db.send(new TransactWriteCommand({ TransactItems: [
        { Put: { TableName: TABLE_NAME, Item: match, ConditionExpression: 'attribute_not_exists(PK)' } },
        { Put: { TableName: TABLE_NAME, Item: { PK: `USER#${pair.a}`, SK: 'ACTIVE', entityType: 'ACTIVE', matchId }, ConditionExpression: 'attribute_not_exists(PK)' } },
        { Put: { TableName: TABLE_NAME, Item: { PK: `USER#${pair.b}`, SK: 'ACTIVE', entityType: 'ACTIVE', matchId }, ConditionExpression: 'attribute_not_exists(PK)' } },
      ] }));
      created++;
      const pairUsers = [users.find((user) => user.userId === pair.a), users.find((user) => user.userId === pair.b)].filter((item): item is UserItem => !!item);
      await pushUsers(pairUsers, 'Someone said maybe.', 'Your one anonymous possibility is waiting. Your answer stays private.');
    } catch (error) {
      if ((error as { name?: string }).name !== 'TransactionCanceledException') throw error;
    }
  }
  return { eligible: users.length, created };
}

async function queryDue(partition: string, through: string) {
  const result = await db.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'EntityIndex',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK <= :through',
    ExpressionAttributeValues: { ':pk': partition, ':through': through },
    Limit: 100,
  }));
  return (result.Items ?? []) as MatchItem[];
}

async function housekeeping() {
  const now = new Date();
  const expired = await queryDue('MATCH#pending', now.toISOString());
  for (const match of expired) await archiveMatch(match, 'expired');
  const committed = await queryDue('MATCH#committed', new Date(now.getTime() + 35 * 60_000).toISOString());
  let completed = 0;
  let reminded = 0;
  for (const match of committed) {
    if (match.window_end && new Date(match.window_end).getTime() <= now.getTime()) {
      const wasCancelled = !!match.cancelled_at;
      await archiveMatch(match, wasCancelled ? 'cancelled' : 'completed');
      completed++;
      if (!wasCancelled) {
        const users = await Promise.all([getUser(match.user_a, false), getUser(match.user_b, false)]);
        await pushUsers(users, 'How did the hour feel?', 'A private reflection is waiting in Milte.');
      }
    } else if (!match.cancelled_at && !match.reminder_sent && match.window_start && new Date(match.window_start).getTime() <= now.getTime() + 35 * 60_000) {
      const claimed = await db.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: match.PK, SK: match.SK },
        UpdateExpression: 'SET reminder_sent = :true',
        ConditionExpression: '#status = :committed AND (attribute_not_exists(reminder_sent) OR reminder_sent = :false)',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':true': true, ':false': false, ':committed': 'committed' },
      })).then(() => true).catch((error) => {
        if ((error as { name?: string }).name === 'ConditionalCheckFailedException') return false;
        throw error;
      });
      if (!claimed) continue;
      reminded++;
      const users = await Promise.all([getUser(match.user_a, false), getUser(match.user_b, false)]);
      await pushUsers(users, 'Thirty minutes', 'Your public-place plan and meeting phrase are ready.');
    }
  }
  return { expired: expired.length, completed, reminded };
}

async function sourceHash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function createSupportTicket(event: ApiEvent, body: Record<string, unknown>) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = typeof body.category === 'string' ? body.category : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new HttpError(400, 'enter a valid reply email');
  if (name.length > 80) throw new HttpError(400, 'name is too long');
  if (!['account', 'privacy', 'safety', 'technical', 'other'].includes(category)) throw new HttpError(400, 'invalid support category');
  if (message.length < 20 || message.length > 2000) throw new HttpError(400, 'support message must be 20 to 2000 characters');

  const day = new Date().toISOString().slice(0, 10);
  const fingerprint = await sourceHash(event.requestContext?.http?.sourceIp ?? 'unknown');
  try {
    await db.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `RATE#SUPPORT#${day}`, SK: `SOURCE#${fingerprint}` },
      UpdateExpression: 'SET expiresAt = :expiry ADD attempts :one',
      ConditionExpression: 'attribute_not_exists(attempts) OR attempts < :limit',
      ExpressionAttributeValues: { ':expiry': ttl(2), ':one': 1, ':limit': 3 },
    }));
  } catch (error) {
    if ((error as { name?: string }).name === 'ConditionalCheckFailedException') throw new HttpError(429, 'support request limit reached; try again tomorrow');
    throw error;
  }

  const reference = `MI-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  await db.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `SUPPORT#${reference}`,
      SK: 'META',
      entityType: 'SUPPORT',
      reference,
      email,
      name: name || null,
      category,
      message,
      status: 'open',
      created_at: nowIso(),
      expiresAt: ttl(180),
    },
    ConditionExpression: 'attribute_not_exists(PK)',
  }));
  return { reference };
}

async function route(event: ApiEvent) {
  const method = event.requestContext?.http?.method ?? 'GET';
  const path = event.rawPath ?? '/';
  if (method === 'OPTIONS') return json(204, null);
  if (method === 'GET' && path === '/health') return json(200, { ok: true, service: 'milte', time: nowIso() });
  if (method === 'POST' && path === '/support') return json(201, await createSupportTicket(event, parseBody(event)));
  const id = userId(event);
  const body = ['POST', 'PUT'].includes(method) ? parseBody(event) : {};

  if (method === 'GET' && path === '/me/profile') return json(200, publicProfile((await getUser(id))!));
  if (method === 'PUT' && path === '/me/profile') {
    const item = applyPatch((await getUser(id))!, body, PROFILE_FIELDS);
    const saved = await saveUser(item);
    return json(200, publicProfile(saved));
  }
  if (method === 'GET' && path === '/me/preferences') return json(200, publicPreferences((await getUser(id))!));
  if (method === 'PUT' && path === '/me/preferences') {
    const item = applyPatch((await getUser(id))!, body, PREFERENCE_FIELDS);
    const saved = await saveUser(item);
    return json(200, publicPreferences(saved));
  }
  if (method === 'GET' && path === '/interests') return json(200, [...INTERESTS].sort((a, b) => a.label.localeCompare(b.label)));
  if (method === 'GET' && path === '/me/interests') return json(200, (await getUser(id))!.interest_ids);
  if (method === 'PUT' && path === '/me/interests') {
    const ids = body.interestIds;
    if (!Array.isArray(ids) || ids.some((value) => !Number.isInteger(value))) throw new HttpError(400, 'interestIds must be an integer array');
    const item = { ...(await getUser(id))!, interest_ids: [...new Set(ids as number[])] };
    const saved = await saveUser(item);
    return json(200, saved.interest_ids);
  }
  if (method === 'GET' && path === '/match/current') {
    const match = await activeMatchFor(id);
    return json(200, match ? await currentMatchResponse(match, id) : null);
  }
  if (method === 'POST' && path === '/match/respond') return json(200, await respondToMatch(id, body));
  if (method === 'POST' && path === '/match/signal') { await updateSignal(id, body); return json(204, null); }
  if (method === 'POST' && path === '/match/confirm') { await confirmMeet(id, body); return json(204, null); }
  if (method === 'POST' && path === '/match/report') { await reportMatch(id, body); return json(204, null); }
  if (method === 'GET' && path === '/feedback/pending') return json(200, await getPendingFeedback(id));
  if (method === 'POST' && path === '/feedback') { await submitFeedback(id, body); return json(204, null); }
  if (method === 'GET' && path === '/second-chapter') return json(200, await secondChapter(id));
  if (method === 'POST' && path === '/second-chapter/dismiss') { await dismissSecondChapter(id, body); return json(204, null); }
  if (method === 'DELETE' && path === '/me') { await deleteAccount(id); return json(204, null); }
  throw new HttpError(404, 'route not found');
}

export async function handler(event: ApiEvent | { job?: string; userId?: string }) {
  try {
    if ('job' in event && event.job === 'daily-match') return await dailyMatch();
    if ('job' in event && event.job === 'housekeeping') return await housekeeping();
    if ('job' in event && event.job === 'suspend-user' && event.userId) return await setSuspension(event.userId, true);
    if ('job' in event && event.job === 'reinstate-user' && event.userId) return await setSuspension(event.userId, false);
    return await route(event as ApiEvent);
  } catch (error) {
    if (error instanceof HttpError) return json(error.status, { error: error.message });
    if (error instanceof VenueUnavailableError) return json(503, { error: error.message });
    if (error instanceof Error && /invalid|must|too long|18 or older/.test(error.message)) return json(400, { error: error.message });
    console.error('Unhandled Milte error', error);
    return json(500, { error: 'something went wrong' });
  }
}
