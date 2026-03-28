import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { hasCompletedOnboarding } from '../hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const isSignup = mode === 'signup'

  const validationError = useMemo(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) return 'Enter a valid email address.'
    if (password.length < 6) return 'Password must be at least 6 characters.'
    return null
  }, [email, password])

  // Resend verification email
  const handleResendVerification = async () => {
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      if (error) throw error
      toast.success('Verification email resent!')
      setConfirmationSent(true)
    } catch (error) {
      toast.error(error.message || 'Could not resend email')
    } finally {
      setResending(false)
    }
  }

  // Determine where to redirect after login based on user data
  const determineRedirect = async (userId) => {
    // 1. Check if user has a household row -> if not, redirect to /onboarding
    const { data: household } = await supabase
      .from('households')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (!household) {
      return '/onboarding'
    }

    // 2. Check if user has an active or draft meal plan -> if yes, redirect to /plan
    const { data: mealPlan } = await supabase
      .from('meal_plans')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'draft'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (mealPlan) {
      return '/plan'
    }

    // 3. Otherwise redirect to /schedule
    return '/schedule'
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoading(true)

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        })
        if (error) throw error

        const userId = data.user?.id
        if (userId && data.user?.email_confirmed_at) {
          // Email already confirmed (e.g., auto-confirm is on)
          navigate('/onboarding', { replace: true })
          toast.success('Account created successfully.')
        } else if (userId) {
          // Show confirmation screen instead of redirecting
          setConfirmationSent(true)
          toast.success('Check your email to activate your account.')
        } else {
          toast.success('Account created. Check your email to confirm your account.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const redirectTo = await determineRedirect(data.user?.id)
        navigate(redirectTo, { replace: true })
        toast.success('Welcome back.')
      }
    } catch (error) {
      toast.error(error.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center justify-center px-6">
      <div className="w-full rounded-2xl bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8 space-y-2 text-center">
          <h1 className="font-display text-3xl text-warm-900">Welcome to Allio</h1>
          <p className="text-sm text-warm-400">Meal planning to grocery purchasing, with less friction.</p>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-warm-100 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-lg py-2 text-sm font-medium transition-colors duration-150 ${
              !isSignup 
                ? 'bg-white text-warm-900 shadow-sm' 
                : 'text-warm-400'
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-lg py-2 text-sm font-medium transition-colors duration-150 ${
              isSignup 
                ? 'bg-white text-warm-900 shadow-sm' 
                : 'text-warm-400'
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Email confirmation screen */}
        {confirmationSent && (
          <div className="space-y-6 text-center">
            <div className="text-5xl">📧</div>
            <h2 className="font-display text-xl text-warm-900">Check your email!</h2>
            <p className="text-sm text-warm-600">
              We sent a verification link to <strong>{email}</strong>. 
              Click it to activate your account.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="btn-secondary w-full"
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>
            <div className="text-sm text-warm-500">
              Already verified?{' '}
              <button type="button" onClick={() => { setConfirmationSent(false); setMode('login') }} className="text-primary-400 font-medium">
                Log in
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-warm-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-warm-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  )
}