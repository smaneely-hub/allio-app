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
      console.log('[useSchedule] Loading for user:', user.id, 'week:', weekStartDate)
      
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartDate)
        .limit(1)
        .maybeSingle()

      if (scheduleError) {
        console.error('[useSchedule] ERROR loading schedule:', scheduleError)
        throw scheduleError
      }
      
      console.log('[useSchedule] Loaded schedule:', scheduleData?.id)
      setSchedule(scheduleData)

      if (scheduleData?.id) {
        const { data: slotData, error: slotsError } = await supabase
          .from('schedule_slots')
          .select('*')
          .eq('schedule_id', scheduleData.id)
          .order('day', { ascending: true })

        if (slotsError) {
          console.error('[useSchedule] ERROR loading slots:', slotsError)
          throw slotsError
        }
        console.log('[useSchedule] Loaded slots:', slotData?.length)
        setSlots(slotData ?? [])
      } else {
        setSlots([])
      }
    } catch (err) {
      console.error('[useSchedule] CRITICAL ERROR:', err)
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
          user_id: user.id,
          household_id: householdId,  // Add household_id
          week_start_date: getWeekStartDate(),
          shopping_day: shoppingDay,
          status: 'draft',
        }

        console.log('[useSchedule] Saving schedule payload:', payload)

        // Use UPSERT to handle existing schedules
        const { data: savedSchedule, error: saveError } = await supabase
          .from('weekly_schedules')
          .upsert(payload, { onConflict: 'user_id,week_start_date' })
          .select()
          .single()

        if (saveError) {
          console.error('[useSchedule] ERROR upserting schedule:', JSON.stringify(saveError))
          console.error('[useSchedule] Full error details:', saveError)
          throw saveError
        }

        console.log('[useSchedule.saveSchedule] schedule payload', savedSchedule)

        // Delete existing slots
        const { error: deleteError } = await supabase
          .from('schedule_slots')
          .delete()
          .eq('schedule_id', savedSchedule.id)

        if (deleteError) {
          console.error('[useSchedule] ERROR deleting slots:', deleteError)
          // Non-critical, continue
        }

        const preparedSlots = activeSlots.map((slot, index) => {
          // Normalize field names - support both old and new naming
          const day = slot.day ?? slot.day_of_week
          const meal = slot.meal ?? slot.meal_type
          
          // Add validation
          if (!day || !meal) {
            const errMsg = `Invalid schedule slot at index ${index}: missing day or meal (${JSON.stringify(slot)})`
            console.error('[useSchedule]', errMsg)
            throw new Error(errMsg)
          }
          
          const slotPayload = {
            user_id: user.id,
            household_id: householdId,  // Add household_id to slots too
            schedule_id: savedSchedule.id,
            day: day,
            meal: meal,
            attendees: slot.attendees || [],
            is_leftover: slot.is_leftover || false,
            leftover_source: slot.leftover_source || '',
            effort_level: slot.effort_level || 'medium',
            planning_notes: slot.planning_notes || '',
          }
          
          console.log('[useSchedule.saveSchedule] slot payload', slotPayload)
          return slotPayload
        })

        console.log('[useSchedule] Inserting slots:', preparedSlots.length)

        if (preparedSlots.length > 0) {
          const { error: insertError } = await supabase.from('schedule_slots').insert(preparedSlots)
          if (insertError) {
            console.error('[useSchedule] ERROR inserting slots:', JSON.stringify(insertError, null, 2))
            console.error('[useSchedule] Slot insert error details:', insertError)
            throw insertError
          }
        }

        setSchedule(savedSchedule)
        setSlots(preparedSlots)
        return savedSchedule
      } catch (err) {
        console.error('[useSchedule] CRITICAL ERROR in saveSchedule:', err)
        setError(err)
        toast.error("Couldn't save your changes. Give it another shot.")
        throw err
      } finally {
        setLoading(false)
      }
    },
    [user],
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
