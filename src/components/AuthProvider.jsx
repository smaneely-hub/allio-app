import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { ensureDefaultShoppingList } from '../lib/shoppingLists'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailUnverified, setEmailUnverified] = useState(false)
  const navigate = useNavigate()
  const prevUserRef = useRef(null)
  const intentionalSignOutRef = useRef(false)

  // Check if email is verified
  const isEmailVerified = user?.email_confirmed_at != null

  useEffect(() => {
    // Show banner if user exists but email is not verified
    if (user && !isEmailVerified) {
      setEmailUnverified(true)
    } else {
      setEmailUnverified(false)
    }
  }, [user, isEmailVerified])

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        setUser(data.session?.user ?? null)
        prevUserRef.current = data.session?.user ?? null
      } catch {
        if (!mounted) return
        setUser(null)
        prevUserRef.current = null
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      
      // Handle session expiry - compare with ref, not state
      // Skip the toast/redirect if this was triggered by intentional sign-out
      if (!session && prevUserRef.current && !intentionalSignOutRef.current) {
        toast.error('Your session expired. Please log in again.')
        navigate('/', { replace: true })
      }
      intentionalSignOutRef.current = false
      
      prevUserRef.current = session?.user ?? null
      setUser(session?.user ?? null)
      if (session?.user?.id) {
        try {
          await ensureDefaultShoppingList(session.user.id)
        } catch (error) {
          console.error('[AuthProvider] ensureDefaultShoppingList error:', error)
        }
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [navigate])

  const value = useMemo(
    () => ({
      user,
      loading,
      emailUnverified,
      signOut: async () => {
        intentionalSignOutRef.current = true
        await supabase.auth.signOut({ scope: 'local' })
        if (typeof window !== 'undefined') {
          try {
            const keys = Object.keys(window.localStorage)
            keys.filter((k) => k.toLowerCase().includes('supabase') || k.toLowerCase().includes('sb-')).forEach((k) => window.localStorage.removeItem(k))
            const sessionKeys = Object.keys(window.sessionStorage)
            sessionKeys.filter((k) => k.toLowerCase().includes('supabase') || k.toLowerCase().includes('sb-')).forEach((k) => window.sessionStorage.removeItem(k))
          } catch {}
        }
        navigate('/', { replace: true })
      },
      resendVerification: async () => {
        if (!user?.email) return
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: user.email,
        })
        if (error) throw error
        toast.success('Verification email resent!')
      },
    }),
    [user, loading, emailUnverified, navigate],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}