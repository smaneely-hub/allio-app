import { useMemo, useState } from 'react'

function formatIngredientLine(ingredient) {
  const qty = [ingredient.quantity, ingredient.unit].filter(Boolean).join(' ')
  const grams = ingredient.grams ? `${ingredient.grams}g` : ''
  return [qty, grams].filter(Boolean).join(' • ')
}

export function MealDetailModal({ meal, isOpen, onClose }) {
  const [amountToEat, setAmountToEat] = useState(meal?.amount_to_eat || 1)
  const [unit, setUnit] = useState(meal?.amount_unit || 'serving')

  const scaledIngredients = useMemo(() => {
    if (!meal) return []
    return (meal.ingredients || []).map((ingredient) => ({ ...ingredient }))
  }, [meal])

  if (!isOpen || !meal) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div className="absolute inset-0 overflow-y-auto bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-divider bg-white px-4 py-4">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-text-primary">← Back</button>
          <div className="mx-4 flex-1 truncate text-center text-sm font-semibold text-text-primary">{meal.title}</div>
          <div className="w-12" />
        </div>

        <div className="pb-10">
          <div className="aspect-[4/3] w-full bg-gradient-to-br from-emerald-100 to-teal-100">
            {meal.image_url ? (
              <img src={meal.image_url} alt={meal.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">🍽️</div>
            )}
          </div>

          <div className="px-4 pt-4">
            <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold text-text-primary">
              {['Like', 'Save', 'Add', 'Recur', 'More'].map((label) => (
                <button key={label} type="button" className="rounded-2xl border border-divider bg-white px-2 py-3 shadow-sm transition hover:bg-warm-50">{label}</button>
              ))}
            </div>

            <section className="mt-5 rounded-3xl border border-divider bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-3 text-sm text-text-primary">
                <div>
                  <div className="text-xs uppercase tracking-wide text-text-muted">Prep time</div>
                  <div className="mt-1 font-semibold">{meal.prep_time_minutes || 0} min</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-text-muted">Cook time</div>
                  <div className="mt-1 font-semibold">{meal.cook_time_minutes || 0} min</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs uppercase tracking-wide text-text-muted">Amount to eat</div>
                <div className="mt-2 flex items-center gap-3">
                  <button type="button" onClick={() => setAmountToEat((v) => Math.max(0.5, Number((v - 0.5).toFixed(1))))} className="h-11 w-11 rounded-full border border-divider text-lg font-semibold">−</button>
                  <div className="min-w-[80px] text-center text-lg font-semibold text-text-primary">{amountToEat}</div>
                  <button type="button" onClick={() => setAmountToEat((v) => Number((v + 0.5).toFixed(1)))} className="h-11 w-11 rounded-full border border-divider text-lg font-semibold">+</button>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className="input flex-1">
                    <option value="serving">serving</option>
                    <option value="servings">servings</option>
                    <option value="portion">portion</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-3xl border border-divider bg-white p-4 shadow-sm">
              <div className="text-base font-semibold text-text-primary">Nutrition</div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-warm-50 p-3"><div className="text-xs text-text-muted">Calories</div><div className="mt-1 font-semibold text-text-primary">{meal.calories || 0}</div></div>
                <div className="rounded-2xl bg-warm-50 p-3"><div className="text-xs text-text-muted">Carbs</div><div className="mt-1 font-semibold text-text-primary">{Math.round(meal.nutrition?.carbs || 0)}g</div></div>
                <div className="rounded-2xl bg-warm-50 p-3"><div className="text-xs text-text-muted">Fat</div><div className="mt-1 font-semibold text-text-primary">{Math.round(meal.nutrition?.fat || 0)}g</div></div>
                <div className="rounded-2xl bg-warm-50 p-3"><div className="text-xs text-text-muted">Protein</div><div className="mt-1 font-semibold text-text-primary">{Math.round(meal.nutrition?.protein || 0)}g</div></div>
              </div>
            </section>

            <section className="mt-5 rounded-3xl border border-divider bg-white p-4 shadow-sm">
              <div className="text-base font-semibold text-text-primary">Ingredients</div>
              <div className="mt-1 text-sm text-text-secondary">for amount to eat of {amountToEat} {unit}</div>
              <div className="mt-4 space-y-3">
                {scaledIngredients.length > 0 ? scaledIngredients.map((ingredient) => (
                  <div key={ingredient.id} className="flex items-start gap-3 rounded-2xl bg-warm-50/60 p-3">
                    {ingredient.image_url ? (
                      <img src={ingredient.image_url} alt={ingredient.name} className="h-12 w-12 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg">🥕</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-text-primary">{ingredient.name}</div>
                      {ingredient.descriptor ? <div className="mt-1 text-xs text-text-secondary">{ingredient.descriptor}</div> : null}
                    </div>
                    <div className="text-right text-xs text-text-muted">{formatIngredientLine(ingredient)}</div>
                  </div>
                )) : <div className="text-sm text-text-muted">No ingredients saved yet.</div>}
              </div>
            </section>

            <section className="mt-5 rounded-3xl border border-divider bg-white p-4 shadow-sm">
              <div className="text-base font-semibold text-text-primary">Directions</div>
              <div className="mt-1 text-sm text-text-secondary">Original recipe basis: {meal.servings || 1} serving{meal.servings === 1 ? '' : 's'}</div>
              <ol className="mt-4 space-y-4">
                {(meal.directions || []).length > 0 ? meal.directions.map((step, index) => (
                  <li key={`${step.text}-${index}`} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">{index + 1}</div>
                    <div className="text-sm leading-6 text-text-primary">{step.text || step}</div>
                  </li>
                )) : <div className="text-sm text-text-muted">No directions saved yet.</div>}
              </ol>
            </section>

            <button type="button" className="mt-5 w-full rounded-2xl bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600">
              Order groceries online
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
