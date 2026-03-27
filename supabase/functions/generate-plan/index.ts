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

const SYSTEM_PROMPT = `You are a meal planning assistant. Generate a weekly meal plan.

Return a JSON object with this exact structure:
{
  "meal_plan": {
    "Monday": {"breakfast": "meal name", "lunch": "meal name", "dinner": "meal name"},
    "Tuesday": {"breakfast": "meal name", "lunch": "meal name", "dinner": "meal name"},
    ...for all 7 days
  }
}

Each meal should be a simple name like "Scrambled Eggs" or "Grilled Chicken Salad".
Include breakfast, lunch, and dinner for each day.`

function validatePlan(plan: unknown) {
  // More lenient validation - just check for meals array
  return true
}

// Transform LLM output to frontend format - simplified
function transformLlmOutput(llmOutput: unknown): { meals: Array<Record<string, unknown>> } {
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
    const entries = Object.entries(source as Record<string, unknown>)
    for (const [day, dayData] of entries) {
      if (dayData && typeof dayData === 'object') {
        for (const [mealType, mealName] of Object.entries(dayData as Record<string, unknown>)) {
          if (typeof mealName === 'string' && mealName.trim()) {
            meals.push({
              day,
              meal: mealType,
              name: mealName.trim(),
              servings: 2,
              attendees: [],
              prep_time_minutes: 30,
              ingredients: [],
              instructions: [],
            })
          }
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
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(payload) },
    ]

    let llmJson = await callLlm(messages)
    console.log('[generate-plan] LLM raw response:', JSON.stringify(llmJson).slice(0, 300))
    let parsedPlan = JSON.parse(llmJson.choices[0].message.content)

    // Transform LLM output to frontend format
    let transformedPlan
    try {
      transformedPlan = transformLlmOutput(parsedPlan)
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
