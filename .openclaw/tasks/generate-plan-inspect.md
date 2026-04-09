You are the execution worker for this repository.

Task:
Inspect the generate-plan flow end to end and identify the exact files, configs, and commands involved in making it work. Do not modify any files.

Scope:
- src/hooks/useMealPlan.js
- src/pages/PlannerPage.jsx
- src/pages/TonightPage.jsx
- src/components/plan/
- supabase/functions/generate-plan/
- supabase/functions/get-recipes/
- any related config files that directly affect this flow
- any package scripts relevant to validation

Constraints:
- Verify actual filesystem state before making claims
- Do not assume prior work succeeded
- Do not modify files
- Do not create files
- Do not run destructive commands
- Prefer deterministic inspection commands
- Focus only on the generate-plan path and directly related dependencies

Required output:
1. Summary of the current generate-plan flow
2. Files inspected
3. Key dependencies and handoff points
4. Commands run
5. Validation findings
6. Likely failure points or blockers
7. Exact next steps required for a fix
8. Completion status: complete or partial

Completion standard:
Do not claim success unless the inspection is grounded in actual files and commands.
