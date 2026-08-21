# Milte Android release procedure

## Release invariants

- Application ID and deep-link scheme: `app.milte` / `milte://`
- Version name and code: `1.0.0` / `3`
- Minimum Android: API 24 (Android 7)
- Compile and target SDK: API 36
- Release ABIs: `arm64-v8a` and `x86_64`
- Backup and cleartext traffic: disabled
- Runtime-sensitive permissions: approximate foreground location and notifications only
- Precise/background location, storage, and overlay permissions: blocked

Increase `android.versionCode` for every Play upload, including rejected or draft uploads. Keep the user-facing version semantic and update release notes with it.

## Upload key

The RSA-4096 upload key is outside Git at:

`/Users/vaishakh/Library/Application Support/Milte/keys/milte-upload.jks`

Its password is read from macOS Keychain service `app.milte.android-upload` when available. On this workstation the secure fallback is the permission-600 file next to the key, `milte-upload.password`. Back up **both** files to an encrypted location controlled by the owner before the first Play upload; losing the upload key can block urgent releases.

Certificate SHA-256:

`A3:94:50:30:5C:A8:8C:DA:BE:9E:B9:42:A5:3A:00:F3:68:1C:46:70:A9:EA:DE:3A:9E:9F:8D:1B:CA:C4:E6:20`

## Reproducible local build

```sh
nvm use
npm ci
npm --prefix apps/mobile ci
npm run release:verify
npm run android:key:create
npm run android:release
```

The release script performs a clean Expo prebuild, injects release signing without committing credentials, enables R8/resource shrinking, builds APK and AAB from one native tree, copies them to `release/`, and creates SHA-256 sidecars.

Final artifacts are named:

- `release/milte-1.0.0-3.apk`
- `release/milte-1.0.0-3.aab`

## Mandatory inspection

```sh
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_SDK_ROOT=/opt/homebrew/share/android-commandlinetools

$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/apkanalyzer manifest application-id release/milte-1.0.0-3.apk
$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/apkanalyzer manifest permissions release/milte-1.0.0-3.apk
$ANDROID_SDK_ROOT/build-tools/36.0.0/apksigner verify --verbose --print-certs release/milte-1.0.0-3.apk
jarsigner -verify -verbose -certs release/milte-1.0.0-3.aab
$ANDROID_SDK_ROOT/build-tools/36.0.0/zipalign -c -P 16 -v 4 release/milte-1.0.0-3.apk
shasum -a 256 -c release/milte-1.0.0-3.apk.sha256
shasum -a 256 -c release/milte-1.0.0-3.aab.sha256
```

Reject a build containing the debug certificate, an active Metro/localhost endpoint, cleartext traffic, precise/background location, storage or overlay access, an unexpected ABI, a JavaScript source map, or a private credential. The AAB may contain the expected Play/R8 deobfuscation mapping.

## Device matrix

Fresh-install the exact final APK on API 24 and API 36. Verify cold launch, app icon and splash, sign-in and OTP expiry/resend, onboarding, approximate-location and notification denial/allowance, lifecycle resume, all `milte://` routes, Maps/calendar/share intents, match acceptance and cancellation, day-of signals, feedback/reporting, Second Chapter, support, sign-out, and deletion.

Repeat the critical path with 200% text, reduced motion, TalkBack, offline/slow networking, a 720×1280 viewport, a standard phone, and a large window. Emulator evidence is useful but notification delivery, emergency dialer, OEM intents, and TalkBack must also be checked on a physical Android device before public rollout.

## Play path

`apps/mobile/eas.json` contains internal APK and production AAB profiles, but the local signed build above is the independent fallback. When the Play developer account exists:

1. Create the Play app as `app.milte`.
2. Back up the upload key and enroll the certificate.
3. Configure the Expo project ID, FCM, and Play service account outside Git.
4. Upload the AAB to the internal track as a draft.
5. Complete the declarations in `store/` and supply a controlled reviewer account or OTP inbox.
6. Run the required closed test and safety pilot before any production rollout.

Recheck current Play target-API, 64-bit, 16 KB page-size, testing, and account-deletion policies on every upload; policy dates change independently of this repository.
