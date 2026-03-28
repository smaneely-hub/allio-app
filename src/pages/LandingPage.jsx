import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-warm-50">
      {/* Top right login link */}
      <div className="absolute top-4 right-4">
        <Link to="/login" className="text-sm text-warm-400 hover:text-warm-700 hover:underline transition-colors">
          Log in
        </Link>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center px-4 pt-16 pb-12 text-center">
        <h1 className="font-display text-4xl md:text-5xl text-warm-900">
          Allio <span className="text-primary-400">.</span>
        </h1>
        <p className="mt-4 max-w-lg text-warm-600 text-lg">
          Allio plans your meals around who's actually home, what your kids will actually eat, and what's already in your fridge.
        </p>
        <Link to="/login" className="mt-8 btn-primary text-lg py-4 px-8 rounded-xl">
          Start planning — it's free
        </Link>
        <p className="mt-3 text-sm text-warm-400">No credit card required</p>
      </div>

      {/* How it works */}
      <div className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl text-center text-warm-900 mb-8">How Allio works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <StepCard number="1" title="Tell us about your crew" desc="Who's in your household, what they eat, what they won't touch. Takes 2 minutes." />
            <StepCard number="2" title="Get a plan that fits your week" desc="Allio builds meals around who's actually home each night. Smaller crew Tuesday? Easier dinner." />
            <StepCard number="3" title="Shop with one list" desc="Everything combined, sorted by aisle, staples removed. Just check things off at the store." />
          </div>
        </div>
      </div>

      {/* What makes Allio different */}
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl text-center text-warm-900 mb-8">
            Most meal planners don't know your family. Allio does.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard emoji="👨‍👩‍👧‍👦" title="It knows who's eating" desc="Adapts portions and complexity to who's actually home each night." />
            <FeatureCard emoji="♻️" title="Leftovers on purpose" desc="Plans Thursday dinner to cover Friday lunch automatically." />
            <FeatureCard emoji="🧠" title="One smart grocery list" desc="Combined quantities, no duplicates, staples removed." />
          </div>
        </div>
      </div>

      {/* Sound familiar */}
      <div className="py-12 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl text-center text-warm-900 mb-8">Sound familiar?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <PainCard problem="It's 5:15pm. Nothing in the fridge goes together." solution="With Allio, dinner's already planned." />
            <PainCard problem="You meal prep Sunday, but by Wednesday half of it's gone bad." solution="Allio plans around your actual schedule." />
            <PainCard problem="Great recipe, but your kid won't eat anything on the plate." solution="Allio knows your kid's preferences." />
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="py-16 px-4 text-center">
        <h2 className="font-display text-3xl text-warm-900 mb-3">Dinner shouldn't be this hard.</h2>
        <p className="text-warm-600 mb-6">Set up your household in 2 minutes. Get your first meal plan instantly.</p>
        <Link to="/login" className="btn-primary text-lg py-4 px-8 rounded-xl">
          Start planning — it's free
        </Link>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-warm-400 border-t border-warm-200">
        © 2026 Allio · <a href="#" className="hover:underline">Privacy</a> · <a href="#" className="hover:underline">Terms</a> · <a href="#" className="hover:underline">Contact</a>
      </footer>
    </div>
  )
}

function StepCard({ number, title, desc }) {
  return (
    <div className="bg-warm-50 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-400 text-white font-bold">{number}</span>
        <h3 className="font-display text-lg text-warm-900">{title}</h3>
      </div>
      <p className="text-sm text-warm-600">{desc}</p>
    </div>
  )
}

function FeatureCard({ emoji, title, desc }) {
  return (
    <div className="text-center">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="font-display text-lg text-warm-900 mb-2">{title}</h3>
      <p className="text-sm text-warm-600">{desc}</p>
    </div>
  )
}

function PainCard({ problem, solution }) {
  return (
    <div className="bg-warm-50 rounded-2xl p-6">
      <p className="text-sm text-warm-600 mb-3 italic">"{problem}"</p>
      <p className="text-sm font-medium text-primary-600">{solution}</p>
    </div>
  )
}