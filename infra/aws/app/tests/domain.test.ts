import { describe, expect, it } from 'vitest';
import {
  Candidate,
  defaultUser,
  generateUsername,
  isAdultBirthdate,
  meetingPhrase,
  matchTiming,
  mutuallyEligible,
  nextEveningWindow,
  pairKey,
  pairPool,
  toCandidate,
  validateUser,
  withPoolIndex,
} from '../src/domain.js';

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    userId: crypto.randomUUID(), gender: 'woman', age: 28, lat: 12.9716, lng: 77.5946,
    interestedGenders: ['man'], ageMin: 23, ageMax: 36, radiusKm: 25,
    interests: ['coffee', 'books'], relationshipIntent: 'open', socialEnergy: 'balanced',
    dateStyle: 'coffee', budgetLevel: 2, ...overrides,
  };
}

describe('AWS domain', () => {
  it('enforces mutual boundaries and pair history', () => {
    const a = candidate();
    const b = candidate({ gender: 'man', interestedGenders: ['woman'] });
    expect(mutuallyEligible(a, b, new Set())).toBe(true);
    expect(mutuallyEligible(a, b, new Set([pairKey(a.userId, b.userId)]))).toBe(false);
  });

  it('never pairs a person twice', () => {
    const pool = [candidate(), candidate(), candidate({ gender: 'man', interestedGenders: ['woman'] }), candidate({ gender: 'man', interestedGenders: ['woman'] })];
    const pairs = pairPool(pool, new Set(), () => 0.5);
    expect(new Set(pairs.flatMap((pair) => [pair.a, pair.b])).size).toBe(pairs.length * 2);
  });

  it('creates the expected India launch window', () => {
    const { start } = nextEveningWindow('Asia/Kolkata', 18, 60, new Date('2026-08-19T02:00:00Z'));
    expect(start.toISOString()).toBe('2026-08-20T12:30:00.000Z');
  });

  it('enforces adulthood and matching pool eligibility', () => {
    expect(isAdultBirthdate('2012-01-01', new Date('2026-08-19T00:00:00Z'))).toBe(false);
    const user = defaultUser('one');
    expect(user.avatar_id).toBe('01');
    expect(generateUsername(() => 0)).toBe('amber-comet-0000');
    expect(withPoolIndex(user).GSI1PK).toBeUndefined();
    expect(withPoolIndex({ ...user, onboarding_complete: true }).GSI1PK).toBeUndefined();
    const ready = withPoolIndex({
      ...user,
      onboarding_complete: true,
      lat: 12.97,
      lng: 77.59,
      location_updated_at: '2026-08-21T00:00:00.000Z',
    });
    expect(ready.GSI1PK).toBe('POOL');
  });

  it('turns a complete user item into a private candidate', () => {
    const user = defaultUser('one');
    const ready = { ...user, birthdate: '1998-01-01', gender: 'woman' as const, lat: 12.97, lng: 77.59, interest_ids: [1, 2] };
    expect(toCandidate(ready)?.interests).toEqual(['coffee', 'books']);
  });

  it('allows onboarding to finish before location while keeping the user out of the pool', () => {
    const acceptedAt = '2026-08-21T00:00:00.000Z';
    const user = {
      ...defaultUser('one'),
      username: 'quiet-lantern-4821',
      display_name: 'Release',
      birthdate: '2001-08-21',
      gender: 'nonbinary' as const,
      spot_hint: 'Blue shirt with a paperback',
      onboarding_complete: true,
      rules_acknowledged_at: acceptedAt,
      terms_accepted_at: acceptedAt,
      terms_version: '2026-08-19',
      privacy_accepted_at: acceptedAt,
      privacy_version: '2026-08-19',
      community_accepted_at: acceptedAt,
      community_version: '2026-08-19',
      safety_acknowledged_at: acceptedAt,
      interested_genders: ['woman' as const],
      interest_ids: [1],
    };
    expect(() => validateUser(user)).not.toThrow();
    expect(withPoolIndex(user).GSI1PK).toBeUndefined();
  });

  it('generates a two-word recognition phrase', () => {
    expect(meetingPhrase(() => 0)).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
    const phrases = Array.from({ length: 64 }, (_, index) => {
      let call = 0;
      return meetingPhrase(() => call++ === 0 ? Math.floor(index / 16) / 16 : (index % 16) / 16);
    });
    expect(new Set(phrases).size).toBe(64);
  });

  it('opens confirmation one day before the recognition phrase', () => {
    expect(matchTiming('2026-08-22T12:30:00.000Z')).toEqual({
      confirmationOpensAt: '2026-08-21T12:30:00.000Z',
      phraseOpensAt: '2026-08-22T12:00:00.000Z',
    });
  });

  it('rejects malformed profile fields before storage', () => {
    const user = defaultUser('one');
    expect(() => validateUser({ ...user, display_name: 42 } as unknown as typeof user)).toThrow('invalid display name');
    expect(() => validateUser({ ...user, lat: 91, lng: 77 })).toThrow('invalid location coordinates');
    expect(() => validateUser({ ...user, interested_genders: ['unknown'] } as unknown as typeof user)).toThrow('invalid interested genders');
    expect(() => validateUser({ ...user, avatar_id: 'selfie' } as unknown as typeof user)).toThrow('invalid avatar');
  });

  it('rejects impossible calendar dates', () => {
    expect(isAdultBirthdate('1998-02-31', new Date('2026-08-19T00:00:00Z'))).toBe(false);
  });
});
