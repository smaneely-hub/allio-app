export const DEFAULT_DAILY_TARGETS = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 200,
  fat_g: 67,
  source: 'default',
}

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
  high: 1.725,
}

export function computeBMR({ sex, age_years, height_cm, weight_kg }) {
  const age = Number(age_years)
  const height = Number(height_cm)
  const weight = Number(weight_kg)
  if (!sex || !age || !height || !weight) return null
  if (sex === 'male') return Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5)
  if (sex === 'female') return Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161)
  return Math.round((10 * weight) + (6.25 * height) - (5 * age) - 78)
}

export function applyActivityMultiplier(bmr, activity_level) {
  if (!bmr) return null
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activity_level] || ACTIVITY_MULTIPLIERS.moderate))
}

export function applyGoalDelta(tdee, goal) {
  if (!tdee) return null
  const delta = goal === 'lose' ? -500 : goal === 'gain' ? 300 : 0
  return Math.min(4500, Math.max(1200, tdee + delta))
}

export function splitMacros(calories, split = { protein: 0.30, carbs: 0.40, fat: 0.30 }) {
  if (!calories) return null
  return {
    protein_g: Math.round((calories * split.protein) / 4),
    carbs_g: Math.round((calories * split.carbs) / 4),
    fat_g: Math.round((calories * split.fat) / 9),
  }
}

function normalizeProfile(row) {
  if (!row) return null
  return {
    sex: row.sex || '',
    age_years: row.age_years,
    height_cm: row.height_cm,
    weight_kg: row.weight_kg,
    activity_level: row.activity_level || 'moderate',
    goal_type: row.goal_type || 'maintain',
    nutrition_mode: row.nutrition_mode || 'auto',
    calories_target: row.calories_target,
    protein_target_g: row.protein_target_g,
    carbs_target_g: row.carbs_target_g,
    fat_target_g: row.fat_target_g,
  }
}

export async function getDailyTargets(userId) {
  try {
    if (!userId) return DEFAULT_DAILY_TARGETS
    const { supabase } = await import('./supabase')
    const { data, error } = await supabase
      .from('user_preferences')
      .select('sex, age_years, height_cm, weight_kg, activity_level, goal_type, nutrition_mode, calories_target, protein_target_g, carbs_target_g, fat_target_g')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.warn('[nutritionTargets] getDailyTargets error', error)
      return DEFAULT_DAILY_TARGETS
    }

    const profile = normalizeProfile(data)
    if (!profile) return DEFAULT_DAILY_TARGETS

    if (profile.nutrition_mode === 'manual' && Number(profile.calories_target)) {
      return {
        calories: Number(profile.calories_target),
        protein_g: Number(profile.protein_target_g || DEFAULT_DAILY_TARGETS.protein_g),
        carbs_g: Number(profile.carbs_target_g || DEFAULT_DAILY_TARGETS.carbs_g),
        fat_g: Number(profile.fat_target_g || DEFAULT_DAILY_TARGETS.fat_g),
        source: 'profile',
      }
    }

    const bmr = computeBMR(profile)
    const tdee = applyActivityMultiplier(bmr, profile.activity_level)
    const calories = applyGoalDelta(tdee, profile.goal_type)
    const macros = splitMacros(calories)

    if (!calories || !macros) return DEFAULT_DAILY_TARGETS

    return { calories, ...macros, source: 'profile' }
  } catch (error) {
    console.warn('[nutritionTargets] getDailyTargets fallback', error)
    return DEFAULT_DAILY_TARGETS
  }
}
