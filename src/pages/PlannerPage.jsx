import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useHousehold } from '../hooks/useHousehold'
import { useSchedule } from '../hooks/useSchedule'
import { useMealPlan } from '../hooks/useMealPlan'
import { useSubscription } from '../hooks/useSubscription'
import { MealCard } from '../components/plan/MealCard'
import { ScheduleSkeleton, EmptyState, PlanGenerationLoading } from '../components/LoadingStates'
import { aggregateShoppingList } from '../lib/aggregateShoppingList'
import { supabase } from '../lib/supabase'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const mealTypes = ['Breakfast', 'Lunch', 'Dinner']
const dayColors = {
  Monday: '#22C55E', Tuesday: '#14B8A6', Wednesday: '#3B82F6', Thursday: '#A855F7', Friday: '#EC4899', Saturday: '#F59E0B', Sunday: '#F97316',
}
const inputClassName = 'input'

export function PlannerPage() {
  useDocumentTitle('Weekly Plan | Allio')
  const { household, members, loading: householdLoading } = useHousehold()
  const { schedule, slots, loading: scheduleLoading, saveSchedule, loadSchedule } = useSchedule()
  const { isPremium, canGeneratePlan, trackUsage } = useSubscription()
  const { mealPlan, generating, generateMealPlan, toggleMealLock, saveMealNote, swapMeal } = useMealPlan(schedule?.id)

  const [shoppingDay, setShoppingDay] = useState('Sunday')
  const [weekNotes, setWeekNotes] = useState('')
  const [editorKey, setEditorKey] = useState(null)
  const [slotState, setSlotState] = useState({})
  const [saving, setSaving] = useState(false)
  const [expandedDays, setExpandedDays] = useState({ Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false })
  const [shoppingItems, setShoppingItems] = useState([])

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

  const groupedMeals = useMemo(() => {
    const meals = mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []
    const out = {}
    meals.forEach((m) => {
      out[`${String(m.day || '').slice(0, 3).toLowerCase()}-${String(m.meal || '').toLowerCase()}`] = m
    })
    return out
  }, [mealPlan])

  const activeSlots = Object.values(slotState).filter((slot) => slot.active && slot.attendees?.length > 0)
  const loading = householdLoading || scheduleLoading
  const groupedShopping = useMemo(() => {
    const groups = {}
    shoppingItems.forEach((item) => {
      const key = item.category || 'other'
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return groups
  }, [shoppingItems])

  const openSlotEditor = (day, mealType) => {
    const key = `${day}-${mealType}`
    setEditorKey(key)
    setSlotState((current) => ({
      ...current,
      [key]: current[key] || {
        day_of_week: day,
        meal_type: mealType,
        active: true,
        attendees: [],
        is_leftover: false,
        leftover_source: '',
        effort_level: 'medium',
        planning_notes: '',
      },
    }))
  }

  const updateSlot = (key, patch) => setSlotState((current) => ({ ...current, [key]: { ...current[key], ...patch } }))
  const toggleAttendee = (key, attendeeId) => {
    const currentAttendees = slotState[key]?.attendees || []
    updateSlot(key, {
      attendees: currentAttendees.includes(attendeeId) ? currentAttendees.filter((id) => id !== attendeeId) : [...currentAttendees, attendeeId],
    })
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
      await saveSchedule({ householdId: household.id, shoppingDay, weekNotes, slots: activeSlots })
      await loadSchedule()
      await generateMealPlan()
      await trackUsage('plan_generate', { schedule_id: schedule?.id || null })

      const meals = mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []
      const generatedMeals = meals.length ? meals : []
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
          <button type="button" onClick={handleGenerate} disabled={saving || generating} className="w-full md:w-auto bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50">
            {saving || generating ? 'Generating…' : 'Generate My Plan'}
          </button>
        </div>
      </div>

      <div className="grid gap-5 rounded-2xl border border-divider bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-700">Shopping Day</span>
          <select value={shoppingDay} onChange={(e) => setShoppingDay(e.target.value)} className={inputClassName}>
            {days.map((day) => <option key={day} value={day}>{day}</option>)}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-700">Week Notes</span>
          <input value={weekNotes} onChange={(e) => setWeekNotes(e.target.value)} className={inputClassName} placeholder="Anything special this week?" />
        </label>
      </div>

      {loading ? <ScheduleSkeleton /> : (
        <div className="grid gap-4 md:grid-cols-7">
          {days.map((day) => {
            const isExpanded = expandedDays[day] === true
            const short = day.slice(0, 3).toLowerCase()
            return (
              <div key={day} className="card p-4" style={{ borderTop: `3px solid ${dayColors[day]}` }}>
                <button type="button" onClick={() => setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }))} className="mb-4 flex w-full items-center justify-between text-left text-sm font-semibold text-text-900">
                  {day}
                  <span className="text-text-muted text-xs">{isExpanded ? '▼' : '▶'}</span>
                </button>
                <div className={`space-y-3 ${!isExpanded ? 'hidden md:block' : ''}`}>
                  {mealTypes.map((mealType) => {
                    const key = `${day}-${mealType}`
                    const slot = slotState[key]
                    const normalizedMeal = mealType.toLowerCase().replace(' ', '_')
                    const meal = groupedMeals[`${short}-${normalizedMeal}`]
                    return meal ? (
                      <MealCard key={key} meal={meal} onToggleLock={toggleMealLock} onSwap={swapMeal} onSaveNote={saveMealNote} />
                    ) : (
                      <button key={key} type="button" onClick={() => openSlotEditor(day, mealType)} className="btn-primary w-full text-left hover:border-divider">
                        <div className="text-sm font-medium text-text-800">{mealType}</div>
                        {slot?.active ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-500">
                            <span>{slot.attendees.length} attendee{slot.attendees.length !== 1 ? 's' : ''}</span>
                            <span className={`px-2 py-0.5 rounded-full ${slot.effort_level === 'low' ? 'bg-green-100 text-green-700' : slot.effort_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {slot.effort_level === 'low' ? 'Quick' : slot.effort_level === 'medium' ? 'Standard' : 'Full'}
                            </span>
                          </div>
                        ) : <div className="mt-2 text-xs text-text-400">Empty slot</div>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editorKey && slotState[editorKey] ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditorKey(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
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
