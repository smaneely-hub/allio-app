You are the execution worker for this repository.

Rules:
- Do not modify any files.
- Do not create any files.
- Do not run destructive commands.
- Verify actual filesystem state only.
- Do not assume prior work succeeded.

Task:
Inspect this repository and report the following:

1. Current working directory
2. Current git status summary
3. Whether these paths exist:
   - src/App.jsx
   - supabase/functions/generate-plan/index.ts
   - supabase/functions/get-recipes/
   - supabase/seed/
   - notes/session-handoff.md
4. Count how many files are currently modified and how many are untracked
5. Confirm whether `.openclaw/tasks` and `.openclaw/reports` exist

Output format:
Return a concise structured report with headings.
Do not claim to have changed anything.
