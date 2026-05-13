# Calorie & Macro Tracking Spec

## Goal
Ship a nutrition logging system that feels automatic, trustworthy, and tightly integrated with the planner. The killer feature is auto-logging cooked meals from the planner without making the user re-enter data.

## Product Principles
- Auto-log first, manual entry second.
- Daily totals must be fast to query.
- Historical logs must be stable even if recipe nutrition changes later.
- Going over target is informative, never blocking.
- Planner-driven logs must be idempotent, so repeat taps cannot double-count.

## Core Data Model

### daily_nutrition_logs
One aggregate row per user per day.

Fields:
- `id`
- `user_id`
- `log_date` (date)
- `total_calories`
- `total_protein_g`
- `total_carbs_g`
- `total_fat_g`
- `created_at`
- `updated_at`

Constraints:
- unique `(user_id, log_date)`

Purpose:
- fast dashboard reads
- weekly chart source
- daily progress computation

### meal_nutrition_logs
One row per logged meal or snack.

Fields:
- `id`
- `user_id`
- `daily_log_id`
- `log_date`
- `meal_slot` (`breakfast`, `lunch`, `dinner`, `snack`, `other`)
- `entry_name`
- `source_type` (`planner`, `manual`)
- `meal_instance_id` (nullable, planner-linked)
- `recipe_id` (nullable)
- `recipe_name` (nullable)
- `servings`
- `calories`
- `protein_g`
- `carbs_g`
- `fat_g`
- `nutrition_source` (`recipe`, `manual`, `estimated`)
- `notes` (nullable)
- `logged_at`
- `created_at`
- `updated_at`

Constraints:
- unique partial index on planner auto-log identity, recommended on `(meal_instance_id)` where `meal_instance_id is not null`

Purpose:
- meal list UI
- editing/deleting entries
- immutable nutrition snapshot at log time

## Integration Decisions

### Demographics / Nutrition Profile
Use the existing nutrition profile / demographics target system immediately.
The dashboard should compare daily totals against:
- calories target
- protein target
- carbs target
- fat target

### Planner Integration
When a meal is marked cooked:
1. find the meal instance
2. compute nutrition snapshot for the cooked meal
3. insert or upsert `meal_nutrition_logs`
4. recompute that day’s aggregate row in `daily_nutrition_logs`
5. show toast like `450 cal added`

This must be idempotent.
If the user taps cooked twice, we should not duplicate the entry.

### Missing Nutrition
If a recipe has no usable nutrition:
- do not silently fail
- mark the meal as needing estimate/manual confirmation
- prompt with `Estimate this meal?`

## User Flows

### Auto-log from planner
- user taps `Cook` / `Mark cooked`
- system writes nutrition log automatically
- planner meal becomes source of truth for that meal entry

### Manual Add
- user taps `+` from nutrition dashboard
- choose date (default today)
- search recipe if available, otherwise manual input
- save to meal log and recompute day totals

### Edit/Delete
- user can edit nutrition amounts or delete entry
- system recomputes daily aggregate after every change

### Past Dates
- all manual logs support backdating
- dashboard can query arbitrary dates, not just today

## Dashboard UI

### Today
- calorie progress: `1,450 / 2,200 kcal`
- macro progress bars for protein/carbs/fat
- meal list grouped by breakfast/lunch/dinner/snacks

### Weekly
- Mon-Sun bar chart from `daily_nutrition_logs`
- compare actual calories against target if target exists

## Edge Cases
- cooked planner meal with missing nutrition
- deleting a planner-linked nutrition entry
- editing a planner-linked nutrition entry after auto-log
- backdated entries
- over-target days
- duplicate cooked taps
- recipe nutrition changing after log creation

## Recommended Implementation Order
1. database tables, indexes, RLS, helper RPC or recompute strategy
2. demographics target integration in reads
3. auto-log from cooked planner meals
4. nutrition dashboard UI
5. manual add flow
6. weekly view
7. estimate-missing-nutrition UX

## Technical Recommendation
Store nutrition snapshots directly on `meal_nutrition_logs` even when the source is a recipe. Do not derive historical nutrition from live recipe rows at render time.

## Phase 1 Scope
For the first shipped slice:
- create `daily_nutrition_logs`
- create `meal_nutrition_logs`
- add RLS
- add idempotent planner auto-log path
- add aggregate recompute helper
- no full dashboard yet unless trivial
