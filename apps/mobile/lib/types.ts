export type Gender = 'man' | 'woman' | 'nonbinary';

export interface Profile {
  user_id: string;
  display_name: string;
  birthdate: string | null;
  gender: Gender | null;
  spot_hint: string;
  lat: number | null;
  lng: number | null;
  location_updated_at: string | null;
  expo_push_token: string | null;
  is_paused: boolean;
  onboarding_complete: boolean;
}

export interface Preferences {
  user_id: string;
  interested_genders: Gender[];
  age_min: number;
  age_max: number;
  radius_km: number;
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
}

export interface PendingFeedback {
  history_id: string;
  matched_on: string;
}

export type MeetOutcome = 'met' | 'no_show' | 'didnt_go';
