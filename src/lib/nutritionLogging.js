import { supabase } from './supabase'
import { getLocalDateString } from './date'

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function buildMealNutritionSnapshot(meal = {}) {
  const nutrition = meal.nutrition || {}
  const calories = toNumber(meal.calories || nutrition.calories)
  const protein_g = toNumber(meal.protein || nutrition.protein)
  const carbs_g = toNumber(meal.carbs || nutrition.carbs)
  const fat_g = toNumber(meal.fat || nutrition.fat)
  const hasNutrition = calories > 0 || protein_g > 0 || carbs_g > 0 || fat_g > 0

  return {
    hasNutrition,
    payload: {
      log_date: getLocalDateString(),
      meal_slot: meal.meal || meal.slot || 'dinner',
      entry_name: meal.name || meal.title || 'Meal',
      recipe_id: meal.recipe_id || null,
      recipe_name: meal.name || meal.title || null,
      servings: Number(meal.servings || 1) || 1,
      calories,
      protein_g,
      carbs_g,
      fat_g,
      nutrition_source: 'recipe',
      notes: null,
    },
  }
}

export function isNutritionLoggingUnavailable(error) {
  const message = String(error?.message || '')
  return error?.code === 'PGRST205'
    || error?.code === 'PGRST202'
    || message.includes('meal_nutrition_logs')
    || message.includes('daily_nutrition_logs')
    || message.includes('recompute_daily_nutrition_log')
}

export async function autoLogCookedMealNutrition({ userId, mealInstanceId, meal }) {
  const snapshot = buildMealNutritionSnapshot(meal)
  if (!snapshot.hasNutrition) {
    return { ok: false, reason: 'missing_nutrition' }
  }

  const payload = {
    user_id: userId,
    source_type: 'planner',
    meal_instance_id: mealInstanceId,
    logged_at: new Date().toISOString(),
    ...snapshot.payload,
  }

  const { data, error } = await supabase
    .from('meal_nutrition_logs')
    .upsert(payload, { onConflict: 'meal_instance_id' })
    .select('id, log_date, calories')
    .single()

  if (error) throw error

  const { error: recomputeError } = await supabase.rpc('recompute_daily_nutrition_log', {
    p_user_id: userId,
    p_log_date: payload.log_date,
  })

  if (recomputeError) throw recomputeError

  return { ok: true, calories: data?.calories || payload.calories || 0, logDate: payload.log_date }
}
