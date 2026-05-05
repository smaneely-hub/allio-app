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
  category?: string[] | null
  created_at?: string | null
  updated_at?: string | null
}

export async function toggleFavorite(recipeId: string, isFavorite: boolean): Promise<void> {
  const { error } = await supabase.from('recipes').update({ is_favorite: isFavorite }).eq('id', recipeId)
  if (error) throw error
}

export async function rateRecipe(recipeId: string, rating: number): Promise<void> {
  const { error } = await supabase.from('recipes').update({ rating }).eq('id', recipeId)
  if (error) throw error
}

export async function markCooked(recipeId: string): Promise<void> {
  const { error } = await supabase.from('recipes').update({ cooked_at: new Date().toISOString() }).eq('id', recipeId)
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

export async function updateCategories(recipeId: string, categories: string[]): Promise<void> {
  const { error } = await supabase.from('recipes').update({ category: categories }).eq('id', recipeId)
  if (error) throw error
}

export async function listUserRecipes(opts: {
  userId?: string
  cuisine?: string
  mealType?: string
  minRating?: number
  category?: string
  favoritesOnly?: boolean
  sortBy?: 'newest' | 'rating' | 'favorites'
  search?: string
} = {}): Promise<Recipe[]> {
  let query = supabase
    .from('recipes')
    .select('*')
    .eq('active', true)

  if (opts.userId) query = query.eq('user_id', opts.userId)

  if (opts.cuisine) query = query.eq('cuisine', opts.cuisine)
  if (opts.mealType) query = query.eq('meal_type', opts.mealType)
  if (opts.minRating) query = query.gte('rating', opts.minRating)
  if (opts.category) query = query.contains('category', [opts.category])
  if (opts.favoritesOnly) query = query.eq('is_favorite', true)
  if (opts.search?.trim()) query = query.ilike('title', `%${opts.search.trim()}%`)

  if (opts.sortBy === 'rating') {
    query = query.order('rating', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
  } else if (opts.sortBy === 'favorites') {
    query = query.order('is_favorite', { ascending: false }).order('created_at', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Recipe[]
}
