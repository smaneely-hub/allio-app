import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { upgradeToPremium } from '../lib/usageTracking'

const featureDescriptions = {
  email_delivery: {
    title: 'Email Your Plans',
    description: 'Get your meal plan and shopping list delivered to your inbox every week.'
  },
  unlimited_plans: {
    title: 'Unlimited Meal Plans',
    description: 'Generate as many meal plans as you need. No weekly limits.'
  },
  cooking_mode: {
    title: 'Cooking Mode',
    description: 'Step-by-step guided cooking with timers and progress tracking.'
  },
  health_customizations: {
    title: 'Health-Aware Planning',
    description: 'Customize meals based on dietary restrictions and health goals.'
  },
  ad_free: {
    title: 'Ad-Free Experience',
    description: 'Enjoy Allio without any advertisements.'
  },
  shopping_sharing: {
    title: 'Share Shopping Lists',
    description: 'Share your shopping list with family members or send to your phone.'
  },
  plan_history: {
    title: 'Meal Plan History',
    description: 'View and reuse your past meal plans.'
  }
}

const premiumBenefits = [
  'Unlimited meal plans',
  'Email your plan and shopping list',
  'Step-by-step cooking mode',
  'Dietary and health customizations',
  'Ad-free experience',
  'Shopping list sharing',
  'Meal plan history'
]

export function UpgradePrompt({ feature, onClose, isOpen }) {
  // Don't render if not open or no feature specified
  if (!isOpen || !feature) return null
  
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  
  const featureInfo = featureDescriptions[feature] || { title: 'Go Premium', description: 'Unlock all features with Allio Premium.' }
  
  const handleUpgrade = async () => {
    setLoading(true)
    try {
      // Beta: temporarily upgrade to premium
      if (user) {
        await upgradeToPremium(user.id)
      }
      toast.success('Payment coming soon! Enjoy premium features for free during our beta.')
      onClose?.()
    } catch (err) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn overflow-hidden">
        {/* Gradient accent at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400"></div>
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary text-xl"
        >
          ✕
        </button>
        
        {/* Premium badge */}
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-primary-400 to-teal-400 rounded-full text-white text-xs font-semibold mb-4">
          <span>⭐</span>
          <span>PREMIUM</span>
        </div>
        
        <h3 className="font-display text-2xl text-text-primary mb-2">
          Unlock {featureInfo.title}
        </h3>
        <p className="text-text-secondary mb-6">
          {featureInfo.description}
        </p>
        
        {/* Benefits list */}
        <div className="space-y-2 mb-6">
          {premiumBenefits.map((benefit, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-primary-400">✓</span>
              <span className="text-text-primary">{benefit}</span>
            </div>
          ))}
        </div>
        
        {/* Price */}
        <div className="text-center mb-4">
          <span className="font-display text-3xl text-text-primary">$6.99</span>
          <span className="text-text-muted">/month</span>
        </div>
        
        {/* CTA Button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Start free trial'}
        </button>
        
        <p className="text-xs text-text-muted text-center mt-3">
          Cancel anytime. 7-day free trial.
        </p>
      </div>
    </div>
  )
}