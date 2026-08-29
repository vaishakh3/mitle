export type Gender = 'man' | 'woman' | 'nonbinary';
export type RelationshipIntent = 'long_term' | 'open' | 'figuring_out';
export type SocialEnergy = 'quiet' | 'balanced' | 'lively';
export type DateStyle = 'coffee' | 'activity' | 'sober' | 'anything';
export type AvatarId = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08';

export interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  birthdate: string | null;
  gender: Gender | null;
  avatar_id: AvatarId;
  spot_hint: string;
  lat: number | null;
  lng: number | null;
  location_updated_at: string | null;
  expo_push_token: string | null;
  is_paused: boolean;
  is_suspended: boolean;
  onboarding_complete: boolean;
  rules_acknowledged_at: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_accepted_at: string | null;
  privacy_version: string | null;
  community_accepted_at: string | null;
  community_version: string | null;
  safety_acknowledged_at: string | null;
}

export interface Preferences {
  user_id: string;
  interested_genders: Gender[];
  age_min: number;
  age_max: number;
  radius_km: number;
  available_days: number[];
  preferred_hour: number;
  relationship_intent: RelationshipIntent;
  social_energy: SocialEnergy;
  date_style: DateStyle;
  budget_level: number;
}

export interface Interest {
  id: number;
  slug: string;
  label: string;
  emoji: string;
}

export interface MatchVenue {
  name: string;
  address: string;
  lat: number;
  lng: number;
  maps_url: string;
}

export interface CurrentMatch {
  match_id: string;
  status: 'pending' | 'committed';
  you_accepted: boolean;
  they_accepted: boolean;
  accept_deadline: string;
  venue: MatchVenue | null;
  window_start: string | null;
  window_end: string | null;
  their_spot_hint: string | null;
  your_signal: MeetSignal | null;
  their_signal: MeetSignal | null;
  you_confirmed: boolean;
  they_confirmed: boolean;
  confirmation_opens_at: string | null;
  meeting_phrase: string | null;
  cancelled: boolean;
  cancelled_by_you: boolean;
}

export interface PendingFeedback {
  history_id: string;
  matched_on: string;
}

export interface SecondChapterResult {
  history_id: string;
  matched_on: string;
  note: string;
}

export type MeetOutcome = 'met' | 'no_show' | 'didnt_go';

export type MeetSignal = 'heading_there' | 'arrived' | 'running_late' | 'cant_make_it';
