import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { aggregateShoppingList } from '../lib/aggregateShoppingList'
import { normalizeMealPlan } from '../lib/mealSchema'
import { invokePlannerFunction } from '../lib/plannerFunction'
import { upsertShoppingListForDate } from '../lib/tonightPersistence'
import { calculateServings } from './useServings'
import { useAuth } from './useAuth'
import { useNutritionProfile } from './useNutritionProfile'

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

async function loadPlannerPreferenceSignals(userId) {
  if (!userId) {
    return { likedMeals: [], dislikedMeals: [], favoriteMeals: [], refinementNotes: [], strongAvoidSignals: [] }
  }

  let signalsResult = { data: [], error: null }
  try {
    const result = await supabase
      .from('meal_signals')
      .select('meal_name, signal_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (result.error && (result.error.code === 'PGRST205' || String(result.error.message || '').includes('meal_signals'))) {
      signalsResult = { data: [], error: null }
    } else {
      signalsResult = result
    }
  } catch {
    // non-fatal
  }

  const [favoritesResult, feedbackResult] = await Promise.all([
    supabase.from('saved_meals').select('recipe_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('meal_member_feedback').select('rating, note, created_at, meal_instances(recipe_name, user_id)').order('created_at', { ascending: false }).limit(30),
  ])

  const signals = (signalsResult.data || []).filter(Boolean)
  const favoriteMeals = (favoritesResult.data || []).map((e) => e.recipe_name).filter(Boolean)
  const feedbackRows = (feedbackResult.data || []).filter((e) => e?.meal_instances?.user_id === userId)

  const likedMeals = [
    ...signals.filter((e) => ['rated_positive', 'refined_to'].includes(e.signal_type)).map((e) => e.meal_name),
    ...feedbackRows.filter((e) => ['loved_it', 'liked_it'].includes(e.rating)).map((e) => e.meal_instances?.recipe_name),
  ].filter(Boolean)

  const dislikedMeals = [
    ...signals.filter((e) => ['rated_negative', 'swapped_away', 'refined_from'].includes(e.signal_type)).map((e) => e.meal_name),
    ...feedbackRows.filter((e) => ['did_not_like', 'did_not_eat'].includes(e.rating)).map((e) => e.meal_instances?.recipe_name),
  ].filter(Boolean)

  const refinementNotes = feedbackRows.map((e) => e.note).filter((note) => typeof note === 'string' && note.trim()).slice(0, 8)
  const strongAvoidSignals = Array.from(new Set(dislikedMeals)).slice(0, 6)

  return {
    likedMeals: Array.from(new Set(likedMeals)).slice(0, 8),
    dislikedMeals: Array.from(new Set(dislikedMeals)).slice(0, 8),
    favoriteMeals: Array.from(new Set(favoriteMeals)).slice(0, 8),
    refinementNotes,
    strongAvoidSignals,
  }
}

async function loadRecentPlanMealNames(userId) {
  if (!userId) return []
  try {
    const { data } = await supabase
      .from('meal_plans')
      .select('plan')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(10)
    if (!data) return []
    return data.flatMap((p) => p.plan?.meals?.map((m) => m.name) || []).filter(Boolean).slice(0, 10)
  } catch {
    return []
  }
}

// Build a compact nutrition_profile object to include in plan payloads.
// Returns undefined if the profile has no meaningful data.
function buildNutritionPayload(profile, derivedTargets) {
  if (!profile) return undefined
  const targets = derivedTargets
  const avoidList = [
    ...(profile.foods_to_avoid || []),
    ...(profile.dietary_restrictions || []),
    ...(profile.allergies || []),
  ].filter(Boolean)
  if (!targets && avoidList.length === 0) return undefined
  return {
    calories_target: targets?.calories || null,
    protein_target_g: targets?.protein_g || null,
    carbs_target_g: targets?.carbs_g || null,
    fat_target_g: targets?.fat_g || null,
    foods_to_avoid: avoidList,
  }
}

export function useMealPlan(scheduleId) {
  const { user } = useAuth()
  const { profile: nutritionProfile, derivedTargets: nutritionTargets } = useNutritionProfile()
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
        nutrition_profile: buildNutritionPayload(nutritionProfile, nutritionTargets),
      }

      let { data: generated, error: functionError } = await invokeGeneratePlan(payload, { timeoutMs: 45000 })
      if (functionError) {
        console.error('generate-plan error (generatePlan)', functionError)
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
      console.error('generatePlan threw', err)
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

      const [preferenceSignals, recentMealNamesFromDB] = await Promise.all([
        loadPlannerPreferenceSignals(user.id),
        loadRecentPlanMealNames(user.id),
      ])

      const preferenceHints = [
        ...preferenceSignals.favoriteMeals.map((name) => `favorite: ${name}`),
        ...preferenceSignals.likedMeals.map((name) => `liked: ${name}`),
        ...preferenceSignals.refinementNotes.map((note) => `feedback note: ${note}`),
      ].slice(0, 10)

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
        week_notes: [schedule?.week_notes, ...preferenceHints].filter(Boolean).join('; '),
        existing_plan: mealPlan.draft_plan,
        recent_meal_names: [...new Set([...recentMealNamesFromDB, ...recentSwappedMealNames, ...preferenceSignals.strongAvoidSignals])],
        preference_signals: {
          favorites: preferenceSignals.favoriteMeals,
          liked_meals: preferenceSignals.likedMeals,
          disliked_meals: preferenceSignals.dislikedMeals,
          refinement_notes: preferenceSignals.refinementNotes,
        },
        replace_slot: { day: mealToReplace.day, meal: mealToReplace.meal, suggestion, reason: suggestion ? `user wants: ${suggestion}` : 'user requested swap', current_meal_name: mealToReplace.name || '' },
        nutrition_profile: buildNutritionPayload(nutritionProfile, nutritionTargets),
      }

      let { data: generated, error: functionError } = await invokeGeneratePlan(payload)
      if (functionError) {
        console.error('generate-plan error (swapMeal)', functionError)
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
        meals: mealPlan.draft_plan.meals.map((m) => m.id === mealToReplace.id ? applySourceDefaults(normalizeMealRecord({ ...replacement, day: m.day, meal: m.meal, id: m.id, date: m.date, locked: false, user_note: m.user_note, swapped: true, original_name: m.original_name || m.name }, { day: m.day, meal: m.meal })) : applySourceDefaults(m)),
      }
      if (mealToReplace.name) {
        setRecentSwappedMealNames((prev) => [...prev.slice(-9), mealToReplace.name])
      }
      const persisted = await persistPlan(nextPlan)
      try {
        await supabase.from('meal_signals').insert({
          user_id: user.id,
          meal_name: mealToReplace.name,
          recipe_id: mealToReplace.recipe_id || null,
          signal_type: 'swapped_away',
          created_at: new Date().toISOString(),
        })
      } catch {
        // non-fatal
      }
      return persisted
    } catch (err) {
      console.error('swapMeal threw', err)
      if (optimisticPlan) {
        setMealPlan((current) => current ? { ...current, draft_plan: { ...mealPlan.draft_plan, meals: mealPlan.draft_plan.meals.map((meal) => ({ ...meal, swap_pending: false })) }, plan: { ...mealPlan.draft_plan, meals: mealPlan.draft_plan.meals.map((meal) => ({ ...meal, swap_pending: false })) } } : current)
      }
      toast.error("Couldn't swap, try again.")
      throw err
    } finally {
      setSwappingMealId(null)
    }
  }, [mealPlan, persistPlan, scheduleId, user])

  const generateSlot = useCallback(async ({ household, members, slot, schedule }) => {
    if (!user || !household?.id) throw new Error('Missing planning context')
    const effectiveScheduleId = schedule?.id || scheduleId
    if (!effectiveScheduleId) throw new Error('Missing schedule ID')

    setGenerating(true)
    setError(null)

    try {
      const normalizedSlot = {
        day: (typeof slot.day_of_week === 'string' ? slot.day_of_week : slot.day || '').trim().slice(0, 3).toLowerCase() || 'mon',
        meal: (typeof slot.meal_type === 'string' ? slot.meal_type : slot.meal || '').trim().toLowerCase().replace(/\s+/g, '_') || 'dinner',
        date: typeof slot.target_date === 'string' && slot.target_date ? slot.target_date : null,
        attendees: Array.isArray(slot.attendees) ? slot.attendees : [],
        effort_level: slot.effort_level || 'medium',
        planning_notes: slot.planning_notes || '',
        is_leftover: slot.is_leftover || false,
        leftover_source: slot.leftover_source || '',
      }

      // Load preference signals and recent meal history in parallel
      const [preferenceSignals, recentMealNames] = await Promise.all([
        loadPlannerPreferenceSignals(user.id),
        loadRecentPlanMealNames(user.id),
      ])

      // Demographic-based servings from attendee members
      const attendeeMembers = normalizedSlot.attendees.length > 0
        ? members.filter((m) => normalizedSlot.attendees.includes(m.id))
        : members
      const calculatedServings = calculateServings(attendeeMembers) || household.total_people || 1

      // Aggregate dietary restrictions from attendees for effective diet focus
      const aggregatedRestrictions = [...new Set(attendeeMembers.flatMap((m) => [
        ...(m.dietary_restrictions || []),
        ...(m.allergies || []),
      ]))]
      const effectiveDietFocus = slot.dietary_focus || household.diet_focus || (aggregatedRestrictions.length > 0 ? aggregatedRestrictions[0] : '')

      // Weave dietary focus into planning notes so the model sees it at slot level too
      const effectivePlanningNotes = [
        normalizedSlot.planning_notes,
        effectiveDietFocus ? `diet: ${effectiveDietFocus}` : '',
      ].filter(Boolean).join('; ')

      const preferenceHints = [
        ...preferenceSignals.favoriteMeals.map((name) => `favorite: ${name}`),
        ...preferenceSignals.likedMeals.map((name) => `liked: ${name}`),
        ...preferenceSignals.refinementNotes.map((note) => `feedback note: ${note}`),
      ].slice(0, 10)

      const payload = {
        household: {
          total_people: calculatedServings,
          servings: calculatedServings,
          diet_focus: effectiveDietFocus,
          budget_sensitivity: household.budget_sensitivity,
          adventurousness: household.adventurousness,
          staples_on_hand: household.staples_on_hand,
          planning_priorities: household.planning_priorities,
          cooking_comfort: household.cooking_comfort,
        },
        members: mapMembersForPlanning(members),
        slots: [{ ...normalizedSlot, planning_notes: effectivePlanningNotes }],
        week_notes: [schedule?.week_notes, ...preferenceHints].filter(Boolean).join('; '),
        locked_meals: [],
        recent_meal_names: [...new Set([...recentMealNames, ...preferenceSignals.strongAvoidSignals])],
        preference_signals: {
          favorites: preferenceSignals.favoriteMeals,
          liked_meals: preferenceSignals.likedMeals,
          disliked_meals: preferenceSignals.dislikedMeals,
          refinement_notes: preferenceSignals.refinementNotes,
        },
        nutrition_profile: buildNutritionPayload(nutritionProfile, nutritionTargets),
      }

      let { data: generated, error: functionError } = await invokeGeneratePlan(payload, { timeoutMs: 45000 })
      if (functionError) {
        console.error('generate-plan error (generateSlot)', functionError)
        if (String(functionError.message || '').includes('non-2xx') || String(functionError.context || '').includes('401') || functionError.status === 401) {
          toast.error('Your session expired. Please log in again.')
          throw new Error('Session expired')
        }
        throw new Error(functionError.message || 'generate-plan failed')
      }

      const generatedPlan = withMealDefaults(generated.plan, payload.slots)
      const newMeal = generatedPlan.meals.find((m) => m.day === normalizedSlot.day && m.meal === normalizedSlot.meal) || generatedPlan.meals[0]
      if (!newMeal) throw new Error('No meal returned for slot')

      const currentMeals = mealPlan?.draft_plan?.meals || []
      const slotKey = `${normalizedSlot.day}-${normalizedSlot.meal}`
      const targetDate = normalizedSlot.date

      // Date-first: find/remove meal by exact date when known; fall back to weekday+slot for legacy undated meals
      const existingSlotMeal = targetDate
        ? currentMeals.find((m) => m.date === targetDate && m.meal === normalizedSlot.meal)
        : currentMeals.find((m) => `${m.day}-${m.meal}` === slotKey)

      const nextMeals = [
        ...currentMeals.filter((m) => {
          if (targetDate && m.date) return !(m.date === targetDate && m.meal === normalizedSlot.meal)
          return `${m.day}-${m.meal}` !== slotKey
        }),
        applySourceDefaults({
          ...newMeal,
          day: normalizedSlot.day,
          meal: normalizedSlot.meal,
          date: targetDate || existingSlotMeal?.date || newMeal.date || null,
          recurring: false,
          id: newMeal.id || crypto.randomUUID(),
        }),
      ]
      const nextPlan = withMealDefaults({ ...(mealPlan?.draft_plan || { meals: [] }), meals: nextMeals })

      if (mealPlan?.id) {
        return await persistPlan(nextPlan)
      }

      const { data: savedPlan, error: saveError } = await supabase
        .from('meal_plans')
        .upsert({
          user_id: user.id,
          household_id: household.id,
          schedule_id: effectiveScheduleId,
          week_of: new Date().toISOString().split('T')[0],
          status: 'draft',
          plan: nextPlan,
          draft_plan: nextPlan,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single()

      if (saveError) throw saveError

      const normalizedSaved = {
        ...savedPlan,
        draft_plan: withMealDefaults(savedPlan.draft_plan || savedPlan.plan || {}),
        plan: withMealDefaults(savedPlan.plan || savedPlan.draft_plan || {}),
      }
      setMealPlan(normalizedSaved)
      return normalizedSaved
    } catch (err) {
      console.error('generateSlot threw', err)
      setError(err)
      toast.error('Could not generate meal for this slot.')
      throw err
    } finally {
      setGenerating(false)
    }
  }, [mealPlan, persistPlan, scheduleId, user])

  const clearPlan = useCallback(async () => {
    if (!mealPlan?.id) return
    await supabase.from('meal_plans').delete().eq('id', mealPlan.id)
    setMealPlan(null)
  }, [mealPlan?.id])

  const generateAndPersistShoppingList = useCallback(async ({ household, generatedMeals }) => {
    if (!user?.id || !household?.id || !generatedMeals?.length) return []
    const items = aggregateShoppingList({ meals: generatedMeals }, household?.staples_on_hand || '', {})
    try {
      await upsertShoppingListForDate({ userId: user.id, householdId: household.id, weekOf: new Date().toISOString().split('T')[0], items })
    } catch (listError) {
      console.error('[useMealPlan] Shopping list error:', listError)
    }
    return items
  }, [user?.id])

  const createPlan = useCallback(async ({ household, schedule, meals = [] }) => {
    if (!user || !household?.id) throw new Error('Missing planning context')
    const effectiveScheduleId = schedule?.id || scheduleId
    if (!effectiveScheduleId) throw new Error('Missing schedule ID')

    const normalizedPlan = withMealDefaults({ meals: meals.map(applySourceDefaults) })
    const { data: savedPlan, error: saveError } = await supabase
      .from('meal_plans')
      .upsert({
        ...(mealPlan?.id ? { id: mealPlan.id } : {}),
        user_id: user.id,
        household_id: household.id,
        schedule_id: effectiveScheduleId,
        week_of: new Date().toISOString().split('T')[0],
        status: mealPlan?.status || 'draft',
        plan: normalizedPlan,
        draft_plan: normalizedPlan,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (saveError) throw saveError

    const normalizedSaved = {
      ...savedPlan,
      draft_plan: withMealDefaults(savedPlan.draft_plan || savedPlan.plan || {}),
      plan: withMealDefaults(savedPlan.plan || savedPlan.draft_plan || {}),
    }
    setMealPlan(normalizedSaved)
    return normalizedSaved
  }, [mealPlan, scheduleId, user])

  return {
    mealPlan,
    loading,
    generating,
    error,
    swappingMealId,
    loadMealPlan,
    generatePlan,
    generateSlot,
    createPlan,
    persistPlan,
    toggleMealLock,
    saveMealNote,
    swapMeal,
    clearPlan,
    generateAndPersistShoppingList,
  }
}
