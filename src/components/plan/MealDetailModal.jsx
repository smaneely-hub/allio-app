import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { normalizeRecipe } from '../../lib/recipeSchema'
import { MealDetailBody } from '../MealDetailBody'

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m6 6 12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MinusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BackArrowIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M19 12H5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m12 5-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}


export function MealDetailModal({ meal, isOpen, onClose, onStartCooking }) {
  const [servings, setServings] = useState(1)

  useEffect(() => {
    if (meal?.servings) setServings(Math.min(12, Math.max(1, Number(meal.servings) || 1)))
  }, [meal])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const recipe = useMemo(() => normalizeRecipe({
    ...meal,
    title: meal?.title || meal?.name,
    prepTime: meal?.prep_time_minutes,
    cookTime: meal?.cook_time_minutes,
    totalTime: meal?.total_time_minutes,
    ingredientGroups: meal?.ingredientGroups,
    instructionGroups: meal?.instructionGroups,
    ingredients: meal?.ingredients,
    instructions: meal?.instructions,
    directions: meal?.directions,
    method: meal?.method,
  }), [meal])

  const baseServings = Math.max(1, Number(meal?.servings || recipe?.yield?.match(/\d+/)?.[0] || 1) || 1)
  const scale = servings / baseServings
  const image = meal?.image_url || meal?.image || recipe?.imageUrl || null
  const title = meal?.title || meal?.name || 'Meal'
  const whyNote = meal?.why_this_meal || null
  const flatTags = Array.isArray(meal?.tags) ? meal.tags.filter(Boolean) : []

  if (!isOpen || !meal) return null

  const content = (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop — clicking it closes on any device */}
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />

      {/* Layout layer — pointer-events-none so clicks in margins fall through to backdrop */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 flex flex-col md:items-center md:justify-center md:p-6">
        {/* Mobile sticky back header — always visible while scrolling */}
        <div className="pointer-events-auto flex shrink-0 items-center gap-3 border-b border-surface-muted bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={onClose}
            style={{ touchAction: 'manipulation' }}
            className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-ink-primary transition-colors duration-150 hover:bg-stone-100 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
            aria-label="Back to plan"
          >
            <BackArrowIcon className="h-4 w-4" />
            Back
          </button>
          <span className="flex-1 truncate text-sm font-semibold text-ink-primary">{title}</span>
          <button
            type="button"
            onClick={onClose}
            style={{ touchAction: 'manipulation' }}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-surface-card text-ink-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
            aria-label="Close meal detail"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable card area — pointer-events-auto; clicking empty space around card also closes */}
        <div className="pointer-events-auto flex-1 overflow-y-auto w-full md:flex md:items-center md:justify-center" onClick={onClose}>
          {/* Actual card — stop propagation so tapping card content never closes */}
          <div className="min-h-full bg-white md:min-h-0 md:w-full md:max-w-2xl md:overflow-hidden md:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
              {image ? <img src={image} alt={title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-surface-muted" />}
              {/* Desktop-only close button overlaid on image */}
              <button
                type="button"
                onClick={onClose}
                className="absolute left-4 top-4 hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/80 p-2 text-ink-primary backdrop-blur transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 md:flex"
                aria-label="Close meal detail"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-4 pb-8 pt-5 md:px-6">
              {/* Title and timer pills */}
              <div>
                <h2 className="font-display text-2xl text-ink-primary">{title}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recipe.prepTime > 0 ? <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">Prep {recipe.prepTime} min</span> : null}
                  {recipe.cookTime > 0 ? <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">Cook {recipe.cookTime} min</span> : null}
                  {recipe.totalTime > 0 ? <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">Total {recipe.totalTime} min</span> : null}
                  {recipe.tags?.mealType ? <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">{recipe.tags.mealType}</span> : (meal?.meal ? <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">{meal.meal}</span> : null)}
                </div>
              </div>

              {/* Why this meal — shown when AI provides a rationale */}
              {whyNote ? (
                <div className="rounded-xl border border-primary-100 bg-gradient-to-r from-primary-50 to-teal-50 p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5">💡</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary-800">Why this meal</p>
                      <p className="mt-1 text-sm text-primary-700">{whyNote}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Flat tag pills */}
              {flatTags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {flatTags.map((tag, i) => (
                    <span key={`${tag}-${i}`} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{tag}</span>
                  ))}
                </div>
              ) : null}

              {/* Servings adjuster */}
              <div className="flex items-center justify-between rounded-2xl bg-surface-card px-4 py-3">
                <span className="text-sm font-semibold text-ink-primary">Servings</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setServings((current) => Math.max(1, current - 1))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-muted p-2 text-ink-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Decrease servings">
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums text-ink-primary">{servings}</span>
                  <button type="button" onClick={() => setServings((current) => Math.min(12, current + 1))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-muted p-2 text-ink-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Increase servings">
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <MealDetailBody
                meal={meal}
                contextKeyPrefix={`planner-detail-${meal?.id || meal?.name || 'meal'}`}
                scale={scale}
                onStartCooking={onStartCooking}
              />

              {!image ? (
                <div className="rounded-2xl border border-dashed border-surface-muted bg-surface-card px-4 py-3 text-sm text-ink-secondary">
                  No recipe photo is available for this meal yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
