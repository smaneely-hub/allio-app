import { supabase } from './supabase'

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => chars[b % 62]).join('')
}

async function getAuthUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// Builds the recipe payload stored inside snapshot_json.
// Handles both normalized recipe objects and raw DB rows.
function buildRecipePayload(recipe) {
  return {
    title: recipe.title,
    description: recipe.description ?? null,
    prepTime: recipe.prepTime ?? recipe.prep_time_minutes ?? null,
    cookTime: recipe.cookTime ?? recipe.cook_time_minutes ?? null,
    totalTime: recipe.totalTime ?? recipe.total_time_minutes ?? null,
    servings: recipe.servings ?? null,
    yield: recipe.yield ?? recipe.yield_text ?? null,
    difficulty: recipe.difficulty ?? null,
    ingredientGroups: recipe.ingredientGroups ?? recipe.ingredient_groups_json ?? [],
    instructionGroups: recipe.instructionGroups ?? recipe.instruction_groups_json ?? [],
    tips: recipe.tips ?? recipe.tips_json ?? [],
    substitutions: recipe.substitutions ?? recipe.substitutions_json ?? [],
    tags: recipe.tags ?? recipe.tags_v2_json ?? null,
    nutrition: recipe.nutrition ?? recipe.nutrition_json ?? null,
    sourceNote: recipe.sourceNote ?? recipe.source_note ?? null,
    imageUrl: recipe.imageUrl ?? recipe.image_url ?? null,
  }
}

export function getShareUrl(token) {
  return `${window.location.origin}/share/${token}`
}

export async function createRecipeShare(recipe) {
  const userId = await getAuthUserId()
  const token = generateToken()
  const { data, error } = await supabase
    .from('recipe_shares')
    .insert({
      token,
      share_type: 'recipe',
      created_by: userId,
      label: recipe.title,
      snapshot_json: {
        version: 1,
        share_type: 'recipe',
        recipes: [buildRecipePayload(recipe)],
      },
    })
    .select('token')
    .single()
  if (error) throw error
  return data.token
}

export async function createFavoritesShare(recipes) {
  const userId = await getAuthUserId()
  const token = generateToken()
  const { data, error } = await supabase
    .from('recipe_shares')
    .insert({
      token,
      share_type: 'favorites',
      created_by: userId,
      label: 'My Favorites',
      snapshot_json: {
        version: 1,
        share_type: 'favorites',
        recipes: recipes.map(buildRecipePayload),
      },
    })
    .select('token')
    .single()
  if (error) throw error
  return data.token
}

export async function fetchShare(token) {
  const { data, error } = await supabase
    .from('recipe_shares')
    .select('token, share_type, label, snapshot_json, created_at')
    .eq('token', token)
    .single()
  if (error) return null
  return data
}

export async function copyToClipboard(text) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return
  }
  const el = document.createElement('textarea')
  el.value = text
  el.style.cssText = 'position:fixed;opacity:0'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

export function canNativeShare() {
  return typeof navigator !== 'undefined' && Boolean(navigator.share)
}

export async function nativeShare(url, title) {
  await navigator.share({ url, title: `${title} — Allio` })
}
