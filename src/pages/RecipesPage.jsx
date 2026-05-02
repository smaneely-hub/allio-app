import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ClipRecipeModal } from '../components/ClipRecipeModal'
import { FilterBar } from '../components/FilterBar'
import { RecipeDetail } from '../components/RecipeDetail'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import { filterRecipesByTags, getAvailableTags } from '../lib/recipeFilters'
import { normalizeRecipe } from '../lib/recipeSchema'
import { supabase } from '../lib/supabase'

/** Render a minimal browse view for recipes with tag-based filtering. */
export function RecipesPage() {
  useDocumentTitle('Recipes | Allio')
  const navigate = useNavigate()
  const { recipeId } = useParams()
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTags, setSelectedTags] = useState([])
  const [showClipModal, setShowClipModal] = useState(false)

  const loadRecipes = useCallback(async () => {
    setLoading(true)
    if (!user?.id) {
      setRecipes([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('recipes')
      .select('id, user_id, title, slug, description, cuisine, meal_type, prep_time_minutes, cook_time_minutes, total_time_minutes, servings, yield_text, difficulty, ingredients_json, instructions_json, ingredient_groups_json, instruction_groups_json, nutrition_json, tips_json, substitutions_json, tags_json, tags_v2_json, source_note, source_domain, source_url, image_prompt, created_at, updated_at, active, is_favorite, cooked_at, image_url')
      .eq('active', true)
      .eq('user_id', user.id)
      .order('title', { ascending: true })

    setRecipes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  const personalRecipes = useMemo(() => recipes.filter((recipe) => recipe.is_favorite || recipe.cooked_at || recipe.source_url), [recipes])
  const availableTags = useMemo(() => getAvailableTags(personalRecipes), [personalRecipes])
  const filteredRecipes = useMemo(() => filterRecipesByTags(personalRecipes, selectedTags), [personalRecipes, selectedTags])

  const toggleTag = (tag) => {
    setSelectedTags((current) => current.includes(tag)
      ? current.filter((entry) => entry !== tag)
      : [...current, tag]
    )
  }

  const selectedRecipe = useMemo(() => {
    if (!recipeId) return null
    return recipes
      .map((recipeRow) => normalizeRecipe({
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
      }))
      .find((recipe) => String(recipe.id) === String(recipeId) || String(recipe.slug) === String(recipeId)) || null
  }, [recipeId, personalRecipes])

  if (selectedRecipe) {
    return <RecipeDetail meal={selectedRecipe} onClose={() => navigate('/recipes')} />
  }

  return (
    <div className="px-3 pb-24 pt-2 md:px-0">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 mb-2" />
          <h1 className="font-display text-2xl text-text-primary md:text-3xl">Recipes</h1>
          <p className="text-sm text-text-muted">See only the recipes you’ve imported, cooked, or favorited.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowClipModal(true)}
          className="btn-primary shrink-0 text-sm"
        >
          + Add Recipe
        </button>
      </div>

      <div className="mb-4 rounded-2xl border border-divider bg-surface p-3 shadow-sm">
        <FilterBar tags={availableTags} selectedTags={selectedTags} onToggleTag={toggleTag} />
      </div>

      {loading ? (
        <div className="card p-6 text-sm text-text-muted">Loading recipes...</div>
      ) : (
        <div className="space-y-3">
          {filteredRecipes.map((recipeRow) => {
            const recipe = normalizeRecipe({
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
            })
            const tags = [recipe.tags.cuisine, recipe.tags.mealType, ...recipe.tags.dietary, ...(recipe.tags.cookingMethod || [])].filter(Boolean)

            return (
              <button
                key={recipe.id}
                type="button"
                onClick={() => navigate(`/recipes/${recipe.slug || recipe.id}`)}
                className="card w-full p-4 text-left shadow-sm transition-shadow duration-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl text-text-primary">{recipe.title}</h2>
                    <p className="mt-1 text-sm text-text-secondary">{recipe.description}</p>
                    {recipe.sourceNote ? <p className="mt-2 text-xs text-text-muted">{recipe.sourceNote}</p> : null}
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
            )
          })}

          {!filteredRecipes.length && (
            <div className="card p-6 text-sm text-text-muted">
              No recipes match the selected tags.
            </div>
          )}
        </div>
      )}

      {showClipModal && (
        <ClipRecipeModal
          onClose={() => setShowClipModal(false)}
          onSaved={loadRecipes}
        />
      )}
    </div>
  )
}
