import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { normalizeMealRecord } from '../lib/mealSchema'

const quickPrefs = ['High protein', 'Comfort food', 'Low carb', 'Vegetarian', 'Fast cleanup']

export function PublicMealGeneratorPage() {
  const [form, setForm] = useState({
    ingredientsOnHand: '',
    servings: 4,
    allergies: '',
    preferences: '',
    kidFriendly: true,
    effort: 'medium',
  })
  const [loading, setLoading] = useState(false)
  const [meal, setMeal] = useState(null)

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const generateMeal = async () => {
    setLoading(true)
    try {
      const payload = {
        public_mode: true,
        household: {
          total_people: Number(form.servings) || 4,
          diet_focus: form.preferences || '',
          staples_on_hand: form.ingredientsOnHand || '',
          cooking_comfort: form.effort === 'low' ? 'simple meals' : form.effort === 'high' ? 'love cooking' : 'cook from scratch',
        },
        members: [
          {
            label: 'Guest household',
            role: 'adult',
            dietary_restrictions: form.allergies ? form.allergies.split(',').map((item) => item.trim()).filter(Boolean) : [],
            food_preferences: [form.preferences, form.kidFriendly ? 'kid-friendly' : ''].filter(Boolean),
            health_considerations: [],
          },
        ],
        slots: [
          {
            day: 'mon',
            meal: 'dinner',
            attendees: [],
            effort_level: form.effort,
            planning_notes: form.kidFriendly ? 'Please keep this family-friendly for kids.' : 'No kid-friendly requirement.',
            is_leftover: false,
            leftover_source: '',
            suggestion: [form.preferences, form.ingredientsOnHand ? `Use ingredients on hand when possible: ${form.ingredientsOnHand}` : ''].filter(Boolean).join('. '),
          },
        ],
        week_notes: 'Public first-meal generation experience. Return one strong dinner only.',
        recent_meal_names: [],
      }

      const { data, error } = await supabase.functions.invoke('generate-plan', { body: payload })
      if (error) throw error

      const generated = data?.plan?.meals?.[0]
      if (!generated) throw new Error('No meal returned')
      setMeal(normalizeMealRecord(generated))
    } catch (err) {
      console.error('[PublicMealGeneratorPage] generate failed', err)
      toast.error(err?.message || 'Could not generate a meal right now.')
    } finally {
      setLoading(false)
    }
  }

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

              <button type="button" onClick={generateMeal} disabled={loading} className="btn-primary w-full py-3 text-base">
                {loading ? 'Generating dinner…' : 'Generate my dinner'}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-divider bg-white p-6 shadow-sm">
            {meal ? (
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-primary-700">Tonight’s pick</div>
                  <h2 className="mt-2 font-display text-2xl text-text-primary">{meal.name}</h2>
                  {meal.reason ? <p className="mt-2 text-sm text-text-secondary">{meal.reason}</p> : null}
                  {meal.why_this_meal ? <p className="mt-3 rounded-2xl bg-primary-50 p-3 text-sm text-primary-800">{meal.why_this_meal}</p> : null}
                  <div className="mt-3 text-sm text-text-secondary">{meal.servings} servings • {meal.prep_time_minutes} min prep • {meal.cook_time_minutes} min cook</div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Ingredients</div>
                  <ul className="space-y-2 text-sm text-text-primary">
                    {meal.ingredients.map((ingredient) => (
                      <li key={ingredient} className="rounded-xl bg-warm-50 px-3 py-2">{ingredient}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Instructions</div>
                  <ol className="space-y-3 text-sm text-text-primary">
                    {meal.instructions.map((step, index) => (
                      <li key={`${index}-${step}`} className="flex gap-3">
                        <span className="font-semibold text-primary-500">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
                  <div className="text-sm font-semibold text-text-primary">Want weekly planning and shopping too?</div>
                  <p className="mt-1 text-sm text-text-secondary">Create a profile and Allio can turn this into a full household plan.</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link to="/login" className="rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white">Create free account</Link>
                    <button type="button" onClick={generateMeal} disabled={loading} className="rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary">Try another meal</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                <div className="text-5xl">🍽️</div>
                <h2 className="mt-4 font-display text-2xl text-text-primary">Your first meal goes here</h2>
                <p className="mt-3 max-w-sm text-sm text-text-secondary">This is perfect for prospects, browser testing, and beta feedback because it skips account setup.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
