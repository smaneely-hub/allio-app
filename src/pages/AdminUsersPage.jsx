import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { loadAdminUsers } from '../lib/adminApi'

export function AdminUsersPage() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    const timer = setTimeout(() => {
      loadAdminUsers(query)
        .then((data) => {
          if (!active) return
          setUsers(data?.users || [])
          setError('')
        })
        .catch((err) => {
          if (!active) return
          setError(err?.message || 'Could not load users')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query])

  const emptyMessage = useMemo(() => {
    if (loading) return 'Loading users…'
    if (query.trim()) return 'No users match that search yet.'
    return 'No users returned.'
  }, [loading, query])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Admin users</div>
          <h1 className="mt-2 font-display text-3xl text-text-primary">User explorer</h1>
          <p className="mt-3 max-w-3xl text-sm text-text-secondary">
            Search real users by email or id, then drill into account, household, and recent activity detail.
          </p>
        </div>
        <Link to="/admin" className="btn-secondary whitespace-nowrap">Back to dashboard</Link>
      </div>

      <div className="rounded-3xl border border-divider bg-surface-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <input
            className="input md:col-span-2"
            placeholder="Search by email or user id"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="input flex items-center text-sm text-text-muted md:col-span-3">Read-only first pass, backend-backed admin search</div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-3xl border border-divider bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider text-sm">
            <thead className="bg-surface-muted/40 text-left text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last sign-in</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium">Onboarding</th>
                <th className="px-4 py-3 font-medium">Household</th>
                <th className="px-4 py-3 font-medium">Recent activity</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {users.length ? users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-4">
                    <div className="font-medium text-text-primary">{user.email || 'No email'}</div>
                    <div className="mt-1 text-xs text-text-muted">{user.id}</div>
                  </td>
                  <td className="px-4 py-4 text-text-secondary">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-4 text-text-secondary">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-4 text-text-secondary">{user.subscription}</td>
                  <td className="px-4 py-4 text-text-secondary">{user.onboarding}</td>
                  <td className="px-4 py-4 text-text-secondary">{user.household}</td>
                  <td className="px-4 py-4 text-text-secondary">{user.recent_activity}</td>
                  <td className="px-4 py-4 text-right">
                    <Link to={`/admin/users/${user.id}`} className="text-sm font-medium text-accent-blue hover:underline">View</Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-text-muted">{emptyMessage}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
