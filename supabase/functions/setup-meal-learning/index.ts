import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create admin client with service role
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { setup } = await req.json()

    if (setup !== true) {
      return new Response(JSON.stringify({ 
        error: 'Set {"setup": true} to initialize the meal learning tables'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 1: Create meal_instances table
    const createMealInstances = await adminClient.rpc('exec_sql', {
      query: `CREATE TABLE IF NOT EXISTS meal_instances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
        recipe_name TEXT NOT NULL,
        selected_member_ids UUID[] DEFAULT '{}',
        source TEXT DEFAULT 'generated',
        effort_level TEXT DEFAULT 'medium',
        dietary_focus TEXT,
        feedback_text TEXT,
        status TEXT DEFAULT 'generated',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        cooked_at TIMESTAMPTZ
      )`
    })

    // Step 2: Create meal_member_feedback table
    const createFeedback = await adminClient.rpc('exec_sql', {
      query: `CREATE TABLE IF NOT EXISTS meal_member_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        meal_instance_id UUID REFERENCES meal_instances(id) ON DELETE CASCADE NOT NULL,
        household_member_id UUID REFERENCES household_members(id) ON DELETE CASCADE NOT NULL,
        recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
        rating TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    })

    // Step 3: Create indexes
    const createIndexes = await adminClient.rpc('exec_sql', {
      query: `CREATE INDEX IF NOT EXISTS idx_meal_instances_household ON meal_instances(household_id);
      CREATE INDEX IF NOT EXISTS idx_meal_instances_user ON meal_instances(user_id);
      CREATE INDEX IF NOT EXISTS idx_meal_instances_created ON meal_instances(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_meal_member_feedback_instance ON meal_member_feedback(meal_instance_id);
      CREATE INDEX IF NOT EXISTS idx_meal_member_feedback_member ON meal_member_feedback(household_member_id);`
    })

    // Step 4: Enable RLS
    const enableRLS = await adminClient.rpc('exec_sql', {
      query: `ALTER TABLE meal_instances ENABLE ROW LEVEL SECURITY;
      ALTER TABLE meal_member_feedback ENABLE ROW LEVEL SECURITY;`
    })

    // Step 5: Create RLS policies
    const policiesSQL = `
      CREATE POLICY "Users can select own meal instances" ON meal_instances FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can insert own meal instances" ON meal_instances FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can update own meal instances" ON meal_instances FOR UPDATE USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can select own feedback" ON meal_member_feedback FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM household_members hm JOIN meal_instances mi ON mi.household_id = hm.household_id WHERE mi.id = meal_instance_id)
      );
      CREATE POLICY "Users can insert own feedback" ON meal_member_feedback FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM household_members hm JOIN meal_instances mi ON mi.household_id = hm.household_id WHERE mi.id = meal_instance_id)
      );
      CREATE POLICY "Users can update own feedback" ON meal_member_feedback FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM household_members hm JOIN meal_instances mi ON mi.household_id = hm.household_id WHERE mi.id = meal_instance_id)
      );
    `
    const createPolicies = await adminClient.rpc('exec_sql', { query: policiesSQL })

    // Step 6: Create helper functions
    const helperFunctions = await adminClient.rpc('exec_sql', {
      query: `CREATE OR REPLACE FUNCTION get_member_recipe_score(p_household_member_id UUID, p_recipe_id UUID)
RETURNS INTEGER AS $$
DECLARE score INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(CASE rating WHEN 'loved_it' THEN 2 WHEN 'liked_it' THEN 1 WHEN 'it_was_okay' THEN 0 WHEN 'did_not_like' THEN -2 WHEN 'did_not_eat' THEN -1 ELSE 0 END), 0) INTO score
  FROM meal_member_feedback WHERE household_member_id = p_household_member_id AND recipe_id = p_recipe_id;
  RETURN score;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_member_recipe_score(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_member_recipe_score(UUID, UUID) TO authenticated;`
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Meal learning tables created successfully',
      tables: ['meal_instances', 'meal_member_feedback']
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Setup error:', error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Setup failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})