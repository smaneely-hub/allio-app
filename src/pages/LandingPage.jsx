import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'

// Leaf decoration SVG
function Leaf({ className = '' }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 17c8-20 20-8 0-13z" fill="#5FAF7A" fillOpacity="0.5"/>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 17c8-20 20-8 0-13z" stroke="#5FAF7A" strokeWidth="1"/>
    </svg>
  )
}

// Phone mockup
function PhoneMockup() {
  return (
    <div className="relative">
      <div className="w-64 h-[480px] bg-white rounded-[2.5rem] border-4 border-divider shadow-card overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-warm-200 rounded-b-xl z-10"></div>
        {/* Screen */}
        <div className="w-full h-full bg-bg-primary overflow-hidden pt-6 px-3">
          <div className="text-xs font-semibold text-primary-500 mb-2">Your Week</div>
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs ${day === 'Wed' ? 'bg-primary-400 text-white' : 'bg-warm-100 text-warm-600'}`}>
                {day}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="bg-white rounded-xl p-3 shadow-soft">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🍗</span>
                <span className="font-medium text-sm text-text-primary">Chicken Stir Fry</span>
              </div>
              <div className="text-xs text-text-secondary">25 min · 4 servings</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-soft">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🌮</span>
                <span className="font-medium text-sm text-text-primary">Pork Tacos</span>
              </div>
              <div className="text-xs text-text-secondary">30 min · 4 servings</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-soft">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🍝</span>
                <span className="font-medium text-sm text-text-primary">Pasta Night</span>
              </div>
              <div className="text-xs text-text-secondary">20 min · 4 servings</div>
            </div>
          </div>
        </div>
      </div>
      {/* Soft shadow/glow */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary-200/30 rounded-full blur-2xl"></div>
    </div>
  )
}

// Feature card
function FeatureCard({ emoji, title, description }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-card text-center hover:shadow-lg transition-shadow">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-display text-lg text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  )
}

// Mini cards for features
function MiniMealCard({ emoji, name, time }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-soft">
      <span className="text-lg">{emoji}</span>
      <div>
        <div className="text-xs font-medium text-text-primary">{name}</div>
        <div className="text-[10px] text-text-secondary">{time}</div>
      </div>
    </div>
  )
}

function MiniShoppingItem({ name, checked }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`w-4 h-4 rounded border ${checked ? 'bg-primary-400 border-primary-400' : 'border-warm-300'} flex items-center justify-center`}>
        {checked && <span className="text-white text-xs">✓</span>}
      </span>
      <span className={`text-xs ${checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>{name}</span>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary overflow-x-hidden">
      {/* Hero Section - calm, clean */}
      <div className="bg-bg-primary">
        {/* Top right login */}
        <div className="container mx-auto px-4 py-4 flex justify-end">
          <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary hover:underline font-medium">
            Log in
          </Link>
        </div>

        {/* Hero content */}
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left - Text */}
            <div className="flex-1 text-center lg:text-left">
              {/* Logo */}
              <div className="mb-6">
                <Logo size="lg" />
              </div>
              
              <h2 className="font-display text-2xl md:text-3xl lg:text-4xl text-text-primary mb-4">
                Everything your household needs. Finally in one place.
              </h2>
              <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto lg:mx-0">
                Plan meals, organize shopping, and coordinate your family's schedule — all in one beautiful app.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/login" className="btn-primary text-lg py-3 px-8">
                  Get Started
                </Link>
              </div>
              
              <p className="text-sm text-text-muted mt-4">No credit card required</p>
            </div>

            {/* Right - Phone */}
            <div className="flex-1 flex justify-center">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>

      {/* Three Feature Cards */}
      <div className="py-12 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon="📅" 
              title="Plan Your Week" 
              description="Set your schedule and let Allio create personalized meal plans that fit your life."
            />
            <FeatureCard 
              icon="🛒" 
              title="Simplify Shopping" 
              description="Auto-generated shopping lists with everything you need, organized by aisle."
            />
            <FeatureCard 
              icon="✅" 
              title="Organize Your Day" 
              description="See who's eating, what's for dinner, and what tasks need doing at a glance."
            />
          </div>
        </div>
      </div>

      {/* Detailed Features */}
      <div className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-16">
          
          {/* Feature 1 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h3 className="font-display text-2xl text-text-primary mb-3">Plan Your Week</h3>
              <p className="text-text-secondary mb-4">
                Set your weekly schedule once, and Allio handles the rest. It adapts to who's actually home and creates meals that work for everyone.
              </p>
              <div className="bg-white rounded-2xl shadow-card p-4 inline-block">
                <div className="text-xs font-semibold text-primary-500 mb-2">Your Week</div>
                <div className="flex gap-1 mb-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
                    <div key={d} className={`px-2 py-1 rounded-lg text-xs ${d === 'Wed' ? 'bg-primary-400 text-white' : 'bg-warm-100 text-text-secondary'}`}>{d}</div>
                  ))}
                </div>
                <div className="space-y-2">
                  <MiniMealCard emoji="🍗" name="Chicken Stir Fry" time="25 min" />
                  <MiniMealCard emoji="🌮" name="Pork Tacos" time="30 min" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="flex-1">
              <h3 className="font-display text-2xl text-text-primary mb-3">Simplify Shopping</h3>
              <p className="text-text-secondary mb-4">
                One list that combines everything from all your meals. No more duplicates, no more forgotten items.
              </p>
              <div className="bg-white rounded-2xl shadow-card p-4 inline-block min-w-[260px]">
                <div className="text-xs font-semibold text-primary-500 mb-2">Shopping List</div>
                <div className="mb-2">
                  <div className="text-xs font-medium text-text-primary mb-1">Produce</div>
                  <MiniShoppingItem name="Broccoli crowns" checked={true} />
                  <MiniShoppingItem name="Lemon" checked={false} />
                </div>
                <div>
                  <div className="text-xs font-medium text-text-primary mb-1">Protein</div>
                  <MiniShoppingItem name="Chicken thighs" checked={false} />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h3 className="font-display text-2xl text-text-primary mb-3">Organize Your Day</h3>
              <p className="text-text-secondary mb-4">
                See the whole picture at a glance. Tonight's dinner, who's home, and what needs attention.
              </p>
              <div className="bg-white rounded-2xl shadow-card p-4 inline-block">
                <div className="text-xs font-semibold text-primary-500 mb-2">Tonight</div>
                <div className="bg-primary-50 rounded-xl p-3 border border-primary-200 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍗</span>
                    <div>
                      <div className="font-medium text-text-primary">Chicken Stir Fry</div>
                      <div className="text-xs text-text-secondary">25 min · Serves 4</div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-text-muted">Who's eating: 4 people</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl text-text-primary mb-3">
            Try Allio for free today.
          </h2>
          <p className="text-text-secondary mb-6">
            Get your household running smoothly.
          </p>
          <Link to="/login" className="btn-primary text-lg py-3 px-8 inline-block">
            Get Started
          </Link>

          {/* Testimonial */}
          <div className="mt-10 bg-bg-primary rounded-2xl p-6 shadow-soft max-w-md mx-auto">
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-primary-400">★</span>
              ))}
            </div>
            <p className="text-text-secondary italic mb-4">
              "Allio has been a game changer for our family. Everything is in one place, and it's so easy to use."
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary-400 text-white flex items-center justify-center font-bold">
                SM
              </div>
              <span className="font-medium text-text-primary">Sarah M.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-text-muted border-t border-divider bg-bg-primary">
        © 2026 Allio · <a href="#" className="hover:underline">Privacy</a> · <a href="#" className="hover:underline">Terms</a> · <a href="#" className="hover:underline">Contact</a>
      </footer>
    </div>
  )
}