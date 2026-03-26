import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const links = [
  { to: '/plan', label: 'Plan', icon: '📋' },
  { to: '/schedule', label: 'Schedule', icon: '📅' },
  { to: '/shop', label: 'Shop', icon: '🛒' },
  { to: '/settings', label: 'Profile', icon: '👤' },
]

export function NavBar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <>
      {/* Desktop navbar */}
      <header className="hidden md:block border-b border-warm-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-2xl text-warm-900">
            Allio
          </Link>

          {user ? (
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-5 text-sm font-medium">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`transition-colors duration-150 ${
                      isActive(link.to)
                        ? 'border-b-2 border-primary-400 text-primary-400'
                        : 'text-warm-400 hover:text-warm-700'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <button
                type="button"
                onClick={handleSignOut}
                className="btn-ghost text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-medium text-warm-400 hover:text-warm-700">
              Log In
            </Link>
          )}
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-warm-200 bg-white md:hidden">
        <div className="flex items-center justify-around py-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors duration-150 ${
                isActive(link.to)
                  ? 'text-primary-400'
                  : 'text-warm-400'
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Spacer for mobile bottom bar */}
      <div className="h-16 md:hidden"></div>
    </>
  )
}