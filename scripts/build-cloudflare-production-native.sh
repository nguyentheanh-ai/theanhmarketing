#!/bin/zsh
# Build the production Worker on native D1 (writer switch). Same as
# build-cloudflare-production.sh, plus: browser supabase-js points at the site
# itself (/auth/v1, /rest/v1 on D1). Needs CF_NATIVE_PROD_DB_ID.
set -eu
cd "$(dirname "$0")/.."
[[ -f .env.cfproduction ]] || { echo "Missing .env.cfproduction"; exit 1; }
: ${CF_NATIVE_PROD_DB_ID:?CF_NATIVE_PROD_DB_ID required}
set -a; . ./.env.cfproduction; set +a
export NEXT_PUBLIC_SUPABASE_URL=https://www.theanhmarketing.com NEXT_PUBLIC_SUPABASE_ANON_KEY=native-d1-anon
CF_DEPLOY_TARGET=production CF_ATTACH_PRODUCTION_DOMAINS=1 CF_PRODUCTION_NATIVE=1 node node_modules/vite/bin/vite.js build --mode cfproduction
node scripts/cloudflare-prune-staging-assets.mjs
node scripts/verify-cloudflare-production-artifact.mjs
grep -rq "$NEXT_PUBLIC_APP_URL" dist/server || { echo "APP URL not inlined"; exit 1; }
grep -q '"theanh-native-a"' dist/server/wrangler.json || { echo "native DB binding missing"; exit 1; }
echo "built theanh-main-cf-production (native D1)"
