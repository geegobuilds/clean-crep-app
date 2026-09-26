#!/usr/bin/env bash
# One-command "phone" checks: local Supabase (Docker) + Expo web + Playwright
# in an emulated Pixel 7. Usage: npm run e2e   (from apps/mobile or repo root)
#   E2E_SHOTS=1 npm run e2e   also saves a screenshot of every step to e2e/.shots/
set -euo pipefail
cd "$(dirname "$0")/.."            # apps/mobile
ROOT="$(cd ../.. && pwd)"

# Docker daemon (cloud sandboxes don't start it automatically).
if ! docker info >/dev/null 2>&1; then
  echo "Starting Docker daemon…"
  (dockerd >/tmp/dockerd.log 2>&1 &)
  for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
fi

# Local Supabase with this repo's migrations + seed. Skip services the app
# doesn't use to keep startup fast.
if ! (cd "$ROOT" && npx supabase status >/dev/null 2>&1); then
  (cd "$ROOT" && npx supabase start -x studio,imgproxy,logflare,vector,supavisor,postgres-meta)
fi
eval "$(cd "$ROOT" && npx supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=')"
export EXPO_PUBLIC_SUPABASE_URL="$API_URL" EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export E2E_SUPABASE_URL="$API_URL" E2E_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" E2E_ANON_KEY="$ANON_KEY" E2E_DB_URL="$DB_URL"
# Web can't receive pushes; this lets the checks walk the push explainer flow.
export EXPO_PUBLIC_PUSH_PREVIEW=1

# Prefer the pre-installed Chromium in cloud sandboxes (no browser download).
if [ -z "${PW_CHROMIUM_PATH:-}" ] && [ -x /opt/pw-browsers/chromium-1194/chrome-linux/chrome ]; then
  export PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
fi

exec npx playwright test "$@"
