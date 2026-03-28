import { Link } from 'react-router-dom'

// Leaf decoration SVG component
function Leaf({ className = '', style = {} }) {
  return (
    <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 17c8-20 20-8 0-13z" fill="#22C55E" fillOpacity="0.4"/>
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 17c8-20 20-8 0-13z" stroke="#16A34A" strokeWidth="1.5"/>
    </svg>
  )
}

// Phone mockup component
function PhoneMockup() {
  return (
    <div className="relative">
      <div className="w-64 h-[500px] bg-white rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-800 rounded-b-2xl z-10"></div>
        {/* Screen content */}
        <div className="w-full h-full bg-warm-50 overflow-hidden pt-8 px-3">
          <div className="text-xs font-semibold text-primary-500 mb-2">Your Week</div>
          <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className={`flex-shrink-0 px-2 py-1 rounded-full text-xs ${day === 'Wed' ? 'bg-primary-400 text-white' : 'bg-white text-warm-500'}`}>
                {day}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🍗</span>
                <span className="font-medium text-sm text-warm-900">Chicken Stir Fry</span>
              </div>
              <div className="text-xs text-warm-400">25 min · 4 servings</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🌮</span>
                <span className="font-medium text-sm text-warm-900">Pork Tacos</span>
              </div>
              <div className="text-xs text-warm-400">30 min · 4 servings</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🍝</span>
                <span className="font-medium text-sm text-warm-900">Pasta Night</span>
              </div>
              <div className="text-xs text-warm-400">20 min · 4 servings</div>
            </div>
          </div>
        </div>
      </div>
      {/* Decorative elements behind phone */}
      <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary-200 rounded-full opacity-50 blur-xl"></div>
      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-accent-teal/20 rounded-full opacity-50 blur-xl"></div>
    </div>
  )
}

// Feature card with icon
function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md text-center hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-display text-lg text-warm-900 mb-2">{title}</h3>
      <p className="text-sm text-warm-600">{description}</p>
    </div>
  )
}

// Mini mockup cards for feature sections
function MiniMealCard({ emoji, name, time }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
      <span className="text-lg">{emoji}</span>
      <div>
        <div className="text-xs font-medium text-warm-900">{name}</div>
        <div className="text-[10px] text-warm-400">{time}</div>
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
      <span className={`text-xs ${checked ? 'line-through text-warm-400' : 'text-warm-700'}`}>{name}</span>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-warm-50 overflow-x-hidden">
      {/* Gradient Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-100 via-teal-50 to-green-100 overflow-hidden">
        {/* Decorative floating leaves */}
        <div className="absolute top-20 left-10 opacity-40 rotate-12"><Leaf /></div>
        <div className="absolute top-40 right-20 opacity-30 -rotate-6"><Leaf /></div>
        <div className="absolute bottom-40 left-1/4 opacity-40 rotate-45"><Leaf /></div>
        <div className="absolute top-60 right-1/3 opacity-30"><Leaf /></div>
        
        {/* Gradient orbs for frosted effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full opacity-30 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-200 rounded-full opacity-30 blur-3xl"></div>
        
        {/* Top right login link */}
        <div className="relative z-10 container mx-auto px-4 py-4 flex justify-end">
          <Link to="/login" className="text-sm text-warm-700 hover:text-warm-900 hover:underline font-medium">
            Log in
          </Link>
        </div>

        {/* Hero Content - Two columns */}
        <div className="relative z-10 container mx-auto px-4 py-8 md:py-16">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left column - Text content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Logo with leaves */}
              <div className="relative inline-block mb-4">
                <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-slate-800">
                  Allio
                </h1>
                <div className="absolute -top-2 -right-8 rotate-12">
                  <Leaf className="w-8 h-8" />
                </div>
                <div className="absolute -bottom-1 -left-6 -rotate-12">
                  <Leaf className="w-6 h-6" />
                </div>
              </div>
              
              <h2 className="font-display text-2xl md:text-3xl lg:text-4xl text-slate-800 mb-4">
                Everything your household needs. Finally in one place.
              </h2>
              <p className="text-warm-600 text-lg mb-8 max-w-xl mx-auto lg:mx-0">
                Plan meals, organize shopping, and coordinate your family's schedule — all in one beautiful app.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/login" className="btn-primary text-lg py-4 px-10 shadow-xl">
                  Get Started
                </Link>
              </div>
              
              {/* App store badges - placeholders */}
              <div className="flex gap-3 justify-center lg:justify-start mt-6">
                <div className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-medium">
                  App Store
                </div>
                <div className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-medium">
                  Google Play
                </div>
              </div>
            </div>

            {/* Right column - Phone mockup */}
            <div className="flex-1 flex justify-center">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>

      {/* Three Feature Cards Strip */}
      <div className="py-12 px-4 bg-warm-50">
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

      {/* Detailed Feature Sections */}
      <div className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-16">
          
          {/* Feature 1 - Plan Your Week */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h3 className="font-display text-2xl text-warm-900 mb-3">Plan Your Week</h3>
              <p className="text-warm-600 mb-4">
                Set your weekly schedule once, and Allio handles the rest. It adapts to who's actually home and creates meals that work for everyone.
              </p>
              <div className="bg-white rounded-2xl shadow-md p-4 inline-block">
                <div className="text-xs font-semibold text-primary-500 mb-2">Your Week</div>
                <div className="flex gap-1 mb-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
                    <div key={d} className={`px-2 py-1 rounded-full text-xs ${d === 'Wed' ? 'bg-primary-400 text-white' : 'bg-warm-100 text-warm-500'}`}>{d}</div>
                  ))}
                </div>
                <div className="space-y-2">
                  <MiniMealCard emoji="🍗" name="Chicken Stir Fry" time="25 min" />
                  <MiniMealCard emoji="🌮" name="Pork Tacos" time="30 min" />
                  <MiniMealCard emoji="🍝" name="Pasta Night" time="20 min" />
                </div>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="text-8xl opacity-20">📅</div>
            </div>
          </div>

          {/* Feature 2 - Simplify Shopping */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="flex-1">
              <h3 className="font-display text-2xl text-warm-900 mb-3">Simplify Shopping</h3>
              <p className="text-warm-600 mb-4">
                One list that combines everything from all your meals. No more duplicate items, no more forgotten ingredients.
              </p>
              <div className="bg-white rounded-2xl shadow-md p-4 inline-block min-w-[280px]">
                <div className="text-xs font-semibold text-primary-500 mb-2">Shopping List</div>
                <div className="mb-2">
                  <div className="text-xs font-medium text-warm-700 mb-1">Produce</div>
                  <MiniShoppingItem name="Broccoli crowns" checked={true} />
                  <MiniShoppingItem name="Lemon" checked={false} />
                </div>
                <div>
                  <div className="text-xs font-medium text-warm-700 mb-1">Protein</div>
                  <MiniShoppingItem name="Chicken thighs" checked={false} />
                </div>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="text-8xl opacity-20">🛒</div>
            </div>
          </div>

          {/* Feature 3 - Organize Your Day */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h3 className="font-display text-2xl text-warm-900 mb-3">Organize Your Day</h3>
              <p className="text-warm-600 mb-4">
                See the whole picture at a glance. Tonight's dinner, who's home, and what tasks need attention.
              </p>
              <div className="bg-white rounded-2xl shadow-md p-4 inline-block">
                <div className="text-xs font-semibold text-primary-500 mb-2">Tonight</div>
                <div className="bg-primary-50 rounded-xl p-3 border border-primary-200 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍗</span>
                    <div>
                      <div className="font-medium text-warm-900">Chicken Stir Fry</div>
                      <div className="text-xs text-warm-500">25 min · Serves 4</div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-warm-500">Who's eating: 4 people</div>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="text-8xl opacity-20">✅</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA with Testimonial */}
      <div className="relative bg-gradient-to-br from-green-50 via-teal-50 to-purple-50 py-16 px-4">
        <div className="absolute top-10 right-10 opacity-30"><Leaf /></div>
        <div className="absolute bottom-10 left-10 opacity-40 rotate-12"><Leaf /></div>
        
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl text-warm-900 mb-4">
            Try Allio for free today.
          </h2>
          <p className="text-warm-600 text-lg mb-8">
            Get your household running smoothly.
          </p>
          
          <Link to="/login" className="btn-primary text-lg py-4 px-10 shadow-xl inline-block mb-8">
            Get Started
          </Link>

          {/* Testimonial */}
          <div className="max-w-md mx-auto bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400">★</span>
              ))}
            </div>
            <p className="text-warm-600 italic mb-4">
              "Allio has been a game changer for our family. Everything is in one place, and it's so easy to use — highly recommend."
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary-400 text-white flex items-center justify-center font-bold">
                SM
              </div>
              <span className="font-medium text-warm-900">Sarah M.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-warm-400 border-t border-warm-200 bg-white">
        © 2026 Allio · <a href="#" className="hover:underline">Privacy</a> · <a href="#" className="hover:underline">Terms</a> · <a href="#" className="hover:underline">Contact</a>
      </footer>
    </div>
  )
}