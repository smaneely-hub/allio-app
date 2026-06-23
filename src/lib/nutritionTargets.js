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

export function poundsFromKg(valueKg) {
  const kg = Number(valueKg)
  if (!kg) return null
  return kg * 2.20462
}

export function calculateProteinTarget({ weight_kg, target_weight_kg, goal_type }) {
  const goalWeightKg = Number(target_weight_kg || 0)
  const currentWeightKg = Number(weight_kg || 0)
  const effectiveKg = goal_type && goal_type !== 'maintain'
    ? (goalWeightKg || currentWeightKg)
    : (currentWeightKg || goalWeightKg)

  const effectiveLbs = poundsFromKg(effectiveKg)
  if (!effectiveLbs) return null
  return Math.round(effectiveLbs)
}

export function splitMacros(calories, profile = {}, split = { carbs: 0.40 }) {
  if (!calories) return null
  const protein_g = calculateProteinTarget(profile)
  if (!protein_g) {
    return {
      protein_g: Math.round((calories * 0.30) / 4),
      carbs_g: Math.round((calories * split.carbs) / 4),
      fat_g: Math.round((calories * 0.30) / 9),
    }
  }

  const proteinCalories = protein_g * 4
  const remainingCalories = Math.max(0, calories - proteinCalories)
  const carbs_g = Math.round((remainingCalories * split.carbs) / 4)
  const fat_g = Math.round((remainingCalories * (1 - split.carbs)) / 9)

  return {
    protein_g,
    carbs_g,
    fat_g,
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
    target_weight_kg: row.target_weight_kg,
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
      .select('sex, age_years, height_cm, weight_kg, activity_level, goal_type, target_weight_kg, nutrition_mode, calories_target, protein_target_g, carbs_target_g, fat_target_g')
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
    const macros = splitMacros(calories, profile)

    if (!calories || !macros) return DEFAULT_DAILY_TARGETS

    return { calories, ...macros, source: 'profile' }
  } catch (error) {
    console.warn('[nutritionTargets] getDailyTargets fallback', error)
    return DEFAULT_DAILY_TARGETS
  }
}
