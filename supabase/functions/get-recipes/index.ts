import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIME_LIMITS: Record<string, number> = {
  'low': 30,
  'medium': 45,
  'high': 90,
  'default': 60
}

// Meat keywords - recipes with these in title are NOT vegetarian
const MEAT_KEYWORDS = ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage', 'ham', 'steak', 'veal', 'cod', 'salmon', 'shrimp', 'lobster', 'scallop', 'fish', 'duck', 'crab', 'mussel', 'tilapia', 'ground beef', 'ground pork']

// Vegetarian protein keywords
const VEG_PROTEINS = ['tofu', 'tempeh', 'seitan']

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      meal_type = 'dinner', 
      household = {},
      members = [],
      effort_level = 'medium',
      suggestion = '',
      exclude_recipe_ids = [] as string[],
      limit = 10
    } = await req.json()

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing Supabase configuration' 
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const maxTime = TIME_LIMITS[effort_level] || TIME_LIMITS['default']
    
    const isVegetarian = suggestion?.toLowerCase().includes('vegetarian') || 
      members?.some((m: any) => m.diet?.toLowerCase().includes('vegetarian'))
    
    console.log('[get-recipes] Vegetarian:', isVegetarian)
    
    let query = supabase
      .from('recipes')
      .select('id, title, slug, description, cuisine, meal_type, prep_time_minutes, cook_time_minutes, servings, ingredients_json, instructions_json, nutrition_json, dietary_flags_json, allergen_flags_json, tags_json, kid_friendly_score, weeknight_score, leftovers_score, difficulty, active, source_name')
      .eq('meal_type', meal_type)
      .eq('active', true)
      .neq('title', 'ilike', '%test%')
      .neq('source_name', 'test')
      .lte('cook_time_minutes', maxTime)
      .order('weeknight_score', { ascending: false })
      .limit(50)

    if (exclude_recipe_ids && exclude_recipe_ids.length > 0) {
      query = query.not('id', 'in', `(${exclude_recipe_ids.map(id => `"${id}"`).join(',')})`)
    }

    const { data: recipes, error } = await query

    if (error) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: error.message 
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Filter for production quality
    let filtered = (recipes || []).filter(r => {
      if (!r.title || r.title.trim() === '') return false
      if (r.title.toLowerCase().includes('test')) return false
      const ingredients = r.ingredients_json
      if (!ingredients || ingredients === '[]' || ingredients === '') return false
      return true
    })

    // Apply vegetarian filter - EXCLUDE meat, INCLUDE veg proteins
    if (isVegetarian) {
      filtered = filtered.filter(r => {
        const title = r.title.toLowerCase()
        
        // Must NOT have meat keyword
        for (const meat of MEAT_KEYWORDS) {
          if (title.includes(meat)) return false
        }
        
        // Must have vegetarian protein OR be pasta/rice based
        const hasVegProtein = VEG_PROTEINS.some(v => title.includes(v))
        const isPasta = title.includes('pasta') || title.includes('rice') || title.includes('noodle') || title.includes('quinoa') || title.includes('couscous')
        
        return hasVegProtein || isPasta
      })
      console.log('[get-recipes] After veg filter:', filtered.length)
    }

    // Score and rank
    const scored = filtered.map(recipe => {
      let score = 0
      score += (recipe.weeknight_score || 5) * 3
      score += (recipe.leftovers_score || 5)
      return { recipe, score }
    })

    scored.sort((a, b) => b.score - a.score)
    const topRecipes = scored.slice(0, limit).map(({ recipe }) => recipe)

    console.log('[get-recipes] Final:', topRecipes.length)

    if (!topRecipes || topRecipes.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        recipe: null,
        message: isVegetarian ? 'No vegetarian recipes found' : 'No recipes found',
        candidates: [],
        is_vegetarian: isVegetarian
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const topRecipe = topRecipes[0]

    const meal = {
      id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      meal: meal_type,
      name: topRecipe.title,
      description: topRecipe.description || '',
      prep_time_minutes: topRecipe.prep_time_minutes,
      cook_time_minutes: topRecipe.cook_time_minutes,
      servings: topRecipe.servings || 4,
      ingredients: typeof topRecipe.ingredients_json === 'string' 
        ? JSON.parse(topRecipe.ingredients_json) 
        : topRecipe.ingredients_json,
      instructions: typeof topRecipe.instructions_json === 'string' 
        ? JSON.parse(topRecipe.instructions_json) 
        : topRecipe.instructions_json,
      cuisine: topRecipe.cuisine,
      why_this_meal: `${topRecipe.cuisine} ${meal_type} - Quick weeknight dinner`,
      from_recipe_library: true,
      recipe_id: topRecipe.id,
    }

    return new Response(JSON.stringify({
      ok: true,
      recipe: topRecipe,
      meal,
      candidates: topRecipes.slice(0, 5).map(r => ({
        id: r.id,
        title: r.title,
        cuisine: r.cuisine,
      })),
      source: 'catalog',
      is_vegetarian: isVegetarian
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
