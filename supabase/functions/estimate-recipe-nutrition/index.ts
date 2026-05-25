import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin, requireAuth } from '../_shared/security.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LLM_API_KEY') || ''

type NutritionInfo = { calories: number; protein: string; carbs: string; fat: string; estimated?: boolean }

async function estimateNutrition(ingredients: string[], servings: number | null): Promise<NutritionInfo | null> {
  if (!OPENROUTER_API_KEY || ingredients.length === 0) return null
  const servingCount = servings && servings > 0 ? servings : 4
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Estimate per-serving macros for a recipe. Return ONLY valid JSON: {"calories":number,"protein":"Xg","carbs":"Xg","fat":"Xg"}. Round calories to nearest 5, macros to nearest gram.',
          },
          {
            role: 'user',
            content: `Servings: ${servingCount}\nIngredients:\n${ingredients.join('\n')}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return null
    const json = await response.json()
    const content = json.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    const calories = typeof parsed.calories === 'number' ? parsed.calories : parseInt(String(parsed.calories), 10)
    if (!calories || !Number.isFinite(calories) || calories <= 0) return null
    return {
      calories: Math.round(calories),
      protein: typeof parsed.protein === 'string' ? parsed.protein : `${Math.round(Number(parsed.protein) || 0)}g`,
      carbs: typeof parsed.carbs === 'string' ? parsed.carbs : `${Math.round(Number(parsed.carbs) || 0)}g`,
      fat: typeof parsed.fat === 'string' ? parsed.fat : `${Math.round(Number(parsed.fat) || 0)}g`,
      estimated: true,
    }
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflight(req)

  const blockedOrigin = rejectDisallowedOrigin(req)
  if (blockedOrigin) return blockedOrigin

  const origin = req.headers.get('origin')
  const corsHeaders = { ...buildCorsHeaders(origin), 'Content-Type': 'application/json' }

  try {
    const auth = await requireAuth(req, SUPABASE_URL, SUPABASE_ANON_KEY)
    if (auth.response) return auth.response

    const body = await req.json()
    const recipeId = typeof body?.recipeId === 'string' ? body.recipeId.trim() : ''
    if (!recipeId) {
      return new Response(JSON.stringify({ error: 'recipeId is required' }), { status: 400, headers: corsHeaders })
    }

    // Use user's auth so RLS enforces recipe ownership on both read and write
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth.authorization! } },
    })

    const { data: recipe, error: fetchError } = await authClient
      .from('recipes')
      .select('id, ingredients_json, ingredient_groups_json, servings, nutrition_json')
      .eq('id', recipeId)
      .maybeSingle()

    if (fetchError || !recipe) {
      return new Response(JSON.stringify({ error: 'Recipe not found' }), { status: 404, headers: corsHeaders })
    }

    // Preserve existing nutrition — never overwrite
    if (recipe.nutrition_json) {
      return new Response(JSON.stringify({ nutrition: recipe.nutrition_json }), { headers: corsHeaders })
    }

    // Build ingredient strings — prefer grouped format, fall back to flat
    const ingredients: string[] = []
    const groups = recipe.ingredient_groups_json
    const flat = recipe.ingredients_json

    if (Array.isArray(groups) && groups.length > 0) {
      for (const group of groups) {
        for (const ing of (group.ingredients || [])) {
          if (typeof ing === 'string') {
            ingredients.push(ing)
          } else if (ing && typeof ing === 'object') {
            const ingObj = ing as Record<string, unknown>
            const parts = [ingObj.amount, ingObj.unit, ingObj.item].filter(Boolean).join(' ').trim()
            if (parts) ingredients.push(parts)
          }
        }
      }
    } else if (Array.isArray(flat)) {
      for (const ing of flat) {
        if (typeof ing === 'string') {
          ingredients.push(ing)
        } else if (ing && typeof ing === 'object') {
          const ingObj = ing as Record<string, unknown>
          const parts = [ingObj.amount, ingObj.unit, ingObj.item].filter(Boolean).join(' ').trim()
          if (parts) ingredients.push(parts)
        }
      }
    }

    if (ingredients.length === 0) {
      return new Response(JSON.stringify({ error: 'No ingredients found on recipe' }), { status: 422, headers: corsHeaders })
    }

    console.log('[estimate-recipe-nutrition] Estimating for recipe', recipeId, '—', ingredients.length, 'ingredients')
    const nutrition = await estimateNutrition(ingredients, recipe.servings)

    if (!nutrition) {
      return new Response(JSON.stringify({ error: 'Could not estimate nutrition' }), { status: 422, headers: corsHeaders })
    }

    // Save result — RLS allows owner to update their own recipe
    await authClient.from('recipes').update({ nutrition_json: nutrition }).eq('id', recipeId)

    return new Response(JSON.stringify({ nutrition }), { headers: corsHeaders })
  } catch (error) {
    console.error('[estimate-recipe-nutrition] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Estimation failed' }),
      { status: 500, headers: corsHeaders },
    )
  }
})
