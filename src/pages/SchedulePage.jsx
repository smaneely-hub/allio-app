import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useHousehold } from '../hooks/useHousehold'
import { useSchedule } from '../hooks/useSchedule'
import { ScheduleSkeleton, EmptyState } from '../components/LoadingStates'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const dayColors = {
  Monday: '#22C55E',
  Tuesday: '#14B8A6',
  Wednesday: '#3B82F6',
  Thursday: '#A855F7',
  Friday: '#EC4899',
  Saturday: '#F59E0B',
  Sunday: '#F97316',
}
const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Prep Block']

export function SchedulePage() {
  const navigate = useNavigate()
  const { household, members, repairMembers, loading: householdLoading, reloadHousehold } = useHousehold()
  const { schedule, slots, loading: scheduleLoading, saveSchedule } = useSchedule()
  const [shoppingDay, setShoppingDay] = useState('Sunday')
  const [weekNotes, setWeekNotes] = useState('')
  const [editorKey, setEditorKey] = useState(null)
  const [slotState, setSlotState] = useState({})
  const [saving, setSaving] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [expandedDays, setExpandedDays] = useState({ Mon: false, Tue: false, Wed: false, Thu: false, Fri: false, Sat: false, Sun: false })

  // Check if we have a recovery situation: household exists but no members
  const needsMemberRepair = household && members.length === 0

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

  const memberOptions = useMemo(
    () => {
      console.log('[SchedulePage] Building memberOptions, members:', members.length)
      return members.map((member, index) => ({ 
        id: member.id || `member-${index}`, 
        label: member.name || member.label || `Member ${index + 1}` 
      }))
    },
    [members],
  )

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

  const updateSlot = (key, patch) => {
    setSlotState((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
      },
    }))
  }

  const toggleAttendee = (key, attendeeId) => {
    const currentAttendees = slotState[key]?.attendees || []
    updateSlot(key, {
      attendees: currentAttendees.includes(attendeeId)
        ? currentAttendees.filter((id) => id !== attendeeId)
        : [...currentAttendees, attendeeId],
    })
  }

  // Recovery handler: create default members if none exist
  const handleMemberRepair = async () => {
    setRepairing(true)
    try {
      console.log('[SchedulePage] Calling repairMembers()...')
      // repairMembers() now creates defaults based on household.total_people
      await repairMembers()
      toast.success('Default household members restored')
      await reloadHousehold()
    } catch (err) {
      console.error('[SchedulePage] restore members failed', err)
      toast.error(err.message || 'Failed to restore members')
    } finally {
      setRepairing(false)
    }
  }

  // Block save if members are missing
  const handleSaveSchedule = async () => {
    // Check for missing members first
    if (!members || members.length === 0) {
      toast.error('You need at least one household member before saving a schedule')
      return
    }

    console.log('[SchedulePage] Save clicked, household:', household?.id, 'members:', members.length, 'slots:', Object.keys(slotState).length)
    
    if (!household?.id) {
      toast.error('Household not loaded. Please refresh the page.')
      return
    }

    const activeSlots = Object.values(slotState).filter((slot) => slot.active && slot.attendees?.length > 0)
    
    console.log('[SchedulePage] Active slots:', activeSlots.length)
    
    if (activeSlots.length === 0) {
      toast.error('Please select at least one person for a meal slot.')
      return
    }

    setSaving(true)

    try {
      console.log('[SchedulePage] Saving schedule...')
      
      const savedSchedule = await saveSchedule({
        householdId: household.id,
        shoppingDay,
        weekNotes,
        slots: activeSlots,
      })

      console.log('[SchedulePage] Schedule saved:', savedSchedule?.id)
      toast.success('Schedule saved successfully.')
      
      // Persist last schedule_id for session restoration
      localStorage.setItem('last_schedule_id', savedSchedule.id)
      localStorage.setItem('last_schedule_week', savedSchedule.week_start_date)
      
      // Navigate with auto-generate flag
      navigate(`/plan?schedule_id=${savedSchedule.id}&auto_generate=true`, { replace: true })
    } catch (error) {
      console.error('[SchedulePage] Save failed:', error)
      toast.error(error.message || 'Unable to save schedule. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Show member repair UI if needed
  if (needsMemberRepair) {
    return (
      <div className="space-y-3 md:space-y-6 pb-24">
        <div className="card">
          <div className="h-1 w-12 bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 rounded-full mb-2"></div>
            <h1 className="font-display text-2xl md:text-3xl text-text-primary">Weekly Schedule</h1>
          <p className="mt-2 text-sm text-text-primary">Your household exists but we couldn't find your members. Let's fix that.</p>
        </div>
        
        <div className="card text-center py-12">
          <div className="text-6xl mb-6">🔧</div>
          <h2 className="font-display text-2xl text-text-primary mb-3">Missing Household Members</h2>
          <p className="text-text-primary max-w-md mx-auto mb-6">
            Your household is set up but we don't have any members saved. This might be from a previous issue.
          </p>
          <button 
            onClick={handleMemberRepair} 
            disabled={repairing}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
          >
            {repairing ? 'Restoring...' : 'Restore Default Members'}
          </button>
          <p className="text-xs text-text-secondary mt-4">
            After restoring, you'll be able to edit members in Settings.
          </p>
        </div>
      </div>
    )
  }

  const loading = householdLoading || scheduleLoading

  // Calculate active slots for render
  const activeSlots = Object.values(slotState).filter((slot) => slot.active && slot.attendees?.length > 0)
  const activeSlotCount = activeSlots.length

  return (
    <div className="space-y-3 md:space-y-6 pb-24">
      <div className="card">
        <div className="h-1 w-12 bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 rounded-full mb-2"></div>
            <h1 className="font-display text-2xl md:text-3xl text-text-primary">Weekly Schedule</h1>
        <p className="mt-2 text-sm text-text-primary">Build the week you actually need planned. Activate only the meal slots you want Allio to consider.</p>
      </div>

      <div className="grid gap-5 rounded-2xl border border-divider bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-700">Shopping Day</span>
          <select value={shoppingDay} onChange={(e) => setShoppingDay(e.target.value)} className={inputClassName}>
            {days.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-text-700">Week Notes</span>
          <input value={weekNotes} onChange={(e) => setWeekNotes(e.target.value)} className={inputClassName} placeholder="Anything special this week?" />
        </label>
      </div>

      {loading ? (
        <ScheduleSkeleton />
      ) : slots.length === 0 ? (
        <EmptyState
          emoji="📅"
          headline="Let's map out your week"
          body="Tell Allio which meals you want to plan and who's eating. It only takes a minute."
          ctaLabel="Start building your schedule"
          ctaLink={null}
          onCtaClick={() => {
            openSlotEditor('Monday', 'Dinner')
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-7">
          {days.map((day) => {
            const isExpanded = expandedDays[day] === true
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
            return (
            <div key={day} className="card p-4" style={{ borderTop: `3px solid ${dayColors[day]}` }}>
              <button
                type="button"
                onClick={() => setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }))}
                
                className="mb-4 flex w-full items-center justify-between text-left text-sm font-semibold text-text-900 md:cursor-default"
              >
                {day}
                <span className="md:hidden text-text-muted text-xs">{isExpanded ? '▼' : '▶'}</span>
              </button>
              <div className={`space-y-3 ${!isExpanded ? 'hidden' : ''}`}>
                {mealTypes.map((mealType) => {
                  const key = `${day}-${mealType}`
                  const slot = slotState[key]
                  return (
                    <button
                      key={mealType}
                      type="button"
                      onClick={() => openSlotEditor(day, mealType)}
                      className="btn-primary w-full text-left hover:border-divider"
                    >
                      <div className="text-sm font-medium text-text-800">{mealType}</div>
                      {slot?.active ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-500">
                          <span>{slot.attendees.length} attendee{slot.attendees.length !== 1 ? 's' : ''}</span>
                          <span className={`px-2 py-0.5 rounded-full ${
                            slot.effort_level === 'low' ? 'bg-green-100 text-green-700' :
                            slot.effort_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {slot.effort_level === 'low' ? 'Quick' : slot.effort_level === 'medium' ? 'Standard' : 'Full'}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-text-400">Empty slot</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )})}
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
              {memberOptions.length === 0 ? (
                <p className="text-sm text-red-500">No members found. Go to Settings to add members.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {memberOptions.map((member) => (
                    <label key={member.id} className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 text-sm text-text-700">
                      <input
                        type="checkbox"
                        checked={(slotState[editorKey]?.attendees || []).includes(member.id)}
                        onChange={() => toggleAttendee(editorKey, member.id)}
                      />
                      {member.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-3 text-sm text-text-700">
              <input
                type="checkbox"
                checked={slotState[editorKey]?.is_leftover || false}
                onChange={(e) => updateSlot(editorKey, { is_leftover: e.target.checked, leftover_source: e.target.checked ? slotState[editorKey]?.leftover_source || '' : '' })}
              />
              Is leftover?
            </label>

            {slotState[editorKey]?.is_leftover ? (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-text-700">Source meal</span>
                <select value={slotState[editorKey]?.leftover_source || ''} onChange={(e) => updateSlot(editorKey, { leftover_source: e.target.value })} className={inputClassName}>
                  <option value="">Select source meal</option>
                  {Object.values(slotState).map((slot) => (
                    <option key={`${slot.day_of_week}-${slot.meal_type}`} value={`${slot.day_of_week} ${slot.meal_type}`}>
                      {slot.day_of_week} {slot.meal_type}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSaveSchedule}
          disabled={saving || members.length === 0 || activeSlotCount === 0}
          className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
        >
          {saving ? 'Saving…' : `Generate plan (${activeSlotCount} meal${activeSlotCount !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  )
}

const inputClassName = 'input'
