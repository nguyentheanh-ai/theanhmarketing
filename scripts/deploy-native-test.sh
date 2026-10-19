#!/bin/zsh
# Deploy the isolated native-data TEST Worker (theanh-main-cf-native, workers.dev
# only, no custom domain, production untouched) and set its secrets.
# Secret values are read from Keychain / generated locally and piped to wrangler;
# nothing is printed.
set -eu
cd "$(dirname "$0")/.."
AUTH_FILE=${1:?usage: deploy-native-test.sh <path to native-a-authority.json>}
./scripts/build-cloudflare-native.sh
W=./node_modules/.bin/wrangler
CFG=dist/server/wrangler.json
$W deploy --config $CFG
put(){ $W secret put "$1" --config $CFG >/dev/null; echo "set $1"; }
rand(){ node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))"; }
cat "$AUTH_FILE" | put NATIVE_DATA_AUTHORITY
cat "$AUTH_FILE" | put NATIVE_AUTH_AUTHORITY
/usr/bin/security find-generic-password -w -s com.theanhmarketing.cloudflare-migration.backup-secret.native-a-credential -a theanh-main-cf-staging-credential | tr -d '\n' | put NATIVE_AUTH_CREDENTIAL_KEY
rand | put NATIVE_AUTH_LIMITER_KEY
rand | put NATIVE_AUTH_REFRESH_KEY
rand | put R2_PRIVATE_URL_SECRET
rand | put STUDENT_PORTAL_PROVISION_SECRET
echo "done: https://theanh-main-cf-native.12c1thdtheanh.workers.dev"
