import { Link } from 'react-router-dom'

export function LandingPage() {
  if (typeof document !== 'undefined') {
    document.title = "Allio — Dinner, figured out."
  }
  
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff', padding: '20px' }}>
      <header style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', padding: '20px 0' }}>
        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
          <span style={{ color: '#22c55e' }}>A</span>llio
        </span>
        <nav style={{ display: 'flex', gap: '20px' }}>
          <Link to="/pricing" style={{ color: '#666' }}>Pricing</Link>
          <Link to="/login" style={{ color: '#22c55e', fontWeight: '500' }}>Get started</Link>
        </nav>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '80px 20px' }}>
        <h1 style={{ fontSize: '48px', color: '#1f2937', marginBottom: '20px', fontFamily: 'Georgia, serif' }}>
          Stop thinking about what to cook.
        </h1>
        <p style={{ fontSize: '20px', color: '#6b7280', marginBottom: '30px', maxWidth: '600px', margin: '0 auto 30px' }}>
          Allio plans your week, builds your grocery list, and keeps your family eating well — without the daily mental load.
        </p>
        <Link to="/login" style={{ display: 'inline-block', backgroundColor: '#22c55e', color: '#fff', fontWeight: '500', padding: '12px 32px', borderRadius: '9999px', textDecoration: 'none' }}>
          Plan my week in 30 seconds
        </Link>
      </main>

      <section style={{ backgroundColor: '#f9fafb', padding: '60px 20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', color: '#1f2937', marginBottom: '20px', fontFamily: 'Georgia, serif' }}>
            You don't need more recipes. You need fewer decisions.
          </h2>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>
            Work. Kids. Life. And every day, the same question: "What are we eating tonight?"
          </p>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', fontSize: '14px', borderTop: '1px solid #f3f4f6' }}>
        © 2026 Allio
      </footer>
    </div>
  )
}