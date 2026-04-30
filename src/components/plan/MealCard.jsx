import { useMemo, useState } from 'react'
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

  const totalSteps = meal.instructions?.length || recipe.instructionGroups.flatMap((group) => group.steps).length || 0

  const startCooking = () => {
    if (!isPremium) {
      setShowUpgradePrompt(true)
      return
    }
    setCurrentStep(0)
    setCookingMode(true)
  }

  const nextStep = () => {
    if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const exitCooking = () => {
    setCookingMode(false)
  }

  if (cookingMode) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-text-primary">
        <div className="flex items-center justify-between bg-text-primary p-4">
          <button onClick={exitCooking} className="font-medium text-white">← Exit</button>
          <div className="text-sm text-white">Step {currentStep + 1} of {totalSteps}</div>
          <div className="w-16"></div>
        </div>
        <div className="h-1 bg-text-secondary"><div className="h-full bg-primary-400 transition-all" style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }} /></div>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-6 text-6xl">👨‍🍳</div>
          <div className="text-2xl font-medium leading-relaxed text-white md:text-3xl">{meal.instructions?.[currentStep]}</div>
        </div>
        <div className="bg-text-primary p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-text-muted">Ingredients</div>
          <div className="flex flex-wrap gap-2">{(meal.ingredients || []).slice(0, 6).map((ing, i) => <span key={i} className="rounded-full bg-text-secondary px-3 py-1 text-sm text-white/80">{ing}</span>)}</div>
        </div>
        <div className="flex gap-4 bg-text-primary p-4">
          <button onClick={prevStep} disabled={currentStep === 0} className={`flex-1 rounded-xl py-4 text-lg font-medium ${currentStep === 0 ? 'bg-text-secondary text-text-muted' : 'bg-text-secondary text-white'}`}>← Previous</button>
          <button onClick={nextStep} disabled={currentStep === totalSteps - 1} className={`flex-1 rounded-xl py-4 text-lg font-medium ${currentStep === totalSteps - 1 ? 'bg-text-secondary text-text-muted' : 'bg-primary-400 text-white'}`}>{currentStep === totalSteps - 1 ? 'All done!' : 'Next step →'}</button>
        </div>
      </div>
    )
  }

  if (meal.swap_pending) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-surface-card p-3 shadow-card">
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-surface-muted" />
        <div className="flex-1 space-y-2 animate-pulse">
          <div className="h-4 w-2/3 rounded bg-surface-muted" />
          <div className="h-3 w-1/3 rounded bg-surface-muted" />
        </div>
      </div>
    )
  }

  if (['eat_out', 'takeout', 'delivery'].includes(mealSource)) {
    const meta = nonCookingMeta[mealSource]
    const Icon = meta.icon
    const title = meal.place_name || meta.label
    const subtitle = meal.source_note ? `${meta.label} · ${meal.source_note}` : meta.label
    return (
      <div className="flex items-center gap-3 rounded-xl bg-surface-card p-3 shadow-card">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-secondary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink-primary">{title}</div>
          <div className="mt-1 truncate text-sm text-ink-secondary">{subtitle}</div>
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); onActionsClick?.(meal.id) }} className="flex h-10 w-10 shrink-0 items-center justify-center text-ink-tertiary" aria-label="Meal actions">
          <MoreVerticalIcon className="h-5 w-5" />
        </button>
      </div>
    )
  }

  const servings = meal.servings || recipe.servings || null
  const mealTitle = meal.title || meal.name || 'Meal'
  const mealImage = meal.image_url || recipe.image_url || null

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl bg-surface-card p-3 shadow-card">
        <button type="button" onClick={() => { setShowDetail(true); onOpenMeal?.(meal) }} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted focus:outline-none" aria-label={`Open ${mealTitle}`}>
          {mealImage ? <img src={mealImage} alt={mealTitle} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-surface-muted" />}
        </button>
        <button type="button" onClick={() => { setShowDetail(true); onOpenMeal?.(meal) }} className="min-w-0 flex-1 text-left focus:outline-none">
          <div className="truncate text-sm font-medium text-ink-primary">{mealTitle}</div>
          <div className="mt-1 text-sm text-ink-secondary">{servings || 1} servings · — kcal</div>
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onActionsClick?.(meal.id) }} className="flex h-10 w-10 shrink-0 items-center justify-center text-ink-tertiary" aria-label="Meal actions">
          <MoreVerticalIcon className="h-5 w-5" />
        </button>
      </div>
      <MealDetailModal meal={meal} isOpen={showDetail} onClose={() => setShowDetail(false)} />
      <SwapModal isOpen={showSwapModal} onClose={() => !swapping && setShowSwapModal(false)} onSwap={async (suggestion) => { try { setSwapping(true); await onSwap(meal, suggestion || ''); setShowSwapModal(false) } finally { setSwapping(false) } }} mealName={meal.name} loading={swapping} />
      <UpgradePrompt feature="cooking_mode" onClose={() => setShowUpgradePrompt(false)} />
    </>
  )
}
