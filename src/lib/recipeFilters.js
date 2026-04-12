/** Return a sorted, deduplicated list of tags from the recipe library. */
export function getAvailableTags(recipes = []) {
  const tagSet = new Set()

  for (const recipe of recipes) {
    const tags = Array.isArray(recipe?.tags_json)
      ? recipe.tags_json
      : typeof recipe?.tags_json === 'string'
        ? safeParseArray(recipe.tags_json)
        : Array.isArray(recipe?.tags)
          ? recipe.tags
          : []

    for (const tag of tags) {
      if (typeof tag === 'string' && tag.trim()) {
        tagSet.add(tag.trim())
      }
    }
  }

  return [...tagSet].sort((a, b) => a.localeCompare(b))
}

/** Return recipes matching all currently selected tags. */
export function filterRecipesByTags(recipes = [], selectedTags = []) {
  if (!selectedTags.length) return recipes

  return recipes.filter((recipe) => {
    const tags = Array.isArray(recipe?.tags_json)
      ? recipe.tags_json
      : typeof recipe?.tags_json === 'string'
        ? safeParseArray(recipe.tags_json)
        : Array.isArray(recipe?.tags)
          ? recipe.tags
          : []

    return selectedTags.every((tag) => tags.includes(tag))
  })
}

function safeParseArray(value) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
