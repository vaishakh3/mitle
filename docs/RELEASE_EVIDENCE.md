# Milte 1.0.0 release evidence

Recorded through 2026-08-29 in Asia/Kolkata. This is an evidence log, not a substitute for the human gates in `RELEASE_READINESS.md`.

## Brand and product

- The runtime name, package, deep-link scheme, API copy, store copy, AWS resources, documentation, and release scripts use **Milte**.
- The production identity is in `brand/milte/`: exact vector geometry, raster exports, adaptive/monochrome icons, lockups, campaign art, mockups, social tiles, and the reproducible prompts/source for the avatar family.
- The app now uses a light, optimistic editorial system with crisp red and blue accents, restrained corners/shadows, the `milte?` wordmark, and purpose-built meeting illustrations instead of generic dating imagery.
- Members receive an immutable anonymous username and choose from eight inclusive, softly stylized character avatars. The final component bottom-anchors the portrait art, keeps the portrait clipped to the circle, and renders selection as an unclipped overlay sibling.
- The signed-build entry screen places the sign-in action before product-detail content, remains scrollable, and uses no gradients, glow, swipe feed, or profile-card popularity mechanics.

## Automated verification

- Root, mobile, and Lambda TypeScript checks pass.
- Root suite: 80/80 tests passed; isolated Lambda suite: 27/27 tests passed.
- Expo dependency alignment and Expo Doctor pass.
- Expo web export passes and contains the Milte symbol and font set.
- SAM lint validation and a parallel SAM build pass.
- Final `npm run release:verify` passed end to end on 2026-08-29, including web export, SAM validation/build, strict TypeScript, Expo dependency alignment, Expo Doctor 21/21, six authentication browser journeys, and 13 responsive UI states.
- The visual audit asserts unclipped selection-badge geometry in onboarding and Your Corner, symmetric Today-header outer insets within one pixel, one-line meeting windows, compact-step scroll reset, and zero horizontal overflow. Evidence includes standard and 320×568 captures in `release/ui-evidence/`.
- Browser authentication E2E passed 6/6: one physical action creates one Cognito request, a pending same-email code is reused, existing-user eight-digit `EMAIL_OTP` is accepted and submitted, both code actions stay inside a 320 px viewport, provider throttling is honestly described and locally suppressed, and the new-account transition remains recoverable.
- Production audit results: root 0 and Lambda 0. The mobile npm tree reports 12 moderate and zero high/critical advisories after the Metro `0.84.5` mitigation; the remaining `uuid` chain is limited to Expo's iOS/config build tooling and is recorded in `DEPENDENCY_RISK.md`.

## Final Android package

The endpoint-bound version-7 clean build completed 2026-08-29 and produced the signed APK and Play AAB from one generated native tree.

- Package `app.milte`; version `1.0.0` (7); min SDK 24; target SDK 36.
- Exactly `arm64-v8a` and `x86_64` native libraries.
- APK verifies with Android Signature Scheme v2 and one RSA-4096 signer.
- Signer: `CN=Milte Upload, OU=Release Engineering, O=Milte, C=IN`.
- Certificate SHA-256: `A3:94:50:30:5C:A8:8C:DA:BE:9E:B9:42:A5:3A:00:F3:68:1C:46:70:A9:EA:DE:3A:9E:9F:8D:1B:CA:C4:E6:20`.
- Approximate foreground location and notifications are present; precise/background location and storage/overlay permissions are absent.
- Latitude and longitude are rounded on-device to three decimal places before API transmission.
- Date of birth uses a native Android calendar constrained to ages 18–99.
- 16 KB zip alignment passes.
- APK: 56,394,296 bytes; SHA-256 `0e0c399ce1872b3455a62ff2e860ba6012697f0a38aab1b1602a0d26e2e3a71c`.
- AAB: 43,590,235 bytes; SHA-256 `46a0627903b89a193db1a300b108d211caaf67f879135bec2741129eaf6c7c17`.
- APK/AAB signatures, package metadata, ABIs, 16 KB alignment, permission policy, source-map scan, and private-secret scan pass in `npm run android:inspect`.
- Google bundletool 1.18.3 was downloaded from the official release, verified against GitHub's published SHA-256 `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`, and validated the final AAB successfully.
- API 24 and API 36 emulators each uninstalled the prior app, fresh-installed the exact version 7 APK, resolved `app.milte/.MainActivity`, cold-launched the production sign-in UI, and reported zero crash-buffer lines. Ready-state screenshots are in `release/native-evidence/emulator-5554-v7-ready.png` and `release/native-evidence/emulator-5556-v7-ready.png`.
- Earlier releases retain the evidence-bearing authenticated Cognito/onboarding/location/data/Today journeys; version 7's changed UI, identity, and compact-layout paths are covered by the expanded current unit/browser/visual suites.
- A physical-device pass remains open in the readiness matrix.

## AWS production evidence

- AWS account `172800116877`, region `ap-south-1`, stack `milte-live`; stack state `UPDATE_COMPLETE` after the 2026-08-29 deployment, with termination protection enabled.
- API `https://5t32c9fq3l.execute-api.ap-south-1.amazonaws.com`; CloudFront `https://d1w5h7ki7ldbx2.cloudfront.net`.
- Cognito pool `ap-south-1_bFAaQYQW4`; client `6ft7n93nre2r7gq9kge7e184qf`; Cognito deletion protection active.
- DynamoDB table `milte-live`; S3 bucket `milte-live-web-172800116877`; CloudFront distribution `E2S0ADXZ560DJM`.
- Web invalidation `IBUEKEGGDSLUSB5B83QAB5K4O8` completed after the version-7 source-frozen export. The live bundle contains the new identity/avatar assets and corrected responsive components.
- `/health` returned `200`, `service: milte`, `Cache-Control: no-store`, and the exact CloudFront origin in `Access-Control-Allow-Origin`. A disallowed-origin preflight returned no allow-origin header.
- `/`, `/sign-in`, `/privacy`, `/terms`, `/support`, `/delete-account`, `/child-safety`, and `/community` returned `200` through CloudFront.
- CloudFront serves HSTS, CSP, frame denial, MIME sniff protection, strict referrer policy, and a restrictive permissions policy. The private S3 origin uses AES-256 encryption, versioning, and all four public-access blocks.
- DynamoDB is active/on-demand with SSE, TTL on `expiresAt`, PITR, and deletion protection enabled.
- Daily matching is enabled for `08:00 Asia/Kolkata`; housekeeping is enabled every 15 minutes. Both have two retries, bounded event age, and DLQs.
- Lambda and API logs retain 30 days. All six Milte CloudWatch alarms reported `OK` with actions enabled.
- The confirmed SNS operations subscription delivers alarm notifications to `vaishakhsuresh3@gmail.com`. The `milte-live-monthly` USD 10 cost budget is active with the committed address preserved in `samconfig.toml`.
- A public support canary created and persisted `MI-BA2A7F5A`; its exact ticket was removed and confirmed absent after verification. Its bounded rate record remains TTL-managed. Direct housekeeping invocation returned without a function error.
- The CloudFront distribution is deployed, enabled, HTTP/2+HTTP/3, and PriceClass 100.
- The live synthetic v5 member is `CONFIRMED`; its DynamoDB profile shows `onboarding_complete: true`, current location timestamp, the selected mutual boundaries/days/interests, and matching Terms/Privacy/Community versions. This closes the native UI → Cognito → API → DynamoDB → Today response loop.
- After evidence capture, the exact synthetic Cognito identity and its `USER#…/PROFILE` record were removed. Follow-up Cognito and DynamoDB queries both returned zero, so the production canary left no member data behind.
- The version-6 OTP canary was likewise removed from Cognito and DynamoDB immediately after the exact-APK test; follow-up queries returned zero identities and no profile item.
- AWS granted case `178747663500418` for the bounded transactional OTP use case. Mumbai SES now reports `ProductionAccessEnabled=true`, `EnforcementStatus=HEALTHY`, a 50,000-message daily quota, and a 14-message/second maximum send rate. The verified `vaishakhsuresh3@gmail.com` identity is enabled, and account-level suppression covers both bounces and complaints.
- On 2026-08-29, the live stack updated successfully to `AuthEmailMode=SES`. Cognito reports `EmailSendingAccount=DEVELOPER` with the exact verified SourceArn, the API health endpoint remained healthy, and an SES mailbox-simulator production canary returned message ID `010901a04e3abc1f-22b90785-7311-4e36-9ffd-7c800e855568-000000`.
- A fresh passwordless Cognito signup canary then returned `DeliveryMedium=EMAIL` through the production pool. Its exact synthetic Cognito user was deleted immediately, and a follow-up filtered query returned zero remaining canary users.

## Open external/human evidence

- Physical Android verification.
- FCM notification delivery, legal review, safety operator, and invite-only safety pilot.
- The personal-account closed-test gate (at least 12 opted-in testers for 14 continuous days) before applying for production access.

## Google Play evidence

- Play app `Milte — Meet for real`, package `app.milte`, app ID `4973886462138316629` exists in the verified developer account.
- Version code 3 passed Play bundle processing with API 24+, target 36, four screen layouts, two ABIs, and three required features.
- Internal release `1.0.0 (3) — reviewer access` was published on 2026-08-21 and is marked **Available to internal testers**. It is inactive only because no internal tester list has been supplied.
- Play App Signing and Automatic Protection are active. The store listing, AI-asset labels, five phone screenshots, app icon, feature graphic, privacy policy, reviewer access, Ads, 18+ target audience, Data Safety, Government, Financial, Health, and Advertising ID declarations are saved. Data Safety reports approximate location only, matching the device-rounded implementation.
- The public store contact is `vaishakhsuresh3@gmail.com`; the public website uses the HTTPS CloudFront origin. The IARC questionnaire and Terms acceptance are saved, with Mature 17+ in North America and the corresponding mostly 18+ regional ratings.
- Milte's first-party child-safety standards are live at `/child-safety`. Play's child-safety declaration is saved with the public safety contact, in-app reporting, relevant-law compliance, and authority-reporting attestations.
- The application category is Dating. The production button remains gated until a closed release exists and at least 12 testers have stayed opted in continuously for 14 days.
- The Alpha closed-testing track targets India and has the existing 25-address `Testers` list selected, with feedback routed to `vaishakhsuresh3@gmail.com`.
- Play processed version code 4 with API 24+, target 36, four screen layouts, two ABIs, three required features, 8,608 supported phones, zero supported-device loss, and a 15.8 MB new-install delivery size. Release `1.0.0 (4) — closed India pilot` excludes version 3 and uses the frozen English notes and 100% closed-test rollout.
- All 14 consolidated changes were sent to Google. The automated quick checks completed without surfacing an issue, and Publishing overview states **Your changes are now in review**. Play says reviews are typically completed within seven days, but may take longer.
- Play accepted the signed version-code-5 AAB and reports API 24+, target 36, four screen layouts, two ABIs, three required features, 8,613 phones, 4,651 tablets, and zero supported-device loss. Delivery is 15.8 MB for a new install and 3.43 MB for an update.
- Release `1.0.0 (5) — sign-in reliability` uses the frozen English notes and a 100% Alpha closed-test rollout. Google's automated quick-check panel cleared without surfacing an issue, and Publishing overview continues to show **Changes in review**, confirming that the release advanced to Google's review queue.
- Play accepted the signed version-code-6 AAB and reports API 24+, target 36, four screen layouts, two ABIs, three required features, 8,614 phones, 4,651 tablets, and zero supported-device loss. Delivery is 15.8 MB for a new install and 3.35 MB for an update.
- Release `1.0.0 (6) — OTP and layout fix` uses the frozen English notes and a 100% Alpha closed-test rollout. On 2026-08-24, Play's automated quick checks completed without surfacing an issue and Publishing overview stated **Your changes are now in review**. Version 5 remains tester-visible until Play approves and publishes version 6.
- Play accepted the exact signed version-code-7 AAB into the Alpha release editor on 2026-08-29. The preview reports API 24+, target 36, four screen layouts, two ABIs, three required features, 8,617 supported phones, 4,653 supported tablets, and zero supported-device loss. New-install delivery is 17.9 MB; the increase from version 6 is the eight-avatar and original-illustration asset set.
- Release `1.0.0 (7) — new Milte identity` uses the frozen English notes and a 100% Alpha rollout. On 2026-08-29 the owner gave action-time confirmation, the release was saved, and Play acknowledged **1 change sent for review**. Publishing overview now lists the Alpha change under **Changes in review** while Google's automated quick checks run; Play will forward it into the review queue automatically when those checks complete successfully.
