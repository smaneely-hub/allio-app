import { supabase } from './supabase'

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function dayKeyFromIsoDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return DAY_KEYS[new Date(year, month - 1, day).getDay()]
}

/**
 * Adds a nutrition log entry to the user's current meal plan (explicit user action only).
 * Returns { alreadyExists: boolean }.
 */
export async function addNutritionLogToPlanner({ userId, logEntry }) {
  const { data: mealPlan, error } = await supabase
    .from('meal_plans')
    .select('id, draft_plan, plan')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!mealPlan) throw new Error('No meal plan found. Create a plan in the Planner first.')

  const currentMeals = mealPlan.draft_plan?.meals || mealPlan.plan?.meals || []

  const isDuplicate = currentMeals.some(
    (m) => m.name === logEntry.entry_name
      && m.date === logEntry.log_date
      && m.meal === logEntry.meal_slot,
  )
  if (isDuplicate) return { alreadyExists: true }

  const newMeal = {
    id: crypto.randomUUID(),
    day: dayKeyFromIsoDate(logEntry.log_date),
    meal: logEntry.meal_slot,
    date: logEntry.log_date,
    name: logEntry.entry_name,
    source: 'manual',
    source_type: 'manual',
    servings: logEntry.servings || 1,
    nutrition: {
      calories: logEntry.calories,
      protein: logEntry.protein_g,
      carbs: logEntry.carbs_g,
      fat: logEntry.fat_g,
    },
  }

  const basePlan = mealPlan.draft_plan || mealPlan.plan || {}
  const nextPlan = { ...basePlan, meals: [...currentMeals, newMeal] }

  const { error: saveError } = await supabase
    .from('meal_plans')
    .update({ draft_plan: nextPlan, plan: nextPlan, updated_at: new Date().toISOString() })
    .eq('id', mealPlan.id)

  if (saveError) throw saveError
  return { alreadyExists: false }
}
