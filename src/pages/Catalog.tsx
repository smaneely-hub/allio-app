import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { deleteRecipe, listUserRecipes, toggleFavorite } from '../hooks/useRecipeMutations'
import { normalizeRecipe } from '../lib/recipeSchema'
import { ClipRecipeModal } from '../components/ClipRecipeModal'
import { useAuth } from '../hooks/useAuth'

function SearchIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

function HeartIcon({ filled = false, className = '' }: { filled?: boolean; className?: string }) {
  return (
    <svg
      className={`h-4 w-4 ${className}`}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    >
      <path d="M12 20.5l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.68L12 20.5z" />
    </svg>
  )
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M12 3.75l2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 16.77l-5.1 2.68.97-5.68L3.75 9.75l5.7-.83L12 3.75z" />
    </svg>
  )
}

type SortOption = 'newest' | 'rating' | 'favorites' | 'most_cooked' | 'az'

export function Catalog() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(initialQuery)
  const [search, setSearch] = useState(initialQuery)
  const [cuisine, setCuisine] = useState('')
  const [mealType, setMealType] = useState('')
  const [minRating, setMinRating] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showClipModal, setShowClipModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput.trim()), 200)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (search) next.set('q', search)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }, [search, searchParams, setSearchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listUserRecipes({
      userId: user?.id,
      cuisine: cuisine || undefined,
      mealType: mealType || undefined,
      minRating: minRating ? Number(minRating) : undefined,
      favoritesOnly,
      sortBy,
    })
      .then((data) => {
        if (!cancelled) setRecipes(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id, cuisine, mealType, minRating, favoritesOnly, sortBy, refreshKey])

  const normalized = useMemo(() => recipes.map((recipeRow) => normalizeRecipe({
    ...recipeRow,
    yield: recipeRow.yield_text,
    prepTime: recipeRow.prep_time_minutes,
    cookTime: recipeRow.cook_time_minutes,
    totalTime: recipeRow.total_time_minutes,
    ingredientGroups: recipeRow.ingredient_groups_json,
    instructionGroups: recipeRow.instruction_groups_json,
    ingredients: recipeRow.ingredients_json,
    instructions: recipeRow.instructions_json,
    substitutions: recipeRow.substitutions_json,
    tags: recipeRow.tags_v2_json,
    dietary_flags_json: recipeRow.dietary_flags_json,
    tips: recipeRow.tips_json,
    nutrition: recipeRow.nutrition_json,
    sourceNote: recipeRow.source_note,
    imagePrompt: recipeRow.image_prompt,
    image_url: recipeRow.image_url,
    is_favorite: recipeRow.is_favorite,
    rating: recipeRow.rating,
    times_cooked: recipeRow.times_cooked,
    last_cooked_at: recipeRow.last_cooked_at,
  })), [recipes])

  const filteredRecipes = useMemo(() => {
    if (!search) return normalized
    const needle = search.toLowerCase()
    return normalized.filter((recipe) => {
      const titleMatch = String(recipe.title || '').toLowerCase().includes(needle)
      const ingredientMatch = (recipe.ingredientGroups || []).some((group: any) =>
        (group.ingredients || []).some((ingredient: any) =>
          String(ingredient.item || ingredient.name || '').toLowerCase().includes(needle),
        ),
      )
      return titleMatch || ingredientMatch
    })
  }, [normalized, search])

  const cuisines = useMemo(() => Array.from(new Set(normalized.map((r: any) => r.cuisine).filter(Boolean))).sort() as string[], [normalized])
  const mealTypes = useMemo(() => Array.from(new Set(normalized.map((r: any) => r.tags?.mealType).filter(Boolean))).sort() as string[], [normalized])

  useEffect(() => {
    window.requestAnimationFrame(() => searchRef.current?.focus())
  }, [])

  async function handleDelete(recipeId: string, title: string) {
    if (!window.confirm(`Remove "${title}" from your recipes?`)) return
    setDeletingId(recipeId)
    try {
      await deleteRecipe(recipeId)
      setRefreshKey((k) => k + 1)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggleFavorite(e: React.MouseEvent, recipeId: string, currentFav: boolean) {
    e.stopPropagation()
    setTogglingFavorite(recipeId)
    try {
      await toggleFavorite(recipeId, !currentFav)
      setRecipes((prev) => prev.map((r) => r.id === recipeId ? { ...r, is_favorite: !currentFav } : r))
    } finally {
      setTogglingFavorite(null)
    }
  }

  const hasActiveFilters = cuisine || mealType || minRating || favoritesOnly || sortBy !== 'newest'

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400" />
          <h1 className="font-display text-2xl text-text-primary md:text-3xl">Recipes</h1>
          <p className="text-sm text-text-muted">Your imported, cooked, and favorited recipes.</p>
        </div>
        <button type="button" onClick={() => setShowClipModal(true)} className="btn-primary shrink-0 text-sm">
          + Add Recipe
        </button>
      </div>

      <div className="mb-4 max-w-md">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            ref={searchRef}
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search recipes or ingredients…"
            className="input w-full pl-[2.75rem] pr-4"
          />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-divider bg-surface-card p-3 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          <select className="input w-full" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
            <option value="">All cuisines</option>
            {cuisines.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
          <select className="input w-full" value={mealType} onChange={(e) => setMealType(e.target.value)}>
            <option value="">All meal types</option>
            {mealTypes.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
          <select className="input w-full" value={minRating} onChange={(e) => setMinRating(e.target.value)}>
            <option value="">Any rating</option>
            <option value="3">3+ stars</option>
            <option value="4">4+ stars</option>
            <option value="5">5 stars only</option>
          </select>
          <select
            className="input w-full"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="newest">Newest first</option>
            <option value="az">A – Z</option>
            <option value="rating">Highest rated</option>
            <option value="most_cooked">Most cooked</option>
            <option value="favorites">Favorites first</option>
          </select>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-divider bg-surface-card px-3 py-2 text-sm text-text-primary sm:col-span-2 md:col-span-1">
            Favorites only
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => setFavoritesOnly(e.target.checked)}
              className="h-4 w-4 accent-primary-500"
            />
          </label>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { setCuisine(''); setMealType(''); setMinRating(''); setFavoritesOnly(false); setSortBy('newest') }}
            className="mt-2 text-xs font-medium text-primary-500 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-text-muted">Loading recipes…</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="card p-8 text-center">
          {favoritesOnly ? (
            <>
              <div className="mb-2 text-3xl">♡</div>
              <p className="font-medium text-text-primary">No favorites yet</p>
              <p className="mt-1 text-sm text-text-muted">Open a recipe and tap the heart to save it here.</p>
              <button type="button" onClick={() => setFavoritesOnly(false)} className="mt-3 text-sm font-medium text-primary-500 hover:underline">
                Show all recipes
              </button>
            </>
          ) : search || cuisine || mealType || minRating ? (
            <>
              <p className="font-medium text-text-primary">No recipes match</p>
              <p className="mt-1 text-sm text-text-muted">Try adjusting your search or filters.</p>
              <button
                type="button"
                onClick={() => { setSearchInput(''); setCuisine(''); setMealType(''); setMinRating('') }}
                className="mt-3 text-sm font-medium text-primary-500 hover:underline"
              >
                Clear search &amp; filters
              </button>
            </>
          ) : (
            <>
              <p className="font-medium text-text-primary">No recipes yet</p>
              <p className="mt-1 text-sm text-text-muted">Add your first recipe to get started.</p>
              <button type="button" onClick={() => setShowClipModal(true)} className="mt-3 btn-primary text-sm">
                + Add Recipe
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecipes.map((recipe) => {
            const tags = [
              recipe.tags?.cuisine,
              recipe.tags?.mealType,
              ...(recipe.tags?.dietary || []),
              ...(recipe.tags?.cookingMethod || []),
            ].filter(Boolean)
            const isFav = Boolean(recipe.isFavorite ?? recipe.is_favorite)
            const rating = recipe.rating ?? null
            const timesCooked = recipe.timesCooked ?? recipe.times_cooked ?? 0

            return (
              <div
                key={recipe.id}
                className="card relative w-full p-4 text-left shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                {/* Favorite toggle — top-right */}
                <button
                  type="button"
                  aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  onClick={(e) => handleToggleFavorite(e, recipe.id, isFav)}
                  disabled={togglingFavorite === recipe.id}
                  className={`absolute right-3 top-3 rounded-full p-2 transition ${isFav ? 'text-red-400 hover:text-red-500' : 'text-text-muted hover:text-red-400'} disabled:opacity-40`}
                >
                  <HeartIcon filled={isFav} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/recipes/${recipe.slug || recipe.id}`)}
                  className="block w-full pr-10 text-left"
                >
                  <div className="flex items-start gap-3">
                    {recipe.imageUrl ? (
                      <img src={recipe.imageUrl} alt={recipe.title} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-xl text-text-primary">{recipe.title}</h2>
                      {recipe.description ? <p className="mt-1 text-sm text-text-secondary line-clamp-2">{recipe.description}</p> : null}
                      {recipe.sourceNote ? <p className="mt-1 text-xs text-text-muted">{recipe.sourceNote}</p> : null}
                    </div>
                  </div>

                  {/* Meta pills */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                    {recipe.tags?.cuisine ? (
                      <span className="rounded-full bg-warm-100 px-3 py-1">{recipe.tags.cuisine}</span>
                    ) : null}
                    {recipe.prepTime ? <span className="rounded-full bg-warm-100 px-3 py-1">Prep {recipe.prepTime} min</span> : null}
                    {recipe.cookTime ? <span className="rounded-full bg-warm-100 px-3 py-1">Cook {recipe.cookTime} min</span> : null}
                    {recipe.yield ? <span className="rounded-full bg-warm-100 px-3 py-1">{recipe.yield}</span> : null}
                    {timesCooked > 0 ? (
                      <span className="rounded-full bg-warm-100 px-3 py-1">Cooked {timesCooked}×</span>
                    ) : null}
                  </div>

                  {/* Star rating display */}
                  {rating ? (
                    <div className="mt-2 flex items-center gap-0.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((v) => <StarIcon key={v} filled={rating >= v} />)}
                      <span className="ml-1.5 text-xs text-text-muted">{rating}/5</span>
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="rounded-full border border-divider bg-surface-card px-3 py-1 text-xs font-medium text-text-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>

                {recipe.user_id === user?.id ? (
                  <div className="mt-3 flex gap-3 border-t border-divider pt-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/recipes/${recipe.slug || recipe.id}`)}
                      className="text-sm font-medium text-text-primary"
                    >
                      View / Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(recipe.id, recipe.title)}
                      disabled={deletingId === recipe.id}
                      className="text-sm font-medium text-red-600 disabled:opacity-50"
                    >
                      {deletingId === recipe.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {showClipModal && (
        <ClipRecipeModal
          onClose={() => setShowClipModal(false)}
          onSaved={() => {
            setShowClipModal(false)
            setRefreshKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}
