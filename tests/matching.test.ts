import { describe, expect, it } from 'vitest';
import {
  ageFromBirthdate,
  Candidate,
  haversineKm,
  midpoint,
  mutuallyEligible,
  pairKey,
  pairPool,
  scorePair,
} from '../supabase/functions/_shared/matching.ts';
import { nextEveningWindow } from '../supabase/functions/_shared/time.ts';

// Deterministic RNG for reproducible tests
function seededRng(seed = 42): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    userId: crypto.randomUUID(),
    gender: 'woman',
    age: 28,
    lat: 12.9716,
    lng: 77.5946, // Bangalore
    interestedGenders: ['man'],
    ageMin: 24,
    ageMax: 35,
    radiusKm: 25,
    interests: ['coffee', 'books'],
    ...overrides,
  };
}

function man(overrides: Partial<Candidate> = {}): Candidate {
  return candidate({ gender: 'man', interestedGenders: ['woman'], ...overrides });
}

const NO_HISTORY = new Set<string>();

describe('haversineKm', () => {
  it('is ~0 for identical points', () => {
    const p = { lat: 12.97, lng: 77.59 };
    expect(haversineKm(p, p)).toBeCloseTo(0);
  });

  it('computes a known distance (Bangalore -> Chennai ~290km)', () => {
    const blr = { lat: 12.9716, lng: 77.5946 };
    const chn = { lat: 13.0827, lng: 80.2707 };
    const d = haversineKm(blr, chn);
    expect(d).toBeGreaterThan(280);
    expect(d).toBeLessThan(300);
  });
});

describe('mutuallyEligible', () => {
  it('accepts a compatible pair', () => {
    expect(mutuallyEligible(candidate(), man(), NO_HISTORY)).toBe(true);
  });

  it('rejects self', () => {
    const a = candidate();
    expect(mutuallyEligible(a, a, NO_HISTORY)).toBe(false);
  });

  it('requires gender interest in BOTH directions', () => {
    const a = candidate({ interestedGenders: ['man'] });
    const b = man({ interestedGenders: ['man'] }); // b not into women
    expect(mutuallyEligible(a, b, NO_HISTORY)).toBe(false);
  });

  it('enforces both age ranges', () => {
    const a = candidate({ age: 40 }); // outside b's 24-35
    const b = man();
    expect(mutuallyEligible(a, b, NO_HISTORY)).toBe(false);
    const c = man({ age: 22 }); // outside a's 24-35
    expect(mutuallyEligible(candidate(), c, NO_HISTORY)).toBe(false);
  });

  it('enforces the SMALLER of the two radii', () => {
    // ~15km apart
    const a = candidate({ lat: 12.9716, lng: 77.5946, radiusKm: 50 });
    const b = man({ lat: 12.9716, lng: 77.7326, radiusKm: 10 });
    expect(mutuallyEligible(a, b, NO_HISTORY)).toBe(false);
    const c = man({ lat: 12.9716, lng: 77.7326, radiusKm: 50 });
    expect(mutuallyEligible(a, c, NO_HISTORY)).toBe(true);
  });

  it('never re-matches a previous pair', () => {
    const a = candidate();
    const b = man();
    const history = new Set([pairKey(a.userId, b.userId)]);
    expect(mutuallyEligible(a, b, history)).toBe(false);
  });
});

describe('scorePair', () => {
  it('scores shared interests higher (with rng pinned)', () => {
    const rng = () => 0.5;
    const a = candidate({ interests: ['coffee', 'books', 'film'] });
    const soulmate = man({ interests: ['coffee', 'books', 'film'] });
    const stranger = man({ interests: ['gaming', 'sports', 'cars'] });
    expect(scorePair(a, soulmate, rng)).toBeGreaterThan(scorePair(a, stranger, rng));
  });

  it('stays within [0, 1]', () => {
    const s = scorePair(candidate(), man(), () => 1);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe('pairPool', () => {
  it('pairs everyone in a fully compatible even pool', () => {
    const pool = [candidate(), candidate(), man(), man()];
    const pairs = pairPool(pool, NO_HISTORY, seededRng());
    expect(pairs).toHaveLength(2);
  });

  it('never pairs a user twice in one run', () => {
    const pool = Array.from({ length: 20 }, (_, i) =>
      i % 2 === 0 ? candidate() : man(),
    );
    const pairs = pairPool(pool, NO_HISTORY, seededRng());
    const seen = new Set<string>();
    for (const p of pairs) {
      expect(seen.has(p.a)).toBe(false);
      expect(seen.has(p.b)).toBe(false);
      seen.add(p.a);
      seen.add(p.b);
    }
  });

  it('leaves incompatible users unmatched rather than forcing pairs', () => {
    const pool = [
      candidate({ interestedGenders: ['man'] }),
      candidate({ interestedGenders: ['man'] }), // two women only into men
    ];
    expect(pairPool(pool, NO_HISTORY, seededRng())).toHaveLength(0);
  });

  it('respects match history across runs', () => {
    const a = candidate();
    const b = man();
    const history = new Set([pairKey(a.userId, b.userId)]);
    expect(pairPool([a, b], history, seededRng())).toHaveLength(0);
  });

  it('all produced pairs are mutually eligible', () => {
    const rng = seededRng(7);
    const genders: Array<Candidate['gender']> = ['man', 'woman', 'nonbinary'];
    const pool = Array.from({ length: 40 }, () =>
      candidate({
        gender: genders[Math.floor(rng() * 3)],
        interestedGenders: genders.filter(() => rng() > 0.4),
        age: 20 + Math.floor(rng() * 20),
        ageMin: 18 + Math.floor(rng() * 5),
        ageMax: 30 + Math.floor(rng() * 15),
        lat: 12.9 + rng() * 0.3,
        lng: 77.5 + rng() * 0.3,
        radiusKm: 5 + Math.floor(rng() * 45),
        interests: ['coffee', 'books', 'film', 'music'].filter(() => rng() > 0.5),
      }),
    );
    const byId = new Map(pool.map((c) => [c.userId, c]));
    for (const p of pairPool(pool, NO_HISTORY, seededRng(99))) {
      expect(mutuallyEligible(byId.get(p.a)!, byId.get(p.b)!, NO_HISTORY)).toBe(true);
    }
  });
});

describe('ageFromBirthdate', () => {
  it('computes age correctly around birthdays', () => {
    const today = new Date('2026-08-09T00:00:00Z');
    expect(ageFromBirthdate('1998-08-09', today)).toBe(28);
    expect(ageFromBirthdate('1998-08-10', today)).toBe(27);
  });
});

describe('midpoint', () => {
  it('is halfway between the two users', () => {
    const m = midpoint({ lat: 10, lng: 70 }, { lat: 20, lng: 80 });
    expect(m).toEqual({ lat: 15, lng: 75 });
  });
});

describe('nextEveningWindow', () => {
  it('lands on tomorrow 18:00 in the given timezone, 60 minutes long', () => {
    const from = new Date('2026-08-09T05:00:00Z'); // 10:30 IST
    const { start, end } = nextEveningWindow('Asia/Kolkata', 18, 60, from);
    // 2026-08-10 18:00 IST == 12:30 UTC
    expect(start.toISOString()).toBe('2026-08-10T12:30:00.000Z');
    expect(end.getTime() - start.getTime()).toBe(60 * 60000);
  });

  it('handles UTC too', () => {
    const from = new Date('2026-08-09T05:00:00Z');
    const { start } = nextEveningWindow('UTC', 18, 60, from);
    expect(start.toISOString()).toBe('2026-08-10T18:00:00.000Z');
  });
});
