import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { deleteRecipe, listUserRecipes } from '../hooks/useRecipeMutations'
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
  const [minRating, setMinRating] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'favorites'>('newest')
  const [showClipModal, setShowClipModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
    return () => {
      cancelled = true
    }
  }, [user?.id, cuisine, minRating, favoritesOnly, sortBy, refreshKey])

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
    cooked_at: recipeRow.cooked_at,
    category: recipeRow.category,
  })), [recipes])

  const filteredRecipes = useMemo(() => {
    if (!search) return normalized
    const needle = search.toLowerCase()
    return normalized.filter((recipe) => {
      const titleMatch = String(recipe.title || '').toLowerCase().includes(needle)
      const ingredientMatch = (recipe.ingredientGroups || []).some((group) =>
        (group.ingredients || []).some((ingredient) => String(ingredient.item || ingredient.name || '').toLowerCase().includes(needle)),
      )
      return titleMatch || ingredientMatch
    })
  }, [normalized, search])

  const cuisines = useMemo(() => Array.from(new Set(normalized.map((recipe) => recipe.cuisine).filter(Boolean))).sort(), [normalized])

  useEffect(() => {
    window.requestAnimationFrame(() => searchRef.current?.focus())
  }, [])

  async function handleDelete(recipeId: string, title: string) {
    if (!window.confirm(`Remove “${title}” from your recipes?`)) return
    setDeletingId(recipeId)
    try {
      await deleteRecipe(recipeId)
      setRefreshKey((k) => k + 1)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="px-3 pb-24 pt-0 md:px-0">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400" />
          <h1 className="font-display text-2xl text-text-primary md:text-3xl">Recipes</h1>
          <p className="text-sm text-text-muted">See only the recipes you’ve imported, cooked, or favorited.</p>
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
            placeholder="Search recipes or ingredients"
            className="input w-full pl-[2.75rem] pr-4"
          />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-divider bg-surface p-3 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-4">
          <select className="input w-full" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
            <option value="">All cuisines</option>
            {cuisines.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
          <select className="input w-full" value={minRating} onChange={(e) => setMinRating(e.target.value)}>
            <option value="">Any rating</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5</option>
          </select>
          <select className="input w-full" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'newest' | 'rating' | 'favorites')}>
            <option value="newest">Newest</option>
            <option value="rating">Highest rated</option>
            <option value="favorites">Favorites first</option>
          </select>
          <label className="flex items-center justify-between rounded-xl border border-divider bg-white px-3 py-2 text-sm text-text-primary">
            Favorites only
            <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
          </label>
        </div>
      </div>

      {loading ? (
        <div className="card p-6 text-sm text-text-muted">Loading recipes...</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="card p-6 text-sm text-text-muted">
          No recipes match ‘{search}’
          {search ? (
            <button type="button" onClick={() => setSearchInput('')} className="ml-2 font-medium text-text-primary underline underline-offset-2">
              Clear search
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecipes.map((recipe) => {
            const tags = [recipe.tags.cuisine, recipe.tags.mealType, ...recipe.tags.dietary, ...(recipe.tags.cookingMethod || [])].filter(Boolean)

            return (
              <div key={recipe.id} className="card w-full p-4 text-left shadow-sm transition-shadow duration-200 hover:shadow-md">
                <button
                  type="button"
                  onClick={() => navigate(`/recipes/${recipe.slug || recipe.id}`)}
                  className="block w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        {recipe.imageUrl ? (
                          <img src={recipe.imageUrl} alt={recipe.title} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <h2 className="font-display text-xl text-text-primary">{recipe.title}</h2>
                          <p className="mt-1 text-sm text-text-secondary">{recipe.description}</p>
                          {recipe.sourceNote ? <p className="mt-2 text-xs text-text-muted">{recipe.sourceNote}</p> : null}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-600">
                      {recipe.difficulty}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                    {recipe.tags.cuisine ? <span className="rounded-full bg-warm-100 px-3 py-1">{recipe.tags.cuisine}</span> : null}
                    <span className="rounded-full bg-warm-100 px-3 py-1">Prep {recipe.prepTime} min</span>
                    <span className="rounded-full bg-warm-100 px-3 py-1">Cook {recipe.cookTime} min</span>
                    <span className="rounded-full bg-warm-100 px-3 py-1">Total {recipe.totalTime} min</span>
                    <span className="rounded-full bg-warm-100 px-3 py-1">{recipe.yield || 'Yield varies'}</span>
                  </div>

                  {recipe.tips.length > 0 ? <p className="mt-3 text-sm text-text-secondary">{recipe.tips[0]}</p> : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-divider bg-white px-3 py-1 text-xs font-medium text-text-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>

                {recipe.user_id === user?.id ? (
                  <div className="mt-4 flex gap-3 border-t border-divider pt-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/recipes/${recipe.slug || recipe.id}`)}
                      className="text-sm font-medium text-text-primary"
                    >
                      Edit recipe
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(recipe.id, recipe.title)}
                      disabled={deletingId === recipe.id}
                      className="text-sm font-medium text-red-600 disabled:opacity-50"
                    >
                      {deletingId === recipe.id ? 'Removing…' : 'Remove recipe'}
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
