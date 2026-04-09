#!/usr/bin/env bash
# Idempotent bootstrap: installs Playwright package, browsers, and a durable runtime path.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PW_CACHE="${HOME}/.cache/ms-playwright"
DOCKER_IMAGE="mcr.microsoft.com/playwright:v1.59.1-noble"

cd "$REPO_ROOT"

echo "=== Allio Browser Test Bootstrap ==="
echo "Repo: $REPO_ROOT"
echo "Date: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo

echo "── Step 1: Install @playwright/test in repo ──"
if node -e "require('@playwright/test')" 2>/dev/null; then
  PW_VERSION=$(node -e "console.log(require('@playwright/test/package.json').version)" 2>/dev/null || echo "unknown")
  echo "  SKIP — @playwright/test already installed (v${PW_VERSION})"
else
  npm install --save-dev @playwright/test
  echo "  DONE — installed @playwright/test"
fi

echo
echo "── Step 2: Locate playwright binary ──"
if npx playwright --version >/dev/null 2>&1; then
  echo "  Found: npx playwright ($(npx playwright --version))"
else
  echo "  ERROR: playwright binary not found"
  exit 1
fi

echo
echo "── Step 3: Install browser binaries ──"
CHROMIUM_DIR=$(find "$PW_CACHE" -maxdepth 1 -type d \( -name 'chromium-*' -o -name 'chromium_headless_shell-*' \) 2>/dev/null | head -1 || true)
if [ -n "$CHROMIUM_DIR" ]; then
  echo "  SKIP — Playwright browser binaries already present"
else
  npx playwright install chromium
  echo "  DONE — Chromium installed"
fi

echo
echo "── Step 4: Detect native system dependencies ──"
REQUIRED_LIBS=(libnspr4 libnss3 libasound2)
MISSING_LIBS=()
for lib in "${REQUIRED_LIBS[@]}"; do
  if ldconfig -p 2>/dev/null | grep -q "${lib}\.so" || dpkg -l "$lib" 2>/dev/null | grep -q '^ii'; then
    echo "  OK: $lib"
  else
    echo "  MISSING: $lib"
    MISSING_LIBS+=("$lib")
  fi
done

BROWSER_MODE="native"
BLOCKER=""
if [ ${#MISSING_LIBS[@]} -gt 0 ]; then
  if command -v docker >/dev/null 2>&1; then
    echo "  Native deps missing; using Docker Playwright runtime instead"
    echo "  Pulling $DOCKER_IMAGE if needed..."
    docker pull "$DOCKER_IMAGE" >/dev/null
    BROWSER_MODE="docker"
  else
    BROWSER_MODE="api-fallback"
    BLOCKER="Missing native libs (${MISSING_LIBS[*]}) and Docker unavailable"
  fi
fi

echo
echo "── Step 5: Smoke test prerequisites ──"
APP_URL="${APP_URL:-https://allio.life}"
TEST_EMAIL="${SMOKE_TEST_EMAIL:-test@allio.life}"
echo "  APP_URL:      $APP_URL"
echo "  TEST_EMAIL:   $TEST_EMAIL"
echo "  BROWSER_MODE: $BROWSER_MODE"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$APP_URL" || echo "000")
echo "  App status:   $HTTP_STATUS"

mkdir -p "$REPO_ROOT/.openclaw"
echo "$BROWSER_MODE" > "$REPO_ROOT/.openclaw/browser-mode"

echo
echo "=== Bootstrap complete ==="
echo "  Wrote .openclaw/browser-mode: $BROWSER_MODE"
[ -n "$BLOCKER" ] && echo "  BLOCKER: $BLOCKER"
echo "  Run smoke test: npm run smoke"
