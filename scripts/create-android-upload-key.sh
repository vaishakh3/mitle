#!/usr/bin/env bash
set -euo pipefail

key_dir="${MILTE_KEY_DIR:-/Users/vaishakh/Library/Application Support/Milte/keys}"
key_file="$key_dir/milte-upload.jks"
password_file="$key_dir/milte-upload.password"
key_service="app.milte.android-upload"

mkdir -p "$key_dir"
chmod 700 "$key_dir"

if [[ -f "$key_file" ]]; then
  echo "Upload key already exists at $key_file"
  exit 0
fi

key_password="$(openssl rand -hex 24)"
/opt/homebrew/opt/openjdk@17/bin/keytool -genkeypair \
  -keystore "$key_file" \
  -storepass "$key_password" \
  -keypass "$key_password" \
  -alias milte-upload \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -dname "CN=Milte Upload, OU=Release Engineering, O=Milte, C=IN"
if security add-generic-password -U -a milte-release -s "$key_service" -w "$key_password" >/dev/null 2>&1; then
  rm -f "$password_file"
  password_location="macOS Keychain"
else
  umask 077
  printf '%s' "$key_password" > "$password_file"
  chmod 600 "$password_file"
  password_location="$password_file (Keychain was unavailable)"
fi
chmod 600 "$key_file"
unset key_password
echo "Created the Milte upload key; password storage: $password_location"
