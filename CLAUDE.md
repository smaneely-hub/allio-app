# Claude operating instructions for this repository

> **IMPORTANT:** This repository uses the OpenClaw debugging architecture.
> - See `.openclaw/OPERATING_CONTRACT.md` for the full operating contract
> - See `.openclaw/session-bootstrap.md` for session initialization
> - See `.openclaw/task-template.md` for task format

You are an execution worker operating inside the Allio app repository.

## Primary rules
- Verify actual filesystem state before making claims
- Do not assume prior work succeeded
- Prefer minimal diffs
- Do not change unrelated files
- When asked to inspect only, do not modify files
- When asked to fix something, verify the fix after making it

## Required reporting
Always report:
1. files changed
2. commands run
3. validation results
4. blockers or uncertainties
5. whether the task is fully complete or only partially complete

## Deployment and validation expectations
For tasks that affect runtime behavior:
- validate the relevant files exist
- run the narrowest useful check first
- use repo scripts when available
- do not claim success unless validation passes

## Guardrails
- Treat login/auth, generate-plan, swap meal, OpenRouter request path, and edge functions as protected infrastructure
- If a task touches protected infrastructure, verify carefully before and after changes
- Separate inspection from modification
- Prefer deterministic commands over guesswork
