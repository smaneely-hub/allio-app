import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getAdminScaffoldStatus } from '../lib/admin'

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 h-1 w-14 rounded-full bg-gradient-to-r from-violet-500 via-sky-500 to-teal-400" />
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Admin</div>
          <h1 className="mt-2 font-display text-3xl text-text-primary md:text-4xl">Operations dashboard</h1>
          <p className="mt-3 max-w-3xl text-sm text-text-secondary">
            This is the admin scaffold. The shell is live, but cross-user metrics and controls should come from server-verified admin endpoints before we rely on them.
          </p>
        </div>
        <div className="rounded-2xl border border-divider bg-white px-4 py-3 text-sm text-text-secondary shadow-sm">
          Signed in as <span className="font-medium text-text-primary">{user?.email || 'unknown admin'}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value="--" hint="Wire to admin-overview Edge Function" />
        <StatCard label="7-day signups" value="--" hint="Source: auth.users" />
        <StatCard label="7-day active users" value="--" hint="Source: usage_tracking" />
        <StatCard label="Plan generations" value="--" hint="Source: usage_tracking or meal_plans" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <SectionCard
          title="User management"
          body="Search users, inspect household state, and prepare support workflows. The route exists now so we can wire real data next."
          action={<Link to="/admin/users" className="btn-primary whitespace-nowrap">Open users</Link>}
        />
        <SectionCard
          title="Security posture"
          body={`Current scaffold mode: ${scaffold.mode}. Configured admin emails: ${scaffold.configuredAdmins}. This is UI gating only until server-side role checks are added.`}
          action={<a href="/docs/admin-backend-plan.md" className="btn-secondary whitespace-nowrap">Read plan</a>}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-divider bg-surface-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary">Next backend endpoints</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            <li>• admin-overview, for top-line metrics and health cards</li>
            <li>• admin-users-list, for searchable support-facing user records</li>
            <li>• admin-user-detail, for household, preferences, and activity summaries</li>
            <li>• admin audit logging before any write action goes live</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-divider bg-surface-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary">Guardrails</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            <li>• No service-role secrets in the browser</li>
            <li>• No broad cross-user anon queries from the client</li>
            <li>• Read-only first, audited writes later</li>
            <li>• Support tooling should expose only the minimum PII needed</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
