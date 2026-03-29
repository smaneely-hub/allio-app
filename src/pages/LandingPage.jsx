import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

// Step component for How It Works
function Step({ number, title, description, icon }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-lg">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-text-primary mb-1">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  )
}

// Testimonial card
function Testimonial({ quote, author, role }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <p className="text-text-secondary mb-4 italic">"{quote}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-teal-400 flex items-center justify-center text-white font-bold">
          {author.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-text-primary text-sm">{author}</p>
          <p className="text-xs text-text-muted">{role}</p>
        </div>
      </div>
    </div>
  )
}

// Feature card
function FeatureCard({ title, description, icon }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  )
}

  useDocumentTitle("Allio — Dinner, figured out.")
export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="md" />
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/pricing" className="text-sm text-text-secondary hover:text-text-primary font-medium">
                Pricing
              </Link>
              <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary">
                Log in
              </Link>
              <Link to="/login" className="btn-primary text-sm py-2 px-4">
                Get started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-text-primary mb-6 leading-tight">
            Stop thinking about what to cook.
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary mb-4 max-w-2xl mx-auto">
            Allio plans your week, builds your grocery list, and keeps your family eating well — without the daily mental load.
          </p>
          <p className="text-text-muted mb-8 max-w-xl mx-auto">
            Built for busy professionals who want to show up for their family without spending hours planning meals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="btn-primary text-lg py-3 px-8">
              Plan my week in 30 seconds
            </Link>
            <a href="#how-it-works" className="btn-ghost text-lg py-3 px-8">
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* PAIN SECTION - alternating bg */}
      <section className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-text-primary mb-6">
            You don't need more recipes. You need fewer decisions.
          </h2>
          <div className="text-lg text-text-secondary space-y-4">
            <p>You already have enough on your plate.</p>
            <p className="font-medium">Work. Kids. Life.</p>
            <p>And every day, the same question:</p>
            <p className="text-xl text-text-primary font-semibold italic">"What are we eating tonight?"</p>
            <p>Not because you can't cook.</p>
            <p>But because you don't have time to think about it.</p>
            <p className="font-semibold text-primary-600">Allio removes that decision entirely.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-text-primary text-center mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <Step 
                number="1" 
                title="Tell us about your household" 
                description="Who eats, when, and any preferences. We remember so you don't have to repeat yourself."
                icon="👨‍👩‍👧‍👦"
              />
              <Step 
                number="2" 
                title="Get a full week plan instantly" 
                description="AI-generated meals that fit your schedule, your tastes, and what's already in your pantry."
                icon="📋"
              />
              <Step 
                number="3" 
                title="Grocery list built automatically" 
                description="Everything you need, organized by store section. One click to your phone."
                icon="🛒"
              />
            </div>
            <div className="space-y-8">
              <Step 
                number="4" 
                title="Cook without thinking" 
                description="Step-by-step guidance when you need it. Recipes that actually match what you're making."
                icon="🍳"
              />
              <Step 
                number="5" 
                title="It gets smarter every week" 
                description="Learns what works, adapts to feedback, and keeps improving your plan."
                icon="🧠"
              />
            </div>
          </div>
        </div>
      </section>

      {/* DIFFERENTIATION SECTION - alternating bg */}
      <section className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-text-primary text-center mb-4">
            This isn't a recipe app.
          </h2>
          <p className="text-center text-text-secondary mb-12">
            It's a system that removes the mental overhead of feeding your family.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureCard 
              icon="📅"
              title="Plans around your schedule"
              description="Know who's home on which nights. No more planning meals for no one."
            />
            <FeatureCard 
              icon="🔄"
              title="Reuses ingredients intelligently"
              description="Ingredients bought for Monday's dinner become Wednesday's lunch. Less waste, less shopping."
            />
            <FeatureCard 
              icon="🏠"
              title="Built for households, not singletons"
              description="Manages multiple preferences, portions, and schedules. One plan, everyone covered."
            />
            <FeatureCard 
              icon="✨"
              title="Eliminates daily decisions"
              description="Set it once, cook all week. No more 'what's for dinner' stress."
            />
          </div>
        </div>
      </section>

      {/* EMOTIONAL SECTION */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-text-primary mb-6">
            Be present where it matters.
          </h2>
          <p className="text-xl text-text-secondary leading-relaxed">
            Dinner shouldn't be another problem to solve.
          </p>
          <p className="text-xl text-text-secondary leading-relaxed mt-4">
            With Allio, you spend less time planning<br />
            and more time actually sitting at the table.
          </p>
        </div>
      </section>

      {/* SOCIAL PROOF SECTION - alternating bg */}
      <section className="py-16 md:py-24 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-text-primary text-center mb-12">
            What parents are saying
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Testimonial 
              quote="We went from 'what's for dinner' every single night to having an answer before I finish my commute home."
              author="Sarah M."
              role="Mom of two, marketing director"
            />
            <Testimonial 
              quote="I didn't realize how much mental energy I was spending on meal planning until Allio took it off my plate."
              author="David K."
              role="Dad of three, software engineer"
            />
            <Testimonial 
              quote="Finally, a solution that actually understands families. Not just recipes—it's a whole system."
              author="Jennifer L."
              role="Mom of four, physician"
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-text-primary mb-6">
            Your week, handled.
          </h2>
          <p className="text-text-secondary mb-8">
            Join thousands of families who've eliminated the dinner decision fatigue.
          </p>
          <Link to="/login" className="btn-primary text-lg py-4 px-10 inline-block">
            Get started
          </Link>
          <p className="text-sm text-text-muted mt-4">
            Free to try. No credit card required.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Logo size="sm" />
            <nav className="flex items-center gap-6 text-sm text-text-muted">
              <Link to="/pricing" className="hover:text-text-primary">Pricing</Link>
              <Link to="/privacy" className="hover:text-text-primary">Privacy</Link>
              <Link to="/terms" className="hover:text-text-primary">Terms</Link>
              <a href="mailto:hello@allio.life" className="hover:text-text-primary">Contact</a>
            </nav>
            <p className="text-sm text-text-muted">
              © 2026 Allio
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}