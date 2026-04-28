import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

function SaveToCatalogPrompt({ recipe, onSave, onDiscard, loading }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="font-display text-2xl text-text-primary">Save to your catalog?</h3>
        <p className="mt-2 text-sm text-text-secondary">{recipe.title}</p>
        <div className="mt-3 rounded-xl bg-warm-50 px-3 py-3 text-sm text-text-secondary">
          {(recipe.ingredients_text || '')
            .split('\n')
            .filter(Boolean)
            .slice(0, 2)
            .join('\n')}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onDiscard} className="btn-secondary flex-1">Discard</button>
          <button type="button" onClick={onSave} disabled={loading} className="btn-primary flex-1">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export function ClipRecipeModal({ onClose, onSaved }) {
  const [step, setStep] = useState('url') // 'url' | 'preview'
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(null)
  const [showSavePrompt, setShowSavePrompt] = useState(false)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  async function handleImport() {
    const trimmed = url.trim()
    if (!trimmed) return
    setError(null)
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || supabaseAnonKey
      const res = await fetch(`${supabaseUrl}/functions/v1/clip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      const r = data.recipe || {}
      const nextForm = {
        title: r.title || '',
        description: r.description || '',
        meal_type: 'dinner',
        prep_time_minutes: r.prep_time_minutes ?? '',
        cook_time_minutes: r.cook_time_minutes ?? '',
        servings: r.servings ?? '',
        image_url: r.image_url || '',
        source_url: r.source_url || trimmed,
        source_domain: r.source_domain || '',
        ingredients_text: (r.ingredients || []).join('\n'),
        steps_text: (r.steps || []).join('\n'),
      }
      setForm(nextForm)
      setStep('preview')
      setShowSavePrompt(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function buildRecipeRow(formState, userId) {
    const title = formState.title?.trim()
    const ingredients = formState.ingredients_text.split('\n').map((s) => s.trim()).filter(Boolean)
    const steps = formState.steps_text.split('\n').map((s) => s.trim()).filter(Boolean)
    const slug = `${slugify(title) || 'recipe'}-${Date.now()}`

    const prepMin = parseInt(formState.prep_time_minutes, 10) || null
    const cookMin = parseInt(formState.cook_time_minutes, 10) || null
    const servings = parseInt(formState.servings, 10) || null

    return {
      user_id: userId,
      title,
      slug,
      description: formState.description || null,
      meal_type: formState.meal_type || 'dinner',
      prep_time_minutes: prepMin,
      cook_time_minutes: cookMin,
      total_time_minutes: prepMin && cookMin ? prepMin + cookMin : cookMin || null,
      servings,
      ingredients_json: JSON.stringify(ingredients),
      instructions_json: JSON.stringify(steps),
      ingredient_groups_json: JSON.stringify([
        { label: null, ingredients: ingredients.map((i) => ({ item: i })) },
      ]),
      instruction_groups_json: JSON.stringify([
        { label: null, steps: steps.map((s) => ({ text: s })) },
      ]),
      source_type: 'clipped',
      source_name: formState.source_domain || null,
      source_url: formState.source_url || null,
      source_domain: formState.source_domain || null,
      image_url: formState.image_url || null,
      active: true,
      difficulty: 'medium',
    }
  }

  async function saveRecipe(formState) {
    console.log('[CLIP_SAVE] handler fired')
    const title = formState?.title?.trim()
    if (!title) {
      throw new Error('Title is required')
    }

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    console.log('[CLIP_SAVE] user:', user)
    if (!user) throw new Error('Not authenticated')

    const row = buildRecipeRow(formState, user.id)
    console.log('[CLIP_SAVE] payload:', row)

    const { data, error } = await supabase.from('recipes').insert(row)
    console.log('[CLIP_SAVE] insert response:', { data, error })
    if (error) throw new Error(error.message)
  }

  async function handleSave() {
    if (!form) return
    const title = form.title?.trim()
    if (!title) {
      setError('Title is required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await saveRecipe(form)
      toast.success('Recipe saved to your catalog!')
      setShowSavePrompt(false)
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-surface sm:rounded-2xl sm:max-w-lg shadow-xl">
        {showSavePrompt && form ? (
          <SaveToCatalogPrompt
            recipe={form}
            loading={loading}
            onSave={handleSave}
            onDiscard={() => {
              setShowSavePrompt(false)
              setForm(null)
              setStep('url')
              setError(null)
            }}
          />
        ) : null}
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-divider bg-surface px-4 py-3">
          <h2 className="font-display text-lg text-text-primary">Add Recipe</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {/* Step 1: URL input */}
          {step === 'url' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Paste the URL of any recipe page to import it into your catalog.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Recipe URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  autoFocus
                  className="w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400"
                  onKeyDown={(e) => e.key === 'Enter' && !loading && url.trim() && handleImport()}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="button"
                onClick={handleImport}
                disabled={loading || !url.trim()}
                className="btn-primary w-full"
              >
                {loading ? 'Importing…' : 'Import Recipe'}
              </button>
            </div>
          )}

          {/* Step 2: Preview & edit */}
          {step === 'preview' && form && !showSavePrompt && (
            <div className="space-y-4">
              {/* Source badge */}
              <div className="rounded-xl bg-warm-100 px-3 py-2 text-xs text-text-muted">
                Imported from{' '}
                <a
                  href={form.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {form.source_domain || form.source_url}
                </a>
                {' '}· Edit any fields before saving.
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  className="w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-divider bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">
                    Meal type
                  </label>
                  <select
                    value={form.meal_type}
                    onChange={(e) => set('meal_type', e.target.value)}
                    className="w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    {MEAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">
                    Prep (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.prep_time_minutes}
                    onChange={(e) => set('prep_time_minutes', e.target.value)}
                    className="w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">
                    Cook (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.cook_time_minutes}
                    onChange={(e) => set('cook_time_minutes', e.target.value)}
                    className="w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-primary">
                    Servings
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.servings}
                    onChange={(e) => set('servings', e.target.value)}
                    className="w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Ingredients{' '}
                  <span className="font-normal text-text-muted">(one per line)</span>
                </label>
                <textarea
                  value={form.ingredients_text}
                  onChange={(e) => set('ingredients_text', e.target.value)}
                  rows={7}
                  className="w-full resize-none rounded-xl border border-divider bg-white px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Steps{' '}
                  <span className="font-normal text-text-muted">(one per line)</span>
                </label>
                <textarea
                  value={form.steps_text}
                  onChange={(e) => set('steps_text', e.target.value)}
                  rows={8}
                  className="w-full resize-none rounded-xl border border-divider bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Image URL{' '}
                  <span className="font-normal text-text-muted">(optional)</span>
                </label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => set('image_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => { setStep('url'); setError(null) }}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || !form.title?.trim()}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Saving…' : 'Save Recipe'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
