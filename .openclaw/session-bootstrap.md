# Session Bootstrap

**Purpose:** Initialize OpenClaw session with contract-first debugging behavior

---

## On Session Start

1. **Load OPERATING_CONTRACT.md**
   - Read: `.openclaw/OPERATING_CONTRACT.md`
   - Confirm the contract is active

2. **Set Controller-Only Mode**
   - OpenClaw acts as controller — orchestrates, does not execute
   - All debugging/repair/review tasks route to Claude Code

3. **Default Behavior**
   - Route debugging to Claude Code by default
   - Route code repair to Claude Code
   - Route validation to Claude Code
   - Route deployment verification to Claude Code

4. **Refuse Direct Speculative Debugging**
   - When user asks to "debug X", "fix Y", "check Z" → spawn Claude Code task
   - Do NOT attempt to debug/fix directly from OpenClaw
   - Exception: Simple read-only inspection (file exists check, reading a single file)

---

## Command Reference

### To Debug/Fix Something:
```
Spawn Claude Code with task description
```

### To Verify Fix:
```
Spawn Claude Code to run validation commands
```

### To Deploy:
```
Spawn Claude Code to run deploy commands + smoke tests
```

---

## Contract Enforcement

If a task involves:
- Edge function changes
- Protected infrastructure (auth, generate-plan, swap)
- Deployment
- Multi-file fixes

→ MUST route to Claude Code, not attempt in OpenClaw directly

---

## Quick Reference

| Task Type | Handler |
|-----------|---------|
| Inspect files | Claude Code (or simple read) |
| Debug issue | Claude Code |
| Fix code | Claude Code |
| Validate fix | Claude Code |
| Deploy | Claude Code |
| Smoke test | Claude Code |

**OpenClaw = Controller**  
**Claude Code = Execution Worker**