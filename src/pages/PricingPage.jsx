import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const freeFeatures = [
  { name: '1 meal plan per week', included: true },
  { name: 'Basic shopping list', included: true },
  { name: 'Household setup', included: true },
  { name: 'Email delivery', included: false },
  { name: 'Cooking mode', included: false },
  { name: 'Health customizations', included: false },
  { name: 'Ad-free experience', included: false },
  { name: 'Shopping list sharing', included: false },
  { name: 'Meal plan history', included: false },
]

const premiumFeatures = [
  { name: 'Unlimited meal plans', included: true },
  { name: 'Full shopping list with email', included: true },
  { name: 'Step-by-step cooking mode', included: true },
  { name: 'Dietary & health customizations', included: true },
  { name: 'Ad-free experience', included: true },
  { name: 'Shopping list sharing', included: true },
  { name: 'Meal plan history', included: true },
  { name: 'Priority recipe quality', included: true },
]

const faqs = [
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. Cancel from your profile page. You keep premium until the end of your billing period.'
  },
  {
    question: 'What happens to my data if I downgrade?',
    answer: 'All your meal plans and shopping lists are saved. You just can\'t generate new plans beyond the free limit.'
  },
  {
    question: 'Is there a family plan?',
    answer: 'Coming soon! Right now premium covers your entire household.'
  }
]

  useDocumentTitle("Pricing | Allio")
export function PricingPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-white border-b border-divider">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="font-display text-xl text-text-primary">
            Allio
          </Link>
          <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary">
            Log in
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl text-text-primary mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Choose the plan that works for your household. Upgrade anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-divider">
            <h2 className="font-display text-2xl text-text-primary mb-2">Free</h2>
            <div className="mb-6">
              <span className="font-display text-4xl text-text-primary">$0</span>
              <span className="text-text-muted">/month</span>
            </div>
            
            <ul className="space-y-3 mb-8">
              {freeFeatures.map((feature, i) => (
                <li key={i} className={`flex items-center gap-2 text-sm ${feature.included ? 'text-text-primary' : 'text-text-muted'}`}>
                  <span className={feature.included ? 'text-primary-400' : 'text-text-muted'}>
                    {feature.included ? '✓' : '✗'}
                  </span>
                  <span className={feature.included ? '' : 'opacity-50'}>
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>
            
            <Link 
              to="/login" 
              className="block w-full py-3 px-6 text-center border-2 border-primary-400 text-primary-400 font-semibold rounded-full hover:bg-primary-50 transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* Premium Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-primary-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary-400 to-teal-400 text-white text-center py-1 text-xs font-semibold">
              MOST POPULAR
            </div>
            
            <h2 className="font-display text-2xl text-text-primary mb-2 mt-2">Premium</h2>
            <div className="mb-6">
              <span className="font-display text-4xl text-text-primary">$6.99</span>
              <span className="text-text-muted">/month</span>
            </div>
            
            <ul className="space-y-3 mb-8">
              {premiumFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-text-primary">
                  <span className="text-primary-400">✓</span>
                  <span>{feature.name}</span>
                </li>
              ))}
            </ul>
            
            <Link 
              to="/login" 
              className="block w-full py-3 px-6 text-center bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
            >
              Start 7-day free trial
            </Link>
            
            <p className="text-xs text-text-muted text-center mt-3">
              Cancel anytime
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-2xl text-text-primary mb-6 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-text-primary mb-2">{faq.question}</h3>
                <p className="text-text-secondary text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-text-muted border-t border-divider bg-white mt-12">
        <div className="flex justify-center gap-4 mb-4">
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          <Link to="/terms" className="hover:underline">Terms</Link>
          <Link to="/pricing" className="hover:underline">Pricing</Link>
        </div>
        © 2026 Allio
      </footer>
    </div>
  )
}