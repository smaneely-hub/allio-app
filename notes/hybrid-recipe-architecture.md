# Hybrid Recipe Architecture - Implementation Notes

## Overview
Shifted Allio from "LLM invents all meals from scratch" to a hybrid architecture with:
- **Structured recipe library** in Supabase
- **Fast retrieval/filtering/ranking** for candidate selection
- **Light AI personalization** only when needed
- **Interaction tracking** for learning over time

## What Changed

### A. Database Schema (new tables)
- `recipes` - Canonical recipe library (25+ seed recipes)
- `recipe_variants` - Lightweight recipe modifications  
- `recipe_embeddings` - Vector embeddings for similarity search
- `user_recipe_interactions` - Learning/feedback capture
- `user_recipe_preferences_summary` - Denormalized user preferences
- `substitution_rules` - Ingredient substitution database

### B. Edge Functions
1. **get-recipes** - Retrieval-first recipe selection
   - Filters by meal_type, cuisine, dietary flags, time, etc.
   - Simple scoring/ranking algorithm
   - Returns candidates with fallback to AI

2. **generate-plan** - Updated with hybrid mode
   - Feature flag: `HYBRID_MODE=true` enables retrieval-first
   - Falls back to full AI if no recipes found
   - Uses light AI refinement for personalization

### C. Frontend
- `useRecipeInteraction.js` - Hook for tracking user behavior
- MealCard shows recipe-based metadata (cuisine, dietary flags)
- Swap flow integrates with retrieval

### D. Prompts Refactored
- Large prompts → small bounded prompts
- Focus on personalization, not generation
- Example: "Provide 2-3 sentence rationale" vs "Generate a meal plan"

## Schema Added

```sql
-- recipes table core fields
id, title, slug, description, cuisine, meal_type,
prep_time_minutes, cook_time_minutes, servings,
ingredients_json, instructions_json, nutrition_json,
dietary_flags_json, allergen_flags_json, tags_json,
kid_friendly_score, weeknight_score, leftovers_score,
cost_tier, difficulty, active, source_type

-- user_recipe_interactions
id, user_id, household_id, recipe_id, meal_plan_id,
interaction_type, interaction_value_json, created_at

-- Interaction types supported:
viewed, expanded, accepted, locked, swapped, rejected,
cooked, not_cooked, rated, ingredient_changed, favorited
```

## Retrieval/Ranking Logic

### Filtering (deterministic)
- meal_type match
- cuisine match (if specified)
- dietary flags inclusion
- allergen exclusion
- max prep/cook time

### Scoring (ranked)
- kid_friendly_score (boosted if household has kids)
- weeknight_score (boosted for quick meals)
- Previous acceptance boost (+20)
- Previous rejection penalty (-50)
- Effort level alignment

## Feature Flag
Set `HYBRID_MODE=true` in Supabase edge function environment to enable.

## Remaining Gaps

1. **Embeddings not yet wired** - recipe_embeddings table exists but no embedding generation yet
2. **User preferences not aggregated** - No daily job to update user_recipe_preferences_summary
3. **Swap flow partial** - Still uses AI fallback; could use retrieval-first more
4. **No "cooked" tracking** - Users need UI to mark meals as cooked
5. **No rating UI** - Interaction type exists but not exposed in UI

## How to Test

1. Run migration: `supabase db push` or run SQL in dashboard
2. Seed recipes: Run seed SQL
3. Enable hybrid mode: Set `HYBRID_MODE=true` env var
4. Generate a plan - should see retrieved recipes with `from_recipe_library: true`
5. Expand/swap meals - interactions should be recorded
6. Query: `select * from user_recipe_interactions` to verify

## Old AI-Only Path
Still exists when:
- `HYBRID_MODE` not set or false
- No recipes match criteria
- get-recipes function fails

## Recommended Next Moves (Priority Order)

1. **Wire up swap to retrieval** - Currently swap still goes to AI; make it retrieve-first
2. **Add "cooked" button** - Track when users actually cook a meal
3. **Aggregate preferences** - Daily job to build user preference summaries
4. **Add embeddings** - Use OpenAI embeddings for semantic similarity
5. **A/B test** - Compare hybrid vs AI-only metrics (acceptance rate, generation cost)

## Files Changed

- `supabase/migrations/20260401_hybrid_recipe_system.sql` - Schema
- `supabase/seed/recipes_seed.sql` - 25 seed recipes
- `supabase/functions/get-recipes/index.ts` - New retrieval function
- `supabase/functions/generate-plan/index.ts` - Hybrid mode integration
- `src/hooks/useRecipeInteraction.js` - New interaction tracking hook
- `notes/hybrid-recipe-architecture.md` - This file