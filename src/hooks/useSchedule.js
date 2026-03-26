import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

function getWeekStartDate() {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

export function useSchedule() {
  const { user } = useAuth()
  const [schedule, setSchedule] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadSchedule = useCallback(async () => {
    if (!user) {
      setSchedule(null)
      setSlots([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const weekStartDate = getWeekStartDate()
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartDate)
        .limit(1)
        .maybeSingle()

      if (scheduleError) throw scheduleError
      setSchedule(scheduleData)

      if (scheduleData?.id) {
        const { data: slotData, error: slotsError } = await supabase
          .from('schedule_slots')
          .select('*')
          .eq('schedule_id', scheduleData.id)
          .order('day_of_week', { ascending: true })

        if (slotsError) throw slotsError
        setSlots(slotData ?? [])
      } else {
        setSlots([])
      }
    } catch (err) {
      setError(err)
      toast.error("Couldn't load your data. Give it another shot.")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  const saveSchedule = useCallback(
    async ({ householdId, shoppingDay, weekNotes, slots: activeSlots }) => {
      if (!user) throw new Error('User is required to save a schedule.')

      setLoading(true)
      setError(null)

      try {
        const payload = {
          id: schedule?.id,
          user_id: user.id,
          household_id: householdId,
          week_start_date: getWeekStartDate(),
          shopping_day: shoppingDay,
          week_notes: weekNotes,
          status: 'draft',
        }

        const { data: savedSchedule, error: saveError } = await supabase
          .from('weekly_schedules')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single()

        if (saveError) throw saveError

        const { error: deleteError } = await supabase
          .from('schedule_slots')
          .delete()
          .eq('schedule_id', savedSchedule.id)

        if (deleteError) throw deleteError

        const preparedSlots = activeSlots.map((slot) => ({
          user_id: user.id,
          schedule_id: savedSchedule.id,
          day_of_week: slot.day_of_week,
          meal_type: slot.meal_type,
          attendees: slot.attendees,
          attendees_count: slot.attendees.length,
          is_leftover: slot.is_leftover,
          leftover_source: slot.leftover_source,
          effort_level: slot.effort_level,
          planning_notes: slot.planning_notes,
          active: true,
        }))

        if (preparedSlots.length > 0) {
          const { error: insertError } = await supabase.from('schedule_slots').insert(preparedSlots)
          if (insertError) throw insertError
        }

        setSchedule(savedSchedule)
        setSlots(preparedSlots)
        return savedSchedule
      } catch (err) {
        setError(err)
        toast.error("Couldn't save your changes. Give it another shot.")
        throw err
      } finally {
        setLoading(false)
      }
    },
    [schedule?.id, user],
  )

  return {
    schedule,
    slots,
    loading,
    error,
    loadSchedule,
    saveSchedule,
  }
}
