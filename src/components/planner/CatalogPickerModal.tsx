import { useEffect, useMemo, useState } from 'react'
import { listUserRecipes } from '../../hooks/useRecipeMutations'

type RecipeRow = {
  id: string
  title: string
  cuisine?: string | null
  image_url?: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onPick: (recipe: RecipeRow) => Promise<void> | void
}

function CloseIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CatalogPickerModal({ open, onClose, onPick }: Props) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [recipes, setRecipes] = useState<RecipeRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput), 200)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    listUserRecipes({ search: search || undefined })
      .then((data) => {
        if (!cancelled) {
          setRecipes((data || []).map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            cuisine: recipe.cuisine,
            image_url: recipe.image_url,
          })))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, search])

  const hasResults = useMemo(() => recipes.length > 0, [recipes])

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
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search recipes"
            className="w-full rounded-xl border border-surface-muted bg-surface-base px-3 py-2 text-sm text-ink-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
          />
        </div>

        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-4 py-3 sm:max-h-[70vh]">
          {loading ? (
            <div className="py-8 text-sm text-ink-secondary">Loading recipes...</div>
          ) : !hasResults ? (
            <div className="py-8 text-sm text-ink-secondary">No recipes saved yet — clip one or generate one to get started.</div>
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
                    <div className="truncate text-sm text-ink-secondary transition-colors duration-150 group-hover:text-ink-primary">{recipe.cuisine || 'Recipe'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
