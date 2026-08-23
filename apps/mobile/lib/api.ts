import Constants from 'expo-constants';

import { getAccessToken, signOut } from './auth';
import type {
  CurrentMatch,
  Interest,
  MeetOutcome,
  MeetSignal,
  PendingFeedback,
  Preferences,
  Profile,
  SecondChapterResult,
} from './types';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || String(Constants.expoConfig?.extra?.apiUrl ?? '')).replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error('Milte has not been connected to AWS yet.');
  let response: Response;
  try {
    const token = await getAccessToken();
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error('Milte took too long to respond. Check your connection and try again.');
    }
    if (error instanceof TypeError) throw new Error('Milte could not reach the city. Check your connection and try again.');
    throw error;
  }
  if (!response.ok) {
    const responseBody = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      await signOut(false);
      throw new Error('Your private session has expired. Sign in again to continue.');
    }
    if (response.status === 429) throw new Error('Milte is receiving too many requests. Wait a moment and try again.');
    throw new Error(typeof responseBody.error === 'string' ? responseBody.error : 'Milte could not complete that request. Please try again.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const post = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });
const put = (value: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(value) });

export const getMyProfile = () => request<Profile>('/me/profile');
export const upsertProfile = (patch: Partial<Profile>) => request<Profile>('/me/profile', put(patch)).then(() => undefined);
export const getMyPreferences = () => request<Preferences>('/me/preferences');
export const upsertPreferences = (patch: Partial<Preferences>) => request<Preferences>('/me/preferences', put(patch)).then(() => undefined);
export const listInterests = () => request<Interest[]>('/interests');
export const getMyInterestIds = () => request<number[]>('/me/interests');
export const setMyInterests = (interestIds: number[]) => request<number[]>('/me/interests', put({ interestIds })).then(() => undefined);
export const getCurrentMatch = () => request<CurrentMatch | null>('/match/current');
export const respondToMatch = (matchId: string, action: 'accept' | 'decline') => request<{ status: string }>('/match/respond', post({ matchId, action }));
export const updateMeetSignal = (matchId: string, signal: MeetSignal) => request<void>('/match/signal', post({ matchId, signal }));
export const confirmMeet = (matchId: string) => request<void>('/match/confirm', post({ matchId }));
export const reportActiveMatch = (matchId: string, category: 'safety' | 'harassment' | 'identity' | 'other', reason: string) => request<void>('/match/report', post({ matchId, category, reason }));
export const getPendingFeedback = () => request<PendingFeedback | null>('/feedback/pending');
export const submitMeetFeedback = (historyId: string, outcome: MeetOutcome, reportReason?: string, secondChapter?: boolean, secondChapterNote?: string) => request<void>('/feedback', post({ historyId, outcome, reportReason, secondChapter, secondChapterNote }));
export const getSecondChapterResult = () => request<SecondChapterResult | null>('/second-chapter');
export const dismissSecondChapter = (historyId: string) => request<void>('/second-chapter/dismiss', post({ historyId }));

export async function submitSupportRequest(value: {
  email: string;
  name?: string;
  category: 'account' | 'privacy' | 'safety' | 'technical' | 'other';
  message: string;
}): Promise<{ reference: string }> {
  if (!API_URL) throw new Error('Milte has not been connected to AWS yet.');
  try {
    const response = await fetch(`${API_URL}/support`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(value),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Support could not receive that request.');
    return body as { reference: string };
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') throw new Error('Support took too long to respond. Check your connection and try again.');
    if (error instanceof TypeError) throw new Error('Support could not be reached. Check your connection and try again.');
    throw error;
  }
}

export async function deleteAccount(): Promise<void> {
  await request<void>('/me', { method: 'DELETE' });
  await signOut(false);
}
