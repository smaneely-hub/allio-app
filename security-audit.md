# Allio Security Audit

Date: 2026-04-13
Repo: `allio-app`

## 1. RLS POLICIES

**Overall: FAIL** - Several tables are properly user-scoped, but active migrations leave core tables undocumented, `recipes` never has RLS enabled in active migrations, `recipes_v2` has RLS with no policies, and `usage_tracking` is not scoped to the row's `user_id`.

| Table | Status | One-line explanation |
| --- | --- | --- |
| `feature_flags` | PASS | `202604080003_security_fix.sql` enables RLS and restricts access to `auth.role() = 'service_role'`, which is appropriate for an internal system table. |
| `households` | UNKNOWN | Active root migrations only alter this table and say policies "already has policies," but no active migration in the audited set creates/enables/verifies those policies. |
| `household_members` | UNKNOWN | Active root migrations only alter/reference this table; no active migration in the audited set shows RLS enablement or policies. |
| `meal_instances` | PASS | `202604080001_allio_schema.sql` and `202604080002_meal_learning.sql` enable RLS and scope select/insert/update to `auth.uid() = user_id`. |
| `meal_member_feedback` | PASS | RLS is enabled and policies restrict access to users tied to the meal instance household via `household_members` and `meal_instances`. |
| `meal_plans` | UNKNOWN | `202603300001_planner_workspace.sql` alters this table, but no active migration in the audited set shows RLS enablement or policies for it. |
| `meal_signals` | PASS | `202604110001_create_meal_signals.sql` enables RLS and scopes select/insert to `auth.uid() = user_id`. |
| `planned_days` | PASS | `202603300001_planner_workspace.sql` enables RLS and scopes select/insert/update/delete to `auth.uid() = user_id`. |
| `planned_meals` | PASS | `202603300001_planner_workspace.sql` enables RLS and scopes select/insert/update/delete to `auth.uid() = user_id`. |
| `recipes` | FAIL | `202604080003_security_fix.sql` creates policies, but no active migration enables RLS on `recipes`, so those policies are ineffective. |
| `recipes_v2` | FAIL | `202604030001_create_recipes_v2.sql` enables RLS but defines no policies, leaving access behavior incomplete. |
| `saved_meals` | PASS | `202604080001_allio_schema.sql` enables RLS and scopes select/insert/delete to `auth.uid() = user_id`. |
| `schedule_slots` | UNKNOWN | Active root migrations alter this table but do not show active RLS/policy creation in the audited set. |
| `shopping_lists` | PASS | Multiple active migrations enable RLS and scope select/insert/update/delete to `auth.uid() = user_id`. |
| `usage_tracking` | FAIL | `202604080003_security_fix.sql` enables RLS, but the only policy is `INSERT WITH CHECK (auth.uid() IS NOT NULL)`, which does not enforce `user_id = auth.uid()`. |
| `weekly_schedules` | UNKNOWN | Active root migrations alter this table but do not show active RLS/policy creation in the audited set. |

Notes:
- There is an archived file at `supabase/migrations/archive/rls_policies.sql` with plausible policies for `households`, `household_members`, `weekly_schedules`, `schedule_slots`, and `meal_plans`, but it is not part of the active migration set reviewed above.
- `001_initial_schema.sql` is only a stub comment, so the base schema and its original RLS posture are not auditable from active migrations alone.

## 2. EDGE FUNCTION AUTH

**Overall: FAIL** - Most Edge Functions do not call `auth.getUser()` or equivalent before doing work, and `generate-plan` has a `public_mode` bypass and parses the request body before auth.

| Function | Status | One-line explanation |
| --- | --- | --- |
| `allio-setup` | FAIL | Uses a service-role client and runs setup checks without authenticating the caller. |
| `db-setup` | FAIL | Uses a service-role client and attempts setup operations without authenticating the caller. |
| `delete-all-recipes` | FAIL | Deletes from `recipes` with a service-role client and has no caller auth check. |
| `fix-rls` | FAIL | Accepts raw JSON and attempts privileged DB changes without any caller auth. |
| `fix-schema` | FAIL | Exposes schema-fix behavior without authenticating the caller. |
| `fix-tables` | FAIL | Performs table checks with a service-role client and no caller auth. |
| `generate-plan` | FAIL | Auth exists only on the non-public path, but it parses `req.json()` first and explicitly skips auth when `public_mode === true`. |
| `generate-public-meal` | FAIL | Public endpoint with no `auth.getUser()` check. |
| `get-recipes` | FAIL | Reads with a service-role client and no caller auth. |
| `insert-recipe-direct` | FAIL | Inserts into `recipes` with a service-role client and no caller auth. |
| `meal-generate` | PASS | Checks the `Authorization` header and calls `auth.getUser()` before parsing the request body or doing meal-generation work. |
| `refine-meal` | PASS | Checks `Authorization` and calls `auth.getUser()` before parsing the body and refining the meal. |
| `security-fix` | FAIL | Attempts privileged security changes with no caller auth. |
| `seed-recipes` | FAIL | Deletes and upserts recipe data with a service-role client and no caller auth. |
| `send-email` | PASS | Validates the bearer token with `auth.getUser()` before reading the request body or sending email. |
| `setup-meal-learning` | FAIL | Uses a service-role admin client to create tables/policies with no caller auth. |

## 3. API KEY EXPOSURE

**Overall: FAIL** - Secrets exist locally in `.env.local`, and real secrets are present in git history even though the sensitive files are now ignored.

- **FAIL** - `allio-app/.env.local` contains live-looking secrets, including a Vercel token and a Supabase access token.
- **PASS** - `.gitignore` includes `.env.local`, `.env.production`, `.supabase_token`, `credentials.1md`, and `CREDENTIALS.md`.
- **FAIL** - Git history contains real secrets, including a Supabase access token in commit `3439dda5a3e64b06319650aa016988f408f7faac`, plus a Supabase anon key and malformed token material in prior tracked env files.
- **FAIL** - Historical tracked files `.env.production`, `.supabase_token`, and `credentials.1md` were committed and only later removed by `51e77f0` and `a1a6895`.
- **PASS** - I did not find hardcoded production API secrets in active tracked source files outside ignored local env files and documentation placeholders.

## 4. LLM PROMPT INJECTION

**Overall: FAIL** - Every OpenRouter-calling function directly interpolates user-controlled input into prompt strings without sanitization, isolation, or structured escaping beyond string interpolation.

| Function | Status | One-line explanation |
| --- | --- | --- |
| `generate-plan` | FAIL | `buildSystemPrompt(...)` directly injects `suggestion`, `weekNotes`, member preferences, planning notes, and other user-controlled strings into the system prompt. |
| `generate-public-meal` | FAIL | `buildPrompt(payload)` directly interpolates `ingredients`, `dietary`, `allergies`, `audience`, `timeConstraint`, `mood`, and `servings` into the system prompt. |
| `meal-generate` | FAIL | `buildSystemPrompt(...)` directly injects `suggestion`, `weekNotes`, restrictions, preferences, and other user-controlled text into the system prompt. |
| `refine-meal` | FAIL | The LLM prompt concatenates raw `JSON.stringify(recipe, null, 2)` and raw `feedback` into a single user prompt string. |

## 5. RATE LIMITING

**Overall: FAIL** - Rate limiting exists only in `generate-public-meal`, and even there it is an in-memory per-instance map that is easy to bypass across cold starts or multiple instances.

- **PASS** - `supabase/functions/generate-public-meal/index.ts` enforces `MAX_REQUESTS_PER_HOUR = 5` per `x-forwarded-for` IP with a `429` response.
- **FAIL** - No other Edge Function reviewed has rate limiting, throttling, quota checks, or abuse controls.
- **FAIL** - The one implemented limiter is process-memory only, so it is not durable or globally consistent in a serverless environment.

## 6. CORS

**Overall: FAIL** - Every Edge Function reviewed sets `Access-Control-Allow-Origin` to `*`.

Wildcard CORS found in:
- `supabase/functions/allio-setup/index.ts`
- `supabase/functions/db-setup/index.ts`
- `supabase/functions/delete-all-recipes/index.ts`
- `supabase/functions/fix-rls/index.ts`
- `supabase/functions/fix-schema/index.ts`
- `supabase/functions/fix-tables/index.ts`
- `supabase/functions/generate-plan/index.ts`
- `supabase/functions/generate-public-meal/index.ts`
- `supabase/functions/get-recipes/index.ts`
- `supabase/functions/insert-recipe-direct/index.ts`
- `supabase/functions/meal-generate/index.ts`
- `supabase/functions/refine-meal/index.ts`
- `supabase/functions/security-fix/index.ts`
- `supabase/functions/send-email/index.ts`
- `supabase/functions/setup-meal-learning/index.ts`

## 7. INPUT VALIDATION

**Overall: FAIL** - The frontend does some normalization and coercion, but most user-submitted data is not schema-validated before storage or before being passed into Edge Functions and prompts.

- **FAIL** - `src/hooks/useHousehold.js` coerces integers but does not enforce schemas, bounds, enums, lengths, or sanitization before writing household and member data to Supabase.
- **FAIL** - `src/hooks/useMealPlan.js` shapes payloads before upserts/invocations, but it does not validate the household, member, slot, swap, or note structures against a strict schema.
- **FAIL** - `supabase/functions/generate-public-meal/index.ts` accepts raw `req.json()` and feeds it directly into prompt construction with no request schema validation.
- **FAIL** - `supabase/functions/generate-plan/index.ts` and `supabase/functions/meal-generate/index.ts` check for required top-level fields and slot shape, but they do not validate string lengths, enum values, array limits, nested object shape, or prompt-safety constraints.
- **FAIL** - `supabase/functions/refine-meal/index.ts` only checks for presence of `recipe` and `feedback`, then uses them directly.
- **PASS** - `src/lib/mealSchema.js` and `src/lib/recipeSchema.js` do normalize and type-coerce recipe/meal structures, which reduces some malformed-data risk after generation.
- **FAIL** - `src/pages/PublicMealGeneratorPage.jsx` sends free-form ingredient, allergy, and preference text directly to the public function with no client-side schema validation beyond a numeric input widget for servings.

## Bottom line

The codebase has some good user-scoped RLS work on newer tables, but the overall audit result is **FAIL** because of missing/unclear RLS coverage on core tables, unauthenticated privileged Edge Functions, secrets in git history, prompt-injection exposure, near-total absence of rate limiting, wildcard CORS everywhere, and weak input validation across both client and function layers.
