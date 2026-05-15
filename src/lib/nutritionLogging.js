import { supabase } from './supabase'
import { getLocalDateString } from './date'

const VALID_MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack']

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
      status: hasNutrition ? 'final' : 'estimate_required',
      notes: null,
    },
  }
}

function normalizeMealSlot(value = 'dinner') {
  return VALID_MEAL_SLOTS.includes(value) ? value : 'dinner'
}

async function recomputeDaily(userId, logDate) {
  const { error } = await supabase.rpc('recompute_daily_nutrition_log', {
    p_user_id: userId,
    p_log_date: logDate,
  })
  if (error) throw error
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

  await recomputeDaily(userId, payload.log_date)

  if (!snapshot.hasNutrition) {
    return { ok: false, reason: 'missing_nutrition_logged', calories: 0, logDate: payload.log_date }
  }

  return { ok: true, calories: data?.calories || payload.calories || 0, logDate: payload.log_date }
}

export async function addPlannedMealLog({ user_id, log_date, meal }) {
  const snapshot = buildMealNutritionSnapshot({
    ...meal,
    meal: meal.meal || meal.slot || 'dinner',
    servings: 1,
  })

  const payload = {
    user_id,
    log_date: log_date || getLocalDateString(),
    meal_slot: normalizeMealSlot(meal.meal || meal.slot || 'dinner'),
    entry_name: meal.name || meal.title || 'Planned meal',
    source_type: 'planner',
    meal_instance_id: null,
    recipe_id: meal.recipe_id || null,
    recipe_name: meal.name || meal.title || null,
    servings: 1,
    calories: snapshot.payload.calories,
    protein_g: snapshot.payload.protein_g,
    carbs_g: snapshot.payload.carbs_g,
    fat_g: snapshot.payload.fat_g,
    nutrition_source: snapshot.payload.nutrition_source,
    status: snapshot.hasNutrition ? 'final' : 'estimate_required',
    notes: 'Auto-added from meal plan',
    logged_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('meal_nutrition_logs').insert(payload).select('*').single()
  if (error) throw error
  await recomputeDaily(user_id, payload.log_date)
  return data
}

export async function addManualMealLog({ user_id, log_date, meal_slot, name, calories, protein_g = 0, carbs_g = 0, fat_g = 0, recipe_id = null, food_item_id = null, notes = null, source_type = 'manual', serving_count = 1 }) {
  const payload = {
    user_id,
    log_date: log_date || getLocalDateString(),
    meal_slot: normalizeMealSlot(meal_slot),
    entry_name: String(name || '').trim() || 'Manual entry',
    source_type,
    recipe_id,
    food_item_id,
    recipe_name: null,
    servings: toNumber(serving_count) || 1,
    calories: toNumber(calories),
    protein_g: toNumber(protein_g),
    carbs_g: toNumber(carbs_g),
    fat_g: toNumber(fat_g),
    nutrition_source: recipe_id ? 'recipe' : food_item_id ? 'food_item' : 'manual',
    status: 'final',
    notes,
    logged_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('meal_nutrition_logs').insert(payload).select('*').single()
  if (error) throw error
  await recomputeDaily(user_id, payload.log_date)
  return data
}

export async function updateMealLog(id, patch) {
  const { data: existing, error: loadError } = await supabase.from('meal_nutrition_logs').select('*').eq('id', id).single()
  if (loadError) throw loadError
  if (existing.source_type === 'planner' && Object.prototype.hasOwnProperty.call(patch, 'meal_instance_id')) {
    throw new Error('Cannot modify planner meal_instance_id')
  }

  const next = {
    ...patch,
    meal_slot: patch.meal_slot ? normalizeMealSlot(patch.meal_slot) : existing.meal_slot,
    calories: patch.calories != null ? toNumber(patch.calories) : existing.calories,
    protein_g: patch.protein_g != null ? toNumber(patch.protein_g) : existing.protein_g,
    carbs_g: patch.carbs_g != null ? toNumber(patch.carbs_g) : existing.carbs_g,
    fat_g: patch.fat_g != null ? toNumber(patch.fat_g) : existing.fat_g,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase.from('meal_nutrition_logs').update(next).eq('id', id).select('*').single()
  if (error) throw error
  await recomputeDaily(existing.user_id, data.log_date)
  if (data.log_date !== existing.log_date) await recomputeDaily(existing.user_id, existing.log_date)
  return data
}

export async function deleteMealLog(id) {
  const { data: existing, error: loadError } = await supabase.from('meal_nutrition_logs').select('*').eq('id', id).single()
  if (loadError) throw loadError
  const { error } = await supabase.from('meal_nutrition_logs').delete().eq('id', id)
  if (error) throw error
  await recomputeDaily(existing.user_id, existing.log_date)
  return existing
}
