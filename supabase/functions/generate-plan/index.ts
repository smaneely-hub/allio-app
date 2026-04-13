import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/*
DIAGNOSTIC FINDINGS
- This edge function exists and already handles CORS preflight via OPTIONS plus Access-Control-Allow-Headers including authorization and apikey.
- It was not the direct cause of the 401 seen in the app flow; the failing client path was the swap fallback request that omitted the Authorization bearer token.
- The function now validates the incoming Authorization header with supabase.auth.getUser() and returns 401 when the bearer token is missing or invalid, matching the authenticated client invocation path.
*/

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || ''
const LLM_MODEL = Deno.env.get('LLM_MODEL') || 'meta-llama/llama-3.1-70b-instruct'
const LLM_ENDPOINT = Deno.env.get('LLM_ENDPOINT') || 'https://openrouter.ai/api/v1/chat/completions'

// ─────────────────────────────────────────────
// SERVING EQUIVALENTS HELPERS (Phase 2)
// ─────────────────────────────────────────────
// Simple serving calculation - use member count, with weight adjustments if DOB available
function calculateServings(members: any[]): number {
  if (!members || members.length === 0) return 2
  
  let total = 0
  for (const m of members) {
    // If DOB provided, calculate weight, otherwise assume adult (1.0)
    let weight = 1.0
    if (m.date_of_birth) {
      try {
        // Simple year extraction - use string parsing
        const dobYear = parseInt(m.date_of_birth.substring(0, 4), 10)
        const currentYear = 2026  // hardcoded for edge function
        const age = currentYear - dobYear
        
        if (age <= 4) weight = 0.4
        else if (age <= 9) weight = 0.7  
        else if (age <= 12) weight = 0.85
        else if (age > 64) weight = 0.9
        // age 13-64 = 1.0 (adult weight)
      } catch(e) {
        weight = 1.0  // fallback
      }
    }
    total += weight
  }
  
  return Math.max(1, Math.round(total))
}
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// HYBRID MODE: Try recipe catalog first, then fall back to LLM
const HYBRID_MODE = true

// Meat proteins to exclude for vegetarian - comprehensive list
const MEAT_PROTEINS = ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage', 'ham', 'steak', 'ground beef', 'ground pork', 'veal', 'cod', 'salmon', 'shrimp', 'lobster', 'crab', 'scallop', 'fish', 'duck', 'mussel', 'tilapia', 'turkey']

// Get recipe from catalog
async function getRecipeFromCatalog(
  supabase: any,
  mealType: string,
  effortLevel: string,
  suggestion: string,
  members: any[],
  excludedMealName: string | null = null,
  recentMealNames: string[] = []
): Promise<{ recipe: any; dietApplied: string | null }> {
  const maxTime = effortLevel === 'low' ? 30 : effortLevel === 'medium' ? 45 : 60
  
  // Extract dietary preferences from suggestion and member data
  const suggestionLower = suggestion?.toLowerCase() || ''
  const memberDiets = members?.flatMap((m: any) => [
    m.diet?.toLowerCase() || '',
    ...(m.dietary_restrictions || []).map((d: string) => d.toLowerCase()),
    ...(m.health_considerations || []).map((h: string) => h.toLowerCase())
  ]) || []
  const allDietText = [suggestionLower, ...memberDiets].join(' ')
  
  // Determine diet focus - check for various diet types
  const isVegetarian = allDietText.includes('vegetarian') || allDietText.includes('vegan')
  const isLowCarb = allDietText.includes('low carb') || allDietText.includes('low-carb') || allDietText.includes('keto')
  const isGlutenFree = allDietText.includes('gluten free') || allDietText.includes('gluten-free') || allDietText.includes('gf ')
  const isDairyFree = allDietText.includes('dairy free') || allDietText.includes('dairy-free')
  
  // Determine which diet focus is being applied (for logging/return)
  let dietApplied: string | null = null
  if (isVegetarian) dietApplied = 'vegetarian'
  else if (isLowCarb) dietApplied = 'low-carb'
  else if (isGlutenFree) dietApplied = 'gluten-free'
  else if (isDairyFree) dietApplied = 'dairy-free'
  
  console.log('[generate-plan] Diet focus detected:', dietApplied, '| isVegetarian:', isVegetarian, '| isLowCarb:', isLowCarb)
  
  // Query recipes from catalog
  let query = supabase
    .from('recipes')
    .select('id, title, description, cuisine, meal_type, prep_time_minutes, cook_time_minutes, servings, ingredients_json, instructions_json, weeknight_score, kid_friendly_score, leftovers_score')
    .eq('meal_type', mealType)
    .eq('active', true)
    .neq('title', 'ilike', '%test%')
    .neq('title', 'ilike', '%placeholder%')
    .neq('title', 'ilike', '%tmp%')
    .neq('title', 'ilike', '%example%')
    .lte('cook_time_minutes', maxTime)
    .order('weeknight_score', { ascending: false })
    .limit(100)
  
  const { data: recipes, error } = await query
  
  if (error || !recipes || recipes.length === 0) {
    console.log('[generate-plan] No recipes from catalog:', error?.message)
    return { recipe: null, dietApplied }
  }
  
  // Filter to only recipes with actual data (JSON strings, not empty arrays)
  const recipesWithData = recipes.filter((r: any) => {
    const ing = r.ingredients_json
    const inst = r.instructions_json
    // Must have non-empty string data
    return typeof ing === 'string' && ing.length > 10 && typeof inst === 'string' && inst.length > 10
  })
  
  console.log('[generate-plan] Recipes from DB:', recipes.length, '| with data:', recipesWithData.length)
  
  if (recipesWithData.length === 0) {
    console.log('[generate-plan] ERROR: No valid recipes in catalog - cannot generate meal')
    return { recipe: null, dietApplied }
  }
  
  // Use only recipes with data
  let filtered = recipesWithData

  if (excludedMealName) {
    const excluded = excludedMealName.toLowerCase().trim()
    filtered = filtered.filter((r: any) => {
      const title = String(r.title || '').toLowerCase().trim()
      // Also exclude if title contains the excluded name (partial match)
      return !title.includes(excluded) && !excluded.includes(title)
    })
    console.log('[generate-plan] Excluding current meal:', excludedMealName, '| remaining:', filtered.length)
  }

  // Also filter out if we have a history of recent meal names
  if (recentMealNames.length > 0) {
    const beforeCount = filtered.length
    filtered = filtered.filter((r: any) => {
      const title = (r.title || '').toLowerCase()
      for (const recent of recentMealNames) {
        const rec = recent.toLowerCase()
        if (title.includes(rec) || rec.includes(title)) return false
      }
      return true
    })
    console.log('[generate-plan] Excluding recent meals:', beforeCount, '->', filtered.length)
  }
  
  // Filter for vegetarian/vegan - exclude meat proteins
  if (isVegetarian) {
    filtered = filtered.filter((r: any) => {
      const title = r.title.toLowerCase()
      const desc = (r.description || '').toLowerCase()
      const combined = title + ' ' + desc
      for (const meat of MEAT_PROTEINS) {
        if (combined.includes(meat)) return false
      }
      return true
    })
    console.log('[generate-plan] Vegetarian filter:', recipes.length, '->', filtered.length)
  }
  
  // For low-carb/keto, prefer recipes that are typically low-carb
  // Filter out high-carb recipes like pasta, bread, rice-based dishes
  if (isLowCarb && filtered.length > 0) {
    const highCarbKeywords = ['pasta', 'bread', 'rice', 'noodle', 'spaghetti', 'lasagna', 'mac and cheese', 'macaroni']
    filtered = filtered.filter((r: any) => {
      const title = r.title.toLowerCase()
      for (const carb of highCarbKeywords) {
        if (title.includes(carb)) return false
      }
      return true
    })
    console.log('[generate-plan] Low-carb filter:', recipes.length, '->', filtered.length)
  }
  
  // For gluten-free, filter out obvious gluten-containing recipes
  if (isGlutenFree && filtered.length > 0) {
    const glutenKeywords = ['pasta', 'bread', 'noodle', 'spaghetti', 'lasagna', 'couscous', 'seitan', 'ramen', 'udon']
    filtered = filtered.filter((r: any) => {
      const title = r.title.toLowerCase()
      for (const g of glutenKeywords) {
        if (title.includes(g)) return false
      }
      return true
    })
    console.log('[generate-plan] Gluten-free filter:', recipes.length, '->', filtered.length)
  }
  
  if (filtered.length === 0) {
    console.log('[generate-plan] No recipes after dietary filter, returning null to trigger LLM')
    return { recipe: null, dietApplied }
  }
  
  // Pick a recipe - use random selection with proper exclusion
  // If we have excluded meal names, filter them out first
  let candidates = filtered
  if (excludedMealName) {
    const excluded = excludedMealName.toLowerCase().trim()
    const beforeCount = candidates.length
    candidates = candidates.filter((r: any) => {
      const title = (r.title || '').toLowerCase().trim()
      // Also check by ID if we have recent IDs
      return title !== excluded
    })
    console.log('[generate-plan] After excluding "' + excludedMealName + '":', beforeCount, '->', candidates.length)
  }

  if (candidates.length === 0) {
    console.log('[generate-plan] No recipes after exclusion, returning null')
    return { recipe: null, dietApplied }
  }

  // Select a random recipe from candidates
  const selectionIndex = Math.floor(Math.random() * candidates.length)
  const recipe = candidates[selectionIndex]
  console.log('[generate-plan] Selected candidate index:', selectionIndex, 'of', candidates.length)

  // Use crypto random for true randomness
  // GUARDRAIL: Final check - reject recipes with empty data (belt and suspenders)
  if (!recipe.ingredients_json || !recipe.instructions_json || 
      recipe.ingredients_json === '' || recipe.instructions_json === '') {
    console.log('[generate-plan] REJECTED recipe due to empty data:', recipe.title, '| ingredients:', !!recipe.ingredients_json, '| instructions:', !!recipe.instructions_json)
    return { recipe: null, dietApplied }
  }
  
  // Parse ingredients and instructions from JSON
  let ingredients = []
  let instructions = []
  
  try {
    ingredients = typeof recipe.ingredients_json === 'string' ? JSON.parse(recipe.ingredients_json) : (recipe.ingredients_json || [])
    instructions = typeof recipe.instructions_json === 'string' ? JSON.parse(recipe.instructions_json) : (recipe.instructions_json || [])
  } catch (e) {
    console.log('[generate-plan] JSON parse error for recipe:', recipe.title, e.message)
  }
  
  // Ensure arrays
  if (!Array.isArray(ingredients)) ingredients = []
  if (!Array.isArray(instructions)) instructions = []
  
  console.log('[generate-plan] Selected recipe:', recipe.title, '| ingredients:', ingredients.length, '| instructions:', instructions.length)
  
  // Use the actual parsed ingredients and instructions from DB
  return {
    recipe: {
      name: recipe.title,
      description: recipe.description || '',
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      servings: (() => { try { return calculateServings(members) } catch(e) { console.log("[serving error]", e.message); return 2 } })() || recipe.servings || 4,
      ingredients: ingredients,
      instructions: instructions,
      cuisine: recipe.cuisine,
      recipe_id: recipe.id,
      from_recipe_library: true,
      weeknight_score: recipe.weeknight_score,
      kid_friendly_score: recipe.kid_friendly_score,
    },
    dietApplied
  }
}

// Build dynamic system prompt based on scheduled slots
function buildSystemPrompt(
  slots: Array<{ day: string; meal: string; is_leftover?: boolean; planning_notes?: string }>, 
  members: Array<{ 
    restrictions?: string; 
    preferences?: string;
    dietary_restrictions?: string[];
    food_preferences?: string[];
    health_considerations?: string[];
  }>, 
  household: { cooking_comfort?: string; staples_on_hand?: string },
  suggestion?: string,
  weekNotes?: string
) {
  const slotDescriptions = slots
    .filter((s) => s.meal !== 'prep_block' && s.meal !== 'prep')
    .map((s) => {
      const mealGuidance: Record<string, string> = {
        'breakfast': '(light morning meal like eggs, toast, cereal, yogurt, oatmeal, smoothie)',
        'lunch': '(midday meal like salad, sandwich, soup, wrap, leftovers)',
        'dinner': '(main evening meal like chicken, fish, pasta, stir-fry, tacos)',
      }
      const guidance = mealGuidance[s.meal.toLowerCase()] || ''
      const notes = s.planning_notes ? ` Notes: ${s.planning_notes}` : ''
      return `${s.day} ${s.meal} ${guidance}${notes}`
    })
    .join(', ')

  // Add week-level context if provided
  const weekContext = weekNotes ? `\n\nWEEK CONTEXT (IMPORTANT): ${weekNotes}\n` : ''
  
  const allDietary = members.flatMap(m => m.dietary_restrictions || []).filter(Boolean)
  const allFoodPrefs = members.flatMap(m => m.food_preferences || []).filter(Boolean)
  const allHealth = members.flatMap(m => m.health_considerations || []).filter(Boolean)
  const restrictions = members.map((m) => m.restrictions || m.preferences || '').filter(Boolean).join(', ')
  const householdContext = members.map((m, i) => {
    const parts = [
      m.name || m.label || `Member ${i + 1}`,
      m.age ? `age ${m.age}` : null,
      (m.dietary_restrictions || []).length ? `dietary: ${(m.dietary_restrictions || []).join(', ')}` : null,
      (m.food_preferences || []).length ? `preferences: ${(m.food_preferences || []).join(', ')}` : null,
      (m.health_considerations || []).length ? `health: ${(m.health_considerations || []).join(', ')}` : null,
      m.preferences ? `notes: ${m.preferences}` : null,
    ].filter(Boolean)
    return `- ${parts.join(' | ')}`
  }).join('\n')
  const staplesOnHand = household?.staples_on_hand || 'olive oil, salt, pepper, garlic, rice, pasta'
  
  const cookingComplexity: Record<string, string> = {
    'takeout or frozen': 'MAXIMUM 3 ingredients, 15 minutes or less, very simple: stir fries, quesadillas, pasta, sheet pan meals',
    'simple meals': 'Straightforward recipes under 30 minutes, basic techniques',
    'cook from scratch': 'Standard home cooking, moderate prep and cook times',
    'love cooking': 'Complex techniques, longer prep, impressive meals OK',
  }
  const complexity = household?.cooking_comfort ? cookingComplexity[household.cooking_comfort] || 'Standard home cooking' : 'Standard home cooking'
  
  let userWants = ''
  if (suggestion) {
    userWants = `IMPORTANT - User wants: ${suggestion}. Generate a meal matching this request. `
  }
  
  return `You are an experienced home cook and meal planner. You generate meal plans for real families who will actually cook and eat these meals this week.

${userWants}
Generate meals for these slots: ${slotDescriptions || 'none'}

HOUSEHOLD CONTEXT (use this to infer appropriate meals):
${householdContext || '- No member detail provided.'}

CRITICAL RULES FOR DIETARY RESTRICTIONS AND HEALTH:
${allDietary.length > 0 ? `- Dietary restrictions and allergies present across the household: ${[...new Set(allDietary)].join(', ')}. The generated meals must fully respect these constraints.` : '- No allergies or strict restrictions detected.'}
${allFoodPrefs.length > 0 ? `- Food preferences across the household: ${[...new Set(allFoodPrefs)].join(', ')}. Use these as positive signals for meal selection.` : ''}
${allHealth.length > 0 ? `- Health considerations across the household: ${[...new Set(allHealth)].join(', ')}. Let this shape the style of meals and ingredients.` : ''}
- Use the full member context above to infer what this household realistically eats. Do not treat these as isolated tags; treat them as a coherent family profile.

COOKING COMPLEXITY: ${complexity}
STAPLES ON HAND (do NOT include in shopping list): ${staplesOnHand}

RECIPE QUALITY RULES:
- Every recipe must feel editorially tested, like a strong Mealime, NYT Cooking, or modern food blog recipe. No generic AI filler, no vague mashups, no weak shortcuts that hurt texture.
- Instructions must be specific and actionable. Include exact temperatures (425°F, not just 'hot oven'), exact times ('sauté 4-5 minutes until golden', not 'cook until done'), exact quantities ('1.5 lbs chicken thighs' not 'chicken'), and pan or pot guidance when it matters.
- Instructions should be 5-8 steps for most meals. A simple pasta might be 4. A roast might be 8. Never fewer than 4.
- At least 2 instruction steps must include a concrete sensory cue or doneness cue, such as 'until onions are translucent', 'until the sauce coats the back of a spoon', or 'until chicken reaches 165°F'.
- Include small practical tips that a home cook would appreciate: 'Pat the chicken dry for better browning', 'Reserve 1/2 cup pasta water', 'Let rest 5 minutes before slicing'.
- Use realistic ingredient pairings and technique. Favor proven crowd-pleasers over novelty.

INGREDIENT RULES:
- List ONLY ingredients the person needs to BUY. Do NOT list: salt, pepper, olive oil, cooking spray, water, garlic powder, or other common pantry staples: ${staplesOnHand}
- Quantities must be in practical shopping units: '1 lb ground beef' not '453g ground beef'. '1 can (14 oz) diced tomatoes' not '14 oz tomatoes'. '1 bunch cilantro' not '0.25 cup cilantro'.
- Include the form factor when it matters: 'boneless skinless chicken thighs' not just 'chicken thighs'. '1 block extra-firm tofu' not just 'tofu'.
- Avoid weak ingredient names. Say 'English cucumber', 'low-sodium chicken broth', 'freshly grated Parmesan', 'shredded mozzarella', '90% lean ground beef' when useful.

MEAL VARIETY RULES:
- Never repeat a protein across consecutive days. If Monday is chicken, Tuesday should NOT be chicken.
- Vary cuisines across the week. Don't make 5 Italian meals. Mix it up: Italian, Mexican, Asian, American, Mediterranean.
- Match complexity to the effort level of the slot. 'Low effort' means 15-20 minutes max, minimal dishes, things like sheet pan meals, stir fries, quesadillas, pasta. 'Full effort' can be more involved.
- For households with picky eaters, lean toward recognizable meals: tacos, pasta, chicken tenders, rice bowls, quesadillas, pizza. Don't suggest 'Pan-Seared Duck Breast' for kids.

LEFTOVER RULES:
- When a slot is marked is_leftover=true, do NOT generate a new recipe. Reference the source meal by name: 'Leftover Sheet Pan Chicken from Monday'. Set ingredients to an empty array and instructions to ['Reheat leftovers from Monday dinner.']
- When planning intentional leftovers, mention it in the notes: 'Making extra — enough for Wednesday lunch.'

NOTES FIELD:
- Every meal MUST have a 'notes' field with 1-2 sentences explaining why this meal was chosen. Reference the household context: who's eating, schedule constraints, dietary needs, ingredient reuse.

MEAL INTELLIGENCE FIELDS:
- meal_type: breakfast | lunch | dinner | snack
- format: bowl | plated | handheld | salad | soup | breakfast plate | other
- protein_type: chicken | beef | fish | pork | eggs | tofu | beans | mixed | none
- flexibility_level: high | medium | low
- reason: warm, practical subtitle, 15 words max. Examples: 'Quick one-pot pasta, ready in 25 minutes', 'Uses chicken you may already have', 'Kid-tested comfort food'. Never robotic.
- why_this_works: 1 practical sentence tied to day, prep time, meal type, and household context
- variations: array of 0-5 realistic modifications that still fit the same meal use case and format
- similar_options: array of 0-3 alternate meals that fit the same meal type and same real-world use case
- confidence_signal: short practical signal like 'Popular with families' or 'Great for busy weeknights'
- If variations or similar_options are weak, return an empty array.

OUTPUT FORMAT — each meal object must have exactly these fields:
{
  day: 'mon',
  meal: 'dinner',
  name: 'Sheet Pan Lemon Herb Chicken Thighs',
  meal_type: 'dinner',
  format: 'plated',
  protein_type: 'chicken',
  flexibility_level: 'medium',
  servings: 4,
  attendees: ['A1', 'A2', 'K1', 'K2'],
  prep_time_minutes: 15,
  cook_time_minutes: 25,
  effort: 'medium',
  is_leftover: false,
  leftover_source: null,
  ingredients: [
    { item: 'boneless skinless chicken thighs', quantity: 2, unit: 'lb', category: 'protein' },
    { item: 'broccoli crowns', quantity: 1, unit: 'lb', category: 'produce' },
    { item: 'lemon', quantity: 2, unit: 'piece', category: 'produce' }
  ],
  instructions: [
    'Preheat oven to 425°F. Line a sheet pan with foil.',
    'Pat chicken thighs dry. Season with salt, pepper, and dried oregano.',
    'Cut broccoli into bite-sized florets. Slice lemons into rounds.',
    'Arrange chicken, broccoli, and lemon slices on the pan. Drizzle with olive oil.',
    'Roast 22-25 minutes until chicken registers 165°F and broccoli is charred at the edges.',
    'Let rest 3 minutes. Squeeze roasted lemon over everything before serving.'
  ],
  notes: 'Full family tonight. Sheet pan = one dish to clean. Kids love broccoli when it is crispy.',
  reason: 'Quick sheet pan dinner, ready in 40 minutes',
  why_this_works: 'Quick dinner for a busy Monday that keeps prep low and uses familiar ingredients for the family.',
  variations: ['Swap broccoli for green beans', 'Add lemony yogurt sauce', 'Serve over rice instead of on its own'],
  similar_options: ['Sheet pan chicken fajitas', 'Chicken rice bowls', 'Lemon garlic chicken with potatoes'],
  confidence_signal: 'Great for busy weeknights'
}

${restrictions ? `Dietary restrictions to respect: ${restrictions}` : ''}`
}

const ACTION_VERB_PATTERN = /^(preheat|heat|bring|cook|bake|roast|saute|sauté|sear|stir|whisk|mix|combine|add|pour|season|pat|slice|chop|dice|mince|drain|rinse|toss|spread|arrange|place|boil|simmer|grill|broil|serve|garnish|top|transfer|reduce|marinate|wrap|reheat|toast|melt|brown|nestle|return|scrape|fold)\b/i
const NON_NUMERIC_QUANTITY_PATTERN = /\b(some|few|several|handful|pinch|dash|to taste|as needed)\b/i
const DONENESS_CUE_PATTERN = /(golden|golden-brown|translucent|fragrant|wilted|tender|tender-crisp|charred|crisp|crispy|thickens|thickened|coats|bubbling|flaky|flakes easily|165°f|160°f|fork-tender|softened|lightly browned)/i
const SPECIFIC_INGREDIENT_PATTERN = /(boneless|skinless|fresh|grated|shredded|low-sodium|whole milk|baby|roma|english|large|medium|small|extra-firm|lean|freshly)/i

function getSlotTimeExpectation(slot: Record<string, unknown> = {}) {
  const effort = String(slot.effort || slot.effort_level || 'medium').toLowerCase()
  if (effort === 'low') return 30
  if (effort === 'high' || effort === 'full') return 75
  return 50
}

function createShortReason(meal: Record<string, unknown>) {
  const existing = String(meal.reason || '').trim()
  if (existing) return existing.split(/[.!?]/)[0].trim().slice(0, 90)

  const totalTime = Number(meal.prep_time_minutes || 0) + Number(meal.cook_time_minutes || 0)
  const protein = String(meal.protein_type || '').trim().toLowerCase()
  if (totalTime > 0 && totalTime <= 30) return `Quick ${protein || 'family'} meal, ready in ${totalTime} minutes`
  if (protein && protein !== 'none' && protein !== 'mixed') return `Comforting ${protein} dinner that keeps tonight simple`
  return 'Practical pick for a busy night'
}

function scoreMealQuality(meal: Record<string, unknown>, slot: Record<string, unknown> = {}) {
  const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients : []
  const instructions = Array.isArray(meal.instructions) ? meal.instructions : []
  const servings = Number(meal.servings || 0)
  const totalTime = Number(meal.prep_time_minutes || 0) + Number(meal.cook_time_minutes || 0)
  const maxTime = getSlotTimeExpectation(slot)

  const ingredientCountOk = ingredients.length > 0
  const stepCountOk = instructions.length >= 3
  const servingsOk = servings > 0
  const timeOk = totalTime === 0 || totalTime <= maxTime
  const quantitiesNumeric = ingredients.every((ingredient) => {
    if (!ingredient || typeof ingredient !== 'object') return false
    const quantity = (ingredient as Record<string, unknown>).quantity
    if (typeof quantity === 'number') return Number.isFinite(quantity)
    if (typeof quantity === 'string') {
      const trimmed = quantity.trim()
      if (!trimmed || NON_NUMERIC_QUANTITY_PATTERN.test(trimmed)) return false
      return /^\d+(?:\.\d+)?(?:\s*\/\s*\d+)?$/.test(trimmed)
    }
    return false
  })
  const instructionsActionable = instructions.every((step) => typeof step === 'string' && ACTION_VERB_PATTERN.test(step.trim()))
  const donenessCueCount = instructions.filter((step) => typeof step === 'string' && DONENESS_CUE_PATTERN.test(step)).length
  const donenessCueOk = donenessCueCount >= Math.min(2, instructions.length)
  const ingredientSpecificityOk = ingredients.filter((ingredient) => {
    if (!ingredient || typeof ingredient !== 'object') return false
    const item = String((ingredient as Record<string, unknown>).item || (ingredient as Record<string, unknown>).name || '')
    return SPECIFIC_INGREDIENT_PATTERN.test(item)
  }).length >= Math.max(1, Math.floor(ingredients.length / 3))

  const checks = {
    ingredientCountOk,
    stepCountOk,
    servingsOk,
    timeOk,
    quantitiesNumeric,
    instructionsActionable,
    donenessCueOk,
    ingredientSpecificityOk,
  }

  const passed = Object.values(checks).filter(Boolean).length
  const qualityScore = Math.round((passed / Object.keys(checks).length) * 100)

  return { qualityScore, checks, valid: passed === Object.keys(checks).length }
}

function validatePlan(plan: unknown, scheduledSlots: Array<Record<string, unknown>> = []) {
  const normalized = transformLlmOutput(plan, scheduledSlots)
  const meals = normalized.meals || []
  const failures: string[] = []

  if (meals.length === 0) {
    failures.push('No meals returned')
    return { valid: false, meals, failures }
  }

  meals.forEach((meal) => {
    const slot = scheduledSlots.find((candidate) => candidate.day === meal.day && candidate.meal === meal.meal) || {}
    const assessment = scoreMealQuality(meal, slot)
    if (!assessment.valid) {
      const failedChecks = Object.entries(assessment.checks)
        .filter(([, value]) => !value)
        .map(([key]) => key)
        .join(', ')
      failures.push(`${String(meal.name || 'Meal')}: ${failedChecks}`)
    }
  })

  return { valid: failures.length === 0, meals, failures }
}

function ensureMealMetadata(meal: Record<string, unknown>, slot: Record<string, unknown> = {}) {
  const assessment = scoreMealQuality(meal, slot)
  return {
    ...meal,
    reason: createShortReason(meal),
    quality_score: assessment.qualityScore,
  }
}

function buildRetryPrompt(basePrompt: string, failures: string[]) {
  return `${basePrompt}\n\nRETRY INSTRUCTIONS:\nThe last attempt failed validation. Fix every issue below and return a complete corrected JSON response.\n- Missing ingredients are not allowed.\n- Every recipe needs at least 3 actionable instruction steps.\n- Keep total time within the slot expectation.\n- Servings count is required.\n- Every ingredient quantity must be numeric. Avoid words like some, handful, pinch, dash, or to taste.\n- Every instruction must start with an action verb.\n- Keep reason warm, practical, and under 15 words.\nValidation failures: ${failures.join(' | ')}`
}

// Transform LLM output to frontend format - simplified
function transformLlmOutput(llmOutput: unknown, scheduledSlots: Array<{ day: string; meal: string }> = []): { meals: Array<Record<string, unknown>> } {
  try {
    if (!llmOutput || typeof llmOutput !== 'object') {
      return { meals: [] }
    }

    const output = llmOutput as Record<string, unknown>

    // Handle flat meals array format: { meals: [...] } — this is what the LLM produces
    // when given the system prompt's per-object format with day/meal as flat fields.
    const flatList = output.meals || output.meal_plan || output.plan
    if (Array.isArray(flatList)) {
      const result = (flatList as Array<Record<string, unknown>>)
        .filter((m) => m.day && m.meal && m.name)
        .filter((m) => {
          if (scheduledSlots.length === 0) return true
          return scheduledSlots.some((s) => s.day === m.day && s.meal === m.meal)
        })
        .map((m) => ({ ...m, reason: String(m.reason || m.why_this_meal || m.why_this_works || '').trim(), difficulty: m.effort || m.difficulty || 'medium' }))
      return { meals: result }
    }

    // Look for meal_plan or plan or just use the object directly
    const source = output.meal_plan || output.plan || output

    if (typeof source !== 'object' || !source) {
      return { meals: [] }
    }

    const meals: Array<Record<string, unknown>> = []
    
    // Handle nested structure like { Monday: { breakfast: "...", lunch: "..." } }
    const dayMap: Record<string, string> = {
      'monday': 'mon', 'tuesday': 'tue', 'wednesday': 'wed',
      'thursday': 'thu', 'friday': 'fri', 'saturday': 'sat', 'sunday': 'sun'
    }
    const normalizeDay = (d: string) => dayMap[d.toLowerCase()] || d.slice(0, 3).toLowerCase()
    
    // Simple ingredient inference based on meal name
    const inferIngredients = (mealName: string) => {
      const n = mealName.toLowerCase()
      const ing = []
      if (n.includes('chicken')) ing.push({item: 'chicken', q: 1, u: 'lb', c: 'meat'})
      else if (n.includes('beef') || n.includes('steak') || n.includes('burger')) ing.push({item: 'beef', q: 1, u: 'lb', c: 'meat'})
      else if (n.includes('fish') || n.includes('salmon')) ing.push({item: 'fish', q: 0.5, u: 'lb', c: 'seafood'})
      else if (n.includes('tofu')) ing.push({item: 'extra-firm tofu', q: 1, u: 'block', c: 'protein'})
      else if (n.includes('bean') || n.includes('chickpea') || n.includes('lentil')) ing.push({item: 'beans', q: 2, u: 'can', c: 'pantry'})
      else if (n.includes('pasta')) ing.push({item: 'pasta', q: 1, u: 'box', c: 'pantry'})
      else if (n.includes('rice')) ing.push({item: 'rice', q: 2, u: 'cups', c: 'pantry'})
      else if (n.includes('egg')) ing.push({item: 'eggs', q: 1, u: 'dozen', c: 'dairy'})
      else if (n.includes('salad')) ing.push({item: 'lettuce', q: 1, u: 'head', c: 'produce'})
      else if (n.includes('sandwich') || n.includes('wrap')) ing.push({item: 'bread', q: 1, u: 'loaf', c: 'bakery'})
      // Always add staples
      ing.push({item: 'olive oil', q: 1, u: 'bottle', c: 'pantry'})
      ing.push({item: 'salt', q: 1, u: 'shaker', c: 'pantry'})
      return ing.map(x => ({item: x.item, quantity: x.q, unit: x.u, category: x.c}))
    }
    
    const entries = Object.entries(source as Record<string, unknown>)
    for (const [day, dayData] of entries) {
      if (dayData && typeof dayData === 'object') {
        for (const [mealType, mealValue] of Object.entries(dayData as Record<string, unknown>)) {
          // Handle both string meals and object meals with ingredients
          let mealName = ''
          let mealIngredients: Array<Record<string, unknown>> = []
          
          let mealObj: Record<string, unknown> = {}
          if (typeof mealValue === 'string') {
            mealName = mealValue
            mealIngredients = inferIngredients(mealName)
          } else if (typeof mealValue === 'object' && mealValue !== null) {
            mealObj = mealValue as Record<string, unknown>
            mealName = String(mealObj.name || '')
            mealIngredients = (mealObj.ingredients as Array<Record<string, unknown>>) || inferIngredients(mealName)
          }
          
          if (!mealName.trim()) continue
          
          const normalizedDay = normalizeDay(day)
          const normalizedMeal = mealType.toLowerCase().replace(' ', '_')
          
          // Filter: only include meals that were scheduled
          const isScheduled = scheduledSlots.some(
            (s) => s.day === normalizedDay && s.meal === normalizedMeal
          )
          if (scheduledSlots.length > 0 && !isScheduled) continue
          
          meals.push({
            day: normalizedDay,
            meal: normalizedMeal,
            name: mealName.trim(),
            meal_type: String(mealObj.meal_type || normalizedMeal),
            format: String(mealObj.format || 'other'),
            protein_type: String(mealObj.protein_type || 'mixed'),
            flexibility_level: String(mealObj.flexibility_level || 'medium'),
            servings: Number(mealObj.servings || 2),
            cook_time_minutes: Number(mealObj.cook_time_minutes || (20 + Math.floor(Math.random() * 25))),
            difficulty: mealObj.effort || mealObj.difficulty || 'medium',
            prep_time_minutes: Number(mealObj.prep_time_minutes || 30),
            ingredients: mealIngredients,
            instructions: (mealObj.instructions as Array<string>) || ['Preheat oven to 425°F.', 'Prepare all ingredients by washing and chopping.', 'Season protein with salt, pepper, and desired spices.', 'Heat oil in a large oven-safe skillet over medium-high heat.', 'Sear protein for 3-4 minutes per side.', 'Add vegetables to the pan.', 'Transfer to oven and roast for 15-20 minutes until done.', 'Let rest 5 minutes before serving.'],
            notes: String(mealObj.notes || ''),
            reason: String(mealObj.reason || mealObj.why_this_meal || mealObj.why_this_works || ''),
            why_this_works: String(mealObj.why_this_works || ''),
            variations: Array.isArray(mealObj.variations) ? mealObj.variations : [],
            similar_options: Array.isArray(mealObj.similar_options) ? mealObj.similar_options : [],
            confidence_signal: String(mealObj.confidence_signal || ''),
          })
        }
      }
    }
    
    return { meals }
  } catch (e) {
    console.error('[transform] Error:', e)
    return { meals: [] }
  }
}

async function callLlm(messages: Array<{ role: string; content: string }>) {
  const response = await fetch(LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages,
    }),
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.error?.message || 'LLM request failed')
  }

  return json
}

// Save an LLM-generated recipe to the database for future reuse
async function saveGeneratedRecipe(supabaseClient: any, meal: any, members: any[], dietApplied: string): Promise<string | null> {
  try {
    // Validate required fields
    const title = meal.name || meal.title
    if (!title) {
      console.log('[saveGenerated] Skipping - no title')
      return null
    }

    const ingredients = meal.ingredients || []
    const instructions = meal.instructions || []
    
    // Validate required data
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      console.log('[saveGenerated] Skipping - no ingredients')
      return null
    }
    if (!Array.isArray(instructions) || instructions.length === 0) {
      console.log('[saveGenerated] Skipping - no instructions')
      return null
    }

    // Determine dietary tags from members
    const dietaryRestrictions = members?.flatMap((m: any) => m.dietary_restrictions || []) || []
    const uniqueRestrictions = [...new Set(dietaryRestrictions)]
    
    // Calculate scores (default medium)
    const kidFriendlyScore = uniqueRestrictions.includes('child') ? 7 : 5
    const weeknightScore = (meal.prep_time_minutes || 20) + (meal.cook_time_minutes || 30) <= 45 ? 8 : 5

    // Build the recipe record - use existing schema columns
    const recipeRecord = {
      title: title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').slice(0, 60) + '-' + Date.now().toString(36),
      cuisine: meal.cuisine || 'American',
      meal_type: meal.meal || 'dinner',
      description: meal.description || `AI-generated recipe: ${title}`,
      ingredients_json: JSON.stringify(ingredients),
      instructions_json: JSON.stringify(instructions),
      prep_time_minutes: meal.prep_time_minutes || 15,
      cook_time_minutes: meal.cook_time_minutes || 30,
      servings: meal.servings || 4,
      difficulty: meal.difficulty || 'medium',
      tags_json: JSON.stringify(['ai-generated', ...uniqueRestrictions].filter(Boolean)),
      kid_friendly_score: kidFriendlyScore,
      weeknight_score: weeknightScore,
      source_type: 'ai_generated',
    }

    // Insert the recipe
    const { data, error } = await supabaseClient
      .from('recipes')
      .insert(recipeRecord)
      .select('id')
      .single()

    if (error) {
      console.log('[saveGenerated] Error saving recipe:', error.message)
      return null
    }

    console.log('[saveGenerated] Saved recipe:', data.id, '-', title)
    return data.id
  } catch (e) {
    console.log('[saveGenerated] Exception:', e.message)
    return null
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authorization = req.headers.get('authorization') || req.headers.get('Authorization')
    console.log('[generate-plan] authorization header present:', Boolean(authorization))

    const payload = await req.json()
    const publicMode = payload?.public_mode === true
    let user = null

    if (!publicMode) {
      if (!authorization) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      })

      const {
        data: { user: authUser },
        error: authError,
      } = await authClient.auth.getUser()

      if (authError || !authUser) {
        console.error('[generate-plan] auth.getUser failed:', authError?.message || 'no user')
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      user = authUser
    }
    if (!payload?.household || !Array.isArray(payload?.members) || !Array.isArray(payload?.slots)) {
      return new Response(JSON.stringify({ error: 'Payload must include household, members, and slots' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate slots have required fields
    for (let i = 0; i < payload.slots.length; i++) {
      const slot = payload.slots[i]
      if (!slot?.day || !slot?.meal) {
        return new Response(JSON.stringify({ error: `Slot ${i} missing day or meal` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      // Ensure attendees is always an array - default to user.id if not provided
      if (!Array.isArray(slot.attendees)) {
        slot.attendees = user?.id ? [user.id] : []
        console.log('[generate-plan] Slot missing attendees, defaulting to:', slot.attendees)
      }
    }

    // Swap mode: restrict processing to only the single slot being replaced
    if (payload.replace_slot) {
      const { day: swapDay, meal: swapMeal, suggestion: swapSuggestion } = payload.replace_slot
      const matchingSlot = payload.slots.find(
        (s: any) => s.day === swapDay && s.meal === swapMeal
      )
      // Ensure attendees is preserved in swap mode - default to user.id if not provided
      const fallbackAttendees = user?.id ? [user.id] : []
      payload.slots = matchingSlot
        ? [{ 
            ...matchingSlot, 
            suggestion: swapSuggestion,
            attendees: matchingSlot.attendees || fallbackAttendees
          }]
        : [{ 
            day: swapDay, 
            meal: swapMeal, 
            suggestion: swapSuggestion,
            attendees: fallbackAttendees
          }]
      console.log('[generate-plan] Swap mode: narrowed to single slot', swapDay, swapMeal, swapSuggestion || '(no suggestion)')
    }

    if (publicMode) {
      payload.slots = payload.slots.slice(0, 1)
      payload.members = Array.isArray(payload.members) ? payload.members.slice(0, 6) : []
      payload.recent_meal_names = Array.isArray(payload.recent_meal_names) ? payload.recent_meal_names.slice(0, 3) : []
    }

    // HYBRID MODE: Try catalog first for each slot
    if (HYBRID_MODE) {
      console.log('[generate-plan] HYBRID_MODE enabled, trying catalog first')

      const catalogMeals = []
      const remainingSlots = []
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      for (const slot of payload.slots) {
        if (slot.is_leftover) continue

        // Include household diet_focus and slot preferences
        const dietFocus = payload.household?.diet_focus || ''
        const slotPref = slot.preferences?.[0] || ''
        const suggestion = [dietFocus, slotPref, slot.suggestion].filter(Boolean).join(' ')

        console.log('[generate-plan] Looking for:', suggestion || 'any')

        const { recipe, dietApplied } = await getRecipeFromCatalog(
          supabaseClient,
          slot.meal || 'dinner',
          slot.effort || 'medium',
          suggestion,
          payload.members,
          payload.replace_slot?.current_meal_name || null,
          payload.recent_meal_names || []
        )

        if (recipe) {
          console.log('[generate-plan] Using catalog recipe:', recipe.name, '| dietApplied:', dietApplied, '| ingredients:', JSON.stringify(recipe.ingredients).slice(0, 100))
          
          // Build meaningful why_this_meal from actual inputs including demographics
          const householdSize = payload.household?.total_people || 2
          const effort = slot.effort || 'medium'
          const dietFocus = payload.household?.diet_focus || dietApplied || ''
          
          // Calculate demographics from members
          const members = payload.members || []
          const demographics = {
            totalCount: members.length,
            adultCount: members.filter((m: any) => m.role === 'adult' || !m.role || m.age >= 18).length,
            childCount: members.filter((m: any) => m.role === 'child' || (m.age && m.age < 18)).length,
            adultOnly: members.length > 0 && members.every((m: any) => m.role === 'adult' || !m.role || m.age >= 18),
            childIncluded: members.some((m: any) => m.role === 'child' || (m.age && m.age < 18)),
            teenIncluded: members.some((m: any) => m.age && m.age >= 13 && m.age < 18),
            teenCount: members.filter((m: any) => m.age && m.age >= 13 && m.age < 18).length,
          }
          
          let whyThis = ''
          let shortReason = ''
          
          // Demographic-aware explanation
          if (demographics.adultOnly) {
            if (demographics.totalCount === 1) {
              whyThis = `A ${recipe.weeknight_score > 7 ? 'quick' : 'balanced'} meal that works well for one adult — ${recipe.weeknight_score > 7 ? 'efficient to make' : 'flavorful and satisfying'}.`
            } else {
              whyThis = `This ${recipe.weeknight_score > 7 ? 'quick' : 'flavorful'} option suits ${demographics.adultCount} adult${demographics.adultCount > 1 ? 's' : ''} — more adventurous flavors and textures are fair game.`
            }
          } else if (demographics.childIncluded) {
            whyThis = `Family-friendly meal selected for ${demographics.totalCount} people including younger members. ${recipe.kid_friendly_score > 6 ? 'This recipe has strong kid appeal' : 'Balanced for mixed palates'} — familiar formats and broadly acceptable flavors.`
          } else if (demographics.teenIncluded) {
            whyThis = `Selected for a household with teens (${demographics.teenCount}) — hearty portions, bold flavors, and formats teens tend to enjoy.`
          } else {
            whyThis = `Matches your ${effort} effort level and ${householdSize} serving${householdSize > 1 ? 's' : ''}.`
          }
          
          if (dietFocus) whyThis += ` Aligned with your ${dietFocus} preference.`
          if (recipe.weeknight_score && recipe.weeknight_score > 7) whyThis += ' Quick enough for a weeknight.'

          if (demographics.childIncluded && recipe.kid_friendly_score > 6) shortReason = 'Kid-tested comfort food'
          else if (recipe.prep_time_minutes && recipe.cook_time_minutes) shortReason = `Ready in ${recipe.prep_time_minutes + recipe.cook_time_minutes} minutes`
          else if (dietFocus) shortReason = `Fits your ${dietFocus} plan`
          else shortReason = 'Practical pick for tonight'
          
          // Contextual tips based on demographics
          const tips = [
            recipe.prep_time_minutes && recipe.cook_time_minutes ? `Prep: ${recipe.prep_time_minutes}min + Cook: ${recipe.cook_time_minutes}min` : null,
            demographics.childIncluded && recipe.kid_friendly_score > 6 ? 'Great family pick — kids typically enjoy this one' : null,
            demographics.adultOnly && recipe.kid_friendly_score < 5 ? 'More nuanced flavors — good for adventurous eaters' : null,
            `Pairs well with ${recipe.cuisine} sides or salad`
          ].filter(Boolean)
          
          // Contextual swaps based on demographics
          const swaps = demographics.childIncluded
            ? ['Use milder seasoning if needed', 'Cut into smaller pieces for easier eating', 'Serve with a familiar side']
            : demographics.adultOnly
            ? ['Substitute different protein or vegetable', 'Add more complex aromatics', 'Finish with professional-style plating']
            : ['Swap protein for tofu or chickpeas', 'Use frozen veggies if fresh unavailable', 'Adjust seasoning to taste']
          
          catalogMeals.push({
            day: slot.day,
            meal: slot.meal || 'dinner',
            ...recipe,
            why_this_meal: whyThis,
            reason: shortReason,
            tips,
            easy_swaps: swaps,
            diet_applied: dietApplied,
          })
        } else {
          console.log('[generate-plan] No catalog recipe for slot', slot.day, slot.meal, '- queuing for LLM')
          // Add diet focus to the slot for LLM to use
          const slotWithDiet = dietApplied 
            ? { ...slot, suggestion: [slot.suggestion, dietApplied].filter(Boolean).join(' ') }
            : slot
          remainingSlots.push(slotWithDiet)
        }
      }

      if (remainingSlots.length === 0 && catalogMeals.length > 0) {
        // All slots matched catalog - return early
        console.log('[generate-plan] All', catalogMeals.length, 'meals from catalog')
        return new Response(JSON.stringify({
          plan: { meals: catalogMeals },
          debug: { hybrid_mode: true, source: 'catalog', meal_count: catalogMeals.length }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (remainingSlots.length > 0 && catalogMeals.length > 0) {
        // Partial match - call LLM for remaining slots and combine
        console.log('[generate-plan]', catalogMeals.length, 'from catalog,', remainingSlots.length, 'slots need LLM')
        const llmMessages = [
          { role: 'system', content: buildSystemPrompt(remainingSlots, payload.members, payload.household, payload.replace_slot?.suggestion, payload.week_notes) },
          { role: 'user', content: JSON.stringify({ ...payload, slots: remainingSlots }) },
        ]
        let llmJson = await callLlm(llmMessages)
        let parsedPlan = JSON.parse(llmJson.choices[0].message.content)
        let validation = validatePlan(parsedPlan, remainingSlots)

        if (!validation.valid) {
          console.warn('[generate-plan] Hybrid LLM validation failed, retrying once:', validation.failures)
          const retryMessages = [
            { role: 'system', content: buildRetryPrompt(buildSystemPrompt(remainingSlots, payload.members, payload.household, payload.replace_slot?.suggestion, payload.week_notes), validation.failures) },
            { role: 'user', content: JSON.stringify({ ...payload, slots: remainingSlots }) },
          ]
          llmJson = await callLlm(retryMessages)
          parsedPlan = JSON.parse(llmJson.choices[0].message.content)
          validation = validatePlan(parsedPlan, remainingSlots)
        }

        let llmTransformed
        if (validation.valid) {
          llmTransformed = {
            meals: validation.meals.map((meal) => {
              const slot = remainingSlots.find((candidate) => candidate.day === meal.day && candidate.meal === meal.meal) || {}
              return ensureMealMetadata(meal, slot)
            }),
          }
        } else {
          console.warn('[generate-plan] Hybrid LLM validation failed after retry, falling back to catalog where possible:', validation.failures)
          const fallbackMeals = []
          for (const slot of remainingSlots) {
            const { recipe, dietApplied: fallbackDiet } = await getRecipeFromCatalog(
              supabaseClient,
              String(slot.meal || 'dinner'),
              String(slot.effort || slot.effort_level || 'medium'),
              String(slot.suggestion || ''),
              payload.members,
              payload.replace_slot?.current_meal_name || null,
              payload.recent_meal_names || [],
            )
            if (recipe) {
              fallbackMeals.push(ensureMealMetadata({
                day: slot.day,
                meal: slot.meal || 'dinner',
                ...recipe,
                why_this_meal: `Fallback to a trusted library recipe for a more reliable ${slot.meal || 'meal'}.`,
                reason: createShortReason(recipe),
                diet_applied: fallbackDiet,
              }, slot))
            }
          }
          llmTransformed = { meals: fallbackMeals }
        }
        
        // Save LLM-generated recipes to database for future reuse
        if (!publicMode && llmTransformed.meals?.length > 0) {
          const dietFromSlot = remainingSlots[0]?.suggestion || dietApplied || ''
          for (const meal of llmTransformed.meals) {
            await saveGeneratedRecipe(supabaseClient, meal, payload.members, dietFromSlot)
          }
        }
        
        const allMeals = [...catalogMeals, ...(llmTransformed.meals || [])]
        console.log('[generate-plan] Returning', allMeals.length, 'meals (', catalogMeals.length, 'catalog +', llmTransformed.meals?.length || 0, 'LLM)')
        return new Response(JSON.stringify({
          plan: { meals: allMeals },
          debug: { hybrid_mode: true, source: 'mixed', catalog_count: catalogMeals.length, llm_count: llmTransformed.meals?.length || 0 }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // No catalog matches at all - fall through to LLM with all slots
      console.log('[generate-plan] No catalog meals, falling back to LLM for all slots')
    }

    const messages = [
      { role: 'system', content: buildSystemPrompt(payload.slots, payload.members, payload.household, payload.replace_slot?.suggestion, payload.week_notes) },
      { role: 'user', content: JSON.stringify(payload) },
    ]

    let llmJson = await callLlm(messages)
    console.log('[generate-plan] LLM raw response:', JSON.stringify(llmJson).slice(0, 300))
    let parsedPlan = JSON.parse(llmJson.choices[0].message.content)
    let validation = validatePlan(parsedPlan, payload.slots)

    if (!validation.valid) {
      console.warn('[generate-plan] LLM validation failed, retrying once:', validation.failures)
      const retryMessages = [
        { role: 'system', content: buildRetryPrompt(buildSystemPrompt(payload.slots, payload.members, payload.household, payload.replace_slot?.suggestion, payload.week_notes), validation.failures) },
        { role: 'user', content: JSON.stringify(payload) },
      ]
      llmJson = await callLlm(retryMessages)
      parsedPlan = JSON.parse(llmJson.choices[0].message.content)
      validation = validatePlan(parsedPlan, payload.slots)
    }

    // Transform LLM output to frontend format - filter to only scheduled slots
    let transformedPlan
    if (validation.valid) {
      console.log('[generate-plan] About to transform, scheduledSlots:', JSON.stringify(payload.slots))
      transformedPlan = {
        meals: validation.meals.map((meal) => {
          const slot = payload.slots.find((candidate) => candidate.day === meal.day && candidate.meal === meal.meal) || {}
          return ensureMealMetadata(meal, slot)
        }),
      }
      console.log('[generate-plan] After transform, meals count:', transformedPlan.meals?.length)
    } else {
      console.warn('[generate-plan] LLM validation failed after retry, falling back to library recipes:', validation.failures)
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const fallbackMeals = []
      for (const slot of payload.slots) {
        const { recipe, dietApplied } = await getRecipeFromCatalog(
          supabaseClient,
          String(slot.meal || 'dinner'),
          String(slot.effort || slot.effort_level || 'medium'),
          String(slot.suggestion || ''),
          payload.members,
          payload.replace_slot?.current_meal_name || null,
          payload.recent_meal_names || [],
        )
        if (recipe) {
          fallbackMeals.push(ensureMealMetadata({
            day: slot.day,
            meal: slot.meal || 'dinner',
            ...recipe,
            why_this_meal: `Fallback to a trusted library recipe for a more reliable ${slot.meal || 'meal'}.`,
            reason: createShortReason(recipe),
            diet_applied: dietApplied,
          }, slot))
        }
      }
      transformedPlan = { meals: fallbackMeals }
    }
    console.log('[generate-plan] Transformed plan:', JSON.stringify(transformedPlan).slice(0, 200))

    // Save LLM-generated recipes to database for future reuse
    if (!publicMode && transformedPlan.meals?.length > 0) {
      const dietFromPayload = payload.household?.diet_focus || ''
      for (const meal of transformedPlan.meals) {
        await saveGeneratedRecipe(supabaseClient, meal, payload.members, dietFromPayload)
      }
    }

    return new Response(JSON.stringify({ plan: transformedPlan }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown edge function error', details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
