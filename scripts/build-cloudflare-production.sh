#!/bin/zsh
# Build the production Worker (theanh-main-cf-production). Public NEXT_PUBLIC_*
# values come ONLY from .env.cfproduction: they are exported into the build
# process because vinext's server bundle otherwise reads the staging .env.local
# (that build had staging app/site URLs inlined on the server). Process env
# always wins over .env* files.
set -eu
cd "$(dirname "$0")/.."
[[ -f .env.cfproduction ]] || { echo "Missing .env.cfproduction"; exit 1; }
set -a; . ./.env.cfproduction; set +a
CF_DEPLOY_TARGET=production node node_modules/vite/bin/vite.js build --mode cfproduction
node scripts/cloudflare-prune-staging-assets.mjs
node scripts/verify-cloudflare-production-artifact.mjs
# Guard: the server bundle must carry the production app URL from .env.cfproduction.
grep -rq "$NEXT_PUBLIC_APP_URL" dist/server || { echo "NEXT_PUBLIC_APP_URL not inlined in server build"; exit 1; }
grep -rq "$NEXT_PUBLIC_SITE_URL" dist/server || { echo "NEXT_PUBLIC_SITE_URL not inlined in server build"; exit 1; }
echo "built theanh-main-cf-production (APP=$NEXT_PUBLIC_APP_URL SITE=$NEXT_PUBLIC_SITE_URL)"
