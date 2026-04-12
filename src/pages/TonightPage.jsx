import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { normalizeMealRecord } from '../lib/mealSchema'
import { invokePlannerFunction, refineMeal } from '../lib/plannerFunction'
import { buildShoppingItemsFromMeal, upsertShoppingListForDate } from '../lib/tonightPersistence'
import { calculateServings, logServingsCalculation, getDemographicBucket } from '../hooks/useServings'
import { CATEGORY_LABELS, CATEGORY_ORDER, groupItemsByCategory, parseIngredient } from '../lib/shoppingListUtils'

async function getHousehold(userId) {
  if (!userId) return null

  const { data: household, error } = await supabase
    .from('households')
    .select('id, staples_on_hand')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return household || null
}

function useHouseholdMembers(userId) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMembers() {
      if (!userId) {
        setLoading(false)
        return
      }

      const { data: household } = await supabase
        .from('households')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (!household?.id) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', household.id)
        .order('name')

      setMembers(data || [])
      setLoading(false)
    }

    loadMembers()
  }, [userId])

  return { members, loading }
}

const EFFORT_OPTIONS = [
  { value: 'low', label: 'Easy' },
  { value: 'medium', label: 'Moderate' },
  { value: 'high', label: 'Involved' },
]

const DIETARY_OPTIONS = [
  { value: '', label: 'No restriction' },
  { value: 'low-carb', label: 'Low carb' },
  { value: 'high-protein', label: 'High protein' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten free' },
  { value: 'keto', label: 'Keto' },
]

const MEMBER_FEEDBACK_OPTIONS = [
  { value: 'loved_it', label: 'Loved it' },
  { value: 'liked_it', label: 'Liked it' },
  { value: 'it_was_okay', label: 'It was okay' },
  { value: 'did_not_like', label: "Didn't like it" },
  { value: 'did_not_eat', label: "Didn't eat it" },
]

async function persistTonightMealState({ userId, householdId, meal, staplesOnHand = '' }) {
  const today = new Date().toISOString().split('T')[0]
  const planPayload = {
    meals: [{ ...meal, id: `${meal.day}-${meal.meal}` }],
  }

  const { data: existingPlan, error: planLoadError } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('week_of', today)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (planLoadError) throw planLoadError

  if (existingPlan?.id) {
    const { error } = await supabase
      .from('meal_plans')
      .update({
        household_id: householdId,
        plan: planPayload,
        draft_plan: planPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPlan.id)

    if (error) throw error
  } else {
    const { error } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userId,
        household_id: householdId,
        week_of: today,
        status: 'active',
        plan: planPayload,
        draft_plan: planPayload,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error
  }

  const shoppingItems = buildShoppingItemsFromMeal(meal, staplesOnHand)
  await upsertShoppingListForDate({
    userId,
    householdId,
    weekOf: today,
    items: shoppingItems,
  })
}

async function persistTonightMealForUser({ userId, meal, staplesOnHand = '' }) {
  const household = await getHousehold(userId)
  if (!household?.id) return null

  await persistTonightMealState({
    userId,
    householdId: household.id,
    meal,
    staplesOnHand: staplesOnHand || household.staples_on_hand || '',
  })
  return household
}

async function loadTonightPreferenceSignals(userId) {
  if (!userId) {
    return {
      likedMeals: [],
      dislikedMeals: [],
      favoriteMeals: [],
      refinementNotes: [],
      strongAvoidSignals: [],
    }
  }

  let signalsResult = { data: [], error: null }
  try {
    const result = await supabase
      .from('meal_signals')
      .select('meal_name, signal_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (result.error && (result.error.code === 'PGRST205' || String(result.error.message || '').includes('meal_signals'))) {
      console.warn('[TonightPage] meal_signals unavailable, continuing without it')
      signalsResult = { data: [], error: null }
    } else {
      signalsResult = result
    }
  } catch (err) {
    console.warn('[TonightPage] meal_signals lookup failed, continuing without it', err)
  }

  const [favoritesResult, feedbackResult] = await Promise.all([
    supabase
      .from('saved_meals')
      .select('recipe_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('meal_member_feedback')
      .select('rating, note, created_at, meal_instances(recipe_name, user_id)')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const signals = (signalsResult.data || []).filter(Boolean)
  const favoriteMeals = (favoritesResult.data || []).map((entry) => entry.recipe_name).filter(Boolean)
  const feedbackRows = (feedbackResult.data || [])
    .filter((entry) => entry?.meal_instances?.user_id === userId)

  const likedMeals = [
    ...signals.filter((entry) => ['rated_positive', 'refined_to'].includes(entry.signal_type)).map((entry) => entry.meal_name),
    ...feedbackRows
      .filter((entry) => ['loved_it', 'liked_it'].includes(entry.rating))
      .map((entry) => entry.meal_instances?.recipe_name),
  ].filter(Boolean)

  const dislikedMeals = [
    ...signals.filter((entry) => ['rated_negative', 'swapped_away', 'refined_from'].includes(entry.signal_type)).map((entry) => entry.meal_name),
    ...feedbackRows
      .filter((entry) => ['did_not_like', 'did_not_eat'].includes(entry.rating))
      .map((entry) => entry.meal_instances?.recipe_name),
  ].filter(Boolean)

  const refinementNotes = feedbackRows
    .map((entry) => entry.note)
    .filter((note) => typeof note === 'string' && note.trim())
    .slice(0, 8)

  const strongAvoidSignals = Array.from(new Set(dislikedMeals)).slice(0, 6)

  return {
    likedMeals: Array.from(new Set(likedMeals)).slice(0, 8),
    dislikedMeals: Array.from(new Set(dislikedMeals)).slice(0, 8),
    favoriteMeals: Array.from(new Set(favoriteMeals)).slice(0, 8),
    refinementNotes,
    strongAvoidSignals,
  }
}

export function TonightPage() {
  useDocumentTitle("Tonight's Meal | Allio")
  const { user } = useAuth()
  const navigate = useNavigate()
  const initialDataLoadedRef = useRef(false)
  const savedMealsLoadedRef = useRef(false)
  const { members } = useHouseholdMembers(user?.id)

  const [selectedMembers, setSelectedMembers] = useState([])
  const [effort, setEffort] = useState('medium')
  const [dietaryFocus, setDietaryFocus] = useState('')
  const [feedback, setFeedback] = useState('')
  const [staplesOnHand, setStaplesOnHand] = useState('')
  const [generating, setGenerating] = useState(false)
  const [meal, setMeal] = useState(null)
  const [cooked, setCooked] = useState(false)
  const [history, setHistory] = useState([])
  // Track recent meal names to avoid repeats
  const [recentMealNames, setRecentMealNames] = useState([])
  // Track refinement changes for display
  const [refinementChanges, setRefinementChanges] = useState([])
  // Track meal instance for feedback
  const [mealInstanceId, setMealInstanceId] = useState(null)
  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [memberFeedback, setMemberFeedback] = useState({})
  // Favorites / saved meals
  const [savedMeals, setSavedMeals] = useState([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [preferenceSignals, setPreferenceSignals] = useState({
    likedMeals: [],
    dislikedMeals: [],
    favoriteMeals: [],
    refinementNotes: [],
    strongAvoidSignals: [],
  })
  const [cookingMode, setCookingMode] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [ingredientChecks, setIngredientChecks] = useState({})

  const shoppingPrepItems = useMemo(() => {
    const parsed = (meal?.ingredients || [])
      .map((ingredient, index) => {
        const parsedIngredient = parseIngredient(ingredient)
        return parsedIngredient ? {
          id: `${parsedIngredient.normalizedName}-${parsedIngredient.unit}-${index}`,
          name: parsedIngredient.name,
          quantity: parsedIngredient.quantity,
          unit: parsedIngredient.unit,
          category: parsedIngredient.category,
        } : null
      })
      .filter(Boolean)

    return groupItemsByCategory(parsed)
  }, [meal])

  // Load last saved meal on mount and build recent history
  useEffect(() => {
    if (!user || initialDataLoadedRef.current) return
    initialDataLoadedRef.current = true

    const today = new Date().toISOString().split('T')[0]

    // Load today's meal
    supabase
      .from('meal_plans')
      .select('plan, draft_plan')
      .eq('user_id', user.id)
      .eq('week_of', today)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: mealPlan }) => {
        if (mealPlan?.plan?.meals?.length > 0) {
          const lastMeal = normalizeMealRecord(mealPlan.plan.meals[0])
          setMeal(lastMeal)
          setRecentMealNames([lastMeal.name])
          console.log('[TonightPage] loaded last meal:', lastMeal.name)
        } else if (mealPlan?.draft_plan?.meals?.length > 0) {
          const lastMeal = normalizeMealRecord(mealPlan.draft_plan.meals[0])
          setMeal(lastMeal)
          setRecentMealNames([lastMeal.name])
          console.log('[TonightPage] loaded last draft meal:', lastMeal.name)
        }

        // Phase 2: Load associated meal_instance for feedback
        supabase
          .from('meal_instances')
          .select('id, status, selected_member_ids')
          .eq('user_id', user.id)
          .eq('recipe_name', mealPlan?.plan?.meals?.[0]?.name || mealPlan?.draft_plan?.meals?.[0]?.name)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data: instance }) => {
            if (instance) {
              setMealInstanceId(instance.id)
              if (instance.selected_member_ids?.length > 0) {
                setSelectedMembers(instance.selected_member_ids)
              }
              if (instance.status === 'cooked' || instance.status === 'rated') {
                setCooked(true)
              }
              console.log('[TonightPage] loaded meal_instance:', instance.id)
            }
          })
      })

    // Also load recent history from past weeks for better exclusion
    supabase
      .from('meal_plans')
      .select('plan')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(10)
      .then(({ data: recentPlans }) => {
        if (recentPlans) {
          const names = recentPlans
            .flatMap(p => p.plan?.meals?.map(m => m.name) || [])
            .filter(Boolean)
            .slice(0, 10)
          setRecentMealNames(prev => [...new Set([...prev, ...names])].slice(0, 10))
          console.log('[TonightPage] loaded recent meal history:', names)
        }
      })
  }, [user])

  useEffect(() => {
    if (!user || !initialDataLoadedRef.current) return

    getHousehold(user.id)
      .then((household) => {
        if (household?.staples_on_hand) {
          setStaplesOnHand(household.staples_on_hand)
        }
      })
      .catch((error) => {
        console.warn('[TonightPage] could not load staples_on_hand:', error)
      })

    loadTonightPreferenceSignals(user.id)
      .then((signals) => {
        setPreferenceSignals(signals)
      })
      .catch((error) => {
        console.warn('[TonightPage] could not load preference signals:', error)
      })
  }, [user])

  // Load saved favorites
  useEffect(() => {
    if (!user || savedMealsLoadedRef.current) return
    savedMealsLoadedRef.current = true
    supabase
      .from('saved_meals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setSavedMeals(data)
          console.log('[TonightPage] loaded saved meals:', data.length)
        }
      })
  }, [user])

  // Check if current meal is a favorite
  useEffect(() => {
    if (meal && savedMeals.length > 0) {
      const isFav = savedMeals.some(s => s.recipe_name === meal.name)
      setIsFavorite(isFav)
    }
  }, [meal, savedMeals])

  useEffect(() => {
    setCookingMode(false)
    setCurrentStepIndex(0)
    setIngredientChecks({})
  }, [meal?.name])

  const refreshPreferenceSignals = async () => {
    if (!user?.id) return
    try {
      const signals = await loadTonightPreferenceSignals(user.id)
      setPreferenceSignals(signals)
    } catch (error) {
      console.warn('[TonightPage] could not refresh preference signals:', error)
    }
  }

  const toggleFavorite = async () => {
    if (!user || !meal) return
    
    if (isFavorite) {
      // Remove from favorites
      const toRemove = savedMeals.find(s => s.recipe_name === meal.name)
      if (toRemove) {
        await supabase.from('saved_meals').delete().eq('id', toRemove.id)
        setSavedMeals(prev => prev.filter(s => s.id !== toRemove.id))
        setIsFavorite(false)
        refreshPreferenceSignals()
        console.log('[TonightPage] removed from favorites:', meal.name)
      }
    } else {
      // Add to favorites
      const { data } = await supabase
        .from('saved_meals')
        .insert({
          user_id: user.id,
          recipe_id: meal.recipe_id || null,
          recipe_name: meal.name,
          recipe_data: meal,
        })
        .select()
        .single()
      
      if (data) {
        setSavedMeals(prev => [data, ...prev])
        setIsFavorite(true)
        refreshPreferenceSignals()
        console.log('[TonightPage] added to favorites:', meal.name)
      }
    }
  }

  const loadSavedMeal = (savedMeal) => {
    const mealData = normalizeMealRecord(savedMeal.recipe_data)
    setMeal(mealData)
    setIsFavorite(true)
    setRefinementChanges([])
    setMemberFeedback({})
    setShowFeedbackModal(false)
    console.log('[TonightPage] loaded saved meal:', savedMeal.recipe_name)
  }

  const toggleMember = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    )
  }

  const selectAllMembers = () => {
    setSelectedMembers(members.map((m) => m.id))
  }

  const clearMembers = () => {
    setSelectedMembers([])
  }

  const generate = async () => {
    if (!user) {
      toast.error('Please log in first.')
      return
    }

    setGenerating(true)
    setCooked(false)

    console.log('[TonightPage] generate started')
    console.log('[TonightPage] selected members:', selectedMembers)
    console.log('[TonightPage] effort:', effort)
    console.log('[TonightPage] dietary focus:', dietaryFocus)
    console.log('[TonightPage] feedback:', feedback)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No active session')
      }

      const selectedMemberData = selectedMembers.map((id) => {
        const member = members.find((m) => m.id === id)
        return member ? {
          id: member.id,
          label: member.name || member.label,
          role: member.role,
          age: member.age,
          dietary_restrictions: member.dietary_restrictions || [],
          food_preferences: member.food_preferences || [],
        } : null
      }).filter(Boolean)

      const aggregatedRestrictions = [...new Set(selectedMemberData.flatMap((m) => m.dietary_restrictions || []))]
      const aggregatedPreferences = [...new Set(selectedMemberData.flatMap((m) => m.food_preferences || []))]

      const finalDietFocus = dietaryFocus || (aggregatedRestrictions.length > 0 ? aggregatedRestrictions[0] : '')
      const finalFeedback = [feedback, ...aggregatedPreferences.slice(0, 2)].filter(Boolean).join('; ')

      // Calculate servings based on selected members' demographics
      const calculatedServings = selectedMemberData.length > 0 
        ? calculateServings(selectedMemberData)
        : 1

      // Log serving calculation details
      if (selectedMemberData.length > 0) {
        logServingsCalculation(selectedMemberData, calculatedServings)
      }
      console.log('[TonightPage] Selected members for servings:', selectedMemberData.map(m => ({ id: m.id, age: m.age, bucket: getDemographicBucket(m.age) })))
      console.log('[TonightPage] Calculated servings:', calculatedServings)

      // V1: No leftovers planning enabled yet - placeholder for future use
      const plan_for_leftovers = false
      const preferenceHints = [
        ...preferenceSignals.favoriteMeals.map((name) => `favorite: ${name}`),
        ...preferenceSignals.likedMeals.map((name) => `liked: ${name}`),
        ...preferenceSignals.refinementNotes.map((note) => `feedback note: ${note}`),
      ].slice(0, 10)

      const payload = {
        household: {
          total_people: calculatedServings, // Use demographic-based serving count
          servings: calculatedServings,     // Explicit serving count for recipe scaling
          diet_focus: finalDietFocus,
          budget_sensitivity: 'moderate',
          adventurousness: 'mixed',
          staples_on_hand: staplesOnHand,
          planning_priorities: staplesOnHand ? ['quick meal', 'use what we have'] : ['quick meal'],
          cooking_comfort: effort,
          plan_for_leftovers,               // V2: Enable for leftovers-aware planning
        },
        members: selectedMemberData,
        slots: [
          {
            day: 'mon',
            meal: 'dinner',
            effort: effort,
            planning_notes: [finalDietFocus ? `diet: ${finalDietFocus}` : '', finalFeedback ? `feedback: ${finalFeedback}` : ''].filter(Boolean).join('; '),
          },
        ],
        week_notes: [finalFeedback, ...preferenceHints].filter(Boolean).join('; '),
        locked_meals: [],
        _options: {
          output_format: 'detailed',
        },
        recent_meal_names: [...new Set([...recentMealNames.slice(0, 5), ...preferenceSignals.strongAvoidSignals])], // avoid repeats and disliked meals
        preference_signals: {
          favorites: preferenceSignals.favoriteMeals,
          liked_meals: preferenceSignals.likedMeals,
          disliked_meals: preferenceSignals.dislikedMeals,
          refinement_notes: preferenceSignals.refinementNotes,
        },
      }

      console.log('[TonightPage] recent meal history:', recentMealNames.slice(0, 5))

      if (staplesOnHand.trim()) {
        supabase
          .from('households')
          .update({ staples_on_hand: staplesOnHand.trim() })
          .eq('user_id', user.id)
          .then(({ error: staplesError }) => {
            if (staplesError) console.warn('[TonightPage] could not save staples_on_hand:', staplesError.message)
          })
      }

      // First generation call
      console.log('[TonightPage] invoking generate-plan with payload:', JSON.stringify(payload, null, 2).slice(0, 500))

      if (!session?.access_token) {
        toast.error('Session expired, please log in again.')
        navigate('/login', { replace: true })
        return
      }

      const { data, error, functionName } = await invokePlannerFunction(payload, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      console.log('[TonightPage] planner function response:', { functionName, data, error })

      if (error) {
        console.error('[TonightPage] generate-plan error:', error)
        throw new Error(error.message || 'Generation failed')
      }

      if (!data?.plan?.meals?.length) {
        console.error('[TonightPage] no meals in response:', data)
        throw new Error('We couldn\'t find or generate a meal matching your family\'s restrictions. Try simplifying filters or try again.')
      }

      console.log('[TonightPage] received meal:', data.plan.meals[0])
      const normalized = normalizeMealRecord(data.plan.meals[0])
      setMeal(normalized)
      setFeedback('')
      setRefinementChanges([])  // Clear refinement state on new generation
      setMealInstanceId(null)   // Clear old instance ID for new meal
      setMemberFeedback({})
      setShowFeedbackModal(false)
      setRecentMealNames((prev) => {
        const updated = [normalized.name, ...prev.filter(n => n !== normalized.name)].slice(0, 10)
        console.log('[TonightPage] updated recent meal names:', updated)
        return updated
      })

      setHistory((prev) => [
        { name: normalized.name, timestamp: new Date().toISOString() },
        ...prev.slice(0, 4),
      ])

      console.log('[TonightPage] generated and persisted meal:', normalized.name)

      // Auto-save meal and create shopping list
      try {
        const household = await persistTonightMealForUser({ userId: user.id, meal: normalized, staplesOnHand })

        // Phase 2: Create meal_instance for tracking (if table exists)
        if (household?.id && selectedMembers.length > 0) {
          const { data: instance, error: instanceError } = await supabase
            .from('meal_instances')
            .insert({
              household_id: household.id,
              user_id: user.id,
              recipe_id: normalized.recipe_id || null,
              recipe_name: normalized.name,
              selected_member_ids: selectedMembers,
              source: 'generated',
              effort_level: effort,
              dietary_focus: dietaryFocus,
              status: 'generated',
            })
            .select('id')
            .single()

          if (instance) {
            setMealInstanceId(instance.id)
            console.log('[TonightPage] Created meal_instance:', instance.id, 'for members:', selectedMembers)
          } else if (instanceError) {
            console.warn('[TonightPage] meal_instance creation skipped:', instanceError.message)
          }
        }
      } catch (autoSaveErr) {
        console.warn('[TonightPage] auto-save failed:', autoSaveErr)
      }

      toast.success('Meal generated!')
    } catch (err) {
      toast.error(err.message || 'Failed to generate meal')
    } finally {
      setGenerating(false)
    }
  }

  const swapMeal = async () => {
    if (!meal || !user) return

    console.log('[TonightPage] swap started for meal:', meal.name)
    setGenerating(true)

    try {
      const selectedMemberData = selectedMembers.map((id) => {
        const member = members.find((m) => m.id === id)
        return member ? {
          id: member.id,
          label: member.name || member.label,
          role: member.role,
          age: member.age,
          dietary_restrictions: member.dietary_restrictions || [],
          food_preferences: member.food_preferences || [],
        } : null
      }).filter(Boolean)

      const aggregatedRestrictions = [...new Set(selectedMemberData.flatMap((m) => m.dietary_restrictions || []))]
      const aggregatedPreferences = [...new Set(selectedMemberData.flatMap((m) => m.food_preferences || []))]

      const finalDietFocus = dietaryFocus || (aggregatedRestrictions.length > 0 ? aggregatedRestrictions[0] : '')
      const finalFeedback = [feedback, ...aggregatedPreferences.slice(0, 2)].filter(Boolean).join('; ')

      // Calculate servings based on selected members' demographics
      const calculatedServings = selectedMemberData.length > 0 
        ? calculateServings(selectedMemberData)
        : 1

      // Log serving calculation details for swap
      if (selectedMemberData.length > 0) {
        logServingsCalculation(selectedMemberData, calculatedServings)
      }
      console.log('[TonightPage] Swap - selected members:', selectedMemberData.map(m => ({ id: m.id, age: m.age, bucket: getDemographicBucket(m.age) })))
      console.log('[TonightPage] Swap - calculated servings:', calculatedServings)

      // V1: No leftovers planning enabled yet - placeholder for future use
      const plan_for_leftovers = false
      const preferenceHints = [
        ...preferenceSignals.favoriteMeals.map((name) => `favorite: ${name}`),
        ...preferenceSignals.likedMeals.map((name) => `liked: ${name}`),
        ...preferenceSignals.refinementNotes.map((note) => `feedback note: ${note}`),
      ].slice(0, 10)

      const swapPayload = {
        household: {
          total_people: calculatedServings,
          servings: calculatedServings,
          diet_focus: finalDietFocus,
          budget_sensitivity: 'moderate',
          adventurousness: 'mixed',
          staples_on_hand: staplesOnHand,
          planning_priorities: staplesOnHand ? ['quick meal', 'use what we have'] : ['quick meal'],
          cooking_comfort: effort,
          plan_for_leftovers,
        },
        members: selectedMemberData,
        slots: [
          {
            day: String(meal?.day || 'mon'),
            meal: String(meal?.meal || 'dinner'),
            effort: effort,
            planning_notes: [finalDietFocus ? `diet: ${finalDietFocus}` : '', finalFeedback ? `feedback: ${finalFeedback}` : ''].filter(Boolean).join('; '),
          },
        ],
        replace_slot: {
          day: meal?.day || 'mon',
          meal: meal?.meal || 'dinner',
          suggestion: finalFeedback || finalDietFocus || '',
          current_meal_name: meal?.name || '',
        },
        week_notes: [finalFeedback, ...preferenceHints].filter(Boolean).join('; '),
        locked_meals: [],
        _options: {
          output_format: 'detailed',
        },
        recent_meal_names: [...new Set([...recentMealNames.slice(0, 5), ...preferenceSignals.strongAvoidSignals])],
        preference_signals: {
          favorites: preferenceSignals.favoriteMeals,
          liked_meals: preferenceSignals.likedMeals,
          disliked_meals: preferenceSignals.dislikedMeals,
          refinement_notes: preferenceSignals.refinementNotes,
        },
      }

      console.log('[TonightPage] swap recent history:', recentMealNames.slice(0, 5))

      const { data, error } = await invokePlannerFunction(swapPayload)

      if (error) {
        throw new Error(error.message || 'Swap failed')
      }

      if (!data?.plan?.meals?.length) {
        throw new Error('We couldn\'t find or generate a swap matching your family\'s restrictions. Try adjusting filters.')
      }

      const normalized = normalizeMealRecord(data.plan.meals[0])
      setMeal(normalized)
      setFeedback('')
      setCooked(false)
      setRefinementChanges([])  // Clear refinement state on swap
      setMealInstanceId(null)   // Clear old instance ID for swapped meal
      setMemberFeedback({})
      setShowFeedbackModal(false)
      setRecentMealNames((prev) => {
        const updated = [normalized.name, ...prev.filter(n => n !== normalized.name)].slice(0, 10)
        console.log('[TonightPage] updated recent meal names after swap:', updated)
        return updated
      })

      console.log('[TonightPage] swapped to meal:', normalized.name)

      // Capture signal: user swapped away from the previous meal
      console.log('[TonightPage] Signal: swapped away from:', meal.name)
      try {
        await supabase.from('meal_signals').insert({
          user_id: user.id,
          meal_name: meal.name,
          recipe_id: meal.recipe_id,
          signal_type: 'swapped_away',
          created_at: new Date().toISOString()
        })
      } catch (e) {
        console.log('[TonightPage] Signal capture error:', e.message)
      }

      // Auto-save swapped meal and update shopping list
      try {
        const household = await persistTonightMealForUser({ userId: user.id, meal: normalized, staplesOnHand })

        // Phase 2: Create meal_instance for swap (new instance since it's a different recipe)
        if (household?.id && selectedMembers.length > 0) {
          const { data: instance, error: instanceError } = await supabase
            .from('meal_instances')
            .insert({
              household_id: household.id,
              user_id: user.id,
              recipe_id: normalized.recipe_id || null,
              recipe_name: normalized.name,
              selected_member_ids: selectedMembers,
              source: 'swap',
              effort_level: effort,
              dietary_focus: dietaryFocus,
              status: 'generated',
            })
            .select('id')
            .single()

          if (instance) {
            setMealInstanceId(instance.id)
            console.log('[TonightPage] Created swap meal_instance:', instance.id)
          } else if (instanceError) {
            console.warn('[TonightPage] swap meal_instance skipped:', instanceError.message)
          }
        }
      } catch (autoSaveErr) {
        console.warn('[TonightPage] auto-save failed:', autoSaveErr)
      }

      refreshPreferenceSignals()
      toast.success('Meal swapped!')
    } catch (err) {
      toast.error(err.message || 'Failed to swap')
    } finally {
      setGenerating(false)
    }
  }

  // Refine the current meal based on feedback (Phase 1-2)
  const refineCurrentMeal = async () => {
    console.log('[TonightPage] refineCurrentMeal called')
    console.log('[TonightPage]   meal:', meal?.name)
    console.log('[TonightPage]   user:', user?.id)
    console.log('[TonightPage]   feedback:', feedback)
    console.log('[TonightPage]   feedback.trim():', feedback?.trim())
    
    if (!meal) {
      console.error('[TonightPage] Cannot refine: no meal')
      toast.error('No meal to refine')
      return
    }
    if (!user) {
      console.error('[TonightPage] Cannot refine: not logged in')
      toast.error('Please log in first')
      return
    }
    if (!feedback || !feedback.trim()) {
      console.error('[TonightPage] Cannot refine: empty feedback')
      toast.error('Please enter feedback to refine the meal')
      return
    }

    console.log('[TonightPage] refine validation passed, starting...')
    setGenerating(true)
    setRefinementChanges([])

    try {
      const { data, error } = await refineMeal(meal, feedback)
      console.log('[TonightPage] refineMeal returned:', { data, error })

      if (error) {
        console.error('[TonightPage] refine error:', error)
        console.error('[TonightPage] error message:', error.message)
        console.error('[TonightPage] error code:', error.code)
        throw new Error(error.message || 'Refine failed')
      }

      if (!data?.refined) {
        console.error('[TonightPage] No refinement returned - data:', data)
        throw new Error('No refinement returned')
      }

      console.log('[TonightPage] refined meal:', data.refined.name)
      console.log('[TonightPage] changes:', data.changes)

      const refined = normalizeMealRecord(data.refined)
      setMeal(refined)
      setRefinementChanges(data.changes || [])
      setFeedback('')
      setCooked(false)

      try {
        await persistTonightMealForUser({ userId: user.id, meal: refined, staplesOnHand })
      } catch (autoSaveErr) {
        console.warn('[TonightPage] refine auto-save failed:', autoSaveErr)
      }

      // Track signal: user refined this meal
      try {
        await supabase.from('meal_signals').insert([
          {
            user_id: user.id,
            meal_name: meal.name,
            recipe_id: meal.recipe_id,
            signal_type: 'refined_from',
            created_at: new Date().toISOString()
          },
          {
            user_id: user.id,
            meal_name: refined.name,
            recipe_id: refined.recipe_id,
            signal_type: 'refined_to',
            created_at: new Date().toISOString()
          }
        ])
      } catch (e) {
        console.log('[TonightPage] Signal capture error:', e.message)
      }

      refreshPreferenceSignals()
      toast.success('Meal refined!')
    } catch (err) {
      console.error('[TonightPage] refine catch error:', err)
      toast.error(err.message || 'Failed to refine')
    } finally {
      setGenerating(false)
    }
  }

  const markMealCooked = async () => {
    if (!user || !meal) return false

    try {
      let instanceId = mealInstanceId

      if (!instanceId) {
        const { data: household } = await supabase
          .from('households')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (!household?.id) {
          throw new Error('No household found')
        }

        const { data: instance, error } = await supabase
          .from('meal_instances')
          .insert({
            household_id: household.id,
            user_id: user.id,
            recipe_id: meal.recipe_id || null,
            recipe_name: meal.name,
            selected_member_ids: selectedMembers,
            source: 'tonight',
            effort_level: effort,
            dietary_focus: dietaryFocus,
            status: 'cooked',
            cooked_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (error || !instance?.id) {
          throw error || new Error('Failed to mark meal cooked')
        }

        instanceId = instance.id
        setMealInstanceId(instanceId)
      } else {
        const { error } = await supabase
          .from('meal_instances')
          .update({ status: 'cooked', cooked_at: new Date().toISOString() })
          .eq('id', instanceId)

        if (error) throw error
      }

      setCooked(true)
      return true
    } catch (err) {
      console.error('[TonightPage] markMealCooked error:', err)
      toast.error(err.message || 'Failed to mark cooked')
      return false
    }
  }

  const submitFeedback = async () => {
    if (!user) return

    const ratingMembers = members.filter((member) => selectedMembers.includes(member.id))
    const effectiveMembers = ratingMembers.length > 0 ? ratingMembers : members

    if (effectiveMembers.length === 0) {
      toast.error('Add a household member before saving meal feedback')
      return
    }

    try {
      let instanceId = mealInstanceId

      if (!instanceId) {
        const { data: household } = await supabase
          .from('households')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (!household?.id) {
          toast.error('Could not find your household')
          return
        }

        const { data: newInstance, error: instanceError } = await supabase
          .from('meal_instances')
          .insert({
            household_id: household.id,
            user_id: user.id,
            recipe_id: meal?.recipe_id || null,
            recipe_name: meal?.name || 'Unknown',
            selected_member_ids: effectiveMembers.map((member) => member.id),
            source: 'feedback',
            effort_level: effort,
            dietary_focus: dietaryFocus,
            status: 'rated',
            cooked_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (instanceError || !newInstance?.id) {
          throw instanceError || new Error('Failed to create meal instance')
        }

        instanceId = newInstance.id
        setMealInstanceId(instanceId)
      } else {
        const { error: updateError } = await supabase
          .from('meal_instances')
          .update({ status: 'rated', cooked_at: new Date().toISOString() })
          .eq('id', instanceId)

        if (updateError) {
          console.warn('[TonightPage] Could not update meal_instance:', updateError.message)
        }
      }

      const feedbackEntries = effectiveMembers
        .map((member) => ({
          memberId: member.id,
          rating: memberFeedback[member.id]?.rating,
          note: memberFeedback[member.id]?.note || null,
        }))
        .filter((entry) => entry.rating)
        .map((entry) => ({
          meal_instance_id: instanceId,
          household_member_id: entry.memberId,
          recipe_id: meal?.recipe_id || null,
          rating: entry.rating,
          note: entry.note,
        }))

      if (feedbackEntries.length === 0) {
        toast.error('Please select a rating for at least one person')
        return
      }

      const { error: deleteError } = await supabase
        .from('meal_member_feedback')
        .delete()
        .eq('meal_instance_id', instanceId)

      if (deleteError) {
        console.warn('[TonightPage] Could not clear old feedback:', deleteError.message)
      }

      const { error: feedbackError } = await supabase
        .from('meal_member_feedback')
        .insert(feedbackEntries)

      if (feedbackError) {
        throw feedbackError
      }

      const likedCount = feedbackEntries.filter((entry) => ['loved_it', 'liked_it'].includes(entry.rating)).length
      const dislikedCount = feedbackEntries.filter((entry) => ['did_not_like', 'did_not_eat'].includes(entry.rating)).length

      try {
        await supabase.from('meal_signals').insert({
          user_id: user.id,
          meal_name: meal?.name || 'Unknown',
          recipe_id: meal?.recipe_id || null,
          signal_type: likedCount >= dislikedCount ? 'rated_positive' : 'rated_negative',
          created_at: new Date().toISOString()
        })
      } catch (signalError) {
        console.log('[TonightPage] rating signal error:', signalError.message)
      }

      refreshPreferenceSignals()
      setShowFeedbackModal(false)
      toast.success('Thanks for the feedback!')
    } catch (err) {
      console.error('[TonightPage] Submit feedback error:', err)
      toast.error(err.message || 'Failed to save feedback')
    }
  }

  const ratingMembers = members.filter((member) => selectedMembers.includes(member.id))
  const effectiveRatingMembers = ratingMembers.length > 0 ? ratingMembers : members

  return (
    <div className="mx-auto max-w-xl px-4 md:px-6 pt-2 md:pt-4 pb-32">
      <h1 className="font-display text-2xl md:text-3xl text-text-primary mb-2">Tonight's Meal</h1>
      <p className="text-text-secondary mb-4">Generate a quick meal in seconds.</p>

      {/* Quick guidance for first-time users */}
      {!meal && !generating && (
        <div className="mb-4 rounded-xl bg-primary-50 border border-primary-100 p-3">
          <p className="text-sm text-primary-700">
            <span className="font-semibold">How it works:</span> Pick who you're cooking for, choose effort level, and tap generate. Swap anytime if you want something different.
          </p>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-divider bg-white p-4 md:p-6">
        <div>
          <label className="block text-sm font-medium text-text-700 mb-2">
            How much time do you have?
          </label>
          <select
            value={effort}
            onChange={(e) => setEffort(e.target.value)}
            className="input w-full"
          >
            {EFFORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-700 mb-2">Any dietary needs?</label>
          <select
            value={dietaryFocus}
            onChange={(e) => setDietaryFocus(e.target.value)}
            className="input w-full"
          >
            {DIETARY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {members.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-text-700">Cooking for</label>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={selectAllMembers} className="text-primary-600 hover:underline">All</button>
                <span className="text-text-muted">|</span>
                <button type="button" onClick={clearMembers} className="text-primary-600 hover:underline">Clear</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const isSelected = selectedMembers.includes(member.id)
                const hasRestrictions = member.dietary_restrictions?.length > 0 || member.food_preferences?.length > 0
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      isSelected
                        ? 'bg-primary-100 text-primary-700 border border-primary-300'
                        : 'bg-white text-text-secondary border border-divider hover:border-primary-300'
                    }`}
                  >
                    {member.name || member.label || 'Member'}
                    {hasRestrictions && <span className="ml-1 text-xs">*</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-700 mb-2">
            What do you already have? (optional)
          </label>
          <input
            type="text"
            value={staplesOnHand}
            onChange={(e) => setStaplesOnHand(e.target.value)}
            className="input w-full"
            placeholder="e.g., rice, eggs, spinach, tortillas"
          />
          <p className="mt-1 text-xs text-text-muted">
            We&apos;ll try to use these first before adding more to the shopping list.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-700 mb-2">
            Feedback (optional)
          </label>
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="input w-full"
            placeholder="e.g., use tofu instead of chicken, add lime"
          />
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="w-full rounded-full bg-gradient-to-r from-green-500 to-teal-500 px-6 py-3 font-semibold text-white shadow-lg disabled:opacity-50"
        >
          {generating ? 'Generating...' : "Generate tonight's meal"}
        </button>
      </div>

      {meal && (
        <div className="mt-6 rounded-2xl border border-divider bg-white p-4 md:p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-text-primary">{meal.name}</h2>
              <p className="text-sm text-text-secondary">
                {meal.prep_time_minutes} min prep · {meal.cook_time_minutes} min cook · {meal.servings} servings
              </p>
            </div>
            <button
              type="button"
              onClick={toggleFavorite}
              className={`ml-2 flex-shrink-0 rounded-full p-2 transition ${
                isFavorite 
                  ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                  : 'text-gray-400 hover:bg-gray-100 hover:text-red-500'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            >
              <svg className="w-6 h-6" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {/* Meal Image */}
          {meal.image && (
            <div className="mb-4 rounded-xl overflow-hidden bg-gray-100">
              <img 
                src={meal.image} 
                alt={meal.name}
                className="w-full h-48 object-cover"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>
          )}

          {meal.description && (
            <p className="mb-3 text-sm text-text-primary">{meal.description}</p>
          )}

          {/* Prominent "Why this meal" - make it stand out */}
          {(meal.why_this_meal || meal.notes) && (
            <div className="mb-4 rounded-xl bg-gradient-to-r from-primary-50 to-teal-50 border border-primary-100 p-4">
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div>
                  <p className="text-sm font-medium text-primary-800">Why this meal works</p>
                  <p className="text-sm text-primary-700 mt-1">{meal.why_this_meal || meal.notes}</p>
                </div>
              </div>
            </div>
          )}

          {Array.isArray(meal.tags) && meal.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1">
              {meal.tags.map((tag, i) => (
                <span key={i} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{tag}</span>
              ))}
            </div>
          )}

          {meal.notes && (
            <p className="mb-4 text-sm text-text-secondary">{meal.notes}</p>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCookingMode((prev) => !prev)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                cookingMode
                  ? 'bg-primary-500 text-white'
                  : 'border border-divider bg-white text-text-primary'
              }`}
            >
              {cookingMode ? 'Exit cooking mode' : 'Start cooking mode'}
            </button>
            <Link
              to="/shop"
              className="rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary"
            >
              View shopping list
            </Link>
          </div>

          {cookingMode ? (
            <div className="mb-4 rounded-2xl border border-primary-200 bg-primary-50 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Cooking mode</p>
                  <h3 className="text-base font-semibold text-text-primary">
                    Step {Math.min(currentStepIndex + 1, Math.max((meal.instructions || []).length, 1))} of {Math.max((meal.instructions || []).length, 1)}
                  </h3>
                </div>
                <div className="text-sm text-primary-700">
                  {Object.values(ingredientChecks).filter(Boolean).length} checked
                </div>
              </div>

              <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
                {(meal.instructions || []).length > 0 ? (
                  <>
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Current step</div>
                    <p className="mt-2 text-base text-text-primary">{meal.instructions[currentStepIndex] || meal.instructions[0]}</p>
                  </>
                ) : (
                  <p className="text-sm text-text-secondary">No instructions listed</p>
                )}
              </div>

              {CATEGORY_ORDER.filter((category) => shoppingPrepItems[category]?.length).length > 0 && (
                <div className="mb-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Prep checklist</div>
                  {CATEGORY_ORDER.filter((category) => shoppingPrepItems[category]?.length).map((category) => (
                    <div key={category} className="rounded-xl bg-white p-3 shadow-sm">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{CATEGORY_LABELS[category] || 'Other'}</div>
                      <div className="space-y-2">
                        {shoppingPrepItems[category].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setIngredientChecks((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <div className={`flex h-5 w-5 items-center justify-center rounded border ${ingredientChecks[item.id] ? 'border-green-500 bg-green-500 text-white' : 'border-divider bg-white text-transparent'}`}>
                              ✓
                            </div>
                            <div className="flex-1 text-sm text-text-primary">
                              {item.name}
                            </div>
                            <div className="text-xs text-text-muted">
                              {item.quantity} {item.unit}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={currentStepIndex === 0}
                  className="flex-1 rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max((meal.instructions || []).length - 1, 0)))}
                  disabled={currentStepIndex >= Math.max((meal.instructions || []).length - 1, 0)}
                  className="flex-1 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Next step
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-text-primary">Ingredients</h3>
                <ul className="space-y-1 text-sm text-text-secondary">
                  {(meal.ingredients || []).length > 0 ? (
                    meal.ingredients.map((ing, i) => (
                      <li key={i}>{typeof ing === 'string' ? ing : ''}</li>
                    ))
                  ) : (
                    <li>No ingredients listed</li>
                  )}
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-text-primary">Instructions</h3>
                <ol className="space-y-2 text-sm text-text-secondary">
                  {(meal.instructions || []).length > 0 ? (
                    meal.instructions.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-semibold text-text-primary">{i + 1}.</span>
                        <span>{typeof step === 'string' ? step : ''}</span>
                      </li>
                    ))
                  ) : (
                    <li>No instructions listed</li>
                  )}
                </ol>
              </div>
            </>
          )}

          {Array.isArray(meal.visual_cues) && meal.visual_cues.length > 0 && (
            <div className="mb-4 rounded-xl bg-yellow-50 p-3">
              <h4 className="mb-1 text-xs font-semibold text-yellow-800">👀 Look for</h4>
              <ul className="space-y-1 text-sm text-yellow-700">
                {meal.visual_cues.map((cue, i) => (
                  <li key={i}>• {cue}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(meal.tips) && meal.tips.length > 0 && (
            <div className="mb-4 rounded-xl bg-blue-50 p-3">
              <h4 className="mb-1 text-xs font-semibold text-blue-800">💡 Tips</h4>
              <ul className="space-y-1 text-sm text-blue-700">
                {meal.tips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(meal.common_mistakes) && meal.common_mistakes.length > 0 && (
            <div className="mb-4 rounded-xl bg-red-50 p-3">
              <h4 className="mb-1 text-xs font-semibold text-red-800">⚠️ Avoid</h4>
              <ul className="space-y-1 text-sm text-red-700">
                {meal.common_mistakes.map((mistake, i) => (
                  <li key={i}>• {mistake}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(meal.easy_swaps) && meal.easy_swaps.length > 0 && (
            <div className="mb-4 rounded-xl bg-green-50 p-3">
              <h4 className="mb-1 text-xs font-semibold text-green-800">🔄 Easy swaps</h4>
              <ul className="space-y-1 text-sm text-green-700">
                {meal.easy_swaps.map((swap, i) => (
                  <li key={i}>• {swap}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Phase 4: Show refinement changes */}
          {refinementChanges.length > 0 && (
            <div className="mb-4 rounded-xl bg-purple-50 p-3">
              <h4 className="mb-1 text-xs font-semibold text-purple-800">🔄 Updated based on your feedback:</h4>
              <ul className="space-y-1 text-sm text-purple-700">
                {refinementChanges.map((change, i) => (
                  <li key={i}>• {change}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Feedback input for refining the meal - visible after generation */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-text-700 mb-1">
              Refine this meal
            </label>
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="input w-full text-sm"
              placeholder="e.g., make it vegetarian, less spicy, use mushrooms"
            />
            <p className="text-xs text-text-muted mt-1">
              Enter changes and click Refine to get a new version
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={refineCurrentMeal}
              disabled={generating || !feedback.trim()}
              className="flex-1 rounded-full border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 disabled:opacity-50 hover:bg-purple-100"
            >
              Refine
            </button>
            
            <button
              type="button"
              onClick={swapMeal}
              disabled={generating}
              className="flex-1 rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
            >
              Swap
            </button>
            
            <button
              type="button"
              onClick={async () => {
                if (cooked) {
                  setShowFeedbackModal(true)
                  return
                }

                const marked = await markMealCooked()
                if (marked) {
                  setShowFeedbackModal(true)
                }
              }}
              className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                cooked
                  ? 'border-green-500 bg-green-100 text-green-700'
                  : 'border-divider bg-white text-text-primary'
              }`}
            >
              {cooked ? 'Rate meal' : 'Mark cooked'}
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Recent meals</h3>
          <div className="space-y-1">
            {history.map((h, i) => (
              <div key={i} className="text-sm text-text-secondary">
                {h.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved / Favorites Meals */}
      {savedMeals.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Saved favorites</h3>
          <div className="space-y-2">
            {savedMeals.slice(0, 5).map((saved) => (
              <button
                key={saved.id}
                type="button"
                onClick={() => loadSavedMeal(saved)}
                className="w-full text-left rounded-xl border border-divider bg-white p-3 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">{saved.recipe_name}</span>
                  <span className="text-red-500">❤️</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <h2 className="mb-2 text-xl font-semibold text-text-primary">
              How was {meal?.name}?
            </h2>
            <p className="mb-4 text-sm text-text-secondary">
              Rate how each person felt about tonight&apos;s meal.
            </p>

            {effectiveRatingMembers.length === 0 ? (
              <div className="mb-6 rounded-xl border border-divider p-4 text-sm text-text-secondary">
                Add household members first, then you can track who liked tonight&apos;s meal.
              </div>
            ) : (
              <div className="mb-6 space-y-4">
                {effectiveRatingMembers.map((member) => (
                  <div key={member.id} className="rounded-xl border border-divider p-3">
                    <div className="mb-2 font-medium text-text-primary">
                      {member.name || member.label || 'Family member'}
                    </div>

                    <div className="mb-2 flex flex-wrap gap-1">
                      {MEMBER_FEEDBACK_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setMemberFeedback((prev) => ({
                            ...prev,
                            [member.id]: { ...prev[member.id], rating: opt.value },
                          }))}
                          className={`rounded-full px-2 py-1 text-xs transition ${
                            memberFeedback[member.id]?.rating === opt.value
                              ? 'border border-primary-300 bg-primary-100 text-primary-700'
                              : 'border border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="What should we change next time?"
                      className="input w-full text-sm"
                      value={memberFeedback[member.id]?.note || ''}
                      onChange={(e) => setMemberFeedback((prev) => ({
                        ...prev,
                        [member.id]: { ...prev[member.id], note: e.target.value },
                      }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={submitFeedback}
                disabled={effectiveRatingMembers.length === 0}
                className="flex-1 rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
