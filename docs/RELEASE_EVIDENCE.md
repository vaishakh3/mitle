# Milte 1.0.0 release evidence

Recorded 2026-08-23 in Asia/Kolkata. This is an evidence log, not a substitute for the human gates in `RELEASE_READINESS.md`.

## Brand and product

- The runtime name, package, deep-link scheme, API copy, store copy, AWS resources, documentation, and release scripts use **Milte**.
- The production identity is in `brand/milte/`: exact vector geometry, raster exports, adaptive/monochrome icons, lockups, pattern, campaign boards, mockups, and social tiles.
- Palette: Midnight Ink `#0B0A0D`, Warm Paper `#F4EDE3`, Gulmohar `#A73550`, Marigold `#E7A45A`, Rain Blue `#55758C`, and Leaf `#7E9471`.
- The signed-build entry screen places the sign-in action before product-detail content, remains scrollable, and uses no gradients, glow, swipe feed, profile cards, or generic dating imagery.

## Automated verification

- Root, mobile, and Lambda TypeScript checks pass.
- Root suite: 74/74 tests passed; isolated Lambda suite: 25/25 tests passed.
- Expo dependency alignment and Expo Doctor pass.
- Expo web export passes and contains the Milte symbol and font set.
- SAM lint validation and a parallel SAM build pass.
- Final `npm run release:verify` passed end to end on 2026-08-23, including web export, SAM validation/build, strict TypeScript, Expo dependency alignment, and Expo Doctor 21/21.
- Browser authentication E2E passed 4/4: one physical action creates one Cognito request, a pending same-email code is reused, provider throttling is honestly described and locally suppressed, and the new-account transition remains recoverable.
- Production audit results: root 0 and Lambda 0. The mobile npm tree reports 12 moderate and zero high/critical advisories after the Metro `0.84.5` mitigation; the remaining `uuid` chain is limited to Expo's iOS/config build tooling and is recorded in `DEPENDENCY_RISK.md`.

## Final Android package

The endpoint-bound version-5 clean build completed 2026-08-23 and produced the signed APK and Play AAB from one generated native tree.

- Package `app.milte`; version `1.0.0` (5); min SDK 24; target SDK 36.
- Exactly `arm64-v8a` and `x86_64` native libraries.
- APK verifies with Android Signature Scheme v2 and one RSA-4096 signer.
- Signer: `CN=Milte Upload, OU=Release Engineering, O=Milte, C=IN`.
- Certificate SHA-256: `A3:94:50:30:5C:A8:8C:DA:BE:9E:B9:42:A5:3A:00:F3:68:1C:46:70:A9:EA:DE:3A:9E:9F:8D:1B:CA:C4:E6:20`.
- Approximate foreground location and notifications are present; precise/background location and storage/overlay permissions are absent.
- Latitude and longitude are rounded on-device to three decimal places before API transmission.
- Date of birth uses a native Android calendar constrained to ages 18–99.
- 16 KB zip alignment passes.
- APK: 54,296,668 bytes; SHA-256 `836e652347e508d9fb7f130fd3e9be23c74d851017673c01668ff3a17e431b4c`.
- AAB: 41,520,170 bytes; SHA-256 `b6650ffdcb0e33caa2441d73609b8e1f78571d0ba451969669bdfbe10bd2c9eb`.
- APK/AAB signatures, package metadata, ABIs, 16 KB alignment, permission policy, source-map scan, and private-secret scan pass in `npm run android:inspect`.
- Google bundletool 1.18.3 was downloaded from the official release, verified against GitHub's published SHA-256 `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`, and validated the final AAB successfully.
- The API 24 emulator fresh-installed the exact version 5 APK, resolved `app.milte/.MainActivity`, cold-launched the branded sign-in screen, confirmed version/min/target metadata, opened `milte:///child-safety`, exposed the complete 18+ zero-tolerance standards to Android accessibility, and produced no fatal/React Native/Metro/localhost error.
- The API 36 emulator fresh-installed the exact version 5 APK, cold-launched cleanly, and completed a real production first-run flow with a synthetic canary: Cognito confirmation email, authenticated session, native 18–99 DOB calendar, all seven onboarding steps, live interests lookup, approximate-foreground location permission, Kochi location save, versioned legal acknowledgements, profile/preferences/interests persistence, and Today rendering. The exact APK also opened the child-safety deep link and produced no fatal app error.
- A physical-device pass remains open in the readiness matrix.

## AWS production evidence

- AWS account `172800116877`, region `ap-south-1`, stack `milte-live`; stack state `UPDATE_COMPLETE`, last update `2026-08-23T10:36:49.813Z`, termination protection enabled.
- API `https://5t32c9fq3l.execute-api.ap-south-1.amazonaws.com`; CloudFront `https://d1w5h7ki7ldbx2.cloudfront.net`.
- Cognito pool `ap-south-1_bFAaQYQW4`; client `6ft7n93nre2r7gq9kge7e184qf`; Cognito deletion protection active.
- DynamoDB table `milte-live`; S3 bucket `milte-live-web-172800116877`; CloudFront distribution `E2S0ADXZ560DJM`.
- Web invalidation `I6RAEMYNVR5DDJ5629E218CN65` completed after the version-5 source-frozen export.
- `/health` returned `200`, `service: milte`, `Cache-Control: no-store`, and the exact CloudFront origin in `Access-Control-Allow-Origin`. A disallowed-origin preflight returned no allow-origin header.
- `/`, `/sign-in`, `/privacy`, `/terms`, `/support`, `/delete-account`, `/child-safety`, and `/community` returned `200` through CloudFront.
- CloudFront serves HSTS, CSP, frame denial, MIME sniff protection, strict referrer policy, and a restrictive permissions policy. The private S3 origin uses AES-256 encryption, versioning, and all four public-access blocks.
- DynamoDB is active/on-demand with SSE, TTL on `expiresAt`, PITR, and deletion protection enabled.
- Daily matching is enabled for `08:00 Asia/Kolkata`; housekeeping is enabled every 15 minutes. Both have two retries, bounded event age, and DLQs.
- Lambda and API logs retain 30 days. All six Milte CloudWatch alarms reported `OK` with actions enabled.
- The confirmed SNS operations subscription delivers alarm notifications to `vaishakhsuresh3@gmail.com`. The `milte-live-monthly` USD 10 cost budget is active with the committed address preserved in `samconfig.toml`.
- A public support canary created and persisted `MI-975AD90A`; its ticket and canary-only rate record were removed after verification. Direct housekeeping invocation returned `expired: 0`, `completed: 0`, `reminded: 0` without a function error.
- The CloudFront distribution is deployed, enabled, HTTP/2+HTTP/3, and PriceClass 100.
- The live synthetic v5 member is `CONFIRMED`; its DynamoDB profile shows `onboarding_complete: true`, current location timestamp, the selected mutual boundaries/days/interests, and matching Terms/Privacy/Community versions. This closes the native UI → Cognito → API → DynamoDB → Today response loop.
- After evidence capture, the exact synthetic Cognito identity and its `USER#…/PROFILE` record were removed. Follow-up Cognito and DynamoDB queries both returned zero, so the production canary left no member data behind.
- The Mumbai SES identity `vaishakhsuresh3@gmail.com` is verified and healthy. AWS case `178747663500418` contains the transactional OTP use case and bounded-volume controls. SES production access is still pending, so the stack deliberately reports `AuthEmailMode=COGNITO_DEFAULT`; switching a sandbox sender would prevent delivery to unverified testers.

## Open external/human evidence

- Physical Android verification.
- AWS approval and cutover of the already verified SES sender, FCM notification delivery, legal review, safety operator, and invite-only safety pilot.
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
