import { useMemo, useState } from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

// Leaf decoration
function Leaf({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 17c8-20 20-8 0-13z" fill="#5FAF7A" fillOpacity="0.5"/>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 17c8-20 20-8 0-13z" stroke="#5FAF7A" strokeWidth="1"/>
    </svg>
  )
}

  useDocumentTitle("Log in | Allio")
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoading(true)
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        })
        if (error) throw error
        
        setConfirmationSent(true)
        toast.success('Account created. Check your email to confirm.')
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
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      })
      if (error) throw error
      toast.success('Verification email resent.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Logo with leaf - calm design */}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <h1 className="font-display text-4xl text-text-primary">
              Allio
            </h1>
            <div className="absolute -top-0 -right-5">
              <Leaf className="w-5 h-5" />
            </div>
          </div>
          <p className="text-text-secondary mt-2 text-sm">
            Your household, simplified.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card p-6 md:p-8">
          {confirmationSent ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-4">✉️</div>
              <h2 className="font-display text-xl text-text-primary mb-2">Check your email!</h2>
              <p className="text-text-secondary text-sm mb-4">
                We sent a confirmation link to <span className="font-medium">{email}</span>
              </p>
              <button 
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="text-sm text-primary-400 hover:underline disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend email'}
              </button>
              <div className="mt-6 text-sm text-text-muted">
                Already verified?{' '}
                <button type="button" onClick={() => { setConfirmationSent(false); setMode('login') }} className="text-primary-400 font-medium hover:underline">
                  Log in
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="mb-6 grid grid-cols-2 rounded-xl bg-bg-primary p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
                    !isSignup ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted'
                  }`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`rounded-lg py-2 text-sm font-medium transition-all duration-150 ${
                    isSignup ? 'bg-white shadow-sm text-text-primary' : 'text-text-muted'
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
              <div className="mt-6 text-center text-sm text-text-muted">
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

        {/* Back to home */}
        <div className="text-center mt-6">
          <a href="/" className="text-sm text-text-muted hover:text-text-secondary hover:underline">
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  )
}