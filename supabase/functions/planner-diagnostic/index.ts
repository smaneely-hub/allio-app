import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? Deno.env.get('LLM_API_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function stageError(stage: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[planner-diagnostic][stage-error]', stage, error)
  return new Response(JSON.stringify({ ok: false, error: message, stage }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('[planner-diagnostic] entered planner-diagnostic')
  console.log('[planner-diagnostic] env presence:', {
    has_SUPABASE_URL: Boolean(SUPABASE_URL),
    has_SUPABASE_SERVICE_ROLE_KEY: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    has_OPENROUTER_API_KEY: Boolean(OPENROUTER_API_KEY),
  })

  let payload: Record<string, unknown> = {}
  try {
    payload = await req.json().catch(() => ({}))
    console.log('[planner-diagnostic] payload keys:', Object.keys(payload))
  } catch (error) {
    return stageError('parse_request', error)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return stageError('env_validation', new Error('Missing Supabase environment variables'))
  }

  try {
    console.log('[planner-diagnostic] before DB probe')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { error } = await supabase.from('households').select('id').limit(1)
    if (error) throw error
    console.log('[planner-diagnostic] after DB probe')
  } catch (error) {
    return stageError('db_probe', error)
  }

  return new Response(JSON.stringify({
    ok: true,
    stage: 'response_return',
    receivedKeys: Object.keys(payload),
    env: {
      has_SUPABASE_URL: true,
      has_SUPABASE_SERVICE_ROLE_KEY: true,
      has_OPENROUTER_API_KEY: Boolean(OPENROUTER_API_KEY),
    },
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
