import { useMemo, useState, useEffect } from 'react'
import { normalizeRecipe } from '../lib/recipeSchema'
import { createClient } from '@supabase/supabase-js'
import { markCooked, rateRecipe, toggleFavorite } from '../hooks/useRecipeMutations'

// Pexels image fetcher
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rvgtmletsbycrbeycwus.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

async function fetchRecipeImage(dishName) {
  if (!supabase || !supabaseAnonKey) return { imageUrl: null, photographer: null, pexelsLink: null };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${supabaseUrl}/functions/v1/fetch-recipe-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ query: dishName }),
      }
    );
    return await res.json();
  } catch { return { imageUrl: null, photographer: null, pexelsLink: null }; }
}

function HeartIcon({ filled = false }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20.5l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.68L12 20.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function StarIcon({ filled = false }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3.75l2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 16.77l-5.1 2.68.97-5.68L3.75 9.75l5.7-.83L12 3.75z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function Chevron({ expanded }) {
  return (
    <svg
      className={`h-5 w-5 text-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CollapsibleSection({ title, expanded, onToggle, children, defaultOpen = false }) {
  return (
    <section className="rounded-[28px] border border-divider bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <h3 className="font-display text-2xl text-text-primary">{title}</h3>
        <Chevron expanded={expanded} />
      </button>
      <div className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${expanded || defaultOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 px-5 pb-5">{children}</div>
      </div>
    </section>
  )
}

export function RecipeDetail({ meal, onClose }) {
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
    substitutions: meal?.substitutions,
    nutrition: meal?.nutrition,
    tags: meal?.recipeTags,
    sourceNote: meal?.sourceNote,
    imagePrompt: meal?.imagePrompt,
  }), [meal])

  const [imageUrl, setImageUrl] = useState(null);
  const [photographer, setPhotographer] = useState(null);
  const [isFavorite, setIsFavorite] = useState(Boolean(meal?.is_favorite ?? meal?.isFavorite))
  const [rating, setRating] = useState(meal?.rating ?? null)
  const [cookedAt, setCookedAt] = useState(meal?.cooked_at || meal?.cookedAt || '')
  const [ratingFocus, setRatingFocus] = useState(false)

  useEffect(() => {
    if (recipe.title) {
      fetchRecipeImage(recipe.title).then((result) => {
        if (result.imageUrl) {
          setImageUrl(result.imageUrl);
          setPhotographer(result.photographer);
        }
      });
    }
  }, [recipe.title]);

  const [sections, setSections] = useState({
    ingredients: true,
    instructions: true,
    substitutions: false,
    notes: false,
    nutrition: false,
  })
  const [checkedIngredients, setCheckedIngredients] = useState({})

  const toggleSection = (key) => setSections((current) => ({ ...current, [key]: !current[key] }))
  const toggleIngredient = (key) => setCheckedIngredients((current) => ({ ...current, [key]: !current[key] }))

  const tagPills = [
    recipe.tags.cuisine,
    recipe.tags.mealType,
    ...(recipe.tags.dietary || []),
    ...(recipe.tags.cookingMethod || []),
    recipe.tags.season,
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-[#faf7f2] text-text-primary">
      <div className="sticky top-0 z-20 border-b border-black/5 bg-[#faf7f2]/90 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-text-primary">← Back</button>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">Recipe</div>
          <div className="w-12" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <header className="rounded-[32px] bg-white px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          {imageUrl ? (
            <div className="mb-4">
              <img src={imageUrl} alt={recipe.title} className="h-48 w-full rounded-t-2xl object-cover" loading="lazy" />
              {photographer && <p className="px-1 pt-1 text-xs text-gray-400">Photo by {photographer} on Pexels</p>}
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">Allio Recipe</div>
              <h1 className="mt-3 font-display text-4xl leading-tight text-text-primary sm:text-5xl">{recipe.title}</h1>
            </div>
            <button
              type="button"
              aria-label={isFavorite ? 'Remove favorite' : 'Mark favorite'}
              onClick={async () => {
                const next = !isFavorite
                setIsFavorite(next)
                try {
                  await toggleFavorite(recipe.id, next)
                } catch {
                  setIsFavorite(!next)
                }
              }}
              className="rounded-full border border-divider bg-white p-3 text-primary-500 shadow-sm"
            >
              <HeartIcon filled={isFavorite} />
            </button>
          </div>
          {recipe.description ? <p className="mt-4 max-w-2xl text-[15px] leading-7 text-text-secondary">{recipe.description}</p> : null}

          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <span className="rounded-full bg-warm-50 px-3 py-1.5">Prep {recipe.prepTime || 0} min</span>
            <span className="rounded-full bg-warm-50 px-3 py-1.5">Cook {recipe.cookTime || 0} min</span>
            <span className="rounded-full bg-warm-50 px-3 py-1.5">Total {recipe.totalTime || recipe.prepTime + recipe.cookTime} min</span>
            {recipe.yield ? <span className="rounded-full bg-warm-50 px-3 py-1.5">{recipe.yield}</span> : null}
            <span className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 font-semibold text-primary-700">{recipe.difficulty}</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                await markCooked(recipe.id)
                setCookedAt(new Date().toISOString())
                setRatingFocus(true)
              }}
              className="rounded-full border border-divider bg-white px-4 py-2 text-sm font-medium text-text-primary"
            >
              {cookedAt ? 'Cooked again' : 'I cooked this'}
            </button>
          </div>

          {(cookedAt || ratingFocus) ? (
            <div className="mt-4 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={async () => {
                    setRating(value)
                    await rateRecipe(recipe.id, value)
                  }}
                  className="text-amber-500"
                  aria-label={`Rate ${value} stars`}
                >
                  <StarIcon filled={(rating || 0) >= value} />
                </button>
              ))}
            </div>
          ) : null}

          {tagPills.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {tagPills.map((tag) => (
                <span key={tag} className="rounded-full border border-divider bg-white px-3 py-1 text-xs font-medium text-text-secondary">{tag}</span>
              ))}
            </div>
          ) : null}
        </header>

        <div className="mt-6 space-y-4">
          <CollapsibleSection title="Ingredients" expanded={sections.ingredients} onToggle={() => toggleSection('ingredients')}>
            <div className="space-y-5">
              {recipe.ingredientGroups.map((group, groupIndex) => (
                <div key={`${group.label || 'ingredients'}-${groupIndex}`}>
                  {group.label ? <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{group.label}</div> : null}
                  <ul className="space-y-3">
                    {group.ingredients.map((ingredient, index) => {
                      const key = `${groupIndex}-${index}-${ingredient.item}`
                      const checked = Boolean(checkedIngredients[key])
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => toggleIngredient(key)}
                            className={`flex w-full items-start gap-3 rounded-2xl px-1 py-1 text-left transition ${checked ? 'opacity-45' : 'opacity-100'}`}
                          >
                            <span className={`mt-1 h-5 w-5 shrink-0 rounded-full border ${checked ? 'border-primary-500 bg-primary-500' : 'border-divider bg-white'}`} />
                            <span className={`block text-[15px] leading-7 ${checked ? 'line-through' : ''}`}>
                              <strong className="font-semibold text-text-primary">{[ingredient.amount, ingredient.unit].filter(Boolean).join(' ')}</strong>
                              {ingredient.amount || ingredient.unit ? ' ' : ''}
                              <span className="text-text-primary">{ingredient.item}</span>
                              {ingredient.note ? <span className="text-text-secondary"> ({ingredient.note})</span> : null}
                              {ingredient.optional ? <span className="text-text-muted"> (optional)</span> : null}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Instructions" expanded={sections.instructions} onToggle={() => toggleSection('instructions')}>
            <div className="space-y-6">
              {(() => {
                let stepCounter = 0
                return recipe.instructionGroups.map((group, groupIndex) => (
                  <div key={`${group.label || 'instructions'}-${groupIndex}`}>
                    {group.label ? <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{group.label}</div> : null}
                    <div className="space-y-6">
                      {group.steps.map((step, index) => {
                        stepCounter += 1
                        return (
                          <div key={`${step.text}-${index}`} className="flex gap-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warm-100 text-sm font-semibold text-text-primary">{stepCounter}</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[16px] leading-8 text-text-primary">{step.text}</p>
                              {step.tip ? (
                                <div className="mt-3 rounded-2xl bg-[#f4efe6] px-4 py-3 text-sm leading-6 text-text-secondary">
                                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">💡 Tip</div>
                                  {step.tip}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          </CollapsibleSection>

          {recipe.substitutions?.length > 0 ? (
            <CollapsibleSection title="Substitutions" expanded={sections.substitutions} onToggle={() => toggleSection('substitutions')}>
              <ul className="space-y-3 text-[15px] leading-7 text-text-primary">
                {recipe.substitutions.map((substitution, index) => (
                  <li key={`${substitution.original}-${index}`} className="rounded-2xl bg-warm-50 px-4 py-3">
                    Instead of <span className="font-semibold">{substitution.original}</span>, use <span className="font-semibold">{substitution.substitute}</span>
                    {substitution.note ? <span className="text-text-secondary"> ({substitution.note})</span> : null}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          ) : null}

          {recipe.tips?.length > 0 ? (
            <CollapsibleSection title="Cook’s Notes" expanded={sections.notes} onToggle={() => toggleSection('notes')}>
              <ul className="space-y-3 pl-5 text-[15px] leading-7 text-text-primary">
                {recipe.tips.map((tip, index) => (
                  <li key={`${tip}-${index}`} className="list-disc marker:text-text-muted">{tip}</li>
                ))}
              </ul>
            </CollapsibleSection>
          ) : null}

          {recipe.nutrition ? (
            <CollapsibleSection title="Nutrition (per serving)" expanded={sections.nutrition} onToggle={() => toggleSection('nutrition')}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-warm-50 px-4 py-3"><div className="text-xs uppercase tracking-wide text-text-muted">Calories</div><div className="mt-1 text-lg font-semibold text-text-primary">{recipe.nutrition.calories || '—'}</div></div>
                <div className="rounded-2xl bg-warm-50 px-4 py-3"><div className="text-xs uppercase tracking-wide text-text-muted">Protein</div><div className="mt-1 text-lg font-semibold text-text-primary">{recipe.nutrition.protein || '—'}</div></div>
                <div className="rounded-2xl bg-warm-50 px-4 py-3"><div className="text-xs uppercase tracking-wide text-text-muted">Carbs</div><div className="mt-1 text-lg font-semibold text-text-primary">{recipe.nutrition.carbs || '—'}</div></div>
                <div className="rounded-2xl bg-warm-50 px-4 py-3"><div className="text-xs uppercase tracking-wide text-text-muted">Fat</div><div className="mt-1 text-lg font-semibold text-text-primary">{recipe.nutrition.fat || '—'}</div></div>
              </div>
              <p className="mt-3 text-xs text-text-muted">Approximate values</p>
            </CollapsibleSection>
          ) : null}
        </div>
      </div>
    </div>
  )
}
