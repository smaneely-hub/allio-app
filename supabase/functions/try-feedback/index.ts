import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { buildCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from '../_shared/security.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsAllowHeaders = 'authorization, x-client-info, apikey, content-type, x-forwarded-for'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req, { 'Access-Control-Allow-Headers': corsAllowHeaders })
  }

  const blockedOrigin = rejectDisallowedOrigin(req)
  if (blockedOrigin) return blockedOrigin

  const origin = req.headers.get('origin')
  const corsHeaders = {
    ...buildCorsHeaders(origin, { 'Access-Control-Allow-Headers': corsAllowHeaders }),
    'Content-Type': 'application/json',
  }

  if (req.method !== 'PATCH') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 503, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const mealId = typeof body?.meal_id === 'string' ? body.meal_id.trim() : ''
    const sessionId = typeof body?.session_id === 'string' ? body.session_id.trim() : ''
    const feedback = body?.feedback

    if (!mealId || !sessionId || !['up', 'down'].includes(feedback)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await supabase
      .from('meals')
      .update({ feedback, feedback_at: new Date().toISOString() })
      .eq('id', mealId)
      .eq('session_id', sessionId)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[try-feedback] update failed', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }

    if (!data) {
      return new Response(JSON.stringify({ error: 'Meal not found' }), { status: 404, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('[try-feedback] error', error?.message || error)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500, headers: corsHeaders })
  }
})
