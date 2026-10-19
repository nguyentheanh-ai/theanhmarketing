#!/bin/zsh
# Deploy the isolated native-data TEST Worker (theanh-main-cf-native, workers.dev
# only, no custom domain, production untouched). The first version must carry
# every declared secret (a new Worker cannot inherit), so they go in a temp
# secrets file that is deleted on exit. Nothing secret is printed.
set -eu
cd "$(dirname "$0")/.."
AUTH_FILE=${1:?usage: deploy-native-test.sh <path to native-a-authority.json>}
./scripts/build-cloudflare-native.sh
S=$(mktemp); trap 'rm -f "$S"' EXIT
node scripts/native-test-secrets.mjs "$AUTH_FILE" "$S"
./node_modules/.bin/wrangler deploy --config dist/server/wrangler.json --secrets-file "$S"
echo "done: https://theanh-main-cf-native.12c1thdtheanh.workers.dev"
