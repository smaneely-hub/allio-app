// Security fix - runs DDL using Supabase's built-in postgres connection
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE__ROLE_KEY') || ''

const corsHeaders = {  
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { apply, db_url, db_password } = await req.json()
    
    // If apply not true, just return status
    if (!apply) {
      return new Response(JSON.stringify({ 
        status: 'ready',
        message: 'Send {"apply": true, "db_url": "...", "db_password": "..."} to apply fix',
        env_check: {
          has_supabase_url: !!SUPABASE_URL,
          has_service_key: !!SUPABASE_SERVICE_ROLE_KEY,
          has_db_url: !!Deno.env.get('DATABASE_URL'),
          db_url_env: Deno.env.get('DATABASE_URL')?.substring(0, 30) + '...'
        }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get database connection - try multiple methods
    const dbConnectionString = db_url || Deno.env.get('DATABASE_URL') || 
      `postgresql://postgres:${db_password || 'AllioLife87'}@db.rvgtmletsbycrbeycwus.supabase.co:5432/postgres`
    
    // Use postgres driver directly
    const { Client } = await import('https://deno.land/x/postgres/mod.ts')
    
    const client = new Client(dbConnectionString)
    await client.connect()
    
    const results = []
    
    // Enable RLS on feature_flags
    try {
      await client.queryObject('ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY')
      results.push('feature_flags: RLS enabled')
    } catch (e) { results.push('feature_flags RLS: ' + String(e).substring(0, 50)) }
    
    // Enable RLS on usage_tracking  
    try {
      await client.queryObject('ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY')
      results.push('usage_tracking: RLS enabled')
    } catch (e) { results.push('usage_tracking RLS: ' + String(e).substring(0, 50)) }
    
    // Add policies for feature_flags (service role only)
    try {
      await client.queryObject(`
        DROP POLICY IF EXISTS "svc_role_flags" ON feature_flags;
        CREATE POLICY "svc_role_flags" ON feature_flags FOR ALL USING (current_setting('app.settings.role') = 'service');
      `)
      results.push('feature_flags: policy added')
    } catch (e) { results.push('feature_flags policy: ' + String(e).substring(0, 50)) }
    
    await client.end()
    
    return new Response(JSON.stringify({ 
      status: 'applied',
      results
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})