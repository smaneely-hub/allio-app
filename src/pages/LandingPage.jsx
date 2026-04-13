import { Link } from 'react-router-dom'

export function LandingPage() {
  const scrollToHowItWorks = () => {
    const section = document.getElementById('how-it-works')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-white font-body">
      {/* Top bar */}
      <header className="w-full border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="font-display text-2xl text-gray-900">
            Allio
          </Link>
          <Link to="/login" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
            Log in
          </Link>
        </div>
      </header>

      {/* SECTION 1: HERO */}
      <section className="bg-white px-4 py-20 text-center md:py-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-bold leading-tight text-gray-900 md:text-6xl">
            Stop thinking about what to cook.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-500">
            Allio plans your week, builds your grocery list, and keeps your family eating well — without the daily mental load.
          </p>
          <p className="mt-4 text-base text-gray-400">
            Built for busy professionals who want to show up for their family without spending hours planning meals.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3">
            <Link
              to="/try"
              className="rounded-full bg-green-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-green-700 hover:shadow-xl"
            >
              Try a meal right now
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-green-200 bg-white px-8 py-4 text-lg font-semibold text-green-700 transition-all hover:bg-green-50"
            >
              Plan my week in 30 seconds
            </Link>
            <button
              type="button"
              onClick={scrollToHowItWorks}
              className="mt-4 font-medium text-green-600 transition-colors hover:text-green-700"
            >
              See how it works ↓
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: PAIN POINT */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl text-gray-900 md:text-4xl">
            You don&apos;t need more recipes. You need fewer decisions.
          </h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-gray-600">
            <p>You already have enough on your plate. Work. Kids. Life.</p>
            <p>And every day, the same question: &apos;What are we eating tonight?&apos;</p>
            <p>Not because you can&apos;t cook. But because you don&apos;t have time to think about it.</p>
            <p className="font-semibold text-green-600">Allio removes that decision entirely.</p>
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS */}
      <section id="how-it-works" className="bg-white px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center font-display text-3xl text-gray-900">
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
              <div key={item.step} className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: DIFFERENTIATION */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center font-display text-3xl text-gray-900">
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
              <div key={item} className="flex items-start gap-3 rounded-2xl bg-white p-6 shadow-sm">
                <div className="mt-0.5 text-lg text-green-600">✓</div>
                <p className="text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: EMOTIONAL */}
      <section className="bg-white px-4 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-3xl text-gray-900 md:text-4xl">
            Be present where it matters.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-gray-500">
            Dinner shouldn&apos;t be another problem to solve. With Allio, you spend less time planning and more time actually sitting at the table.
          </p>
          <Link
            to="/login"
            className="mt-10 inline-block rounded-full bg-green-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-green-700 hover:shadow-xl"
          >
            Plan my week
          </Link>
        </div>
      </section>

      {/* SECTION 6: SOCIAL PROOF */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center font-display text-2xl text-gray-900">
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
              <div key={item.name} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="text-amber-400">★★★★★</div>
                <p className="mt-4 italic text-gray-600">{item.quote}</p>
                <div className="mt-4 font-semibold text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-400">{item.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: FINAL CTA */}
      <section className="bg-green-600 px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl text-white md:text-4xl">
            Your week, handled.
          </h2>
          <p className="mt-4 text-lg text-green-100">
            Set up your household in 2 minutes. Get your first meal plan instantly.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-block rounded-full bg-white px-8 py-4 text-lg font-semibold text-green-700 shadow-lg transition-all hover:shadow-xl"
          >
            Get started
          </Link>
          <p className="mt-4 text-sm text-green-200">Free to start. No credit card required.</p>
          <Link to="/try" className="mt-3 inline-block text-sm font-semibold text-white underline-offset-4 hover:underline">Or try one dinner without signing up</Link>
        </div>
      </section>

      {/* SECTION 8: FOOTER */}
      <footer className="bg-gray-900 px-4 py-12 text-center">
        <div className="font-display text-xl text-white">Allio</div>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-400">
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
          <span>|</span>
          <Link to="/terms" className="hover:text-white">Terms</Link>
          <span>|</span>
          <a href="mailto:hello@allio.life" className="hover:text-white">Contact</a>
        </div>
        <p className="mt-4 text-xs text-gray-500">© 2026 Allio. All rights reserved.</p>
      </footer>
    </div>
  )
}
