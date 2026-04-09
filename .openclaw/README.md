# OpenClaw Debug Architecture

This directory contains the operating contract and bootstrap files for debugging the Allio app.

---

## What is OPERATING_CONTRACT.md?

The master contract defining:
- OpenClaw as controller only
- Claude Code as the default execution worker
- Debug workflow (inspect → verify → repair → validate → deploy → smoke test)
- Protected infrastructure (auth, generate-plan, edge functions)
- Deployment rules
- Required report format

---

## What is session-bootstrap.md?

The bootstrap file that runs at session start:
- Loads OPERATING_CONTRACT.md
- Sets controller-only mode
- Routes debugging/repair tasks to Claude Code
- Refuses direct speculative debugging

---

## What is task-template.md?

A reusable template for debugging tasks. OpenClaw fills this in when spawning Claude Code:
- Objective
- Repo root
- Relevant files
- Constraints
- Guardrails
- Validation steps
- Required report format

---

## Quick Start

1. **New session starts**
2. **OpenClaw loads** `.openclaw/session-bootstrap.md`
3. **session-bootstrap.md loads** `.openclaw/OPERATING_CONTRACT.md`
4. **Contract is active** — all debugging routes to Claude Code

---

## Architecture Summary

| Component | Role |
|-----------|------|
| OpenClaw | Controller/Orchestrator |
| Claude Code | Execution Worker |
| Filesystem/Supabase/Vercel | Targets |

---

## Example Workflow

1. User reports: "Swap meal is broken"
2. OpenClaw spawns Claude Code with task filled from `task-template.md`
3. Claude Code:
   - Inspects files (verifies on disk)
   - Identifies issue
   - Makes minimal fix
   - Validates fix
   - Reports PASS/FAIL

---

## Files

```
.openclaw/
├── OPERATING_CONTRACT.md   # Master contract
├── session-bootstrap.md    # Session loader
├── task-template.md        # Task template
├── README.md               # This file
├── tasks/                  # Task queue (optional)
└── reports/                # Report output (optional)
```

---

## Protected Infrastructure

Changes to these require extra verification:
- `auth/login` flow
- `generate-plan` edge function
- Swap meal functionality
- Recipe retrieval
- OpenRouter request path
- All edge functions
- Deployment config

---

For details, see `OPERATING_CONTRACT.md`.