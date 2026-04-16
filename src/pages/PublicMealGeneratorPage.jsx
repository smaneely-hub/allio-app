import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { normalizeMealRecord } from '../lib/mealSchema'
import { normalizeRecipe } from '../lib/recipeSchema'

const quickPrefs = ['High protein', 'Comfort food', 'Low carb', 'Vegetarian', 'Fast cleanup']

async function fetchRecipeImage(dishName) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-recipe-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ query: dishName }),
      }
    )
    return await res.json()
  } catch {
    return { imageUrl: null, photographer: null, pexelsLink: null }
  }
}

export function PublicMealGeneratorPage() {
  const [form, setForm] = useState({
    ingredientsOnHand: '',
    servings: 4,
    allergies: '',
    preferences: '',
    kidFriendly: false,
    effort: 'medium',
  })
  const [loading, setLoading] = useState(false)
  const [meal, setMeal] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [photographer, setPhotographer] = useState(null)
  const [recentMeals, setRecentMeals] = useState([])
  const [dailyAttempts, setDailyAttempts] = useState(0)

  const canGenerate = useMemo(() => dailyAttempts < 6, [dailyAttempts])
  const recipe = useMemo(() => (meal ? normalizeRecipe({
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
  }) : null), [meal])

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const generateMeal = async (override = {}) => {
    if (!canGenerate) {
      toast.error('Free preview limit reached for now. Try again later or create an account.')
      return
    }

    setLoading(true)
    try {
      const dietary = [form.preferences.toLowerCase().includes('vegetarian') ? 'vegetarian' : '', form.preferences.toLowerCase().includes('vegan') ? 'vegan' : '', form.preferences.toLowerCase().includes('gluten free') ? 'gluten-free' : '', form.preferences.toLowerCase().includes('dairy free') ? 'dairy-free' : '']
        .filter(Boolean)

      const payload = {
        ingredients: form.ingredientsOnHand || '',
        servings: String(Number(form.servings) || 4),
        dietary,
        allergies: form.allergies || '',
        audience: form.kidFriendly ? 'kids and adults' : 'adults',
        timeConstraint: form.effort === 'low' ? '20' : form.effort === 'high' ? '45' : '30',
        mood: [form.preferences, override?.suggestion].filter(Boolean).join('. '),
      }

      const { data, error } = await supabase.functions.invoke('generate-public-meal', { body: payload })
      if (error) throw error

      const generated = data?.recipe
      if (!generated) throw new Error('No meal returned')
      const normalized = normalizeMealRecord(generated)
      setMeal(normalized)
      setRecentMeals((current) => [...current.slice(-2), normalized.name])
      setDailyAttempts((current) => current + 1)
    } catch (err) {
      console.error('[PublicMealGeneratorPage] generate failed', err)
      toast.error(err?.message || 'Could not generate a meal right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (meal?.title) {
      fetchRecipeImage(meal.title).then((result) => {
        if (result.imageUrl) {
          setImageUrl(result.imageUrl)
          setPhotographer(result.photographer)
        }
      })
    }
  }, [meal?.title])

  const regenerateWithReason = (reason) => generateMeal({ suggestion: reason })

  return (
    <div className="min-h-screen bg-bg-primary px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <div className="mb-3 inline-flex rounded-full bg-primary-50 px-4 py-1 text-sm font-semibold text-primary-700">Try Allio without signing up</div>
          <h1 className="font-display text-4xl text-text-primary">Get a dinner idea in under a minute</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-text-secondary">Tell Allio what you have, who you’re feeding, and any constraints. We’ll generate one strong dinner, no profile required.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-divider bg-white p-6 shadow-sm">
            <div className="grid gap-5">
              <label className="block">
                <div className="mb-2 text-sm font-semibold text-text-primary">What ingredients do you already have?</div>
                <textarea
                  className="input min-h-[110px] w-full"
                  value={form.ingredientsOnHand}
                  onChange={(e) => updateField('ingredientsOnHand', e.target.value)}
                  placeholder="Chicken, rice, broccoli, Greek yogurt, tortillas..."
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-text-primary">How many people?</div>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    className="input w-full"
                    value={form.servings}
                    onChange={(e) => updateField('servings', e.target.value)}
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-text-primary">Effort</div>
                  <select className="input w-full" value={form.effort} onChange={(e) => updateField('effort', e.target.value)}>
                    <option value="low">Quick and easy</option>
                    <option value="medium">Balanced</option>
                    <option value="high">Happy to cook</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <div className="mb-2 text-sm font-semibold text-text-primary">Allergies or hard no’s</div>
                <input
                  type="text"
                  className="input w-full"
                  value={form.allergies}
                  onChange={(e) => updateField('allergies', e.target.value)}
                  placeholder="Peanuts, shellfish, gluten..."
                />
              </label>

              <div>
                <div className="mb-2 text-sm font-semibold text-text-primary">Preference</div>
                <input
                  type="text"
                  className="input w-full"
                  value={form.preferences}
                  onChange={(e) => updateField('preferences', e.target.value)}
                  placeholder="High protein, comforting, vegetarian, lighter..."
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {quickPrefs.map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => updateField('preferences', pref)}
                      className="rounded-full bg-warm-100 px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-warm-200"
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between rounded-2xl border border-divider bg-warm-50 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-text-primary">Kid-friendly</div>
                  <div className="text-xs text-text-secondary">Bias toward familiar, approachable flavors</div>
                </div>
                <input type="checkbox" checked={form.kidFriendly} onChange={(e) => updateField('kidFriendly', e.target.checked)} className="h-5 w-5" />
              </label>

              <button type="button" onClick={() => generateMeal()} disabled={loading || !canGenerate} className="btn-primary w-full py-3 text-base disabled:opacity-50">
                {loading ? 'Generating dinner…' : 'Generate my dinner'}
              </button>
              <p className="text-xs text-text-muted">Preview generations left right now: {Math.max(0, 6 - dailyAttempts)}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-divider bg-white p-6 shadow-sm">
            {meal ? (
              <div className="space-y-5">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={meal.title || meal.name}
                    className="h-40 w-full rounded-t-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center rounded-t-xl bg-gray-100">
                    <span className="text-sm text-gray-400">Loading photo...</span>
                  </div>
                )}
                {photographer && (
                  <p className="px-4 pt-1 text-xs text-gray-400">
                    Photo by {photographer} on Pexels
                  </p>
                )}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-primary-700">Tonight’s pick</div>
                  <h2 className="mt-2 font-display text-2xl text-text-primary">{meal.name}</h2>
                  <p className="mt-2 text-sm text-text-secondary">{recipe?.description || meal.reason}</p>
                  {meal.why_this_meal ? <p className="mt-3 rounded-2xl bg-primary-50 p-3 text-sm text-primary-800">{meal.why_this_meal}</p> : null}
                  <div className="mt-3 text-sm text-text-secondary">{recipe?.yield || `${meal.servings} servings`} • {meal.prep_time_minutes} min prep • {meal.cook_time_minutes} min cook</div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Try a different angle</div>
                  <div className="flex flex-wrap gap-2">
                    {['Want something faster', 'Too complex', 'Different protein'].map((option) => (
                      <button key={option} type="button" onClick={() => regenerateWithReason(option)} disabled={loading || !canGenerate} className="rounded-full border border-divider bg-white px-3 py-1.5 text-xs font-semibold text-text-primary disabled:opacity-50">
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Ingredients</div>
                  <div className="space-y-4 text-sm text-text-primary">
                    {(recipe?.ingredientGroups || []).map((group, groupIndex) => (
                      <div key={`${group.label || 'ingredients'}-${groupIndex}`}>
                        {group.label ? <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</div> : null}
                        <ul className="space-y-2">
                          {group.ingredients.map((ingredient, index) => (
                            <li key={`${ingredient.item}-${index}`} className="rounded-xl bg-warm-50 px-3 py-2">{[ingredient.amount, ingredient.unit, ingredient.item].filter(Boolean).join(' ')}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Instructions</div>
                  <div className="space-y-4 text-sm text-text-primary">
                    {(recipe?.instructionGroups || []).map((group, groupIndex) => (
                      <div key={`${group.label || 'steps'}-${groupIndex}`}>
                        {group.label ? <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</div> : null}
                        <ol className="space-y-3">
                          {group.steps.map((step, index) => (
                            <li key={`${index}-${step.text}`} className="flex gap-3">
                              <span className="font-semibold text-primary-500">{index + 1}.</span>
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

                <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
                  <div className="text-sm font-semibold text-text-primary">Want weekly planning and shopping too?</div>
                  <p className="mt-1 text-sm text-text-secondary">Create a profile and Allio can turn this into a full household plan.</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link to="/login" className="rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white">Create free account</Link>
                    <button type="button" onClick={() => generateMeal()} disabled={loading || !canGenerate} className="rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-50">Try another meal</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                <h2 className="font-display text-2xl text-text-primary">We’ll build your dinner here</h2>
                <p className="mt-3 max-w-sm text-sm text-text-secondary">Add what you have on hand, set a few preferences, and get one strong dinner idea you can cook tonight.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
