import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchShare } from '../lib/sharing'
import { formatIngredientAmount } from '../utils/formatFractions'

// ─── Small icon components ────────────────────────────────────────────────────

function ChevronIcon({ expanded }) {
  return (
    <svg
      className={`h-5 w-5 text-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20" fill="none"
    >
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Collapsible section (mirrors RecipeDetail style) ─────────────────────────

function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="rounded-[24px] border border-divider bg-surface-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <h3 className="font-display text-xl text-text-primary">{title}</h3>
        <ChevronIcon expanded={open} />
      </button>
      <div className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 px-5 pb-5">{children}</div>
      </div>
    </section>
  )
}

// ─── Single recipe view (read-only) ──────────────────────────────────────────

function SharedRecipe({ recipe, collapsed = false }) {
  const [open, setOpen] = useState(!collapsed)

  const tags = [
    recipe.tags?.cuisine,
    recipe.tags?.mealType,
    ...(recipe.tags?.dietary || []),
    ...(recipe.tags?.cookingMethod || []),
  ].filter(Boolean)

  const ingredientGroups = Array.isArray(recipe.ingredientGroups) ? recipe.ingredientGroups : []
  const instructionGroups = Array.isArray(recipe.instructionGroups) ? recipe.instructionGroups : []
  const tips = Array.isArray(recipe.tips) ? recipe.tips : []
  const substitutions = Array.isArray(recipe.substitutions) ? recipe.substitutions : []

  return (
    <div className="overflow-hidden rounded-[28px] bg-surface-card shadow-lg">
      {/* Header — always visible */}
      <div className="px-5 py-5">
        {recipe.imageUrl ? (
          <div className="mb-4 overflow-hidden rounded-2xl">
            <img src={recipe.imageUrl} alt={recipe.title} className="h-56 w-full object-cover" loading="lazy" />
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">Allio Recipe</div>
            <h2 className={`mt-2 font-display leading-tight text-text-primary ${collapsed ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>{recipe.title}</h2>
          </div>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="shrink-0 rounded-full border border-divider bg-bg-soft px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-warm-100"
            >
              {open ? 'Collapse' : 'View recipe'}
            </button>
          ) : null}
        </div>

        {recipe.description ? (
          <p className="mt-3 text-[15px] leading-7 text-text-secondary">{recipe.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          {recipe.prepTime ? <span className="rounded-full bg-warm-100 px-3 py-1.5">Prep {recipe.prepTime} min</span> : null}
          {recipe.cookTime ? <span className="rounded-full bg-warm-100 px-3 py-1.5">Cook {recipe.cookTime} min</span> : null}
          {recipe.totalTime ? <span className="rounded-full bg-warm-100 px-3 py-1.5">Total {recipe.totalTime} min</span> : null}
          {recipe.yield ? <span className="rounded-full bg-warm-100 px-3 py-1.5">{recipe.yield}</span> : null}
          {recipe.difficulty ? (
            <span className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 font-semibold text-primary-700">{recipe.difficulty}</span>
          ) : null}
        </div>

        {tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full border border-divider bg-bg-soft px-3 py-1 text-xs font-medium text-text-secondary">{tag}</span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Expandable body */}
      <div className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${open || !collapsed ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0">
          <div className="space-y-4 px-5 pb-5">
            {/* Ingredients */}
            {ingredientGroups.length > 0 ? (
              <CollapsibleSection title="Ingredients" defaultOpen>
                <div className="space-y-5">
                  {ingredientGroups.map((group, gi) => (
                    <div key={gi}>
                      {group.label ? (
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{group.label}</div>
                      ) : null}
                      <ul className="space-y-3">
                        {(group.ingredients || []).map((ing, ii) => {
                          const amt = formatIngredientAmount(ing.amount)
                          return (
                            <li key={ii} className="flex items-start gap-3 text-[15px] leading-7">
                              <span className="mt-1 h-5 w-5 shrink-0 rounded-full border border-divider bg-bg-soft" />
                              <span>
                                <strong className="font-semibold text-text-primary">{[amt, ing.unit].filter(Boolean).join(' ')}</strong>
                                {amt || ing.unit ? ' ' : ''}
                                <span className="text-text-primary">{ing.item}</span>
                                {ing.note ? <span className="text-text-secondary"> ({ing.note})</span> : null}
                                {ing.optional ? <span className="text-text-muted"> (optional)</span> : null}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            ) : null}

            {/* Instructions */}
            {instructionGroups.length > 0 ? (
              <CollapsibleSection title="Instructions" defaultOpen>
                <div className="space-y-6">
                  {(() => {
                    let step = 0
                    return instructionGroups.map((group, gi) => (
                      <div key={gi}>
                        {group.label ? (
                          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{group.label}</div>
                        ) : null}
                        <div className="space-y-6">
                          {(group.steps || []).map((s, si) => {
                            step += 1
                            const n = step
                            return (
                              <div key={si} className="flex gap-4">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warm-100 text-sm font-semibold text-text-primary">{n}</div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[15px] leading-7 text-text-primary">{s.text}</p>
                                  {s.tip ? (
                                    <div className="mt-3 rounded-2xl bg-warm-100 px-4 py-3 text-sm leading-6 text-text-secondary">
                                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Tip</div>
                                      {s.tip}
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
            ) : null}

            {/* Substitutions */}
            {substitutions.length > 0 ? (
              <CollapsibleSection title="Substitutions">
                <ul className="space-y-3 text-[15px] leading-7 text-text-primary">
                  {substitutions.map((sub, i) => (
                    <li key={i} className="rounded-2xl bg-warm-100 px-4 py-3">
                      Instead of <span className="font-semibold">{sub.original}</span>, use <span className="font-semibold">{sub.substitute}</span>
                      {sub.note ? <span className="text-text-secondary"> ({sub.note})</span> : null}
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            ) : null}

            {/* Cook's Notes */}
            {tips.length > 0 ? (
              <CollapsibleSection title="Cook's Notes">
                <ul className="space-y-3 pl-5 text-[15px] leading-7 text-text-primary">
                  {tips.map((tip, i) => (
                    <li key={i} className="list-disc marker:text-text-muted">{tip}</li>
                  ))}
                </ul>
              </CollapsibleSection>
            ) : null}

            {/* Nutrition */}
            {recipe.nutrition ? (
              <CollapsibleSection title="Nutrition (per serving)">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {recipe.nutrition.calories ? (
                    <div className="rounded-2xl bg-warm-100 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-text-muted">Calories</div>
                      <div className="mt-1 text-lg font-semibold text-text-primary">{recipe.nutrition.calories}</div>
                    </div>
                  ) : null}
                  {recipe.nutrition.protein ? (
                    <div className="rounded-2xl bg-warm-100 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-text-muted">Protein</div>
                      <div className="mt-1 text-lg font-semibold text-text-primary">{recipe.nutrition.protein}</div>
                    </div>
                  ) : null}
                  {recipe.nutrition.carbs ? (
                    <div className="rounded-2xl bg-warm-100 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-text-muted">Carbs</div>
                      <div className="mt-1 text-lg font-semibold text-text-primary">{recipe.nutrition.carbs}</div>
                    </div>
                  ) : null}
                  {recipe.nutrition.fat ? (
                    <div className="rounded-2xl bg-warm-100 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-text-muted">Fat</div>
                      <div className="mt-1 text-lg font-semibold text-text-primary">{recipe.nutrition.fat}</div>
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-text-muted">Approximate values per serving.</p>
              </CollapsibleSection>
            ) : null}

            {/* Source note */}
            {recipe.sourceNote ? (
              <p className="text-xs text-text-muted">{recipe.sourceNote}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Allio brand bar ──────────────────────────────────────────────────────────

function AllioBar() {
  return (
    <div className="sticky top-0 z-20 border-b border-divider bg-bg-soft/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <span className="font-display text-xl font-bold text-text-primary">Allio</span>
        <Link
          to="/login"
          className="rounded-full bg-primary-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-primary-600"
        >
          Get Allio
        </Link>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SharedPage() {
  const { token } = useParams()
  const [state, setState] = useState('loading') // loading | found | notfound
  const [share, setShare] = useState(null)

  useEffect(() => {
    if (!token) { setState('notfound'); return }
    let cancelled = false
    fetchShare(token).then((data) => {
      if (cancelled) return
      if (data) { setShare(data); setState('found') }
      else setState('notfound')
    })
    return () => { cancelled = true }
  }, [token])

  const recipes = share?.snapshot_json?.recipes ?? []
  const isFavorites = share?.share_type === 'favorites'

  return (
    <div className="min-h-screen bg-bg-soft text-text-primary">
      <AllioBar />

      <div className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        {state === 'loading' && (
          <div className="py-16 text-center text-sm text-text-muted">Loading…</div>
        )}

        {state === 'notfound' && (
          <div className="rounded-[28px] bg-surface-card px-6 py-10 text-center shadow-lg">
            <div className="mb-3 text-4xl">🔗</div>
            <h1 className="font-display text-2xl text-text-primary">Link not found</h1>
            <p className="mt-2 text-sm text-text-secondary">This share link may have expired or been removed.</p>
            <Link to="/" className="mt-5 inline-block rounded-full bg-primary-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-primary-600">
              Go to Allio
            </Link>
          </div>
        )}

        {state === 'found' && recipes.length === 0 && (
          <div className="rounded-[28px] bg-surface-card px-6 py-10 text-center shadow-lg">
            <p className="text-sm text-text-muted">No recipes in this share.</p>
          </div>
        )}

        {state === 'found' && recipes.length > 0 && (
          <>
            {isFavorites && (
              <div className="mb-5">
                <div className="mb-1 h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400" />
                <h1 className="font-display text-2xl text-text-primary">Shared Favorites</h1>
                <p className="mt-1 text-sm text-text-muted">{recipes.length} recipe{recipes.length === 1 ? '' : 's'}</p>
              </div>
            )}

            <div className="space-y-5">
              {recipes.map((recipe, i) => (
                <SharedRecipe key={i} recipe={recipe} collapsed={isFavorites && recipes.length > 1} />
              ))}
            </div>

            <div className="mt-10 rounded-[24px] bg-surface-card px-5 py-5 text-center shadow-sm">
              <p className="font-display text-lg text-text-primary">Want to save and track your own recipes?</p>
              <p className="mt-1 text-sm text-text-secondary">Allio helps you plan meals, track nutrition, and build your recipe collection.</p>
              <Link
                to="/"
                className="mt-4 inline-block rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
              >
                Try Allio free
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
