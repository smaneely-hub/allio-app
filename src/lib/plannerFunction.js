import { supabase } from './supabase'

const FUNCTION_CANDIDATES = ['meal-generate', 'generate-plan']

export async function invokePlannerFunction(payload) {
  let lastError = null

  for (const name of FUNCTION_CANDIDATES) {
    const { data, error } = await supabase.functions.invoke(name, { body: payload })
    if (!error) {
      return { data, error: null, functionName: name }
    }
    lastError = error
    const message = String(error?.message || '')
    const shouldRetry = message.includes('non-2xx') || /401|jwt|unauthorized/i.test(message)
    if (!shouldRetry) {
      return { data: null, error, functionName: name }
    }
  }

  return { data: null, error: lastError, functionName: FUNCTION_CANDIDATES[FUNCTION_CANDIDATES.length - 1] }
}

// Refine an existing recipe based on feedback
export async function refineMeal(recipe, feedback) {
  console.log('[plannerFunction] refineMeal called with recipe:', recipe?.name, 'feedback:', feedback)
  try {
    const { data, error } = await supabase.functions.invoke('refine-meal', {
      body: { recipe, feedback }
    })
    console.log('[plannerFunction] refine-meal response:', { data, error })
    return { data, error }
  } catch (err) {
    console.error('[plannerFunction] refine-meal exception:', err)
    return { data: null, error: err }
  }
}
