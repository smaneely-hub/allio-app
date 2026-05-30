import { supabase } from '../lib/supabase'

export type Recipe = {
  id: string
  user_id?: string | null
  title: string
  slug: string
  description?: string | null
  cuisine?: string | null
  meal_type?: string | null
  prep_time_minutes?: number | null
  cook_time_minutes?: number | null
  total_time_minutes?: number | null
  servings?: number | null
  image_url?: string | null
  source_url?: string | null
  source_domain?: string | null
  source_type?: string | null
  active?: boolean | null
  difficulty?: string | null
  rating?: number | null
  is_favorite?: boolean | null
  cooked_at?: string | null
  last_cooked_at?: string | null
  times_cooked?: number | null
  category?: string[] | null
  created_at?: string | null
  updated_at?: string | null
}

async function getAuthUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

function isRecipeInteractionsQueryError(error: any): boolean {
  const msg = String(error?.message || '').toLowerCase()
  return (
    msg.includes('recipe_interactions') ||
    msg.includes('could not find a relationship') ||
    msg.includes('more than one relationship was found') ||
    msg.includes('foreign key') ||
    error?.code === 'PGRST200' ||
    error?.code === 'PGRST201' ||
    error?.code === '42P01'
  )
}

export async function toggleFavorite(recipeId: string, isFavorite: boolean): Promise<void> {
  const userId = await getAuthUserId()
  const { error } = await supabase
    .from('recipe_interactions')
    .upsert(
      { user_id: userId, recipe_id: recipeId, is_favorite: isFavorite, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,recipe_id' },
    )
  if (error) {
    if (!isRecipeInteractionsQueryError(error)) throw error
    // recipe_interactions not available — fall back to recipes table column
    const { error: fbError } = await supabase
      .from('recipes')
      .update({ is_favorite: isFavorite })
      .eq('id', recipeId)
    if (fbError) throw fbError
  }
}

export async function rateRecipe(recipeId: string, rating: number): Promise<void> {
  const userId = await getAuthUserId()
  const { error } = await supabase
    .from('recipe_interactions')
    .upsert(
      { user_id: userId, recipe_id: recipeId, rating, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,recipe_id' },
    )
  if (error) {
    if (!isRecipeInteractionsQueryError(error)) throw error
    // recipe_interactions not available — fall back to recipes table column
    const { error: fbError } = await supabase
      .from('recipes')
      .update({ rating })
      .eq('id', recipeId)
    if (fbError) throw fbError
  }
}

export async function markCooked(recipeId: string): Promise<void> {
  const userId = await getAuthUserId()
  const now = new Date().toISOString()
  const { data: existing } = await supabase
    .from('recipe_interactions')
    .select('times_cooked')
    .eq('user_id', userId)
    .eq('recipe_id', recipeId)
    .maybeSingle()
  const { error } = await supabase
    .from('recipe_interactions')
    .upsert(
      {
        user_id: userId,
        recipe_id: recipeId,
        times_cooked: (existing?.times_cooked ?? 0) + 1,
        last_cooked_at: now,
        updated_at: now,
      },
      { onConflict: 'user_id,recipe_id' },
    )
  if (error) throw error
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
  if (error) throw error
}

export async function updateRecipe(recipeId: string, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('recipes').update(payload).eq('id', recipeId)
  if (error) throw error
}

export type NutritionInfo = {
  calories: number
  protein: string
  carbs: string
  fat: string
  estimated?: boolean
}

export async function estimateRecipeNutrition(recipeId: string): Promise<NutritionInfo | null> {
  const { data, error } = await supabase.functions.invoke('estimate-recipe-nutrition', {
    body: { recipeId },
  })
  if (error || !data?.nutrition) return null
  return data.nutrition as NutritionInfo
}

export async function updateCategories(recipeId: string, categories: string[]): Promise<void> {
  const { error } = await supabase.from('recipes').update({ category: categories }).eq('id', recipeId)
  if (error) throw error
}

function applyRecipeFilters(query: any, opts: { userId?: string; cuisine?: string; mealType?: string; category?: string; search?: string; sortBy?: string }) {
  if (opts.userId) query = query.eq('user_id', opts.userId)
  if (opts.cuisine) query = query.eq('cuisine', opts.cuisine)
  if (opts.mealType) query = query.eq('meal_type', opts.mealType)
  if (opts.category) query = query.contains('category', [opts.category])
  if (opts.search?.trim()) query = query.ilike('title', `%${opts.search.trim()}%`)
  if (opts.sortBy === 'az') {
    query = query.order('title', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }
  return query
}

export async function listUserRecipes(opts: {
  userId?: string
  cuisine?: string
  mealType?: string
  minRating?: number
  category?: string
  favoritesOnly?: boolean
  sortBy?: 'newest' | 'rating' | 'favorites' | 'most_cooked' | 'az'
  search?: string
} = {}): Promise<Recipe[]> {
  let query = applyRecipeFilters(
    supabase.from('recipes').select('*, recipe_interactions(is_favorite, rating, times_cooked, last_cooked_at)').eq('active', true),
    opts,
  )

  let { data, error } = await query

  if (error) {
    // recipe_interactions join can fail when the relation is missing, ambiguous, or malformed in prod.
    if (!isRecipeInteractionsQueryError(error)) throw error
    const fallback = await applyRecipeFilters(
      supabase.from('recipes').select('*').eq('active', true),
      opts,
    )
    if (fallback.error) throw fallback.error
    data = fallback.data
  }

  let results = ((data || []) as any[]).map((row) => {
    const interaction = Array.isArray(row.recipe_interactions) ? row.recipe_interactions[0] : null
    return {
      ...row,
      is_favorite: interaction?.is_favorite ?? row.is_favorite ?? false,
      rating: interaction?.rating ?? row.rating ?? null,
      times_cooked: interaction?.times_cooked ?? 0,
      last_cooked_at: interaction?.last_cooked_at ?? row.cooked_at ?? null,
    }
  })

  if (opts.minRating) {
    results = results.filter((r) => (r.rating ?? 0) >= (opts.minRating ?? 0))
  }
  if (opts.favoritesOnly) {
    results = results.filter((r) => r.is_favorite)
  }

  if (opts.sortBy === 'rating') {
    results = results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  } else if (opts.sortBy === 'favorites') {
    results = results.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0))
  } else if (opts.sortBy === 'most_cooked') {
    results = results.sort((a, b) => (b.times_cooked ?? 0) - (a.times_cooked ?? 0))
  }

  return results as Recipe[]
}
