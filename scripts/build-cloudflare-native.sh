#!/bin/zsh
# Build the isolated native-data test Worker (theanh-main-cf-native, workers.dev).
# The browser supabase-js client is pointed at the Worker origin itself, so
# /auth/v1 and /rest/v1 are served from D1; no Supabase project is contacted.
set -eu
cd "$(dirname "$0")/.."
ORIGIN=https://theanh-main-cf-native.12c1thdtheanh.workers.dev
set -a; . ./.env.cfstaging; set +a
export NEXT_PUBLIC_SUPABASE_URL=$ORIGIN NEXT_PUBLIC_SITE_URL=$ORIGIN NEXT_PUBLIC_SUPABASE_ANON_KEY=native-d1-anon
CF_DEPLOY_TARGET=native node node_modules/vite/bin/vite.js build --mode cfstaging
node scripts/cloudflare-prune-staging-assets.mjs
grep -rq "$ORIGIN" dist/server || { echo "native origin not inlined"; exit 1; }
echo "built theanh-main-cf-native"
