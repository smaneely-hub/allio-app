import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 text-6xl">🧭</div>
      <h1 className="mb-3 font-display text-3xl text-text-primary">Wrong turn</h1>
      <p className="mb-6 text-warm-600">This page doesn't exist. Let's get you back on track.</p>
      <Link to="/" className="btn-primary">
        Go home
      </Link>
    </div>
  )
}