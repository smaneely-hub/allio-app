import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getAdminScaffoldStatus } from '../lib/admin'
import { loadAdminOverview } from '../lib/adminApi'

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-3xl border border-divider bg-surface-card p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-text-primary">{value}</div>
      <div className="mt-2 text-sm text-text-secondary">{hint}</div>
    </div>
  )
}

function SectionCard({ title, body, action }) {
  return (
    <div className="rounded-3xl border border-divider bg-surface-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <p className="mt-2 text-sm text-text-secondary">{body}</p>
        </div>
        {action}
      </div>
    </div>
  )
}

export function AdminPage() {
  const { user } = useAuth()
  const scaffold = getAdminScaffoldStatus()
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    loadAdminOverview()
      .then((data) => {
        if (!active) return
        setOverview(data?.metrics || null)
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message || 'Could not load admin overview')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const display = (value) => (loading ? '…' : (value ?? '—'))

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 h-1 w-14 rounded-full bg-gradient-to-r from-violet-500 via-sky-500 to-teal-400" />
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Admin</div>
          <h1 className="mt-2 font-display text-3xl text-text-primary md:text-4xl">Operations dashboard</h1>
          <p className="mt-3 max-w-3xl text-sm text-text-secondary">
            Secure admin portal, backed by server-side verification and read-only backend endpoints. This is the right first production shape for support and ops.
          </p>
        </div>
        <div className="rounded-2xl border border-divider bg-white px-4 py-3 text-sm text-text-secondary shadow-sm">
          Signed in as <span className="font-medium text-text-primary">{user?.email || 'unknown admin'}</span>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={display(overview?.totalUsers)} hint="All authenticated accounts" />
        <StatCard label="7-day signups" value={display(overview?.signups7d)} hint="New users this week" />
        <StatCard label="7-day active users" value={display(overview?.activeUsers7d)} hint="Distinct users with tracked activity" />
        <StatCard label="Plan generations" value={display(overview?.planGenerations7d)} hint="Tracked plan generations in the last 7 days" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <SectionCard
          title="User management"
          body="Search users, inspect household state, and support account troubleshooting from a backend-backed explorer."
          action={<Link to="/admin/users" className="btn-primary whitespace-nowrap">Open users</Link>}
        />
        <SectionCard
          title="Security posture"
          body={`Current client gate mode: ${scaffold.mode}. Configured admin emails: ${scaffold.configuredAdmins}. Backend routes also verify admin access server-side before returning data.`}
          action={<a href="/docs/admin-backend-plan.md" className="btn-secondary whitespace-nowrap">Read plan</a>}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-divider bg-surface-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary">Portal coverage</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            <li>• top-line metrics and health cards</li>
            <li>• searchable user explorer</li>
            <li>• user account, household, preferences, and recent activity detail</li>
            <li>• read-only first, audited write actions next</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-divider bg-surface-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary">Guardrails</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            <li>• no service-role secrets in the browser</li>
            <li>• no direct cross-user browser queries</li>
            <li>• every admin read passes server verification</li>
            <li>• future write actions should add audit logs first</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
