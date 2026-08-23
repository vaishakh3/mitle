import { describe, expect, it } from 'vitest';

import {
  AUTH_PROVIDER_BACKOFF_MS,
  AUTH_REQUEST_MIN_INTERVAL_MS,
  AUTH_REQUEST_WINDOW_MS,
  authRetryAfterSeconds,
  formatRetryDuration,
  nextAuthRequestAt,
  normalizeAuthEmail,
  providerBackoff,
  recordAuthRequest,
} from '../apps/mobile/lib/auth-flow';

describe('authentication request throttling', () => {
  const now = Date.UTC(2026, 7, 23, 9, 0, 0);

  it('normalizes addresses before using them as request keys', () => {
    expect(normalizeAuthEmail('  Person+Test@Example.COM ')).toBe('person+test@example.com');
  });

  it('prevents an immediate duplicate request while preserving the existing code', () => {
    const history = recordAuthRequest(null, now);
    expect(nextAuthRequestAt(history, now)).toBe(now + AUTH_REQUEST_MIN_INTERVAL_MS);
    expect(authRetryAfterSeconds(history, now + 10_000)).toBe(50);
  });

  it('caps the rolling request history below Cognito resend limits', () => {
    const requestTimes = [now - 45 * 60_000, now - 30 * 60_000, now - 15 * 60_000, now - 60_000];
    expect(nextAuthRequestAt({ requestTimes }, now)).toBe(requestTimes[0] + AUTH_REQUEST_WINDOW_MS);
    expect(authRetryAfterSeconds({ requestTimes }, now)).toBe(15 * 60);
  });

  it('expires old request history cleanly', () => {
    expect(nextAuthRequestAt({ requestTimes: [now - AUTH_REQUEST_WINDOW_MS] }, now)).toBe(now);
  });

  it('applies a meaningful provider backoff for shared email-delivery limits', () => {
    expect(providerBackoff('LimitExceededException', now)).toBe(now + AUTH_PROVIDER_BACKOFF_MS);
    expect(providerBackoff('CodeMismatchException', now)).toBeUndefined();
  });

  it('formats retry time without exposing implementation details', () => {
    expect(formatRetryDuration(45)).toBe('45 seconds');
    expect(formatRetryDuration(61)).toBe('2 minutes');
    expect(formatRetryDuration(3_601)).toBe('2 hours');
  });
});
