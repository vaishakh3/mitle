import { describe, expect, it } from 'vitest';
import { authErrorMessage, authErrorRetryAfter } from '../apps/mobile/lib/auth-errors';

describe('sign-in error copy', () => {
  it('turns native Android network failures into a useful message', () => {
    expect(authErrorMessage(new TypeError('fetch failed: java.net.UnknownHostException: Unable to resolve host cognito-idp.ap-south-1.amazonaws.com')))
      .toBe('Milte could not reach the city. Check your connection and try again.');
  });

  it('gives specific recovery guidance for expected Cognito errors', () => {
    const mismatch = Object.assign(new Error('bad code'), { code: 'CodeMismatchException' });
    expect(authErrorMessage(mismatch)).toContain('six digits');
  });

  it('does not blame a new tester for the provider-wide email ceiling', () => {
    const limited = Object.assign(new Error('Attempt limit exceeded'), {
      code: 'LimitExceededException',
      retryAfterSeconds: 3_600,
    });
    expect(authErrorMessage(limited)).toContain('Your address is fine');
    expect(authErrorMessage(limited)).not.toContain('you made');
    expect(authErrorRetryAfter(limited)).toBe(3_600);
  });

  it('explains a locally suppressed duplicate request', () => {
    const cooldown = Object.assign(new Error('duplicate'), { code: 'AuthCooldown', retryAfterSeconds: 119 });
    expect(authErrorMessage(cooldown)).toContain('about 2 minutes');
  });

  it('preserves the two-code transition after confirming a new account', () => {
    expect(authErrorMessage(new Error('Your account is confirmed. Enter the new sign-in code we just sent.')))
      .toBe('Your account is confirmed. Enter the new sign-in code we just sent.');
  });

  it('does not expose unknown provider or infrastructure errors', () => {
    expect(authErrorMessage(new Error('AWS did not return a complete session.')))
      .toBe('Sign-in could not be completed. Please try again shortly.');
  });
});
