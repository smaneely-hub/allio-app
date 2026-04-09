# Recipe Intelligence Layer - Implementation Notes

## Overview
This document describes the intelligence layer added to the Allio recipe system to support strong retrieval, ranking, and personalization without relying on embeddings or heavy LLM usage.

## Schema Changes

### New Columns Added to `recipes` Table
```sql
-- Rationale template for rule-based generation
rationale_template TEXT

-- Normalized ingredient mapping for substitution
normalized_ingredients_json JSONB DEFAULT '[]'::jsonb

-- Similar recipe IDs (manual links, not embeddings)
similar_recipe_ids UUID[] DEFAULT '{}'

-- Core protein/main ingredient for filtering
core_ingredient TEXT

-- Flavor profile tags
flavor_profile_json JSONB DEFAULT '[]'::jsonb

-- Time category (computed)
time_category TEXT
```

### New Database Objects
1. **rank_recipes_for_household()** - SQL function for scoring recipes
2. **generate_rationale_template()** - SQL function for rule-based rationale
3. **recipe_categories_summary** - View for analytics

## Tagging System

### Controlled Vocabulary

**Cooking Style Tags:**
- `one_pan`, `sheet_pan`, `slow_cooker`, `instant_pot`, `baked`, `grilled`, `stovetop`, `air_fried`, `roasted`, `braised`, `stir_fried`, `poached`

**Time Profile Tags:**
- `under_20`, `under_30`, `under_45`, `under_60`, `long_cook`

**Family Profile Tags:**
- `kid_friendly`, `picky_eater`, `crowd_pleaser`, `date_night`, `solo_dinner`

**Nutrition Profile Tags:**
- `high_protein`, `low_carb`, `comfort_food`, `light`, `vegetarian`, `vegan`, `gluten_free`, `dairy_free`

**Reuse Profile Tags:**
- `good_leftovers`, `freezer_friendly`, `meal_prep`, `packable`

### Tag Assignment Logic
Tags are automatically normalized and augmented based on:
- Cuisine type
- Prep/cook times
- Difficulty level
- Dietary flags
- Recipe name patterns

## Scoring Logic

### kid_friendly_score (1-10)
Factors:
- Total time (faster = better)
- Difficulty (easy > medium > hard)
- Cuisine (less spicy/ethnic = better)
- Tags (comfort-food, family-friendly boost)
- Penalties for "adult" foods

### weeknight_score (1-10)
Factors:
- Total time (key factor)
- Difficulty
- Prep time
- Tags (quick, one-pan, meal-prep boost)
- Penalties for long cooking

### leftovers_score (1-10)
Factors:
- Cuisine type (Italian/Mexican/Chinese reheat well)
- Tags (stew, curry, casserole boost)
- Tags (fried, grilled penalize)
- Difficulty (easy > hard)

## Ranking Approach

### get-recipes Function Algorithm
1. **Filter Phase:**
   - meal_type match
   - Time constraint (based on effort_level)
   - Cuisine preference (from suggestion)
   - Dietary restrictions (vegetarian, etc.)
   - Allergen exclusions

2. **Score Phase:**
   - Time match: +20 points
   - Kid-friendly: +2 × score (if kids in household)
   - Weeknight: +2 × score
   - Leftovers: +1 × score

3. **Enrichment Phase:**
   - Calculate/normalize scores
   - Generate rationales
   - Find similar recipes
   - Add structured tags

## Substitution Rules

### Categories (67 total rules)

**Dairy-Free Swaps (21 rules):**
- milk → oat/almond/coconut/cashew milk
- butter → olive oil/coconut oil/vegan butter
- cream → coconut cream/cashew cream
- cheese → nutritional yeast/vegan cheese
- etc.

**Gluten-Free Swaps (15 rules):**
- flour → almond/coconut/rice flour
- pasta → rice noodles/zucchini noodles
- bread → gluten-free bread
- soy sauce → coconut aminos/tamari
- etc.

**Vegetarian Swaps (18 rules):**
- beef → lentils/mushrooms/impossible meat
- chicken → tofu/chickpeas/seitan
- bacon → tempeh/coconut bacon
- etc.

**Vegan Swaps (14 rules):**
- egg → flax/chia/silken tofu/aquafaba
- honey → maple syrup/agave/date syrup
- gelatin → agar-agar
- etc.

**Kid-Friendly Simplifications (12 rules):**
- jalapeño → bell pepper
- spicy → mild alternatives
- unfamiliar vegetables → familiar ones

**Pantry Fallbacks (20 rules):**
- fresh herbs → dried herbs
- shallots → onions
- white wine → broth/vinegar
- specialty ingredients → common alternatives

## Similarity System (Lightweight)

### Approach
No embeddings needed. Uses rule-based matching:

1. **Cuisine match** (+5 points)
2. **Shared tags** (+2 per tag)
3. **Similar time** (±15 min = +3)
4. **Same difficulty** (+2)

Stores up to 5 similar recipe IDs per recipe.

## Rationale Generation (Non-LLM)

### Template Generation
Rule-based combining:
- Time statement
- Kid-friendly statement  
- Weeknight statement
- Leftovers statement
- Tag-based statements

### Example Outputs
- "Ready in under 20 minutes • Kid-approved • Minimal cleanup"
- "Quick 30-minute meal • Family-friendly • Great for leftovers"
- "Done in 45 minutes • Simple weeknight dinner • High protein"

## Files Modified

1. **supabase/migrations/20260402_recipe_intelligence_layer.sql**
   - Added 5 new columns to recipes
   - Added 67 substitution rules
   - Created rank_recipes_for_household() function
   - Created generate_rationale_template() function
   - Created recipe_categories_summary view

2. **supabase/functions/get-recipes/index.ts**
   - Complete rewrite with scoring logic
   - Tag normalization
   - Rationale generation
   - Similar recipe finding
   - Better filtering

## How This Improves the Product

1. **Faster Retrieval:** Deterministic filtering before any AI
2. **Better Ranking:** Scores based on real household constraints
3. **Consistent Quality:** All recipes have proper tags/scores/rationales
4. **Learnable:** Interaction tracking + preference aggregation
5. **Substitution Aware:** Database knows how to adapt recipes
6. **Fallback Ready:** Graceful degradation when no AI available

## Next Steps

1. **Run migrations** on Supabase
2. **Enrich existing seed data** with proper tags/scores/rationales
3. **Add user interaction hooks** to frontend
4. **Build preference aggregation** daily job
5. **Consider embeddings** for semantic similarity later
6. **A/B test** hybrid vs full AI generation

## Validation Checklist

- [ ] All recipes have valid JSON in JSONB fields
- [ ] No null required fields (title, slug, meal_type)
- [ ] All scores within 1-10 range
- [ ] Tags are from controlled vocabulary
- [ ] Substitutions have confidence scores
- [ ] Rationale templates are non-empty
- [ ] Similar IDs reference existing recipes