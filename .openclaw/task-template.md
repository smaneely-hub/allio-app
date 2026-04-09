# Task Template

Use this template for all debugging/repair/validation tasks. OpenClaw fills in the template when spawning Claude Code.

---

## Objective
> What needs to be accomplished?

**Example:** Fix the meal swap feature so it only swaps the target slot, not all slots.

---

## Repo Root
> The repository root directory

**Example:** `/home/claude/.openclaw/workspace/allio-app`

---

## Relevant Files/Paths
> Files that need inspection or modification

**Example:**
- `supabase/functions/generate-plan/index.ts`
- `src/hooks/useMealPlan.js`
- `src/components/SwapModal.jsx`

---

## Constraints
> What to avoid or prioritize

- [ ] Do NOT refactor unrelated files
- [ ] Do NOT change existing API contracts unless required
- [ ] Prefer minimal diffs
- [ ] Preserve existing behavior for non-affected paths

---

## Required Guardrails
> Safety checks before proceeding

- [ ] Verify files exist on disk (not just assume)
- [ ] Verify the issue exists before fixing
- [ ] Run validation after changes
- [ ] Report blockers immediately

---

## Validation Steps
> How to verify the fix works

1. [ ] Run: `command to validate`
2. [ ] Check: `expected result`
3. [ ] Test: `smoke test if applicable`

---

## Required Report Format

```markdown
## Task: [Name]

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

### Deploy Results (if applicable)
- [check]: SUCCESS/FAIL

### Blockers
- [none or list]

### Final Status
PASS / FAIL
```

---

## Completion Standard

**NOT complete until:**
- [ ] Files verified from disk
- [ ] Fix validated with test command
- [ ] Deployment verified (if applicable)
- [ ] Smoke tests passed (if applicable)
- [ ] Final report delivered with PASS/FAIL

---

## Instructions for Claude Code (Execution Worker)

1. **Read the files** — verify they exist, read their current state
2. **Understand the issue** — do not assume prior fixes worked
3. **Make minimal changes** — only what's needed
4. **Validate** — run commands to verify the fix
5. **Report** — follow the required report format exactly