import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { useSchedule } from '../hooks/useSchedule'
import { useMealPlan } from '../hooks/useMealPlan'
import { useSubscription } from '../hooks/useSubscription'
import { useShoppingListPreferences } from '../hooks/useShoppingListPreferences'
import { useShoppingLists } from '../hooks/useShoppingLists'
import { ShoppingListPickerModal } from '../components/ShoppingListPickerModal'
import { ScheduleSkeleton, EmptyState } from '../components/LoadingStates'
import { MealPlanWorkspace } from '../components/plan/MealPlanWorkspace'
import { PlannerActionSheet } from '../components/plan/PlannerActionSheet'
import { PlannerMealReviewSheet } from '../components/plan/PlannerMealReviewSheet'
import { PlannerGenerationFlow } from '../components/plan/PlannerGenerationFlow'
import { DayActionsMenu } from '../components/planner/DayActionsMenu'
import { AddMealModal } from '../components/planner/AddMealModal'
import { RecurrencePicker } from '../components/planner/RecurrencePicker'
import { HouseholdMembersModal } from '../components/planner/HouseholdMembersModal'
import { aggregateShoppingList } from '../lib/aggregateShoppingList'
import { addDays, DAY_ORDER, formatIsoLocalDate, normalizeRecurrenceRule, parseIsoLocalDate, SHOPPING_EVENT_TYPE } from '../lib/planner'
import { normalizeMealRecord } from '../lib/mealSchema'
import { normalizeRecipe } from '../lib/recipeSchema'
import { upsertShoppingListForDate } from '../lib/tonightPersistence'
import { refineMeal } from '../lib/plannerFunction'
import { groupByCategory } from '../utils/groceryCategories'
import { supabase } from '../lib/supabase'

function toIsoLocalDate(date) {
  return formatIsoLocalDate(date)
}

const days = DAY_ORDER

async function fetchPlannerMealImage(mealName) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-recipe-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ query: mealName || 'food' }),
      }
    )
    const data = await res.json()
    return typeof data?.imageUrl === 'string' && data.imageUrl.trim() ? data.imageUrl.trim() : null
  } catch {
    return null
  }
}
const CATEGORY_EMOJI = {
  Produce: '🥬',
  'Meat & Seafood': '🥩',
  'Dairy & Eggs': '🥚',
  Bakery: '🍞',
  Pantry: '🫙',
  Frozen: '🧊',
  Beverages: '🥤',
  Other: '📦',
}

const SHOPPING_DAY_OPTIONS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const PLANNER_VIEW_MODE_KEY = 'planner.viewMode'

function buildShoppingEvent(date, recurrence = null, existing = {}) {
  return {
    ...existing,
    id: existing.id || `shopping-${date}`,
    event_type: SHOPPING_EVENT_TYPE,
    name: 'Shopping day',
    title: 'Shopping day',
    date,
    recurrence: normalizeRecurrenceRule(recurrence || existing.recurrence),
    recurring: normalizeRecurrenceRule(recurrence || existing.recurrence).frequency !== 'none',
    notes: existing.notes || '',
  }
}

function MemberSummary({ members, onOpen }) {
  return (
    <div className="mt-4 rounded-[28px] border border-surface-muted bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-medium text-ink-secondary">Planning for</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {members.map((member, index) => (
              <button
                key={member.id || `${member.name || member.label}-${index}`}
                type="button"
                onClick={onOpen}
                className="rounded-full bg-warm-100 px-3 py-1 text-sm font-medium text-ink-primary transition-colors duration-150 hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 cursor-pointer"
              >
                {member.name || member.label || `Member ${index + 1}`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onOpen} className="rounded-full border border-surface-muted bg-white px-4 py-2 text-sm font-medium text-ink-primary transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 cursor-pointer">
            + Add member
          </button>
          <button type="button" onClick={onOpen} className="text-sm font-medium text-ink-primary underline underline-offset-2 transition-colors duration-150 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 rounded-md cursor-pointer">
            Manage
          </button>
        </div>
      </div>
    </div>
  )
}

function MemberEmptyState({ onOpen }) {
  return (
    <div className="mt-4 rounded-[28px] border border-primary-100 bg-primary-50/70 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-xl text-ink-primary">Add at least one member to generate meals.</div>
          <div className="mt-1 text-sm text-ink-secondary">Create your first household member so Allio can build meals for real people, not guesses.</div>
        </div>
        <button type="button" onClick={onOpen} className="btn-primary shrink-0 cursor-pointer transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          Add a household member
        </button>
      </div>
    </div>
  )
}

export function PlannerPage() {
  useDocumentTitle('Weekly Plan | Allio')
  const { user } = useAuth()
  const { household, members, loading: householdLoading, saveMembers, reloadHousehold } = useHousehold()
  const { schedule, slots, loading: scheduleLoading, saveSchedule, loadSchedule } = useSchedule()
  const { isPremium } = useSubscription()
  const { defaultListId, alwaysAsk } = useShoppingListPreferences(user?.id)
  const { lists, createList } = useShoppingLists(user?.id)
  const {
    mealPlan,
    generating,
    generateSlot,
    createPlan,
    persistPlan,
    swapMeal,
    clearPlan,
    loadMealPlan,
  } = useMealPlan(schedule?.id)

  const [weekNotes, setWeekNotes] = useState('')
  const [shoppingRecurrenceTarget, setShoppingRecurrenceTarget] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(PLANNER_VIEW_MODE_KEY) || 'day')
  const [slotState, setSlotState] = useState({})
  const [saving, setSaving] = useState(false)
  const [shoppingItems, setShoppingItems] = useState([])
  const [dayActionTarget, setDayActionTarget] = useState(null)
  const [mealActionTarget, setMealActionTarget] = useState(null)
  const [addMealTarget, setAddMealTarget] = useState(null)
  const [generateFlowTarget, setGenerateFlowTarget] = useState(null)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [savingMembers, setSavingMembers] = useState(false)
  const [refineTarget, setRefineTarget] = useState(null)
  const [refineText, setRefineText] = useState('')
  const [refining, setRefining] = useState(false)
  const [reviewMeal, setReviewMeal] = useState(null)
  const [reviewSlotKey, setReviewSlotKey] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [generatingSlotKey, setGeneratingSlotKey] = useState(null)
  const [recurrenceTarget, setRecurrenceTarget] = useState(null)
  const [plannerPickerOpen, setPlannerPickerOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(PLANNER_VIEW_MODE_KEY, viewMode)
  }, [viewMode])

  useEffect(() => {
    if (!schedule) return
    setWeekNotes(schedule.week_notes || '')
  }, [schedule])

  useEffect(() => {
    const nextState = {}
    slots.forEach((slot) => {
      const key = `${slot.day}-${slot.meal}`
      nextState[key] = {
        day_of_week: slot.day,
        meal_type: slot.meal,
        active: true,
        attendees: slot.attendees || [],
        is_leftover: slot.is_leftover || false,
        leftover_source: slot.leftover_source || '',
        effort_level: slot.effort_level || 'medium',
        planning_notes: slot.planning_notes || '',
      }
    })
    setSlotState(nextState)
  }, [slots])

  useEffect(() => {
    const meals = mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []
    if (!meals.length) {
      setShoppingItems([])
      return
    }
    setShoppingItems(aggregateShoppingList({ meals }, household?.staples_on_hand || '', {}))
  }, [mealPlan, household])

  const memberOptions = useMemo(() => members.map((member, index) => ({ id: member.id || `member-${index}`, label: member.name || member.label || `Member ${index + 1}` })), [members])
  const rawPlanMeals = useMemo(() => mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || [], [mealPlan])
  const shoppingEvents = useMemo(() => rawPlanMeals.filter((meal) => meal?.event_type === SHOPPING_EVENT_TYPE).map((meal) => buildShoppingEvent(meal.date, meal.recurrence, meal)), [rawPlanMeals])
  const planMeals = useMemo(() => rawPlanMeals.filter((meal) => meal?.event_type !== SHOPPING_EVENT_TYPE).map((meal) => normalizeMealRecord(meal)), [rawPlanMeals])
  const activeSlots = Object.values(slotState).filter((slot) => slot.active && slot.attendees?.length > 0)
  const loading = householdLoading || scheduleLoading || (schedule && slots.length > 0 && Object.keys(slotState).length === 0)
  const groupedShopping = useMemo(() => groupByCategory(shoppingItems), [shoppingItems])

  const persistMealsAndShopping = async (nextMeals) => {
    const nextPlan = { ...(mealPlan?.draft_plan || { meals: [] }), meals: nextMeals }
    if (mealPlan?.id) {
      await persistPlan(nextPlan)
    } else if (household?.id && schedule?.id) {
      await createPlan({ household, schedule, meals: nextMeals })
    }
    const items = aggregateShoppingList({ meals: nextMeals }, household?.staples_on_hand || '', {})
    setShoppingItems(items)
    if (household?.id) {
      await upsertShoppingListForDate({
        userId: household.user_id,
        householdId: household.id,
        weekOf: new Date().toISOString().split('T')[0],
        items,
        listId: defaultListId || null,
      })
    }
    return nextPlan
  }

  const navDelta = viewMode === 'day' ? 1 : viewMode === '3day' ? 3 : 7
  const handlePrevRange = () => {
    if (viewMode === 'month') {
      setSelectedDate((current) => {
        const d = new Date(current)
        d.setMonth(d.getMonth() - 1)
        return d
      })
    } else {
      setSelectedDate((current) => addDays(current, -navDelta))
    }
  }
  const handleNextRange = () => {
    if (viewMode === 'month') {
      setSelectedDate((current) => {
        const d = new Date(current)
        d.setMonth(d.getMonth() + 1)
        return d
      })
    } else {
      setSelectedDate((current) => addDays(current, navDelta))
    }
  }
  const handleSelectMonthDay = (date) => {
    setSelectedDate(date)
    setViewMode('day')
  }

  const handleToggleShoppingDay = async (day) => {
    if (!day?.date) return
    const shoppingDate = toIsoLocalDate(day.date)
    const currentMeals = rawPlanMeals
    const existingShopping = currentMeals.filter((meal) => meal?.event_type === SHOPPING_EVENT_TYPE)
    const existingForDate = existingShopping.find((meal) => meal.date === shoppingDate)
    const nextMeals = existingForDate
      ? currentMeals.filter((meal) => meal.id !== existingForDate.id)
      : [
          ...currentMeals.filter((meal) => meal?.event_type !== SHOPPING_EVENT_TYPE),
          buildShoppingEvent(shoppingDate, null, existingShopping[0] || {}),
        ]
    try {
      await persistMealsAndShopping(nextMeals)
      toast.success(existingForDate ? 'Shopping day removed.' : 'Shopping day scheduled.')
    } catch (error) {
      toast.error(error?.message || 'Could not update shopping day.')
    }
  }

  const handleSetShoppingRecurrence = async (rule) => {
    if (!shoppingRecurrenceTarget) return
    const targetId = shoppingRecurrenceTarget.id
    const nextMeals = rawPlanMeals.map((meal) =>
      meal.id === targetId
        ? buildShoppingEvent(meal.date, rule, { ...meal, recurrence: rule })
        : meal,
    )
    try {
      await persistMealsAndShopping(nextMeals)
      toast.success(rule.frequency === 'none' ? 'Shopping recurrence removed.' : 'Shopping recurrence set.')
      setShoppingRecurrenceTarget(null)
    } catch (error) {
      toast.error(error?.message || 'Could not update shopping recurrence.')
    }
  }

  const handleOpenAddMeal = (day, mealSlot = 'dinner', existingMealId = null, startOnGenerate = false) => {
    if (startOnGenerate) {
      const dayTargetDate = day?.date ? toIsoLocalDate(day.date) : toIsoLocalDate(new Date(selectedDate))
      setGenerateFlowTarget({ dayKey: day?.key || day, mealSlot, targetDate: dayTargetDate })
    } else {
      setAddMealTarget({ day, mealSlot, existingMealId, startOnGenerate })
    }
  }

  const handleClearDay = async (dayDate) => {
    const target = new Date(dayDate)
    target.setHours(0, 0, 0, 0)
    const targetDateStr = toIsoLocalDate(target)
    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][target.getDay()]

    let nextMeals = mealPlan?.draft_plan?.meals || []
    if (mealPlan?.draft_plan?.meals?.length) {
      // Date-first: remove meals on this exact date; fall back to weekday key for legacy undated meals
      nextMeals = mealPlan.draft_plan.meals.filter((m) =>
        m.date ? m.date !== targetDateStr : m.day !== dayKey
      )
      const nextPlan = { ...mealPlan.draft_plan, meals: nextMeals }
      try {
        await persistPlan(nextPlan)
      } catch {
        toast.error('Could not clear day.')
        return
      }
    }

    try {
      const items = aggregateShoppingList({ meals: nextMeals }, household?.staples_on_hand || '', { })
      setShoppingItems(items)
      if (household?.id) {
        await upsertShoppingListForDate({
          userId: household.user_id,
          householdId: household.id,
          weekOf: new Date().toISOString().split('T')[0],
          items,
          listId: defaultListId || null,
        })
      }
    } catch {
      toast.error('Day cleared, but shopping list could not be updated.')
      return
    }

    setSlotState((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => (
      key.startsWith(`${dayKey}-`) ? [key, { ...value, active: false, attendees: [] }] : [key, value]
    ))))
    toast.success('Day cleared.')
  }

  const handleClearPlan = async () => {
    if (!window.confirm("Clear your current plan and start fresh? This cannot be undone.")) return
    setSaving(true)
    try {
      await clearPlan()
      if (household?.id) {
        await upsertShoppingListForDate({
          userId: household.user_id,
          householdId: household.id,
          weekOf: new Date().toISOString().split('T')[0],
          items: [],
          listId: defaultListId || null,
        })
      }
      setSlotState({})
      setShoppingItems([])
      toast.success("Plan cleared. Start fresh whenever you're ready.")
    } catch (err) {
      toast.error(err?.message || "Unable to clear plan.")
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateSlot = async (dayKey, mealType, overrides = {}) => {
    if (!members.length) { toast.error('Add household members first.'); return null }
    if (!household?.id) { toast.error('Household not loaded yet.'); return null }

    const slotKey = `${dayKey}-${mealType}`
    const existingSlot = slotState[slotKey]
    const fallbackAttendees = memberOptions.slice(0, 1).map((m) => m.id)
    // Use explicitly provided targetDate; otherwise resolve the visible day's actual date.
    const targetDate = overrides.targetDate || (() => {
      const matchingDay = plannerDays.find((day) => day.key === dayKey)
      return matchingDay?.date ? toIsoLocalDate(matchingDay.date) : toIsoLocalDate(new Date(selectedDate))
    })()

    const slot = {
      day_of_week: dayKey,
      meal_type: mealType,
      target_date: targetDate,
      active: true,
      attendees: overrides.attendees?.length
        ? overrides.attendees
        : (existingSlot?.attendees?.length ? existingSlot.attendees : fallbackAttendees),
      effort_level: overrides.effort || existingSlot?.effort_level || 'medium',
      planning_notes: overrides.planningNotes !== undefined
        ? overrides.planningNotes
        : (existingSlot?.planning_notes || ''),
      is_leftover: existingSlot?.is_leftover || false,
      leftover_source: existingSlot?.leftover_source || '',
      dietary_focus: overrides.dietaryFocus || '',
    }

    setSaving(true)
    setGeneratingSlotKey(slotKey)
    try {
      let activeSchedule = schedule
      if (!schedule?.id) {
        activeSchedule = await saveSchedule({
          householdId: household.id,
          shoppingDay: null,
          nextShoppingDate: null,
          weekNotes,
          slots: [slot],
          validMemberIds: memberOptions.map((m) => m.id),
        })
        if (!activeSchedule?.id) throw new Error('Could not create schedule')
        await loadSchedule()
      }

      const result = await generateSlot({ household, members, slot, schedule: activeSchedule })
      const resultMeals = result?.draft_plan?.meals || result?.plan?.meals || []
      const newMeal = resultMeals.find((m) => `${m.day}-${m.meal}` === slotKey) || resultMeals[0]
      return newMeal ? normalizeMealRecord({ ...newMeal, day: dayKey, meal: mealType, date: targetDate, recurring: false }) : null
    } catch (err) {
      if (err?.message !== 'Session expired') {
        toast.error(err?.message || 'Could not generate meal for this slot.')
      }
      return null
    } finally {
      setSaving(false)
      setGeneratingSlotKey(null)
    }
  }

  // ── PlannerGenerationFlow callbacks ──────────────────────────────
  const handleFlowGenerate = async ({ effort, attendees, planningNotes, dietaryFocus }) => {
    if (!generateFlowTarget) return null
    let meal = await handleGenerateSlot(generateFlowTarget.dayKey, generateFlowTarget.mealSlot, {
      effort, attendees, planningNotes, dietaryFocus,
      targetDate: generateFlowTarget.targetDate,
    })
    if (!meal) return null
    if (!meal.image_url && !meal.image) {
      const imageUrl = await fetchPlannerMealImage(meal.name)
      if (imageUrl) meal = { ...meal, image: imageUrl, image_url: imageUrl }
    }
    return meal
  }

  const handleFlowTryAnother = async (meal) => {
    const result = await swapMeal(meal, '')
    const resultMeals = result?.draft_plan?.meals || result?.plan?.meals || []
    if (!generateFlowTarget) return null
    const slotKey = `${generateFlowTarget.dayKey}-${generateFlowTarget.mealSlot}`
    let newMeal = resultMeals.find((m) => `${m.day}-${m.meal}` === slotKey) || resultMeals[0]
    if (!newMeal) return null
    const targetDate = generateFlowTarget.targetDate || toIsoLocalDate(new Date(selectedDate))
    newMeal = normalizeMealRecord({ ...newMeal, day: generateFlowTarget.dayKey, meal: generateFlowTarget.mealSlot, date: targetDate, recurring: false })
    if (!newMeal.image_url && !newMeal.image) {
      const imageUrl = await fetchPlannerMealImage(newMeal.name)
      if (imageUrl) newMeal = { ...newMeal, image: imageUrl, image_url: imageUrl }
    }
    return newMeal
  }

  const handleFlowRefine = async (meal, text) => {
    const { data, error } = await refineMeal(meal, text)
    if (error) throw new Error(error.message || 'Refine failed')
    if (!data?.refined) throw new Error('No refinement returned')
    const refined = normalizeMealRecord(data.refined)
    const currentMeals = mealPlan?.draft_plan?.meals || []
    const nextMeals = currentMeals.map((m) =>
      m.id === meal.id ? { ...refined, id: m.id, day: m.day, meal: m.meal, date: m.date || meal.date } : m
    )
    const nextPlan = { ...(mealPlan.draft_plan || {}), meals: nextMeals }
    await persistPlan(nextPlan)
    try {
      await supabase.from('meal_signals').insert([
        { user_id: household.user_id, meal_name: meal.name, recipe_id: meal.recipe_id || null, signal_type: 'refined_from', created_at: new Date().toISOString() },
        { user_id: household.user_id, meal_name: refined.name, recipe_id: refined.recipe_id || null, signal_type: 'refined_to', created_at: new Date().toISOString() },
      ])
    } catch { /* non-fatal */ }
    toast.success('Meal refined.')
    return refined
  }

  const handleFlowAccept = async (meal) => {
    if (mealPlan?.id && meal) {
      const currentMeals = mealPlan?.draft_plan?.meals || []
      const nextMeals = currentMeals.map((m) =>
        m.id === meal.id
          ? normalizeMealRecord({ ...m, ...meal, id: m.id, day: m.day, meal: m.meal, date: meal.date || m.date, recurring: false, locked: m.locked })
          : m
      )
      await persistPlan({ ...(mealPlan.draft_plan || {}), meals: nextMeals })
      const items = aggregateShoppingList({ meals: nextMeals }, household?.staples_on_hand || '', { })
      setShoppingItems(items)
      if (household?.id) {
        await upsertShoppingListForDate({
          userId: household.user_id,
          householdId: household.id,
          weekOf: new Date().toISOString().split('T')[0],
          items,
          listId: defaultListId || null,
        })
      }
    }
    setGenerateFlowTarget(null)
    toast.success('Meal added to plan.')
  }

  const handleFlowLockAndAccept = async (meal) => {
    if (mealPlan?.id && meal) {
      const currentMeals = mealPlan?.draft_plan?.meals || []
      const nextMeals = currentMeals.map((m) =>
        m.id === meal.id
          ? normalizeMealRecord({ ...m, ...meal, id: m.id, day: m.day, meal: m.meal, date: meal.date || m.date, recurring: false, locked: true })
          : m
      )
      await persistPlan({ ...(mealPlan.draft_plan || {}), meals: nextMeals })
      const items = aggregateShoppingList({ meals: nextMeals }, household?.staples_on_hand || '', { })
      setShoppingItems(items)
      if (household?.id) {
        await upsertShoppingListForDate({
          userId: household.user_id,
          householdId: household.id,
          weekOf: new Date().toISOString().split('T')[0],
          items,
          listId: defaultListId || null,
        })
      }
    }
    setGenerateFlowTarget(null)
    toast.success('Meal locked in.')
  }

  const handleMealAction = async (action, meal) => {
    setMealActionTarget(null)

    if (action === 'replace') {
      handleOpenAddMeal({ key: meal.day, date: meal.date ? parseIsoLocalDate(meal.date) : new Date(selectedDate) }, meal.meal, meal.id)
      return
    }

    if (action === 'regenerate') {
      if (!members.length) return toast.error('Add household members first.')
      setSaving(true)
      try {
        const result = await swapMeal(meal, '')
        const resultMeals = result?.draft_plan?.meals || result?.plan?.meals || []
        const items = aggregateShoppingList({ meals: resultMeals.map((m) => normalizeMealRecord(m)) }, household?.staples_on_hand || '', { })
        setShoppingItems(items)
        if (household?.id) {
          await upsertShoppingListForDate({
            userId: household.user_id,
            householdId: household.id,
            weekOf: new Date().toISOString().split('T')[0],
            items,
            listId: defaultListId || null,
          })
        }
        // Show review sheet for the regenerated meal
        const slotKey = `${meal.day}-${meal.meal}`
        const newMeal = resultMeals.find((m) => `${m.day}-${m.meal}` === slotKey) || resultMeals[0]
        if (newMeal) {
          setReviewMeal(normalizeMealRecord(newMeal))
          setReviewSlotKey(slotKey)
        }
        toast.success('Meal regenerated.')
      } catch {
        // swapMeal shows its own toast on error
      } finally {
        setSaving(false)
      }
      return
    }

    if (action === 'remove') {
      if (!mealPlan?.draft_plan) return
      const nextMeals = mealPlan.draft_plan.meals.filter((m) => m.id !== meal.id)
      const nextPlan = { ...mealPlan.draft_plan, meals: nextMeals }
      setSaving(true)
      try {
        await persistPlan(nextPlan)
        const items = aggregateShoppingList({ meals: nextMeals }, household?.staples_on_hand || '', { })
        setShoppingItems(items)
        if (household?.id) {
          await upsertShoppingListForDate({
            userId: household.user_id,
            householdId: household.id,
            weekOf: new Date().toISOString().split('T')[0],
            items,
            listId: defaultListId || null,
          })
        }
        toast.success('Meal removed.')
      } catch {
        toast.error('Could not remove meal.')
      } finally {
        setSaving(false)
      }
      return
    }

    // Remove only this occurrence (adds exdate to base meal's recurrence)
    if (action === 'remove-occurrence') {
      if (!mealPlan?.draft_plan || !meal.is_occurrence) return
      const baseMealId = meal.occurrence_source_id || meal.id
      const exdate = meal.date
      if (!exdate) return
      const nextMeals = mealPlan.draft_plan.meals.map((m) => {
        if (m.id !== baseMealId) return m
        const existingExdates = Array.isArray(m.recurrence?.exdates) ? m.recurrence.exdates : []
        if (existingExdates.includes(exdate)) return m
        return { ...m, recurrence: { ...(m.recurrence || {}), exdates: [...existingExdates, exdate] } }
      })
      const nextPlan = { ...mealPlan.draft_plan, meals: nextMeals }
      setSaving(true)
      try {
        await persistPlan(nextPlan)
        const items = aggregateShoppingList({ meals: nextMeals }, household?.staples_on_hand || '', { })
        setShoppingItems(items)
        if (household?.id) {
          await upsertShoppingListForDate({
            userId: household.user_id,
            householdId: household.id,
            weekOf: new Date().toISOString().split('T')[0],
            items,
            listId: defaultListId || null,
          })
        }
        toast.success('Occurrence removed.')
      } catch {
        toast.error('Could not remove occurrence.')
      } finally {
        setSaving(false)
      }
      return
    }

    // Remove the entire series (removes base meal)
    if (action === 'remove-series') {
      if (!mealPlan?.draft_plan) return
      const targetId = meal.occurrence_source_id || meal.id
      const nextMeals = mealPlan.draft_plan.meals.filter((m) => m.id !== targetId)
      const nextPlan = { ...mealPlan.draft_plan, meals: nextMeals }
      setSaving(true)
      try {
        await persistPlan(nextPlan)
        const items = aggregateShoppingList({ meals: nextMeals }, household?.staples_on_hand || '', { })
        setShoppingItems(items)
        if (household?.id) {
          await upsertShoppingListForDate({
            userId: household.user_id,
            householdId: household.id,
            weekOf: new Date().toISOString().split('T')[0],
            items,
            listId: defaultListId || null,
          })
        }
        toast.success('Series removed.')
      } catch {
        toast.error('Could not remove series.')
      } finally {
        setSaving(false)
      }
      return
    }
  }

  const handleSetRecurrence = async (meal, recurrenceRule) => {
    if (!mealPlan?.draft_plan) return
    // Occurrences are virtual — always update the base meal
    const targetId = meal.occurrence_source_id || meal.id
    const nextMeals = mealPlan.draft_plan.meals.map((m) =>
      m.id === targetId
        ? { ...m, recurrence: recurrenceRule, recurring: recurrenceRule.frequency !== 'none' }
        : m
    )
    const nextPlan = { ...mealPlan.draft_plan, meals: nextMeals }
    setSaving(true)
    try {
      await persistPlan(nextPlan)
      toast.success(recurrenceRule.frequency === 'none' ? 'Recurrence removed.' : 'Recurrence set.')
    } catch {
      toast.error('Could not update recurrence.')
    } finally {
      setSaving(false)
    }
    setRecurrenceTarget(null)
  }

  const handleRefine = async () => {
    if (!refineTarget || !refineText.trim()) return
    setRefining(true)
    try {
      const { data, error } = await refineMeal(refineTarget, refineText.trim())
      if (error) throw new Error(error.message || 'Refine failed')
      if (!data?.refined) throw new Error('No refinement returned')

      const refined = normalizeMealRecord(data.refined)
      const currentMeals = mealPlan?.draft_plan?.meals || []
      const nextMeals = currentMeals.map((m) =>
        m.id === refineTarget.id ? { ...refined, id: m.id, day: m.day, meal: m.meal, date: m.date } : m
      )
      const nextPlan = { ...(mealPlan.draft_plan || {}), meals: nextMeals }
      await persistPlan(nextPlan)

      const items = aggregateShoppingList({ meals: nextMeals }, household?.staples_on_hand || '', { })
      setShoppingItems(items)
      if (household?.id) {
        await upsertShoppingListForDate({
          userId: household.user_id,
          householdId: household.id,
          weekOf: new Date().toISOString().split('T')[0],
          items,
          listId: defaultListId || null,
        })
      }

      try {
        await supabase.from('meal_signals').insert([
          { user_id: household.user_id, meal_name: refineTarget.name, recipe_id: refineTarget.recipe_id || null, signal_type: 'refined_from', created_at: new Date().toISOString() },
          { user_id: household.user_id, meal_name: refined.name, recipe_id: refined.recipe_id || null, signal_type: 'refined_to', created_at: new Date().toISOString() },
        ])
      } catch {
        // non-fatal
      }

      setRefineTarget(null)
      setRefineText('')
      toast.success('Meal refined.')
    } catch (err) {
      toast.error(err.message || 'Could not refine meal.')
    } finally {
      setRefining(false)
    }
  }

  const handleReviewAccept = () => {
    setReviewMeal(null)
    setReviewSlotKey(null)
    setReviewLoading(false)
  }

  const handleReviewTryAnother = async () => {
    if (!reviewMeal || !reviewSlotKey) return
    setReviewLoading(true)
    try {
      const result = await swapMeal(reviewMeal, '')
      const resultMeals = result?.draft_plan?.meals || result?.plan?.meals || []

      const newMeal = resultMeals.find((m) => `${m.day}-${m.meal}` === reviewSlotKey) || resultMeals[0]
      if (newMeal) {
        setReviewMeal(normalizeMealRecord(newMeal))
      }

      const items = aggregateShoppingList({ meals: resultMeals.map((m) => normalizeMealRecord(m)) }, household?.staples_on_hand || '', { })
      setShoppingItems(items)
      if (household?.id) {
        await upsertShoppingListForDate({
          userId: household.user_id,
          householdId: household.id,
          weekOf: new Date().toISOString().split('T')[0],
          items,
          listId: defaultListId || null,
        })
      }
    } catch {
      // swapMeal shows its own error toast
    } finally {
      setReviewLoading(false)
    }
  }

  const handleSaveMembers = async (nextMembers) => {
    setSavingMembers(true)
    try {
      await saveMembers(nextMembers)
      await reloadHousehold()
      toast.success(nextMembers.length ? 'Household members updated.' : 'All household members removed.')
    } catch (err) {
      toast.error(err?.message || 'Unable to save household members.')
      throw err
    } finally {
      setSavingMembers(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-base pb-24">
      <div className="mx-auto max-w-xl px-4 pb-24">
        <div className="flex items-center justify-between pt-4">
          <h1 className="font-display text-xl text-ink-primary">Planner</h1>
          <div className="flex gap-2">
            <button type="button" onClick={handleClearPlan} disabled={saving || generating || (!mealPlan && activeSlots.length === 0)} className="rounded-full border border-surface-muted bg-surface-card px-4 py-2 text-sm text-ink-secondary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">Start Fresh</button>
          </div>
        </div>

        {members.length === 0 ? <MemberEmptyState onOpen={() => setShowMembersModal(true)} /> : <MemberSummary members={members} onOpen={() => setShowMembersModal(true)} />}

        {members.length === 0 ? <div className="mt-3 text-sm text-ink-secondary">Meal generation stays disabled until you add at least one household member.</div> : <div className="mt-3 text-sm text-ink-secondary">Generate meals one slot at a time from each day card, or add meals manually.</div>}

        {loading ? <ScheduleSkeleton /> : (
          <MealPlanWorkspace
            meals={planMeals}
            shoppingEvents={shoppingEvents}
            onToggleShoppingDay={handleToggleShoppingDay}
            onOpenShoppingRecurrence={(shopping) => setShoppingRecurrenceTarget(shopping)}
            selectedDate={selectedDate}
            viewMode={viewMode}
            onChangeViewMode={(newMode) => {
              if (newMode === 'week') setSelectedDate(new Date())
              setViewMode(newMode)
            }}
            onPrev={handlePrevRange}
            onNext={handleNextRange}
            onOpenMeal={() => {}}
            onOpenDayActions={setDayActionTarget}
            onOpenMealActions={setMealActionTarget}
            onOpenAddMeal={handleOpenAddMeal}
            onSelectMonthDay={handleSelectMonthDay}
            generatingSlotKey={generatingSlotKey}
          />
        )}

        <DayActionsMenu
          dayDate={dayActionTarget?.date ? toIsoLocalDate(dayActionTarget.date) : ''}
          open={Boolean(dayActionTarget)}
          onClose={() => setDayActionTarget(null)}
          onClearDay={handleClearDay}
        />

        <PlannerActionSheet
          isOpen={Boolean(mealActionTarget)}
          onClose={() => setMealActionTarget(null)}
          title={mealActionTarget ? `${mealActionTarget.label} actions` : 'Meal actions'}
          subtitle="Meal-level tools"
          actions={mealActionTarget ? [
            ...(mealActionTarget.meal.is_occurrence ? [] : [
              { label: 'Regenerate this meal', onClick: () => handleMealAction('regenerate', mealActionTarget.meal) },
              { label: 'Refine…', onClick: () => { setMealActionTarget(null); setRefineTarget(mealActionTarget.meal); setRefineText('') } },
              { label: 'Replace…', onClick: () => handleMealAction('replace', mealActionTarget.meal) },
            ]),
            { label: 'Repeat…', onClick: () => { setMealActionTarget(null); setRecurrenceTarget(mealActionTarget.meal) } },
            ...(mealActionTarget.meal.is_occurrence ? [
              { label: 'Remove this occurrence', onClick: () => handleMealAction('remove-occurrence', mealActionTarget.meal), danger: true },
              { label: 'Remove series', onClick: () => handleMealAction('remove-series', mealActionTarget.meal), danger: true },
            ] : [
              { label: 'Remove', onClick: () => handleMealAction('remove', mealActionTarget.meal), danger: true },
            ]),
          ] : []}
        />

        <AddMealModal
          open={Boolean(addMealTarget)}
          onClose={() => setAddMealTarget(null)}
          dayKey={addMealTarget?.day?.key || 'mon'}
          mealSlot={addMealTarget?.mealSlot || 'dinner'}
          mealPlanId={mealPlan?.id || ''}
          existingMealId={addMealTarget?.existingMealId || null}
          canGenerate={members.length > 0}
          members={members}
          defaultEffort={addMealTarget ? (slotState[`${addMealTarget.day?.key}-${addMealTarget.mealSlot}`]?.effort_level || 'medium') : 'medium'}
          defaultAttendees={addMealTarget ? (slotState[`${addMealTarget.day?.key}-${addMealTarget.mealSlot}`]?.attendees || []) : []}
          startOnGenerate={false}
          onOpenGenerateFlow={() => {
            const target = addMealTarget
            setAddMealTarget(null)
            if (target?.day?.key && target?.mealSlot) {
              const dayTargetDate = target.day?.date ? toIsoLocalDate(target.day.date) : toIsoLocalDate(new Date(selectedDate))
              setGenerateFlowTarget({ dayKey: target.day.key, mealSlot: target.mealSlot, targetDate: dayTargetDate })
            }
          }}
          onGenerate={async ({ effort, attendees, planningNotes, dietaryFocus }) => {
            const target = addMealTarget
            setAddMealTarget(null)
            if (target?.day?.key && target?.mealSlot) {
              const dayTargetDate = target.day?.date ? toIsoLocalDate(target.day.date) : toIsoLocalDate(new Date(selectedDate))
              await handleGenerateSlot(target.day.key, target.mealSlot, { effort, attendees, planningNotes, dietaryFocus, targetDate: dayTargetDate })
            }
          }}
          onSaveMeal={async (input) => {
            if (!household?.id) {
              toast.error('Household not loaded yet.')
              return
            }

            const slotKey = `${input.dayKey}-${input.mealSlot}`
            const existingSlot = slotState[slotKey]
            const fallbackAttendees = memberOptions.slice(0, 1).map((member) => member.id)
            const ensuredSlot = {
              day_of_week: input.dayKey,
              meal_type: input.mealSlot,
              active: true,
              attendees: existingSlot?.attendees?.length ? existingSlot.attendees : fallbackAttendees,
              is_leftover: existingSlot?.is_leftover || false,
              leftover_source: existingSlot?.leftover_source || '',
              effort_level: existingSlot?.effort_level || 'medium',
              planning_notes: existingSlot?.planning_notes || '',
            }

            const nextSlotState = {
              ...slotState,
              [slotKey]: ensuredSlot,
            }

            const nextActiveSlots = Object.values(nextSlotState).filter((slot) => slot.active && slot.attendees?.length > 0)
            const activeSchedule = schedule?.id
              ? schedule
              : await saveSchedule({
                  householdId: household.id,
                  shoppingDay: null,
                  nextShoppingDate: null,
                  weekNotes,
                  slots: nextActiveSlots,
                  validMemberIds: memberOptions.map((member) => member.id),
                })

            const mealTitle = input.recipe?.title || input.title || 'Custom meal'

            // For catalog meals, fetch full recipe so ingredients/instructions/image are embedded
            let catalogRecipe = null
            let normalizedCatalogRecipe = null
            if (input.meal_source === 'catalog' && input.source_recipe_id) {
              try {
                const { data } = await supabase
                  .from('recipes')
                  .select('title, image_url, servings, prep_time_minutes, cook_time_minutes, total_time_minutes, ingredient_groups_json, instruction_groups_json, ingredients_json, instructions_json, nutrition_json')
                  .eq('id', input.source_recipe_id)
                  .maybeSingle()
                catalogRecipe = data || null
                if (catalogRecipe) {
                  normalizedCatalogRecipe = normalizeRecipe({
                    title: input.recipe?.title || catalogRecipe.title || mealTitle,
                    imageUrl: catalogRecipe.image_url || input.recipe?.image_url || null,
                    servings: catalogRecipe.servings || null,
                    prepTime: catalogRecipe.prep_time_minutes || null,
                    cookTime: catalogRecipe.cook_time_minutes || null,
                    totalTime: catalogRecipe.total_time_minutes || null,
                    ingredientGroups: catalogRecipe.ingredient_groups_json || null,
                    instructionGroups: catalogRecipe.instruction_groups_json || null,
                    ingredients: catalogRecipe.ingredients_json || null,
                    instructions: catalogRecipe.instructions_json || null,
                    nutrition: catalogRecipe.nutrition_json || null,
                  })
                }
              } catch {
                // Non-fatal: meal saves without embedded recipe data
              }
            }

            const currentMeals = mealPlan?.draft_plan?.meals || []
            const saveMealTargetDate = addMealTarget?.day?.date
              ? toIsoLocalDate(addMealTarget.day.date)
              : toIsoLocalDate(new Date(selectedDate))
            const newMeal = {
              id: input.existingMealId || crypto.randomUUID(),
              day: input.dayKey,
              meal: input.mealSlot,
              date: saveMealTargetDate,
              recurring: false,
              name: mealTitle,
              source: input.meal_source,
              source_type: input.meal_source,
              source_recipe_id: input.source_recipe_id || null,
              place_name: input.place_name || null,
              source_note: input.source_note || null,
              image_url: normalizedCatalogRecipe?.imageUrl || catalogRecipe?.image_url || input.recipe?.image_url || null,
              ...(normalizedCatalogRecipe ? {
                servings: normalizedCatalogRecipe.servings || catalogRecipe?.servings || null,
                prep_time_minutes: normalizedCatalogRecipe.prepTime || catalogRecipe?.prep_time_minutes || null,
                cook_time_minutes: normalizedCatalogRecipe.cookTime || catalogRecipe?.cook_time_minutes || null,
                total_time_minutes: normalizedCatalogRecipe.totalTime || catalogRecipe?.total_time_minutes || null,
                ingredientGroups: normalizedCatalogRecipe.ingredientGroups || null,
                instructionGroups: normalizedCatalogRecipe.instructionGroups || null,
                ingredients: normalizedCatalogRecipe.ingredientGroups?.flatMap((group) => group.ingredients || []) || normalizedCatalogRecipe.ingredients || null,
                instructions: normalizedCatalogRecipe.instructionGroups?.flatMap((group) => group.steps || []).map((step) => step?.text).filter(Boolean) || normalizedCatalogRecipe.instructions || null,
                nutrition: normalizedCatalogRecipe.nutrition || catalogRecipe?.nutrition_json || null,
              } : {}),
            }
            const nextMeals = input.existingMealId
              ? currentMeals.map((m) => m.id === input.existingMealId ? newMeal : m)
              : [...currentMeals, newMeal]
            const nextPlan = { ...(mealPlan?.draft_plan || { meals: [] }), meals: nextMeals }

            if (mealPlan?.id) {
              await persistPlan(nextPlan)
            } else {
              await createPlan({
                household,
                schedule: activeSchedule,
                meals: nextMeals,
              })
            }

            const items = aggregateShoppingList({ meals: nextMeals }, household?.staples_on_hand || '', { })
            setShoppingItems(items)
            await upsertShoppingListForDate({
              userId: household.user_id,
              householdId: household.id,
              weekOf: new Date().toISOString().split('T')[0],
              items,
              listId: defaultListId || null,
            })

            setSlotState(nextSlotState)
            await loadSchedule()
            await loadMealPlan()
            setAddMealTarget(null)
            toast.success('Meal added.')
          }}
        />

        {refineTarget && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => { setRefineTarget(null); setRefineText('') }}>
            <div
              className="w-full max-w-md rounded-3xl bg-surface-card p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-lg font-semibold text-ink-primary">Refine meal</div>
              <div className="mt-0.5 text-sm text-ink-secondary">{refineTarget.name}</div>
              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-ink-tertiary">What should change?</label>
                <input
                  type="text"
                  value={refineText}
                  onChange={(e) => setRefineText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && refineText.trim() && !refining) handleRefine() }}
                  placeholder="e.g. make it vegetarian, less spicy, use mushrooms"
                  className="input w-full"
                  autoFocus
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setRefineTarget(null); setRefineText('') }}
                  className="flex-1 rounded-full border border-surface-muted px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRefine}
                  disabled={!refineText.trim() || refining}
                  className="flex-1 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-primary-600"
                >
                  {refining ? 'Refining…' : 'Refine'}
                </button>
              </div>
            </div>
          </div>
        )}

        <HouseholdMembersModal
          open={showMembersModal}
          members={members}
          saving={savingMembers}
          onClose={() => setShowMembersModal(false)}
          onSave={handleSaveMembers}
        />

        <RecurrencePicker
          open={Boolean(recurrenceTarget)}
          meal={recurrenceTarget}
          onClose={() => setRecurrenceTarget(null)}
          onSelect={(type) => handleSetRecurrence(recurrenceTarget, type)}
        />

        <RecurrencePicker
          open={Boolean(shoppingRecurrenceTarget)}
          meal={shoppingRecurrenceTarget}
          onClose={() => setShoppingRecurrenceTarget(null)}
          onSelect={handleSetShoppingRecurrence}
        />

        {plannerPickerOpen && lists.length > 0 && (
          <ShoppingListPickerModal
            lists={lists}
            onSelect={async (id) => {
              setPlannerPickerOpen(false)
              try {
                await upsertShoppingListForDate({
                  userId: household.user_id,
                  householdId: household.id,
                  weekOf: new Date().toISOString().split('T')[0],
                  items: shoppingItems,
                  listId: id,
                })
                const list = lists.find((l) => l.id === id)
                toast.success(list ? `Groceries sent to "${list.name}"` : 'Groceries synced')
              } catch {
                toast.error('Could not sync groceries.')
              }
            }}
            onCreateAndSelect={async (name) => {
              try {
                const created = await createList(name)
                setPlannerPickerOpen(false)
                await upsertShoppingListForDate({
                  userId: household.user_id,
                  householdId: household.id,
                  weekOf: new Date().toISOString().split('T')[0],
                  items: shoppingItems,
                  listId: created.id,
                })
                toast.success(`Groceries sent to "${created.name}"`)
              } catch {
                toast.error('Could not create list or sync groceries.')
              }
            }}
            onClose={() => setPlannerPickerOpen(false)}
          />
        )}

        <PlannerGenerationFlow
          open={Boolean(generateFlowTarget)}
          onClose={() => setGenerateFlowTarget(null)}
          dayKey={generateFlowTarget?.dayKey || 'mon'}
          mealSlot={generateFlowTarget?.mealSlot || 'dinner'}
          members={members}
          defaultEffort={generateFlowTarget ? (slotState[`${generateFlowTarget.dayKey}-${generateFlowTarget.mealSlot}`]?.effort_level || 'medium') : 'medium'}
          defaultAttendees={generateFlowTarget ? (slotState[`${generateFlowTarget.dayKey}-${generateFlowTarget.mealSlot}`]?.attendees || []) : []}
          onGenerate={handleFlowGenerate}
          onTryAnother={handleFlowTryAnother}
          onRefine={handleFlowRefine}
          onAccept={handleFlowAccept}
          onLockAndAccept={handleFlowLockAndAccept}
        />

        {reviewMeal && (
          <PlannerMealReviewSheet
            meal={reviewMeal}
            loading={reviewLoading}
            onAccept={handleReviewAccept}
            onTryAnother={handleReviewTryAnother}
          />
        )}

        <div className="card mt-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-xl text-text-primary">Shopping List</div>
            {shoppingItems.length > 0 && !generating && (
              <button
                type="button"
                onClick={() => {
                  if (alwaysAsk && lists.length > 0) {
                    setPlannerPickerOpen(true)
                  } else {
                    upsertShoppingListForDate({
                      userId: household.user_id,
                      householdId: household.id,
                      weekOf: new Date().toISOString().split('T')[0],
                      items: shoppingItems,
                      listId: defaultListId || null,
                    })
                      .then(() => {
                        const list = lists.find((l) => l.id === defaultListId) || null
                        toast.success(list ? `Groceries sent to "${list.name}"` : 'Groceries synced')
                      })
                      .catch(() => toast.error('Could not sync groceries.'))
                  }
                }}
                className="text-sm text-primary-600 hover:underline"
              >
                Send to list →
              </button>
            )}
          </div>
          {generating ? <div className="rounded-2xl border border-surface-muted bg-white px-4 py-6 text-sm text-ink-secondary">Updating your shopping list…</div> : shoppingItems.length === 0 ? <EmptyState emoji="🛒" headline="Shopping list will appear automatically" body="Add or generate meals and we'll build the list automatically." ctaLabel={null} /> : (
            <div className="rounded-xl border border-divider bg-white p-4">
              {groupedShopping.map(({ category, items }, groupIndex) => (
                <div key={category} className={groupIndex > 0 ? 'mt-4' : ''}>
                  <div className="mb-2 border-b border-gray-100 pb-1 text-sm font-semibold text-gray-500">{`${CATEGORY_EMOJI[category] || '📦'} ${category}`}</div>
                  <ul className="space-y-1 text-sm text-text-secondary">{items.map((item, itemIdx) => <li key={`${category}-${itemIdx}`}>{item.quantity} {item.unit} {item.name}</li>)}</ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
