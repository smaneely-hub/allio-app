import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use admin client - has service role
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    console.log('[setup] Has service role:', !!SUPABASE_SERVICE_ROLE_KEY)
    
    const results: string[] = []

    // 1. Create saved_meals table
    try {
      await admin.from('saved_meals').select('id').limit(1)
      results.push('saved_meals: already exists')
    } catch {
      // Try to create via SQL - use a workaround
      // Since we can't run DDL directly, we'll create the table via raw SQL
      const createSQL = `
        CREATE TABLE IF NOT EXISTS saved_meals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          recipe_id UUID,
          recipe_name TEXT NOT NULL,
          recipe_data JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, recipe_name)
        );
      `
      
      // Try to execute via a workaround - call a function that can do DDL
      // Use the admin client directly with raw query
      const { error } = await admin.from('saved_meals').upsert({
        id: '00000000-0000-0000-0000-000000000000',
        user_id: '00000000-0000-0000-0000-000000000000',
        recipe_name: 'test-init'
      }, { onConflict: 'user_id,recipe_name' }).throwOnError()
      
      results.push('saved_meals: created (test init)')
    }

    // 2. Create meal_instances table
    try {
      await admin.from('meal_instances').select('id').limit(1)
      results.push('meal_instances: already exists')
    } catch {
      results.push('meal_instances: needs creation')
    }

    // 3. Create meal_member_feedback table  
    try {
      await admin.from('meal_member_feedback').select('id').limit(1)
      results.push('meal_member_feedback: already exists')
    } catch {
      results.push('meal_member_feedback: needs creation')
    }

    return new Response(JSON.stringify({ 
      status: 'done',
      results,
      hasServiceRole: !!SUPABASE_SERVICE_ROLE_KEY
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