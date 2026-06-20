import { supabase } from './supabase'

export async function invokeEdgeFunction(name, body, options = {}) {
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    ...options,
  })

  if (error) {
    throw error
  }

  return data
}

export async function fetchRecipeImageData(query) {
  const data = await invokeEdgeFunction('fetch-recipe-image', {
    query: query || 'food',
  })

  return {
    url: typeof data?.imageUrl === 'string' && data.imageUrl.trim() ? data.imageUrl.trim() : null,
    photographer: typeof data?.photographer === 'string' && data.photographer.trim() ? data.photographer.trim() : null,
    photographerUrl: typeof data?.pexelsLink === 'string' && data.pexelsLink.trim() ? data.pexelsLink.trim() : null,
  }
}

export async function searchFoodItemsRemote(query) {
  const data = await invokeEdgeFunction('search-food', { query })
  return Array.isArray(data?.items) ? data.items : []
}
