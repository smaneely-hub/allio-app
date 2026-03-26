import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-12 text-center">
      {/* Hero emoji */}
      <div className="mb-8 inline-flex items-center justify-center rounded-2xl bg-primary-50 p-5 shadow-sm">
        <span className="text-5xl">🥑</span>
      </div>

      {/* Hero headline - DM Serif Display */}
      <h1 className="mb-6 font-display text-5xl font-normal tracking-tight text-warm-900 md:text-6xl">
        Eat better with <span className="text-primary-400">less effort</span>.
      </h1>

      <p className="mb-10 max-w-2xl text-lg text-warm-700 md:text-xl">
        Allio turns household chaos into a simple weekly plan. From allergies to leftovers, 
        we handle the logic so you just handle the cooking.
      </p>
      
      {/* CTA buttons */}
      <div className="mb-16 flex flex-col gap-4 sm:flex-row">
        <Link to="/login" className="btn-primary text-lg">
          Get Started
        </Link>
        <a href="#features" className="btn-secondary text-lg">
          See How It Works
        </a>
      </div>

      {/* 3-step flow strip */}
      <div className="mb-16 flex items-center gap-4 text-warm-400">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-semibold">1</span>
        <span className="font-medium">Plan</span>
        <span className="h-px w-8 bg-warm-200"></span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-semibold">2</span>
        <span className="font-medium">Shop</span>
        <span className="h-px w-8 bg-warm-200"></span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-semibold">3</span>
        <span className="font-medium">Cook</span>
      </div>

      {/* Feature cards */}
      <div className="grid w-full max-w-4xl gap-6 text-left md:grid-cols-3" id="features">
        <FeatureCard 
          emoji="🥗" 
          title="Smart Planning" 
          desc="AI that actually understands leftovers, prep time, and who's home for dinner." 
        />
        <FeatureCard 
          emoji="🛒" 
          title="Instant Shopping" 
          desc="One click from meal plan to organized aisle-by-aisle shopping list." 
        />
        <FeatureCard 
          emoji="⚡️" 
          title="Zero Friction" 
          desc="No manual entry. Just set your preferences once and let Allio do the work." 
        />
      </div>

      {/* Testimonial cards */}
      <div className="mt-16 grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <TestimonialCard 
          quote="Finally, a meal planner that gets our family of 5."
          author="Sarah M."
        />
        <TestimonialCard 
          quote="I spend 5 minutes a week on dinner now. Game changer."
          author="David K."
        />
      </div>
    </div>
  )
}

function FeatureCard({ emoji, title, desc }) {
  return (
    <div className="card">
      <div className="mb-4 text-3xl">{emoji}</div>
      <h3 className="mb-2 font-display text-xl text-warm-900">{title}</h3>
      <p className="text-warm-700">{desc}</p>
    </div>
  )
}

function TestimonialCard({ quote, author }) {
  return (
    <div className="card">
      <p className="mb-4 text-lg text-warm-700">"{quote}"</p>
      <p className="text-sm font-medium text-warm-400">— {author}</p>
    </div>
  )
}