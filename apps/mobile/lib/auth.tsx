import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  authRetryAfterSeconds,
  normalizeAuthEmail,
  providerBackoff,
  recordAuthRequest,
  type AuthRequestHistory,
} from './auth-flow';

export { authErrorMessage, authErrorRetryAfter } from './auth-errors';

const appExtra = Constants.expoConfig?.extra;
const REGION = process.env.EXPO_PUBLIC_AWS_REGION || String(appExtra?.awsRegion ?? '');
const CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || String(appExtra?.cognitoClientId ?? '');
const PLAY_REVIEW_EMAIL = process.env.EXPO_PUBLIC_PLAY_REVIEW_EMAIL || String(appExtra?.playReviewEmail ?? '');
const STORAGE_KEY = 'milte.aws.session.v1';
const PENDING_KEY = 'milte.aws.pending-auth.v1';

export interface Session {
  accessToken: string;
  idToken: string;
  refreshToken: string | null;
  expiresAt: number;
  user: { id: string; email: string };
}

interface PendingAuth extends AuthRequestHistory {
  email: string;
  kind: 'confirm' | 'signin' | 'password';
  session?: string;
  delivered: boolean;
}

export interface AuthRequestResult {
  reused: boolean;
  retryAfterSeconds: number;
}

interface CognitoError extends Error {
  code?: string;
}

interface AuthState {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, loading: true });
const listeners = new Set<(session: Session | null) => void>();
let currentSession: Session | null = null;
const authRequestsInFlight = new Map<string, Promise<AuthRequestResult>>();

async function storageGet(key: string) {
  return Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string) {
  return Platform.OS === 'web' ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string) {
  return Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
}

async function pendingAuth(): Promise<PendingAuth | null> {
  const raw = await storageGet(PENDING_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingAuth>;
    if (!value.email || !['confirm', 'signin', 'password'].includes(String(value.kind))) throw new Error('invalid pending auth');
    return {
      email: normalizeAuthEmail(value.email),
      kind: value.kind as PendingAuth['kind'],
      session: value.session,
      delivered: value.delivered !== false,
      requestTimes: Array.isArray(value.requestTimes) ? value.requestTimes.filter((time): time is number => typeof time === 'number') : [],
      retryAt: typeof value.retryAt === 'number' ? value.retryAt : undefined,
    };
  } catch {
    await storageDelete(PENDING_KEY);
    return null;
  }
}

async function savePendingAuth(value: PendingAuth) {
  await storageSet(PENDING_KEY, JSON.stringify(value));
}

function retryableError(error: unknown, retryAfterSeconds: number, code = errorCode(error)): Error & { code?: string; retryAfterSeconds: number } {
  const result = error instanceof Error ? error : new Error('Sign-in could not be completed.');
  const retryable = result as Error & { code?: string; retryAfterSeconds: number };
  retryable.code = code;
  retryable.retryAfterSeconds = retryAfterSeconds;
  return retryable;
}

function cooldownError(retryAfterSeconds: number) {
  return retryableError(new Error('A code was already requested.'), retryAfterSeconds, 'AuthCooldown');
}

function decodeJwt(token: string): Record<string, unknown> {
  try {
    const value = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(globalThis.atob(value.padEnd(Math.ceil(value.length / 4) * 4, '=')));
  } catch {
    return {};
  }
}

async function cognito<T>(target: string, body: Record<string, unknown>): Promise<T> {
  if (!REGION || !CLIENT_ID) throw new Error('Milte has not been connected to AWS yet.');
  const response = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof result.message === 'string' ? result.message : 'Sign-in could not be completed.') as Error & { code?: string };
    error.code = String(result.__type ?? '').split('#').pop();
    throw error;
  }
  return result as T;
}

function errorCode(error: unknown) {
  return (error as CognitoError | undefined)?.code;
}

export function isPlayReviewEmail(rawEmail: string): boolean {
  return Boolean(PLAY_REVIEW_EMAIL) && rawEmail.trim().toLowerCase() === PLAY_REVIEW_EMAIL.trim().toLowerCase();
}

async function withProviderBackoff(email: string, previous: PendingAuth | null, error: unknown): Promise<never> {
  const now = Date.now();
  const retryAt = providerBackoff(errorCode(error), now);
  if (!retryAt) throw error;
  const pending: PendingAuth = {
    email,
    kind: previous?.email === email ? previous.kind : 'confirm',
    session: previous?.email === email ? previous.session : undefined,
    delivered: previous?.email === email ? previous.delivered : false,
    requestTimes: previous?.email === email ? previous.requestTimes : [],
    retryAt,
  };
  await savePendingAuth(pending);
  throw retryableError(error, authRetryAfterSeconds(pending, now));
}

async function startExistingAuth(email: string, previous: PendingAuth | null, now: number): Promise<PendingAuth> {
  try {
    const result = await cognito<{ Session?: string }>('InitiateAuth', {
      AuthFlow: 'USER_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: 'EMAIL_OTP' },
    });
    if (!result.Session) throw new Error('AWS did not start the sign-in challenge.');
    const history = recordAuthRequest(previous?.email === email ? previous : null, now);
    const pending = { email, kind: 'signin', session: result.Session, delivered: true, ...history } satisfies PendingAuth;
    await savePendingAuth(pending);
    return pending;
  } catch (error) {
    if (errorCode(error) !== 'UserNotConfirmedException') throw error;
    await cognito('ResendConfirmationCode', { ClientId: CLIENT_ID, Username: email });
    const history = recordAuthRequest(previous?.email === email ? previous : null, now);
    const pending = { email, kind: 'confirm', delivered: true, ...history } satisfies PendingAuth;
    await savePendingAuth(pending);
    return pending;
  }
}

async function publish(session: Session | null) {
  currentSession = session;
  if (session) await storageSet(STORAGE_KEY, JSON.stringify(session));
  else await storageDelete(STORAGE_KEY);
  for (const listener of listeners) listener(session);
}

function sessionFromResult(result: Record<string, string | number | undefined>, email: string, oldRefreshToken?: string | null): Session {
  const accessToken = String(result.AccessToken ?? '');
  const idToken = String(result.IdToken ?? '');
  if (!accessToken || !idToken) throw new Error('AWS did not return a complete session.');
  const claims = decodeJwt(idToken);
  return {
    accessToken,
    idToken,
    refreshToken: result.RefreshToken ? String(result.RefreshToken) : oldRefreshToken ?? null,
    expiresAt: Date.now() + (Number(result.ExpiresIn ?? 3600) - 60) * 1000,
    user: { id: String(claims.sub ?? ''), email: String(claims.email ?? email) },
  };
}

async function beginEmailAuthOnce(email: string): Promise<AuthRequestResult> {
  if (isPlayReviewEmail(email)) {
    await savePendingAuth({ email, kind: 'password', delivered: true });
    return { reused: false, retryAfterSeconds: 0 };
  }

  const previous = await pendingAuth();
  const samePending = previous?.email === email ? previous : null;
  const now = Date.now();
  const retryAfterSeconds = authRetryAfterSeconds(samePending, now);
  if (retryAfterSeconds > 0) {
    if (samePending?.delivered) return { reused: true, retryAfterSeconds };
    throw cooldownError(retryAfterSeconds);
  }

  try {
    await cognito('SignUp', {
      ClientId: CLIENT_ID,
      Username: email,
      UserAttributes: [{ Name: 'email', Value: email }],
    });
    const history = recordAuthRequest(samePending, now);
    await savePendingAuth({ email, kind: 'confirm', delivered: true, ...history });
    return { reused: false, retryAfterSeconds: authRetryAfterSeconds(history, now) };
  } catch (error) {
    if (errorCode(error) === 'UsernameExistsException') {
      try {
        const pending = await startExistingAuth(email, samePending, now);
        return { reused: false, retryAfterSeconds: authRetryAfterSeconds(pending, now) };
      } catch (existingError) {
        return withProviderBackoff(email, samePending, existingError);
      }
    }
    return withProviderBackoff(email, samePending, error);
  }
}

export function beginEmailAuth(rawEmail: string): Promise<AuthRequestResult> {
  const email = normalizeAuthEmail(rawEmail);
  const existing = authRequestsInFlight.get(email);
  if (existing) return existing;
  const operation = beginEmailAuthOnce(email).finally(() => authRequestsInFlight.delete(email));
  authRequestsInFlight.set(email, operation);
  return operation;
}

export async function resendEmailAuth(): Promise<AuthRequestResult> {
  const pending = await pendingAuth();
  if (!pending) throw new Error('Go back and enter your email to request a fresh code.');
  if (pending.kind === 'password') throw new Error('Reviewer access uses the reusable password supplied to Google Play.');
  const now = Date.now();
  const retryAfterSeconds = authRetryAfterSeconds(pending, now);
  if (retryAfterSeconds > 0) throw cooldownError(retryAfterSeconds);
  try {
    if (pending.kind === 'confirm') {
      await cognito('ResendConfirmationCode', { ClientId: CLIENT_ID, Username: pending.email });
      const history = recordAuthRequest(pending, now);
      await savePendingAuth({ ...pending, delivered: true, ...history });
      return { reused: false, retryAfterSeconds: authRetryAfterSeconds(history, now) };
    }
    const next = await startExistingAuth(pending.email, pending, now);
    return { reused: false, retryAfterSeconds: authRetryAfterSeconds(next, now) };
  } catch (error) {
    return withProviderBackoff(pending.email, pending, error);
  }
}

export async function completeEmailAuth(code: string): Promise<Session> {
  const pending = await pendingAuth();
  if (!pending || !pending.delivered) throw new Error('Request a fresh code first.');
  let authResult: Record<string, string | number | undefined> | undefined;
  if (pending.kind === 'confirm') {
    const confirmed = await cognito<{ Session?: string }>('ConfirmSignUp', {
      ClientId: CLIENT_ID,
      Username: pending.email,
      ConfirmationCode: code,
    });
    const result = await cognito<{ AuthenticationResult?: Record<string, string | number | undefined>; Session?: string }>('InitiateAuth', {
      AuthFlow: 'USER_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: pending.email, PREFERRED_CHALLENGE: 'EMAIL_OTP' },
      Session: confirmed.Session,
    });
    authResult = result.AuthenticationResult;
    if (!authResult && result.Session) {
      const history = recordAuthRequest(pending, Date.now());
      const nextPending = { email: pending.email, kind: 'signin', session: result.Session, delivered: true, ...history } satisfies PendingAuth;
      await savePendingAuth(nextPending);
      throw retryableError(
        new Error('Your account is confirmed. Enter the new sign-in code we just sent.'),
        authRetryAfterSeconds(nextPending, Date.now()),
        undefined,
      );
    }
  } else if (pending.kind === 'signin') {
    if (!pending.session) throw new Error('That sign-in attempt has expired. Request a fresh code.');
    const result = await cognito<{ AuthenticationResult?: Record<string, string | number | undefined> }>('RespondToAuthChallenge', {
      ChallengeName: 'EMAIL_OTP',
      ClientId: CLIENT_ID,
      Session: pending.session,
      ChallengeResponses: { USERNAME: pending.email, EMAIL_OTP_CODE: code },
    });
    authResult = result.AuthenticationResult;
  } else {
    const result = await cognito<{ AuthenticationResult?: Record<string, string | number | undefined> }>('InitiateAuth', {
      AuthFlow: 'USER_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: pending.email, PREFERRED_CHALLENGE: 'PASSWORD', PASSWORD: code },
    });
    authResult = result.AuthenticationResult;
  }
  if (!authResult) throw new Error('That code could not create a session. Request a new one.');
  const session = sessionFromResult(authResult, pending.email);
  await storageDelete(PENDING_KEY);
  await publish(session);
  return session;
}

async function refreshSession(session: Session): Promise<Session> {
  if (!session.refreshToken) throw new Error('Your session expired. Sign in again.');
  const result = await cognito<{ AuthenticationResult?: Record<string, string | number | undefined> }>('InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: { REFRESH_TOKEN: session.refreshToken },
  });
  if (!result.AuthenticationResult) throw new Error('Your session expired. Sign in again.');
  const refreshed = sessionFromResult(result.AuthenticationResult, session.user.email, session.refreshToken);
  await publish(refreshed);
  return refreshed;
}

export async function getAccessToken(): Promise<string> {
  let session = currentSession;
  if (!session) {
    const raw = await storageGet(STORAGE_KEY);
    if (raw) {
      try { session = JSON.parse(raw) as Session; } catch { await storageDelete(STORAGE_KEY); }
    }
    currentSession = session;
  }
  if (!session) throw new Error('Please sign in again.');
  if (Date.now() >= session.expiresAt) session = await refreshSession(session);
  return session.accessToken;
}

export async function signOut(remote = true): Promise<void> {
  const accessToken = currentSession?.accessToken;
  if (remote && accessToken) await cognito('GlobalSignOut', { AccessToken: accessToken }).catch(() => undefined);
  await publish(null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    storageGet(STORAGE_KEY).then(async (raw) => {
      let stored: Session | null = null;
      if (raw) {
        try { stored = JSON.parse(raw) as Session; } catch { await storageDelete(STORAGE_KEY); }
      }
      if (stored && Date.now() >= stored.expiresAt) stored = await refreshSession(stored).catch(() => null);
      currentSession = stored;
      if (mounted) { setSession(stored); setLoading(false); }
    }).catch(() => { if (mounted) setLoading(false); });
    const listener = (next: Session | null) => setSession(next);
    listeners.add(listener);
    return () => { mounted = false; listeners.delete(listener); };
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
