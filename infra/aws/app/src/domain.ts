export type Gender = 'man' | 'woman' | 'nonbinary';
export type RelationshipIntent = 'long_term' | 'open' | 'figuring_out';
export type SocialEnergy = 'quiet' | 'balanced' | 'lively';
export type DateStyle = 'coffee' | 'activity' | 'sober' | 'anything';
export type AvatarId = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08';
export type MatchStatus = 'pending' | 'accepted_a' | 'accepted_b' | 'committed';
export type MeetSignal = 'heading_there' | 'arrived' | 'running_late' | 'cant_make_it';
export type MeetOutcome = 'met' | 'no_show' | 'didnt_go';

export interface Candidate {
  userId: string;
  gender: Gender;
  age: number;
  lat: number;
  lng: number;
  interestedGenders: Gender[];
  ageMin: number;
  ageMax: number;
  radiusKm: number;
  interests: string[];
  relationshipIntent: RelationshipIntent;
  socialEnergy: SocialEnergy;
  dateStyle: DateStyle;
  budgetLevel: number;
}

export interface UserItem {
  PK: string;
  SK: 'PROFILE';
  entityType: 'USER';
  userId: string;
  username: string;
  display_name: string;
  birthdate: string | null;
  gender: Gender | null;
  avatar_id: AvatarId;
  spot_hint: string;
  lat: number | null;
  lng: number | null;
  location_updated_at: string | null;
  expo_push_token: string | null;
  is_paused: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  onboarding_complete: boolean;
  rules_acknowledged_at: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_accepted_at: string | null;
  privacy_version: string | null;
  community_accepted_at: string | null;
  community_version: string | null;
  safety_acknowledged_at: string | null;
  created_at: string;
  revision: number;
  interested_genders: Gender[];
  age_min: number;
  age_max: number;
  radius_km: number;
  available_days: number[];
  preferred_hour: number;
  relationship_intent: RelationshipIntent;
  social_energy: SocialEnergy;
  date_style: DateStyle;
  budget_level: number;
  interest_ids: number[];
  GSI1PK?: 'POOL';
  GSI1SK?: string;
}

export interface MatchItem {
  PK: string;
  SK: 'META';
  entityType: 'MATCH';
  id: string;
  user_a: string;
  user_b: string;
  status: MatchStatus;
  accept_deadline: string;
  created_at: string;
  venue_name?: string;
  venue_address?: string;
  venue_lat?: number;
  venue_lng?: number;
  venue_maps_url?: string;
  window_start?: string;
  window_end?: string;
  meeting_phrase?: string;
  signal_a?: MeetSignal;
  signal_b?: MeetSignal;
  confirmation_a_at?: string;
  confirmation_b_at?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  reminder_sent?: boolean;
  score?: number;
  GSI1PK: 'MATCH#pending' | 'MATCH#committed';
  GSI1SK: string;
  expiresAt: number;
}

export interface HistoryItem {
  PK: string;
  SK: 'META';
  entityType: 'HISTORY';
  id: string;
  match_id: string;
  user_a: string;
  user_b: string;
  outcome: 'declined' | 'expired' | 'cancelled' | 'completed';
  matched_on: string;
  archived_at: string;
  expiresAt: number;
}

export interface FeedbackItem {
  PK: string;
  SK: string;
  entityType: 'FEEDBACK';
  history_id: string;
  user_id: string;
  outcome: MeetOutcome;
  second_chapter: boolean | null;
  second_chapter_note: string | null;
  second_chapter_seen_at: string | null;
  created_at: string;
  expiresAt: number;
}

export const INTERESTS = [
  { id: 1, slug: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 2, slug: 'books', label: 'Books', emoji: '📚' },
  { id: 3, slug: 'music', label: 'Live music', emoji: '🎶' },
  { id: 4, slug: 'hiking', label: 'Hiking', emoji: '🥾' },
  { id: 5, slug: 'food', label: 'Food adventures', emoji: '🍜' },
  { id: 6, slug: 'film', label: 'Film', emoji: '🎬' },
  { id: 7, slug: 'art', label: 'Art & museums', emoji: '🎨' },
  { id: 8, slug: 'fitness', label: 'Fitness', emoji: '🏋️' },
  { id: 9, slug: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 10, slug: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 11, slug: 'photography', label: 'Photography', emoji: '📷' },
  { id: 12, slug: 'cooking', label: 'Cooking', emoji: '🍳' },
  { id: 13, slug: 'dancing', label: 'Dancing', emoji: '💃' },
  { id: 14, slug: 'pets', label: 'Pets', emoji: '🐾' },
  { id: 15, slug: 'startups', label: 'Startups & tech', emoji: '🚀' },
  { id: 16, slug: 'spirituality', label: 'Spirituality', emoji: '🧘' },
  { id: 17, slug: 'sports', label: 'Sports', emoji: '🏏' },
  { id: 18, slug: 'writing', label: 'Writing', emoji: '✍️' },
  { id: 19, slug: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 20, slug: 'comedy', label: 'Comedy', emoji: '😂' },
] as const;

const USERNAME_ADJECTIVES = [
  'amber', 'breezy', 'bright', 'calm', 'clever', 'coastal', 'curious', 'gentle',
  'golden', 'kind', 'lively', 'lucid', 'mellow', 'monsoon', 'quiet', 'radiant',
  'silver', 'sunny', 'vivid', 'warm', 'wandering',
] as const;
const USERNAME_NOUNS = [
  'comet', 'echo', 'fern', 'heron', 'kite', 'lantern', 'lotus', 'myna', 'neem',
  'river', 'sparrow', 'trail', 'wave', 'willow', 'zephyr', 'cove', 'firefly',
  'horizon', 'postcard', 'rain', 'terrace',
] as const;

export function generateUsername(rng: () => number = Math.random): string {
  const pick = <T>(values: readonly T[]) => values[Math.min(values.length - 1, Math.floor(Math.max(0, rng()) * values.length))];
  const suffix = String(Math.min(9999, Math.floor(Math.max(0, rng()) * 10_000))).padStart(4, '0');
  return `${pick(USERNAME_ADJECTIVES)}-${pick(USERNAME_NOUNS)}-${suffix}`;
}

export function defaultUser(userId: string): UserItem {
  const now = new Date().toISOString();
  return {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    entityType: 'USER',
    userId,
    username: '',
    display_name: '',
    birthdate: null,
    gender: null,
    avatar_id: '01',
    spot_hint: '',
    lat: null,
    lng: null,
    location_updated_at: null,
    expo_push_token: null,
    is_paused: false,
    is_suspended: false,
    suspended_at: null,
    onboarding_complete: false,
    rules_acknowledged_at: null,
    terms_accepted_at: null,
    terms_version: null,
    privacy_accepted_at: null,
    privacy_version: null,
    community_accepted_at: null,
    community_version: null,
    safety_acknowledged_at: null,
    created_at: now,
    revision: 0,
    interested_genders: [],
    age_min: 18,
    age_max: 99,
    radius_km: 10,
    available_days: [0, 1, 2, 3, 4, 5, 6],
    preferred_hour: 18,
    relationship_intent: 'open',
    social_energy: 'balanced',
    date_style: 'coffee',
    budget_level: 2,
    interest_ids: [],
  };
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radius = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const aLat = (a.lat * Math.PI) / 180;
  const bLat = (b.lat * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat) * Math.cos(bLat) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}

export function midpoint(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

export function ageFromBirthdate(birthdate: string, today = new Date()): number {
  const date = new Date(`${birthdate}T00:00:00Z`);
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  const month = today.getUTCMonth() - date.getUTCMonth();
  if (month < 0 || (month === 0 && today.getUTCDate() < date.getUTCDate())) age--;
  return age;
}

export function isAdultBirthdate(birthdate: string, now = new Date()): boolean {
  const parsed = new Date(`${birthdate}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(birthdate)
    && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === birthdate
    && ageFromBirthdate(birthdate, now) >= 18
    && ageFromBirthdate(birthdate, now) <= 100;
}

export function validateUser(item: UserItem): void {
  const genders: Gender[] = ['man', 'woman', 'nonbinary'];
  const avatars: AvatarId[] = ['01', '02', '03', '04', '05', '06', '07', '08'];
  const intents: RelationshipIntent[] = ['long_term', 'open', 'figuring_out'];
  const energies: SocialEnergy[] = ['quiet', 'balanced', 'lively'];
  const styles: DateStyle[] = ['coffee', 'activity', 'sober', 'anything'];
  const validIso = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
  if (typeof item.username !== 'string' || (item.username !== '' && !/^[a-z][a-z0-9-]{5,31}$/.test(item.username))) throw new Error('invalid username');
  if (typeof item.display_name !== 'string') throw new Error('invalid display name');
  if (item.display_name.length > 50) throw new Error('display name is too long');
  if (item.birthdate !== null && typeof item.birthdate !== 'string') throw new Error('invalid birthdate');
  if (item.birthdate && !isAdultBirthdate(item.birthdate)) throw new Error('you must be 18 or older');
  if (item.gender !== null && !genders.includes(item.gender)) throw new Error('invalid gender');
  if (!avatars.includes(item.avatar_id)) throw new Error('invalid avatar');
  if (typeof item.spot_hint !== 'string') throw new Error('invalid spot hint');
  if (item.spot_hint.length > 120) throw new Error('spot hint is too long');
  const coordinatePair = item.lat === null && item.lng === null
    || typeof item.lat === 'number' && Number.isFinite(item.lat) && item.lat >= -90 && item.lat <= 90
      && typeof item.lng === 'number' && Number.isFinite(item.lng) && item.lng >= -180 && item.lng <= 180;
  if (!coordinatePair) throw new Error('invalid location coordinates');
  if (item.location_updated_at !== null && !validIso(item.location_updated_at)) throw new Error('invalid location timestamp');
  if (item.expo_push_token !== null && (typeof item.expo_push_token !== 'string' || !/^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(item.expo_push_token) || item.expo_push_token.length > 512)) throw new Error('invalid push token');
  if (typeof item.is_paused !== 'boolean' || typeof item.is_suspended !== 'boolean' || typeof item.onboarding_complete !== 'boolean') throw new Error('invalid account state');
  if (item.suspended_at !== null && !validIso(item.suspended_at)) throw new Error('invalid suspension timestamp');
  if (item.rules_acknowledged_at !== null && !validIso(item.rules_acknowledged_at)) throw new Error('invalid rules acknowledgement');
  for (const value of [item.terms_accepted_at, item.privacy_accepted_at, item.community_accepted_at, item.safety_acknowledged_at]) {
    if (value !== null && !validIso(value)) throw new Error('invalid consent timestamp');
  }
  for (const value of [item.terms_version, item.privacy_version, item.community_version]) {
    if (value !== null && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))) throw new Error('invalid consent version');
  }
  if (!Array.isArray(item.interested_genders) || new Set(item.interested_genders).size !== item.interested_genders.length || item.interested_genders.some((value) => !genders.includes(value))) throw new Error('invalid interested genders');
  if (!Number.isInteger(item.age_min) || !Number.isInteger(item.age_max) || item.age_min < 18 || item.age_max > 99 || item.age_min > item.age_max) throw new Error('invalid age range');
  if (!Number.isInteger(item.radius_km) || item.radius_km < 1 || item.radius_km > 100) throw new Error('invalid radius');
  if (!Array.isArray(item.available_days) || !item.available_days.length || new Set(item.available_days).size !== item.available_days.length || !item.available_days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) throw new Error('invalid available day');
  if (!Number.isInteger(item.preferred_hour) || item.preferred_hour < 0 || item.preferred_hour > 23) throw new Error('invalid preferred hour');
  if (!intents.includes(item.relationship_intent)) throw new Error('invalid relationship intent');
  if (!energies.includes(item.social_energy)) throw new Error('invalid social energy');
  if (!styles.includes(item.date_style)) throw new Error('invalid date style');
  if (!Number.isInteger(item.budget_level) || item.budget_level < 1 || item.budget_level > 3) throw new Error('invalid budget');
  if (!Array.isArray(item.interest_ids) || new Set(item.interest_ids).size !== item.interest_ids.length || item.interest_ids.length > 5 || item.interest_ids.some((id) => !Number.isInteger(id) || !INTERESTS.some((interest) => interest.id === id))) throw new Error('invalid interests');
  if (item.onboarding_complete && (
    !item.username
    || !item.display_name.trim()
    || !item.birthdate
    || !item.gender
    || item.spot_hint.trim().length < 8
    || !item.rules_acknowledged_at
    || !item.terms_accepted_at
    || !item.terms_version
    || !item.privacy_accepted_at
    || !item.privacy_version
    || !item.community_accepted_at
    || !item.community_version
    || !item.safety_acknowledged_at
    || !item.interested_genders.length
    || !item.interest_ids.length
  )) throw new Error('invalid incomplete onboarding profile');
}

export function matchTiming(windowStart: string) {
  const start = new Date(windowStart).getTime();
  if (!Number.isFinite(start)) throw new Error('invalid meet window');
  return {
    confirmationOpensAt: new Date(start - 24 * 60 * 60_000).toISOString(),
    phraseOpensAt: new Date(start - 30 * 60_000).toISOString(),
  };
}

export function withPoolIndex(item: UserItem): UserItem {
  const eligible = item.onboarding_complete
    && !item.is_paused
    && !item.is_suspended
    && item.lat !== null
    && item.lng !== null
    && !!item.location_updated_at;
  const next = { ...item };
  if (eligible) {
    next.GSI1PK = 'POOL';
    next.GSI1SK = `USER#${item.userId}`;
  } else {
    delete next.GSI1PK;
    delete next.GSI1SK;
  }
  return next;
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 0;
  const setA = new Set(a);
  const intersection = [...new Set(b)].filter((value) => setA.has(value)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

function privateCompatibility(a: Candidate, b: Candidate): number {
  const intent = a.relationshipIntent === b.relationshipIntent ? 1 : a.relationshipIntent === 'open' || b.relationshipIntent === 'open' ? 0.72 : 0.3;
  const energy = a.socialEnergy === b.socialEnergy ? 1 : a.socialEnergy === 'balanced' || b.socialEnergy === 'balanced' ? 0.72 : 0.35;
  const style = a.dateStyle === b.dateStyle ? 1 : a.dateStyle === 'anything' || b.dateStyle === 'anything' ? 0.82 : (a.dateStyle === 'sober' && b.dateStyle === 'coffee') || (a.dateStyle === 'coffee' && b.dateStyle === 'sober') ? 0.78 : 0.4;
  const budget = 1 - Math.min(Math.abs(a.budgetLevel - b.budgetLevel), 2) / 2;
  return (intent + energy + style + budget) / 4;
}

export function mutuallyEligible(a: Candidate, b: Candidate, previousPairs: ReadonlySet<string>): boolean {
  if (a.userId === b.userId || previousPairs.has(pairKey(a.userId, b.userId))) return false;
  if (!a.interestedGenders.includes(b.gender) || !b.interestedGenders.includes(a.gender)) return false;
  if (b.age < a.ageMin || b.age > a.ageMax || a.age < b.ageMin || a.age > b.ageMax) return false;
  return haversineKm(a, b) <= Math.min(a.radiusKm, b.radiusKm);
}

export function scorePair(a: Candidate, b: Candidate, rng: () => number): number {
  const maxDistance = Math.min(a.radiusKm, b.radiusKm);
  const distance = 1 - Math.min(haversineKm(a, b) / maxDistance, 1);
  return 0.2 * jaccard(a.interests, b.interests)
    + 0.2 * distance
    + 0.3 * privateCompatibility(a, b)
    + 0.3 * rng();
}

export function pairPool(pool: Candidate[], previousPairs: ReadonlySet<string>, rng = Math.random) {
  const order = [...pool];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const paired = new Set<string>();
  const result: Array<{ a: string; b: string; score: number }> = [];
  for (const me of order) {
    if (paired.has(me.userId)) continue;
    let best: { other: Candidate; score: number } | null = null;
    for (const other of order) {
      if (paired.has(other.userId) || !mutuallyEligible(me, other, previousPairs)) continue;
      const score = scorePair(me, other, rng);
      if (!best || score > best.score) best = { other, score };
    }
    if (best) {
      paired.add(me.userId);
      paired.add(best.other.userId);
      result.push({ a: me.userId, b: best.other.userId, score: best.score });
    }
  }
  return result;
}

function timezoneOffsetMinutes(timezone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) parts[part.type] = part.value;
  const utc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
  return (utc - date.getTime()) / 60000;
}

export function nextEveningWindow(timezone: string, hourLocal = 18, durationMinutes = 60, from = new Date()) {
  const tomorrow = new Date(from.getTime() + 24 * 3600_000);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow);
  const naive = new Date(`${date}T${String(hourLocal).padStart(2, '0')}:00:00Z`);
  const start = new Date(naive.getTime() - timezoneOffsetMinutes(timezone, naive) * 60_000);
  return { start, end: new Date(start.getTime() + durationMinutes * 60_000) };
}

export function nextLocalWeekday(timezone: string, from = new Date()): number {
  const tomorrow = new Date(from.getTime() + 24 * 3600_000);
  const short = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(tomorrow);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(short);
}

const PHRASE_LEFT = [
  'Amber', 'Apricot', 'Blue', 'Copper', 'Golden', 'Indigo', 'Ivory', 'Lilac',
  'Mint', 'Quiet', 'Saffron', 'Silver', 'Soft', 'Velvet', 'Warm', 'Wild',
];
const PHRASE_RIGHT = [
  'atlas', 'comet', 'garden', 'harbour', 'lantern', 'moon', 'orbit', 'paper',
  'postcard', 'rain', 'sparrow', 'starlight', 'teacup', 'window', 'wing', 'wonder',
];

export function meetingPhrase(rng = Math.random): string {
  return `${PHRASE_LEFT[Math.floor(rng() * PHRASE_LEFT.length)]} ${PHRASE_RIGHT[Math.floor(rng() * PHRASE_RIGHT.length)]}`;
}

export function toCandidate(item: UserItem): Candidate | null {
  if (!item.gender || !item.birthdate || item.lat == null || item.lng == null) return null;
  return {
    userId: item.userId,
    gender: item.gender,
    age: ageFromBirthdate(item.birthdate),
    lat: item.lat,
    lng: item.lng,
    interestedGenders: item.interested_genders,
    ageMin: item.age_min,
    ageMax: item.age_max,
    radiusKm: item.radius_km,
    interests: item.interest_ids
      .map((id) => INTERESTS.find((interest) => interest.id === id)?.slug)
      .filter((value) => value !== undefined) as string[],
    relationshipIntent: item.relationship_intent,
    socialEnergy: item.social_energy,
    dateStyle: item.date_style,
    budgetLevel: item.budget_level,
  };
}
