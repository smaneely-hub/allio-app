import { useMemo, useState } from 'react'
import { SwapModal } from '../SwapModal'
import { useSubscription } from '../../hooks/useSubscription'
import { UpgradePrompt } from '../UpgradePrompt'

// Vibrant gradient backgrounds by meal type
const mealTypeStyles = {
  breakfast: { emoji: '🌅', gradient: 'bg-gradient-to-br from-amber-100 to-orange-100', icon: '☀️' },
  lunch: { emoji: '☀️', gradient: 'bg-gradient-to-br from-green-100 to-emerald-100', icon: '🥗' },
  dinner: { emoji: '🍽️', gradient: 'bg-gradient-to-br from-blue-100 to-indigo-100', icon: '🍝' },
  snack: { emoji: '🍎', gradient: 'bg-gradient-to-br from-rose-100 to-pink-100', icon: '🍎' },
}


export function MealCard({ meal, onSwap, onSaveNote }) {
  const { isPremium } = useSubscription()
  const [expanded, setExpanded] = useState(false)
  const [cookingMode, setCookingMode] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [note, setNote] = useState(meal.user_note || '')
  const [savingNote, setSavingNote] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [selectedVariation, setSelectedVariation] = useState(null)

  const mealType = (meal.meal || '').toLowerCase()
  const style = mealTypeStyles[mealType] || mealTypeStyles.dinner
  const totalSteps = meal.instructions?.length || 0
  const prepTime = meal.prep_time_minutes || Math.max(10, Math.round((meal.cook_time_minutes || 30) * 0.35))
  const cookTime = meal.cook_time_minutes || 30

  const planningRationale = useMemo(() => {
    return String(meal.why_this_works || meal.notes || '').trim()
  }, [meal.why_this_works, meal.notes])

  const variations = useMemo(() => {
    return Array.isArray(meal.variations) ? meal.variations.filter(Boolean).slice(0, 5) : []
  }, [meal.variations])

  const similarOptions = useMemo(() => {
    return Array.isArray(meal.similar_options) ? meal.similar_options.filter(Boolean).slice(0, 3) : []
  }, [meal.similar_options])

  const socialSignal = useMemo(() => {
    return String(meal.confidence_signal || '').trim()
  }, [meal.confidence_signal])

  const handleSaveNote = async () => {
    setSavingNote(true)
    try {
      await onSaveNote(meal.id, note)
    } finally {
      setSavingNote(false)
    }
  }

  const startCooking = () => {
    if (!isPremium) {
      setShowUpgradePrompt(true)
      return
    }
    setCurrentStep(0)
    setCookingMode(true)
  }

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const exitCooking = () => {
    setCookingMode(false)
  }

  const dietaryTags = []
  if (meal.vegetarian) dietaryTags.push({ label: 'Vegetarian', color: 'bg-green-100 text-green-700' })
  if (meal.gluten_free) dietaryTags.push({ label: 'GF', color: 'bg-amber-100 text-amber-700' })
  if (meal.dairy_free) dietaryTags.push({ label: 'DF', color: 'bg-blue-100 text-blue-700' })

  // Cooking Mode Overlay
  if (cookingMode) {
    return (
      <div className="fixed inset-0 z-50 bg-text-primary flex flex-col">
        <div className="flex items-center justify-between p-4 bg-text-primary">
          <button onClick={exitCooking} className="text-white font-medium">
            ← Exit
          </button>
          <div className="text-white text-sm">
            Step {currentStep + 1} of {totalSteps}
          </div>
          <div className="w-16"></div>
        </div>
        <div className="h-1 bg-text-secondary">
          <div className="h-full bg-primary-400 transition-all" style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-6xl mb-6">👨‍🍳</div>
          <div className="text-2xl md:text-3xl text-white font-medium leading-relaxed">
            {meal.instructions?.[currentStep]}
          </div>
        </div>
        <div className="p-4 bg-text-primary">
          <div className="text-xs text-text-muted mb-2 uppercase tracking-wide">Ingredients</div>
          <div className="flex flex-wrap gap-2">
            {(meal.ingredients || []).slice(0, 6).map((ing, i) => (
              <span key={i} className="px-3 py-1 bg-text-secondary text-white/80 text-sm rounded-full">
                {ing.quantity} {ing.unit} {ing.item}
              </span>
            ))}
          </div>
        </div>
        <div className="p-4 bg-text-primary flex gap-4">
          <button onClick={prevStep} disabled={currentStep === 0} className={`flex-1 py-4 rounded-xl text-lg font-medium ${currentStep === 0 ? 'bg-text-secondary text-text-muted' : 'bg-text-secondary text-white'}`}>
            ← Previous
          </button>
          <button onClick={nextStep} disabled={currentStep === totalSteps - 1} className={`flex-1 py-4 rounded-xl text-lg font-medium ${currentStep === totalSteps - 1 ? 'bg-text-secondary text-text-muted' : 'bg-primary-400 text-white'}`}>
            {currentStep === totalSteps - 1 ? 'All done!' : 'Next step →'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:shadow-md ${meal.locked ? 'border-green-300 bg-green-50' : meal.is_leftover ? 'border-dashed border-divider bg-bg-primary' : 'border-divider bg-white'}`}>
      {/* Meal image / visual */}
      <div className={`h-36 -mx-4 -mt-4 mb-4 flex flex-col items-center justify-center rounded-t-2xl ${style.gradient}`}>
        <span className="text-6xl">{style.icon}</span>
        <div className="mt-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-gray-700 shadow-sm">
          {socialSignal}
        </div>
      </div>
      
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-display text-lg text-text-primary">{meal.name}</div>
            {dietaryTags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {dietaryTags.map((tag, i) => (
                  <span key={i} className={`rounded-full px-2 py-0.5 text-xs font-medium ${tag.color}`}>{tag.label}</span>
                ))}
              </div>
            )}
            <div className="mt-1.5 text-sm text-text-secondary">{meal.servings} servings · {prepTime} min prep • {cookTime} min cook</div>
          </div>
          <div className="text-xs font-medium text-text-muted">{expanded ? 'Collapse' : 'Expand'}</div>
        </div>
      </button>

      {/* Action buttons - icon-only on mobile */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowSwapModal(true)} className="text-xs font-medium px-3 py-1.5 rounded-full bg-warm-100 text-text-secondary hover:bg-warm-200 transition-all duration-150 active:scale-[0.97] min-h-[44px]">
          🔄
        </button>
        <button type="button" onClick={() => navigator.clipboard.writeText(meal.name)} className="text-xs font-medium px-3 py-1.5 rounded-full bg-warm-100 text-text-secondary hover:bg-warm-200 transition-all duration-150 active:scale-[0.97] min-h-[44px]">
          📋
        </button>
      </div>

      {/* Swap Modal */}
      <SwapModal
        isOpen={showSwapModal}
        onClose={() => !swapping && setShowSwapModal(false)}
        onSwap={async (suggestion) => {
          try {
            setSwapping(true)
            await onSwap(meal, suggestion || '')
            setShowSwapModal(false)
          } finally {
            setSwapping(false)
          }
        }}
        mealName={meal.name}
        loading={swapping}
      />

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 space-y-5 border-t border-divider pt-4">
          <div className="rounded-xl border border-green-100 bg-green-50 p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700">Why this works in the plan</div>
            <div className="text-sm text-gray-700">{planningRationale}</div>
          </div>

          {variations.length > 0 && (
            <div className="rounded-xl border border-divider bg-white p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Make it your way</div>
              <div className="space-y-2">
                {variations.map((variation, i) => (
                  <button
                    key={variation}
                    type="button"
                    onClick={() => setSelectedVariation(i)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors ${selectedVariation === i ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-divider bg-white text-text-primary hover:bg-warm-50'}`}
                  >
                    <span className="text-primary-500">✦</span>
                    <span>{variation}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-divider bg-white p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Ingredients</div>
            <ul className="space-y-1 text-sm text-text-primary">
              {(meal.ingredients || []).map((ing, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>{ing.item}</span>
                  <span className="shrink-0 text-text-muted">{ing.quantity} {ing.unit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-divider bg-white p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Instructions</div>
            <ol className="space-y-3 text-sm text-text-primary">
              {(meal.instructions || []).map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 text-primary-500 font-semibold">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {similarOptions.length > 0 && (
            <div className="rounded-xl border border-divider bg-white p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Similar options</div>
              <div className="space-y-2">
                {similarOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSwap(meal, option)}
                    className="flex w-full items-center justify-between rounded-xl border border-divider px-3 py-3 text-left text-sm text-text-primary hover:bg-warm-50"
                  >
                    <span>{option}</span>
                    <span className="text-primary-500">Replace</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="button" onClick={startCooking} className="btn-primary w-full py-3 text-base font-medium">
            🍳 Start Cooking
          </button>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Your note</div>
            <textarea
              className="input w-full text-sm"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a personal note..."
            />
            <button type="button" onClick={handleSaveNote} disabled={savingNote} className="btn-secondary mt-2 text-xs">
              {savingNote ? 'Saving...' : 'Save note'}
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Prompt for Cooking Mode */}
      <UpgradePrompt 
        feature="cooking_mode" 
        onClose={() => setShowUpgradePrompt(false)} 
      />
    </div>
  )
}