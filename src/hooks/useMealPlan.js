import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { aggregateShoppingList } from '../lib/aggregateShoppingList'
import { normalizeMealPlan } from '../lib/mealSchema'
import { invokePlannerFunction } from '../lib/plannerFunction'
import { upsertShoppingListForDate } from '../lib/tonightPersistence'
import { useAuth } from './useAuth'

async function invokeGeneratePlan(payload, { timeoutMs = 45000 } = {}) {
  return invokePlannerFunction(payload, { timeoutMs })
}

function withMealDefaults(plan, slots = []) {
  return normalizeMealPlan(plan, slots)
}

function applySourceDefaults(meal) {
  return {
    ...meal,
    source: meal?.source || 'generated',
    source_type: meal?.source_type || meal?.source || 'generated',
  }
}

function normalizeMealRecord(meal, fallback = {}) {
  return {
    ...fallback,
    ...meal,
    source: meal?.source || fallback.source || 'generated',
    source_type: meal?.source_type || meal?.source || fallback.source_type || 'generated',
  }
}

function mapMembersForPlanning(members = []) {
  return members.map((member) => ({
    label: member.name || member.label,
    role: member.role,
    age: member.age,
    sex: member.sex || member.gender || '',
    height_inches: member.height_inches ?? null,
    weight_lbs: member.weight_lbs ?? null,
    activity_level: member.activity_level || '',
    goal: member.goal || 'maintain',
    restrictions: member.restrictions,
    preferences: member.preferences,
    dietary_restrictions: member.dietary_restrictions || [],
    food_preferences: member.food_preferences || [],
    allergies: member.allergies || [],
    health_considerations: member.health_considerations || [],
  }))
}

export function useMealPlan(scheduleId) {
  const { user } = useAuth()
  const [mealPlan, setMealPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [swappingMealId, setSwappingMealId] = useState(null)
  const [recentSwappedMealNames, setRecentSwappedMealNames] = useState([])

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
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (loadError) throw loadError

      if (!data) {
        setMealPlan(null)
      } else {
        setMealPlan({
          ...data,
          draft_plan: withMealDefaults(data.draft_plan || data.plan || {}),
          plan: withMealDefaults(data.plan || data.draft_plan || {}),
        })
      }
    } catch (err) {
      setError(err)
      toast.error("Couldn't load your plan. Give it another shot.")
    } finally {
      setLoading(false)
    }
  }, [scheduleId, user])

  useEffect(() => {
    loadMealPlan()
  }, [loadMealPlan])

  const persistPlan = useCallback(async (nextPlan) => {
    if (!user || !scheduleId || !mealPlan?.id) return null

    const normalizedPlan = withMealDefaults(nextPlan)
    const { data, error: saveError } = await supabase
      .from('meal_plans')
      .update({
        draft_plan: normalizedPlan,
        plan: normalizedPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mealPlan.id)
      .select('*')
      .single()

    if (saveError) throw saveError

    const normalizedSaved = {
      ...data,
      draft_plan: withMealDefaults(data.draft_plan || data.plan || {}),
      plan: withMealDefaults(data.plan || data.draft_plan || {}),
    }
    setMealPlan(normalizedSaved)
    return normalizedSaved
  }, [mealPlan?.id, scheduleId, user])

  const generatePlan = useCallback(async ({ household, members, slots, schedule, lockedMeals = [] }) => {
    if (!user || !household?.id) throw new Error('Missing planning context')
    const effectiveScheduleId = schedule?.id || scheduleId
    if (!effectiveScheduleId) throw new Error('Missing schedule ID')

    setGenerating(true)
    setError(null)

    try {
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
        members: mapMembersForPlanning(members),
        slots: slots.map((slot) => ({
          day: typeof slot?.day === 'string' ? slot.day.trim().slice(0, 3).toLowerCase() : '',
          meal: typeof slot?.meal === 'string' ? slot.meal.trim().toLowerCase().replace(/\s+/g, '_') : '',
          attendees: Array.isArray(slot?.attendees) ? slot.attendees : [],
          effort_level: slot?.effort_level,
          planning_notes: slot?.planning_notes,
          is_leftover: slot?.is_leftover,
          leftover_source: slot?.leftover_source,
        })).filter((slot) => slot.day && slot.meal),
        week_notes: schedule?.week_notes || '',
        locked_meals: validLockedMeals,
      }

      let { data: generated, error: functionError } = await invokeGeneratePlan(payload, { timeoutMs: 45000 })
      if (functionError) {
        if (String(functionError.message || '').includes('non-2xx') || String(functionError.context || '').includes('401') || functionError.status === 401) {
          toast.error('Your session expired. Please log in again.')
          throw new Error('Session expired')
        }
        throw new Error(functionError.message || 'generate-plan failed')
      }

      const nextPlan = withMealDefaults(generated.plan, payload.slots)
      const mergedPlan = {
        ...nextPlan,
        meals: [
          ...validLockedMeals.map(applySourceDefaults),
          ...nextPlan.meals.filter((meal) => !validLockedMeals.some((locked) => locked.day === meal.day && locked.meal === meal.meal)).map(applySourceDefaults),
        ],
      }

      const { data: savedPlan, error: saveError } = await supabase
        .from('meal_plans')
        .upsert({
          ...(mealPlan?.id ? { id: mealPlan.id } : {}),
          user_id: user.id,
          household_id: household.id,
          schedule_id: effectiveScheduleId,
          week_of: new Date().toISOString().split('T')[0],
          status: mealPlan?.status || 'draft',
          plan: mergedPlan,
          draft_plan: mergedPlan,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single()
      if (saveError) throw saveError
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

  const toggleMealLock = useCallback(async (mealId, locked) => persistPlan({ ...mealPlan.draft_plan, meals: mealPlan.draft_plan.meals.map((meal) => meal.id === mealId ? { ...meal, locked } : meal) }), [mealPlan, persistPlan])
  const saveMealNote = useCallback(async (mealId, userNote) => persistPlan({ ...mealPlan.draft_plan, meals: mealPlan.draft_plan.meals.map((meal) => meal.id === mealId ? { ...meal, user_note: userNote || null } : meal) }), [mealPlan, persistPlan])

  const swapMeal = useCallback(async (mealToReplace, suggestion = '') => {
    const optimisticPlan = mealPlan?.draft_plan ? { ...mealPlan.draft_plan, meals: mealPlan.draft_plan.meals.map((meal) => meal.id === mealToReplace.id ? { ...meal, swap_pending: true, reason: 'Finding a better fit…' } : meal) } : null
    if (optimisticPlan) setMealPlan((current) => current ? { ...current, draft_plan: optimisticPlan, plan: optimisticPlan } : current)
    setSwappingMealId(mealToReplace.id)

    try {
      const { data: household } = await supabase.from('households').select('*').eq('user_id', user.id).limit(1).single()
      if (!household) throw new Error('No household found')
      const { data: members } = await supabase.from('household_members').select('*').eq('user_id', user.id).eq('household_id', household.id)
      const { data: slots } = await supabase.from('schedule_slots').select('*').eq('user_id', user.id).eq('schedule_id', scheduleId)
      const { data: schedule } = await supabase.from('weekly_schedules').select('week_notes').eq('id', scheduleId).maybeSingle()

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
        members: mapMembersForPlanning(members),
        slots: slots.map((slot) => ({
          day: typeof slot?.day === 'string' ? slot.day.trim().slice(0, 3).toLowerCase() : '',
          meal: typeof slot?.meal === 'string' ? slot.meal.trim().toLowerCase().replace(/\s+/g, '_') : '',
          attendees: Array.isArray(slot?.attendees) ? slot.attendees : [],
          effort_level: slot?.effort_level,
          planning_notes: slot?.planning_notes,
          is_leftover: slot?.is_leftover,
          leftover_source: slot?.leftover_source,
        })).filter((slot) => slot.day && slot.meal),
        week_notes: schedule?.week_notes || '',
        existing_plan: mealPlan.draft_plan,
        recent_meal_names: recentSwappedMealNames,
        replace_slot: { day: mealToReplace.day, meal: mealToReplace.meal, suggestion, reason: suggestion ? `user wants: ${suggestion}` : 'user requested swap', current_meal_name: mealToReplace.name || '' },
      }

      let { data: generated, error: functionError } = await invokeGeneratePlan(payload)
      if (functionError) {
        if (String(functionError.message || '').includes('non-2xx') || String(functionError.context || '').includes('401')) {
          toast.error('Your session expired. Please log in again.')
          throw new Error('Session expired')
        }
        throw functionError
      }

      const replacement = withMealDefaults(generated.plan, payload.slots).meals.find((meal) => meal.day === mealToReplace.day && meal.meal === mealToReplace.meal)
      if (!replacement) throw new Error('No replacement meal was returned for that slot')

      const nextPlan = {
        ...mealPlan.draft_plan,
        meals: mealPlan.draft_plan.meals.map((meal) => meal.id === mealToReplace.id ? applySourceDefaults(normalizeMealRecord({ ...replacement, id: meal.id, locked: false, user_note: meal.user_note, swapped: true, original_name: meal.original_name || meal.name }, { day: meal.day, meal: meal.meal })) : applySourceDefaults(meal)),
      }
      if (mealToReplace.name) {
        setRecentSwappedMealNames((prev) => [...prev.slice(-9), mealToReplace.name])
      }
      return persistPlan(nextPlan)
    } catch (err) {
      if (optimisticPlan) {
        setMealPlan((current) => current ? { ...current, draft_plan: { ...mealPlan.draft_plan, meals: mealPlan.draft_plan.meals.map((meal) => ({ ...meal, swap_pending: false })) }, plan: { ...mealPlan.draft_plan, meals: mealPlan.draft_plan.meals.map((meal) => ({ ...meal, swap_pending: false })) } } : current)
      }
      toast.error("Couldn't swap, try again.")
      throw err
    } finally {
      setSwappingMealId(null)
    }
  }, [mealPlan, persistPlan, scheduleId, user])

  const clearPlan = useCallback(async () => {
    if (!mealPlan?.id) return
    await supabase.from('meal_plans').delete().eq('id', mealPlan.id)
    setMealPlan(null)
  }, [mealPlan?.id])

  const generateAndPersistShoppingList = useCallback(async ({ household, generatedMeals }) => {
    if (!user?.id || !household?.id || !generatedMeals?.length) return []
    const items = aggregateShoppingList({ meals: generatedMeals }, household?.staples_on_hand || '')
    try {
      await upsertShoppingListForDate({ userId: user.id, householdId: household.id, weekOf: new Date().toISOString().split('T')[0], items })
    } catch (listError) {
      console.error('[useMealPlan] Shopping list error:', listError)
    }
    return items
  }, [user?.id])

  return {
    mealPlan,
    loading,
    generating,
    error,
    swappingMealId,
    loadMealPlan,
    generatePlan,
    persistPlan,
    toggleMealLock,
    saveMealNote,
    swapMeal,
    clearPlan,
    generateAndPersistShoppingList,
  }
}
