# Milte 1.0.0 release evidence

Recorded 2026-08-21 in Asia/Kolkata. This is an evidence log, not a substitute for the human gates in `RELEASE_READINESS.md`.

## Brand and product

- The runtime name, package, deep-link scheme, API copy, store copy, AWS resources, documentation, and release scripts use **Milte**.
- The production identity is in `brand/milte/`: exact vector geometry, raster exports, adaptive/monochrome icons, lockups, pattern, campaign boards, mockups, and social tiles.
- Palette: Midnight Ink `#0B0A0D`, Warm Paper `#F4EDE3`, Gulmohar `#A73550`, Marigold `#E7A45A`, Rain Blue `#55758C`, and Leaf `#7E9471`.
- The signed-build entry screen places the sign-in action before product-detail content, remains scrollable, and uses no gradients, glow, swipe feed, profile cards, or generic dating imagery.

## Automated verification

- Root, mobile, and Lambda TypeScript checks pass.
- Root suite: 65/65 tests passed; isolated Lambda suite: 25/25 tests passed.
- Expo dependency alignment and Expo Doctor pass.
- Expo web export passes and contains the Milte symbol and font set.
- SAM lint validation and a parallel SAM build pass.
- Final `npm run release:verify` passed end to end on 2026-08-21. An earlier Expo dependency query encountered a transient TLS record error; the official check then passed independently and as part of the complete rerun.
- Production audit results: root 0 and Lambda 0. The mobile npm tree reports 16 Expo/Metro/config/prebuild advisories (8 moderate, 8 high), all bounded to the Node build toolchain with no critical advisory or SDK-57-compatible fixed set; the release decision and mitigations are recorded in `DEPENDENCY_RISK.md`.

## Final Android package

The endpoint-bound clean build completed 2026-08-21 and produced the signed APK and Play AAB from one generated native tree.

- Package `app.milte`; version `1.0.0` (4); min SDK 24; target SDK 36.
- Exactly `arm64-v8a` and `x86_64` native libraries.
- APK verifies with Android Signature Scheme v2 and one RSA-4096 signer.
- Signer: `CN=Milte Upload, OU=Release Engineering, O=Milte, C=IN`.
- Certificate SHA-256: `A3:94:50:30:5C:A8:8C:DA:BE:9E:B9:42:A5:3A:00:F3:68:1C:46:70:A9:EA:DE:3A:9E:9F:8D:1B:CA:C4:E6:20`.
- Approximate foreground location and notifications are present; precise/background location and storage/overlay permissions are absent.
- Latitude and longitude are rounded on-device to three decimal places before API transmission.
- Date of birth uses a native Android calendar constrained to ages 18–99.
- 16 KB zip alignment passes.
- APK: 54,287,640 bytes; SHA-256 `e6bad57d9eede22caf7916ffeec227ec12eb14bb1e07b61c5f83de11032e54b6`.
- AAB: 41,514,305 bytes; SHA-256 `8cf57e8c6df66cadb95f07986e2febb7e033b12738ca7e28c8bf2a62e7892868`.
- APK/AAB signatures, package metadata, ABIs, 16 KB alignment, permission policy, source-map scan, and private-secret scan pass in `npm run android:inspect`.
- Google bundletool 1.18.3 was downloaded from the official release, verified against GitHub's published SHA-256 `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`, and validated the final AAB successfully.
- The API 24 emulator installed the exact version 4 APK, resolved `app.milte/.MainActivity`, launched successfully, rendered the location-recovery state, opened `milte://child-safety`, and exposed the complete 18+ zero-tolerance standards to Android accessibility. The fatal/React Native/Metro/localhost scan was clean. The earlier authenticated version 3 pass remains the evidence for native DOB calendar limits, sign-out, reviewer password sign-in, and Today routing.
- The API 36 emulator installed the exact version 4 APK, cold-launched successfully, and opened the complete child-safety route with a clean fatal/React Native/Metro/localhost scan. The earlier authenticated version 3 pass remains the evidence for the 1080×2400 launch screen, Today routing, and Android's approximate-location-only permission dialog.
- A physical-device pass remains open in the readiness matrix.

## AWS production evidence

- AWS account `172800116877`, region `ap-south-1`, stack `milte-live`; stack state `UPDATE_COMPLETE`, last update `2026-08-21T08:37:58.887Z`, termination protection enabled.
- API `https://5t32c9fq3l.execute-api.ap-south-1.amazonaws.com`; CloudFront `https://d1w5h7ki7ldbx2.cloudfront.net`.
- Cognito pool `ap-south-1_bFAaQYQW4`; client `6ft7n93nre2r7gq9kge7e184qf`; Cognito deletion protection active.
- DynamoDB table `milte-live`; S3 bucket `milte-live-web-172800116877`; CloudFront distribution `E2S0ADXZ560DJM`.
- Web invalidation `IASY5YB5HUFRWYKSGXVL2WVNCO` completed after the source-frozen export.
- `/health` returned `200`, `service: milte`, `Cache-Control: no-store`, and the exact CloudFront origin in `Access-Control-Allow-Origin`. A disallowed-origin preflight returned no allow-origin header.
- `/`, `/privacy`, `/terms`, `/support`, `/delete-account`, and `/child-safety` returned `200` through CloudFront.
- CloudFront serves HSTS, CSP, frame denial, MIME sniff protection, strict referrer policy, and a restrictive permissions policy. The private S3 origin uses AES-256 encryption, versioning, and all four public-access blocks.
- DynamoDB is active/on-demand with SSE, TTL on `expiresAt`, PITR, and deletion protection enabled.
- Daily matching is enabled for `08:00 Asia/Kolkata`; housekeeping is enabled every 15 minutes. Both have two retries, bounded event age, and DLQs.
- Lambda and API logs retain 30 days. All six Milte CloudWatch alarms reported `OK` with actions enabled.
- The confirmed SNS operations subscription delivers alarm notifications to `vaishakhsuresh3@gmail.com`. The `milte-live-monthly` USD 10 cost budget is active with the committed address preserved in `samconfig.toml`.
- A public support canary created and persisted `MI-975AD90A`; its ticket and canary-only rate record were removed after verification. Direct housekeeping invocation returned `expired: 0`, `completed: 0`, `reminded: 0` without a function error.
- The CloudFront distribution is deployed, enabled, HTTP/2+HTTP/3, and PriceClass 100.

## Open external/human evidence

- Physical Android verification.
- SES sender migration, FCM notification delivery, legal review, safety operator, and invite-only safety pilot.
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
- All 14 consolidated changes were sent to Google. Publishing overview shows **Changes in review** while automated quick checks finish; Play states that successful checks feed the review queue automatically and that reviews are typically completed within seven days, but may take longer.
