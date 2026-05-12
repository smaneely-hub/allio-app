import { Link, useParams } from 'react-router-dom'

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Admin user detail</div>
          <h1 className="mt-2 font-display text-3xl text-text-primary">User record</h1>
          <p className="mt-3 max-w-3xl text-sm text-text-secondary">
            Placeholder detail view for <span className="font-medium text-text-primary">{userId}</span>. Wire this to a secure admin user detail endpoint before exposing real account data.
          </p>
        </div>
        <Link to="/admin/users" className="btn-secondary whitespace-nowrap">Back to users</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Account summary">
          <ul className="space-y-2">
            <li>• Email, created_at, last sign-in, auth state</li>
            <li>• Subscription tier and support flags</li>
            <li>• Audit note: every future write action should log here</li>
          </ul>
        </DetailCard>

        <DetailCard title="Household summary">
          <ul className="space-y-2">
            <li>• Household existence and household id</li>
            <li>• Member count and member attributes summary</li>
            <li>• Planning preferences and onboarding completion hints</li>
          </ul>
        </DetailCard>

        <DetailCard title="Usage and engagement">
          <ul className="space-y-2">
            <li>• Recent planner runs</li>
            <li>• Grocery activity</li>
            <li>• Recent usage_tracking events</li>
          </ul>
        </DetailCard>

        <DetailCard title="Phase 2 actions">
          <ul className="space-y-2">
            <li>• Grant or revoke premium override</li>
            <li>• Soft suspend or reactivate access</li>
            <li>• Launch support impersonation with audit logging</li>
          </ul>
        </DetailCard>
      </div>
    </div>
  )
}
