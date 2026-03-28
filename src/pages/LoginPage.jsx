import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

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

  const handleResendVerification = async () => {
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      toast.success('Verification email resent!')
    } catch (error) {
      toast.error(error.message || 'Could not resend email')
    } finally {
      setResending(false)
    }
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
          options: { emailRedirectTo: window.location.origin }
        })
        if (error) throw error

        if (data.user?.id && data.user?.email_confirmed_at) {
          navigate('/onboarding', { replace: true })
          toast.success('Account created successfully.')
        } else if (data.user?.id) {
          setConfirmationSent(true)
          toast.success('Check your email to activate your account.')
        } else {
          toast.success('Account created. Check your email to confirm.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const { data: household } = await supabase
          .from('households')
          .select('id')
          .eq('user_id', data.user?.id)
          .limit(1)
          .maybeSingle()

        if (!household) {
          navigate('/onboarding', { replace: true })
        } else {
          navigate('/schedule', { replace: true })
        }
        toast.success('Welcome back.')
      }
    } catch (error) {
      toast.error(error.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 px-4 pt-8">
      <div className="w-full max-w-sm mx-auto">
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl text-warm-900">
            Allio <span className="text-primary-400">.</span>
          </h1>
          <p className="mt-2 text-warm-400">Dinner, figured out.</p>
        </div>

        {/* Email confirmation screen */}
        {confirmationSent ? (
          <div className="space-y-6">
            <div className="text-5xl text-center">📧</div>
            <h2 className="font-display text-xl text-warm-900 text-center">Check your email!</h2>
            <p className="text-sm text-warm-600 text-center">
              We sent a verification link to <strong>{email}</strong>. 
              Click it to activate your account.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="btn-primary w-full"
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>
            <div className="text-center text-sm text-warm-500">
              Already verified?{' '}
              <button type="button" onClick={() => { setConfirmationSent(false); setMode('login') }} className="text-primary-400 font-medium hover:underline">
                Log in
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="mb-6 grid grid-cols-2 rounded-full bg-warm-100 p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`rounded-full py-2 text-sm font-medium transition-all duration-150 ${
                  !isSignup ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500'
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`rounded-full py-2 text-sm font-medium transition-all duration-150 ${
                  isSignup ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500'
                }`}
              >
                Sign up
              </button>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full"
                  autoComplete="email"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input w-full"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !!validationError}
                className="btn-primary w-full py-3"
              >
                {loading ? '...' : isSignup ? 'Create account' : 'Log in'}
              </button>
            </form>

            {/* Bottom link */}
            <div className="mt-6 text-center text-sm text-warm-400">
              {isSignup ? (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => setMode('login')} className="text-primary-400 font-medium hover:underline">
                    Log in
                  </button>
                </>
              ) : (
                <>
                  No account?{' '}
                  <button type="button" onClick={() => setMode('signup')} className="text-primary-400 font-medium hover:underline">
                    Sign up
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}