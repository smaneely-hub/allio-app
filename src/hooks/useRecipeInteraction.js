import { useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useRecipeInteraction(userId, householdId) {
  const recordInteraction = useCallback(async (
    recipeId,
    mealPlanId,
    interactionType,
    extra = {}
  ) => {
    if (!userId || !recipeId) return

    try {
      const { error } = await supabase.from('user_recipe_interactions').insert({
        user_id: userId,
        household_id: householdId,
        recipe_id: recipeId,
        meal_plan_id: mealPlanId,
        interaction_type: interactionType,
        interaction_value_json: extra
      })

      if (error) {
        console.log('[interaction] Failed to record:', error.message)
      }
    } catch (err) {
      console.log('[interaction] Exception:', err)
    }
  }, [userId, householdId])

  const trackView = useCallback((meal, mealPlanId) => {
    if (meal?.recipe_id) {
      recordInteraction(meal.recipe_id, mealPlanId, 'viewed', { 
        meal_name: meal.name,
        day: meal.day,
        meal_type: meal.meal
      })
    }
  }, [recordInteraction])

  const trackExpand = useCallback((meal, mealPlanId) => {
    if (meal?.recipe_id) {
      recordInteraction(meal.recipe_id, mealPlanId, 'expanded', {
        meal_name: meal.name,
        day: meal.day,
        meal_type: meal.meal
      })
    }
  }, [recordInteraction])

  const trackAccept = useCallback((meal, mealPlanId) => {
    if (meal?.recipe_id) {
      recordInteraction(meal.recipe_id, mealPlanId, 'accepted', {
        meal_name: meal.name,
        day: meal.day,
        meal_type: meal.meal
      })
    }
  }, [recordInteraction])

  const trackSwap = useCallback((meal, mealPlanId, suggestion) => {
    if (meal?.recipe_id) {
      recordInteraction(meal.recipe_id, mealPlanId, 'swapped', {
        original_meal: meal.name,
        suggestion
      })
    }
  }, [recordInteraction])

  const trackLock = useCallback((meal, mealPlanId, locked) => {
    if (meal?.recipe_id) {
      recordInteraction(meal.recipe_id, mealPlanId, locked ? 'locked' : 'unlocked', {
        meal_name: meal.name
      })
    }
  }, [recordInteraction])

  const trackFavorite = useCallback((meal, mealPlanId) => {
    if (meal?.recipe_id) {
      recordInteraction(meal.recipe_id, mealPlanId, 'favorited', {
        meal_name: meal.name
      })
    }
  }, [recordInteraction])

  return {
    recordInteraction,
    trackView,
    trackExpand,
    trackAccept,
    trackSwap,
    trackLock,
    trackFavorite
  }
}