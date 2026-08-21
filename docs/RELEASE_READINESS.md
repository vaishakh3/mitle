# Milte release readiness

This is the single source of truth for machine readiness. A box is checked only when repository or live-system evidence proves it. Human approvals remain explicit and do not hide unfinished engineering.

Last audited: 2026-08-21 (Asia/Kolkata)

## Completion rule

Milte is machine-ready when every non-human item below is checked, the verification matrix is green against the production endpoints, and the final APK/AAB hashes are frozen in `RELEASE_EVIDENCE.md`.

## Product and brand

- [x] Replace the prototype identity with a distinctive Milte system: ownable mark, exact palette, typography, icon family, lockups, campaign pattern, mockups, and social assets.
- [x] Apply Milte across native/web UI, package and scheme, API/email/push copy, AWS resources, documentation, and Play materials.
- [x] Remove swipe/feed/profile-card conventions, gradients, glow, ornamental dating clichés, and the old seal/letter metaphor.
- [x] Put the primary sign-in action above explanatory detail while keeping every element reachable by scrolling.
- [x] Make the product proposition explicit: one person, one named public place, one hour, then offline.
- [x] Ensure operation requires no café approval or venue partnership; place lookup returns a current public venue or fails closed.

## Product correctness

- [x] Passwordless email authentication has enumeration-resistant copy, resend cooldown, expiry guidance, token refresh, sign-out, and recoverable failures.
- [x] Matching uses mutual age, gender, distance, availability, intent, energy, date style, budget, and interests without a popularity score.
- [x] Acceptance, confirmation, cancellation, day-of status, expiry, reporting, feedback, and Second Chapter writes are validated and concurrency-safe.
- [x] The venue, window, spot hint, and time-gated recognition phrase stay hidden until their intended reveal boundary.
- [x] Every API patch validates enums, ranges, arrays, timestamps, coordinates, and text lengths server-side.
- [x] Account deletion removes Cognito identity and user-owned live data while retaining only documented bounded safety records.
- [x] Root and Lambda tests cover matching, races, timing gates, validation, reports, deletion, venue failure, and web security configuration.

## Trust, safety, privacy, and policy

- [x] Terms, Privacy, Community Rules, Safety, Support, deletion instructions, and account-review routes exist and are linked.
- [x] Publish the 18+ child-safety standards on the first-party web origin and in-app, with zero-tolerance child sexual abuse/exploitation rules, confidential reporting routes, emergency guidance, evidence preservation, and authority escalation.
- [x] Onboarding requires versioned 18+, Terms, Privacy, Community Rules, and safety acknowledgements.
- [x] Reporting ends the match, prevents re-matching, keeps reports confidential, and documents India 112 escalation.
- [x] Location and push-token lifetimes, profile deletion, match history, feedback, support, reports, and safety-hold retention are explicit and machine-enforced where applicable.
- [x] Play Data Safety, content rating, app access, target audience, account deletion, and permissions working answers match the implemented data flow.
- [x] Logs and alarms exclude tokens, coordinates, free-form reports, and request bodies.

## Accessibility and lifecycle UX

- [x] Shared controls expose roles, labels, selected/disabled/busy states, minimum touch targets, safe-area layout, and keyboard-safe scrolling.
- [x] WCAG AA design-token contrast tests pass; brand accent text uses an accessible light tint on dark surfaces.
- [x] Reanimated motion follows the system reduced-motion preference.
- [x] Loading, empty, offline, retry, denied-permission, expired-session, suspended-account, and cancelled-plan states have direct recovery language.
- [x] Public and core flows remain reachable at small viewports and 200% text in automated inspection.

## AWS production

- [x] The Milte SAM template validates and builds cleanly for `ap-south-1`.
- [x] The template includes serverless API/jobs, Cognito, DynamoDB PITR/TTL/SSE, Amazon Location lookup, CloudFront/OAC/S3, 30-day logs, retries, DLQs, alarms, and optional budget/SNS controls.
- [x] IAM is resource-scoped where AWS permits it; actions that require `*` are documented.
- [x] Matching and housekeeping jobs are retry-safe and run in `Asia/Kolkata`.
- [x] Deploy `milte-live`, publish the final web export, tighten CORS to its CloudFront origin, and verify every output/control.
- [x] Prove live OTP/reviewer authentication, health/CORS/security headers, public routes, support persistence/cleanup, housekeeping, CloudFront invalidation, and alarm state.

## Android and Play package

- [x] Final package/scheme is `app.milte` / `milte://`; version is `1.0.0` (4); min/target SDKs are 24/36.
- [x] Continuous Native Generation, local release signing, R8/resource shrinking, disabled backup/cleartext, and `arm64-v8a`/`x86_64` are configured.
- [x] The RSA-4096 Milte upload key is outside Git and its certificate fingerprint is recorded.
- [x] A clean signing preflight produced an installable Milte APK/AAB and passed package, signature, ABI, permission, and 16 KB alignment inspection.
- [x] Play icon, feature graphic, listing, release notes, declarations, and independent local/EAS build paths are present.
- [x] Play accepted and published version code 3 to internal testing with reviewer access and release notes.
- [x] Save Dating as the Play category and reconcile the live Data Safety declaration to approximate-location-only.
- [x] Target Alpha closed testing to India and prepare the Play-processed version 3 bundle and release notes through the closed-release preview gate.
- [x] Complete Play's child-safety declaration with the live first-party standards URL and the public safety contact, including the authorised in-app reporting and statutory-reporting attestations.
- [x] Rebuild APK/AAB after the Milte AWS endpoint cutover and freeze final sizes, hashes, signature, permission/ABI/alignment checks, secret scan, and source-map inspection.
- [x] Complete trusted bundletool validation with the SHA-256-verified official Google 1.18.3 release.
- [x] Install and cold-launch the exact version 4 APK on API 24 and API 36, open the complete child-safety deep link on both, and retain the earlier version 3 reviewer-authentication, native DOB calendar, approximate-location-only OS-dialog, and five Play screenshot evidence.

## Verification matrix

- [x] Final `npm run release:verify` (65 root tests and 25 isolated backend tests pass for version 4).
- [x] Final dependency audit and bounded waiver review: root/Lambda report zero; mobile reports 16 non-runtime Expo/Metro/config build-tool advisories documented in `DEPENDENCY_RISK.md`; no critical or compatible fixed set exists. Official bundletool is checksum-pinned outside the repository.
- [x] Final APK `apksigner`, `apkanalyzer`, `zipalign -P 16`, ABI/ELF, source-map, and secret inspection
- [x] Final AAB `jarsigner` and checksum-pinned official bundletool validation
- [x] Final API 24/API 36 emulator install/authentication matrix and five current phone screenshots
- [x] Live Milte AWS and CloudFront verification
- [x] Repository/package secret scan and `git diff --check`

## Human handoff — allowed remaining gates

- [ ] A named adult trust-and-safety operator accepts report-review responsibility and response targets.
- [ ] Qualified counsel approves Terms, Privacy, consent, retention, and launch-market language.
- [x] The owner purchased and identity-verified the Google Play developer account and created the `app.milte` app.
- [ ] The account completes any current closed-testing requirement before production access.
- [ ] The owner supplies and confirms an operational alert email and completes the SES sender cutover before public-volume sign-ups.
- [ ] The owner supplies Expo/FCM/Play service-account credentials for physical notification testing and draft internal-track submission.
- [ ] A physical Android pass covers TalkBack, notifications, location, Maps, calendar, sharing, emergency dialer, and authenticated match/deletion.
- [ ] The owner backs up and recovery-tests the upload key/password in encrypted storage they control.
- [ ] An invite-only physical safety pilot passes its go/no-go review.
- [x] The owner authorized the final listing and Play publication; the platform's closed-test and production-access gates still control when production rollout becomes available.
