import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { updateRecipe } from '../hooks/useRecipeMutations'
import { normalizeRecipe } from '../lib/recipeSchema'

function SaveToCatalogPrompt({ recipe, onSave, onEditFirst, loading }) {
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
          <button type="button" onClick={onEditFirst} className="btn-secondary flex-1">Edit first</button>
          <button type="button" onClick={onSave} disabled={loading} className="btn-primary flex-1">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

function flattenImportedIngredients(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (!entry) return []
      if (typeof entry === 'string') return entry.trim() ? [entry.trim()] : []
      if (typeof entry === 'object') {
        if (Array.isArray(entry.ingredients)) return flattenImportedIngredients(entry.ingredients)
        const line = [entry.amount, entry.unit, entry.item || entry.name || entry.text]
          .filter(Boolean)
          .map((part) => String(part).trim())
          .join(' ')
          .trim()
        return line ? [line] : []
      }
      return []
    })
  }
  return []
}

function flattenImportedSteps(value) {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (!entry) return []
      if (typeof entry === 'string') return entry.trim() ? [entry.trim()] : []
      if (typeof entry === 'object') {
        if (Array.isArray(entry.steps)) return flattenImportedSteps(entry.steps)
        const text = entry.text || entry.name
        return typeof text === 'string' && text.trim() ? [text.trim()] : []
      }
      return []
    })
  }
  if (typeof value === 'string') {
    return value.split('\n').map((line) => line.trim()).filter(Boolean)
  }
  return []
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export function ClipRecipeModal({ onClose, onSaved, initialRecipe = null }) {
  const [step, setStep] = useState(initialRecipe ? 'preview' : 'url')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(null)
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [isFromImport, setIsFromImport] = useState(false)

  const previewRecipe = useMemo(() => {
    if (!form) return null
    return normalizeRecipe({
      title: form.title,
      description: form.description,
      meal_type: form.meal_type,
      prep_time_minutes: form.prep_time_minutes,
      cook_time_minutes: form.cook_time_minutes,
      servings: form.servings,
      image_url: form.image_url,
      source_url: form.source_url,
      source_domain: form.source_domain,
      ingredients_json: form.ingredients_text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      instructions_json: form.steps_text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      nutrition_json: form.nutrition || null,
    })
  }, [form])

  useEffect(() => {
    if (!initialRecipe) return
    setForm({
      id: initialRecipe.id,
      title: initialRecipe.title || '',
      description: initialRecipe.description || '',
      meal_type: initialRecipe.tags?.mealType || initialRecipe.meal_type || 'dinner',
      prep_time_minutes: initialRecipe.prepTime ?? initialRecipe.prep_time_minutes ?? '',
      cook_time_minutes: initialRecipe.cookTime ?? initialRecipe.cook_time_minutes ?? '',
      servings: initialRecipe.yield?.match(/\d+/)?.[0] || '',
      image_url: initialRecipe.imageUrl || initialRecipe.image_url || '',
      source_url: initialRecipe.source_url || '',
      source_domain: initialRecipe.source_domain || '',
      ingredients_text: (initialRecipe.ingredientGroups || []).flatMap((group) =>
        (group.ingredients || []).map((ingredient) => [ingredient.amount, ingredient.unit, ingredient.item].filter(Boolean).join(' ').trim()),
      ).join('\n'),
      steps_text: (initialRecipe.instructionGroups || []).flatMap((group) =>
        (group.steps || []).map((step) => step.text).filter(Boolean),
      ).join('\n'),
      nutrition: initialRecipe.nutrition || null,
    })
  }, [initialRecipe])

  async function handleImport() {
    const trimmed = url.trim()
    if (!trimmed) return
    setError(null)
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('clip', {
        body: { url: trimmed },
      })
      if (error) {
        throw error
      }
      const r = data?.recipe || {}
      const importedIngredients = flattenImportedIngredients(r.ingredients || r.ingredient_groups_json)
      const importedSteps = flattenImportedSteps(r.steps || r.instructions || r.instruction_groups_json)

      setForm({
        title: typeof r.title === 'string' ? r.title : '',
        description: typeof r.description === 'string' ? r.description : '',
        meal_type: r.meal_type || r.tags?.mealType || 'dinner',
        prep_time_minutes: r.prep_time_minutes ?? r.prepTime ?? '',
        cook_time_minutes: r.cook_time_minutes ?? r.cookTime ?? '',
        servings: r.servings ?? r.yield ?? '',
        image_url: r.image_url || r.imageUrl || '',
        source_url: r.source_url || trimmed,
        source_domain: r.source_domain || '',
        ingredients_text: importedIngredients.join('\n'),
        steps_text: importedSteps.join('\n'),
        nutrition: r.nutrition || null,
      })
      setStep('preview')
      setIsFromImport(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleCreateManually() {
    setForm({
      title: '',
      description: '',
      meal_type: 'dinner',
      prep_time_minutes: '',
      cook_time_minutes: '',
      servings: '',
      image_url: '',
      source_url: '',
      source_domain: '',
      ingredients_text: '',
      steps_text: '',
    })
    setIsFromImport(false)
    setStep('preview')
  }

  function buildRecipeRow(formState, userId) {
    const title = formState.title?.trim()
    const ingredients = formState.ingredients_text.split('\n').map((s) => s.trim()).filter(Boolean)
    const steps = formState.steps_text.split('\n').map((s) => s.trim()).filter(Boolean)
    const slug = formState.id ? undefined : `${slugify(title) || 'recipe'}-${Date.now()}`

    const prepMin = parseInt(formState.prep_time_minutes, 10) || null
    const cookMin = parseInt(formState.cook_time_minutes, 10) || null
    const servings = parseInt(formState.servings, 10) || null

    return {
      ...(slug ? { slug } : {}),
      user_id: userId,
      title,
      description: formState.description || null,
      meal_type: formState.meal_type || 'dinner',
      prep_time_minutes: prepMin,
      cook_time_minutes: cookMin,
      total_time_minutes: prepMin && cookMin ? prepMin + cookMin : cookMin || null,
      servings,
      ingredients_json: ingredients,
      instructions_json: steps,
      ingredient_groups_json: [
        { label: null, ingredients: ingredients.map((i) => ({ item: i })) },
      ],
      instruction_groups_json: [
        { label: null, steps: steps.map((s) => ({ text: s })) },
      ],
      source_type: 'clipped',
      source_name: formState.source_domain || null,
      source_url: formState.source_url || null,
      source_domain: formState.source_domain || null,
      image_url: formState.image_url || null,
      active: true,
      difficulty: 'medium',
      ...(formState.nutrition ? { nutrition_json: formState.nutrition } : {}),
    }
  }

  async function saveRecipe(formState) {
    const title = formState?.title?.trim()
    if (!title) {
      throw new Error('Title is required')
    }

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) throw new Error('Not authenticated')

    const row = buildRecipeRow(formState, user.id)

    if (formState.id) {
      await updateRecipe(formState.id, {
        title: row.title,
        description: row.description,
        meal_type: row.meal_type,
        prep_time_minutes: row.prep_time_minutes,
        cook_time_minutes: row.cook_time_minutes,
        total_time_minutes: row.total_time_minutes,
        servings: row.servings,
        ingredients_json: row.ingredients_json,
        instructions_json: row.instructions_json,
        ingredient_groups_json: row.ingredient_groups_json,
        instruction_groups_json: row.instruction_groups_json,
        source_url: row.source_url,
        source_domain: row.source_domain,
        image_url: row.image_url,
        ...(row.nutrition_json ? { nutrition_json: row.nutrition_json } : {}),
      })
      return
    }

    const { data, error } = await supabase.from('recipes').insert(row).select('id').single()
    if (error) throw new Error(error.message)
    return data
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
      const savedRecipe = await saveRecipe(form)
      let nutritionWarning = null
      if (!form.id && !form.nutrition && savedRecipe?.id) {
        try {
          const estimated = await supabase.functions.invoke('estimate-recipe-nutrition', {
            body: { recipeId: savedRecipe.id },
          })
          if (estimated?.error) {
            throw estimated.error
          }
          if (estimated?.data?.nutrition) {
            form.nutrition = estimated.data.nutrition
          } else {
            nutritionWarning = 'Recipe saved, but nutrition could not be generated yet.'
          }
        } catch (nutritionError) {
          nutritionWarning = nutritionError?.message || 'Recipe saved, but nutrition could not be generated yet.'
        }
      }
      toast.success(form.id ? 'Recipe updated!' : 'Recipe saved to your catalog!')
      if (nutritionWarning) {
        toast.error(nutritionWarning)
      }
      setShowSavePrompt(false)
      setError(null)
      if (!form.id) {
        setStep('url')
        setUrl('')
        setForm(null)
        setIsFromImport(false)
      }
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
            onEditFirst={() => setShowSavePrompt(false)}
          />
        ) : null}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-divider bg-surface px-4 py-3">
          <h2 className="font-display text-lg text-text-primary">
            {initialRecipe ? 'Edit Recipe' : isFromImport && step === 'preview' ? 'Review Imported Recipe' : 'Add Recipe'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
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
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-divider" />
                <span className="text-xs text-text-muted">or</span>
                <div className="flex-1 border-t border-divider" />
              </div>
              <button
                type="button"
                onClick={handleCreateManually}
                className="w-full rounded-xl border border-divider bg-white py-2 text-sm font-medium text-text-primary hover:bg-warm-50"
              >
                Create recipe manually
              </button>
            </div>
          )}

          {step === 'preview' && form && !showSavePrompt && (
            <div className="space-y-4">
              {isFromImport ? (
                <div className="space-y-3">
                  {previewRecipe?.imageUrl && (
                    <img
                      src={previewRecipe.imageUrl}
                      alt={previewRecipe.title}
                      className="w-full h-44 object-cover rounded-xl"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  )}
                  <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-800">
                    <span className="mt-0.5 shrink-0">✓</span>
                    <span>
                      Recipe imported successfully.
                      {previewRecipe?.sourceUrl ? (
                        <>
                          {' '}Source:{' '}
                          <a
                            href={previewRecipe.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {previewRecipe.sourceDomain || previewRecipe.sourceUrl}
                          </a>
                        </>
                      ) : null}
                      {' '}Review and edit the fields below, then save.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-warm-100 px-3 py-2 text-xs text-text-muted">
                  Fill in the fields below to add your recipe.
                </div>
              )}

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

              {isFromImport && previewRecipe ? (
                <div className="rounded-xl border border-divider bg-surface-card px-3 py-3 text-sm text-text-secondary">
                  <div className="font-medium text-text-primary">Import preview</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-text-muted">Ingredients</div>
                      <div className="mt-1 line-clamp-6 whitespace-pre-line">{form.ingredients_text || 'None found'}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-text-muted">Steps</div>
                      <div className="mt-1 line-clamp-6 whitespace-pre-line">{form.steps_text || 'None found'}</div>
                    </div>
                  </div>
                  {previewRecipe.nutrition ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-warm-100 px-2.5 py-1">{previewRecipe.nutrition.calories} cal</span>
                      <span className="rounded-full bg-warm-100 px-2.5 py-1">P {previewRecipe.nutrition.protein || '—'}</span>
                      <span className="rounded-full bg-warm-100 px-2.5 py-1">C {previewRecipe.nutrition.carbs || '—'}</span>
                      <span className="rounded-full bg-warm-100 px-2.5 py-1">F {previewRecipe.nutrition.fat || '—'}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

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

              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Source URL{' '}
                  <span className="font-normal text-text-muted">(optional)</span>
                </label>
                <input
                  type="url"
                  value={form.source_url}
                  onChange={(e) => set('source_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2 pb-2">
                {!initialRecipe ? (
                  <button
                    type="button"
                    onClick={() => { setStep('url'); setIsFromImport(false); setError(null) }}
                    className="btn-secondary flex-1"
                  >
                    {isFromImport ? '← Try different URL' : 'Back'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || !form.title?.trim()}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Saving…' : initialRecipe ? 'Save changes' : isFromImport ? 'Save & Close' : 'Save Recipe'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
