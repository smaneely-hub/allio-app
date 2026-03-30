# CURRENT_DECISIONS.md

## Product decisions already made

- Allio is a planning system, not a recipe app.
- The schedule and the plan should be treated as one flow.
- Generated meals should be immediately usable.
- There should be no unnecessary finalize step.
- Household/Profile should be the place where household management happens.
- Family members should be editable inline from Profile.
- Role should not be a user-facing field.
- Role can be inferred from age behind the scenes if needed.
- The app should avoid redundant fields and redundant user decisions.
- Meal intelligence should come from the prompt/model layer, not the frontend.
- Household context should strongly shape meal generation.
- Meal detail enhancements should be model-driven when possible.
- Email verification should not block beta user signup.
- The landing page should present Allio as a premium, trustworthy planning system for busy families.

## Working assumptions

- Frontend should prefer rendering model output over inventing fallback intelligence.
- Household context should become richer over time through preferences and feedback.
- The system should remain calm, practical, and non-pretentious.

## When changing product behavior

Check this file first before introducing:
- new tabs
- new steps
- new confirmation flows
- new profile fields
- new frontend-only intelligence
