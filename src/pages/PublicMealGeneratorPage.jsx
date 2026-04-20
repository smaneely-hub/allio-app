import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { normalizeMealRecord } from '../lib/mealSchema'
import { normalizeRecipe } from '../lib/recipeSchema'
import { SwipeDeck } from '../components/SwipeDeck'

const quickPrefs = ['High protein', 'Comfort food', 'Low carb', 'Vegetarian', 'Fast cleanup']

const DEFAULT_IMAGE = { url: null, photographer: null, photographerUrl: null }

// mode: 'idle' | 'loading' | 'deck' | 'selected'

function getTrySessionId() {
  const existing = sessionStorage.getItem('try_session_id')
  if (existing) return existing
  const next = crypto.randomUUID()
  sessionStorage.setItem('try_session_id', next)
  return next
}

async function fetchRecipeImage(dishName) {
  const query = dishName || 'food'
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
        body: JSON.stringify({ query }),
      }
    )
    const data = await res.json()
    return {
      url: typeof data?.imageUrl === 'string' && data.imageUrl.trim() ? data.imageUrl.trim() : null,
      photographer: typeof data?.photographer === 'string' && data.photographer.trim() ? data.photographer.trim() : null,
      photographerUrl: typeof data?.pexelsLink === 'string' && data.pexelsLink.trim() ? data.pexelsLink.trim() : null,
    }
  } catch {
    return DEFAULT_IMAGE
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
  const [mode, setMode] = useState('idle') // 'idle' | 'loading' | 'deck' | 'selected'
  const [deck, setDeck] = useState([]) // [{ meal, image }]
  const [batchLoading, setBatchLoading] = useState(false)
  const [dailyAttempts, setDailyAttempts] = useState(0)
  const [sessionId] = useState(() => getTrySessionId())
  const [selectedMeal, setSelectedMeal] = useState(null)
  const [selectedImage, setSelectedImage] = useState(DEFAULT_IMAGE)
  const [feedbackState, setFeedbackState] = useState({ selected: null, locked: false, message: '' })

  const selectedRecipe = useMemo(() => selectedMeal ? normalizeRecipe({
    ...selectedMeal,
    title: selectedMeal.title || selectedMeal.name,
    prepTime: selectedMeal.prep_time_minutes,
    cookTime: selectedMeal.cook_time_minutes,
    totalTime: selectedMeal.total_time_minutes,
    ingredientGroups: selectedMeal.ingredientGroups,
    instructionGroups: selectedMeal.instructionGroups,
    substitutions: selectedMeal.substitutions,
    nutrition: selectedMeal.nutrition,
    tags: selectedMeal.recipeTags,
    sourceNote: selectedMeal.sourceNote,
  }) : null, [selectedMeal])

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  // Pure generator — returns normalized meal, no state side effects
  const generateOneMeal = async (override = {}) => {
    const dietary = [
      form.preferences.toLowerCase().includes('vegetarian') ? 'vegetarian' : '',
      form.preferences.toLowerCase().includes('vegan') ? 'vegan' : '',
      form.preferences.toLowerCase().includes('gluten free') ? 'gluten-free' : '',
      form.preferences.toLowerCase().includes('dairy free') ? 'dairy-free' : '',
    ].filter(Boolean)

    const payload = {
      ingredients: form.ingredientsOnHand || '',
      servings: String(Number(form.servings) || 4),
      dietary,
      allergies: form.allergies || '',
      audience: form.kidFriendly ? 'kids and adults' : 'adults',
      timeConstraint: form.effort === 'low' ? '20' : form.effort === 'high' ? '45' : '30',
      mood: [form.preferences, override?.suggestion].filter(Boolean).join('. '),
      session_id: sessionId,
    }

    const { data, error } = await supabase.functions.invoke('generate-public-meal', { body: payload })
    if (error) throw error

    const generated = data?.recipe
    if (!generated) throw new Error('No meal returned')

    return normalizeMealRecord({ ...generated, source: 'public_try' })
  }

  const generateBatch = async () => {
    const remaining = 6 - dailyAttempts
    const toGenerate = Math.min(3, remaining)

    if (toGenerate === 0) {
      toast.error('Free preview limit reached for now. Sign up to keep planning!')
      return
    }

    setMode('loading')
    setDeck([])
    setFeedbackState({ selected: null, locked: false, message: '' })

    let succeeded = 0
    for (let i = 0; i < toGenerate; i++) {
      try {
        const meal = await generateOneMeal()
        succeeded++
        // Show deck as soon as first card arrives
        if (succeeded === 1) setMode('deck')
        // Fetch image in parallel — don't block next meal generation
        fetchRecipeImage(meal.name).then((image) => {
          setDeck((prev) => {
            // Update image for this meal if already in deck, or add it
            const exists = prev.find((d) => (d.meal.id || d.meal.name) === (meal.id || meal.name))
            if (exists) {
              return prev.map((d) =>
                (d.meal.id || d.meal.name) === (meal.id || meal.name) ? { ...d, image } : d
              )
            }
            return prev
          })
        })
        setDeck((prev) => [...prev, { meal, image: DEFAULT_IMAGE }])
      } catch (err) {
        console.error('[PublicMealGeneratorPage] batch generate failed', err)
        if (succeeded === 0) toast.error(err?.message || 'Could not generate meals right now.')
        break
      }
    }

    setDailyAttempts((prev) => prev + succeeded)
    if (succeeded === 0) setMode('idle')
  }

  const handleAccept = (meal) => {
    const deckItem = deck.find((d) => (d.meal.id || d.meal.name) === (meal.id || meal.name))
    setSelectedMeal(meal)
    setSelectedImage(deckItem?.image || DEFAULT_IMAGE)
    setDeck((prev) => prev.filter((d) => (d.meal.id || d.meal.name) !== (meal.id || meal.name)))
    setFeedbackState({ selected: null, locked: false, message: '' })
    setMode('selected')
  }

  const handleReject = () => {
    setDeck((prev) => prev.slice(1))
    // Auto top-up if running low (fire-and-forget, best effort)
    if (deck.length <= 2 && dailyAttempts < 6 && !batchLoading) {
      setBatchLoading(true)
      generateOneMeal()
        .then(async (meal) => {
          const image = await fetchRecipeImage(meal.name)
          setDeck((prev) => [...prev, { meal, image }])
          setDailyAttempts((prev) => prev + 1)
        })
        .catch(() => {/* silently fail top-up */})
        .finally(() => setBatchLoading(false))
    }
  }

  const handleEdit = () => {
    toast('Adjust your preferences in the form and tap "Generate dinner ideas" for a fresh batch.', {
      duration: 4000,
      icon: '✏️',
    })
  }

  const submitFeedback = async (feedback) => {
    if (!selectedMeal?.id || feedbackState.locked) return
    setFeedbackState((s) => ({
      ...s,
      selected: feedback,
      locked: true,
      message: feedback === 'up' ? "Thanks! We'll make more like this." : '',
    }))
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/try-feedback`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ meal_id: selectedMeal.id, session_id: sessionId, feedback }),
      })
      if (!res.ok) throw new Error(await res.text())
    } catch (err) {
      console.error('[PublicMealGeneratorPage] feedback failed', err)
      toast.error('Could not save feedback right now.')
      setFeedbackState({ selected: null, locked: false, message: '' })
    }
  }

  const canGenerate = dailyAttempts < 6

  return (
    <div className="min-h-screen bg-bg-primary px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <div className="mb-3 inline-flex rounded-full bg-primary-50 px-4 py-1 text-sm font-semibold text-primary-700">
            Try Allio without signing up
          </div>
          <h1 className="font-display text-4xl text-text-primary">Get a dinner idea in under a minute</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-text-secondary">
            Tell Allio what you have, who you're feeding, and any constraints. We'll generate meal ideas you can swipe through.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: Form */}
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
                <div className="mb-2 text-sm font-semibold text-text-primary">Allergies or hard no's</div>
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
                <input
                  type="checkbox"
                  checked={form.kidFriendly}
                  onChange={(e) => updateField('kidFriendly', e.target.checked)}
                  className="h-5 w-5"
                />
              </label>

              <button
                type="button"
                onClick={generateBatch}
                disabled={mode === 'loading' || !canGenerate}
                className="btn-primary w-full py-3 text-base disabled:opacity-50"
              >
                {mode === 'loading' ? 'Generating ideas…' : 'Generate dinner ideas'}
              </button>
              <p className="text-xs text-text-muted">
                Preview generations left: {Math.max(0, 6 - dailyAttempts)}
              </p>
            </div>
          </div>

          {/* Right: Deck / Selected / Idle */}
          <div className="rounded-3xl border border-divider bg-white p-6 shadow-sm">
            {mode === 'loading' && deck.length === 0 && (
              <div className="flex min-h-[520px] flex-col items-center justify-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
                <p className="text-sm text-text-secondary">Generating your meal ideas…</p>
              </div>
            )}

            {(mode === 'deck' || (mode === 'loading' && deck.length > 0)) && (
              <SwipeDeck
                items={deck}
                batchLoading={batchLoading || mode === 'loading'}
                onAccept={handleAccept}
                onReject={handleReject}
                onEdit={handleEdit}
              />
            )}

            {mode === 'selected' && selectedMeal && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMode(deck.length > 0 ? 'deck' : 'idle')}
                    className="rounded-full border border-divider bg-white px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-warm-50"
                  >
                    ← Back to ideas
                  </button>
                  <div className="text-xs font-semibold uppercase tracking-wide text-primary-700">Tonight's pick</div>
                </div>

                {selectedImage.url && (
                  <img
                    src={selectedImage.url}
                    alt={selectedMeal.name}
                    className="h-40 w-full rounded-xl object-cover"
                    loading="lazy"
                  />
                )}
                {selectedImage.url && selectedImage.photographer && (
                  <p className="text-xs text-gray-400">
                    Photo by{' '}
                    <a href={selectedImage.photographerUrl || 'https://www.pexels.com'} target="_blank" rel="noopener noreferrer" className="underline">
                      {selectedImage.photographer}
                    </a>{' '}
                    on{' '}
                    <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline">
                      Pexels
                    </a>
                  </p>
                )}

                <div>
                  <h2 className="font-display text-2xl text-text-primary">{selectedMeal.name}</h2>
                  <p className="mt-2 text-sm text-text-secondary">{selectedRecipe?.description || selectedMeal.reason}</p>
                  {selectedMeal.why_this_meal && (
                    <p className="mt-3 rounded-2xl bg-primary-50 p-3 text-sm text-primary-800">{selectedMeal.why_this_meal}</p>
                  )}
                  <div className="mt-3 text-sm text-text-secondary">
                    {selectedRecipe?.yield || `${selectedMeal.servings} servings`}
                    {selectedMeal.prep_time_minutes ? ` • ${selectedMeal.prep_time_minutes} min prep` : ''}
                    {selectedMeal.cook_time_minutes ? ` • ${selectedMeal.cook_time_minutes} min cook` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => submitFeedback('up')}
                    disabled={feedbackState.locked}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${feedbackState.selected === 'up' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-divider bg-white text-text-primary'}`}
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    onClick={() => submitFeedback('down')}
                    disabled={feedbackState.locked}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${feedbackState.selected === 'down' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-divider bg-white text-text-primary'}`}
                  >
                    👎
                  </button>
                  {feedbackState.message && (
                    <span className="text-sm font-medium text-text-secondary">{feedbackState.message}</span>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Ingredients</div>
                  <div className="space-y-4 text-sm text-text-primary">
                    {(selectedRecipe?.ingredientGroups || []).map((group, groupIndex) => (
                      <div key={`${group.label || 'ingredients'}-${groupIndex}`}>
                        {group.label && (
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</div>
                        )}
                        <ul className="space-y-2">
                          {group.ingredients.map((ingredient, index) => (
                            <li key={`${ingredient.item}-${index}`} className="rounded-xl bg-warm-50 px-3 py-2">
                              {[ingredient.amount, ingredient.unit, ingredient.item].filter(Boolean).join(' ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Instructions</div>
                  <div className="space-y-4 text-sm text-text-primary">
                    {(selectedRecipe?.instructionGroups || []).map((group, groupIndex) => (
                      <div key={`${group.label || 'steps'}-${groupIndex}`}>
                        {group.label && (
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{group.label}</div>
                        )}
                        <ol className="space-y-3">
                          {group.steps.map((step, index) => (
                            <li key={`${index}-${step.text}`} className="flex gap-3">
                              <span className="font-semibold text-primary-500">{index + 1}.</span>
                              <div>
                                <span>{step.text}</span>
                                {step.tip && <div className="mt-1 text-xs text-text-muted">Tip: {step.tip}</div>}
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
                  <p className="mt-1 text-sm text-text-secondary">
                    Create a profile and Allio can turn this into a full household plan.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link to="/login" className="rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white">
                      Create free account
                    </Link>
                    <button
                      type="button"
                      onClick={generateBatch}
                      disabled={!canGenerate}
                      className="rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
                    >
                      Try more meals
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mode === 'idle' && (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <h2 className="font-display text-2xl text-text-primary">Swipe through dinner ideas</h2>
                <p className="mt-3 max-w-sm text-sm text-text-secondary">
                  Add what you have on hand, set a few preferences, then swipe right to keep or left to skip.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
