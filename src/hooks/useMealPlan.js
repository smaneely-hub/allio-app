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

// Mock meal generator fallback when edge function is unavailable
function generateMockMeals(slots) {
  const mealDatabase = {
    breakfast: [
      { name: 'Scrambled Eggs & Toast', emoji: '🍳', prep_time_minutes: 15, servings: 4, ingredients: [{ item: 'Eggs', quantity: '8', unit: '' }, { item: 'Bread', quantity: '4', unit: 'slices' }, { item: 'Butter', quantity: '2', unit: 'tbsp' }], instructions: ['Beat eggs with salt and pepper', 'Melt butter in pan over medium heat', 'Pour in eggs and stir gently', 'Toast bread while eggs cook'] },
      { name: 'Oatmeal with Berries', emoji: '🥣', prep_time_minutes: 10, servings: 4, ingredients: [{ item: 'Oats', quantity: '2', unit: 'cups' }, { item: 'Milk', quantity: '4', unit: 'cups' }, { item: 'Mixed berries', quantity: '1', unit: 'cup' }], instructions: ['Bring milk to simmer', 'Add oats and cook 5 minutes', 'Top with berries'] },
      { name: 'Yogurt Parfait', emoji: '🥛', prep_time_minutes: 5, servings: 4, ingredients: [{ item: 'Greek yogurt', quantity: '4', unit: 'cups' }, { item: 'Granola', quantity: '1', unit: 'cup' }, { item: 'Honey', quantity: '2', unit: 'tbsp' }], instructions: ['Layer yogurt and granola', 'Drizzle with honey'] },
      { name: 'Pancakes', emoji: '🥞', prep_time_minutes: 20, servings: 4, ingredients: [{ item: 'Pancake mix', quantity: '2', unit: 'cups' }, { item: 'Milk', quantity: '1.5', unit: 'cups' }, { item: 'Eggs', quantity: '2', unit: '' }], instructions: ['Mix pancake ingredients', 'Heat griddle', 'Pour batter and flip when bubbly'] },
    ],
    lunch: [
      { name: 'Turkey Sandwiches', emoji: '🥪', prep_time_minutes: 10, servings: 4, ingredients: [{ item: 'Turkey breast', quantity: '1', unit: 'lb' }, { item: 'Bread', quantity: '8', unit: 'slices' }, { item: 'Cheese', quantity: '4', unit: 'slices' }], instructions: ['Lay out bread', 'Layer turkey and cheese', 'Add condiments and close'] },
      { name: 'Caesar Salad', emoji: '🥗', prep_time_minutes: 15, servings: 4, ingredients: [{ item: 'Romaine lettuce', quantity: '2', unit: 'heads' }, { item: 'Caesar dressing', quantity: '0.5', unit: 'cup' }, { item: 'Parmesan', quantity: '0.5', unit: 'cup' }], instructions: ['Chop lettuce', 'Toss with dressing', 'Top with parmesan'] },
      { name: 'Tomato Soup & Grilled Cheese', emoji: '🍅', prep_time_minutes: 25, servings: 4, ingredients: [{ item: 'Canned tomato soup', quantity: '2', unit: 'cans' }, { item: 'Bread', quantity: '8', unit: 'slices' }, { item: 'Cheddar cheese', quantity: '4', unit: 'slices' }], instructions: ['Heat soup', 'Make grilled cheese sandwiches', 'Serve together'] },
      { name: 'Chicken Wrap', emoji: '🌯', prep_time_minutes: 15, servings: 4, ingredients: [{ item: 'Chicken breast', quantity: '1', unit: 'lb' }, { item: 'Tortillas', quantity: '4', unit: '' }, { item: 'Lettuce', quantity: '2', unit: 'cups' }], instructions: ['Cook and slice chicken', 'Warm tortillas', 'Fill with chicken and lettuce'] },
    ],
    dinner: [
      { name: 'Chicken Stir Fry', emoji: '🍗', prep_time_minutes: 25, servings: 4, ingredients: [{ item: 'Chicken thighs', quantity: '1.5', unit: 'lb' }, { item: 'Broccoli', quantity: '2', unit: 'cups' }, { item: 'Soy sauce', quantity: '3', unit: 'tbsp' }], instructions: ['Cut chicken into pieces', 'Stir fry chicken 5 min', 'Add broccoli and sauce', 'Cook until done'] },
      { name: 'Pork Tacos', emoji: '🌮', prep_time_minutes: 30, servings: 4, ingredients: [{ item: 'Pork shoulder', quantity: '1.5', unit: 'lb' }, { item: 'Taco shells', quantity: '8', unit: '' }, { item: 'Taco seasoning', quantity: '1', unit: 'packet' }], instructions: ['Season and cook pork', 'Shred pork', 'Warm shells and assemble'] },
      { name: 'Pasta Night', emoji: '🍝', prep_time_minutes: 20, servings: 4, ingredients: [{ item: 'Spaghetti', quantity: '1', unit: 'lb' }, { item: 'Marinara sauce', quantity: '2', unit: 'jars' }, { item: 'Parmesan', quantity: '0.5', unit: 'cup' }], instructions: ['Boil pasta', 'Heat sauce', 'Combine and top with parmesan'] },
      { name: 'Baked Salmon & Veggies', emoji: '🐟', prep_time_minutes: 30, servings: 4, ingredients: [{ item: 'Salmon fillets', quantity: '4', unit: '' }, { item: 'Asparagus', quantity: '1', unit: 'bunch' }, { item: 'Lemon', quantity: '1', unit: '' }], instructions: ['Season salmon', 'Roast at 400°F for 15 min', 'Add asparagus and cook 10 more min'] },
      { name: 'Beef Burgers', emoji: '🍔', prep_time_minutes: 20, servings: 4, ingredients: [{ item: 'Ground beef', quantity: '1.5', unit: 'lb' }, { item: 'Burger buns', quantity: '4', unit: '' }, { item: 'Cheese', quantity: '4', unit: 'slices' }], instructions: ['Form patties', 'Grill to preference', 'Add cheese to melt', 'Assemble burgers'] },
      { name: 'Chicken Casserole', emoji: '🥘', prep_time_minutes: 40, servings: 6, ingredients: [{ item: 'Chicken breast', quantity: '2', unit: 'lb' }, { item: 'Cream of chicken soup', quantity: '2', unit: 'cans' }, { item: 'Frozen vegetables', quantity: '2', unit: 'cups' }], instructions: ['Cook and chop chicken', 'Mix with soup and veggies', 'Bake at 350°F for 30 min'] },
    ]
  }
  
  const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  const meals = []
  
  for (const slot of slots) {
    if (slot.meal === 'prep_block') continue
    
    const mealType = slot.meal.toLowerCase()
    const mealOptions = mealDatabase[mealType] || mealDatabase.dinner
    const mealTemplate = mealOptions[Math.floor(Math.random() * mealOptions.length)]
    
    meals.push({
      day: slot.day?.toLowerCase().slice(0, 3) || 'mon',
      meal: mealType,
      name: mealTemplate.name,
      emoji: mealTemplate.emoji,
      prep_time_minutes: mealTemplate.prep_time_minutes,
      servings: slot.attendees?.length || 4,
      ingredients: mealTemplate.ingredients,
      instructions: mealTemplate.instructions,
      notes: 'Quick and easy family meal',
      locked: false,
      user_note: null,
    })
  }
  
  return { meals }
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
        
        const { error: listError } = await supabase.from('shopping_lists').upsert({
          user_id: user.id,
          meal_plan_id: mealPlan.id,
          items,
          status: 'active',
        })
        
        if (listError) {
          console.error('[useMealPlan] Shopping list error:', listError)
        } else {
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

      // Also fetch the schedule to get week_notes
      const { data: schedule } = await supabase
        .from('weekly_schedules')
        .select('week_notes')
        .eq('id', scheduleId)
        .maybeSingle()
      

      const lockedMeals = mealPlan?.draft_plan?.meals?.filter((meal) => meal.locked) || []
      
      // Only keep locked meals that match current scheduled slots
      const slotKey = (s) => `${s.day}-${s.meal}`
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
        slots: slots.map((slot) => ({
          day: String(slot.day_of_week || slot.day || '').slice(0, 3).toLowerCase(),
          meal: String(slot.meal_type || slot.meal || '').toLowerCase().replace(' ', '_'),
          attendees: slot.attendees || [],
          effort_level: slot.effort_level,
          planning_notes: slot.planning_notes,
          is_leftover: slot.is_leftover,
          leftover_source: slot.leftover_source,
        })),
        week_notes: schedule?.week_notes || '',
        locked_meals: validLockedMeals,
      }


      
      let { data: generated, error: functionError } = await supabase.functions.invoke('generate-plan', { body: payload })
      if (functionError) {
        console.error('[useMealPlan] Function error details:', functionError)
        if (String(functionError.message || '').includes('non-2xx') || String(functionError.context || '').includes('401')) {
          toast.error('Your session expired. Please log in again.')
          throw new Error('Session expired')
        }
        generated = {
          plan: generateMockMeals(payload.slots || [])
        }
      }

      const nextPlan = withMealDefaults(generated.plan)
      
      const mergedPlan = {
        ...nextPlan,
        meals: [
          ...validLockedMeals,
          ...nextPlan.meals.filter(
            (meal) => !validLockedMeals.some((locked) => locked.day === meal.day && locked.meal === meal.meal),
          ),
        ],
      }

      
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
        slots: slots.map((slot) => ({
          day: String(slot.day_of_week || slot.day || '').slice(0, 3).toLowerCase(),
          meal: String(slot.meal_type || slot.meal || '').toLowerCase().replace(' ', '_'),
          attendees: slot.attendees || [],
          effort_level: slot.effort_level,
          planning_notes: slot.planning_notes,
          is_leftover: slot.is_leftover,
          leftover_source: slot.leftover_source,
        })),
        week_notes: schedule?.week_notes || '',
        existing_plan: mealPlan.draft_plan,
        replace_slot: {
          day: mealToReplace.day,
          meal: mealToReplace.meal,
          suggestion: suggestion,
          reason: suggestion ? `user wants: ${suggestion}` : 'user requested swap',
        },
      }

      let { data: generated, error: functionError } = await supabase.functions.invoke('generate-plan', { body: payload })
      if (functionError) {
        try {
          const response = await fetch('https://rvgtmletsbycrbeycwus.supabase.co/functions/v1/generate-plan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Z3RtbGV0c2J5Y3JiZXljd3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDc2NjUsImV4cCI6MjA5MDAyMzY2NX0.yYkUKWodhGEpWEgErBeH5hWt0pGnLmx6kSNdBpLdwxQ'
            },
            body: JSON.stringify(payload)
          })
          const fallbackData = await response.json()
          if (fallbackData.plan) {
            generated = fallbackData
          } else {
            throw functionError
          }
        } catch {
          throw functionError
        }
      }

      const replacement = withMealDefaults(generated.plan).meals.find(
        (meal) => meal.day === mealToReplace.day && meal.meal === mealToReplace.meal,
      )

      if (!replacement) {
        throw new Error('No replacement meal was returned for that slot')
      }

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
