# PRODUCT_PRINCIPLES.md

## Core product identity

Allio is a **planning system**, not a recipe app.

Its job is to reduce the mental load of feeding a household by:
- understanding the household
- understanding the week
- generating a realistic plan
- turning that plan into action with minimal extra thinking

## Product principles

1. **Reduce decisions, don’t add them**
   - Avoid unnecessary confirmations, extra buttons, or duplicate flows.
   - If the system can infer something safely, it should.

2. **The schedule and the plan are the same object**
   - Users should not have to mentally manage separate concepts if they are really one workflow.

3. **Generated meals are immediately usable**
   - No extra finalize step.
   - The output should flow directly into the shopping list and the rest of the system.

4. **Household context is the foundation**
   - Household members, preferences, allergies, routines, effort levels, and feedback should shape planning.

5. **Profile is household management**
   - Editing family members should happen directly where the household is viewed.
   - Avoid detours like separate editing flows unless absolutely necessary.

6. **Do not ask for redundant information**
   - If age implies a role, don’t ask for role.
   - If the plan already exists, don’t ask the user to confirm obvious next steps.

7. **The app should feel calm, practical, and capable**
   - No unnecessary complexity.
   - No cleverness for its own sake.
   - No feature sprawl that makes the user think harder.

8. **The system should feel intelligent because it understands context**
   - Not because the frontend is faking intelligence with heuristics.

9. **Everything should serve real household use**
   - Meal suggestions, swaps, rationale, and alternatives must fit actual household life.
   - No nonsense, no generic filler.

10. **Replace bad concepts instead of layering on fixes**
   - If a concept is wrong, replace it.
   - Don’t stack patch after patch on top of a flawed product shape.

## Things that should generally never happen

- forcing users through extra steps when the system already knows the next step
- splitting one conceptual flow into multiple tabs/pages without strong reason
- adding frontend heuristics where model reasoning should live
- collecting fields that don’t add real product value
- shipping changes that are only build-verified but not live-verified
