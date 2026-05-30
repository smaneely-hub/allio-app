import { useCallback, useEffect, useState } from 'react'
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

// Loads the household, members, schedule, slots, and meal plan for a user
// who is a linked member (linked_user_id) of someone else's household.
// Read-only: does not write any data.
// Returns nulls if the user is not a linked member of any household.
export function useLinkedHousehold() {
  const { user } = useAuth()
  const [linkedHousehold, setLinkedHousehold] = useState(null)
  const [linkedMembers, setLinkedMembers] = useState([])
  const [linkedSchedule, setLinkedSchedule] = useState(null)
  const [linkedSlots, setLinkedSlots] = useState([])
  const [linkedPlan, setLinkedPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  const resetState = useCallback(() => {
    setLinkedHousehold(null)
    setLinkedMembers([])
    setLinkedSchedule(null)
    setLinkedSlots([])
    setLinkedPlan(null)
  }, [])

  const load = useCallback(async () => {
    if (!user) {
      resetState()
      setLoading(false)
      return
    }
    setLoading(true)

    try {
      // Find a member row where this user's auth account is linked.
      // The linked_user_id column was added in migration 20260528000001.
      // If the column doesn't exist yet the query returns no data (PGRST204/column missing).
      const { data: memberRow, error: memberError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('linked_user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (memberError) {
        resetState()
        // Column not yet available in this environment — fail silently.
        const isColumnMissing = String(memberError.message || '').includes('linked_user_id')
        if (!isColumnMissing) console.warn('[useLinkedHousehold]', memberError)
        return
      }

      if (!memberRow?.household_id) {
        resetState()
        return
      }

      const householdId = memberRow.household_id

      const [householdResult, membersResult] = await Promise.all([
        supabase.from('households').select('*').eq('id', householdId).maybeSingle(),
        supabase.from('household_members').select('*').eq('household_id', householdId).order('created_at', { ascending: true }),
      ])

      setLinkedHousehold(householdResult.data || null)
      setLinkedMembers(membersResult.data || [])

      if (!householdResult.data) {
        setLinkedSchedule(null)
        setLinkedSlots([])
        setLinkedPlan(null)
        return
      }

      const weekStartDate = getWeekStartDate()
      const { data: schedule } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('household_id', householdId)
        .eq('week_start_date', weekStartDate)
        .limit(1)
        .maybeSingle()

      setLinkedSchedule(schedule || null)

      if (!schedule?.id) {
        setLinkedSlots([])
        setLinkedPlan(null)
        return
      }

      const [slotsResult, planResult] = await Promise.all([
        supabase.from('schedule_slots').select('*').eq('schedule_id', schedule.id).order('sort_order', { ascending: true }),
        supabase.from('meal_plans').select('*').eq('schedule_id', schedule.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      setLinkedSlots(slotsResult.data || [])
      setLinkedPlan(planResult.data || null)
    } catch (err) {
      resetState()
      console.warn('[useLinkedHousehold] load failed:', err)
    } finally {
      setLoading(false)
    }
  }, [resetState, user])

  useEffect(() => {
    load()
  }, [load])

  return {
    linkedHousehold,
    linkedMembers,
    linkedSchedule,
    linkedSlots,
    linkedPlan,
    loading,
    reload: load,
  }
}
