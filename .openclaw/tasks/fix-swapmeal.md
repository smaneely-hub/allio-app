You are the execution worker for this repository.

Task:
Fix the swapMeal crash in TonightPage caused by the undefined variable `attendees`.

Scope:
- src/pages/TonightPage.jsx

Constraints:
- Verify actual filesystem state before making changes
- Do not assume prior fixes exist
- Make the minimal change required
- Do not modify unrelated files
- After fixing, verify the change

Required output:
1. Summary of fix
2. Files changed
3. Exact code change
4. Commands run
5. Validation results
6. Any remaining risks
7. Completion status

Completion standard:
- The undefined variable is removed
- Replacement uses the correct source of truth for attendee count
- No new errors introduced
- Fix verified against actual file contents
