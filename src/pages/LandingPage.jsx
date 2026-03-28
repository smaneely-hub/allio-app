import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center px-3 py-6 text-center pb-24 md:pb-8">
      {/* Hero emoji */}
      <div className="mb-4 md:mb-6 inline-flex items-center justify-center rounded-2xl bg-primary-50 p-3 md:p-5 shadow-sm">
        <span className="text-4xl md:text-5xl">🥑</span>
      </div>

      {/* Hero headline */}
      <h1 className="mb-3 md:mb-4 font-display text-3xl md:text-5xl lg:text-6xl font-normal tracking-tight text-warm-900 leading-tight">
        Eat better with <span className="text-primary-400">less effort</span>.
      </h1>

      <p className="mb-6 md:mb-8 max-w-xl text-sm md:text-lg text-warm-700 leading-relaxed">
        Allio turns household chaos into a simple weekly plan. From allergies to leftovers, 
        we handle the logic so you just handle the cooking.
      </p>
      
      {/* CTA buttons */}
      <div className="mb-12 flex flex-col gap-3 w-full max-w-xs mx-auto sm:flex-row sm:max-w-none sm:gap-4">
        <Link to="/login" className="btn-primary text-base py-3">
          Get Started
        </Link>
        <a href="#how-it-works" className="btn-secondary text-base py-3">
          See How It Works
        </a>
      </div>

      {/* How It Works - 3 numbered steps */}
      <div id="how-it-works" className="w-full max-w-4xl mb-16">
        <h2 className="font-display text-2xl md:text-3xl text-warm-900 mb-6 md:mb-8">How it works</h2>
        
        <div className="grid gap-4 md:grid-cols-3">
          <StepCard 
            number="1"
            title="Tell us about your crew"
            desc="Who's in your household, what they eat, what they won't touch. Takes 2 minutes."
          />
          <StepCard 
            number="2"
            title="Get a plan that fits your week"
            desc="Allio builds meals around who's actually home each night. Smaller crew Tuesday? Easier dinner. Everyone Thursday? Cook big with leftovers for Friday."
          />
          <StepCard 
            number="3"
            title="Shop with one list"
            desc="Everything combined, sorted by aisle, staples removed. Just check things off at the store."
          />
        </div>
      </div>

      {/* What makes Allio different */}
      <div className="w-full max-w-4xl mb-16 bg-warm-100 rounded-2xl p-6 md:p-8">
        <h2 className="font-display text-2xl md:text-3xl text-warm-900 mb-6">What makes Allio different</h2>
        
        <div className="grid gap-4 md:grid-cols-3 text-left">
          <FeatureCard 
            emoji="👨‍👩‍👧‍👦"
            title="It knows who's eating"
            desc="Adapts portions and complexity to who's actually home each night."
          />
          <FeatureCard 
            emoji="♻️"
            title="Leftovers on purpose"
            desc="Plans Thursday dinner to cover Friday lunch automatically."
          />
          <FeatureCard 
            emoji="🧠"
            title="One smart grocery list"
            desc="Combined quantities, no duplicates, staples removed."
          />
        </div>
      </div>

      {/* Sound familiar? - Pain points */}
      <div className="w-full max-w-4xl mb-16">
        <h2 className="font-display text-2xl md:text-3xl text-warm-900 mb-6">Sound familiar?</h2>
        
        <div className="grid gap-4 md:grid-cols-3">
          <PainPointCard 
            problem="It's 5:15pm. Nothing in the fridge goes together. Someone asks what's for dinner."
            solution="With Allio, dinner's already planned."
          />
          <PainPointCard 
            problem="You meal prep Sunday, but by Wednesday half of it's gone bad."
            solution="Allio plans around your actual schedule."
          />
          <PainPointCard 
            problem="Great recipe, but your kid won't eat anything on the plate."
            solution="Allio knows your kid's preferences."
          />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="w-full max-w-2xl mb-8">
        <h2 className="font-display text-3xl md:text-4xl text-warm-900 mb-4">
          Dinner shouldn't be this hard.
        </h2>
        <Link to="/login" className="btn-primary text-lg py-3 px-8 inline-block">
          Start planning — it's free
        </Link>
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-8 border-t border-warm-200 text-sm text-warm-400">
        © 2026 Allio · <a href="#" className="hover:text-warm-600">Privacy</a> · <a href="#" className="hover:text-warm-600">Terms</a>
      </footer>
    </div>
  )
}

function StepCard({ number, title, desc }) {
  return (
    <div className="card p-4 md:p-5 text-left">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary-400 text-white font-bold text-lg">{number}</span>
        <h3 className="font-display text-lg text-warm-900">{title}</h3>
      </div>
      <p className="text-sm text-warm-600">{desc}</p>
    </div>
  )
}

function FeatureCard({ emoji, title, desc }) {
  return (
    <div className="card p-4">
      <div className="mb-3 text-3xl">{emoji}</div>
      <h3 className="font-display text-lg text-warm-900 mb-2">{title}</h3>
      <p className="text-sm text-warm-600">{desc}</p>
    </div>
  )
}

function PainPointCard({ problem, solution }) {
  return (
    <div className="card p-4 border-l-4 border-primary-400">
      <p className="text-sm text-warm-600 mb-3 italic">"{problem}"</p>
      <p className="text-sm font-medium text-primary-600">{solution}</p>
    </div>
  )
}