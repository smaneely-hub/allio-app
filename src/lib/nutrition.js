// Mifflin-St Jeor TDEE calculation and macro derivation.

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS = {
  sedentary: 'Sedentary (little/no exercise)',
  light: 'Light (1–3 days/week)',
  moderate: 'Moderate (3–5 days/week)',
  active: 'Active (6–7 days/week)',
  very_active: 'Very active (physical job or 2x/day)',
}

export const GOAL_LABELS = {
  lose: 'Lose weight',
  maintain: 'Maintain weight',
  gain: 'Gain weight',
}

const GOAL_ADJUSTMENTS = {
  lose: -500,
  maintain: 0,
  gain: 500,
}

export function calculateBMR({ weight_kg, height_cm, age_years, sex }) {
  const w = Number(weight_kg)
  const h = Number(height_cm)
  const a = Number(age_years)
  if (!w || !h || !a || !sex) return null
  return sex === 'male'
    ? Math.round(10 * w + 6.25 * h - 5 * a + 5)
    : Math.round(10 * w + 6.25 * h - 5 * a - 161)
}

export function calculateTDEE({ weight_kg, height_cm, age_years, sex, activity_level }) {
  const bmr = calculateBMR({ weight_kg, height_cm, age_years, sex })
  if (!bmr) return null
  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] || 1.55
  return Math.round(bmr * multiplier)
}

export function calculateTargetCalories({ weight_kg, height_cm, age_years, sex, activity_level, goal_type }) {
  const tdee = calculateTDEE({ weight_kg, height_cm, age_years, sex, activity_level })
  if (!tdee) return null
  const adjustment = GOAL_ADJUSTMENTS[goal_type] ?? 0
  return Math.max(1200, tdee + adjustment)
}

// Default macro split: protein 30%, carbs 40%, fat 30% (4/4/9 kcal per gram)
export function calculateMacros(calories) {
  if (!calories) return null
  return {
    protein_g: Math.round((calories * 0.30) / 4),
    carbs_g: Math.round((calories * 0.40) / 4),
    fat_g: Math.round((calories * 0.30) / 9),
  }
}

// Returns the effective targets given a profile, respecting auto vs manual mode.
// Returns null if not enough data to derive targets.
export function deriveNutritionTargets(profile) {
  if (!profile) return null
  const { nutrition_mode, calories_target, protein_target_g, carbs_target_g, fat_target_g } = profile

  if (nutrition_mode === 'manual' && calories_target) {
    return {
      calories: Number(calories_target),
      protein_g: protein_target_g ? Number(protein_target_g) : null,
      carbs_g: carbs_target_g ? Number(carbs_target_g) : null,
      fat_g: fat_target_g ? Number(fat_target_g) : null,
    }
  }

  const calories = calculateTargetCalories(profile)
  if (!calories) return null
  const macros = calculateMacros(calories)
  return { calories, ...macros }
}
