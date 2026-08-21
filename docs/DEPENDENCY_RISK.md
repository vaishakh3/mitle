# Dependency risk record

Audited 2026-08-21.

- Root application/test dependencies: 0 advisories.
- AWS Lambda production dependencies: 0 advisories.
- Expo mobile tree: 16 advisories (8 moderate, 8 high), all in the Node-based Expo/Metro/config/prebuild toolchain. There are no critical advisories and these packages are not embedded as executable Node tooling in the Android release artifact.
- The high-severity `image-size` advisory has no published fixed version as of the audit (`2.0.2` is both current and affected). Metro/Expo compatible patched releases are not available.
- `npm audit fix --force` proposes Expo 53, which is an incompatible downgrade from SDK 57/React Native 0.86 and would also lose the Android API 36 release baseline.

Decision: do not apply the invalid downgrade. Keep Expo packages on the SDK 57 compatibility set, run Expo Doctor and a clean signed build on every release, do not process untrusted image/build inputs in CI, and re-audit when Expo or Metro publishes compatible fixes. This waiver covers build-host availability risks only; any runtime or critical advisory reopens the release decision immediately.
