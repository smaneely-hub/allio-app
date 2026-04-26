import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { aggregateShoppingList } from '../lib/aggregateShoppingList'
import { normalizeMealPlan, normalizeMealRecord } from '../lib/mealSchema'
import { invokePlannerFunction } from '../lib/plannerFunction'
import { upsertShoppingListForDate } from '../lib/tonightPersistence'
import { useAuth } from './useAuth'

function withMealDefaults(plan, fallbackSlots = []) {
  return normalizeMealPlan(plan, fallbackSlots)
}

async function invokeGeneratePlan(payload) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  console.log('[useMealPlan] generate-plan session present:', Boolean(session))

  let activeSession = session

  if (!activeSession?.access_token) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError) {
      throw refreshError
    }
    activeSession = refreshData.session
  }

  if (!activeSession?.access_token) {
    console.error('[useMealPlan] No active session while calling generate-plan')
    throw new Error('No active session — user must log in')
  }

  const tokenExpired = activeSession.expires_at ? Date.now() >= activeSession.expires_at * 1000 : false
  console.log('[useMealPlan] generate-plan token ready:', { hasToken: Boolean(activeSession.access_token), tokenExpired })
  console.log('[useMealPlan] generate-plan request headers prepared:', { hasAuthorization: true, hasApiKey: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY) })

  let result = await invokePlannerFunction(payload).then(({ data, error, functionName }) => {
      console.log('[useMealPlan] planner function used:', functionName)
      return { data, error }
  }).then(({ data, error }) => {
    return error
      ? { data: null, error: { message: error?.message || 'Function invoke failed', context: error?.context || error, status: error?.status || 500 } }
      : { data, error: null }
  }).catch((error) => {
    if (error?.name === 'AbortError') {
      return { data: null, error: { message: 'generate-plan timed out after 45 seconds', context: null, status: 408 } }
    }
    throw error
  })

  if (result.error && (String(result.error.message || '').includes('non-2xx') || String(result.error.context || '').includes('401') || String(result.error.message || '').toLowerCase().includes('jwt'))) {
    const { data: retryData, error: retryRefreshError } = await supabase.auth.refreshSession()
    if (!retryRefreshError && retryData.session?.access_token) {
      result = await invokePlannerFunction(payload).then(({ data, error, functionName }) => {
        console.log('[useMealPlan] planner retry function used:', functionName)
        return { data, error }
      }).then(({ data, error }) => {
        return error
          ? { data: null, error: { message: error?.message || 'Function invoke failed', context: error?.context || error, status: error?.status || 500 } }
          : { data, error: null }
      }).catch((error) => {
        if (error?.name === 'AbortError') {
          return { data: null, error: { message: 'generate-plan timed out after 45 seconds', context: null, status: 408 } }
        }
        throw error
      })
    }
  }

  return result
}

export function useMealPlan(scheduleId) {
  const { user } = useAuth()
  const [mealPlan, setMealPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [swappingMealId, setSwappingMealId] = useState(null)
  const [error, setError] = useState(null)

  const recentSwappedMealNames = useMemo(() => (
    (mealPlan?.draft_plan?.meals || [])
      .filter((meal) => meal.swapped && (meal.original_name || meal.name))
      .map((meal) => meal.original_name || meal.name)
      .slice(-3)
  ), [mealPlan])

  const loadMealPlan = useCallback(async () => {
    if (!user || !scheduleId) {
      setMealPlan(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: loadError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('schedule_id', scheduleId)
        .limit(1)
        .maybeSingle()

      if (loadError) throw loadError
      const fallbackSlots = Array.isArray(data?.draft_plan?.meals) ? data.draft_plan.meals : Array.isArray(data?.plan?.meals) ? data.plan.meals : []
      setMealPlan(data ? { ...data, draft_plan: withMealDefaults(data.draft_plan || data.plan || {}, fallbackSlots), plan: withMealDefaults(data.plan || data.draft_plan || {}, fallbackSlots) } : null)
    } catch (err) {
      setError(err)
      toast.error("Couldn't load your data. Give it another shot.")
    } finally {
      setLoading(false)
    }
  }, [scheduleId, user])

  useEffect(() => {
    loadMealPlan()
  }, [loadMealPlan])

  const persistPlan = useCallback(
    async (nextPlan, nextStatus) => {
      if (!mealPlan?.id) throw new Error('No meal plan available to persist.')

      const payload = {
        ...mealPlan,
        status: nextStatus ?? mealPlan.status,
        draft_plan: nextPlan,
        plan: nextPlan,
        updated_at: new Date().toISOString(),
      }

      if ((nextStatus ?? mealPlan.status) === 'active') {
        const today = new Date().toISOString().split('T')[0]
        const { data: household } = await supabase
          .from('households')
          .select('id, staples_on_hand')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        const items = aggregateShoppingList(nextPlan, household?.staples_on_hand || '')

        try {
          await upsertShoppingListForDate({
            userId: user.id,
            householdId: household?.id || null,
            weekOf: today,
            items,
          })
        } catch (listError) {
          console.error('[useMealPlan] Shopping list error:', listError)
        }
      }

      const { data, error: saveError } = await supabase
        .from('meal_plans')
        .update({
          status: payload.status,
          draft_plan: payload.draft_plan,
          plan: payload.plan,
          updated_at: payload.updated_at,
        })
        .eq('id', mealPlan.id)
        .select('*')
        .single()

      if (saveError) throw saveError
      setMealPlan({ ...data, draft_plan: withMealDefaults(data.draft_plan || data.plan || {}), plan: withMealDefaults(data.plan || data.draft_plan || {}) })
      return data
    },
    [mealPlan, user],
  )

  const generateMealPlan = useCallback(async (overrideScheduleId = null) => {
    const activeScheduleId = overrideScheduleId ?? scheduleId
    if (!user || !activeScheduleId) throw new Error('Schedule is required before generating a meal plan.')

    setGenerating(true)
    setError(null)

    try {
      const { data: household, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single()
      if (householdError) throw householdError

      const { data: members, error: membersError } = await supabase
        .from('household_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('household_id', household.id)
      if (membersError) throw membersError

      const { data: slots, error: slotsError } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('user_id', user.id)
        .eq('schedule_id', activeScheduleId)
      if (slotsError) throw slotsError

      // Also fetch the schedule to get week_notes
      const { data: schedule } = await supabase
        .from('weekly_schedules')
        .select('week_notes')
        .eq('id', activeScheduleId)
        .maybeSingle()
      

      const lockedMeals = mealPlan?.draft_plan?.meals?.filter((meal) => meal.locked) || []
      
      // Only keep locked meals that match current scheduled slots
      const slotKey = (s) => `${String(s?.day || '').trim()}-${String(s?.meal || '').trim()}`
      const currentSlotKeys = new Set(slots.map(slotKey))
      const validLockedMeals = lockedMeals.filter((m) => currentSlotKeys.has(`${m.day}-${m.meal}`))
      
      const payload = {
        household: {
          total_people: household.total_people,
          diet_focus: household.diet_focus,
          budget_sensitivity: household.budget_sensitivity,
          adventurousness: household.adventurousness,
          staples_on_hand: household.staples_on_hand,
          planning_priorities: household.planning_priorities,
          cooking_comfort: household.cooking_comfort,
        },
        members: members.map((member) => ({
          label: member.name || member.label,
          role: member.role,
          age: member.age,
          restrictions: member.restrictions,
          preferences: member.preferences,
          dietary_restrictions: member.dietary_restrictions || [],
          food_preferences: member.food_preferences || [],
          health_considerations: member.health_considerations || [],
        })),
        slots: slots
          .map((slot) => ({
            day: typeof slot?.day === 'string' ? slot.day.trim().slice(0, 3).toLowerCase() : '',
            meal: typeof slot?.meal === 'string' ? slot.meal.trim().toLowerCase().replace(/\s+/g, '_') : '',
            attendees: Array.isArray(slot?.attendees) ? slot.attendees : [],
            effort_level: slot?.effort_level,
            planning_notes: slot?.planning_notes,
            is_leftover: slot?.is_leftover,
            leftover_source: slot?.leftover_source,
          }))
          .filter((slot) => slot.day && slot.meal),
        week_notes: schedule?.week_notes || '',
        locked_meals: validLockedMeals,
      }


      
      console.log('[useMealPlan] generate-plan invoke started', {
        slotCount: payload.slots?.length || 0,
        memberCount: payload.members?.length || 0,
        hasWeekNotes: Boolean(payload.week_notes),
        hasLockedMeals: (payload.locked_meals?.length || 0) > 0,
      })
      // /plan needs a larger budget than the shared 15s default
      let { data: generated, error: functionError } = await invokeGeneratePlan(payload, { timeoutMs: 45000 })
      console.log('[useMealPlan] generate-plan invoke resolved')
      console.log('[useMealPlan] generate-plan response received', {
        hasData: Boolean(generated),
        hasPlan: Boolean(generated?.plan),
        mealCount: generated?.plan?.meals?.length || 0,
      })
      if (functionError) {
        console.error('[useMealPlan] generate-plan invoke rejected', functionError)
        console.error('[useMealPlan] generate-plan response error', functionError)
        if (String(functionError.message || '').includes('non-2xx') || String(functionError.context || '').includes('401') || functionError.status === 401) {
          toast.error('Your session expired. Please log in again.')
          throw new Error('Session expired')
        }
        throw new Error(functionError.message || 'generate-plan failed')
      }

      console.log('[useMealPlan] generate-plan payload shape', {
        returnedKeys: generated ? Object.keys(generated) : [],
        planKeys: generated?.plan ? Object.keys(generated.plan) : [],
      })

      const nextPlan = withMealDefaults(generated.plan, payload.slots)
      
      const mergedPlan = {
        ...nextPlan,
        meals: [
          ...validLockedMeals,
          ...nextPlan.meals.filter(
            (meal) => !validLockedMeals.some((locked) => locked.day === meal.day && locked.meal === meal.meal),
          ),
        ],
      }

      console.log('[PLAN_DEBUG] parsed generate-plan response:', JSON.stringify({
        topLevelKeys: Object.keys(generated?.plan || {}),
        hasDraftPlan: !!generated?.draft_plan,
        hasPlan: !!generated?.plan,
        mealsLength: (generated?.draft_plan?.meals || generated?.plan?.meals || []).length,
        firstMeal: (generated?.draft_plan?.meals || generated?.plan?.meals || [])[0] || null,
        allMealSlotNames: (generated?.draft_plan?.meals || generated?.plan?.meals || [])
          .map(m => ({ day: m?.day, meal: m?.meal })),
      }, null, 2))

      console.log('[useMealPlan] response parse started')
      console.log('[useMealPlan] save started')
      console.log('[useMealPlan] about to save returned plan', {
        mealCount: mergedPlan?.meals?.length || 0,
        scheduleId: activeScheduleId,
      })
      const { data: savedPlan, error: saveError } = await supabase
        .from('meal_plans')
        .upsert({
          ...(mealPlan?.id ? { id: mealPlan.id } : {}),
          user_id: user.id,
          household_id: household.id,
          schedule_id: activeScheduleId,
          week_of: new Date().toISOString().split('T')[0],
          status: mealPlan?.status || 'draft',
          plan: mergedPlan,
          draft_plan: mergedPlan,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single()

      if (saveError) {
        console.error('[useMealPlan] plan save failed', saveError)
        throw saveError
      }
      console.log('[useMealPlan] save finished')
      console.log('[useMealPlan] plan save succeeded', {
        savedPlanId: savedPlan?.id,
        mealCount: savedPlan?.draft_plan?.meals?.length || savedPlan?.plan?.meals?.length || 0,
      })
      setMealPlan({ ...savedPlan, draft_plan: withMealDefaults(savedPlan.draft_plan || savedPlan.plan || {}), plan: withMealDefaults(savedPlan.plan || savedPlan.draft_plan || {}) })
      return savedPlan
    } catch (err) {
      setError(err)
      toast.error("Something went wrong building your plan. Want to try again?")
      throw err
    } finally {
      setGenerating(false)
    }
  }, [mealPlan, scheduleId, user])

  const toggleMealLock = useCallback(async (mealId, locked) => {
    const nextPlan = {
      ...mealPlan.draft_plan,
      meals: mealPlan.draft_plan.meals.map((meal) => (meal.id === mealId ? { ...meal, locked } : meal)),
    }
    return persistPlan(nextPlan)
  }, [mealPlan, persistPlan])

  const saveMealNote = useCallback(async (mealId, userNote) => {
    const nextPlan = {
      ...mealPlan.draft_plan,
      meals: mealPlan.draft_plan.meals.map((meal) => (meal.id === mealId ? { ...meal, user_note: userNote || null } : meal)),
    }
    return persistPlan(nextPlan)
  }, [mealPlan, persistPlan])

  const swapMeal = useCallback(async (mealToReplace, suggestion = '') => {
    const optimisticPlan = mealPlan?.draft_plan
      ? {
          ...mealPlan.draft_plan,
          meals: mealPlan.draft_plan.meals.map((meal) =>
            meal.id === mealToReplace.id
              ? {
                  ...meal,
                  swap_pending: true,
                  reason: 'Finding a better fit…',
                }
              : meal,
          ),
        }
      : null

    if (optimisticPlan) {
      setMealPlan((current) => current ? { ...current, draft_plan: optimisticPlan, plan: optimisticPlan } : current)
    }
    setSwappingMealId(mealToReplace.id)

    try {
      const { data: household } = await supabase.from('households').select('*').eq('user_id', user.id).limit(1).single()
      const { data: members } = await supabase.from('household_members').select('*').eq('user_id', user.id).eq('household_id', household.id)
      const { data: slots } = await supabase.from('schedule_slots').select('*').eq('user_id', user.id).eq('schedule_id', scheduleId)

      // Fetch schedule for week_notes
      const { data: schedule } = await supabase
        .from('weekly_schedules')
        .select('week_notes')
        .eq('id', scheduleId)
        .maybeSingle()

      const payload = {
        household: {
          total_people: household.total_people,
          diet_focus: household.diet_focus,
          budget_sensitivity: household.budget_sensitivity,
          adventurousness: household.adventurousness,
          staples_on_hand: household.staples_on_hand,
          planning_priorities: household.planning_priorities,
          cooking_comfort: household.cooking_comfort,
        },
        members: members.map((member) => ({
          label: member.name || member.label,
          role: member.role,
          age: member.age,
          restrictions: member.restrictions,
          preferences: member.preferences,
          dietary_restrictions: member.dietary_restrictions || [],
          food_preferences: member.food_preferences || [],
          health_considerations: member.health_considerations || [],
        })),
        slots: slots
          .map((slot) => ({
            day: typeof slot?.day === 'string' ? slot.day.trim().slice(0, 3).toLowerCase() : '',
            meal: typeof slot?.meal === 'string' ? slot.meal.trim().toLowerCase().replace(/\s+/g, '_') : '',
            attendees: Array.isArray(slot?.attendees) ? slot.attendees : [],
            effort_level: slot?.effort_level,
            planning_notes: slot?.planning_notes,
            is_leftover: slot?.is_leftover,
            leftover_source: slot?.leftover_source,
          }))
          .filter((slot) => slot.day && slot.meal),
        week_notes: schedule?.week_notes || '',
        existing_plan: mealPlan.draft_plan,
        recent_meal_names: recentSwappedMealNames,
        replace_slot: {
          day: mealToReplace.day,
          meal: mealToReplace.meal,
          suggestion: suggestion,
          reason: suggestion ? `user wants: ${suggestion}` : 'user requested swap',
          current_meal_name: mealToReplace.name || '',
        },
      }

      console.log('[useMealPlan] about to invoke generate-plan for swap', {
        day: mealToReplace.day,
        meal: mealToReplace.meal,
        hasSuggestion: Boolean(suggestion),
      })
      let { data: generated, error: functionError } = await invokeGeneratePlan(payload)
      console.log('[useMealPlan] swap generate-plan response received', {
        hasData: Boolean(generated),
        hasPlan: Boolean(generated?.plan),
        mealCount: generated?.plan?.meals?.length || 0,
      })
      if (functionError) {
        console.error('[useMealPlan] generate-plan response error', functionError)
        if (String(functionError.message || '').includes('non-2xx') || String(functionError.context || '').includes('401')) {
          toast.error('Your session expired. Please log in again.')
          throw new Error('Session expired')
        }
        throw functionError
      }

      console.log('[useMealPlan] swap generate-plan payload shape', {
        returnedKeys: generated ? Object.keys(generated) : [],
        planKeys: generated?.plan ? Object.keys(generated.plan) : [],
      })

      const replacement = withMealDefaults(generated.plan, payload.slots).meals.find(
        (meal) => meal.day === mealToReplace.day && meal.meal === mealToReplace.meal,
      )

      if (!replacement) {
        throw new Error('No replacement meal was returned for that slot')
      }

      const nextPlan = {
        ...mealPlan.draft_plan,
        meals: mealPlan.draft_plan.meals.map((meal) =>
          meal.id === mealToReplace.id
            ? normalizeMealRecord({
                ...replacement,
                id: meal.id,
                locked: false,
                user_note: meal.user_note,
                swapped: true,
                original_name: meal.original_name || meal.name,
              }, { day: meal.day, meal: meal.meal })
            : meal,
        ),
      }

      return persistPlan(nextPlan)
    } catch (err) {
      if (optimisticPlan) {
        setMealPlan((current) => current ? {
          ...current,
          draft_plan: {
            ...mealPlan.draft_plan,
            meals: mealPlan.draft_plan.meals.map((meal) => ({ ...meal, swap_pending: false })),
          },
          plan: {
            ...mealPlan.draft_plan,
            meals: mealPlan.draft_plan.meals.map((meal) => ({ ...meal, swap_pending: false })),
          },
        } : current)
      }
      toast.error("Couldn't swap, try again.")
      throw err
    } finally {
      setSwappingMealId(null)
    }
  }, [mealPlan, persistPlan, recentSwappedMealNames, scheduleId, user])

  const clearMealPlan = useCallback(async () => {
    if (!user || !scheduleId) throw new Error('Schedule is required before clearing a meal plan.')

    const { error: mealPlanError } = await supabase
      .from('meal_plans')
      .delete()
      .eq('user_id', user.id)
      .eq('schedule_id', scheduleId)

    if (mealPlanError) throw mealPlanError

    const { error: listError } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('user_id', user.id)
      .eq('week_of', new Date().toISOString().split('T')[0])

    if (listError) {
      console.error('[useMealPlan] Clear shopping list error:', listError)
    }

    setMealPlan(null)
    return true
  }, [scheduleId, user])

  const finalizePlan = useCallback(async () => {
    return persistPlan(mealPlan.draft_plan, 'active')
  }, [mealPlan, persistPlan])

  return {
    mealPlan,
    loading,
    generating,
    error,
    loadMealPlan,
    generateMealPlan,
    toggleMealLock,
    saveMealNote,
    swapMeal,
    swappingMealId,
    clearMealPlan,
    finalizePlan,
  }
}
