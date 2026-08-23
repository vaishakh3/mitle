# Dependency risk record

Audited 2026-08-23.

- Root application/test dependencies: 0 advisories.
- AWS Lambda production dependencies: 0 advisories.
- Expo mobile tree: 12 moderate advisories and zero high or critical advisories. Pinning `metro`, `metro-config`, and `metro-transform-worker` to `0.84.5` removed the former high-severity Metro/image processing findings without changing the Expo SDK 57 or React Native 0.86 compatibility baseline.
- The remaining advisories are the `uuid <11.1.1` chain used by Expo's iOS Xcode/config build tooling. They are not part of Milte's Android JavaScript runtime or signed APK/AAB execution path.
- `npm audit fix --force` proposes an incompatible Expo downgrade and does not provide a safe SDK-57-compatible resolution for the remaining build-tool chain.

Decision: keep the compatible Metro override and do not apply the invalid Expo downgrade. Run Expo Doctor, the audit, and a clean signed build on every release; do not process untrusted build inputs in CI; and re-audit when Expo publishes a compatible `uuid` chain. This waiver covers iOS/build-host availability risk only. Any Android-runtime, high, or critical advisory reopens the release decision immediately.
