interface AuthErrorLike {
  code?: string;
  message?: string;
  name?: string;
}

function errorCode(error: unknown) {
  return (error as AuthErrorLike | undefined)?.code;
}

function errorMessage(error: unknown) {
  return (error as AuthErrorLike | undefined)?.message ?? '';
}

export function authErrorMessage(error: unknown): string {
  const message = errorMessage(error);

  if (/fetch failed|network request failed|unknownhost|unable to resolve host|enetunreach|econnreset|internet connection/i.test(message)) {
    return 'Milte could not reach the city. Check your connection and try again.';
  }

  switch (errorCode(error)) {
    case 'CodeMismatchException':
      return 'That code is not correct. Check the six digits and try again.';
    case 'ExpiredCodeException':
      return 'That code has expired. Request a fresh one below.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return 'Too many attempts were made. Wait a few minutes, then request a new code.';
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
      return 'Sign-in could not be completed. Please try again shortly.';
  }
}
