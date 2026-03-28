import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

export function EmailVerificationBanner() {
  const { user, emailUnverified, resendVerification, loading } = useAuth()
  
  if (loading || !emailUnverified || !user) return null
  
  const handleResend = async () => {
    try {
      await resendVerification()
    } catch (err) {
      toast.error('Could not resend email')
    }
  }
  
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-3 py-2">
      <div className="mx-auto max-w-6xl flex items-center justify-center gap-3 text-sm">
        <span className="text-amber-800">
          Please verify your email to activate your account.
        </span>
        <button 
          onClick={handleResend}
          className="font-medium text-amber-700 hover:text-amber-900 underline"
        >
          Resend email
        </button>
      </div>
    </div>
  )
}