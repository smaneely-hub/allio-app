// Minimal landing page test - no imports at all for debugging
export function LandingPage() {
  return (
    <div style={{display:'block',padding:'20px',fontFamily:'system-ui'}}>
      <h1>ALLIO - TEST</h1>
      <p>If you see this, React is working.</p>
      <a href="/login" style={{color:'green'}}>Go to Login</a>
    </div>
  )
}