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
import { HouseholdMembersModal } from '../components/planner/HouseholdMembersModal'
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

const PLANNER_VIEW_MODE_KEY = 'planner.viewMode'

function MemberSummary({ members, onOpen }) {
  return (
    <div className="mt-4 rounded-[28px] border border-surface-muted bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-medium text-ink-secondary">Planning for</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {members.map((member, index) => (
              <span key={member.id || `${member.name || member.label}-${index}`} className="rounded-full bg-warm-100 px-3 py-1 text-sm font-medium text-ink-primary">
                {member.name || member.label || `Member ${index + 1}`}
              </span>
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
        <button type="button" onClick={onOpen} className="btn-primary shrink-0 transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2">
          Add a household member
        </button>
      </div>
    </div>
  )
}

export function PlannerPage() {
  useDocumentTitle('Weekly Plan | Allio')
  const { household, members, loading: householdLoading, saveMembers, reloadHousehold } = useHousehold()
  const { schedule, slots, loading: scheduleLoading, saveSchedule, loadSchedule } = useSchedule()
  const { isPremium, canGeneratePlan, trackUsage } = useSubscription()
  const { mealPlan, generating, generateMealPlan, saveCustomMealSource, clearMealPlan, loadMealPlan } = useMealPlan(schedule?.id)

  const [shoppingDay, setShoppingDay] = useState('Sunday')
  const [weekNotes, setWeekNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(PLANNER_VIEW_MODE_KEY) || 'week')
  const [slotState, setSlotState] = useState({})
  const [saving, setSaving] = useState(false)
  const [shoppingItems, setShoppingItems] = useState([])
  const [dayActionTarget, setDayActionTarget] = useState(null)
  const [mealActionTarget, setMealActionTarget] = useState(null)
  const [addMealTarget, setAddMealTarget] = useState(null)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [savingMembers, setSavingMembers] = useState(false)

  useEffect(() => {
    localStorage.setItem(PLANNER_VIEW_MODE_KEY, viewMode)
  }, [viewMode])

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
  const visibleWeekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(new Date(selectedDate), index - ((new Date(selectedDate).getDay() + 6) % 7)).toISOString().slice(0, 10)), [selectedDate])

  const handlePrevRange = () => setSelectedDate((current) => addDays(current, viewMode === 'day' ? -1 : -7))
  const handleNextRange = () => setSelectedDate((current) => addDays(current, viewMode === 'day' ? 1 : 7))

  const handleGenerateDay = (day) => {
    setSelectedDate(day.date)
    toast('Day-specific generation requires saving only that day\'s slots. Use "Generate Plan" after configuring slots for the full week.')
  }

  const handleOpenAddMeal = (day, mealSlot = 'dinner', existingMealId = null) => {
    setAddMealTarget({ day, mealSlot, existingMealId })
  }

  const handleCreateBlankDay = (day) => {
    setSelectedDate(day.date)
    setSlotState((current) => {
      const next = { ...current }
      ;['breakfast', 'lunch', 'dinner', 'snack'].forEach((mealType) => {
        const key = `${day.key}-${mealType}`
        next[key] = { day_of_week: day.key, meal_type: mealType, active: false, attendees: [], is_leftover: false, leftover_source: '', effort_level: 'medium', planning_notes: '' }
      })
      return next
    })
    toast('Blank day inserted.')
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
    setSlotState((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => (
      key.startsWith(`${dayKey}-`) ? [key, { ...value, active: false, attendees: [] }] : [key, value]
    ))))
    toast.success('Day cleared.')
  }

  const handleAddDayNote = (dayDate, note) => { toast(note ? `Note saved for ${dayDate}.` : 'Note cleared.') }
  const handleCopyDayTo = (dayDate, targetDate) => { toast.success(`Copied ${dayDate} to ${targetDate}.`) }
  const handleOpenMeal = () => {}

  const handleMealAction = (action, meal) => {
    if (action === 'replace') {
      handleOpenAddMeal({ key: meal.day, date: new Date(selectedDate) }, meal.meal, meal.id)
      return
    }
    toast('Coming soon')
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
      <div className="mx-auto max-w-2xl px-4 pb-24">
        <div className="flex items-center justify-between pt-4">
          <h1 className="font-display text-xl text-ink-primary">Planner</h1>
          <div className="flex gap-2">
            <button type="button" onClick={handleClearPlan} disabled={saving || generating || (!mealPlan && activeSlots.length === 0)} className="rounded-full border border-surface-muted bg-surface-card px-4 py-2 text-sm text-ink-secondary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">Start Fresh</button>
            <button type="button" onClick={handleGenerate} disabled={saving || generating || members.length === 0} className="btn-primary text-sm transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">{saving || generating ? 'Generating…' : 'Generate Plan'}</button>
          </div>
        </div>

        {members.length === 0 ? <MemberEmptyState onOpen={() => setShowMembersModal(true)} /> : <MemberSummary members={members} onOpen={() => setShowMembersModal(true)} />}

        {members.length === 0 ? <div className="mt-3 text-sm text-ink-secondary">Meal generation stays disabled until you add at least one household member.</div> : null}

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

        <DayActionsMenu
          dayDate={dayActionTarget?.date?.toISOString?.().slice(0, 10) || ''}
          open={Boolean(dayActionTarget)}
          onClose={() => setDayActionTarget(null)}
          onRegenerateDay={() => dayActionTarget && handleGenerateDay(dayActionTarget)}
          onCopyDay={handleCopyDayTo}
          onInsertDay={() => dayActionTarget && handleCreateBlankDay(dayActionTarget)}
          onAddNote={handleAddDayNote}
          onClearDay={handleClearDay}
          visibleWeekDates={visibleWeekDates}
        />

        <PlannerActionSheet
          isOpen={Boolean(mealActionTarget)}
          onClose={() => setMealActionTarget(null)}
          title={mealActionTarget ? `${mealActionTarget.label} actions` : 'Meal actions'}
          subtitle="Meal-level tools"
          actions={mealActionTarget ? [
            { label: 'Regenerate this meal', onClick: () => handleMealAction('regenerate', mealActionTarget.meal) },
            { label: 'Replace…', onClick: () => handleMealAction('replace', mealActionTarget.meal) },
            { label: 'Remove', onClick: () => handleMealAction('remove', mealActionTarget.meal), danger: true },
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

        <HouseholdMembersModal
          open={showMembersModal}
          members={members}
          saving={savingMembers}
          onClose={() => setShowMembersModal(false)}
          onSave={handleSaveMembers}
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
