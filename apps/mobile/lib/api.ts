import { supabase } from './supabase';
import type {
  CurrentMatch,
  Interest,
  MeetOutcome,
  PendingFeedback,
  Preferences,
  Profile,
} from './types';

export async function getMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(patch: Partial<Profile>): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('not signed in');
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function getMyPreferences(): Promise<Preferences | null> {
  const { data, error } = await supabase.from('preferences').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertPreferences(patch: Partial<Preferences>): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('not signed in');
  const { error } = await supabase
    .from('preferences')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function listInterests(): Promise<Interest[]> {
  const { data, error } = await supabase.from('interests').select('*').order('label');
  if (error) throw error;
  return data ?? [];
}

export async function getMyInterestIds(): Promise<number[]> {
  const { data, error } = await supabase.from('profile_interests').select('interest_id');
  if (error) throw error;
  return (data ?? []).map((r) => r.interest_id);
}

export async function setMyInterests(interestIds: number[]): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('not signed in');
  const { error: delErr } = await supabase
    .from('profile_interests')
    .delete()
    .eq('user_id', userId);
  if (delErr) throw delErr;
  if (interestIds.length > 0) {
    const { error } = await supabase
      .from('profile_interests')
      .insert(interestIds.map((id) => ({ user_id: userId, interest_id: id })));
    if (error) throw error;
  }
}

export async function getCurrentMatch(): Promise<CurrentMatch | null> {
  const { data, error } = await supabase.rpc('get_current_match');
  if (error) throw error;
  return data as CurrentMatch | null;
}

export async function respondToMatch(
  matchId: string,
  action: 'accept' | 'decline',
): Promise<{ status: string }> {
  const { data, error } = await supabase.functions.invoke('respond-match', {
    body: { matchId, action },
  });
  if (error) throw error;
  return data as { status: string };
}

export async function getPendingFeedback(): Promise<PendingFeedback | null> {
  const { data, error } = await supabase.rpc('get_pending_feedback');
  if (error) throw error;
  return data as PendingFeedback | null;
}

export async function submitMeetFeedback(
  historyId: string,
  outcome: MeetOutcome,
  reportReason?: string,
): Promise<void> {
  const { error } = await supabase.rpc('submit_meet_feedback', {
    p_history_id: historyId,
    p_outcome: outcome,
    p_report_reason: reportReason ?? null,
  });
  if (error) throw error;
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
  await supabase.auth.signOut();
}
