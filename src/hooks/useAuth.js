import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const auth = useAuthContext()
  return auth
}

export async function hasCompletedOnboarding(userId) {
  if (!userId) return false

  try {
    const { data, error } = await supabase
      .from('households')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return Boolean(data)
  } catch (err) {
    toast.error("Couldn't load your data. Give it another shot.")
    return false
  }
}

export function useOnboardingStatus(userId) {
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function checkStatus() {
      setLoading(true)
      const result = await hasCompletedOnboarding(userId)
      if (!mounted) return
      setCompleted(result)
      setLoading(false)
    }

    if (userId) {
      checkStatus()
    } else {
      setCompleted(false)
      setLoading(false)
    }

    return () => {
      mounted = false
    }
  }, [userId])

  return { completed, loading }
}
