import { supabase } from './supabase'

const FUNCTION_CANDIDATES = ['generate-plan']

async function invokePlannerFunctionOnce(payload, options = {}) {
  let lastError = null

  for (const name of FUNCTION_CANDIDATES) {
    const { data, error } = await supabase.functions.invoke(name, { body: payload, ...options })
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

export async function invokePlannerFunction(payload, options = {}) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    return { data: null, error: sessionError, functionName: FUNCTION_CANDIDATES[0] }
  }

  if (!session?.access_token) {
    return {
      data: null,
      error: { message: 'Session expired, please log in again.' },
      functionName: FUNCTION_CANDIDATES[0],
    }
  }

  let result = await invokePlannerFunctionOnce(payload, options)

  const message = String(result?.error?.message || '')
  const context = String(result?.error?.context || '')
  const shouldRefreshAndRetry = message.includes('non-2xx') || /401|jwt|unauthorized/i.test(`${message} ${context}`)

  if (!result.error || !shouldRefreshAndRetry) {
    return result
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError || !refreshData?.session?.access_token) {
    return {
      ...result,
      error: { message: 'Session expired, please log in again.' },
    }
  }

  return invokePlannerFunctionOnce(payload, options)
}

// Refine an existing recipe based on feedback
export async function refineMeal(recipe, feedback) {
  console.log('[plannerFunction] refineMeal called with recipe:', recipe?.name, 'feedback:', feedback)
  
  if (!recipe || !feedback) {
    return { data: null, error: { message: 'Recipe and feedback are required' } }
  }
  
  try {
    console.log('[plannerFunction] Calling refine-meal edge function...')
    const { data, error } = await supabase.functions.invoke('refine-meal', {
      body: { recipe, feedback }
    })
    console.log('[plannerFunction] refine-meal response:', { data, error })
    
    if (error) {
      console.error('[plannerFunction] refine-meal returned error:', error)
      // Check if it's a function not found error
      if (error.message?.includes('not found') || error.message?.includes('404') || error.status === 404) {
        return { 
          data: null, 
          error: { 
            message: 'Refine feature is not available. The service may be updating.' 
          } 
        }
      }
      return { data, error }
    }
    
    return { data, error }
  } catch (err) {
    console.error('[plannerFunction] refine-meal exception:', err)
    // Provide a clearer message for connection/service issues
    if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
      return { data: null, error: { message: 'Cannot connect to service. Please check your internet connection.' } }
    }
    return { data: null, error: err }
  }
}
