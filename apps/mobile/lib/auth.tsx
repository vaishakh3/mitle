import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export { authErrorMessage } from './auth-errors';

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

interface PendingAuth {
  email: string;
  kind: 'confirm' | 'signin' | 'password';
  session?: string;
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

async function storageGet(key: string) {
  return Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string) {
  return Platform.OS === 'web' ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string) {
  return Platform.OS === 'web' ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
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

async function startExistingAuth(email: string): Promise<void> {
  try {
    const result = await cognito<{ Session?: string }>('InitiateAuth', {
      AuthFlow: 'USER_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: 'EMAIL_OTP' },
    });
    if (!result.Session) throw new Error('AWS did not start the sign-in challenge.');
    await storageSet(PENDING_KEY, JSON.stringify({ email, kind: 'signin', session: result.Session } satisfies PendingAuth));
  } catch (error) {
    if (errorCode(error) !== 'UserNotConfirmedException') throw error;
    await cognito('ResendConfirmationCode', { ClientId: CLIENT_ID, Username: email });
    await storageSet(PENDING_KEY, JSON.stringify({ email, kind: 'confirm' } satisfies PendingAuth));
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

export async function beginEmailAuth(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (isPlayReviewEmail(email)) {
    await storageSet(PENDING_KEY, JSON.stringify({ email, kind: 'password' } satisfies PendingAuth));
    return;
  }
  try {
    await cognito('SignUp', {
      ClientId: CLIENT_ID,
      Username: email,
      UserAttributes: [{ Name: 'email', Value: email }],
    });
    await storageSet(PENDING_KEY, JSON.stringify({ email, kind: 'confirm' } satisfies PendingAuth));
  } catch (error) {
    if (errorCode(error) !== 'UsernameExistsException') throw error;
    await startExistingAuth(email);
  }
}

export async function resendEmailAuth(): Promise<void> {
  const raw = await storageGet(PENDING_KEY);
  if (!raw) throw new Error('Go back and enter your email to request a fresh code.');
  const pending = JSON.parse(raw) as PendingAuth;
  if (pending.kind === 'password') throw new Error('Reviewer access uses the reusable password supplied to Google Play.');
  if (pending.kind === 'confirm') {
    await cognito('ResendConfirmationCode', { ClientId: CLIENT_ID, Username: pending.email });
    return;
  }
  await startExistingAuth(pending.email);
}

export async function completeEmailAuth(code: string): Promise<Session> {
  const raw = await storageGet(PENDING_KEY);
  if (!raw) throw new Error('Request a fresh code first.');
  const pending = JSON.parse(raw) as PendingAuth;
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
      await storageSet(PENDING_KEY, JSON.stringify({ email: pending.email, kind: 'signin', session: result.Session } satisfies PendingAuth));
      throw new Error('Your account is confirmed. Enter the new sign-in code we just sent.');
    }
  } else if (pending.kind === 'signin') {
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
    session = raw ? JSON.parse(raw) as Session : null;
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
      let stored = raw ? JSON.parse(raw) as Session : null;
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
