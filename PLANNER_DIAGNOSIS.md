# PLANNER_DIAGNOSIS.md

## Section 1: Planner route component

- **Route file:** `src/App.jsx`
- **Planner component file:** `src/pages/PlannerPage.jsx`
- **Route wiring:** `App.jsx` renders `<PlannerPage />` directly at `/planner` inside `ProtectedRoute` (`src/App.jsx:72-78`). This is the active route, not a dead duplicate.
- **Component export:** `export function PlannerPage()` in `src/pages/PlannerPage.jsx:33`.
- **Live bundle confirmation:** the deployed HTML currently points at `index-DYQVZnqC.js`.
- **Bundle evidence:** the built bundle in `dist/assets/index-DYQVZnqC.js` contains planner strings from this component tree, including `Weekly Plan | Allio`, `Add meal`, `Pick a recipe`, `Regenerate Day`, and `Meal-level tools`. That confirms the live planner bundle includes the current planner route/component family, not an older alternate planner implementation.
- **Conclusion:** `/planner` is rendered from `src/pages/PlannerPage.jsx`, via `src/App.jsx`, and the live bundle hash matches the current local build hash that contains these strings.

## Section 2: Clickables inventory

| UI element | File / approx line | Handler | Status |
|---|---|---|---|
| Start Fresh | `src/pages/PlannerPage.jsx:191` | `handleClearPlan` | **Works**. Deletes current `meal_plans` row via `clearMealPlan()`, clears local slot/shopping state. |
| Generate Plan | `src/pages/PlannerPage.jsx:192` | `handleGenerate` | **Partially works / blocked by data**. Handler is real. It refuses to run when `members.length === 0`, so missing member-management UI makes this effectively blocked. |
| Day / Week toggle | `src/components/plan/MealPlanWorkspace.jsx:205` | `onChangeViewMode(mode)` | **Works**. Updates `viewMode` state in `PlannerPage`. |
| Previous range arrow | `src/components/plan/MealPlanWorkspace.jsx:214` | `onPrev` | **Works**. Moves selected date backward by 1 day or 7 days. |
| Next range arrow | `src/components/plan/MealPlanWorkspace.jsx:221` | `onNext` | **Works**. Moves selected date forward by 1 day or 7 days. |
| Day header main row | `src/components/plan/MealPlanWorkspace.jsx:121` | `onToggle` | **Works**. Expands/collapses day section. |
| Day actions icon (3 dots) | `src/components/plan/MealPlanWorkspace.jsx:136` | `onOpenDayActions(day)` | **Works**. Opens `DayActionsMenu`. |
| Empty day `+ Add meal` | `src/components/plan/MealPlanWorkspace.jsx:87`, rendered from `:144` | `onOpenAddMeal(day, 'dinner')` | **Works** for opening `AddMealModal`. Downstream actions vary by item. |
| Meal card image button | `src/components/plan/MealCard.jsx:151` | `setShowDetail(true); onOpenMeal?.(meal)` | **Works enough to open detail modal**. Parent `handleOpenMeal` is a no-op, but local modal still opens because `setShowDetail(true)` is local. |
| Meal card text/title button | `src/components/plan/MealCard.jsx:154` | `setShowDetail(true); onOpenMeal?.(meal)` | **Works enough to open detail modal**. Same caveat as above. |
| Meal card actions icon | `src/components/plan/MealCard.jsx:158` | `onActionsClick?.(meal)` | **Works**. Opens planner action sheet through parent wrapper callback. |
| Non-cooking meal icon card | `src/components/plan/MealCard.jsx:127` | `setShowDetail(true); onOpenMeal?.(meal)` | **Works enough to open detail modal**. Parent callback remains a no-op. |
| Non-cooking meal text area | `src/components/plan/MealCard.jsx:130` | `setShowDetail(true); onOpenMeal?.(meal)` | **Works enough to open detail modal**. |
| Non-cooking meal actions icon | `src/components/plan/MealCard.jsx:134` | `onActionsClick?.(meal)` | **Works**. |
| Cooking mode Exit | `src/components/plan/MealCard.jsx:86` | `exitCooking` | **Works** locally. |
| Cooking mode Previous | `src/components/plan/MealCard.jsx:100` | `prevStep` | **Works** when enabled. |
| Cooking mode Next step | `src/components/plan/MealCard.jsx:101` | `nextStep` | **Works** when enabled. |
| Meal detail modal backdrop | `src/components/plan/MealDetailModal.jsx:96` | `onClose` | **Works**. |
| Meal detail modal close X | `src/components/plan/MealDetailModal.jsx:101` | `onClose` | **Works**. |
| Servings minus | `src/components/plan/MealDetailModal.jsx:115` | `setServings(current => Math.max(1, current - 1))` | **Works** locally only, no persistence. |
| Servings plus | `src/components/plan/MealDetailModal.jsx:119` | `setServings(current => Math.min(12, current + 1))` | **Works** locally only, no persistence. |
| Day actions: Regenerate Day | `src/components/planner/DayActionsMenu.tsx:40` | `onRegenerateDay(dayDate); onClose()` | **Broken / placeholder**. Parent handler only sets date and shows toast saying day-specific generation is not implemented (`PlannerPage.jsx:98-101`). |
| Day actions: Copy to… toggle | `src/components/planner/DayActionsMenu.tsx:43` | `setShowCopy(...)` | **Works** for expanding targets. |
| Day actions: Copy target date | `src/components/planner/DayActionsMenu.tsx:47` | `onCopyDay(dayDate, target); onClose()` | **Broken / placeholder**. Parent only toasts success, no copy logic (`PlannerPage.jsx:144`). |
| Day actions: Insert Blank Day | `src/components/planner/DayActionsMenu.tsx:56` | `setConfirmTarget('insert')` | **Works** to show confirm UI. |
| Day actions: Insert confirm | `src/components/planner/DayActionsMenu.tsx:59` | `onInsertDay(dayDate); onClose()` | **Mostly works**. Parent seeds blank slotState rows only; does not persist until later save/generate. |
| Day actions: Insert cancel | `src/components/planner/DayActionsMenu.tsx:60` | `setConfirmTarget(null)` | **Works**. |
| Day actions: Add note toggle | `src/components/planner/DayActionsMenu.tsx:66` | `setShowNote(...)` | **Works** to reveal textarea. |
| Day actions: Save note | `src/components/planner/DayActionsMenu.tsx:70` | `onAddNote(dayDate, note); onClose()` | **Broken / placeholder**. Parent only toasts and discards note (`PlannerPage.jsx:143`). |
| Day actions: Clear Day | `src/components/planner/DayActionsMenu.tsx:75` | `setConfirmTarget('clear')` | **Works** to show confirm UI. |
| Day actions: Clear confirm | `src/components/planner/DayActionsMenu.tsx:79` | `onClearDay(dayDate); onClose()` | **Partially works**. Parent clears local `slotState` attendees/active flags but does not remove meals from saved `mealPlan`. |
| Day actions: Clear cancel | `src/components/planner/DayActionsMenu.tsx:80` | `setConfirmTarget(null)` | **Works**. |
| Planner action sheet action buttons | `src/components/plan/PlannerActionSheet.jsx:17-20` | `action.onClick?.()` after `onClose()` | **Depends on action**. Sheet itself works. Individual actions below. |
| Planner action: Regenerate this meal | `src/pages/PlannerPage.jsx:229` | `handleMealAction('regenerate', meal)` | **Broken / placeholder**. Parent falls through to `toast('Coming soon')`. |
| Planner action: Replace… | `src/pages/PlannerPage.jsx:230` | `handleMealAction('replace', meal)` | **Works**. Opens `AddMealModal` with `existingMealId`. |
| Planner action: Remove | `src/pages/PlannerPage.jsx:231` | `handleMealAction('remove', meal)` | **Broken / placeholder**. Parent falls through to `toast('Coming soon')`. |
| Planner action sheet Cancel | `src/components/plan/PlannerActionSheet.jsx:28` | `onClose` | **Works**. |
| Add meal modal backdrop | `src/components/planner/AddMealModal.tsx:71` | `onClose` | **Works**. |
| Add meal modal Generate row | `src/components/planner/AddMealModal.tsx:86-90` | `onGenerate(); onClose()` | **Broken / placeholder**. Parent `onGenerate` calls `handleGenerateDay`, which only toasts that day generation is not implemented. |
| Add meal modal Catalog row | `src/components/planner/AddMealModal.tsx:91-92` | `setShowCatalog(true)` | **Works**. Opens catalog picker. |
| Add meal modal Import row | `src/components/planner/AddMealModal.tsx:93-95` | `await onSaveMeal({... meal_source: 'catalog', source_note: 'import_requested', title: 'Import' })` | **Handler exists but semantically wrong / likely broken flow**. It does not open an import UI, and saves a pseudo-catalog meal with no recipe id. |
| Add meal modal Eat Out row | `src/components/planner/AddMealModal.tsx:96-98` | `await onSaveMeal({... meal_source: source })` | **Handler exists**. Saves placeholder non-cooking meal with null place_name/source_note. |
| Add meal modal Takeout row | `src/components/planner/AddMealModal.tsx:96-98` | same | **Handler exists**. Same placeholder behavior. |
| Add meal modal Delivery row | `src/components/planner/AddMealModal.tsx:96-98` | same | **Handler exists**. Same placeholder behavior. |
| Catalog modal backdrop | `src/components/planner/CatalogPickerModal.tsx:64` | `onClose` | **Works**. |
| Catalog modal close X | `src/components/planner/CatalogPickerModal.tsx:68` | `onClose` | **Works**. |
| Catalog search input | `src/components/planner/CatalogPickerModal.tsx:77` | `setSearchInput` | **Works**. Debounced search updates query. |
| Catalog recipe row button | `src/components/planner/CatalogPickerModal.tsx:94` | `onPick(recipe)` | **Handler exists, but broken end-to-end for planner use**. It calls parent `onSaveMeal` with recipe metadata only; saved planner meal gets title/image/cuisine but no recipe body, ingredients, or instructions because `saveCustomMealSource` never hydrates full recipe data from `recipes` table. Result: click fires, but the selected catalog item is not meaningfully attached as a functional planner meal. |

## Section 3: Family member model + planner integration status

### Live Supabase table

- **Table:** `household_members`
- **Queried live columns:**
  - `id`
  - `household_id`
  - `user_id`
  - `label`
  - `age`
  - `role`
  - `gender`
  - `restrictions`
  - `preferences`
  - `sort_order`
  - `created_at`
  - `name`
  - `dietary_restrictions`
  - `food_preferences`
  - `health_considerations`
  - `cooking_comfort`

### Existing CRUD helpers in code

- **Read:** `useHousehold.loadHousehold()` loads household then `household_members` by `household_id` (`src/hooks/useHousehold.js:29-78`).
- **Create/update full list:** `useHousehold.saveMembers()` deletes all existing members for the household, inserts the new list, then reloads them (`src/hooks/useHousehold.js:156-277`).
- **Repair/bootstrap:** `useHousehold.repairMembers()` creates default members from `household.total_people` (`src/hooks/useHousehold.js:279+`).
- **No dedicated per-member edit/delete helper** beyond full-list replacement.

### Existing UI for family members

- **Present in onboarding only:** `src/pages/OnboardingPage.jsx`, step 2, includes member add/edit UI and calls `saveMembers()`.
- **No planner-page member management UI:** `src/pages/PlannerPage.jsx` has no button, drawer, inline editor, or link to add/edit members.
- **Stub component:** `src/components/onboarding/MemberEditor.jsx` is just `MemberEditor Stub` and is not wired into planner or household routes.
- **Household route is not a member editor:** `src/pages/HouseholdPage.jsx` re-exports `SettingsPage`, and `SettingsPage` only links to `/household`; it does not render a member editor.

### Whether planner reads family members today

Yes.

- `PlannerPage` reads `members` from `useHousehold()` (`src/pages/PlannerPage.jsx:35`).
- It converts them into `memberOptions` (`src/pages/PlannerPage.jsx:88`).
- `handleGenerate()` blocks if `members.length` is zero (`src/pages/PlannerPage.jsx:156`).
- `handleGenerate()` passes valid member ids into `saveSchedule()` (`src/pages/PlannerPage.jsx:166`).
- `useMealPlan.generateMealPlan()` separately queries live `household_members` and includes them in the planner function payload (`src/hooks/useMealPlan.js:174-214`).

### Integration status summary

- **Data model exists and is live.**
- **Planner depends on members.**
- **Planner gives no direct way to create or edit members.**
- Therefore issue #1 is real: meal generation is blocked when a household has zero members, and planner itself offers no remediation path.

## Section 4: Catalog model (table, favorites, categories)

### Live Supabase table

- **Table:** `recipes`
- **Queried live columns:**
  - `id`, `slug`, `title`, `description`, `cuisine`, `meal_type`
  - `prep_time_minutes`, `cook_time_minutes`, `servings`, `nutrition_json`
  - `ingredients_json`, `instructions_json`
  - `dietary_flags_json`, `allergen_flags_json`, `equipment_json`
  - `tags_json`, `tags_v2_json`
  - `kid_friendly_score`, `weeknight_score`, `leftovers_score`, `cost_tier`, `difficulty`
  - `active`, `source_type`, `source_name`, `source_url`, `source_domain`
  - `created_at`, `updated_at`, `yield_text`, `total_time_minutes`
  - `ingredient_groups_json`, `instruction_groups_json`, `tips_json`, `substitutions_json`
  - `source_note`, `image_prompt`, `user_id`, `image_url`
  - `is_favorite`, `rating`, `cooked_at`, `category`

### Existing favorites mechanism

There are **two different favorites systems** in the codebase:

1. **Recipes catalog favorite flag**
   - `recipes.is_favorite` column.
   - `toggleFavorite(recipeId, isFavorite)` updates that column (`src/hooks/useRecipeMutations.ts:29-32`).
   - `listUserRecipes()` can filter with `favoritesOnly` and sort by favorites (`src/hooks/useRecipeMutations.ts:59-91`).
   - `RecipeDetail` uses this mechanism (`src/components/RecipeDetail.jsx:119-133`).

2. **Tonight page saved favorites**
   - Uses separate `saved_meals` table, not `recipes.is_favorite` (`src/pages/TonightPage.jsx:620-690`).
   - This means planner/catalog favorites and tonight favorites are not unified.

### Live data state for favorites

- Active recipe count queried live: **62**
- `is_favorite = true`: **0**
- `is_favorite = false`: **62**
- `is_favorite = null`: **0**

So the favorites mechanism exists in schema and code, but live catalog data currently has no favorited recipes.

### Existing categories in the data

- `recipes.category` exists as an array column in code/schema assumptions.
- `updateCategories()` writes category arrays (`src/hooks/useRecipeMutations.ts:54-56`).
- `listUserRecipes()` supports category filter (`contains('category', [opts.category])`) (`src/hooks/useRecipeMutations.ts:77`).
- **Live distinct category values queried from active recipes: none.** The category arrays are effectively empty across the current live dataset.

### Why planner catalog shows all items with no category/favorites filter

- Planner catalog modal is `src/components/planner/CatalogPickerModal.tsx`.
- It calls `listUserRecipes({ search: search || undefined })` only (`src/components/planner/CatalogPickerModal.tsx:36-57`).
- It provides **no UI controls** for category or favorites.
- It does **not** pass `favoritesOnly`, `category`, or even `userId`.
- So planner catalog currently always loads the full active recipe set, filtered only by title search.

## Section 5: Add meal menu + catalog modal handler status

### File paths

- **Add meal menu/modal:** `src/components/planner/AddMealModal.tsx`
- **Catalog modal:** `src/components/planner/CatalogPickerModal.tsx`
- **Planner parent wiring:** `src/pages/PlannerPage.jsx`
- **Persistence path:** `src/hooks/useMealPlan.js` via `saveCustomMealSource()`

### Add meal modal items

| Item | File / line | Current handler state |
|---|---|---|
| Generate | `AddMealModal.tsx:86-90` | **Broken placeholder.** Calls parent `onGenerate`, which only shows a toast that day generation is not implemented. |
| Catalog | `AddMealModal.tsx:91-92` | **Works** to open `CatalogPickerModal`. |
| Import | `AddMealModal.tsx:93-95` | **Broken flow.** No import UI. Saves a fake catalog meal with `source_note: 'import_requested'` and no recipe id. |
| Eat Out | `AddMealModal.tsx:96-98` | **Technically works**, but only inserts a placeholder meal label, no place chooser or notes UI. |
| Takeout | `AddMealModal.tsx:96-98` | **Technically works**, same placeholder limitation. |
| Delivery | `AddMealModal.tsx:96-98` | **Technically works**, same placeholder limitation. |

### Catalog modal buttons

| Item | File / line | Current handler state |
|---|---|---|
| Close X | `CatalogPickerModal.tsx:68` | **Works**. |
| Search input | `CatalogPickerModal.tsx:77` | **Works**. |
| Recipe row click | `CatalogPickerModal.tsx:94` | **Broken end-to-end for planner use.** Click invokes handler, but planner persistence only stores shallow recipe metadata. It does not fetch the selected recipe body from `recipes`, so the resulting planner meal is not a real usable catalog meal with ingredients/instructions. |

### Root cause for “Catalog modal opens but item Add buttons don’t work”

There are no separate “Add” buttons anymore in the current source. The whole recipe row is the button.

However, the report still maps to a real planner defect:

- UI click target exists and fires.
- Parent `onPick` calls `onSaveMeal` (`AddMealModal.tsx:119-123`).
- `PlannerPage` then calls `saveCustomMealSource(input)` (`PlannerPage.jsx:244-249`).
- `saveCustomMealSource()` only persists title/image/cuisine and empty `ingredients`, `instructions`, `ingredientGroups`, and `instructionGroups` for catalog meals (`src/hooks/useMealPlan.js:138-169`).

So the recipe selection is not fully materialized into the planner. The row click is wired, but the selected recipe is not actually attached in a complete, functional way.

### Root cause for “Add meal menu opens but item clicks don’t work”

Mixed states:

- **Catalog row:** does work to open the next modal.
- **Generate row:** wired to an unimplemented placeholder.
- **Import row:** wired to the wrong persistence shape, no import experience.
- **Replace from meal actions:** does open add meal menu correctly.

So the menu itself is interactive, but several rows are placeholders or semantically incomplete.

## Section 6: Live bundle hash + any drift suspected

- **Live bundle hash from requested command:** `index-DYQVZnqC.js`
- **Current local HEAD:** `391ca62d`
- **Current HEAD subject:** `polish planner hover and focus states`

### Drift assessment

- The deployed bundle hash matches the local build artifact name from the most recent pushed build (`index-DYQVZnqC.js`).
- The bundle contains strings unique to the current planner implementation (`Weekly Plan | Allio`, `Pick a recipe`, `Meal-level tools`, etc.).
- **Conclusion:** for this planner route, I do **not** currently suspect stale-bundle drift.
- The recurring project pattern is real historically, but in this snapshot the planner route appears to be serving the current component family, not an older duplicate.

## Section 7: Recommended fix order with complexity estimate per issue (S / M / L)

1. **Add a real family-member management entry point from planner** — **M**
   - Fastest unblocker for generation.
   - Reuse onboarding step 2 or build a dedicated household/member editor route.

2. **Make Add Meal > Catalog persist full recipe data into meal plan** — **M**
   - Highest value planner bug after member unblock.
   - Requires hydrating selected recipe from `recipes` table and storing usable ingredient/instruction payload.

3. **Add category + favorites filter UI to planner catalog modal** — **M**
   - UI + query wiring are straightforward.
   - Live data currently has no categories and no favorites, so may also require seeding/backfilling metadata to be visibly useful.

4. **Implement or remove placeholder Add Meal options (Generate day, Import, Remove, Regenerate meal/day, Add note, Copy day)** — **L**
   - Several separate incomplete flows, not one bug.
   - Some should be hidden until real back-end behavior exists.

5. **Finish planner clickability polish where missing** — **S**
   - Hover/cursor/focus work was recently improved and is mostly present now.
   - Remaining work is small compared with functional bugs.
