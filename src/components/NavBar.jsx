import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Leaf icon with brand color
function Leaf({ className = '' }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 17c8-20 20-8 0-13z" fill="currentColor" fillOpacity="0.5"/>
    </svg>
  )
}

const links = [
  { to: '/plan', label: 'Plan', icon: '📋' },
  { to: '/schedule', label: 'Schedule', icon: '📅' },
  { to: '/shop', label: 'Shop', icon: '🛒' },
  { to: '/settings', label: 'Profile', icon: '👤' },
]

export function NavBar() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  // Get user initial for avatar
  const userInitial = user?.email?.charAt(0).toUpperCase() || '?'

  return (
    <>
      {/* Desktop navbar - gradient border, shadow */}
      <header className="hidden md:block bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/" className="font-display text-2xl text-text-primary flex items-center gap-1">
            Allio
            <Leaf className="text-primary-400" />
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
                        ? 'text-primary-400'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <Link
                to="/settings"
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-teal-400 flex items-center justify-center text-white font-semibold text-sm">
                  {userInitial}
                </div>
              </Link>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary">
              Log In
            </Link>
          )}
        </div>
        {/* Gradient border */}
        <div className="h-0.5 bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400"></div>
      </header>

      {/* Mobile header - logo + avatar only */}
      <header className="md:hidden bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-xl text-text-primary flex items-center gap-1">
            Allio
            <Leaf className="text-primary-400 w-4 h-4" />
          </Link>
          {user && (
            <Link to="/settings">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-teal-400 flex items-center justify-center text-white font-semibold">
                {userInitial}
              </div>
            </Link>
          )}
        </div>
        {/* Gradient border */}
        <div className="h-0.5 bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400"></div>
      </header>

      {/* Mobile bottom tab bar - frosted glass, upgraded styling */}
      {user && (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-divider shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around py-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-all duration-150 ${
                isActive(link.to)
                  ? 'text-primary-400'
                  : 'text-text-muted'
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              <span className="text-[10px] font-medium">{link.label}</span>
              {isActive(link.to) && (
                <div className="w-1 h-1 rounded-full bg-primary-400 mt-0.5"></div>
              )}
            </Link>
          ))}
        </div>
      </nav>
      )}

      {/* Spacer for mobile bottom bar and header */}
      <div className="h-20 md:hidden"></div>
    </>
  )
}