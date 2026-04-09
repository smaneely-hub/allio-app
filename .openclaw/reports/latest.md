# Fix: Meal Swap Not Working

**Date:** 2026-04-05  
**File changed:** `supabase/functions/generate-plan/index.ts`

---

## Root Cause

When `replace_slot` was provided (swap flow), the edge function processed **all** schedule slots instead of just the one being replaced. This caused two compounding bugs:

1. **Hybrid mode**: `payload.replace_slot?.suggestion` was appended to every slot's catalog lookup string, applying the user's swap hint (e.g. "vegetarian") to ALL slot lookups, not just the target.

2. **Full plan regeneration**: The swap returned a full week of meals. The frontend `.find()` in `useMealPlan.js:431` looks for the replacement by matching `day` and `meal` — which works in theory, but the catalog would return a different meal for the target slot (without the suggestion applied correctly), or no match at all.

---

## Changes Made

### Change 1 — Narrow `payload.slots` to the single target slot

Inserted after payload validation (new lines 437–447):

**Before:** No filtering — all slots passed through regardless of whether `replace_slot` was set.

**After:**
```typescript
// Swap mode: restrict processing to only the single slot being replaced
if (payload.replace_slot) {
  const { day: swapDay, meal: swapMeal, suggestion: swapSuggestion } = payload.replace_slot
  const matchingSlot = payload.slots.find(
    (s: any) => s.day === swapDay && s.meal === swapMeal
  )
  payload.slots = matchingSlot
    ? [{ ...matchingSlot, suggestion: swapSuggestion }]
    : [{ day: swapDay, meal: swapMeal, suggestion: swapSuggestion }]
  console.log('[generate-plan] Swap mode: narrowed to single slot', swapDay, swapMeal, swapSuggestion || '(no suggestion)')
}
```

Only the target slot flows through hybrid lookup and LLM generation. The swap suggestion is attached to the slot itself.

### Change 2 — Hybrid loop: remove global `replace_slot.suggestion`

**Before:**
```typescript
const suggestion = [dietFocus, slotPref, slot.suggestion, payload.replace_slot?.suggestion].filter(Boolean).join(' ')
```

**After:**
```typescript
const suggestion = [dietFocus, slotPref, slot.suggestion].filter(Boolean).join(' ')
```

`slot.suggestion` now carries the swap hint for the target slot (set above). For normal plan generation, this field was always undefined so behavior is unchanged.

---

## How the Fix Works End-to-End

1. `swapMeal()` sends `payload` with all slots + `replace_slot: { day, meal, suggestion }`
2. Edge function detects `replace_slot`, mutates `payload.slots` to `[{ day, meal, suggestion, ...original slot }]`
3. Hybrid mode iterates — only 1 slot, catalog lookup uses the swap suggestion correctly
4. Returns exactly 1 meal
5. Frontend `.find(m => m.day === day && m.meal === meal)` on 1-item array — succeeds

---

## Verification Steps

1. **Manual swap test:** Generate a plan → swap a dinner → "Something vegetarian"
   - Verify `generate-plan` response has `plan.meals` with exactly 1 entry matching the slot
   - Verify the meal is vegetarian
   - Verify the rest of the plan is unchanged in the UI

2. **Edge function logs should show:**
   - `Swap mode: narrowed to single slot mon dinner vegetarian`
   - `Looking for: vegetarian` (once, not repeated per slot)
   - Either catalog hit or LLM call for 1 slot

3. **No-suggestion swap:** Swap without text → `(no suggestion)` in logs, returns one valid replacement

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-plan/index.ts` | +13 lines slot-narrowing block; removed `payload.replace_slot?.suggestion` from hybrid loop |

No frontend changes required — `useMealPlan.js` `.find()` logic was already correct.
