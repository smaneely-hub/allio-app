import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useHousehold() {
  const { user } = useAuth()
  const [household, setHousehold] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadHousehold = useCallback(async () => {
    if (!user) {
      setHousehold(null)
      setMembers([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (householdError) throw householdError

      setHousehold(householdData)

      if (householdData?.id) {
        const { data: membersData, error: membersError } = await supabase
          .from('household_members')
          .select('*')
          .eq('household_id', householdData.id)
          .order('created_at', { ascending: true })

        if (membersError) throw membersError
        setMembers(membersData ?? [])
      } else {
        setMembers([])
      }
    } catch (err) {
      setError(err)
      toast.error("Couldn't load your data. Give it another shot.")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadHousehold()
  }, [loadHousehold])

  const saveHousehold = useCallback(
    async (data) => {
      if (!user) throw new Error('User is required to save household data.')

      setLoading(true)
      setError(null)

      try {
        const payload = {
          id: household?.id,
          user_id: user.id,
          household_name: data.household_name,
          planning_scope: data.planning_scope,
          meal_sharing: data.meal_sharing,
          budget_sensitivity: data.budget_sensitivity,
          diet_focus: data.diet_focus,
          total_people: data.total_people,
          low_prep_nights_needed: data.low_prep_nights_needed,
          repeat_meal_tolerance: data.repeat_meal_tolerance,
          leftovers_for_lunch: data.leftovers_for_lunch,
          adventurousness: data.adventurousness,
          staples_on_hand: data.staples_on_hand,
          planning_priorities: data.planning_priorities,
        }

        const { data: savedHousehold, error: saveError } = await supabase
          .from('households')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single()

        if (saveError) throw saveError
        setHousehold(savedHousehold)
        return savedHousehold
      } catch (err) {
        setError(err)
        toast.error("Couldn't save your changes. Give it another shot.")
        throw err
      } finally {
        setLoading(false)
      }
    },
    [household?.id, user, household],
  )

  const saveMembers = useCallback(
    async (nextMembers) => {
      if (!user) throw new Error('User is required to save household members.')
      if (!household?.id) throw new Error('Household must exist before saving members.')

      setLoading(true)
      setError(null)

      try {
        const preparedMembers = nextMembers.map((member, index) => ({
          id: member.id,
          user_id: user.id,
          household_id: household.id,
          name: member.name,
          age: member.age,
          role: member.role,
          gender: member.gender,
          restrictions: member.restrictions,
          preferences: member.preferences,
          sort_order: index,
        }))

        const { error: upsertError } = await supabase
          .from('household_members')
          .upsert(preparedMembers, { onConflict: 'id' })

        if (upsertError) throw upsertError

        const idsToKeep = preparedMembers.map((member) => member.id).filter(Boolean)
        let deleteQuery = supabase.from('household_members').delete().eq('household_id', household.id)

        if (idsToKeep.length > 0) {
          deleteQuery = deleteQuery.not('id', 'in', `(${idsToKeep.join(',')})`)
        }

        const { error: deleteError } = await deleteQuery
        if (deleteError) throw deleteError

        const { data: refreshedMembers, error: refreshError } = await supabase
          .from('household_members')
          .select('*')
          .eq('household_id', household.id)
          .order('sort_order', { ascending: true })

        if (refreshError) throw refreshError
        setMembers(refreshedMembers ?? [])
        return refreshedMembers ?? []
      } catch (err) {
        setError(err)
        toast.error("Couldn't save your changes. Give it another shot.")
        throw err
      } finally {
        setLoading(false)
      }
    },
    [household?.id, user],
  )

  return {
    household,
    members,
    loading,
    error,
    reloadHousehold: loadHousehold,
    saveHousehold,
    saveMembers,
  }
}
