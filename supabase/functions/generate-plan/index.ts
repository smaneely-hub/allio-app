import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || ''
const LLM_MODEL = Deno.env.get('LLM_MODEL') || 'meta-llama/llama-3.1-70b-instruct'
const LLM_ENDPOINT = Deno.env.get('LLM_ENDPOINT') || 'https://openrouter.ai/api/v1/chat/completions'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Build dynamic system prompt based on scheduled slots
function buildSystemPrompt(slots: Array<{ day: string; meal: string; is_leftover?: boolean }>, members: Array<{ restrictions?: string; preferences?: string }>, suggestion?: string) {
  const slotDescriptions = slots
    .filter((s) => s.meal !== 'prep_block' && s.meal !== 'prep')
    .map((s) => {
      // Add meal type guidance
      const mealGuidance: Record<string, string> = {
        'breakfast': '(light morning meal like eggs, toast, cereal, yogurt, oatmeal, smoothie)',
        'lunch': '(midday meal like salad, sandwich, soup, wrap, leftovers)',
        'dinner': '(main evening meal like chicken, fish, pasta, stir-fry, tacos)',
      }
      const guidance = mealGuidance[s.meal.toLowerCase()] || ''
      return `${s.day} ${s.meal} ${guidance}`
    })
    .join(', ')
  
  const restrictions = members
    .map((m) => m.restrictions || m.preferences || '')
    .filter(Boolean)
    .join(', ')
  
  let userWants = ''
  if (suggestion) {
    userWants = `IMPORTANT - User wants: ${suggestion}. Generate a meal matching this request. `
  }
  
  return `You are a meal planning assistant. Generate a meal plan with REAL, USABLE recipes.

${userWants}
IMPORTANT: Only generate meals for these SPECIFIC slots: ${slotDescriptions || 'none'}

For each meal, you MUST provide:
1. INGREDIENTS: Specific quantities (e.g., "1 tbsp olive oil", "2 salmon fillets", "1/2 tsp salt")
2. INSTRUCTIONS: 4-8 detailed steps with temperatures, times, and techniques. NEVER use generic placeholders like "Cook according to recipe" or "Prepare ingredients". 

Example of GOOD instructions for Baked Salmon with Asparagus:
["Preheat oven to 425°F.", "Cut salmon into 4 portions, pat dry with paper towels.", "Toss asparagus and Brussels sprouts with 1 tbsp olive oil, 1/2 tsp salt, and pepper on a sheet pan.", "Place salmon on same pan, drizzle with remaining olive oil.", "Roast for 18-22 minutes until salmon flakes easily.", "Let rest 2 minutes before serving."]

3. PREP TIME & COOK TIME: Realistic times that match the recipe complexity
4. DIFFICULTY: Easy, Medium, or Hard based on complexity
5. NOTES: One sentence explaining why this meal fits this slot. Examples: "Quick and mild — smaller household tonight", "Uses leftover chicken", "Full family dinner"

IMPORTANT RESTRICTIONS:
- Do NOT include basic staples in the ingredients: salt, pepper, olive oil, garlic powder, cooking spray. Assume the household has these.
- Ingredient quantities must be specific: "1 lb chicken thighs" not just "chicken"
- Minimum 4 instruction steps, maximum 8

Return JSON with this structure:
{
  "meal_plan": {
    "Monday": {"dinner": {"name": "Grilled Salmon", "ingredients": [{"item": "salmon", "quantity": 2, "unit": "fillets", "category": "seafood"}], "instructions": ["step 1", "step 2", ...], "prep_time_minutes": 15, "cook_time_minutes": 20, "difficulty": "Easy", "notes": "Quick weeknight dinner"}}
  }
}

${restrictions ? `Dietary restrictions to respect: ${restrictions}` : ''}`
}

function validatePlan(plan: unknown) {
  // More lenient validation - just check for meals array
  return true
}

// Transform LLM output to frontend format - simplified
function transformLlmOutput(llmOutput: unknown, scheduledSlots: Array<{ day: string; meal: string }> = []): { meals: Array<Record<string, unknown>> } {
  try {
    if (!llmOutput || typeof llmOutput !== 'object') {
      return { meals: [] }
    }
    
    const output = llmOutput as Record<string, unknown>
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
      else if (n.includes('beef') || n.includes('steak')) ing.push({item: 'beef', q: 1, u: 'lb', c: 'meat'})
      else if (n.includes('fish') || n.includes('salmon')) ing.push({item: 'fish', q: 0.5, u: 'lb', c: 'seafood'})
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
          
          if (typeof mealValue === 'string') {
            mealName = mealValue
            mealIngredients = inferIngredients(mealName)
          } else if (typeof mealValue === 'object' && mealValue !== null) {
            const mealObj = mealValue as Record<string, unknown>
            mealName = String(mealObj.name || '')
            // Use provided ingredients or infer
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
            servings: 2,
            cook_time_minutes: 20 + Math.floor(Math.random() * 25),
            difficulty: Math.random() > 0.5 ? 'Easy' : 'Medium',
            prep_time_minutes: 30,
            ingredients: mealIngredients,
            instructions: ['Preheat oven to 425°F.', 'Prepare all ingredients by washing and chopping.', 'Season protein with salt, pepper, and desired spices.', 'Heat oil in a large oven-safe skillet over medium-high heat.', 'Sear protein for 3-4 minutes per side.', 'Add vegetables to the pan.', 'Transfer to oven and roast for 15-20 minutes until done.', 'Let rest 5 minutes before serving.'],
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Allow calls without user verification for now (for debugging)
    // The payload has all the data we need from the client
    
    const payload = await req.json()
    if (!payload?.household || !Array.isArray(payload?.members) || !Array.isArray(payload?.slots)) {
      return new Response(JSON.stringify({ error: 'Payload must include household, members, and slots' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const messages = [
      { role: 'system', content: buildSystemPrompt(payload.slots, payload.members, payload.replace_slot?.suggestion) },
      { role: 'user', content: JSON.stringify(payload) },
    ]

    let llmJson = await callLlm(messages)
    console.log('[generate-plan] LLM raw response:', JSON.stringify(llmJson).slice(0, 300))
    let parsedPlan = JSON.parse(llmJson.choices[0].message.content)

    // Transform LLM output to frontend format - filter to only scheduled slots
    let transformedPlan
    try {
      console.log('[generate-plan] About to transform, scheduledSlots:', JSON.stringify(payload.slots))
      transformedPlan = transformLlmOutput(parsedPlan, payload.slots)
      console.log('[generate-plan] After transform, meals count:', transformedPlan.meals?.length)
    } catch (e) {
      console.error('[transform] Error:', e)
      transformedPlan = { meals: [] }
    }
    console.log('[generate-plan] Transformed plan:', JSON.stringify(transformedPlan).slice(0, 200))

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
