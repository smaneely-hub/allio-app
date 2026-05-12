import { Navigate } from 'react-router-dom'
import { useAuthContext } from './AuthProvider'
import { isAdminEmail, getAdminAccessReason } from '../lib/admin'

export function AdminRoute({ children }) {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-slate-900" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  if (!isAdminEmail(user.email)) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-4 py-10">
        <div className="w-full rounded-3xl border border-divider bg-surface-card p-8 shadow-sm">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Admin</div>
          <h1 className="font-display text-3xl text-text-primary">Access blocked</h1>
          <p className="mt-3 text-sm text-text-secondary">{getAdminAccessReason(user)}</p>
          <div className="mt-6 flex gap-3">
            <a href="/dashboard" className="btn-primary">Back to app</a>
          </div>
        </div>
      </div>
    )
  }

  return children
}
