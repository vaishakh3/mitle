# Google Play Data Safety working answers

These answers describe the production code in this repository. Reconcile them with the exact Play Console wording at submission time.

## Collection and sharing

- Data is encrypted in transit: **Yes** (HTTPS/TLS).
- Users can request deletion: **Yes** (in-app Settings → Delete account, plus `/delete-account`).
- Data is sold: **No**.
- Data is used for advertising: **No**.
- Data shared with third parties for their own purposes: **No**.
- Service-provider processing: AWS for hosting/auth/place search; Expo for push delivery when enabled; Google Maps only after a user opens a map link.

## Data types

| Play category | Collected | Purpose | Required |
|---|---:|---|---:|
| Email address | Yes | Account authentication, support reply | Yes for account; yes for support request |
| Name | Yes | Private account setup/support | First name required for account; support name optional |
| User IDs | Yes | Account, matching, integrity, safety | Yes |
| Date of birth / age | Yes | Enforce adults-only eligibility and mutual age boundaries | Yes |
| Gender | Yes | Mutual matching boundaries | Yes |
| Approximate location | Yes | Nearby eligibility and midpoint venue selection | Yes for matching |
| Precise location | No | The Android app does not request fine location and rounds the foreground location to three decimal places on-device before transmission | No |
| App interactions | Yes | Match decisions, confirmation, day-of status, feedback | Yes when feature used |
| Other user-generated content | Yes | Spot hint, second-chapter note, support request, confidential report | Feature-dependent |
| Device or other IDs | Yes | Expo push token | Optional; notification permission-dependent |
| Crash/log diagnostics | Yes | Security and service operation; sensitive bodies are excluded | Automatic operational data |

## Retention

- Account/profile/preferences: account lifetime, deleted on in-app deletion; PITR copies up to 35 days.
- Live match plan: until decline, expiry, report, or end of meet.
- Match outcome/private feedback: up to 400 days.
- Pair exclusion and confidential safety reports: up to 3 years, subject to a documented legal/safety hold.
- Lambda/API logs: 30 days.
- Support tickets: 180 days.

Milte never requests background location. Approximate foreground location is used only when a member chooses to enter matching, then ages out of active use according to the retention policy.
