// The "hidden algorithm". Pure TypeScript: no Deno/Node APIs so it can be
// unit-tested with vitest and imported by Supabase edge functions alike.

export type Gender = 'man' | 'woman' | 'nonbinary';

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
}

export interface ScoredPair {
  a: string;
  b: string;
  score: number;
}

// Serendipity-heavy weights: random jitter dominates so matches feel like
// fate, not optimization. Interest overlap and proximity nudge, not decide.
const W_INTERESTS = 0.35;
const W_DISTANCE = 0.25;
const W_RANDOM = 0.4;

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function midpoint(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): { lat: number; lng: number } {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

/** Hard filters — every constraint must hold in BOTH directions. */
export function mutuallyEligible(
  a: Candidate,
  b: Candidate,
  previousPairs: ReadonlySet<string>,
): boolean {
  if (a.userId === b.userId) return false;
  if (previousPairs.has(pairKey(a.userId, b.userId))) return false;
  if (!a.interestedGenders.includes(b.gender)) return false;
  if (!b.interestedGenders.includes(a.gender)) return false;
  if (b.age < a.ageMin || b.age > a.ageMax) return false;
  if (a.age < b.ageMin || a.age > b.ageMax) return false;
  const dist = haversineKm(a, b);
  if (dist > Math.min(a.radiusKm, b.radiusKm)) return false;
  return true;
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  let inter = 0;
  for (const x of new Set(b)) if (setA.has(x)) inter++;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

export function scorePair(a: Candidate, b: Candidate, rng: () => number): number {
  const interestScore = jaccard(a.interests, b.interests);
  const maxDist = Math.min(a.radiusKm, b.radiusKm);
  const distanceScore = 1 - Math.min(haversineKm(a, b) / maxDist, 1);
  return W_INTERESTS * interestScore + W_DISTANCE * distanceScore + W_RANDOM * rng();
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Greedy pairing: shuffle the pool, then give each still-unpaired user their
 * best-scoring eligible partner. At MVP scale this is plenty; swap in a
 * weighted-matching solver later if liquidity demands it.
 */
export function pairPool(
  pool: Candidate[],
  previousPairs: ReadonlySet<string>,
  rng: () => number = Math.random,
): ScoredPair[] {
  const order = shuffle(pool, rng);
  const paired = new Set<string>();
  const result: ScoredPair[] = [];

  for (const me of order) {
    if (paired.has(me.userId)) continue;
    let best: { partner: Candidate; score: number } | null = null;
    for (const other of order) {
      if (paired.has(other.userId)) continue;
      if (!mutuallyEligible(me, other, previousPairs)) continue;
      const s = scorePair(me, other, rng);
      if (!best || s > best.score) best = { partner: other, score: s };
    }
    if (best) {
      paired.add(me.userId);
      paired.add(best.partner.userId);
      result.push({ a: me.userId, b: best.partner.userId, score: best.score });
    }
  }
  return result;
}

export function ageFromBirthdate(birthdate: string, today: Date = new Date()): number {
  const bd = new Date(birthdate);
  let age = today.getUTCFullYear() - bd.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - bd.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < bd.getUTCDate())) age--;
  return age;
}
