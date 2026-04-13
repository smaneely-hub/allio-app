import { useMemo, useState } from 'react'
import { SwapModal } from '../SwapModal'
import { useSubscription } from '../../hooks/useSubscription'
import { UpgradePrompt } from '../UpgradePrompt'
import { normalizeRecipe } from '../../lib/recipeSchema'
import { MealDetailModal } from './MealDetailModal'

// Vibrant gradient backgrounds by meal type
const mealTypeStyles = {
  breakfast: { emoji: '🌅', gradient: 'bg-gradient-to-br from-amber-100 to-orange-100', icon: '☀️' },
  lunch: { emoji: '☀️', gradient: 'bg-gradient-to-br from-green-100 to-emerald-100', icon: '🥗' },
  dinner: { emoji: '🍽️', gradient: 'bg-gradient-to-br from-blue-100 to-indigo-100', icon: '🍝' },
  snack: { emoji: '🍎', gradient: 'bg-gradient-to-br from-rose-100 to-pink-100', icon: '🍎' },
}


export function MealCard({ meal, onSwap = async () => {}, onSaveNote = async () => {}, onOpenMeal }) {
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
  const [showDetail, setShowDetail] = useState(false)

  const mealType = (meal.meal || '').toLowerCase()
  const style = mealTypeStyles[mealType] || mealTypeStyles.dinner
  const recipe = useMemo(() => normalizeRecipe({
    ...meal,
    title: meal.title || meal.name,
    prepTime: meal.prep_time_minutes,
    cookTime: meal.cook_time_minutes,
    totalTime: meal.total_time_minutes,
    ingredientGroups: meal.ingredientGroups,
    instructionGroups: meal.instructionGroups,
    substitutions: meal.substitutions,
    nutrition: meal.nutrition,
    tags: meal.recipeTags,
    sourceNote: meal.sourceNote,
    imagePrompt: meal.imagePrompt,
  }), [meal])
  const totalSteps = meal.instructions?.length || recipe.instructionGroups.flatMap((group) => group.steps).length || 0
  const prepTime = recipe.prepTime || Math.max(10, Math.round((recipe.cookTime || meal.cook_time_minutes || 30) * 0.35))
  const cookTime = recipe.cookTime || meal.cook_time_minutes || 30

  const planningRationale = useMemo(() => {
    return String(meal.why_this_works || meal.why_this_meal || meal.notes || '').trim()
  }, [meal.why_this_works, meal.why_this_meal, meal.notes])

  const shortReason = useMemo(() => {
    return String(meal.reason || meal.why_this_meal || '').trim()
  }, [meal.reason, meal.why_this_meal])

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
                {ing}
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

  if (meal.swap_pending) {
    return (
      <div className="rounded-2xl border border-divider bg-white p-4 shadow-sm">
        <div className="h-36 -mx-4 -mt-4 mb-4 animate-pulse rounded-t-2xl bg-gradient-to-br from-slate-100 to-slate-200" />
        <div className="space-y-3 animate-pulse">
          <div className="h-5 w-2/3 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="h-4 w-1/3 rounded bg-slate-200" />
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
      
      <button type="button" onClick={() => { setShowDetail(true); onOpenMeal?.(meal) }} className="w-full text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-display text-lg text-text-primary">{meal.name}</div>
            <div className="mt-1 line-clamp-1 text-sm text-text-secondary">{recipe.description || shortReason}</div>
            {dietaryTags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {dietaryTags.map((tag, i) => (
                  <span key={i} className={`rounded-full px-2 py-0.5 text-xs font-medium ${tag.color}`}>{tag.label}</span>
                ))}
              </div>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary"><span>{prepTime} min prep</span><span>•</span><span>{cookTime} min cook</span><span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">{recipe.difficulty}</span></div>
          </div>
          <div className="text-xs font-medium text-text-muted">Open recipe</div>
        </div>
      </button>

      <MealDetailModal meal={meal} isOpen={showDetail} onClose={() => setShowDetail(false)} />

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

      <button type="button" onClick={() => setExpanded(!expanded)} className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-muted min-h-[44px]">
        {expanded ? 'Hide quick view' : 'Show quick view'}
      </button>

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
            <div className="space-y-4">
              {recipe.ingredientGroups.map((group, groupIndex) => (
                <div key={`${group.label || 'group'}-${groupIndex}`}>
                  {group.label ? <div className="mb-2 text-xs font-semibold text-text-muted">{group.label}</div> : null}
                  <ul className="space-y-1 text-sm text-text-primary">
                    {group.ingredients.map((ing, i) => (
                      <li key={`${ing.item}-${i}`} className="flex justify-between gap-4">
                        <span>{ing.item}{ing.note ? ` (${ing.note})` : ''}</span>
                        <span className="shrink-0 text-text-muted">{[ing.amount, ing.unit].filter(Boolean).join(' ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-divider bg-white p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Instructions</div>
            <div className="space-y-4 text-sm text-text-primary">
              {recipe.instructionGroups.map((group, groupIndex) => (
                <div key={`${group.label || 'steps'}-${groupIndex}`}>
                  {group.label ? <div className="mb-2 text-xs font-semibold text-text-muted">{group.label}</div> : null}
                  <ol className="space-y-3">
                    {group.steps.map((step, i) => (
                      <li key={`${step.text}-${i}`} className="flex gap-3">
                        <span className="mt-0.5 text-primary-500 font-semibold">{i + 1}.</span>
                        <div>
                          <span>{step.text}</span>
                          {step.tip ? <div className="mt-1 text-xs text-text-muted">Tip: {step.tip}</div> : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
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