import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Admin client with service role
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { setup } = await req.json()
    
    if (setup !== true) {
      return new Response(JSON.stringify({ 
        error: 'Set {"setup": true} to create tables',
        instructions: 'Run the SQL migration manually in Supabase Dashboard > SQL Editor'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results: string[] = []

    // Create saved_meals table
    try {
      await admin.from('saved_meals').select('id').limit(1)
      results.push('saved_meals: already exists')
    } catch {
      // Table doesn't exist, we'll try to create it via raw SQL
      results.push('saved_meals: needs manual creation')
    }

    // Check meal_instances
    try {
      await admin.from('meal_instances').select('id').limit(1)
      results.push('meal_instances: already exists')
    } catch {
      results.push('meal_instances: needs manual creation')
    }

    // Check meal_member_feedback
    try {
      await admin.from('meal_member_feedback').select('id').limit(1)
      results.push('meal_member_feedback: already exists')
    } catch {
      results.push('meal_member_feedback: needs manual creation')
    }

    return new Response(JSON.stringify({ 
      status: 'ok',
      results,
      message: 'Please run the SQL migration manually',
      sql_file: 'supabase/migrations/20260408_allio_schema.sql'
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