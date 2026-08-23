export const LEGAL_VERSION = '2026-08-21';

export function hasCurrentConsent(profile: {
  terms_version: string | null;
  privacy_version: string | null;
  community_version: string | null;
  safety_acknowledged_at: string | null;
}) {
  return profile.terms_version === LEGAL_VERSION
    && profile.privacy_version === LEGAL_VERSION
    && profile.community_version === LEGAL_VERSION
    && !!profile.safety_acknowledged_at;
}
