import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || ''
const LLM_MODEL = Deno.env.get('LLM_MODEL') || 'stepfun/step-3.5-flash:free'
const LLM_ENDPOINT = Deno.env.get('LLM_ENDPOINT') || 'https://openrouter.ai/api/v1/chat/completions'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a meal planning assistant...`

function validatePlan(plan: unknown) {
  // More lenient validation - just check for meals array
  if (!plan || typeof plan !== 'object') return false
  const meals = (plan as { meals?: unknown }).meals
  if (!Array.isArray(meals)) {
    console.log('[validatePlan] No meals array found in plan')
    return false
  }
  
  // Check at least one meal has required fields
  const validMeals = meals.filter((meal) => {
    if (!meal || typeof meal !== 'object') return false
    const m = meal as Record<string, unknown>
    return typeof m.day === 'string' && typeof m.meal === 'string' && typeof m.name === 'string'
  })
  
  console.log('[validatePlan] Total meals:', meals.length, 'Valid meals:', validMeals.length)
  return validMeals.length > 0
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
    let parsedPlan = JSON.parse(llmJson.choices[0].message.content)

    if (!validatePlan(parsedPlan)) {
      llmJson = await callLlm([
        ...messages,
        { role: 'user', content: 'Your response was not valid JSON matching the schema. Please try again and return ONLY the JSON object.' },
      ])
      parsedPlan = JSON.parse(llmJson.choices[0].message.content)
    }

    if (!validatePlan(parsedPlan)) {
      return new Response(JSON.stringify({ error: 'Model output failed schema validation after retry' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ plan: parsedPlan }), {
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
