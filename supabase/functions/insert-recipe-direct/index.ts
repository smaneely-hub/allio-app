import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function toLegacyIngredients(recipe: any) {
  if (Array.isArray(recipe.ingredients_json)) return recipe.ingredients_json
  if (Array.isArray(recipe.ingredientGroups)) {
    return recipe.ingredientGroups.flatMap((group: any) => Array.isArray(group?.ingredients) ? group.ingredients : [])
  }
  return Array.isArray(recipe.ingredients) ? recipe.ingredients : []
}

function toLegacyInstructions(recipe: any) {
  if (Array.isArray(recipe.instructions_json)) return recipe.instructions_json
  if (Array.isArray(recipe.instructionGroups)) {
    return recipe.instructionGroups.flatMap((group: any) => Array.isArray(group?.steps) ? group.steps : [])
  }
  return Array.isArray(recipe.instructions) ? recipe.instructions : []
}

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
    const { recipe } = await req.json()
    
    if (!recipe) {
      return new Response(JSON.stringify({ error: 'Missing recipe' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const payload = {
      ...recipe,
      yield_text: recipe.yield_text || recipe.yield || null,
      total_time_minutes: recipe.total_time_minutes || recipe.totalTime || ((recipe.prep_time_minutes || recipe.prepTime || 0) + (recipe.cook_time_minutes || recipe.cookTime || 0)),
      ingredient_groups_json: recipe.ingredient_groups_json || recipe.ingredientGroups || null,
      instruction_groups_json: recipe.instruction_groups_json || recipe.instructionGroups || null,
      ingredients_json: recipe.ingredients_json || toLegacyIngredients(recipe),
      instructions_json: recipe.instructions_json || toLegacyInstructions(recipe),
      tips_json: recipe.tips_json || recipe.tips || [],
      substitutions_json: recipe.substitutions_json || recipe.substitutions || [],
      tags_v2_json: recipe.tags_v2_json || recipe.tags || null,
      source_note: recipe.source_note || recipe.sourceNote || null,
      image_prompt: recipe.image_prompt || recipe.imagePrompt || null,
    }

    const { data, error } = await supabase.from('recipes').insert(payload).select()
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, data }), {
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
