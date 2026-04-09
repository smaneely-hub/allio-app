## Session Rollover
### Project
Allio planner recovery / edge function auth isolation

> **Note:** This repo uses the OpenClaw debugging architecture. See `.openclaw/OPERATING_CONTRACT.md`.

### What We Did
- Added `/planner-test` UI route and dashboard link for direct planner-function testing using live household/member context.
- Added token claim decoding to confirm browser session JWT shape.
- Added `planner-diagnostic` edge function for minimal route-level diagnostics.
- Added `planner-generate-test` edge function using the same broad implementation style as `openrouter-test`.
- Repeated live tests from browser against:
  - `planner-diagnostic`
  - `openrouter-test`
  - `planner-generate-test`
  - `generate-plan`

### Decisions / Constraints
- Local env files should be read first before code/debugging tasks in this workspace.
- Do not assume the planner works just because UI no longer crashes.
- Telemetry / `usage_tracking` is secondary and must not block planner flow.
- Avoid broad unrelated auth changes; focus on exact failing layer.

### Current State
- Browser session token is valid and project-aligned:
  - `iss`: `https://rvgtmletsbycrbeycwus.supabase.co/auth/v1`
  - `aud`: `authenticated`
  - `role`: `authenticated`
  - `sub`: `4377e2a5-db07-412f-9887-e7d5b80e362d`
- `openrouter-test` succeeds from the browser with status 200.
- `planner-diagnostic`, `planner-generate-test`, and `generate-plan` all fail from the browser with the same response:
  - status 401
  - body `{ "code": 401, "message": "Invalid JWT" }`
- This means the blocker is not global browser auth and not OpenRouter access.
- The rejection appears tied to the planner function routes/family at the Supabase edge gateway layer, before handler logic can help.

### Open Issues
- Core planner loop is still blocked at function entry for planner-related routes.
- `generate-plan` is not currently reachable from the browser despite a valid session token.
- Existing planner-specific function route names may be affected by platform-side auth/config behavior not visible in repo.

### Next Step
- Direct fix path: temporarily route planner generation through a known-good function family/path pattern (matching `openrouter-test`) rather than the blocked planner-related function routes.
- Then adapt frontend save/render to consume that working function response.
- After core loop works again, either:
  1. keep the replacement route and deprecate blocked planner routes, or
  2. investigate Supabase dashboard/platform config differences between the working and blocked function routes.

### Not Preserved
- Raw repeated console logs beyond the decisive evidence above.
- Intermediate auth theories disproven by the openrouter-test comparison.
