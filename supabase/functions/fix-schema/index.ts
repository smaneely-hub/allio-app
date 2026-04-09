import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const results: string[] = []
    
    // Add columns to recipes table
    const recipeColumns = [
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT \'seed\'',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_name TEXT',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine TEXT',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS meal_type TEXT',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 15',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cook_time_minutes INTEGER DEFAULT 30',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredients_json JSONB DEFAULT \'[]\'::jsonb',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS instructions_json JSONB DEFAULT \'[]\'::jsonb',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS kid_friendly_score INTEGER DEFAULT 5',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS weeknight_score INTEGER DEFAULT 5',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS leftovers_score INTEGER DEFAULT 5',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS servings INTEGER DEFAULT 4',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cost_tier TEXT DEFAULT \'moderate\'',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT \'medium\'',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS dietary_flags_json JSONB DEFAULT \'[]\'::jsonb',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS allergen_flags_json JSONB DEFAULT \'[]\'::jsonb',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags_json JSONB DEFAULT \'[]\'::jsonb',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition_json JSONB DEFAULT \'{}\'::jsonb',
      'ALTER TABLE recipes ADD COLUMN IF NOT EXISTS equipment_json JSONB DEFAULT \'[]\'::jsonb',
    ]
    
    // Try to execute each column addition
    // We need to use raw SQL - let's try via a workaround
    // Since exec_sql doesn't exist, we need a different approach
    
    // Try using postgrest to check if we can do anything
    // Actually, we can try inserting with minimal fields and see what happens
    
    // Let's just return instructions for now
    return new Response(JSON.stringify({ 
      message: 'Schema fix needed - please run in SQL Editor',
      sql: `
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'seed';
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_name TEXT;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine TEXT;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS meal_type TEXT;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 15;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cook_time_minutes INTEGER DEFAULT 30;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredients_json JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS instructions_json JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS kid_friendly_score INTEGER DEFAULT 5;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS weeknight_score INTEGER DEFAULT 5;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS leftovers_score INTEGER DEFAULT 5;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS servings INTEGER DEFAULT 4;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cost_tier TEXT DEFAULT 'moderate';
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
      `
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
