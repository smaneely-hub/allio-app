# Browser Testing

## How it works

Allio's durable smoke path is:

1. `npm run bootstrap:browser`
2. `npm run smoke`

`bootstrap:browser` makes the repo ready in an idempotent way:
- ensures `@playwright/test` is installed in this repo
- ensures Chromium is installed
- detects whether native Linux browser deps exist
- if native deps are missing, pulls the Playwright Docker image and switches the repo to **docker browser mode**
- writes `.openclaw/browser-mode`

`npm run smoke` then uses that mode:
- `native` → runs Playwright directly in this Linux environment
- `docker` → runs Playwright inside `mcr.microsoft.com/playwright:v1.59.1-noble`
- `api-fallback` / `auto` → HTTP/Supabase fallback only when a real browser path is unavailable

## What smoke verifies

In browser mode, the smoke test must:
- launch Chromium successfully
- load the app
- log in with the smoke account
- verify the page reaches **Tonight's Meal**
- verify it did **not** default to **Plan**
- click **Generate tonight's meal**
- fail loudly on generation errors, timeouts, or critical console/runtime errors
- save a screenshot to `.openclaw/artifacts/smoke-final.png`

## PASS vs FAIL

**PASS** means:
- Playwright launches
- the app loads
- login succeeds
- `Tonight's Meal` is visible
- the app is not defaulting to `/plan`
- meal generation completes without error
- no critical runtime/console failures occur

**FAIL** means any required step above fails.
A partial pass is still a fail.

## Commands

```bash
npm run bootstrap:browser
npm run smoke
```

Optional overrides:

```bash
APP_URL=https://allio.life npm run smoke
SMOKE_TEST_EMAIL=... SMOKE_TEST_PASSWORD=... npm run smoke
SMOKE_MODE=browser npm run smoke
```

## Notes for OpenClaw

- OpenClaw should prefer the browser path, not API-only checks.
- If native browser launch is blocked by missing Linux libs, OpenClaw should use the Docker browser path automatically.
- OpenClaw should not report success after code changes until `npm run smoke` completes successfully.
