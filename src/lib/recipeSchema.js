function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function normalizeIngredientGroup(group, fallbackLabel = undefined) {
  const ingredients = asArray(group?.ingredients).map((ingredient) => {
    if (typeof ingredient === 'string') {
      return {
        amount: '',
        unit: '',
        item: ingredient,
        note: undefined,
        optional: false,
      }
    }

    return {
      amount: asString(ingredient?.amount ?? ingredient?.quantity, ''),
      unit: asString(ingredient?.unit, ''),
      item: asString(ingredient?.item ?? ingredient?.name, ''),
      note: typeof ingredient?.note === 'string' ? ingredient.note : undefined,
      optional: Boolean(ingredient?.optional),
    }
  }).filter((ingredient) => ingredient.item)

  return {
    label: typeof group?.label === 'string' && group.label.trim() ? group.label.trim() : fallbackLabel,
    ingredients,
  }
}

function normalizeInstructionGroup(group, fallbackLabel = undefined) {
  const steps = asArray(group?.steps).map((step) => {
    if (typeof step === 'string') {
      return { text: step, tip: undefined }
    }

    return {
      text: asString(step?.text, ''),
      tip: typeof step?.tip === 'string' ? step.tip : undefined,
    }
  }).filter((step) => step.text)

  return {
    label: typeof group?.label === 'string' && group.label.trim() ? group.label.trim() : fallbackLabel,
    steps,
  }
}

export function normalizeRecipe(recipe = {}) {
  const legacyInstructionSteps = asArray(recipe.instructions).length ? asArray(recipe.instructions) : asArray(recipe.steps)

  const ingredientGroups = asArray(recipe.ingredientGroups).length
    ? asArray(recipe.ingredientGroups).map((group) => normalizeIngredientGroup(group))
    : [normalizeIngredientGroup({
        label: undefined,
        ingredients: asArray(recipe.ingredients).map((ingredient) => {
          if (typeof ingredient === 'string') return ingredient
          return {
            amount: ingredient?.amount ?? ingredient?.quantity ?? '',
            unit: ingredient?.unit ?? '',
            item: ingredient?.item ?? ingredient?.name ?? '',
            note: ingredient?.note,
            optional: ingredient?.optional,
          }
        }),
      })]

  const instructionGroups = asArray(recipe.instructionGroups).length
    ? asArray(recipe.instructionGroups).map((group) => normalizeInstructionGroup(group))
    : [normalizeInstructionGroup({
        label: undefined,
        steps: legacyInstructionSteps.map((step) => (typeof step === 'string' ? { text: step } : step)),
      })]

  const prepTime = asNumber(recipe.prepTime ?? recipe.prep_time_minutes, 0)
  const cookTime = asNumber(recipe.cookTime ?? recipe.cook_time_minutes, 0)
  const totalTime = asNumber(recipe.totalTime, prepTime + cookTime)

  const tags = recipe?.tags && typeof recipe.tags === 'object' && !Array.isArray(recipe.tags)
    ? recipe.tags
    : {
        cuisine: asString(recipe.cuisine, ''),
        mealType: asString(recipe.mealType ?? recipe.meal_type, ''),
        dietary: asArray(recipe.dietary ?? recipe.dietary_flags_json).filter((value) => typeof value === 'string'),
        season: typeof recipe?.season === 'string' ? recipe.season : undefined,
        cookingMethod: asArray(recipe.cookingMethod).filter((value) => typeof value === 'string'),
      }

  return {
    id: asString(recipe.id, ''),
    title: asString(recipe.title ?? recipe.name, 'Generated recipe'),
    slug: asString(recipe.slug, ''),
    description: asString(recipe.description, ''),
    cuisine: asString(recipe.cuisine, ''),
    yield: asString(recipe.yield, recipe.servings ? `${recipe.servings} servings` : ''),
    prepTime,
    cookTime,
    totalTime,
    difficulty: ['easy', 'medium', 'advanced'].includes(recipe.difficulty) ? recipe.difficulty : 'medium',
    ingredientGroups: ingredientGroups.filter((group) => group.ingredients.length > 0),
    instructionGroups: instructionGroups.filter((group) => group.steps.length > 0),
    tips: asArray(recipe.tips).filter((tip) => typeof tip === 'string'),
    substitutions: asArray(recipe.substitutions).map((substitution) => ({
      original: asString(substitution?.original, ''),
      substitute: asString(substitution?.substitute, ''),
      note: typeof substitution?.note === 'string' ? substitution.note : undefined,
    })).filter((substitution) => substitution.original && substitution.substitute),
    tags: {
      cuisine: asString(tags.cuisine, ''),
      mealType: asString(tags.mealType, ''),
      dietary: asArray(tags.dietary).filter((value) => typeof value === 'string'),
      season: typeof tags?.season === 'string' ? tags.season : undefined,
      cookingMethod: asArray(tags.cookingMethod).filter((value) => typeof value === 'string'),
    },
    nutrition: recipe?.nutrition && typeof recipe.nutrition === 'object'
      ? {
          calories: asNumber(recipe.nutrition.calories, 0),
          protein: asString(recipe.nutrition.protein, ''),
          carbs: asString(recipe.nutrition.carbs, ''),
          fat: asString(recipe.nutrition.fat, ''),
          fiber: typeof recipe.nutrition.fiber === 'string' ? recipe.nutrition.fiber : undefined,
          sodium: typeof recipe.nutrition.sodium === 'string' ? recipe.nutrition.sodium : undefined,
        }
      : undefined,
    sourceNote: typeof recipe.sourceNote === 'string' ? recipe.sourceNote : undefined,
    imagePrompt: typeof recipe.imagePrompt === 'string' ? recipe.imagePrompt : undefined,
    createdAt: asString(recipe.createdAt ?? recipe.created_at, ''),
    updatedAt: asString(recipe.updatedAt ?? recipe.updated_at, ''),
    imageUrl: asString(recipe.imageUrl ?? recipe.image_url, ''),
    isFavorite: Boolean(recipe.isFavorite ?? recipe.is_favorite),
    rating: recipe.rating == null ? null : asNumber(recipe.rating, 0),
    cookedAt: asString(recipe.cookedAt ?? recipe.cooked_at, ''),
    category: asArray(recipe.category).filter((value) => typeof value === 'string'),
  }
}

export function flattenRecipeIngredients(recipe = {}) {
  return normalizeRecipe(recipe).ingredientGroups.flatMap((group) =>
    group.ingredients.map((ingredient) => [ingredient.amount, ingredient.unit, ingredient.item].filter(Boolean).join(' ').trim()),
  )
}

export function flattenRecipeInstructions(recipe = {}) {
  return normalizeRecipe(recipe).instructionGroups.flatMap((group) => group.steps.map((step) => step.text))
}
