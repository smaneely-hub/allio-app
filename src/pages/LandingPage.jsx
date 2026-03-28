import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-6 text-center pb-24 overflow-hidden md:pb-8 md:overflow-visible">
      {/* Hero emoji */}
      <div className="mb-4 md:mb-6 inline-flex items-center justify-center rounded-2xl bg-primary-50 p-3 md:p-5 shadow-sm">
        <span className="text-4xl md:text-5xl">🥑</span>
      </div>

      {/* Hero headline - DM Serif Display */}
      <h1 className="mb-3 md:mb-4 font-display text-3xl md:text-5xl lg:text-6xl font-normal tracking-tight text-warm-900 leading-tight">
        Eat better with <span className="text-primary-400">less effort</span>.
      </h1>

      <p className="mb-6 md:mb-8 max-w-xl text-sm md:text-lg text-warm-700 leading-relaxed">
        Allio turns household chaos into a simple weekly plan. From allergies to leftovers, 
        we handle the logic so you just handle the cooking.
      </p>
      
      {/* CTA buttons - more spacing on mobile */}
      <div className="mb-16 md:mb-12 flex flex-col gap-3 w-full max-w-xs mx-auto sm:flex-row sm:max-w-none sm:gap-4">
        <Link to="/login" className="btn-primary text-base py-3">
          Get Started
        </Link>
        <a href="#features" className="btn-secondary text-lg">
          See How It Works
        </a>
      </div>

      {/* 3-step flow strip - wrap on mobile */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-2 text-warm-400 text-sm md:text-base">
        <span className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-semibold text-sm">1</span>
        <span className="font-medium">Plan</span>
        <span className="hidden md:inline h-px w-8 bg-warm-200"></span>
        <span className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-semibold text-sm">2</span>
        <span className="font-medium">Shop</span>
        <span className="hidden md:inline h-px w-8 bg-warm-200"></span>
        <span className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-semibold text-sm">3</span>
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