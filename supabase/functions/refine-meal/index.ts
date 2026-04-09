import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || ''
const LLM_MODEL = Deno.env.get('LLM_MODEL') || 'meta-llama/llama-3.1-70b-instruct'
const LLM_ENDPOINT = Deno.env.get('LLM_ENDPOINT') || 'https://openrouter.ai/api/v1/chat/completions'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
function applyRefinementRule(recipe: any, feedback: string): { refined: any, changes: string[], fallback: boolean } {
  const feedbackLower = feedback.toLowerCase()
  
  // Try each rule
  for (const [ruleName, rule] of Object.entries(REFINEMENT_RULES)) {
    const matches = rule.patterns.some(p => feedbackLower.includes(p))
    if (matches) {
      console.log('[refine-meal] Applying rule:', ruleName)
      const result = rule.transform(recipe, feedback)
      
      if (result.changes.length > 0) {
        return {
          refined: {
            ...recipe,
            ingredients: result.ingredients || recipe.ingredients,
            instructions: result.instructions || recipe.instructions,
          },
          changes: result.changes,
          fallback: false
        }
      }
    }
  }
  
  return { refined: recipe, changes: [], fallback: true }
}

// Use LLM for complex/unsupported feedback
async function refineWithLLM(recipe: any, feedback: string): Promise<{ refined: any, changes: string[] }> {
  if (!LLM_API_KEY) {
    return { 
      refined: recipe, 
      changes: ['No LLM available for complex refinements'] 
    }
  }
  
  const prompt = `You are a recipe refinement assistant. The user wants to modify a recipe based on feedback.

CURRENT RECIPE:
${JSON.stringify(recipe, null, 2)}

USER FEEDBACK: "${feedback}"

Your task:
1. Apply the feedback to modify the recipe
2. Ensure ingredient-instruction alignment still works
3. Return ONLY a JSON object with:
{
  "refined_recipe": { ...the modified recipe... },
  "changes": ["list of what changed: removed X, added Y, modified Z"]
}

Rules:
- Do NOT replace the recipe with a different one
- Only modify the current recipe based on feedback
- Maintain recipe integrity (ingredients must match instructions)
- If feedback fundamentally conflicts (e.g., "make it Italian" when it's already Italian), add the suggested change anyway
- Be specific: "add lime juice" not just "add citrus"

Respond with ONLY valid JSON, no other text.`

  const response = await fetch(LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 2000,
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
  console.log('[refine-meal] LLM response:', content.slice(0, 500))
  
  try {
    const parsed = JSON.parse(content)
    return {
      refined: parsed.refined_recipe || recipe,
      changes: parsed.changes || ['Refined via LLM']
    }
  } catch (e) {
    console.error('[refine-meal] JSON parse error:', e)
    return { refined: recipe, changes: ['LLM response parse error'] }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
    })

    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

    // First try rule-based refinement
    let result = applyRefinementRule(parsedRecipe, feedback)
    
    // If no rules matched, use LLM
    if (result.fallback || result.changes.length === 0) {
      console.log('[refine-meal] No rule matched, trying LLM')
      result = await refineWithLLM(parsedRecipe, feedback)
    }

    // Add metadata
    const refinedRecipe = {
      ...result.refined,
      refined_from: recipe.name,
      refinement_feedback: feedback,
      _refinement_changes: result.changes,
    }

    console.log('[refine-meal] Changes:', result.changes)

    return new Response(JSON.stringify({
      refined: refinedRecipe,
      changes: result.changes,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[refine-meal] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})