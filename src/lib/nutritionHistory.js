import { supabase } from './supabase'

function sinceDate(days) {
  const d = new Date()
  d.setDate(d.getDate() - days + 1)
  return d.toISOString().slice(0, 10)
}

export async function loadDailyNutritionHistory(userId, days = 30) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('daily_nutrition_logs')
    .select('log_date, total_calories, total_protein_g, total_carbs_g, total_fat_g')
    .eq('user_id', userId)
    .gte('log_date', sinceDate(days))
    .order('log_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function loadWeightHistory(userId, days = 30) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('health_metric_logs')
    .select('id, value, recorded_on')
    .eq('user_id', userId)
    .eq('metric_type', 'weight_kg')
    .gte('recorded_on', sinceDate(days))
    .order('recorded_on', { ascending: true })
  if (error) throw error
  return data || []
}

export async function loadWeightPrefs(userId) {
  if (!userId) return { targetWeightKg: null, isMetric: false }
  const { data } = await supabase
    .from('user_preferences')
    .select('target_weight_kg, unit_system')
    .eq('user_id', userId)
    .maybeSingle()
  return {
    targetWeightKg: data?.target_weight_kg ?? null,
    isMetric: data?.unit_system === 'metric',
  }
}
