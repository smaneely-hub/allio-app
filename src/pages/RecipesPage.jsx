import { useEffect, useMemo, useState } from 'react'
import { FilterBar } from '../components/FilterBar'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { filterRecipesByTags, getAvailableTags } from '../lib/recipeFilters'
import { supabase } from '../lib/supabase'

/** Render a minimal browse view for recipes with tag-based filtering. */
export function RecipesPage() {
  useDocumentTitle('Recipes | Allio')
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTags, setSelectedTags] = useState([])

  useEffect(() => {
    async function loadRecipes() {
      setLoading(true)
      const { data } = await supabase
        .from('recipes')
        .select('id, title, description, cuisine, meal_type, prep_time_minutes, cook_time_minutes, servings, difficulty, tags_json, active')
        .eq('active', true)
        .order('title', { ascending: true })

      setRecipes(data || [])
      setLoading(false)
    }

    loadRecipes()
  }, [])

  const availableTags = useMemo(() => getAvailableTags(recipes), [recipes])
  const filteredRecipes = useMemo(() => filterRecipesByTags(recipes, selectedTags), [recipes, selectedTags])

  const toggleTag = (tag) => {
    setSelectedTags((current) => current.includes(tag)
      ? current.filter((entry) => entry !== tag)
      : [...current, tag]
    )
  }

  return (
    <div className="px-3 pb-24 pt-2 md:px-0">
      <div className="mb-4">
        <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 mb-2" />
        <h1 className="font-display text-2xl text-text-primary md:text-3xl">Recipes</h1>
        <p className="text-sm text-text-muted">Browse the recipe library and filter by the tags that fit your household.</p>
      </div>

      <div className="mb-4 rounded-2xl border border-divider bg-surface p-3 shadow-sm">
        <FilterBar tags={availableTags} selectedTags={selectedTags} onToggleTag={toggleTag} />
      </div>

      {loading ? (
        <div className="card p-6 text-sm text-text-muted">Loading recipes...</div>
      ) : (
        <div className="space-y-3">
          {filteredRecipes.map((recipe) => {
            const tags = Array.isArray(recipe.tags_json)
              ? recipe.tags_json
              : typeof recipe.tags_json === 'string'
                ? JSON.parse(recipe.tags_json)
                : []

            return (
              <div key={recipe.id} className="card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl text-text-primary">{recipe.title}</h2>
                    <p className="mt-1 text-sm text-text-secondary">{recipe.description}</p>
                  </div>
                  <div className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-600">
                    {recipe.difficulty}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                  <span className="rounded-full bg-warm-100 px-3 py-1">{recipe.cuisine}</span>
                  <span className="rounded-full bg-warm-100 px-3 py-1">Prep {recipe.prep_time_minutes} min</span>
                  <span className="rounded-full bg-warm-100 px-3 py-1">Cook {recipe.cook_time_minutes} min</span>
                  <span className="rounded-full bg-warm-100 px-3 py-1">Serves {recipe.servings}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-divider bg-white px-3 py-1 text-xs font-medium text-text-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}

          {!filteredRecipes.length && (
            <div className="card p-6 text-sm text-text-muted">
              No recipes match the selected tags.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
