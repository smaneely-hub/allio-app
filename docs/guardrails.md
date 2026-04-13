# Allio Guardrails

## Core Loop Is Protected Infrastructure

The meal-planning core loop (`generate plan` + `swap meal` + OpenRouter invocation) is foundational infrastructure, not a cosmetic feature.

### Rule
UI/layout work must never be treated as isolated unless the core loop is re-verified after deploy.

### Failure Pattern
A formatting/layout refactor appeared to coincide with core generate/swap failures, even though the visual code was not the true cause.

### Root Cause
The real problem was deployment/process coupling:
- stale frontend artifacts were served in production
- multiple Vercel projects created ambiguity about what was live
- Supabase Edge Function deploys drifted from frontend deploys
- auth/gateway behavior changed independently of UI work

### Prevention Rule
Treat frontend, auth, edge functions, and OpenRouter invocation as one release surface for the core loop.

### Verification Steps
After any release touching planning flows:
1. Verify the live bundle hash changed on `allio.life`
2. Verify `generate-plan` is the expected live function version
3. Verify generate works
4. Verify swap works
5. Verify OpenRouter receives requests

---

## Deployment Drift Is a First-Class Failure Mode

### Failure Pattern
GitHub contained newer code, but production served older bundles and/or older function behavior.

### Root Cause
Frontend deploy state, Vercel project selection, and Supabase function deployment were not kept in lockstep.

### Prevention Rule
Never assume GitHub state equals production state.
Never use Vercel CLI for this project. Production deployment happens only through GitHub integration by pushing `master` with `git push origin master`.

### Verification Steps
For production debugging always verify all three independently:
1. GitHub branch/commit
2. Vercel production artifact actually serving `allio.life`
3. Supabase function version deployed live

---

## If UI Changes "Break" the Engine, Suspect Release Coupling First

### Failure Pattern
A visual refactor seemed to break core functionality.

### Root Cause
The visible change and the functional failure were adjacent in release timing, not directly coupled in code.

### Prevention Rule
When a UI-only change appears to break the engine, first investigate:
- stale bundle delivery
- wrong Vercel project
- outdated edge function deployment
- auth gateway regression

### Verification Steps
Before changing more source code:
1. Check the live HTML bundle name
2. Check the deployed Vercel project/domain linkage
3. Check the function version in Supabase
4. Check whether OpenRouter was actually called

---

## Supabase Function Auth Must Be Verified at the Gateway Boundary

### Failure Pattern
`generate-plan` returned 401 before any OpenRouter traffic appeared.

### Root Cause
The request was rejected at the Supabase gateway/auth boundary before the function body reached the LLM call.

### Prevention Rule
Do not assume function code is running just because the frontend hit `/functions/v1/generate-plan`.

### Verification Steps
1. Inspect browser network response body/status
2. Confirm whether the gateway or the function returned the 401
3. Confirm required headers are present (`Authorization`, `apikey`, `Content-Type`)
4. Confirm OpenRouter logs/requests actually appear

---

## Do Not Bypass Auth To Fix Function Failures

### Failure Pattern
A broken edge-function auth path tempted us to disable auth entirely just to unblock functionality.

### Root Cause
We optimized for immediate execution instead of repairing the authenticated contract between frontend, Supabase gateway, and function.

### Prevention Rule
Do not bypass auth to fix function failures. Fix the auth contract instead.

### Verification Steps
1. Confirm frontend sends `Authorization: Bearer <access_token>`
2. Confirm session exists and token is not expired
3. Confirm frontend project ref matches function project ref
4. Confirm authenticated request reaches function
5. Confirm function-level logs show auth context before external calls

---

## Lessons Learned Become Durable Operating Guardrails

### Rule
When a mistake reveals a repeatable failure pattern:
1. Write it into permanent project docs
2. Include failure pattern, root cause, prevention rule, and verification steps
3. Treat these docs as source-of-truth memory for future sessions
4. Read them before release-related changes
