import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? Deno.env.get('LLM_API_KEY') ?? ''
const LLM_ENDPOINT = Deno.env.get('LLM_ENDPOINT') ?? 'https://openrouter.ai/api/v1/chat/completions'
const LLM_MODEL = Deno.env.get('LLM_MODEL') ?? 'meta-llama/llama-3.1-70b-instruct'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function stageError(stage: string, error: unknown, extra: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[planner-generate-test][stage-error]', stage, error)
  return new Response(JSON.stringify({ ok: false, error: message, stage, ...extra }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function buildPrompt(payload: Record<string, unknown>) {
  const household = payload.household as Record<string, unknown> | undefined
  const members = Array.isArray(payload.members) ? payload.members : []
  const slots = Array.isArray(payload.slots) ? payload.slots : []
  const weekNotes = String(payload.week_notes || '')

  return `You are an expert meal planner. Return valid JSON only.\n\nHOUSEHOLD CONTEXT:\n${JSON.stringify({ household, members, slots, weekNotes }, null, 2)}\n\nRULES:\n- Return JSON only.\n- Shape: { \"meals\": [ ... ] }\n- Use day values like mon, tue, wed, thu, fri, sat, sun.\n- Use meal values like breakfast, lunch, dinner, snack.\n- Return exactly one meal for each requested slot.\n- Each meal must include: day, meal, name, notes, ingredients, instructions, prep_time_minutes, cook_time_minutes, servings.`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('[planner-generate-test] entered planner-generate-test')
  console.log('[planner-generate-test] env presence:', {
    has_SUPABASE_URL: Boolean(SUPABASE_URL),
    has_SUPABASE_SERVICE_ROLE_KEY: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    has_OPENROUTER_API_KEY: Boolean(OPENROUTER_API_KEY),
  })

  let payload: Record<string, unknown> = {}
  try {
    payload = await req.json()
    console.log('[planner-generate-test] payload shape:', {
      topLevelKeys: Object.keys(payload || {}),
      memberCount: Array.isArray(payload?.members) ? payload.members.length : 0,
      slotCount: Array.isArray(payload?.slots) ? payload.slots.length : 0,
    })
  } catch (error) {
    return stageError('parse_request', error)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENROUTER_API_KEY) {
    return stageError('env_validation', new Error('Missing required environment variables'))
  }

  try {
    console.log('[planner-generate-test] before DB probe')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error } = await supabase.from('households').select('id').limit(1)
    if (error) throw error
    console.log('[planner-generate-test] after DB probe')
  } catch (error) {
    return stageError('db_probe', error)
  }

  let json: any = null
  try {
    console.log('[planner-generate-test] before OpenRouter call')
    const prompt = buildPrompt(payload)
    const response = await fetch(LLM_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 1200,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a test planner endpoint. Return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    json = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(json?.error?.message || json?.error || 'OpenRouter request failed')
    }
    console.log('[planner-generate-test] after OpenRouter call')
  } catch (error) {
    return stageError('openrouter_call', error, { details: json })
  }

  try {
    const content = json?.choices?.[0]?.message?.content || '{}'
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      parsed = { raw: content }
    }

    console.log('[planner-generate-test] before response return')
    return new Response(JSON.stringify({
      ok: true,
      stage: 'response_return',
      model: LLM_MODEL,
      plan: parsed,
      raw: content,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return stageError('response_return', error)
  }
})
