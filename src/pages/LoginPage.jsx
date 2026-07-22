import { useEffect, useMemo, useState } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { getAuthRedirectUrl, signInWithGoogle } from '../lib/nativeAuth'
import { useAuth } from '../hooks/useAuth'
import { Logo } from '../components/Logo'

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}


export function LoginPage() {
  useDocumentTitle("Log in | Allio")
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const { user, loading: authLoading } = useAuth()

  // Redirect already-authenticated users to tonight page
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/tonight', { replace: true })
    }
  }, [authLoading, user, navigate])

  const isSignup = mode === 'signup'

  const validationError = useMemo(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) return 'Enter a valid email address.'
    if (password.length < 6) return 'Password must be at least 6 characters.'
    return null
  }, [email, password])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoading(true)
    try {
      if (isSignup) {
        // Sign up and immediately try to sign in (bypasses email verification in many cases)
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
          }
        })
        
        if (signUpError) {
          // If signup fails due to existing user, try to sign in
          if (signUpError.message.includes('already been registered')) {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
            if (signInError) throw signInError
            navigate('/onboarding')
            return
          }
          throw signUpError
        }
        
        // Try to auto-login immediately after signup
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          // If auto-login fails, show success and let user log in manually
          setConfirmationSent(true)
          toast.success('Account created! Please log in.')
        } else {
          // Auto-login succeeded, proceed to onboarding
          navigate('/onboarding')
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
          navigate('/tonight', { replace: true })
        }
        toast.success('Welcome back.')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      // Browser redirect or native callback takes over from here.
    } catch (err) {
      toast.error(err.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Logo with leaf - calm design */}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <Logo size="lg" className="flex-col gap-3" />
          </div>
          <p className="text-text-secondary mt-2 text-sm">
            Your household, simplified.
          </p>
          <button
            type="button"
            onClick={() => navigate('/try')}
            className="mt-4 text-sm font-semibold text-primary-400 hover:text-primary-500"
          >
            Try one dinner without signing up
          </button>
          <p className="text-text-secondary mt-2 text-sm">
          </p>
        </div>

        {/* Card */}
        <div className="bg-bg-primary rounded-2xl shadow-card p-6 md:p-8 border border-border">
          {confirmationSent ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="font-display text-xl text-text-primary mb-2">Welcome to Allio!</h2>
              <p className="text-text-secondary text-sm mb-4">
                Your account has been created.
              </p>
              <button 
                type="button"
                onClick={() => { setConfirmationSent(false); setMode('login') }}
                className="btn-primary w-full"
              >
                Log in to continue
              </button>
            </div>
          ) : (
            <>
              {/* Google sign-in */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="btn-secondary w-full py-3 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                <span className="text-sm font-semibold">
                  {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                </span>
              </button>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-bg-primary px-3 text-xs text-text-tertiary">or continue with email</span>
                </div>
              </div>

              {/* Mode toggle */}
              <div className="mb-6 grid grid-cols-2 rounded-xl bg-bg-primary p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
                    !isSignup ? 'bg-bg-primary shadow-sm text-text-primary' : 'text-text-tertiary'
                  }`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
                    isSignup ? 'bg-bg-primary shadow-sm text-text-primary' : 'text-text-tertiary'
                  }`}
                >
                  Sign up
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !!validationError}
                  className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '...' : isSignup ? 'Create account' : 'Log in'}
                </button>
              </form>

              {/* Bottom link */}
              <div className="mt-6 text-center text-sm text-text-tertiary">
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

        {/* Legal links */}
        <div className="text-center mt-6 text-xs text-text-muted">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-text-secondary">Terms & Conditions</a>
          {' '}and{' '}
          <a href="/privacy" className="underline hover:text-text-secondary">Privacy Policy</a>.
        </div>

        {/* Back to home */}
        <div className="text-center mt-4">
          <a href="/" className="text-sm text-text-muted hover:text-text-secondary hover:underline">
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  )
}
