import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { normalizeMealRecord } from '../lib/mealSchema'
import { SwipeDeck } from '../components/SwipeDeck'
import { CookingMode } from '../components/CookingMode'

const quickPrefs = ['High protein', 'Comfort food', 'Low carb', 'Vegetarian', 'Fast cleanup']

const DEFAULT_IMAGE = { url: null, photographer: null, photographerUrl: null }

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
  const [mode, setMode] = useState('idle') // 'idle' | 'loading' | 'deck' | 'cooking'
  const [deck, setDeck] = useState([]) // [{ meal, image }]
  const [batchLoading, setBatchLoading] = useState(false)
  const [dailyAttempts, setDailyAttempts] = useState(0)
  const [sessionId] = useState(() => getTrySessionId())
  const [selectedMeal, setSelectedMeal] = useState(null)
  const [selectedImage, setSelectedImage] = useState(DEFAULT_IMAGE)

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
    setMode('cooking')
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

            {mode === 'cooking' && selectedMeal && (
              <CookingMode
                meal={selectedMeal}
                image={selectedImage}
                onExit={() => {
                  setSelectedMeal(null)
                  setMode(deck.length > 0 ? 'deck' : 'idle')
                }}
              />
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
