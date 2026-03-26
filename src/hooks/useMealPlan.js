import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { aggregateShoppingList } from '../lib/aggregateShoppingList'
import { useAuth } from './useAuth'

function withMealDefaults(plan) {
  return {
    ...plan,
    meals: (plan?.meals || []).map((meal) => ({
      locked: false,
      user_note: null,
      swapped: false,
      original_name: null,
      ...meal,
    })),
  }
}

export function useMealPlan(scheduleId) {
  const { user } = useAuth()
  const [mealPlan, setMealPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

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
      setMealPlan(data ? { ...data, draft_plan: withMealDefaults(data.draft_plan || data.plan || {}) } : null)
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
        const { data: household } = await supabase
          .from('households')
          .select('staples_on_hand')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        const items = aggregateShoppingList(nextPlan, household?.staples_on_hand || '')
        await supabase.from('shopping_lists').upsert({
          user_id: user.id,
          meal_plan_id: mealPlan.id,
          items,
          status: 'active',
        })
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
      setMealPlan({ ...data, draft_plan: withMealDefaults(data.draft_plan || data.plan || {}) })
      return data
    },
    [mealPlan, user],
  )

  const generateMealPlan = useCallback(async () => {
    if (!user || !scheduleId) throw new Error('Schedule is required before generating a meal plan.')

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
        .eq('schedule_id', scheduleId)
      if (slotsError) throw slotsError

      const lockedMeals = mealPlan?.draft_plan?.meals?.filter((meal) => meal.locked) || []

      const payload = {
        household: {
          total_people: household.total_people,
          diet_focus: household.diet_focus,
          budget_sensitivity: household.budget_sensitivity,
          adventurousness: household.adventurousness,
          staples_on_hand: household.staples_on_hand,
          planning_priorities: household.planning_priorities,
        },
        members: members.map((member) => ({
          label: member.name || member.label,
          role: member.role,
          age: member.age,
          restrictions: member.restrictions,
          preferences: member.preferences,
        })),
        slots: slots.map((slot) => ({
          day: String(slot.day_of_week || '').slice(0, 3).toLowerCase(),
          meal: String(slot.meal_type || '').toLowerCase().replace(' ', '_'),
          attendees: slot.attendees || [],
          effort_level: slot.effort_level,
          planning_notes: slot.planning_notes,
          is_leftover: slot.is_leftover,
          leftover_source: slot.leftover_source,
        })),
        locked_meals: lockedMeals,
      }

      const { data: generated, error: functionError } = await supabase.functions.invoke('generate-plan', { body: payload })
      if (functionError) throw functionError

      const nextPlan = withMealDefaults(generated.plan)
      const mergedPlan = {
        ...nextPlan,
        meals: [
          ...lockedMeals,
          ...nextPlan.meals.filter(
            (meal) => !lockedMeals.some((locked) => locked.day === meal.day && locked.meal === meal.meal),
          ),
        ],
      }

      const { data: savedPlan, error: saveError } = await supabase
        .from('meal_plans')
        .upsert({
          id: mealPlan?.id,
          user_id: user.id,
          schedule_id: scheduleId,
          status: mealPlan?.status || 'draft',
          plan: mergedPlan,
          draft_plan: mergedPlan,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single()

      if (saveError) throw saveError
      setMealPlan({ ...savedPlan, draft_plan: withMealDefaults(savedPlan.draft_plan || savedPlan.plan || {}) })
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

  const swapMeal = useCallback(async (mealToReplace) => {
    try {
      const { data: household } = await supabase.from('households').select('*').eq('user_id', user.id).limit(1).single()
      const { data: members } = await supabase.from('household_members').select('*').eq('user_id', user.id).eq('household_id', household.id)
      const { data: slots } = await supabase.from('schedule_slots').select('*').eq('user_id', user.id).eq('schedule_id', scheduleId)

      const payload = {
        household: {
          total_people: household.total_people,
          diet_focus: household.diet_focus,
          budget_sensitivity: household.budget_sensitivity,
          adventurousness: household.adventurousness,
          staples_on_hand: household.staples_on_hand,
          planning_priorities: household.planning_priorities,
        },
        members: members.map((member) => ({
          label: member.name || member.label,
          role: member.role,
          age: member.age,
          restrictions: member.restrictions,
          preferences: member.preferences,
        })),
        slots: slots.map((slot) => ({
          day: String(slot.day_of_week || '').slice(0, 3).toLowerCase(),
          meal: String(slot.meal_type || '').toLowerCase().replace(' ', '_'),
          attendees: slot.attendees || [],
          effort_level: slot.effort_level,
          planning_notes: slot.planning_notes,
          is_leftover: slot.is_leftover,
          leftover_source: slot.leftover_source,
        })),
        existing_plan: mealPlan.draft_plan,
        replace_slot: {
          day: mealToReplace.day,
          meal: mealToReplace.meal,
          reason: 'user requested swap',
        },
      }

      const { data: generated, error: functionError } = await supabase.functions.invoke('generate-plan', { body: payload })
      if (functionError) throw functionError

      const replacement = withMealDefaults(generated.plan).meals.find(
        (meal) => meal.day === mealToReplace.day && meal.meal === mealToReplace.meal,
      )

      const nextPlan = {
        ...mealPlan.draft_plan,
        meals: mealPlan.draft_plan.meals.map((meal) =>
          meal.id === mealToReplace.id
            ? {
                ...replacement,
                id: meal.id,
                locked: false,
                user_note: meal.user_note,
                swapped: true,
                original_name: meal.original_name || meal.name,
              }
            : meal,
        ),
      }

      return persistPlan(nextPlan)
    } catch (err) {
      toast.error("Something went wrong swapping that meal. Want to try again?")
      throw err
    }
  }, [mealPlan, persistPlan, scheduleId, user])

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
    finalizePlan,
  }
}
