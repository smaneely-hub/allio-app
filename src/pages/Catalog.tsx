import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listUserRecipes } from '../hooks/useRecipeMutations'
import { normalizeRecipe } from '../lib/recipeSchema'

export function Catalog() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [minRating, setMinRating] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'rating' | 'favorites'>('newest')

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput), 200)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listUserRecipes({
      cuisine: cuisine || undefined,
      minRating: minRating ? Number(minRating) : undefined,
      favoritesOnly,
      sortBy,
      search: search || undefined,
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
  }, [cuisine, minRating, favoritesOnly, sortBy, search])

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
    sourceNote: recipeRow.source_note,
    imagePrompt: recipeRow.image_prompt,
    image_url: recipeRow.image_url,
    is_favorite: recipeRow.is_favorite,
    rating: recipeRow.rating,
    cooked_at: recipeRow.cooked_at,
    category: recipeRow.category,
  })), [recipes])

  const cuisines = useMemo(() => Array.from(new Set(normalized.map((recipe) => recipe.cuisine).filter(Boolean))).sort(), [normalized])

  return (
    <div className="px-3 pb-24 pt-0 md:px-0">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-text-primary">My Recipes</h1>
          <p className="text-sm text-text-muted">{normalized.length} recipes</p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-divider bg-surface p-3 shadow-sm">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search recipes..."
          className="input w-full"
        />

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
        <div className="card mt-4 p-6 text-sm text-text-muted">Loading recipes...</div>
      ) : normalized.length === 0 ? (
        <div className="card mt-4 p-6 text-sm text-text-muted">No recipes yet — clip one or generate one to get started.</div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {normalized.map((recipe) => (
            <button
              key={recipe.id}
              type="button"
              onClick={() => navigate(`/recipes/${recipe.slug || recipe.id}`)}
              className="card overflow-hidden p-0 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              {recipe.imageUrl ? (
                <img src={recipe.imageUrl} alt={recipe.title} className="h-40 w-full object-cover" />
              ) : null}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl text-text-primary">{recipe.title}</h2>
                  {recipe.isFavorite ? <span className="text-lg text-primary-500">♥</span> : null}
                </div>
                {recipe.cuisine ? <p className="mt-1 text-sm text-text-secondary">{recipe.cuisine}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                  {recipe.rating ? <span className="rounded-full bg-warm-100 px-3 py-1">★ {recipe.rating}</span> : null}
                  <span className="rounded-full bg-warm-100 px-3 py-1">Prep {recipe.prepTime} min</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
