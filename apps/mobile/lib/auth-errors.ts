interface AuthErrorLike {
  code?: string;
  message?: string;
  name?: string;
  retryAfterSeconds?: number;
}

function errorCode(error: unknown) {
  return (error as AuthErrorLike | undefined)?.code;
}

function errorMessage(error: unknown) {
  return (error as AuthErrorLike | undefined)?.message ?? '';
}

export function authErrorRetryAfter(error: unknown): number {
  const value = (error as AuthErrorLike | undefined)?.retryAfterSeconds;
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.ceil(value)) : 0;
}

export function authErrorMessage(error: unknown): string {
  const message = errorMessage(error);

  if (/fetch failed|network request failed|unknownhost|unable to resolve host|enetunreach|econnreset|internet connection/i.test(message)) {
    return 'Milte could not reach the city. Check your connection and try again.';
  }

  switch (errorCode(error)) {
    case 'CodeMismatchException':
      return 'That code is not correct. Check the code and try again.';
    case 'ExpiredCodeException':
      return 'That code has expired. Request a fresh one below.';
    case 'LimitExceededException':
      return 'Milte’s email delivery is temporarily paused. Your address is fine—please try again later or contact support if it continues.';
    case 'TooManyRequestsException':
      return 'Milte’s sign-in service is briefly busy. Your address is fine—please wait a moment and try again.';
    case 'AuthCooldown': {
      const retryAfter = authErrorRetryAfter(error);
      const minutes = Math.max(1, Math.ceil(retryAfter / 60));
      return `A code was already requested for this address. You can request another in about ${minutes} minute${minutes === 1 ? '' : 's'}.`;
    }
    case 'InvalidParameterException':
      return 'We could not use that email or code. Check it and try again.';
    case 'NotAuthorizedException':
      return 'That sign-in attempt has expired. Request a fresh code.';
    case 'UserNotFoundException':
      return 'We could not find that account. Go back and request a new code.';
    case 'UserLambdaValidationException':
      return 'We could not send an email right now. Please try again shortly.';
    default:
      if (message === 'Go back and enter your email to request a fresh code.' || message === 'Request a fresh code first.') {
        return message;
      }
      if (message === 'Your account is confirmed. Enter the new sign-in code we just sent.') return message;
      return 'Sign-in could not be completed. Please try again shortly.';
  }
}
