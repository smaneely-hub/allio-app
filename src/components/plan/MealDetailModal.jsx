import { useEffect, useMemo, useState } from 'react'
import { normalizeRecipe } from '../../lib/recipeSchema'
import { formatIngredientAmount } from '../../utils/formatFractions'

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

function formatQuantity(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return value || ''
  return formatIngredientAmount(number)
}

function normalizeDirections(meal, recipe) {
  const raw = meal?.directions ?? meal?.steps ?? meal?.instructions ?? meal?.method ?? recipe?.instructionGroups ?? []

  if (typeof raw === 'string') {
    return raw.split(/\r?\n+/).map((step) => step.trim()).filter(Boolean)
  }

  if (Array.isArray(raw)) {
    return raw.map((step) => {
      if (typeof step === 'string') return step.trim()
      return String(step?.text ?? step?.instruction ?? step?.step ?? '').trim()
    }).filter(Boolean)
  }

  if (Array.isArray(recipe?.instructionGroups)) {
    return recipe.instructionGroups.flatMap((group) => (group?.steps || []).map((step) => step?.text).filter(Boolean))
  }

  return []
}

function normalizeIngredients(recipe) {
  return recipe.ingredientGroups.flatMap((group) => group.ingredients || [])
}

export function MealDetailModal({ meal, isOpen, onClose }) {
  const [servings, setServings] = useState(1)

  useEffect(() => {
    if (meal?.servings) setServings(Math.min(12, Math.max(1, Number(meal.servings) || 1)))
  }, [meal])

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
  const ingredients = useMemo(() => normalizeIngredients(recipe), [recipe])
  const directions = useMemo(() => normalizeDirections(meal, recipe), [meal, recipe])
  const subtitle = [
    recipe.totalTime ? `${recipe.totalTime} min total` : '',
    recipe.tags?.mealType || meal?.meal || '',
  ].filter(Boolean).join(' · ')
  const image = meal?.image_url || meal?.image || recipe?.imageUrl || null

  if (!isOpen || !meal) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/45" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 top-0 overflow-y-auto md:flex md:items-center md:justify-center md:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="min-h-full bg-white md:min-h-0 md:w-full md:max-w-2xl md:overflow-hidden md:rounded-[28px]">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
            {image ? <img src={image} alt={meal.title || meal.name || 'Meal'} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-surface-muted" />}
            <button type="button" onClick={onClose} className="absolute left-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/80 p-2 text-ink-primary backdrop-blur transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Close meal detail">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 px-4 pb-8 pt-5 md:px-6">
            <div>
              <h2 className="font-display text-2xl text-ink-primary">{meal.title || meal.name || 'Meal'}</h2>
              {subtitle ? <p className="mt-2 text-sm text-ink-secondary">{subtitle}</p> : null}
            </div>

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

            <section>
              <h3 className="mb-3 text-sm font-semibold text-ink-primary">Ingredients</h3>
              <div className="divide-y divide-surface-muted overflow-hidden rounded-2xl bg-white">
                {ingredients.length > 0 ? ingredients.map((ingredient, index) => {
                  const amount = ingredient?.amount || ingredient?.quantity || ''
                  const scaledAmount = amount && !Number.isNaN(Number(amount)) ? formatQuantity(Number(amount) * scale) : amount
                  const line = [scaledAmount, ingredient?.unit || '', ingredient?.item || ingredient?.name || 'Ingredient'].filter(Boolean).join(' ')
                  return (
                    <div key={`${ingredient?.item || ingredient?.name || 'ingredient'}-${index}`} className="px-1 py-3 text-sm text-ink-primary">
                      <span className="tabular-nums">{line}</span>
                    </div>
                  )
                }) : <div className="px-1 py-3 text-sm text-ink-secondary">No ingredients listed</div>}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-ink-primary">Directions</h3>
              <ol className="space-y-4 pl-5 text-sm leading-7 text-ink-primary">
                {directions.length > 0 ? directions.map((step, index) => (
                  <li key={`${index}-${step.slice(0, 24)}`} className="pl-1 marker:font-semibold marker:text-ink-secondary">{step}</li>
                )) : <li className="list-none text-sm text-ink-secondary">No instructions returned</li>}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
