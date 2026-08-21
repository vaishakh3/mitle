import { describe, expect, it } from 'vitest';
import { authErrorMessage } from '../apps/mobile/lib/auth-errors';

describe('sign-in error copy', () => {
  it('turns native Android network failures into a useful message', () => {
    expect(authErrorMessage(new TypeError('fetch failed: java.net.UnknownHostException: Unable to resolve host cognito-idp.ap-south-1.amazonaws.com')))
      .toBe('Milte could not reach the city. Check your connection and try again.');
  });

  it('gives specific recovery guidance for expected Cognito errors', () => {
    const mismatch = Object.assign(new Error('bad code'), { code: 'CodeMismatchException' });
    expect(authErrorMessage(mismatch)).toContain('six digits');
  });

  it('does not expose unknown provider or infrastructure errors', () => {
    expect(authErrorMessage(new Error('AWS did not return a complete session.')))
      .toBe('Sign-in could not be completed. Please try again shortly.');
  });
});
