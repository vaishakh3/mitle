#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
app_version="$(cd "$project_root" && node -p "require('./apps/mobile/app.json').expo.version")"
version_code="$(cd "$project_root" && node -p "require('./apps/mobile/app.json').expo.android.versionCode")"
artifact_base="milte-${app_version}-${version_code}"
apk="${1:-$project_root/release/${artifact_base}.apk}"
aab="${2:-$project_root/release/${artifact_base}.aab}"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-/opt/homebrew/share/android-commandlinetools}"
export PATH="$JAVA_HOME/bin:$ANDROID_SDK_ROOT/platform-tools:$PATH"

apkanalyzer="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/apkanalyzer"
apksigner="$ANDROID_SDK_ROOT/build-tools/36.0.0/apksigner"
zipalign="$ANDROID_SDK_ROOT/build-tools/36.0.0/zipalign"

for required in "$apk" "$aab" "$apk.sha256" "$aab.sha256" "$apkanalyzer" "$apksigner" "$zipalign"; do
  if [[ ! -e "$required" ]]; then
    echo "Missing release input: $required" >&2
    exit 1
  fi
done

assert_equal() {
  local label="$1" actual="$2" expected="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "$label: expected '$expected', got '$actual'" >&2
    exit 1
  fi
  echo "$label: $actual"
}

echo "Verifying SHA-256 sidecars"
(cd "$(dirname "$apk")" && shasum -a 256 -c "$(basename "$apk").sha256" "$(basename "$aab").sha256")

echo "Inspecting manifest"
assert_equal "application ID" "$("$apkanalyzer" manifest application-id "$apk")" "app.milte"
assert_equal "version name" "$("$apkanalyzer" manifest version-name "$apk")" "$app_version"
assert_equal "version code" "$("$apkanalyzer" manifest version-code "$apk")" "$version_code"
assert_equal "minimum SDK" "$("$apkanalyzer" manifest min-sdk "$apk")" "24"
assert_equal "target SDK" "$("$apkanalyzer" manifest target-sdk "$apk")" "36"

permissions="$("$apkanalyzer" manifest permissions "$apk")"
for required_permission in android.permission.ACCESS_COARSE_LOCATION android.permission.POST_NOTIFICATIONS android.permission.INTERNET; do
  if ! grep -Fxq "$required_permission" <<<"$permissions"; then
    echo "Required permission missing: $required_permission" >&2
    exit 1
  fi
done
for prohibited_permission in android.permission.ACCESS_FINE_LOCATION android.permission.ACCESS_BACKGROUND_LOCATION android.permission.READ_EXTERNAL_STORAGE android.permission.WRITE_EXTERNAL_STORAGE android.permission.SYSTEM_ALERT_WINDOW; do
  if grep -Fxq "$prohibited_permission" <<<"$permissions"; then
    echo "Prohibited permission present: $prohibited_permission" >&2
    exit 1
  fi
done
echo "permission policy: pass"

echo "Verifying signatures"
apk_signature="$($apksigner verify --verbose --print-certs "$apk")"
grep -Fq 'Verified using v2 scheme (APK Signature Scheme v2): true' <<<"$apk_signature"
grep -Fq 'Number of signers: 1' <<<"$apk_signature"
grep -Fq 'Signer #1 certificate DN: CN=Milte Upload, OU=Release Engineering, O=Milte, C=IN' <<<"$apk_signature"
grep -Fq 'Signer #1 certificate SHA-256 digest: a39450305ca88cdabe9eb942a53a00f3681c4670a9eade3a9e9f8d1bcac4e620' <<<"$apk_signature"
echo "APK signature: pass"

aab_signature="$(jarsigner -verify -verbose -certs "$aab" 2>&1)"
grep -Fq 'jar verified.' <<<"$aab_signature"
echo "AAB signature: pass"

echo "Verifying native ABIs"
apk_abis="$(unzip -Z1 "$apk" | awk -F/ '$1 == "lib" { print $2 }' | sort -u | paste -sd, -)"
aab_abis="$(unzip -Z1 "$aab" | awk -F/ '$1 == "base" && $2 == "lib" { print $3 }' | sort -u | paste -sd, -)"
assert_equal "APK ABIs" "$apk_abis" "arm64-v8a,x86_64"
assert_equal "AAB ABIs" "$aab_abis" "arm64-v8a,x86_64"

echo "Verifying alignment"
"$zipalign" -c -P 16 -v 4 "$apk" >/dev/null
echo "16 KB zip alignment: pass"

echo "Checking release contents"
archive_listing="$(printf '%s\n' "$(unzip -Z1 "$apk")" "$(unzip -Z1 "$aab")")"
if grep -Eiq '\.(jks|keystore|pem|p12|pfx|mobileprovision|js\.map|bundle\.map|hbc\.map)$' <<<"$archive_listing"; then
  echo "Private key, provisioning file, or JavaScript source map found in release archive" >&2
  grep -Ei '\.(jks|keystore|pem|p12|pfx|mobileprovision|js\.map|bundle\.map|hbc\.map)$' <<<"$archive_listing" >&2
  exit 1
fi

if strings "$apk" "$aab" | grep -Eiq -- '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9_-]{32,}'; then
  echo "Credential-like material found in release archives" >&2
  exit 1
fi
echo "secret/source-map scan: pass"

if [[ -n "${BUNDLETOOL_JAR:-}" ]]; then
  [[ -f "$BUNDLETOOL_JAR" ]] || { echo "BUNDLETOOL_JAR does not exist: $BUNDLETOOL_JAR" >&2; exit 1; }
  java -jar "$BUNDLETOOL_JAR" validate --bundle="$aab"
else
  echo "bundletool validation: skipped (set BUNDLETOOL_JAR for the final freeze)"
fi

echo "Artifacts"
stat -f '%N %z bytes' "$apk" "$aab"
shasum -a 256 "$apk" "$aab"
echo "Android release inspection passed"
