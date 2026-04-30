import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Logo } from './Logo'

function CalendarDaysIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M8 2v4M16 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

function ShoppingCartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SettingsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const links = [
  { to: '/planner', label: 'Planner', icon: CalendarDaysIcon, aliases: ['/plan'] },
  { to: '/catalog', label: 'Search', icon: SearchIcon, aliases: ['/search', '/recipes'] },
  { to: '/shop', label: 'Groceries', icon: ShoppingCartIcon, aliases: ['/groceries'] },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, aliases: [] },
]

export function NavBar() {
  const { user } = useAuth()
  const location = useLocation()
  const userInitial = user?.email?.charAt(0).toUpperCase() || '?'

  const isActive = (link) => {
    const paths = [link.to, ...(link.aliases || [])]
    return paths.some((path) => location.pathname === path || location.pathname.startsWith(path + '/'))
  }

  return (
    <>
      <header className="hidden bg-white shadow-sm md:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Logo size="md" />
          {user ? (
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-5 text-sm font-medium">
                {links.map((link) => (
                  <Link key={link.to} to={link.to} className={isActive(link) ? 'text-accent-blue' : 'text-ink-secondary hover:text-ink-primary'}>
                    {link.label}
                  </Link>
                ))}
              </nav>
              <Link to="/settings" className="flex items-center gap-2 text-sm text-ink-secondary hover:text-ink-primary">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-teal-400 text-sm font-semibold text-white">
                  {userInitial}
                </div>
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <header className="fixed left-0 right-0 top-0 z-40 bg-white px-4 py-3 shadow-sm md:hidden">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          {user ? (
            <Link to="/settings">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-teal-400 font-semibold text-white">
                {userInitial}
              </div>
            </Link>
          ) : null}
        </div>
      </header>

      {user ? (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-surface-muted bg-surface-card pb-safe">
          <div className="mx-auto flex h-16 max-w-xl items-center justify-around">
            {links.map((link) => {
              const Icon = link.icon
              const active = isActive(link)
              return (
                <Link key={link.to} to={link.to} className={`flex flex-col items-center justify-center ${active ? 'text-accent-blue' : 'text-ink-tertiary'}`}>
                  <Icon className="h-5 w-5" />
                  <span className="mt-0.5 text-xs">{link.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      ) : null}

      <div className="h-16 md:hidden" style={{ height: 'calc(4rem + env(safe-area-inset-bottom, 20px))' }}></div>
    </>
  )
}
