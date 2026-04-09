# Allio Release Checklist

## Mandatory Pre-Release Reads
Before any release-related change, read:
- `docs/guardrails.md`
- `docs/release-checklist.md`
- `docs/project-state.md`

## Core Loop Smoke Test
After any change that could affect planning, auth, deployment, or edge functions:
- [ ] Log in with a real account
- [ ] Generate a meal plan successfully
- [ ] Swap a meal successfully
- [ ] Confirm OpenRouter receives a request
- [ ] Confirm no unexpected 401 from `generate-plan`

## Production Verification
- [ ] Confirm GitHub branch/commit is correct
- [ ] Confirm Vercel production is serving the newest bundle hash
- [ ] Confirm `allio.life` points to the intended Vercel project
- [ ] Confirm Supabase `generate-plan` function is the expected live version

## Auth / Gateway Verification
- [ ] Inspect browser network request to `generate-plan`
- [ ] Confirm required headers are present
  - [ ] `Authorization: Bearer <token>`
  - [ ] `apikey`
  - [ ] `Content-Type: application/json`
- [ ] Confirm authenticated request reaches edge function
- [ ] Confirm 401s are not occurring at the Supabase gateway layer

## Deploy Discipline
- [ ] Do not treat frontend deploy as sufficient
- [ ] Do not treat function deploy as sufficient
- [ ] Verify frontend + function + auth path together
- [ ] If UI changes appear to break core loop, investigate deployment drift before changing core logic again

## Post-Incident Rule
If a new repeatable failure pattern is discovered:
- [ ] Write it to `docs/guardrails.md`
- [ ] Update `docs/project-state.md`
- [ ] Add explicit verification steps here if needed

## Schema Drift Verification
- [ ] Confirm telemetry/supporting tables actually exist remotely after migrations
- [ ] Confirm expected columns exist (`usage_tracking.metadata`, etc.)
- [ ] Treat missing telemetry tables as non-blocking for the core loop
