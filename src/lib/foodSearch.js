import { supabase } from './supabase'

function mapFood(row) {
  if (!row) return null
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand || '',
    category: row.category || 'general',
    source: row.source || 'seeded',
    serving_label: row.serving_label || '1 serving',
    serving_amount: Number(row.serving_amount || 1),
    calories: Number(row.calories || 0),
    protein_g: Number(row.protein_g || 0),
    carbs_g: Number(row.carbs_g || 0),
    fat_g: Number(row.fat_g || 0),
    verified: Boolean(row.verified),
  }
}

export async function searchFoodItems(query = '') {
  const normalized = String(query || '').trim()
  let builder = supabase
    .from('food_items')
    .select('*')
    .order('verified', { ascending: false })
    .order('name', { ascending: true })
    .limit(30)

  if (normalized) {
    builder = builder.or(`name.ilike.%${normalized}%,brand.ilike.%${normalized}%,search_terms.cs.{${normalized.toLowerCase()}}`)
  }

  const { data, error } = await builder
  if (error) throw error
  return (data || []).map(mapFood).filter(Boolean)
}

export async function getRecentFoods(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('meal_nutrition_logs')
    .select('food_item_id, entry_name, calories, protein_g, carbs_g, fat_g, notes, food_items(*)')
    .eq('user_id', userId)
    .not('food_item_id', 'is', null)
    .order('logged_at', { ascending: false })
    .limit(12)
  if (error) throw error
  const seen = new Set()
  return (data || []).map((row) => mapFood(row.food_items)).filter((item) => item && !seen.has(item.id) && seen.add(item.id))
}

export async function getSavedFoods(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('user_saved_foods')
    .select('food_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((row) => mapFood(row.food_items)).filter(Boolean)
}

export async function saveFoodForUser(userId, foodItemId) {
  const { error } = await supabase.from('user_saved_foods').upsert({ user_id: userId, food_item_id: foodItemId }, { onConflict: 'user_id,food_item_id' })
  if (error) throw error
}

export async function removeSavedFoodForUser(userId, foodItemId) {
  const { error } = await supabase.from('user_saved_foods').delete().eq('user_id', userId).eq('food_item_id', foodItemId)
  if (error) throw error
}
