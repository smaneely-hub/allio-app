# Allio Single-Meal Roadmap

Last updated: 2026-04-10

## Product thesis

Win the 5pm moment for busy parents:

**What should I cook tonight, and what do I need to buy?**

Do not broaden into a generic family operating system yet. Match Mealime on simplicity and execution, borrow MealThinker's immediacy, and selectively defend against Ollie where it matters.

## Ranked priorities

### P0, must ship now

1. **Tonight speed and trust**
   - keep generation fast
   - reduce weird meals
   - preserve household-specific servings and restrictions
   - make swap and refine feel reliable

2. **Shopping list quality**
   - consistent categorization
   - cleaner grouping and sharing
   - stable item state
   - move toward aisle-like polish

3. **Cooking confidence**
   - clear steps
   - lightweight cooking mode
   - visible tips, cues, and mistakes

4. **Learning loop**
   - capture swaps, refinements, favorites, cooked, and ratings
   - use those signals later in planner prompts and ranking

### P1, next wave

5. **Pantry-aware generation**
   - "cook from what I have"
   - staples and expiring-item awareness

6. **Preference memory**
   - household/member taste memory
   - avoid repeats more intelligently
   - remember accepted swaps and disliked patterns

7. **Grocery handoff**
   - stronger export/share
   - eventual retailer/cart integrations

### P2, later moat

8. pantry scan / receipt capture
9. retailer imports / loyalty card ingestion
10. optional nutrition overlays where helpful

## Explicit non-goals for now

- deep macro tracking
- broad family-life management
- complex calendar-first weekly planning as the primary pitch
- image-heavy AI polish that reduces trust

## Current execution status

### Done
- shared shopping list categorization/parsing
- Tonight and planner shopping generation use the same shopping model
- real shopping list hook backed by Supabase
- improved shopping grouping and email formatting
- removed fake fallback meal images
- stronger Tonight signals for swap/refine/rating

### In progress
- improve Tonight cooking experience with a lightweight cooking mode

## Next implementation order

1. Ship lightweight cooking mode on Tonight
2. Add pantry-aware prompt input on Tonight
3. Feed historical interaction signals into generation prompts
4. Tighten shopping list into more aisle-like groups and edits
5. Add direct grocery handoff once the core loop feels trustworthy
