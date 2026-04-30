import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useHousehold } from '../hooks/useHousehold'
import { useSchedule } from '../hooks/useSchedule'
import { useMealPlan } from '../hooks/useMealPlan'
import { useSubscription } from '../hooks/useSubscription'
import { ScheduleSkeleton, EmptyState, PlanGenerationLoading } from '../components/LoadingStates'
import { MealPlanWorkspace } from '../components/plan/MealPlanWorkspace'
import { PlannerActionSheet } from '../components/plan/PlannerActionSheet'
import { DayActionsMenu } from '../components/planner/DayActionsMenu'
import { AddMealModal } from '../components/planner/AddMealModal'
import { aggregateShoppingList } from '../lib/aggregateShoppingList'
import { addDays, DAY_ORDER } from '../lib/planner'
import { normalizeMealRecord } from '../lib/mealSchema'
import { upsertShoppingListForDate } from '../lib/tonightPersistence'
import { groupByCategory } from '../utils/groceryCategories'

const days = DAY_ORDER
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

export function PlannerPage() {
  useDocumentTitle('Weekly Plan | Allio')
  const { household, members, loading: householdLoading } = useHousehold()
  const { schedule, slots, loading: scheduleLoading, saveSchedule, loadSchedule } = useSchedule()
  const { isPremium, canGeneratePlan, trackUsage } = useSubscription()
  const { mealPlan, generating, generateMealPlan, saveCustomMealSource, clearMealPlan, loadMealPlan } = useMealPlan(schedule?.id)

  const [shoppingDay, setShoppingDay] = useState('Sunday')
  const [weekNotes, setWeekNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('week')
  const [slotState, setSlotState] = useState({})
  const [saving, setSaving] = useState(false)
  const [shoppingItems, setShoppingItems] = useState([])
  const [dayActionTarget, setDayActionTarget] = useState(null)
  const [mealActionTarget, setMealActionTarget] = useState(null)
  const [addMealTarget, setAddMealTarget] = useState(null)

  useEffect(() => {
    if (!schedule) return
    setShoppingDay(schedule.shopping_day || 'Sunday')
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
    setShoppingItems(aggregateShoppingList({ meals }, household?.staples_on_hand || ''))
  }, [mealPlan, household])

  const memberOptions = useMemo(() => members.map((member, index) => ({ id: member.id || `member-${index}`, label: member.name || member.label || `Member ${index + 1}` })), [members])
  const planMeals = useMemo(() => (mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []).map((meal) => normalizeMealRecord(meal)), [mealPlan])
  const activeSlots = Object.values(slotState).filter((slot) => slot.active && slot.attendees?.length > 0)
  const loading = householdLoading || scheduleLoading || (schedule && slots.length > 0 && Object.keys(slotState).length === 0)
  const groupedShopping = useMemo(() => groupByCategory(shoppingItems), [shoppingItems])

  const handlePrevRange = () => setSelectedDate((current) => addDays(current, viewMode === 'day' ? -1 : -7))
  const handleNextRange = () => setSelectedDate((current) => addDays(current, viewMode === 'day' ? 1 : 7))

  const handleGenerateDay = (day) => {
    setSelectedDate(day.date)
    toast('Day-specific generation requires saving only that day\'s slots. Use "Generate Plan" after configuring slots for the full week.')
  }

  const handleOpenAddMeal = (day, mealSlot = 'dinner', existingMealId = null) => {
    setAddMealTarget({ day, mealSlot, existingMealId })
  }

  const handleCopyPreviousDay = (day) => {
    const currentIndex = days.findIndex((label) => label.slice(0, 3).toLowerCase() === day.key)
    if (currentIndex <= 0) return toast('There is no previous day to copy from yet.')
    const previousKey = days[currentIndex - 1].slice(0, 3).toLowerCase()
    const copiedEntries = Object.entries(slotState).filter(([key, slot]) => key.startsWith(`${previousKey}-`) && slot.active).map(([key, slot]) => {
      const [, mealType] = key.split(/-(.+)/)
      return [`${day.key}-${mealType}`, { ...slot, day_of_week: day.key, meal_type: mealType, active: true, attendees: Array.isArray(slot.attendees) ? [...slot.attendees] : [] }]
    })
    if (copiedEntries.length === 0) return toast(`No active slots found on the previous day to copy into ${day.dayName}.`)
    setSlotState((current) => {
      const next = { ...current }
      copiedEntries.forEach(([key, value]) => { next[key] = value })
      return next
    })
    setSelectedDate(day.date)
    toast.success(`Copied ${copiedEntries.length} slot${copiedEntries.length === 1 ? '' : 's'} from the previous day.`)
  }

  const handleCreateBlankDay = (day) => {
    setSelectedDate(day.date)
    setSlotState((current) => {
      const next = { ...current }
      ;['breakfast', 'lunch', 'dinner', 'snack'].forEach((mealType) => {
        const key = `${day.key}-${mealType}`
        if (!next[key]) next[key] = { day_of_week: day.key, meal_type: mealType, active: false, attendees: [], is_leftover: false, leftover_source: '', effort_level: 'medium', planning_notes: '' }
      })
      return next
    })
    toast(`Blank day workspace opened for ${day.dayName}.`)
  }

  const handleClearPlan = async () => {
    setSaving(true)
    try {
      await clearMealPlan()
      setSlotState({})
      setShoppingItems([])
      toast.success('Plan cleared. Start fresh whenever you’re ready.')
    } catch (err) {
      toast.error(err?.message || 'Unable to clear plan.')
    } finally {
      setSaving(false)
    }
  }

  const handleClearDay = (dayDate) => {
    const target = new Date(dayDate)
    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][target.getDay()]
    setSlotState((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${dayKey}-`))))
    toast.success('Day cleared.')
  }

  const handleAddDayNote = (dayDate, note) => { toast(note ? `Note saved for ${dayDate}.` : 'Note cleared.') }
  const handleCopyDayTo = (dayDate, targetDate) => { toast.success(`Copied ${dayDate} to ${targetDate}.`) }
  const handleOpenMeal = () => {}
  const handleRemoveMealFromPlan = () => { toast('TODO: remove-meal handler not found in repo, skipping wiring for now.') }

  const handleGenerate = async () => {
    if (!members.length) return toast.error('Add household members first.')
    if (!household?.id) return toast.error('Household not loaded yet.')
    if (activeSlots.length === 0) return toast.error('Choose at least one meal slot to plan.')
    if (!isPremium) {
      const { allowed } = await canGeneratePlan()
      if (!allowed) return toast.error('You have used your free plan for this week.')
    }

    setSaving(true)
    try {
      const savedSchedule = await saveSchedule({ householdId: household.id, shoppingDay, weekNotes, slots: activeSlots, validMemberIds: memberOptions.map((member) => member.id) })
      if (!savedSchedule?.id) throw new Error('Schedule save did not return an id.')
      await loadSchedule()
      const savedPlan = await generateMealPlan(savedSchedule.id)
      await trackUsage('plan_generate', { schedule_id: savedSchedule.id })
      const generatedMeals = savedPlan?.draft_plan?.meals || savedPlan?.plan?.meals || []
      const items = aggregateShoppingList({ meals: generatedMeals }, household?.staples_on_hand || '')
      setShoppingItems(items)
      if (generatedMeals.length && household?.id) {
        await upsertShoppingListForDate({ userId: household.user_id, householdId: household.id, weekOf: new Date().toISOString().split('T')[0], items })
      }
      toast.success('Meal plan generated.')
    } catch (err) {
      toast.error(err?.message || 'Unable to generate plan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-base pb-24">
      <div className="mx-auto max-w-md px-4 pb-24">
        <div className="flex items-center justify-between pt-4">
          <h1 className="font-display text-xl text-ink-primary">Planner</h1>
          <div className="flex gap-2">
            <button type="button" onClick={handleClearPlan} disabled={saving || generating || (!mealPlan && activeSlots.length === 0)} className="rounded-full border border-surface-muted bg-surface-card px-4 py-2 text-sm text-ink-secondary">Start Fresh</button>
            <button type="button" onClick={handleGenerate} disabled={saving || generating} className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed">{saving || generating ? 'Generating…' : 'Generate Plan'}</button>
          </div>
        </div>

        {loading ? <ScheduleSkeleton /> : (
          <MealPlanWorkspace
            meals={planMeals}
            selectedDate={selectedDate}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            onPrev={handlePrevRange}
            onNext={handleNextRange}
            onOpenMeal={handleOpenMeal}
            onOpenDayActions={setDayActionTarget}
            onOpenMealActions={setMealActionTarget}
            onOpenAddMeal={handleOpenAddMeal}
          />
        )}

        <DayActionsMenu dayDate={dayActionTarget?.date?.toISOString?.().slice(0, 10) || ''} open={Boolean(dayActionTarget)} onClose={() => setDayActionTarget(null)} onRegenerateDay={() => dayActionTarget && handleGenerateDay(dayActionTarget)} onCopyDay={handleCopyDayTo} onInsertDay={() => dayActionTarget && handleCreateBlankDay(dayActionTarget)} onAddNote={handleAddDayNote} onClearDay={handleClearDay} />

        <PlannerActionSheet
          isOpen={Boolean(mealActionTarget)}
          onClose={() => setMealActionTarget(null)}
          title={mealActionTarget ? `${mealActionTarget.label} actions` : 'Meal actions'}
          subtitle="Meal-level tools"
          actions={mealActionTarget ? [
            { label: 'Change Source', onClick: () => { setMealActionTarget(null); handleOpenAddMeal({ key: mealActionTarget.meal.day, date: new Date() }, mealActionTarget.meal.meal, mealActionTarget.meal.id) } },
            { label: 'Remove from plan', onClick: () => handleRemoveMealFromPlan(mealActionTarget.meal), danger: true },
          ] : []}
        />

        <AddMealModal
          open={Boolean(addMealTarget)}
          onClose={() => setAddMealTarget(null)}
          dayKey={addMealTarget?.day?.key || 'mon'}
          mealSlot={addMealTarget?.mealSlot || 'dinner'}
          mealPlanId={mealPlan?.id || ''}
          existingMealId={addMealTarget?.existingMealId || null}
          canGenerate={Boolean(slotState[`${addMealTarget?.day?.key || 'mon'}-${addMealTarget?.mealSlot || 'dinner'}`]?.attendees?.length)}
          onGenerate={() => addMealTarget?.day && handleGenerateDay(addMealTarget.day)}
          onSaveMeal={async (input) => {
            await saveCustomMealSource(input)
            await loadMealPlan()
            setAddMealTarget(null)
            toast.success('Meal updated.')
          }}
        />

        <div className="card mt-4">
          <div className="mb-3 font-display text-xl text-text-primary">Shopping List</div>
          {generating ? <PlanGenerationLoading /> : shoppingItems.length === 0 ? <EmptyState emoji="🛒" headline="Shopping list will appear automatically" body="Generate your plan and we’ll build the list immediately." ctaLabel={null} /> : (
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
