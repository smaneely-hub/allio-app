import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const results: string[] = []
    
    // Add columns to shopping_lists
    const shoppingSql = `
      ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS week_of DATE;
      ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS partner_data JSONB DEFAULT '{}'::jsonb;
    `
    
    try {
      // Use raw query via postgrest
      const { error } = await supabase.from('shopping_lists').select('id').limit(0)
      results.push('shopping_lists table check: ' + (error ? error.message : 'ok'))
    } catch (e: any) {
      results.push('shopping_lists error: ' + e.message)
    }
    
    // Add columns to recipes - use simple approach
    const recipeSql = `
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS title TEXT;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine TEXT;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS meal_type TEXT;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cook_time_minutes INTEGER;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredients_json JSONB;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS instructions_json JSONB;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS kid_friendly_score INTEGER;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS weeknight_score INTEGER;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS leftovers_score INTEGER;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS active BOOLEAN;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty TEXT;
      ALTER TABLE recipes ADD COLUMN IF NOT EXISTS servings INTEGER;
    `
    
    try {
      const { error } = await supabase.from('recipes').select('id').limit(0)
      results.push('recipes table check: ' + (error ? error.message : 'ok'))
    } catch (e: any) {
      results.push('recipes error: ' + e.message)
    }
    
    return new Response(JSON.stringify({ results, message: 'Table checks complete' }), {
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
