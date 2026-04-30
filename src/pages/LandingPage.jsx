import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'

export function LandingPage() {
  const scrollToHowItWorks = () => {
    const section = document.getElementById('how-it-works')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary font-body text-text-primary">
      <header className="w-full border-b border-border bg-bg-primary/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Logo size="md" />
          <Link to="/login" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
            Log in
          </Link>
        </div>
      </header>

      <section className="bg-bg-primary px-4 py-20 text-center md:py-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl leading-tight text-text-primary md:text-6xl">
            Stop thinking about what to cook.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-text-secondary">
            Allio plans your week, builds your grocery list, and keeps your family eating well, without the daily mental load.
          </p>
          <p className="mt-4 text-base text-text-tertiary">
            Built for busy professionals who want to show up for their family without spending hours planning meals.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3">
            <Link to="/try" className="btn-primary text-lg">
              Try a meal right now
            </Link>
            <Link to="/login" className="btn-secondary text-lg">
              Plan my week in 30 seconds
            </Link>
            <button
              type="button"
              onClick={scrollToHowItWorks}
              className="mt-4 font-medium text-primary-400 transition-colors hover:text-primary-500"
            >
              See how it works ↓
            </button>
          </div>
        </div>
      </section>

      <section className="bg-bg-soft px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl text-text-primary md:text-4xl">
            You don&apos;t need more recipes. You need fewer decisions.
          </h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-text-secondary">
            <p>You already have enough on your plate. Work. Kids. Life.</p>
            <p>And every day, the same question: &apos;What are we eating tonight?&apos;</p>
            <p>Not because you can&apos;t cook. But because you don&apos;t have time to think about it.</p>
            <p className="font-semibold text-primary-400">Allio removes that decision entirely.</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-bg-primary px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center font-display text-3xl text-text-primary">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-5 md:gap-8">
            {[
              {
                step: '1',
                title: 'Tell us about your household',
                description: 'Who eats what, allergies, preferences, how adventurous everyone is.',
              },
              {
                step: '2',
                title: 'Get a full week plan instantly',
                description: 'Meals matched to your schedule. Quick nights stay quick. Big nights go big.',
              },
              {
                step: '3',
                title: 'Grocery list built automatically',
                description: 'Every ingredient combined, sorted, and ready. No duplicates, no guessing.',
              },
              {
                step: '4',
                title: 'Cook without thinking',
                description: 'Step-by-step instructions. Just follow along.',
              },
              {
                step: '5',
                title: 'It gets smarter every week',
                description: 'Lock meals you love. Swap ones you don\'t. Allio learns.',
              },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-border bg-bg-primary p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white" style={{ background: 'var(--gradient-primary)' }}>
                  {item.step}
                </div>
                <h3 className="mt-4 text-base font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg-soft px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center font-display text-3xl text-text-primary">
            This isn&apos;t a recipe app.
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              'Plans meals around your real schedule',
              'Reuses ingredients across meals intelligently',
              'Built for households, not individuals',
              'Reduces waste and last-minute decisions',
              'Eliminates daily planning entirely',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl bg-bg-primary p-6 shadow-sm">
                <div className="mt-0.5 text-lg text-primary-400">✓</div>
                <p className="text-text-secondary">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-bg-primary px-4 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-3xl text-text-primary md:text-4xl">
            Be present where it matters.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-text-secondary">
            Dinner shouldn&apos;t be another problem to solve. With Allio, you spend less time planning and more time actually sitting at the table.
          </p>
          <Link to="/login" className="btn-primary mt-10 inline-flex text-lg">
            Plan my week
          </Link>
        </div>
      </section>

      <section className="bg-bg-soft px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center font-display text-2xl text-text-primary">
            What families are saying
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                quote: 'I used to spend 30 minutes every Sunday just figuring out dinners. Now I spend 30 seconds.',
                name: 'Sarah M.',
                role: 'Mom of 3',
              },
              {
                quote: 'The grocery list alone is worth it. Everything combined, nothing missing.',
                name: 'James R.',
                role: 'Dad & CFO',
              },
              {
                quote: 'My husband and I finally stopped the nightly “what should we eat” argument.',
                name: 'Lisa T.',
                role: 'Working parent',
              },
            ].map((item) => (
              <div key={item.name} className="rounded-2xl bg-bg-primary p-6 shadow-sm">
                <div className="text-primary-400">★★★★★</div>
                <p className="mt-4 italic text-text-secondary">{item.quote}</p>
                <div className="mt-4 font-semibold text-text-primary">{item.name}</div>
                <div className="text-sm text-text-tertiary">{item.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 text-center text-white" style={{ background: 'var(--gradient-primary)' }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl md:text-4xl">
            Your week, handled.
          </h2>
          <p className="mt-4 text-lg text-white/85">
            Set up your household in 2 minutes. Get your first meal plan instantly.
          </p>
          <Link to="/login" className="mt-8 inline-block rounded-full bg-white px-8 py-4 text-lg font-semibold text-primary-500 shadow-lg transition-all hover:shadow-xl">
            Get started
          </Link>
          <p className="mt-4 text-sm text-white/75">Free to start. No credit card required.</p>
          <Link to="/try" className="mt-3 inline-block text-sm font-semibold text-white underline-offset-4 hover:underline">Or try one dinner without signing up</Link>
        </div>
      </section>

      <footer className="bg-text-primary px-4 py-12 text-center">
        <div className="flex justify-center">
          <LogoText size="sm" className="text-white" />
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-white/65">
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
          <span>|</span>
          <Link to="/terms" className="hover:text-white">Terms</Link>
          <span>|</span>
          <a href="mailto:hello@allio.life" className="hover:text-white">Contact</a>
        </div>
        <p className="mt-4 text-xs text-white/45">© 2026 Allio. All rights reserved.</p>
      </footer>
    </div>
  )
}
