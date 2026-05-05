import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { listUserRecipes, toggleFavorite } from '../../hooks/useRecipeMutations'
import { useAuth } from '../../hooks/useAuth'

type RecipeRow = {
  id: string
  title: string
  cuisine?: string | null
  meal_type?: string | null
  image_url?: string | null
  is_favorite?: boolean | null
}

type Props = {
  open: boolean
  onClose: () => void
  onPick: (recipe: RecipeRow) => Promise<void> | void
}

const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
] as const

function CloseIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function HeartIcon({ filled = false, ...props }: any) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m12 21-1.45-1.32C5.4 15.04 2 11.95 2 8.15 2 5.06 4.42 2.65 7.5 2.65c1.74 0 3.41.81 4.5 2.09 1.09-1.28 2.76-2.09 4.5-2.09 3.08 0 5.5 2.41 5.5 5.5 0 3.8-3.4 6.89-8.55 11.54Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CatalogPickerModal({ open, onClose, onPick }: Props) {
  const { user } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null)
  const [selectedCuisine, setSelectedCuisine] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [recipes, setRecipes] = useState<RecipeRow[]>([])
  const [allRecipes, setAllRecipes] = useState<RecipeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput), 200)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    if (!open || !user?.id) return
    let cancelled = false
    setLoading(true)

    const options = {
      userId: user.id,
      search: search || undefined,
      mealType: selectedMealType || undefined,
      cuisine: selectedCuisine || undefined,
      favoritesOnly,
    }

    Promise.all([
      listUserRecipes({ userId: user.id }),
      listUserRecipes(options),
    ])
      .then(([allData, filteredData]) => {
        if (cancelled) return
        const mapRecipe = (recipe: any) => ({
          id: recipe.id,
          title: recipe.title,
          cuisine: recipe.cuisine,
          meal_type: recipe.meal_type,
          image_url: recipe.image_url,
          is_favorite: recipe.is_favorite,
        })
        setAllRecipes((allData || []).map(mapRecipe))
        setRecipes((filteredData || []).map(mapRecipe))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, user?.id, search, selectedMealType, selectedCuisine, favoritesOnly])

  const cuisineOptions = useMemo(() => {
    const distinct = Array.from(new Set(allRecipes.map((recipe) => recipe.cuisine).filter(Boolean)))
    return distinct.sort((a, b) => String(a).localeCompare(String(b)))
  }, [allRecipes])

  const totalCount = allRecipes.length
  const filteredCount = recipes.length
  const hasResults = filteredCount > 0

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] bg-black/40" onClick={onClose}>
      <div className="fixed inset-x-0 bottom-0 top-0 overflow-hidden bg-surface-card sm:inset-8 sm:mx-auto sm:max-w-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-surface-muted px-4 py-4">
          <div className="text-lg font-semibold text-ink-primary">Pick a recipe</div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-2 text-ink-tertiary transition-colors duration-150 hover:bg-stone-100 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Close">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-surface-muted px-4 py-3">
          <div className="space-y-3">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search recipes"
              className="w-full rounded-xl border border-surface-muted bg-surface-base px-3 py-2 text-sm text-ink-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
            />

            <div className="flex flex-wrap gap-2">
              {MEAL_TYPE_OPTIONS.map((option) => {
                const active = selectedMealType === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedMealType(active ? null : option.value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${active ? 'cursor-pointer bg-primary-100 text-primary-700' : 'cursor-pointer bg-stone-100 text-ink-primary hover:bg-stone-200'}`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedCuisine}
                onChange={(event) => setSelectedCuisine(event.target.value)}
                className="cursor-pointer rounded-xl border border-surface-muted bg-surface-base px-3 py-2 text-sm text-ink-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
              >
                <option value="">All cuisines</option>
                {cuisineOptions.map((cuisine) => (
                  <option key={cuisine} value={cuisine || ''}>{cuisine}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setFavoritesOnly((current) => !current)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${favoritesOnly ? 'cursor-pointer bg-primary-100 text-primary-700' : 'cursor-pointer bg-stone-100 text-ink-primary hover:bg-stone-200'}`}
              >
                Favorites only
              </button>
            </div>

            <div className="text-sm text-ink-secondary">Showing {filteredCount} of {totalCount} recipes</div>
            {/* Category arrays are empty in live data right now, so category filtering stays off until backfill exists. */}
          </div>
        </div>

        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-4 py-3 sm:max-h-[70vh]">
          {loading ? (
            <div className="py-8 text-sm text-ink-secondary">Loading recipes...</div>
          ) : !hasResults ? (
            <div className="py-8 text-sm text-ink-secondary">No matches. Try clearing a filter.</div>
          ) : (
            <div className="space-y-2">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => onPick(recipe)}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-xl bg-surface-card p-3 text-left shadow-card transition duration-150 hover:bg-stone-50 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
                >
                  {recipe.image_url ? (
                    <img src={recipe.image_url} alt={recipe.title} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-surface-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink-primary transition-colors duration-150 group-hover:text-stone-900">{recipe.title}</div>
                    <div className="truncate text-sm text-ink-secondary transition-colors duration-150 group-hover:text-ink-primary">{recipe.cuisine || 'Recipe'}{recipe.meal_type ? ` · ${recipe.meal_type}` : ''}</div>
                  </div>
                  <button
                    type="button"
                    aria-label={recipe.is_favorite ? 'Remove favorite' : 'Add favorite'}
                    disabled={favoriteBusyId === recipe.id}
                    onClick={async (event) => {
                      event.stopPropagation()
                      const nextValue = !recipe.is_favorite
                      const previousRecipes = recipes
                      const previousAllRecipes = allRecipes
                      setFavoriteBusyId(recipe.id)
                      setRecipes((current) => current.map((item) => item.id === recipe.id ? { ...item, is_favorite: nextValue } : item).filter((item) => favoritesOnly ? item.is_favorite : true))
                      setAllRecipes((current) => current.map((item) => item.id === recipe.id ? { ...item, is_favorite: nextValue } : item))
                      try {
                        await toggleFavorite(recipe.id, nextValue)
                      } catch (error) {
                        setRecipes(previousRecipes)
                        setAllRecipes(previousAllRecipes)
                        toast.error("Couldn't update favorite. Try again.")
                      } finally {
                        setFavoriteBusyId(null)
                      }
                    }}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-2 text-ink-tertiary transition-colors duration-150 hover:bg-stone-100 hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <HeartIcon filled={Boolean(recipe.is_favorite)} className={`h-5 w-5 ${recipe.is_favorite ? 'text-primary-500' : 'text-ink-tertiary group-hover:text-primary-500'}`} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
