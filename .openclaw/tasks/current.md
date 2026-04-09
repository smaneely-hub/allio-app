# Task: Fix Login Redirect + Broken Code + Deploy

## Objective
Inspect the full repo, fix broken code, fix login redirect to land on "Tonight's Meal" (not Plan), validate, deploy, and verify live behavior.

## Repo Root
`/home/claude/.openclaw/workspace/allio-app`

## Relevant Files/Paths
- `src/App.jsx` — routing and default page
- `src/pages/TonightPage.jsx` — Tonight's Meal page (suspected duplicate onClick)
- `src/components/NavBar.jsx` — navigation
- `src/hooks/useAuth.js` — auth flow
- `supabase/functions/generate-plan/index.ts` — meal generation edge function
- Any auth/login related code

## Constraints
- Do NOT refactor unrelated files
- Prefer minimal diffs
- Preserve existing behavior for non-affected paths

## Required Guardrails
- [ ] Verify files exist on disk (not just assume)
- [ ] Verify the issue exists before fixing
- [ ] Run validation after changes
- [ ] Report blockers immediately

## Validation Steps
1. [ ] Run: `npm run build` (or check package.json for build command)
2. [ ] Check: build succeeds without errors
3. [ ] Test: login redirects to Tonight's Meal

## Deployment
- Deploy frontend (Vercel)
- Deploy edge functions if changed
- Verify correct project/environment

## LIVE Verification
- [ ] Login lands on "Tonight's Meal"
- [ ] No redirect back to Plan
- [ ] Meal swap works correctly

## Required Report Format

```markdown
## Task: Fix Login Redirect + Broken Code

### Root Cause(s)
- [list]

### Files Inspected
- [list]

### Files Changed
- [file] (+X lines, -Y lines)

### Commands Run
- [command1]
- [command2]

### Validation Results
- [test1]: PASS/FAIL
- [test2]: PASS/FAIL

### Deploy Result
- [deploy check]: SUCCESS/FAIL

### Live Verification Result
- [check]: PASS/FAIL

### Remaining Issues
- [none or list]

### Final Status
PASS / FAIL
```

---

## Instructions for Claude Code (Execution Worker)

1. **Inspect** — Read relevant files from disk, verify current state
2. **Identify root cause** — Why does "swap" trigger "generate"? Why does login go to Plan?
3. **Fix** — Make minimal, targeted changes
4. **Validate** — Run build, check for errors
5. **Deploy** — Push changes to Vercel + edge functions
6. **Verify LIVE** — Test login redirect behavior
7. **Report** — Follow the required report format exactly