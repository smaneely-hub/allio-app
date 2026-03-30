## Session Rollover
### Project
Allio

### What We Did
- Repositioned Allio as a planning system rather than a recipe app.
- Added project guardrail docs: product principles, architecture rules, current decisions, regression memory.
- Reworked household/profile editing so family members are editable inline from Profile.
- Removed role as a user-facing field; role is inferred from age behind the scenes.
- Tightened meal generation to use richer household/member context.
- Shifted meal-detail intelligence toward model-owned output (`why_this_works`, `variations`, `similar_options`, `confidence_signal`).
- Unified Schedule + Plan into one `/plan` planner surface.
- Removed finalize flow from the primary planning path.
- Hardened auth/session handling around stale Supabase refresh tokens.
- Removed hard dependency on missing `subscriptions` table in the frontend.
- Added swap fallback path through direct function endpoint.

### Decisions / Constraints
- Allio is a planning system, not a recipe app.
- Schedule and plan are one flow.
- Generated meals should be immediately usable.
- Shopping list should be available automatically after generation.
- Household management lives in Profile.
- Intelligence should live in prompt/model output, not frontend heuristics.
- Session rollover should be aggressive when idle or context gets large/multi-topic.

### Current State
- Production app live at `https://allio.life`.
- Unified planner route is `/plan`; `/schedule` redirects there.
- Current production JS seen in latest session: `index-DAwFDNhZ.js` then later `index-BXZ9Lf3I.js` / newer builds depending deploy.
- `generate-plan` edge function has been redeployed and now returns richer meal-intelligence fields.
- Heartbeat and memory files now contain the full session rollover protocol plus hard safety trigger.

### Open Issues
- Swap/generate reliability still needs real-world verification after auth/session fixes.
- Frontend/backend schema drift may still exist in scattered areas and should be audited further.
- PlannerPage is functional but likely needs another cleanup pass to fully remove old two-page assumptions.
- Premium/subscription system is currently degraded to free-tier default in frontend due missing backend tables.

### Next Step
- Verify current swap flow in production after the latest auth/session and fallback changes.
- Then do a schema/reference cleanup pass to eliminate remaining stale table references and old assumptions.
- After that, continue refining planner UX and shopping-list auto-sync from the unified planner surface.

### Critical Technical Details
- Supabase project ref: `rvgtmletsbycrbeycwus`
- Main edge function: `generate-plan`
- Key project docs:
  - `allio-app/PRODUCT_PRINCIPLES.md`
  - `allio-app/ARCHITECTURE_RULES.md`
  - `allio-app/CURRENT_DECISIONS.md`
  - `allio-app/REGRESSION_MEMORY.md`
- Session rollover operational logic:
  - `/home/claude/.openclaw/workspace/HEARTBEAT.md`
  - `/home/claude/.openclaw/workspace/memory/2026-03-30.md`

### Not Preserved
- Detailed conversational back-and-forth
- superseded brainstorming
- repeated explanations of architecture preferences
- long debugging trails that are recoverable from source/history
- temporary deployment noise and transient error spam already addressed or superseded
