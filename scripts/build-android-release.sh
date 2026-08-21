#!/usr/bin/env bash
set -euo pipefail

artifact_kind="${1:-apk}"
if [[ "$artifact_kind" != "apk" && "$artifact_kind" != "aab" && "$artifact_kind" != "all" ]]; then
  echo "Usage: $0 [apk|aab|all]" >&2
  exit 2
fi

project_root="$(cd "$(dirname "$0")/.." && pwd)"
mobile_dir="$project_root/apps/mobile"
app_version="$(cd "$project_root" && node -p "require('./apps/mobile/app.json').expo.version")"
version_code="$(cd "$project_root" && node -p "require('./apps/mobile/app.json').expo.android.versionCode")"
artifact_base="milte-${app_version}-${version_code}"
key_file="${MILTE_UPLOAD_STORE_FILE:-/Users/vaishakh/Library/Application Support/Milte/keys/milte-upload.jks}"
password_file="/Users/vaishakh/Library/Application Support/Milte/keys/milte-upload.password"
key_service="app.milte.android-upload"

if [[ ! -f "$key_file" ]]; then
  echo "Missing upload key. Run npm run android:key:create first." >&2
  exit 1
fi

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-/opt/homebrew/share/android-commandlinetools}"
export NODE_ENV="${NODE_ENV:-production}"
export PATH="$JAVA_HOME/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"
export MILTE_UPLOAD_STORE_FILE="$key_file"
if [[ -z "${MILTE_UPLOAD_STORE_PASSWORD:-}" ]]; then
  if security find-generic-password -a milte-release -s "$key_service" -w >/dev/null 2>&1; then
    MILTE_UPLOAD_STORE_PASSWORD="$(security find-generic-password -a milte-release -s "$key_service" -w)"
  elif [[ -f "$password_file" ]]; then
    MILTE_UPLOAD_STORE_PASSWORD="$(<"$password_file")"
  else
    echo "Upload-key password is unavailable in Keychain and $password_file does not exist." >&2
    exit 1
  fi
fi
export MILTE_UPLOAD_STORE_PASSWORD
export MILTE_UPLOAD_KEY_ALIAS="${MILTE_UPLOAD_KEY_ALIAS:-milte-upload}"
export MILTE_UPLOAD_KEY_PASSWORD="${MILTE_UPLOAD_KEY_PASSWORD:-$MILTE_UPLOAD_STORE_PASSWORD}"

cd "$mobile_dir"
npx expo prebuild --clean --platform android --no-install
node "$project_root/scripts/configure-android-signing.mjs"

mkdir -p "$project_root/release"

gradle_tasks=()
[[ "$artifact_kind" == "apk" || "$artifact_kind" == "all" ]] && gradle_tasks+=(app:assembleRelease)
[[ "$artifact_kind" == "aab" || "$artifact_kind" == "all" ]] && gradle_tasks+=(app:bundleRelease)
./android/gradlew --no-daemon -p android clean "${gradle_tasks[@]}"

copy_artifact() {
  local source_file="$1"
  local output_file="$2"
  cp "$source_file" "$output_file"
  shasum -a 256 "$output_file" > "$output_file.sha256"
  echo "Created $output_file"
}

if [[ "$artifact_kind" == "apk" || "$artifact_kind" == "all" ]]; then
  copy_artifact \
    "$mobile_dir/android/app/build/outputs/apk/release/app-release.apk" \
    "$project_root/release/${artifact_base}.apk"
fi

if [[ "$artifact_kind" == "aab" || "$artifact_kind" == "all" ]]; then
  copy_artifact \
    "$mobile_dir/android/app/build/outputs/bundle/release/app-release.aab" \
    "$project_root/release/${artifact_base}.aab"
fi
