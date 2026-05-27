import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

import { buildCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin, requireAuth } from '../_shared/security.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || ''
const LLM_MODEL = Deno.env.get('LLM_MODEL') || 'meta-llama/llama-3.1-70b-instruct'
const LLM_ENDPOINT = Deno.env.get('LLM_ENDPOINT') || 'https://openrouter.ai/api/v1/chat/completions'

// Parse ingredients from various formats
function parseIngredients(ingredients: any): Array<{item: string; quantity: number; unit: string; category: string; notes?: string}> {
  if (!ingredients) return []
  if (typeof ingredients === 'string') {
    try {
      ingredients = JSON.parse(ingredients)
    } catch {
      return []
    }
  }
  if (!Array.isArray(ingredients)) return []

  return ingredients.map((ing: any) => {
    if (typeof ing === 'string') {
      // Try to parse "2 lbs chicken" format
      const match = ing.match(/^([\d./]+)\s*(\w+)?\s+(.+)$/i)
      if (match) {
        return {
          item: match[3]?.trim() || ing,
          quantity: parseFloat(match[1]) || 1,
          unit: match[2]?.trim() || 'piece',
          category: 'other'
        }
      }
      return { item: ing, quantity: 1, unit: 'piece', category: 'other' }
    }
    return {
      item: ing.item || ing.name || ing.ingredient || '',
      quantity: ing.quantity || ing.qty || 1,
      unit: ing.unit || '',
      category: ing.category || 'other',
      notes: ing.notes || ing.note || ''
    }
  }).filter((ing: any) => ing.item)
}

// Refinement rules - maps feedback types to transformation logic
const REFINEMENT_RULES: Record<string, {
  patterns: string[],
  transform: (recipe: any, feedback: string) => { ingredients?: any[], instructions?: string[], changes: string[] }
}> = {
  vegetarian: {
    patterns: ['vegetarian', 'make it vegetarian', 'no meat', 'meatless', 'plant-based'],
    transform: (recipe, feedback) => {
      const changes: string[] = []
      const meatKeywords = ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage', 'ham', 'steak', 'fish', 'salmon', 'shrimp', 'lobster', 'duck']

      let newIngredients = [...(recipe.ingredients || [])]
      const removed: string[] = []
      const added: string[] = []

      // Find and remove meat proteins
      newIngredients = newIngredients.filter((ing: any) => {
        const item = (ing.item || ing.name || '').toLowerCase()
        const isMeat = meatKeywords.some(m => item.includes(m))
        if (isMeat) {
          removed.push(ing.item || ing.name)
        }
        return !isMeat
      })

      if (removed.length > 0) {
        changes.push(`removed: ${removed.join(', ')}`)
      }

      // Add tofu or beans as protein replacement
      const hasTofu = newIngredients.some((i: any) => (i.item || '').toLowerCase().includes('tofu'))
      const hasBeans = newIngredients.some((i: any) => (i.item || '').toLowerCase().includes('bean'))

      if (!hasTofu && !hasBeans) {
        newIngredients.push({ item: 'extra-firm tofu', quantity: 1, unit: 'block', category: 'protein' })
        added.push('tofu (protein replacement)')
      }

      if (added.length > 0) {
        changes.push(`added: ${added.join(', ')}`)
      }

      return { ingredients: newIngredients, changes }
    }
  },

  'no mushrooms': {
    patterns: ['no mushroom', 'remove mushroom', 'without mushroom', 'no fungi'],
    transform: (recipe, feedback) => {
      const changes: string[] = []
      let newIngredients = (recipe.ingredients || []).filter((ing: any) => {
        const item = (ing.item || ing.name || '').toLowerCase()
        if (item.includes('mushroom')) {
          changes.push(`removed: ${ing.item || ing.name}`)
          return false
        }
        return true
      })

      return { ingredients: newIngredients, changes }
    }
  },

  'add lime': {
    patterns: ['add lime', 'lime', 'more citrus', 'add lemon', 'add orange'],
    transform: (recipe, feedback) => {
      const changes: string[] = []
      const citrusMap: Record<string, string> = { lime: 'lime', lemon: 'lemon', orange: 'orange', citrus: 'lemon' }

      const feedbackLower = feedback.toLowerCase()
      let citrusType = 'lime'
      for (const [key, val] of Object.entries(citrusMap)) {
        if (feedbackLower.includes(key)) {
          citrusType = val
          break
        }
      }

      const newIngredients = [...(recipe.ingredients || [])]
      const hasCitrus = newIngredients.some((i: any) =>
        (i.item || '').toLowerCase().includes('lime') ||
        (i.item || '').toLowerCase().includes('lemon') ||
        (i.item || '').toLowerCase().includes('orange')
      )

      if (!hasCitrus) {
        newIngredients.push({ item: citrusType, quantity: feedbackLower.includes('double') || feedbackLower.includes('more') ? 2 : 1, unit: 'piece', category: 'produce' })
        changes.push(`added: ${citrusType}`)
      }

      return { ingredients: newIngredients, changes }
    }
  },

  'less spicy': {
    patterns: ['less spicy', 'not spicy', 'mild', 'no heat', 'kid friendly', 'less heat'],
    transform: (recipe, feedback) => {
      const changes: string[] = []
      const spicyKeywords = ['chili', 'cayenne', 'hot', 'spicy', 'sriracha', 'jalapeño', 'pepper flakes', 'red pepper']

      let newIngredients = (recipe.ingredients || []).map((ing: any) => {
        const item = (ing.item || '').toLowerCase()
        if (spicyKeywords.some(s => item.includes(s))) {
          changes.push(`removed: ${ing.item}`)
          return null
        }
        return ing
      }).filter(Boolean)

      // Update instructions to remove spicy references
      let newInstructions = (recipe.instructions || []).map((step: string) => {
        let updated = step
        for (const s of spicyKeywords) {
          updated = updated.replace(new RegExp(s, 'gi'), '')
        }
        return updated.replace(/\s+/g, ' ').trim()
      })

      return { ingredients: newIngredients, instructions: newInstructions, changes }
    }
  },

  'more protein': {
    patterns: ['more protein', 'higher protein', 'add protein', 'extra protein', 'more filling'],
    transform: (recipe, feedback) => {
      const changes: string[] = []
      const newIngredients = [...(recipe.ingredients || [])]

      // Check what protein exists
      const hasChicken = newIngredients.some((i: any) => (i.item || '').toLowerCase().includes('chicken'))
      const hasBeef = newIngredients.some((i: any) => (i.item || '').toLowerCase().includes('beef'))
      const hasTofu = newIngredients.some((i: any) => (i.item || '').toLowerCase().includes('tofu'))
      const hasEggs = newIngredients.some((i: any) => (i.item || '').toLowerCase().includes('egg'))

      if (hasChicken) {
        // Increase chicken quantity
        newIngredients.forEach((ing: any) => {
          if ((ing.item || '').toLowerCase().includes('chicken')) {
            ing.quantity = (ing.quantity || 1) + 0.5
            changes.push(`increased: ${ing.item} to ${ing.quantity} lbs`)
          }
        })
      } else if (hasBeef) {
        newIngredients.forEach((ing: any) => {
          if ((ing.item || '').toLowerCase().includes('beef')) {
            ing.quantity = (ing.quantity || 1) + 0.5
            changes.push(`increased: ${ing.item} to ${ing.quantity} lbs`)
          }
        })
      } else if (!hasTofu && !hasEggs) {
        // Add eggs as extra protein
        newIngredients.push({ item: 'eggs', quantity: 2, unit: 'piece', category: 'protein' })
        changes.push('added: eggs (extra protein)')
      }

      return { ingredients: newIngredients, changes }
    }
  },

  'quicker': {
    patterns: ['quicker', 'faster', 'less time', 'shortcuts', 'quick', 'easy'],
    transform: (recipe, feedback) => {
      const changes: string[] = []

      // Simplify instructions
      let newInstructions = (recipe.instructions || []).map((step: string) => {
        // Remove resting times, optional steps
        let updated = step
          .replace(/let rest \d+ minutes?/gi, '')
          .replace(/optional/gi, '')
          .replace(/you can also \w+/gi, '')
          .replace(/\s+/g, ' ').trim()
        return updated || step
      })

      // Consolidate similar steps
      newInstructions = newInstructions.filter((step: string, i: number, arr: string[]) => {
        if (i === 0) return true
        // Simple deduplication
        return step !== arr[i-1]
      })

      // Mark as faster
      if (recipe.prep_time_minutes) {
        recipe.prep_time_minutes = Math.max(5, Math.floor(recipe.prep_time_minutes * 0.7))
      }
      if (recipe.cook_time_minutes) {
        recipe.cook_time_minutes = Math.max(10, Math.floor(recipe.cook_time_minutes * 0.7))
      }

      changes.push('simplified instructions for faster cooking')
      changes.push(`prep time: ${recipe.prep_time_minutes} min`)
      changes.push(`cook time: ${recipe.cook_time_minutes} min`)

      return { instructions: newInstructions, changes }
    }
  },

  'simpler': {
    patterns: ['simpler', 'simpler ingredients', 'fewer ingredients', 'basic', 'keep it simple'],
    transform: (recipe, feedback) => {
      const changes: string[] = []

      // Keep only first 6-8 ingredients
      let newIngredients = (recipe.ingredients || []).slice(0, 8)
      const removed = (recipe.ingredients || []).length - newIngredients.length
      if (removed > 0) {
        changes.push(`simplified: using ${newIngredients.length} core ingredients (removed ${removed} extras)`)
      }

      // Simplify instructions to 4-5 steps
      let newInstructions = (recipe.instructions || []).slice(0, 5)
      if (newInstructions.length < (recipe.instructions || []).length) {
        changes.push(`simplified: ${newInstructions.length} steps (from ${(recipe.instructions || []).length})`)
      }

      return { ingredients: newIngredients, instructions: newInstructions, changes }
    }
  },

  'kid friendly': {
    patterns: ['kid friendly', 'kids', 'child', 'family', 'for kids', 'tame'],
    transform: (recipe, feedback) => {
      const changes: string[] = []

      // Remove strong flavors
      const strongFlavors = ['curry', 'cilantro', 'fish sauce', 'anchovy', 'truffle', 'sambal', 'harissa']
      let newIngredients = (recipe.ingredients || []).map((ing: any) => {
        const item = (ing.item || '').toLowerCase()
        for (const f of strongFlavors) {
          if (item.includes(f)) {
            changes.push(`removed: ${ing.item} (strong flavor)`)
            return null
          }
        }
        return ing
      }).filter(Boolean)

      // Add a familiar side
      const hasFamiliar = newIngredients.some((i: any) =>
        ['rice', 'pasta', 'bread', 'potato'].some(f => (i.item || '').toLowerCase().includes(f))
      )
      if (!hasFamiliar) {
        newIngredients.push({ item: 'rice', quantity: 2, unit: 'cups', category: 'pantry' })
        changes.push('added: rice (kid-friendly side)')
      }

      // Simplify instructions
      let newInstructions = (recipe.instructions || []).slice(0, 5)
      changes.push(`simplified to ${newInstructions.length} steps for easier family cooking`)

      return { ingredients: newIngredients, instructions: newInstructions, changes }
    }
  }
}

// Try to apply rule-based refinement first
function buildIngredientGroupsFromFlat(ingredients: any[] = []) {
  return [{
    label: undefined,
    ingredients: ingredients.map((ing: any) => ({
      amount: ing?.quantity != null ? String(ing.quantity) : '',
      unit: ing?.unit || '',
      item: ing?.item || ing?.name || ing?.ingredient || '',
      note: ing?.notes || ing?.note || undefined,
      optional: Boolean(ing?.optional),
    })).filter((ing: any) => ing.item)
  }]
}

function buildInstructionGroupsFromFlat(instructions: any[] = []) {
  return [{
    label: undefined,
    steps: instructions
      .map((step: any) => typeof step === 'string' ? { text: step } : { text: step?.text || step?.instruction || step?.step || '' })
      .filter((step: any) => step.text)
  }]
}

function withNormalizedRecipeShape(baseRecipe: any, nextRecipe: any) {
  const ingredients = Array.isArray(nextRecipe.ingredients) ? nextRecipe.ingredients : (Array.isArray(baseRecipe.ingredients) ? baseRecipe.ingredients : [])
  const instructions = Array.isArray(nextRecipe.instructions) ? nextRecipe.instructions : (Array.isArray(baseRecipe.instructions) ? baseRecipe.instructions : [])

  return {
    ...baseRecipe,
    ...nextRecipe,
    ingredients,
    instructions,
    ingredientGroups: buildIngredientGroupsFromFlat(ingredients),
    instructionGroups: buildInstructionGroupsFromFlat(instructions),
  }
}

// ─── Coherence validation ─────────────────────────────────────────────────────

/** Extract an ingredient item name, lowercased and trimmed. */
function ingItemName(ing: any): string {
  return (ing?.item || ing?.name || '').toLowerCase().trim()
}

/** Get a stable sorted list of ingredient names from a flat ingredients array. */
function sortedIngredientNames(ingredients: any[]): string[] {
  return parseIngredients(ingredients)
    .map(ingItemName)
    .filter(Boolean)
    .sort()
}

/** Convert an instructions array (strings or {text} objects) to a single text blob. */
function instructionsToText(instructions: any[]): string {
  if (!Array.isArray(instructions)) return ''
  return instructions
    .map((s: any) => typeof s === 'string' ? s : (s?.text || s?.instruction || s?.step || ''))
    .join('\n')
    .trim()
}

/**
 * Post-refinement gate.
 * Returns { valid: true } when the refined recipe is meaningfully different from the original.
 * Returns { valid: false, reason } when the recipe is materially unchanged or internally incoherent.
 */
function validateRefinementCoherence(
  original: any,
  refined: any,
): { valid: boolean; reason?: string } {
  const origTitle = (original.name || original.title || '').trim().toLowerCase()
  const nextTitle = (refined.name || refined.title || '').trim().toLowerCase()

  const origIngNames = sortedIngredientNames(original.ingredients || [])
  const nextIngNames = sortedIngredientNames(refined.ingredients || [])

  const origInstrText = instructionsToText(original.instructions || [])
  const nextInstrText = instructionsToText(refined.instructions || [])

  const titleSame = origTitle === nextTitle
  const ingredientsSame = origIngNames.join('|') === nextIngNames.join('|')
  const instructionsSame = origInstrText === nextInstrText

  // All three identical → nothing changed
  if (titleSame && ingredientsSame && instructionsSame) {
    return { valid: false, reason: 'Recipe is materially unchanged after refinement' }
  }

  // Soft coherence check: when instructions changed substantially,
  // at least some key ingredients should appear in the instruction text.
  if (!instructionsSame && nextIngNames.length > 0 && nextInstrText.length > 0) {
    const instrLower = nextInstrText.toLowerCase()
    const keyIngredients = nextIngNames.filter((n: string) => n.length > 3)

    if (keyIngredients.length >= 4) {
      const mentionedCount = keyIngredients.filter((n: string) => instrLower.includes(n)).length
      const mentionRate = mentionedCount / keyIngredients.length
      if (mentionRate < 0.2) {
        console.warn(`[refine-meal] Coherence check: only ${Math.round(mentionRate * 100)}% of ingredients mentioned in instructions`)
        return { valid: false, reason: 'Refined ingredients do not align with instructions (likely incoherent output)' }
      }
    }
  }

  return { valid: true }
}

// ─── JSON extraction helper ───────────────────────────────────────────────────

/**
 * Try to extract a JSON object from an LLM response that may wrap it in
 * markdown code fences or have surrounding commentary.
 */
function extractJSON(content: string): string {
  // Strip ```json ... ``` or ``` ... ``` fences
  const fenced = content.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (fenced) return fenced[1].trim()

  // Find the first { ... } blob in the content
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  if (start !== -1 && end > start) {
    return content.slice(start, end + 1)
  }

  return content.trim()
}

// ─── Direct swap ──────────────────────────────────────────────────────────────

function tryDirectIngredientSwap(recipe: any, feedback: string): { refined: any, changes: string[], matched: boolean } {
  const feedbackLower = feedback.toLowerCase().trim()
  const swapMatch = feedbackLower.match(/(?:replace|swap|use|change)\s+(?:the\s+)?(.+?)\s+(?:with|for|instead of)\s+(.+)/i)
  if (!swapMatch) {
    return { refined: recipe, changes: [], matched: false }
  }

  const fromRaw = swapMatch[1]?.trim()
  const toRaw = swapMatch[2]?.trim()
  if (!fromRaw || !toRaw) {
    return { refined: recipe, changes: [], matched: false }
  }

  const stopWords = /^(the|some|any|my|our)\s+/i
  const fromNeedle = fromRaw.replace(stopWords, '').trim()
  const toValue = toRaw.replace(stopWords, '').trim()
  if (!fromNeedle || !toValue) {
    return { refined: recipe, changes: [], matched: false }
  }

  let replacedCount = 0
  const escapedNeedle = fromNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const ingredientRegex = new RegExp(escapedNeedle, 'ig')

  const nextIngredients = (recipe.ingredients || []).map((ing: any) => {
    const item = String(ing?.item || ing?.name || ing?.ingredient || '')
    if (!item || !ingredientRegex.test(item)) {
      ingredientRegex.lastIndex = 0
      return ing
    }
    ingredientRegex.lastIndex = 0
    replacedCount += 1
    return {
      ...ing,
      item: item.replace(ingredientRegex, toValue),
    }
  })

  if (replacedCount === 0) {
    return { refined: recipe, changes: [], matched: true }
  }

  const nextInstructions = (recipe.instructions || []).map((step: string) =>
    typeof step === 'string' ? step.replace(ingredientRegex, toValue) : step
  )

  return {
    refined: withNormalizedRecipeShape(recipe, {
      ingredients: nextIngredients,
      instructions: nextInstructions,
    }),
    changes: [`replaced: ${fromNeedle} → ${toValue}`],
    matched: true,
  }
}

function applyRefinementRule(recipe: any, feedback: string): { refined: any, changes: string[], fallback: boolean } {
  const feedbackLower = feedback.toLowerCase()

  const directSwap = tryDirectIngredientSwap(recipe, feedback)
  if (directSwap.changes.length > 0) {
    console.log('[refine-meal] Applying direct ingredient swap')
    return {
      refined: directSwap.refined,
      changes: directSwap.changes,
      fallback: false,
    }
  }
  if (directSwap.matched) {
    return { refined: recipe, changes: [], fallback: true }
  }

  // Try each rule
  for (const [ruleName, rule] of Object.entries(REFINEMENT_RULES)) {
    const matches = rule.patterns.some(p => feedbackLower.includes(p))
    if (matches) {
      console.log('[refine-meal] Applying rule:', ruleName)
      const result = rule.transform(recipe, feedback)

      if (result.changes.length > 0) {
        return {
          refined: withNormalizedRecipeShape(recipe, {
            ingredients: result.ingredients || recipe.ingredients,
            instructions: result.instructions || recipe.instructions,
          }),
          changes: result.changes,
          fallback: false
        }
      }
    }
  }

  return { refined: recipe, changes: [], fallback: true }
}

// ─── LLM refinement ───────────────────────────────────────────────────────────

interface LLMResult {
  refined: any | null
  changes: string[]
  noChange: boolean
  reason?: string
}

async function refineWithLLM(recipe: any, feedback: string): Promise<LLMResult> {
  if (!LLM_API_KEY) {
    return { refined: null, changes: [], noChange: true, reason: 'Refinement service is not configured' }
  }

  // Send the recipe without bulky derived fields to keep prompt concise
  const recipeForPrompt = {
    name: recipe.name || recipe.title,
    description: recipe.description,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    servings: recipe.servings,
    nutrition: recipe.nutrition,
  }

  const prompt = `You are a recipe refinement assistant. Modify the recipe based on the user's feedback.

CURRENT RECIPE:
${JSON.stringify(recipeForPrompt, null, 2)}

USER FEEDBACK: "${feedback}"

Instructions:
1. If the feedback is a simple adjustment (swap ingredient, reduce spice, add side), apply it minimally.
2. If the feedback is a concept transformation (e.g. "turn into tacos", "make it a stir fry", "use tortillas instead of a bowl"), redesign the recipe to fit the new concept — changing the title, ingredients, and instructions is appropriate.
3. Ensure every key ingredient appears in the instructions.
4. Update the recipe title when the concept or main protein/format changes substantially.
5. If the recipe already fully satisfies the feedback and nothing needs to change, set "changes" to an empty array.

Return ONLY a valid JSON object — no markdown, no code fences, no extra text:
{
  "refined_recipe": {
    "name": "...",
    "description": "...",
    "ingredients": [{"item": "...", "quantity": 1, "unit": "...", "category": "..."}],
    "instructions": ["step 1", "step 2"],
    "prep_time_minutes": 0,
    "cook_time_minutes": 0,
    "servings": 4
  },
  "changes": ["replaced X with Y", "added Z", "updated title to ..."]
}`

  const response = await fetch(LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 2500,
      temperature: 0.3,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.error?.message || 'LLM request failed')
  }

  const content = json.choices[0].message.content
  console.log('[refine-meal] LLM raw response (first 600 chars):', content.slice(0, 600))

  let parsed: any
  try {
    parsed = JSON.parse(extractJSON(content))
  } catch (e) {
    console.error('[refine-meal] JSON parse error:', e)
    console.error('[refine-meal] Raw content was:', content.slice(0, 1000))
    return { refined: null, changes: [], noChange: true, reason: 'LLM returned unparseable output' }
  }

  const refinedRecipe = parsed.refined_recipe
  const llmChanges: string[] = Array.isArray(parsed.changes) ? parsed.changes.filter((c: any) => typeof c === 'string' && c.trim()) : []

  if (!refinedRecipe || typeof refinedRecipe !== 'object') {
    return { refined: null, changes: [], noChange: true, reason: 'LLM did not return a refined recipe' }
  }

  // LLM explicitly reported no changes were needed
  if (llmChanges.length === 0) {
    console.log('[refine-meal] LLM reported no changes needed')
    return { refined: null, changes: [], noChange: true, reason: 'No changes were needed for this feedback' }
  }

  const candidate = withNormalizedRecipeShape(recipe, refinedRecipe)

  // Run coherence gate
  const gate = validateRefinementCoherence(recipe, candidate)
  if (!gate.valid) {
    console.warn('[refine-meal] Coherence gate rejected LLM output:', gate.reason)
    return { refined: null, changes: [], noChange: true, reason: gate.reason }
  }

  console.log('[refine-meal] LLM refinement passed coherence gate with', llmChanges.length, 'change(s)')
  return { refined: candidate, changes: llmChanges, noChange: false }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req)
  }

  const blockedOrigin = rejectDisallowedOrigin(req)
  if (blockedOrigin) {
    return blockedOrigin
  }

  const origin = req.headers.get('origin')
  const corsHeaders = { ...buildCorsHeaders(origin), 'Content-Type': 'application/json' }

  try {
    const auth = await requireAuth(req, SUPABASE_URL, SUPABASE_ANON_KEY)
    if (auth.response) {
      return auth.response
    }

    const { recipe, feedback } = await req.json()

    if (!recipe || !feedback) {
      return new Response(JSON.stringify({ error: 'Must provide recipe and feedback' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[refine-meal] Received feedback:', feedback)
    console.log('[refine-meal] Recipe:', recipe.name)

    // Parse ingredients if they're in string format
    const parsedRecipe = {
      ...recipe,
      ingredients: parseIngredients(recipe.ingredients),
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
    }

    // First try rule-based / direct-swap refinement
    let ruleResult = applyRefinementRule(parsedRecipe, feedback)

    if (!ruleResult.fallback && ruleResult.changes.length > 0) {
      // Deterministic path succeeded — trust it, no gate needed
      console.log('[refine-meal] Rule-based changes:', ruleResult.changes)
      const refinedRecipe = {
        ...ruleResult.refined,
        refined_from: recipe.name,
        refinement_feedback: feedback,
        _refinement_changes: ruleResult.changes,
      }
      return new Response(JSON.stringify({
        refined: refinedRecipe,
        changes: ruleResult.changes,
      }), { status: 200, headers: corsHeaders })
    }

    // No deterministic match — use LLM
    console.log('[refine-meal] No deterministic rule matched, trying LLM')
    const llmResult = await refineWithLLM(parsedRecipe, feedback)

    if (llmResult.noChange) {
      // Honest no-op: return without a `refined` key so the frontend
      // treats this as a failed refinement rather than silent fake success.
      console.log('[refine-meal] Returning no-op:', llmResult.reason)
      return new Response(JSON.stringify({
        noChange: true,
        reason: llmResult.reason || 'Refinement had no effect',
        changes: [],
      }), { status: 200, headers: corsHeaders })
    }

    const refinedRecipe = {
      ...llmResult.refined,
      refined_from: recipe.name,
      refinement_feedback: feedback,
      _refinement_changes: llmResult.changes,
    }

    console.log('[refine-meal] LLM changes:', llmResult.changes)

    return new Response(JSON.stringify({
      refined: refinedRecipe,
      changes: llmResult.changes,
    }), { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('[refine-meal] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
