import { Link } from 'react-router-dom'

const placeholderUsers = [
  {
    id: 'user_01',
    email: 'user@example.com',
    createdAt: '2026-05-10',
    subscription: 'premium',
    onboarding: 'complete',
    household: '1 household, 3 members',
    activity: 'planner used 2h ago',
  },
  {
    id: 'user_02',
    email: 'new-user@example.com',
    createdAt: '2026-05-11',
    subscription: 'free',
    onboarding: 'incomplete',
    household: 'no household yet',
    activity: 'signed up today',
  },
]

export function AdminUsersPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Admin users</div>
          <h1 className="mt-2 font-display text-3xl text-text-primary">User explorer</h1>
          <p className="mt-3 max-w-3xl text-sm text-text-secondary">
            This table is scaffolded with placeholders right now. The real version should be hydrated by a server-verified admin users endpoint.
          </p>
        </div>
        <Link to="/admin" className="btn-secondary whitespace-nowrap">Back to dashboard</Link>
      </div>

      <div className="rounded-3xl border border-divider bg-surface-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <input className="input md:col-span-2" placeholder="Search by email or user id" disabled />
          <select className="input" disabled>
            <option>All subscriptions</option>
          </select>
          <select className="input" disabled>
            <option>All onboarding states</option>
          </select>
          <select className="input" disabled>
            <option>All activity states</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl border border-divider bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider text-sm">
            <thead className="bg-surface-muted/40 text-left text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium">Onboarding</th>
                <th className="px-4 py-3 font-medium">Household</th>
                <th className="px-4 py-3 font-medium">Recent activity</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {placeholderUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-4">
                    <div className="font-medium text-text-primary">{user.email}</div>
                    <div className="mt-1 text-xs text-text-muted">{user.id}</div>
                  </td>
                  <td className="px-4 py-4 text-text-secondary">{user.createdAt}</td>
                  <td className="px-4 py-4 text-text-secondary">{user.subscription}</td>
                  <td className="px-4 py-4 text-text-secondary">{user.onboarding}</td>
                  <td className="px-4 py-4 text-text-secondary">{user.household}</td>
                  <td className="px-4 py-4 text-text-secondary">{user.activity}</td>
                  <td className="px-4 py-4 text-right">
                    <Link to={`/admin/users/${user.id}`} className="text-sm font-medium text-accent-blue hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
