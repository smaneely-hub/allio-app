import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

// Handles OAuth redirects from providers like Google.
// Supabase exchanges the code from the URL via detectSessionInUrl before
// AuthProvider sets loading=false, so by the time this effect runs the
// session is ready.
export function AuthCallbackPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    supabase
      .from('households')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        navigate(data ? '/tonight' : '/onboarding', { replace: true })
      })
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <p className="text-text-secondary text-sm">Signing you in…</p>
    </div>
  )
}
