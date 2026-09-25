#!/usr/bin/env bash
# Run after building the production image. Requires Playwright Chromium or Chrome.
set -Eeuo pipefail
image=${1:-life-os-single}
access_password=life-os-disposable-smoke-password-2026
port=${LIFE_OS_E2E_PORT:-3210}
name="life-os-browser-${RANDOM}-$$"
base_url="http://127.0.0.1:${port}"
cleanup() {
  status=$?
  trap - EXIT
  if ((status != 0)); then docker logs "$name" >&2 || true; fi
  docker rm -f "$name" >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT
docker run -d --rm --name "$name" --memory=256m --memory-swap=256m --cpus=1 \
  -e "APP_ORIGIN=$base_url" -e "LIFE_OS_ACCESS_PASSWORD=$access_password" -p "127.0.0.1:${port}:3000" "$image" >/dev/null
for ((attempt=0; attempt<90; attempt++)); do
  if curl --fail --silent "$base_url/api/health" >/dev/null; then break; fi
  if [[ $(docker inspect -f '{{.State.Running}}' "$name") != true ]]; then exit 1; fi
  sleep 1
done
curl --fail --silent "$base_url/api/health" >/dev/null
LIFE_OS_E2E_URL="$base_url" LIFE_OS_E2E_PASSWORD="$access_password" pnpm exec playwright test tests/e2e/finance-smoke.spec.ts --workers=1
