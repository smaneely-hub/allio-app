# Operating Contract

## Required rules

- OpenClaw must use a Playwright browser for verification.
- OpenClaw must run smoke tests after code changes.
- OpenClaw must not claim success without browser validation.
- OpenClaw must use Claude Code for code edits.
- Default workflow: **inspect → fix → validate → smoke test → report**.

## Durable browser workflow

1. Run `npm run bootstrap:browser`
2. Run `npm run smoke`
3. If native Linux browser deps are missing, use the repo's Docker Playwright path automatically.
4. Treat API-only checks as fallback diagnostics, not full verification.

## Verification standard

A task involving UI, auth, planner generation, routing, or deployment is not complete unless:
- relevant code was inspected
- changes were validated
- `npm run smoke` was executed
- browser validation evidence exists
- final report includes PASS or FAIL
