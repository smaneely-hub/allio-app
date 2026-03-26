import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// Helper to ensure integer fields are never sent as empty strings
const toIntOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

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
      console.log('[useHousehold] Loading household for user:', user.id)
      
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (householdError) {
        console.error('[useHousehold] ERROR loading household:', householdError)
        throw householdError
      }

      console.log('[useHousehold] Loaded household:', householdData)
      setHousehold(householdData)

      if (householdData?.id) {
        const { data: membersData, error: membersError } = await supabase
          .from('household_members')
          .select('*')
          .eq('household_id', householdData.id)
          .order('created_at', { ascending: true })

        if (membersError) {
          console.error('[useHousehold] ERROR loading members:', membersError)
          throw membersError
        }
        console.log('[useHousehold] Loaded members:', membersData?.length)
        setMembers(membersData ?? [])
      } else {
        console.log('[useHousehold] No household found, empty members')
        setMembers([])
      }
    } catch (err) {
      console.error('[useHousehold] CRITICAL ERROR in loadHousehold:', err)
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
          user_id: user.id,
          name: data.household_name || 'My Household',
          total_people: toIntOrNull(data.total_people),
          planning_scope: data.planning_scope,
          meal_sharing: data.meal_sharing,
          budget_sensitivity: data.budget_sensitivity,
          diet_focus: data.diet_focus,
          low_prep_nights: toIntOrNull(data.low_prep_nights_needed),
          repeat_tolerance: data.repeat_meal_tolerance,
          leftovers_for_lunch: data.leftovers_for_lunch,
          adventurousness: data.adventurousness,
          staples_on_hand: data.staples_on_hand,
          planning_priorities: data.planning_priorities,
        }

        console.log('[useHousehold] saveHousehold payload:', payload)

        console.log('[useHousehold.saveHousehold] FINAL payload', payload)

        let savedHousehold
        
        if (household?.id) {
          console.log('[useHousehold] Updating existing household:', household.id)
          const { data: updated, error } = await supabase
            .from('households')
            .update(payload)
            .eq('id', household.id)
            .select()
            .single()
          if (error) {
            console.error('[useHousehold] ERROR updating household:', error)
            throw error
          }
          savedHousehold = updated
        } else {
          console.log('[useHousehold] Inserting new household')
          const { data: inserted, error } = await supabase
            .from('households')
            .insert(payload)
            .select()
            .single()
          if (error) {
            console.error('[useHousehold] ERROR inserting household:', error)
            throw error
          }
          savedHousehold = inserted
        }

        console.log('[useHousehold] Saved household:', savedHousehold)
        
        if (!savedHousehold) throw new Error('Failed to save household')
        
        // Update state immediately
        setHousehold(savedHousehold)
        return savedHousehold
      } catch (err) {
        console.error('[useHousehold] CRITICAL ERROR in saveHousehold:', err)
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
    async (memberList, householdIdOverride = null) => {
      // Determine household ID - use override or fall back to state
      const targetHouseholdId = householdIdOverride || household?.id

      // Log at start as required
      console.log('[useHousehold.saveMembers] targetHouseholdId', targetHouseholdId)
      console.log('[useHousehold.saveMembers] incoming members', memberList)

      if (!user) throw new Error('User is required to save household members.')
      
      // Throw hard error if no household ID exists
      if (!targetHouseholdId) {
        console.error('[useHousehold.saveMembers] No household ID available')
        throw new Error('No household ID available when saving members')
      }

      setLoading(true)
      setError(null)

      try {
        // Verify household exists if override provided
        let effectiveHouseholdId = targetHouseholdId
        
        if (householdIdOverride) {
          const { data: verifyHousehold, error: verifyError } = await supabase
            .from('households')
            .select('id')
            .eq('id', householdIdOverride)
            .maybeSingle()
          
          if (verifyError) {
            console.error('[useHousehold.saveMembers] Verify household error:', verifyError)
          }
          
          if (!verifyHousehold) {
            console.error('[useHousehold.saveMembers] Recovery household not found:', householdIdOverride)
            throw new Error('Household not found for recovery.')
          }
          effectiveHouseholdId = verifyHousehold.id
        }

        console.log('[useHousehold.saveMembers] Using effectiveHouseholdId:', effectiveHouseholdId)

        // Prepare members with household_id set to effectiveHouseholdId
        const preparedMembers = memberList.map((member, index) => ({
          user_id: user.id,
          household_id: effectiveHouseholdId,
          label: member.name || member.label || `Member ${index + 1}`,
          name: member.name || member.label || '',
          age: toIntOrNull(member.age),  // Never send "" to database
          role: member.role || 'adult',
          gender: member.gender || '',
          restrictions: member.restrictions || '',
          preferences: member.preferences || '',
        }))

        console.log('[useHousehold.saveMembers] FINAL payload', preparedMembers)

        const { error: insertError } = await supabase
          .from('household_members')
          .insert(preparedMembers)

        if (insertError) {
          console.error('[useHousehold.saveMembers] ERROR inserting members:', insertError)
          throw insertError
        }

        console.log('[useHousehold.saveMembers] Members inserted successfully')

        // Delete old members not in the new list (only for non-recovery saves)
        if (!householdIdOverride && memberList.length > 0) {
          const idsToKeep = preparedMembers.map((m) => m.id).filter(Boolean)
          if (idsToKeep.length > 0) {
            const { error: deleteError } = await supabase
              .from('household_members')
              .delete()
              .eq('household_id', effectiveHouseholdId)
              .not('id', 'in', `(${idsToKeep.join(',')})`)
            
            if (deleteError) {
              console.error('[useHousehold.saveMembers] ERROR deleting old members:', deleteError)
            }
          }
        }

        // Refresh members from DB using household_id
        const { data: refreshedMembers, error: refreshError } = await supabase
          .from('household_members')
          .select('*')
          .eq('household_id', effectiveHouseholdId)
          .order('created_at', { ascending: true })

        if (refreshError) {
          console.error('[useHousehold.saveMembers] ERROR refreshing members:', refreshError)
          throw refreshError
        }

        console.log('[useHousehold.saveMembers] Members refreshed:', refreshedMembers?.length)
        setMembers(refreshedMembers ?? [])
        return refreshedMembers ?? []
      } catch (err) {
        console.error('[useHousehold.saveMembers] CRITICAL ERROR:', err)
        setError(err)
        toast.error("Couldn't save your changes. Give it another shot.")
        throw err
      } finally {
        setLoading(false)
      }
    },
    [household?.id, user],
  )

  // Recovery function - creates default members based on household.total_people
  const repairMembers = useCallback(
    async () => {
      if (!user) throw new Error('User required')
      if (!household?.id) throw new Error('Cannot repair members without a household')

      const total = Math.max(household.total_people || 1, 1)

      const defaultMembers = Array.from({ length: total }, (_, index) => ({
        label: `member-${index + 1}`,
        name: total === 1 && index === 0 ? 'Me' : `Member ${index + 1}`,
        age: null,
        role: index === 0 ? 'adult' : null,
        gender: null,
        restrictions: [],
        preferences: [],
      }))

      console.log('[useHousehold.repairMembers] restoring defaults', defaultMembers)

      return saveMembers(defaultMembers, household.id)
    },
    [user, household, saveMembers]
  )

  return {
    household,
    members,
    loading,
    error,
    reloadHousehold: loadHousehold,
    saveHousehold,
    saveMembers,
    repairMembers,
  }
}
