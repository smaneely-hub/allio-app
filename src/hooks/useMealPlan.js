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
        console.log('[useMealPlan] Finalizing plan - creating shopping list')
        const { data: household } = await supabase
          .from('households')
          .select('staples_on_hand')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        const items = aggregateShoppingList(nextPlan, household?.staples_on_hand || '')
        console.log('[useMealPlan] Generated items:', items?.length || 0)
        
        const { error: listError } = await supabase.from('shopping_lists').upsert({
          user_id: user.id,
          meal_plan_id: mealPlan.id,
          items,
          status: 'active',
        })
        
        if (listError) {
          console.error('[useMealPlan] Shopping list error:', listError)
        } else {
          console.log('[useMealPlan] Shopping list saved')
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
      
      console.log('[useMealPlan] Fetched slots from DB:', slots?.length, 'for scheduleId:', scheduleId)
      console.log('[useMealPlan] Slot details:', JSON.stringify(slots?.slice(0,3)))

      const lockedMeals = mealPlan?.draft_plan?.meals?.filter((meal) => meal.locked) || []
      
      // Only keep locked meals that match current scheduled slots
      const slotKey = (s) => `${s.day}-${s.meal}`
      const currentSlotKeys = new Set(slots.map(slotKey))
      const validLockedMeals = lockedMeals.filter((m) => currentSlotKeys.has(`${m.day}-${m.meal}`))
      console.log('[useMealPlan] lockedMeals:', lockedMeals.length, 'meals, validLockedMeals:', validLockedMeals.length)
      
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
        slots: slots.map((slot) => ({
          day: String(slot.day_of_week || slot.day || '').slice(0, 3).toLowerCase(),
          meal: String(slot.meal_type || slot.meal || '').toLowerCase().replace(' ', '_'),
          attendees: slot.attendees || [],
          effort_level: slot.effort_level,
          planning_notes: slot.planning_notes,
          is_leftover: slot.is_leftover,
          leftover_source: slot.leftover_source,
        })),
        locked_meals: lockedMeals,
      }

      console.log('[useMealPlan] Payload slots being sent:', JSON.stringify(payload.slots))

      console.log('[useMealPlan] Calling generate-plan with payload:', JSON.stringify(payload).slice(0, 500))
      
      let { data: generated, error: functionError } = await supabase.functions.invoke('generate-plan', { body: payload })
      console.log('[useMealPlan] Function response:', { data: generated, error: functionError, mealsCount: generated?.plan?.meals?.length })
      if (functionError) {
        console.error('[useMealPlan] Function error details:', functionError)
        // Fallback: try direct fetch
        console.log('[useMealPlan] Trying direct fetch fallback...')
        const response = await fetch('https://rvgtmletsbycrbeycwus.supabase.co/functions/v1/generate-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3RtbGV0c2J5Y3JiZXljd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDc2NjUsImV4cCI6MjA5MDAyMzY2NX0.yYkUKWodhGEpWEgErBeH5hWt0pGnLmx6kSNdBpLdwxQ'
          },
          body: JSON.stringify(payload)
        })
        const fallbackData = await response.json()
        console.log('[useMealPlan] Fallback response:', fallbackData)
        if (fallbackData.plan) {
          generated = fallbackData
        } else {
          throw functionError
        }
      }

      const nextPlan = withMealDefaults(generated.plan)
      console.log('[useMealPlan] nextPlan.meals:', nextPlan.meals?.length, 'meals')
      
      const mergedPlan = {
        ...nextPlan,
        meals: [
          ...validLockedMeals,
          ...nextPlan.meals.filter(
            (meal) => !validLockedMeals.some((locked) => locked.day === meal.day && locked.meal === meal.meal),
          ),
        ],
      }

      console.log('[useMealPlan] nextPlan has', nextPlan.meals?.length, 'meals, mergedPlan has', mergedPlan.meals?.length, 'meals')
      
      const { data: savedPlan, error: saveError } = await supabase
        .from('meal_plans')
        .upsert({
          ...(mealPlan?.id ? { id: mealPlan.id } : {}),
          user_id: user.id,
          household_id: household.id,
          schedule_id: scheduleId,
          week_of: new Date().toISOString().split('T')[0],
          status: mealPlan?.status || 'draft',
          plan: mergedPlan,
          draft_plan: mergedPlan,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single()

      if (saveError) {
        console.error('[useMealPlan] Save error:', saveError)
        throw saveError
      }
      console.log('[useMealPlan] Saved plan with', savedPlan?.draft_plan?.meals?.length, 'meals')
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

  const swapMeal = useCallback(async (mealToReplace, suggestion = '') => {
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
          day: String(slot.day_of_week || slot.day || '').slice(0, 3).toLowerCase(),
          meal: String(slot.meal_type || slot.meal || '').toLowerCase().replace(' ', '_'),
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
          suggestion: suggestion,
          reason: suggestion ? `user wants: ${suggestion}` : 'user requested swap',
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
    console.log('[useMealPlan] finalizePlan called, mealPlan.id:', mealPlan?.id, 'status:', mealPlan?.status)
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
