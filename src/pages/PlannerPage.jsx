import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useHousehold } from '../hooks/useHousehold'
import { useSchedule } from '../hooks/useSchedule'
import { useMealPlan } from '../hooks/useMealPlan'
import { useSubscription } from '../hooks/useSubscription'
import { ScheduleSkeleton, EmptyState } from '../components/LoadingStates'
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
  const { household, members, loading: householdLoading, saveMembers, reloadHousehold } = useHousehold()
  const { schedule, slots, loading: scheduleLoading, saveSchedule, loadSchedule } = useSchedule()
  const { isPremium } = useSubscription()
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

  const [shoppingDay, setShoppingDay] = useState('Sunday')
  const [weekNotes, setWeekNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(PLANNER_VIEW_MODE_KEY) || 'day')
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

  const handleOpenAddMeal = (day, mealSlot = 'dinner', existingMealId = null) => {
    setAddMealTarget({ day, mealSlot, existingMealId })
  }

  const handleClearDay = async (dayDate) => {
    const target = new Date(dayDate)
    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][target.getDay()]

    if (mealPlan?.draft_plan?.meals?.length) {
      const nextMeals = mealPlan.draft_plan.meals.filter((m) => m.day !== dayKey)
      const nextPlan = { ...mealPlan.draft_plan, meals: nextMeals }
      try {
        await persistPlan(nextPlan)
      } catch {
        toast.error('Could not clear day.')
        return
      }
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
      setSlotState({})
      setShoppingItems([])
      toast.success("Plan cleared. Start fresh whenever you're ready.")
    } catch (err) {
      toast.error(err?.message || "Unable to clear plan.")
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateSlot = async (dayKey, mealType) => {
    if (!members.length) return toast.error('Add household members first.')
    if (!household?.id) return toast.error('Household not loaded yet.')

    const slotKey = `${dayKey}-${mealType}`
    const existingSlot = slotState[slotKey]
    const fallbackAttendees = memberOptions.slice(0, 1).map((m) => m.id)

    const slot = {
      day_of_week: dayKey,
      meal_type: mealType,
      active: true,
      attendees: existingSlot?.attendees?.length ? existingSlot.attendees : fallbackAttendees,
      effort_level: existingSlot?.effort_level || 'medium',
      planning_notes: existingSlot?.planning_notes || '',
      is_leftover: existingSlot?.is_leftover || false,
      leftover_source: existingSlot?.leftover_source || '',
    }

    setSaving(true)
    try {
      let activeSchedule = schedule
      if (!schedule?.id) {
        activeSchedule = await saveSchedule({
          householdId: household.id,
          shoppingDay,
          weekNotes,
          slots: [slot],
          validMemberIds: memberOptions.map((m) => m.id),
        })
        if (!activeSchedule?.id) throw new Error('Could not create schedule')
        await loadSchedule()
      }

      await generateSlot({ household, members, slot, schedule: activeSchedule })
      toast.success('Meal generated.')
    } catch (err) {
      if (err?.message !== 'Session expired') {
        toast.error(err?.message || 'Could not generate meal for this slot.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleMealAction = async (action, meal) => {
    setMealActionTarget(null)

    if (action === 'replace') {
      handleOpenAddMeal({ key: meal.day, date: new Date(selectedDate) }, meal.meal, meal.id)
      return
    }

    if (action === 'regenerate') {
      if (!members.length) return toast.error('Add household members first.')
      setSaving(true)
      try {
        await swapMeal(meal, '')
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
        toast.success('Meal removed.')
      } catch {
        toast.error('Could not remove meal.')
      } finally {
        setSaving(false)
      }
      return
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
      <div className="mx-auto max-w-2xl px-4 pb-24">
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
            selectedDate={selectedDate}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
            onPrev={handlePrevRange}
            onNext={handleNextRange}
            onOpenDayActions={setDayActionTarget}
            onOpenMealActions={setMealActionTarget}
            onOpenAddMeal={handleOpenAddMeal}
            generating={saving || generating}
            onGenerateSlot={members.length > 0 ? handleGenerateSlot : null}
            onSelectMonthDay={handleSelectMonthDay}
          />
        )}

        <DayActionsMenu
          dayDate={dayActionTarget?.date?.toISOString?.().slice(0, 10) || ''}
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
          canGenerate={members.length > 0}
          onGenerate={async () => {
            const target = addMealTarget
            setAddMealTarget(null)
            if (target?.day?.key && target?.mealSlot) {
              await handleGenerateSlot(target.day.key, target.mealSlot)
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
                  shoppingDay,
                  weekNotes,
                  slots: nextActiveSlots,
                  validMemberIds: memberOptions.map((member) => member.id),
                })

            const mealTitle = input.recipe?.title || input.title || 'Custom meal'
            const currentMeals = mealPlan?.draft_plan?.meals || []
            const newMeal = {
              id: input.existingMealId || crypto.randomUUID(),
              day: input.dayKey,
              meal: input.mealSlot,
              name: mealTitle,
              source: input.meal_source,
              source_type: input.meal_source,
              source_recipe_id: input.source_recipe_id || null,
              place_name: input.place_name || null,
              source_note: input.source_note || null,
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

            setSlotState(nextSlotState)
            await loadSchedule()
            await loadMealPlan()
            setAddMealTarget(null)
            toast.success('Meal added.')
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
