import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || ''
const LLM_MODEL = Deno.env.get('LLM_MODEL') || 'stepfun/step-3.5-flash:free'
const LLM_ENDPOINT = Deno.env.get('LLM_ENDPOINT') || 'https://openrouter.ai/api/v1/chat/completions'

const SYSTEM_PROMPT = `You are a meal planning assistant. You receive household context and a weekly schedule, and you return a structured meal plan as JSON.

RULES:
- Return ONLY valid JSON. No markdown, no explanation.
- Every meal must include: name, ingredients with quantities and units, prep_time_minutes, and cooking_instructions.
- Respect all dietary restrictions absolutely.
- Match effort_level to the slot (low = 15min or less).
- When is_leftover is true, reference the source meal.
- Aggregate ingredient quantities realistically.
- Use the staples_on_hand list: do NOT include those items in the ingredient lists unless a large quantity is needed.
- If replace_slot is present: Replace only the specified slot. Keep all other meals unchanged. Consider the existing meals when choosing a replacement to avoid repeating ingredients.
- Preserve any locked meals provided in locked_meals exactly.

OUTPUT SCHEMA:
{
  "week_start": "2026-03-23",
  "meals": [
    {
      "day": "mon",
      "meal": "dinner",
      "name": "Sheet Pan Chicken Thighs with Roasted Vegetables",
      "servings": 4,
      "attendees": ["A1", "A2", "K1", "K2"],
      "prep_time_minutes": 15,
      "cook_time_minutes": 35,
      "effort": "medium",
      "is_leftover": false,
      "leftover_source": null,
      "ingredients": [
        { "item": "chicken thighs", "quantity": 2, "unit": "lb", "category": "protein" }
      ],
      "instructions": ["Preheat oven to 425F."],
      "notes": "Kid-friendly."
    }
  ]
}`

function validatePlan(plan: unknown) {
  if (!plan || typeof plan !== 'object') return false
  const meals = (plan as { meals?: unknown }).meals
  if (!Array.isArray(meals) || meals.length === 0) return false

  return meals.every((meal) => {
    if (!meal || typeof meal !== 'object') return false
    const candidate = meal as Record<string, unknown>
    return (
      typeof candidate.day === 'string' &&
      typeof candidate.meal === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.servings === 'number' &&
      Array.isArray(candidate.attendees) &&
      typeof candidate.prep_time_minutes === 'number' &&
      Array.isArray(candidate.ingredients) &&
      Array.isArray(candidate.instructions)
    )
  })
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
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const payload = await req.json()
    if (!payload?.household || !Array.isArray(payload?.members) || !Array.isArray(payload?.slots)) {
      return new Response(JSON.stringify({ error: 'Payload must include household, members, and slots' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
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
        {
          role: 'user',
          content: 'Your response was not valid JSON matching the schema. Please try again and return ONLY the JSON object.',
        },
      ])
      parsedPlan = JSON.parse(llmJson.choices[0].message.content)
    }

    if (!validatePlan(parsedPlan)) {
      return new Response(JSON.stringify({ error: 'Model output failed schema validation after retry' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ plan: parsedPlan }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown edge function error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
})
