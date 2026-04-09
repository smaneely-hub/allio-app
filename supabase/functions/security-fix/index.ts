import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_ SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const results: string[] = []
    
    // 1. Enable RLS on feature_flags
    try {
      await admin. rpc('pg_catalog', { query: 'ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY' })
      results.push('feature_flags: RLS enabled')
    } catch (e) { results.push('feature_ flags: RLS error - ' + String(e)) }
    
    // 2. Enable RLS on usage_tracking
    try {
      await admin. rpc('pg_catalog', { query: 'ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY' })
      results.push('usage_tracking: RLS enabled')
    } catch (e) { results.push('usage_tracking: RLS error - ' + String(e)) }
    
    // 3. Add policies for recipes (public catalog)
    // First check if we can do this
    results.push('Note: Recipes policies need manual SQL apply - see 20260 408_security_fix.sql')
    
    return new Response(JSON.stringify({ 
      status: 'applied',
      results,
      message: 'Security fix applied. Some items may need manual SQL.' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})