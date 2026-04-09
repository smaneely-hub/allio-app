# Allio Project State

## Production Source of Truth
- Live domain: `https://allio.life`
- Current Vercel project serving production: `allio-loop-preview`
- GitHub repo: `smaneely-hub/allio-app`
- Production branch in active use: `master`
- Supabase project ref: `rvgtmletsbycrbeycwus`
- Core planning edge function: `generate-plan`

## Important Operational Notes
- GitHub being correct does **not** guarantee production is correct.
- Vercel production artifact and Supabase function deployment must both be verified.
- OpenRouter traffic is a key signal: if no request hits OpenRouter, failure is happening before LLM generation.

## Known Failure Pattern (March 2026)
### Failure Pattern
Production core loop degraded while UI work was also happening, creating the false impression that layout changes broke planning.

### Root Cause
Multiple independent drifts:
- stale production bundle on Vercel
- duplicate Vercel projects causing ambiguity
- Supabase function deployment drift
- auth/gateway regression on `generate-plan`

### Prevention Rule
Protect the core loop with explicit smoke tests and verify production state across all layers after every release touching planning.

### Verification Steps
1. Check live bundle hash on `allio.life`
2. Check Vercel project/domain linkage
3. Check Supabase function live version
4. Confirm generate works
5. Confirm swap works
6. Confirm OpenRouter receives a request

## Current Historical Notes
- Duplicate Vercel projects were removed; only `allio-loop-preview` remains live.
- Weekly plan UI was refactored from 7-column layout to day-tab single-day layout.
- Lock/unlock button was removed from meal cards.
- `generate-plan` experienced 401 failures at the Supabase gateway boundary under legacy built-in `verify_jwt`; permanent fix path is explicit in-function auth validation with `verify_jwt: false`.
- Current active bug is no longer auth: generate requests complete end-to-end, but the function can still return an empty plan (`mealCount: 0`) due to parsing/transform/filter mismatches in `generate-plan`.
- `usage_tracking` existed in local migration but was missing from remote DB until applied; telemetry remains non-blocking and schema drift around its `metadata` column still required cleanup.

## Required Habit
Before making release-related changes, read:
- `docs/guardrails.md`
- `docs/release-checklist.md`
- `docs/project-state.md`
