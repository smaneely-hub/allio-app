import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { deleteAdminUser, loadAdminUserDetail } from '../lib/adminApi'

function DetailCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-divider bg-surface-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <div className="mt-3 text-sm text-text-secondary">{children}</div>
    </div>
  )
}

export function AdminUserDetailPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    if (!userId) return
    setLoading(true)
    loadAdminUserDetail(userId)
      .then((result) => {
        if (!active) return
        setData(result)
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message || 'Could not load user detail')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [userId])

  const user = data?.user
  const household = data?.household
  const members = data?.members || []
  const usage = data?.usage || []
  const recentPlans = data?.recentPlans || []
  const recentRecipes = data?.recentRecipes || []

  const handleDeleteUser = async () => {
    if (!userId || deleting) return
    const label = user?.email || userId
    if (!window.confirm(`Delete ${label}? This permanently removes the auth user and their app data.`)) return

    setDeleting(true)
    try {
      await deleteAdminUser(userId)
      toast.success('User deleted')
      navigate('/admin/users', { replace: true })
    } catch (err) {
      toast.error(err?.message || 'Could not delete user')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Admin user detail</div>
          <h1 className="mt-2 font-display text-3xl text-text-primary">User record</h1>
          <p className="mt-3 max-w-3xl text-sm text-text-secondary">
            Backend-backed support view for <span className="font-medium text-text-primary">{userId}</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDeleteUser}
            disabled={loading || deleting}
            className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete user'}
          </button>
          <Link to="/admin/users" className="btn-secondary whitespace-nowrap">Back to users</Link>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="rounded-2xl border border-divider bg-surface-card px-4 py-6 text-sm text-text-muted">Loading user record…</div> : null}

      {!loading && !error ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailCard title="Account summary">
            <ul className="space-y-2">
              <li>• Email: {user?.email || '—'}</li>
              <li>• Created: {user?.created_at ? new Date(user.created_at).toLocaleString() : '—'}</li>
              <li>• Last sign-in: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}</li>
              <li>• Email verified: {user?.email_confirmed_at ? 'yes' : 'no'}</li>
            </ul>
          </DetailCard>

          <DetailCard title="Household summary">
            <ul className="space-y-2">
              <li>• Household id: {household?.id || '—'}</li>
              <li>• Subscription tier: {household?.subscription_tier || 'free'}</li>
              <li>• Household members: {members.length}</li>
              <li>• Preferences row: {data?.preferences ? 'present' : 'missing'}</li>
            </ul>
          </DetailCard>

          <DetailCard title="Members">
            {members.length ? (
              <ul className="space-y-2">
                {members.map((member) => (
                  <li key={member.id}>• {member.name || member.label || 'Unnamed member'}{member.age ? `, age ${member.age}` : ''}{member.goal ? `, goal ${member.goal}` : ''}</li>
                ))}
              </ul>
            ) : 'No members found.'}
          </DetailCard>

          <DetailCard title="Recent usage">
            {usage.length ? (
              <ul className="space-y-2">
                {usage.map((entry, index) => (
                  <li key={`${entry.action}-${entry.created_at}-${index}`}>• {entry.action} — {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}</li>
                ))}
              </ul>
            ) : 'No tracked usage yet.'}
          </DetailCard>

          <DetailCard title="Recent meal plans">
            {recentPlans.length ? (
              <ul className="space-y-2">
                {recentPlans.map((plan) => (
                  <li key={plan.id}>• {plan.status || 'draft'} — {plan.created_at ? new Date(plan.created_at).toLocaleString() : '—'}</li>
                ))}
              </ul>
            ) : 'No recent meal plans.'}
          </DetailCard>

          <DetailCard title="Recent recipes">
            {recentRecipes.length ? (
              <ul className="space-y-2">
                {recentRecipes.map((recipe) => (
                  <li key={recipe.id}>• {recipe.title || 'Untitled recipe'} — {recipe.created_at ? new Date(recipe.created_at).toLocaleDateString() : '—'}</li>
                ))}
              </ul>
            ) : 'No recent recipes.'}
          </DetailCard>
        </div>
      ) : null}
    </div>
  )
}
