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
import { aggregateShoppingList } from '../lib/aggregateShoppingList'
import { supabase } from '../lib/supabase'
import { addDays, DAY_ORDER } from '../lib/planner'
import { normalizeMealRecord } from '../lib/mealSchema'

const days = DAY_ORDER
const inputClassName = 'input'

export function PlannerPage() {
  useDocumentTitle('Weekly Plan | Allio')
  const { household, members, loading: householdLoading } = useHousehold()
  const { schedule, slots, loading: scheduleLoading, saveSchedule, loadSchedule } = useSchedule()
  const { isPremium, canGeneratePlan, trackUsage } = useSubscription()
  const { mealPlan, generating, generateMealPlan, toggleMealLock, saveMealNote, swapMeal, clearMealPlan } = useMealPlan(schedule?.id)

  const [shoppingDay, setShoppingDay] = useState('Sunday')
  const [weekNotes, setWeekNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('day')
  const [editorKey, setEditorKey] = useState(null)
  const [slotState, setSlotState] = useState({})
  const [saving, setSaving] = useState(false)
  const [shoppingItems, setShoppingItems] = useState([])
  const [dayActionTarget, setDayActionTarget] = useState(null)
  const [mealActionTarget, setMealActionTarget] = useState(null)
  const [selectedMealDetail, setSelectedMealDetail] = useState(null)
  const [mealDetailMode, setMealDetailMode] = useState('view')

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
    const items = aggregateShoppingList({ meals }, household?.staples_on_hand || '')
    setShoppingItems(items)
  }, [mealPlan, household])

  const memberOptions = useMemo(() => members.map((member, index) => ({ id: member.id || `member-${index}`, label: member.name || member.label || `Member ${index + 1}` })), [members])

  const planMeals = useMemo(() => (mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []).map((meal) => normalizeMealRecord(meal)), [mealPlan])

  const activeSlots = Object.values(slotState).filter((slot) => slot.active && slot.attendees?.length > 0)
  const primarySlot = activeSlots[0] || null
  const loading = householdLoading || scheduleLoading || (schedule && slots.length > 0 && Object.keys(slotState).length === 0)
  const groupedShopping = useMemo(() => {
    const groups = {}
    shoppingItems.forEach((item) => {
      const key = item.category || 'other'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return groups
  }, [shoppingItems])

  const openSlotEditor = (slotKey) => {
    setEditorKey(slotKey)
    setSlotState((current) => {
      if (current[slotKey]) return current
      const [day, ...mealParts] = String(slotKey).split('-')
      const mealType = mealParts.join('-') || 'dinner'
      return {
        ...current,
        [slotKey]: {
          day_of_week: day,
          meal_type: mealType,
          active: true,
          attendees: [],
          is_leftover: false,
          leftover_source: '',
          effort_level: 'medium',
          planning_notes: '',
        },
      }
    })
  }

  const handlePrevRange = () => {
    setSelectedDate((current) => addDays(current, viewMode === 'day' ? -1 : -7))
  }

  const handleNextRange = () => {
    setSelectedDate((current) => addDays(current, viewMode === 'day' ? 1 : 7))
  }

  const handleSelectPlannerDay = (day) => {
    setSelectedDate(day.date)
    setViewMode('day')
  }

  const handleGenerateDay = async (day) => {
    setSelectedDate(day.date)
    toast('Day generation will target only this day in the next backend phase. For now, use Generate My Plan after editing this day.')
  }

  const handleCopyPreviousDay = (day) => {
    toast(`Copy previous day for ${day.dayName} is queued for Phase 2.`)
  }

  const handleCreateBlankDay = (day) => {
    setSelectedDate(day.date)
    toast(`Blank day workspace opened for ${day.dayName}. Add or edit meal slots below.`)
  }

  const handleClearPlan = async () => {
    setSaving(true)
    try {
      await clearMealPlan()
      setSlotState({})
      setShoppingItems([])
      setEditorKey(null)
      toast.success('Plan cleared. Start fresh whenever you’re ready.')
    } catch (err) {
      toast.error(err?.message || 'Unable to clear plan.')
    } finally {
      setSaving(false)
    }
  }

  const updateSlot = (key, patch) => setSlotState((current) => ({ ...current, [key]: { ...current[key], ...patch } }))
  const toggleSlotActive = (key) => {
    setSlotState((current) => {
      const existing = current[key] || { active: false, attendees: [] }
      return {
        ...current,
        [key]: {
          ...existing,
          active: !existing.active,
        },
      }
    })
  }

  const toggleAttendee = (key, attendeeId) => {
    const currentAttendees = slotState[key]?.attendees || []
    updateSlot(key, {
      attendees: currentAttendees.includes(attendeeId) ? currentAttendees.filter((id) => id !== attendeeId) : [...currentAttendees, attendeeId],
    })
  }

  const openMealDetail = (meal) => {
    setSelectedMealDetail(normalizeMealRecord(meal))
    setMealDetailMode('view')
  }

  const handleToggleLock = async (meal) => {
    try {
      await toggleMealLock(meal.id, !meal.locked)
      setSelectedMealDetail((current) => current && current.id === meal.id ? { ...current, locked: !meal.locked } : current)
      toast.success(meal.locked ? 'Meal unlocked.' : 'Meal locked.')
    } catch (err) {
      toast.error(err?.message || 'Unable to update meal lock.')
    }
  }

  const handleSaveMealNote = async (meal, note) => {
    try {
      await saveMealNote(meal.id, note)
      setSelectedMealDetail((current) => current && current.id === meal.id ? { ...current, user_note: note || '' } : current)
      toast.success('Meal note saved.')
    } catch (err) {
      toast.error(err?.message || 'Unable to save meal note.')
    }
  }

  const handleSwapMeal = async (meal, suggestion = '') => {
    try {
      setMealDetailMode('swapping')
      const updated = await swapMeal(meal, suggestion)
      const nextMeals = updated?.draft_plan?.meals || updated?.plan?.meals || []
      const replacement = nextMeals.find((candidate) => candidate.day === meal.day && candidate.meal === meal.meal)
      const normalizedReplacement = replacement ? normalizeMealRecord(replacement, { day: meal.day, meal: meal.meal, name: meal.name }) : null
      if (normalizedReplacement) setSelectedMealDetail(normalizedReplacement)
      toast.success('Meal swapped.')
    } catch (err) {
      toast.error(err?.message || 'Unable to swap meal.')
    } finally {
      setMealDetailMode('view')
    }
  }

  const handleGenerate = async () => {
    if (!members.length) {
      toast.error('Add household members first.')
      return
    }
    if (!household?.id) {
      toast.error('Household not loaded yet.')
      return
    }
    if (activeSlots.length === 0) {
      toast.error('Choose at least one meal slot to plan.')
      return
    }
    if (!isPremium) {
      const { allowed } = await canGeneratePlan()
      if (!allowed) {
        toast.error('You have used your free plan for this week.')
        return
      }
    }

    setSaving(true)
    try {
      const singleSlot = primarySlot ? [primarySlot] : []
      const savedSchedule = await saveSchedule({ householdId: household.id, shoppingDay, weekNotes, slots: singleSlot, validMemberIds: memberOptions.map((member) => member.id) })
      await loadSchedule()
      const savedPlan = await generateMealPlan()
      await trackUsage('plan_generate', { schedule_id: savedSchedule?.id || schedule?.id || null })

      const generatedMeals = savedPlan?.draft_plan?.meals || savedPlan?.plan?.meals || []
      const items = aggregateShoppingList({ meals: generatedMeals }, household?.staples_on_hand || '')
      setShoppingItems(items)

      if (generatedMeals.length && household?.id) {
        const { data: planRow } = await supabase
          .from('meal_plans')
          .select('id')
          .eq('user_id', household.user_id)
          .eq('schedule_id', schedule?.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        await supabase.from('shopping_lists').upsert({
          user_id: household.user_id,
          meal_plan_id: planRow?.id || null,
          items,
          status: 'active',
        })
      }

      toast.success('Meal plan generated.')
    } catch (err) {
      toast.error(err?.message || 'Unable to generate plan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="card">
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 mb-2"></div>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl text-text-primary">Weekly Meal Plan</h1>
            <p className="mt-2 text-sm text-text-primary">Set your slots, generate the week, and shop from the same screen.</p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
            <button
              type="button"
              onClick={handleClearPlan}
              disabled={saving || generating || (!mealPlan && activeSlots.length === 0)}
              className="w-full md:w-auto rounded-full border border-divider bg-white px-6 py-3 font-semibold text-text-primary shadow-sm transition-all duration-200 hover:bg-warm-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Fresh
            </button>
            <button type="button" onClick={handleGenerate} disabled={saving || generating} className="w-full md:w-auto bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50">
              {saving || generating ? 'Generating…' : 'Generate My Plan'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-divider bg-white p-4 shadow-sm md:grid-cols-2 md:gap-5 md:p-6">
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-700">Shopping Day</span>
          <select value={shoppingDay} onChange={(e) => setShoppingDay(e.target.value)} className={`${inputClassName} w-full`}>
            {days.map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-700">Week Notes</span>
          <input value={weekNotes} onChange={(e) => setWeekNotes(e.target.value)} className={`${inputClassName} w-full`} placeholder="Anything special this week?" />
        </label>
      </div>

      {loading ? <ScheduleSkeleton /> : (
        <MealPlanWorkspace
          meals={planMeals}
          slotState={slotState}
          memberOptions={memberOptions}
          selectedDate={selectedDate}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          onPrev={handlePrevRange}
          onNext={handleNextRange}
          onOpenMeal={openMealDetail}
          onOpenDayActions={setDayActionTarget}
          onOpenMealActions={setMealActionTarget}
          onSelectDay={handleSelectPlannerDay}
          onGenerateDay={handleGenerateDay}
          onCopyPreviousDay={handleCopyPreviousDay}
          onCreateBlankDay={handleCreateBlankDay}
          onOpenSlotEditor={openSlotEditor}
          onToggleSlot={toggleSlotActive}
        />
      )}

      {editorKey && slotState[editorKey] ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditorKey(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-stone-200 bg-white p-4 md:p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text-900">Edit {editorKey.replace('-', ' · ')}</h2>
              <button type="button" onClick={() => setEditorKey(null)} className="text-sm text-text-500">Close</button>
            </div>
            <div className="space-y-5">
              <div>
                <div className="mb-3 text-sm font-medium text-text-700">Attendees</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {memberOptions.map((member) => (
                    <label key={member.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 text-sm text-text-700">
                      <input type="checkbox" checked={(slotState[editorKey]?.attendees || []).includes(member.id)} onChange={() => toggleAttendee(editorKey, member.id)} />
                      {member.label}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm text-text-700">
                <input type="checkbox" checked={slotState[editorKey]?.is_leftover || false} onChange={(e) => updateSlot(editorKey, { is_leftover: e.target.checked, leftover_source: e.target.checked ? slotState[editorKey]?.leftover_source || '' : '' })} />
                Is leftover?
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-text-700">Effort level</span>
                <select value={slotState[editorKey]?.effort_level || 'medium'} onChange={(e) => updateSlot(editorKey, { effort_level: e.target.value })} className={inputClassName}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="full">full</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-text-700">Planning notes</span>
                <input value={slotState[editorKey]?.planning_notes || ''} onChange={(e) => updateSlot(editorKey, { planning_notes: e.target.value, active: true })} className={inputClassName} placeholder="Quick notes for this slot" />
              </label>
            </div>
          </div>
        </div>
      ) : null}

      <PlannerActionSheet
        isOpen={Boolean(dayActionTarget)}
        onClose={() => setDayActionTarget(null)}
        title={dayActionTarget ? `${dayActionTarget.dayName} actions` : 'Day actions'}
        subtitle={dayActionTarget ? dayActionTarget.dateLabel : ''}
        actions={dayActionTarget ? [
          { label: 'Regenerate Day', onClick: () => handleGenerateDay(dayActionTarget) },
          { label: 'Copy To...', onClick: () => toast('Copy day flow is queued for Phase 2.') },
          { label: 'Insert Blank Day', onClick: () => handleCreateBlankDay(dayActionTarget) },
          { label: 'Add note', onClick: () => toast('Day notes persistence is part of the next data-model pass.') },
          { label: 'Clear Day', onClick: () => toast('Clear day flow is queued for Phase 2.'), danger: true },
        ] : []}
      />

      <PlannerActionSheet
        isOpen={Boolean(mealActionTarget)}
        onClose={() => setMealActionTarget(null)}
        title={mealActionTarget ? `${mealActionTarget.label} actions` : 'Meal actions'}
        subtitle="Meal-level tools"
        actions={mealActionTarget ? [
          { label: 'List Alternatives', onClick: () => toast('Alternatives are planned for Phase 4.') },
          { label: 'Add Foods to Meal', onClick: () => toast('Multi-item meal editing is part of the next data-model pass.') },
          { label: 'Edit Meal Settings', onClick: () => toast('Meal settings editor is queued for Phase 2/4.') },
          { label: 'Copy Meal', onClick: () => toast('Copy meal flow is queued for Phase 2.') },
          { label: 'Clear Meal', onClick: () => toast('Clear meal flow is queued for Phase 2.'), danger: true },
          { label: 'Add note', onClick: () => toast('Meal notes are already supported at the meal level; richer editing is next.') },
        ] : []}
      />

      {selectedMealDetail ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4" onClick={() => setSelectedMealDetail(null)}>
          <div className="mx-auto max-w-2xl rounded-3xl border border-divider bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{typeof selectedMealDetail.day === 'string' ? selectedMealDetail.day : 'mon'} · {typeof selectedMealDetail.meal === 'string' ? selectedMealDetail.meal : 'dinner'}</div>
                <h2 className="mt-1 text-2xl font-semibold text-text-primary">{typeof selectedMealDetail.name === 'string' ? selectedMealDetail.name : 'Generated meal'}</h2>
                <div className="mt-2 text-sm text-text-secondary">{selectedMealDetail.servings || 1} servings · {selectedMealDetail.prep_time_minutes || 0} min prep · {selectedMealDetail.cook_time_minutes || 0} min cook</div>
              </div>
              <button type="button" onClick={() => setSelectedMealDetail(null)} className="text-sm font-medium text-text-secondary">Close</button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => handleToggleLock(selectedMealDetail)} className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedMealDetail.locked ? 'bg-green-100 text-green-700' : 'border border-divider bg-white text-text-primary'}`}>
                {selectedMealDetail.locked ? 'Unlock meal' : 'Lock meal'}
              </button>
              <button type="button" onClick={() => handleSwapMeal(selectedMealDetail)} disabled={mealDetailMode === 'swapping' || selectedMealDetail.locked} className="rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-50">
                {mealDetailMode === 'swapping' ? 'Swapping…' : 'Swap meal'}
              </button>
            </div>

            {selectedMealDetail.swapped && selectedMealDetail.original_name ? (
              <div className="mt-4 rounded-2xl bg-warm-50 p-3 text-sm text-text-secondary">Originally: {selectedMealDetail.original_name}</div>
            ) : null}

            {selectedMealDetail.notes ? (
              <div className="mt-4 rounded-2xl border border-divider bg-bg-primary p-4 text-sm text-text-primary">
                {selectedMealDetail.notes}
              </div>
            ) : null}

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-semibold text-text-primary">Ingredients</div>
                <ul className="space-y-2 text-sm text-text-secondary">
                  {(Array.isArray(selectedMealDetail.ingredients) ? selectedMealDetail.ingredients : []).length > 0 ? selectedMealDetail.ingredients.map((ingredient, index) => (
                    <li key={`ingredient-${index}`}>
                      {typeof ingredient === 'string' ? ingredient : [ingredient?.quantity, ingredient?.unit, ingredient?.name || ingredient?.item].filter(Boolean).join(' ')}
                    </li>
                  )) : <li>No ingredients saved.</li>}
                </ul>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold text-text-primary">Instructions</div>
                <ol className="space-y-2 text-sm text-text-secondary">
                  {(Array.isArray(selectedMealDetail.instructions) ? selectedMealDetail.instructions : []).length > 0 ? selectedMealDetail.instructions.map((step, index) => (
                    <li key={`step-${index}`} className="flex gap-2"><span className="font-semibold text-text-primary">{index + 1}.</span><span>{typeof step === 'string' ? step : ''}</span></li>
                  )) : <li>No instructions saved.</li>}
                </ol>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-text-primary">Meal note</label>
              <textarea
                className="input min-h-[96px] w-full"
                value={selectedMealDetail.user_note || ''}
                onChange={(e) => setSelectedMealDetail((current) => ({ ...current, user_note: e.target.value }))}
                placeholder="Add a note for this meal"
              />
              <button
                type="button"
                onClick={() => handleSaveMealNote(selectedMealDetail, selectedMealDetail.user_note || '')}
                className="mt-3 rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary"
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="mb-3 font-display text-xl text-text-primary">Shopping List</div>
        {generating ? (
          <PlanGenerationLoading />
        ) : shoppingItems.length === 0 ? (
          <EmptyState emoji="🛒" headline="Shopping list will appear automatically" body="Generate your plan and we’ll build the list immediately." ctaLabel={null} />
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedShopping).map(([category, items]) => (
              <div key={category} className="rounded-xl border border-divider bg-white p-4">
                <div className="mb-2 text-sm font-semibold capitalize text-text-primary">{category}</div>
                <ul className="space-y-1 text-sm text-text-secondary">
                  {items.map((item, itemIdx) => (
                    <li key={itemIdx}>{item.quantity} {item.unit} {item.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
