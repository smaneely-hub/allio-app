import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ClipRecipeModal } from '../components/ClipRecipeModal'
import { RecipeDetail } from '../components/RecipeDetail'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import { deleteRecipe } from '../hooks/useRecipeMutations'
import { normalizeRecipe } from '../lib/recipeSchema'
import { supabase } from '../lib/supabase'

/** Handles /recipes/:recipeId — shows detail view for a single recipe. */
export function RecipesPage() {
  useDocumentTitle('Recipes | Allio')
  const navigate = useNavigate()
  const { recipeId } = useParams()
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const loadRecipes = useCallback(async () => {
    setLoading(true)
    if (!user?.id) {
      setRecipes([])
      setLoading(false)
      return
    }

    const PLAIN_SELECT = `
      id, user_id, title, slug, description, cuisine, meal_type,
      prep_time_minutes, cook_time_minutes, total_time_minutes, servings,
      yield_text, difficulty, ingredients_json, instructions_json,
      ingredient_groups_json, instruction_groups_json, nutrition_json,
      tips_json, substitutions_json, tags_json, tags_v2_json,
      source_note, source_domain, source_url, image_prompt,
      created_at, updated_at, active, is_favorite, rating, cooked_at, image_url, category
    `

    let { data, error } = await supabase
      .from('recipes')
      .select(PLAIN_SELECT + `, recipe_interactions(is_favorite, rating, times_cooked, last_cooked_at)`)
      .eq('active', true)
      .eq('user_id', user.id)
      .order('title', { ascending: true })

    if (error) {
      const isRelationMissing = String(error.message || '').includes('recipe_interactions') || error.code === 'PGRST200'
      if (!isRelationMissing) {
        setLoading(false)
        return
      }
      const fallback = await supabase
        .from('recipes')
        .select(PLAIN_SELECT)
        .eq('active', true)
        .eq('user_id', user.id)
        .order('title', { ascending: true })
      if (fallback.error) {
        setLoading(false)
        return
      }
      data = fallback.data
    }

    const rows = (data || []).map((row) => {
      const interaction = Array.isArray(row.recipe_interactions) ? row.recipe_interactions[0] : null
      return {
        ...row,
        is_favorite: interaction?.is_favorite ?? row.is_favorite ?? false,
        rating: interaction?.rating ?? row.rating ?? null,
        times_cooked: interaction?.times_cooked ?? 0,
        last_cooked_at: interaction?.last_cooked_at ?? row.cooked_at ?? null,
      }
    })

    setRecipes(rows)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  async function handleDelete(id, title) {
    if (!window.confirm(`Remove "${title}" from your recipes?`)) return
    setDeletingId(id)
    try {
      await deleteRecipe(id)
      await loadRecipes()
    } finally {
      setDeletingId(null)
    }
  }

  const selectedRecipe = useMemo(() => {
    if (!recipeId) return null
    return recipes
      .map((recipeRow) => {
        const normalized = normalizeRecipe({
          ...recipeRow,
          yield: recipeRow.yield_text,
          prepTime: recipeRow.prep_time_minutes,
          cookTime: recipeRow.cook_time_minutes,
          totalTime: recipeRow.total_time_minutes,
          image_url: recipeRow.image_url,
          ingredientGroups: recipeRow.ingredient_groups_json,
          instructionGroups: recipeRow.instruction_groups_json,
          ingredients: recipeRow.ingredients_json,
          instructions: recipeRow.instructions_json,
          substitutions: recipeRow.substitutions_json,
          tags: recipeRow.tags_v2_json,
          sourceNote: recipeRow.source_note,
          imagePrompt: recipeRow.image_prompt,
          is_favorite: recipeRow.is_favorite,
          rating: recipeRow.rating,
        })
        // normalizeRecipe drops times_cooked and last_cooked_at — restore them explicitly
        return {
          ...normalized,
          times_cooked: recipeRow.times_cooked ?? 0,
          last_cooked_at: recipeRow.last_cooked_at ?? null,
        }
      })
      .find((recipe) => String(recipe.id) === String(recipeId) || String(recipe.slug) === String(recipeId)) || null
  }, [recipeId, recipes])

  if (loading && recipeId) {
    return <div className="p-6 text-center text-sm text-text-muted">Loading recipe…</div>
  }

  if (selectedRecipe) {
    return (
      <RecipeDetail
        meal={selectedRecipe}
        onClose={() => navigate('/recipes')}
        onSaved={loadRecipes}
      />
    )
  }

  if (!recipeId) {
    navigate('/recipes', { replace: true })
    return null
  }

  return (
    <div className="p-6 text-center text-sm text-text-muted">
      Recipe not found.{' '}
      <button type="button" onClick={() => navigate('/recipes')} className="font-medium text-primary-500 underline">
        Back to recipes
      </button>
    </div>
  )
}
