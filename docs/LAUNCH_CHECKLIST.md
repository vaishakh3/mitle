# Milte launch checklist

Milte is designed to operate without café approvals, venue partnerships, third-party moderation platforms, or a proprietary build service. AWS supplies the production runtime and current public-place data; the app selects a named public venue or fails closed.

## Infrastructure

- [x] Deploy the isolated `milte-live` stack in `ap-south-1` and verify all outputs.
- [x] Publish the source-frozen Milte web export, invalidate CloudFront, and bind exact API CORS to the new first-party origin.
- [x] Verify DynamoDB PITR/TTL/SSE, S3 versioning/encryption/public blocks, 30-day logs, schedules, retries, DLQs, alarms, Cognito deletion protection, and API health.
- [x] Run support persistence/cleanup and housekeeping canaries without retaining test data.
- [ ] Supply an operational alert email, confirm SNS/Budget emails, and move Cognito from its default sender to verified SES before public-volume acquisition.
- [ ] Configure the Expo project, FCM, and Play service account when those accounts exist; the local signed build remains the independent build path.

## Trust, safety, and privacy

- [x] Public-place selection uses current Amazon Location data and never invents a midpoint venue.
- [x] Reporting ends an active match, blocks re-matching, preserves confidential evidence, and offers India 112 guidance.
- [x] Account deletion, correction, support, retention, Terms, Privacy, Community Rules, and safety information are available in-app and on public routes.
- [x] Matching uses mutual age/gender/distance/day boundaries; no photo, bio, follower, desirability, or engagement score exists.
- [x] Location is approximate foreground-only and expires from active use; venue and recognition details are revealed only after two private yeses.
- [ ] Name a trained report-review owner with urgent/non-urgent response targets.
- [ ] Have qualified counsel approve the launch-market legal and privacy language.
- [ ] Conduct a small invite-only physical safety pilot before public discovery.

## Release quality

- [x] Milte brand system, icons, feature graphic, listing, declarations, and release notes are complete.
- [x] Product UI is responsive, keyboard-safe, reduced-motion aware, scrollable at large text, and uses shared accessible controls.
- [x] Run the full post-cutover `npm run release:verify` and freeze dependency evidence.
- [x] Build the endpoint-bound signed APK/AAB; verify signature, package, SDKs, ABIs, permissions, 16 KB alignment, source maps, and secrets.
- [x] Validate the final AAB with the SHA-256-verified official Google bundletool 1.18.3 JAR.
- [x] Fresh-install the exact final APK on API 24 and API 36 and upload five verified phone screenshots to Play.
- [ ] Complete a physical-device pass for TalkBack, notification delivery, allowed/denied location, Maps, calendar, sharing, emergency dialer, and the authenticated match/deletion loop.

## Play and go/no-go

- [x] Purchase and identity-verify the Play developer account and reserve `app.milte`.
- [x] Publish version code 3 to the internal track with controlled reviewer access, release notes, and the full visual store listing.
- [x] Set the Play application category to Dating and reconcile Data Safety to approximate-location-only.
- [x] Target the Alpha closed-test track to India and prepare version code 3 with complete release notes; Play validation reaches preview.
- [ ] Supply and publish the public support email, then complete the IARC content-rating questionnaire and legal acceptance.
- [ ] If required for the account type, complete the current closed-testing period with the required tester count.
- [ ] Back up and recovery-test the JKS/password outside this workstation.
- [ ] Approve the final listing and release only after infrastructure, safety-operator, legal, physical-device, and pilot gates are green.

During the pilot, review eligible-pool size, mutual acceptance, public-place lookup failure, confirmed attendance, cancellation/no-show, safety reports and response time, notification delivery, crash-free sessions, and cost alarms at least weekly.
