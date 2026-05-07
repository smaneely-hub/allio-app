import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { SwapModal } from '../SwapModal'
import { useSubscription } from '../../hooks/useSubscription'
import { UpgradePrompt } from '../UpgradePrompt'
import { normalizeRecipe } from '../../lib/recipeSchema'
import { MealDetailModal } from './MealDetailModal'

function MoreVerticalIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function UtensilsIcon(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M3 2v7c0 1.1.9 2 2 2h3V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v8c0 1.1.9 2 2 2h3Z" /></svg>
}
function ShoppingBagIcon(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
}
function TruckIcon(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M10 17h4V5H2v12h3" /><path d="M14 8h4l4 4v5h-3" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>
}

const nonCookingMeta = {
  eat_out: { label: 'Eating out', icon: UtensilsIcon },
  takeout: { label: 'Takeout', icon: ShoppingBagIcon },
  delivery: { label: 'Delivery', icon: TruckIcon },
}

function normalizeSteps(meal, recipe) {
  const raw = meal?.instructions ?? meal?.directions ?? meal?.steps ?? meal?.method ?? []

  if (typeof raw === 'string') {
    return raw.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean)
  }

  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((step) => {
      if (typeof step === 'string') return step.trim()
      return String(step?.text ?? step?.instruction ?? step?.step ?? '').trim()
    }).filter(Boolean)
  }

  // Fall back to instructionGroups
  if (Array.isArray(recipe?.instructionGroups)) {
    return recipe.instructionGroups.flatMap((group) =>
      (group?.steps || []).map((step) => step?.text || '').filter(Boolean)
    )
  }

  return []
}

function formatIngredientLabel(ing) {
  if (typeof ing === 'string') return ing
  return [ing?.amount ?? ing?.quantity ?? '', ing?.unit ?? '', ing?.item ?? ing?.name ?? ''].filter(Boolean).join(' ').trim() || 'Ingredient'
}

export function MealCard({ meal, onSwap = async () => {}, onOpenMeal, onActionsClick }) {
  const { isPremium } = useSubscription()
  const [cookingMode, setCookingMode] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [swapping, setSwapping] = useState(false)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const mealSource = meal?.meal_source || 'generated'

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

  const allSteps = useMemo(() => normalizeSteps(meal, recipe), [meal, recipe])
  const totalSteps = allSteps.length

  const startCooking = () => {
    if (!isPremium) {
      setShowUpgradePrompt(true)
      return
    }
    setCurrentStep(0)
    setCookingMode(true)
  }

  const exitCooking = () => {
    setCookingMode(false)
  }

  if (meal.swap_pending) {
    return (
      <div className="card flex items-center gap-3 p-3">
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-surface-muted" />
        <div className="flex-1 space-y-2 animate-pulse">
          <div className="h-4 w-2/3 rounded bg-surface-muted" />
          <div className="h-3 w-1/3 rounded bg-surface-muted" />
        </div>
      </div>
    )
  }

  const mealTitle = meal.title || meal.name || 'Meal'
  const prepTime = meal.prep_time_minutes || recipe.prepTime || 0
  const cookTime = meal.cook_time_minutes || recipe.cookTime || 0

  // Cooking mode renders into a portal so it escapes any stacking context in the planner workspace
  const cookingOverlay = cookingMode ? createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between bg-text-primary px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={exitCooking}
          style={{ touchAction: 'manipulation' }}
          className="cursor-pointer rounded-md font-medium text-white transition-colors duration-150 hover:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-text-primary"
        >
          ← Exit
        </button>
        <div className="text-sm text-white">
          Step {currentStep + 1} of {totalSteps || 1}
        </div>
        <div className="w-16" />
      </div>

      {/* Timer pills */}
      {(prepTime > 0 || cookTime > 0) ? (
        <div className="flex justify-center gap-3 px-4 pb-2">
          {prepTime > 0 ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">Prep {prepTime} min</span> : null}
          {cookTime > 0 ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">Cook {cookTime} min</span> : null}
        </div>
      ) : null}

      {/* Progress bar */}
      <div className="h-1 bg-text-secondary">
        <div
          className="h-full bg-primary-400 transition-all duration-300"
          style={{ width: totalSteps > 0 ? `${((currentStep + 1) / totalSteps) * 100}%` : '0%' }}
        />
      </div>

      {/* Step content */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 text-6xl">👨‍🍳</div>
        <div className="text-2xl font-medium leading-relaxed text-white md:text-3xl">
          {allSteps[currentStep] || 'No instructions available'}
        </div>
      </div>

      {/* Ingredient chips */}
      <div className="bg-text-primary px-4 pb-2">
        <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">Ingredients</div>
        <div className="flex flex-wrap gap-2">
          {(meal.ingredients || []).slice(0, 6).map((ing, i) => (
            <span key={i} className="rounded-full bg-text-secondary px-3 py-1 text-sm text-white/80">
              {formatIngredientLabel(ing)}
            </span>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-4 bg-text-primary p-4">
        <button
          type="button"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          style={{ touchAction: 'manipulation' }}
          className={`flex-1 rounded-xl py-4 text-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-text-primary ${
            currentStep === 0
              ? 'cursor-not-allowed bg-text-secondary text-text-muted opacity-50'
              : 'cursor-pointer bg-text-secondary text-white hover:bg-white/15'
          }`}
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={() => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))}
          disabled={currentStep >= totalSteps - 1}
          style={{ touchAction: 'manipulation' }}
          className={`flex-1 rounded-xl py-4 text-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-text-primary ${
            currentStep >= totalSteps - 1
              ? 'cursor-not-allowed bg-text-secondary text-text-muted opacity-50'
              : 'cursor-pointer bg-primary-400 text-white hover:bg-primary-500'
          }`}
        >
          {currentStep >= totalSteps - 1 ? 'All done! ✓' : 'Next step →'}
        </button>
      </div>
    </div>,
    document.body
  ) : null

  if (['eat_out', 'takeout', 'delivery'].includes(mealSource)) {
    const meta = nonCookingMeta[mealSource]
    const Icon = meta.icon
    const title = meal.place_name || meta.label
    const subtitle = meal.source_note ? `${meta.label} · ${meal.source_note}` : meta.label
    return (
      <>
        {cookingOverlay}
        <div className="card flex items-center gap-3 p-3">
          <button type="button" onClick={() => { setShowDetail(true); onOpenMeal?.(meal) }} className="group flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-surface-muted text-ink-secondary transition duration-150 hover:bg-stone-100 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2">
            <Icon className="h-6 w-6 transition-colors duration-150 group-hover:text-ink-primary" />
          </button>
          <button type="button" onClick={() => { setShowDetail(true); onOpenMeal?.(meal) }} className="group min-w-0 flex-1 cursor-pointer rounded-xl p-1 text-left transition duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2">
            <div className="truncate text-sm font-medium text-ink-primary transition-colors duration-150 group-hover:text-stone-900">{title}</div>
            <div className="mt-1 truncate text-sm text-ink-secondary transition-colors duration-150 group-hover:text-ink-primary">{subtitle}</div>
          </button>
          <button type="button" onClick={(event) => { event.stopPropagation(); onActionsClick?.(meal) }} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full p-2 text-ink-tertiary transition-colors duration-150 hover:bg-stone-100 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Meal actions">
            <MoreVerticalIcon className="h-5 w-5" />
          </button>
        </div>
        <MealDetailModal meal={meal} isOpen={showDetail} onClose={() => setShowDetail(false)} onStartCooking={() => { setShowDetail(false); startCooking() }} />
      </>
    )
  }

  const servings = meal.servings || recipe.servings || 1
  const mealImage = meal.image_url || recipe.imageUrl || null
  const calories = meal.calories || meal.nutrition?.calories || '—'

  return (
    <>
      {cookingOverlay}
      <div className="card flex items-center gap-3 p-3">
        <button type="button" onClick={() => { setShowDetail(true); onOpenMeal?.(meal) }} className="h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-surface-muted transition duration-150 hover:bg-stone-100 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label={`Open ${mealTitle}`}>
          {mealImage ? <img src={mealImage} alt={mealTitle} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-surface-muted" />}
        </button>
        <button type="button" onClick={() => { setShowDetail(true); onOpenMeal?.(meal) }} className="group min-w-0 flex-1 cursor-pointer rounded-xl p-1 text-left transition duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2">
          <div className="truncate text-sm font-medium text-ink-primary transition-colors duration-150 group-hover:text-stone-900">{mealTitle}</div>
          <div className="mt-1 text-sm text-ink-secondary transition-colors duration-150 group-hover:text-ink-primary">{servings} servings · {calories} kcal</div>
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onActionsClick?.(meal) }} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full p-2 text-ink-tertiary transition-colors duration-150 hover:bg-stone-100 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Meal actions">
          <MoreVerticalIcon className="h-5 w-5" />
        </button>
      </div>
      <MealDetailModal meal={meal} isOpen={showDetail} onClose={() => setShowDetail(false)} onStartCooking={() => { setShowDetail(false); startCooking() }} />
      <SwapModal isOpen={showSwapModal} onClose={() => !swapping && setShowSwapModal(false)} onSwap={async (suggestion) => { try { setSwapping(true); await onSwap(meal, suggestion || ''); setShowSwapModal(false) } finally { setSwapping(false) } }} mealName={meal.name} loading={swapping} />
      <UpgradePrompt feature="cooking_mode" onClose={() => setShowUpgradePrompt(false)} />
    </>
  )
}
