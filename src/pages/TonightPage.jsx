import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { normalizeMealRecord } from '../lib/mealSchema'

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

export function TonightPage() {
  useDocumentTitle("Tonight's Meal | Allio")
  const { user } = useAuth()
  const { members, loading: membersLoading } = useHouseholdMembers(user?.id)

  const [selectedMembers, setSelectedMembers] = useState([])
  const [effort, setEffort] = useState('medium')
  const [dietaryFocus, setDietaryFocus] = useState('')
  const [feedback, setFeedback] = useState('')
  const [generating, setGenerating] = useState(false)
  const [meal, setMeal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [cooked, setCooked] = useState(false)
  const [history, setHistory] = useState([])

  // Load last saved meal on mount
  useEffect(() => {
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

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
          console.log('[TonightPage] loaded last meal:', lastMeal.name)
        } else if (mealPlan?.draft_plan?.meals?.length > 0) {
          const lastMeal = normalizeMealRecord(mealPlan.draft_plan.meals[0])
          setMeal(lastMeal)
          console.log('[TonightPage] loaded last draft meal:', lastMeal.name)
        }
      })
  }, [user])

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

      const payload = {
        household: {
          total_people: selectedMembers.length > 0 ? selectedMembers.length : 1,
          diet_focus: finalDietFocus,
          budget_sensitivity: 'moderate',
          adventurousness: 'mixed',
          staples_on_hand: '',
          planning_priorities: ['quick meal'],
          cooking_comfort: effort,
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
        week_notes: finalFeedback || '',
        locked_meals: [],
        _options: {
          output_format: 'detailed',
        },
      }

      // First generation call
      console.log('[TonightPage] invoking generate-plan with payload:', JSON.stringify(payload, null, 2).slice(0, 500))

      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: payload,
      })

      console.log('[TonightPage] generate-plan response:', { data, error })

      if (error) {
        console.error('[TonightPage] generate-plan error:', error)
        throw new Error(error.message || 'Generation failed')
      }

      if (!data?.plan?.meals?.length) {
        console.error('[TonightPage] no meals in response:', data)
        throw new Error('No meal returned')
      }

      console.log('[TonightPage] received meal:', data.plan.meals[0])
      const normalized = normalizeMealRecord(data.plan.meals[0])
      setMeal(normalized)
      setFeedback('')

      setHistory((prev) => [
        { name: normalized.name, timestamp: new Date().toISOString() },
        ...prev.slice(0, 4),
      ])

      // Auto-save meal and create shopping list
      try {
        const { data: household } = await supabase
          .from('households')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (household?.id) {
          const planPayload = {
            meals: [{ ...normalized, id: `${normalized.day}-${normalized.meal}` }],
          }

          await supabase.from('meal_plans').upsert({
            user_id: user.id,
            household_id: household.id,
            week_of: new Date().toISOString().split('T')[0],
            status: 'active',
            plan: planPayload,
            draft_plan: planPayload,
            updated_at: new Date().toISOString(),
          })

          // Auto-create shopping list
          const shoppingItems = (normalized.ingredients || []).map((ing) => ({
            name: typeof ing === 'string' ? ing : '',
            quantity: 1,
            category: 'groceries',
            checked: false,
          }))

          const today = new Date().toISOString().split('T')[0]
          const { data: existingList } = await supabase
            .from('shopping_lists')
            .select('id, items')
            .eq('user_id', user.id)
            .eq('week_of', today)
            .maybeSingle()

          if (existingList?.id) {
            await supabase
              .from('shopping_lists')
              .update({ items: [...(existingList.items || []), ...shoppingItems] })
              .eq('id', existingList.id)
          } else {
            await supabase
              .from('shopping_lists')
              .insert({
                user_id: user.id,
                household_id: household.id,
                week_of: today,
                items: shoppingItems,
              })
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

      const swapPayload = {
        household: {
          total_people: selectedMembers.length > 0 ? selectedMembers.length : 1,
          diet_focus: finalDietFocus,
          budget_sensitivity: 'moderate',
          adventurousness: 'mixed',
          staples_on_hand: '',
          planning_priorities: ['quick meal'],
          cooking_comfort: effort,
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
        },
        week_notes: finalFeedback || '',
        locked_meals: [],
        _options: {
          output_format: 'detailed',
        },
      }

      const { data, error } = await supabase.functions.invoke('generate-plan', {
        body: swapPayload,
      })

      if (error) {
        throw new Error(error.message || 'Swap failed')
      }

      if (!data?.plan?.meals?.length) {
        throw new Error('No meal returned')
      }

      const normalized = normalizeMealRecord(data.plan.meals[0])
      setMeal(normalized)
      setFeedback('')
      setCooked(false)

      // Auto-save swapped meal and update shopping list
      try {
        const { data: household } = await supabase
          .from('households')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (household?.id) {
          const planPayload = {
            meals: [{ ...normalized, id: `${normalized.day}-${normalized.meal}` }],
          }

          await supabase.from('meal_plans').upsert({
            user_id: user.id,
            household_id: household.id,
            week_of: new Date().toISOString().split('T')[0],
            status: 'active',
            plan: planPayload,
            draft_plan: planPayload,
            updated_at: new Date().toISOString(),
          })

          // Auto-update shopping list
          const shoppingItems = (normalized.ingredients || []).map((ing) => ({
            name: typeof ing === 'string' ? ing : '',
            quantity: 1,
            category: 'groceries',
            checked: false,
          }))

          const today = new Date().toISOString().split('T')[0]
          const { data: existingList } = await supabase
            .from('shopping_lists')
            .select('id, items')
            .eq('user_id', user.id)
            .eq('week_of', today)
            .maybeSingle()

          if (existingList?.id) {
            await supabase
              .from('shopping_lists')
              .update({ items: [...(existingList.items || []), ...shoppingItems] })
              .eq('id', existingList.id)
          } else {
            await supabase
              .from('shopping_lists')
              .insert({
                user_id: user.id,
                household_id: household.id,
                week_of: today,
                items: shoppingItems,
              })
          }
        }
      } catch (autoSaveErr) {
        console.warn('[TonightPage] auto-save failed:', autoSaveErr)
      }

      toast.success('Meal swapped!')
    } catch (err) {
      toast.error(err.message || 'Failed to swap')
    } finally {
      setGenerating(false)
    }
  }

  const saveMeal = async () => {
    if (!meal || !user) return

    setSaving(true)

    try {
      const { data: household } = await supabase
        .from('households')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (!household?.id) {
        throw new Error('No household found')
      }

      const planPayload = {
        meals: [{ ...meal, id: `${meal.day}-${meal.meal}` }],
      }

      const { error: saveError } = await supabase.from('meal_plans').upsert({
        user_id: user.id,
        household_id: household.id,
        week_of: new Date().toISOString().split('T')[0],
        status: 'active',
        plan: planPayload,
        draft_plan: planPayload,
        updated_at: new Date().toISOString(),
      })

      if (saveError) {
        throw saveError
      }

      // Also create shopping list from meal ingredients
      const shoppingItems = (meal.ingredients || []).map((ing) => {
        const ingStr = typeof ing === 'string' ? ing : ''
        return {
          name: ingStr,
          quantity: 1,
          category: 'groceries',
          checked: false,
        }
      })

      // Check if shopping list exists for today
      const today = new Date().toISOString().split('T')[0]
      const { data: existingList } = await supabase
        .from('shopping_lists')
        .select('id, items')
        .eq('user_id', user.id)
        .eq('week_of', today)
        .maybeSingle()

      if (existingList?.id) {
        // Append to existing list
        const existingItems = existingList.items || []
        const { error: updateError } = await supabase
          .from('shopping_lists')
          .update({ items: [...existingItems, ...shoppingItems] })
          .eq('id', existingList.id)
        
        if (updateError) {
          console.warn('[TonightPage] Could not update shopping list:', updateError)
        }
      } else {
        // Create new shopping list
        const { error: listError } = await supabase
          .from('shopping_lists')
          .insert({
            user_id: user.id,
            household_id: household.id,
            week_of: today,
            items: shoppingItems,
          })

        if (listError) {
          console.warn('[TonightPage] Could not create shopping list:', listError)
        }
      }

      toast.success('Meal saved!')
    } catch (err) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 md:px-6 pt-2 md:pt-4 pb-32">
      <h1 className="font-display text-2xl md:text-3xl text-text-primary mb-2">Tonight's Meal</h1>
      <p className="text-text-secondary mb-6">Generate a quick meal in seconds.</p>

      <div className="space-y-4 rounded-2xl border border-divider bg-white p-4 md:p-6">
        <div>
          <label className="block text-sm font-medium text-text-700 mb-2">Effort level</label>
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
          <label className="block text-sm font-medium text-text-700 mb-2">Dietary focus</label>
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
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-text-primary">{meal.name}</h2>
            <p className="text-sm text-text-secondary">
              {meal.prep_time_minutes} min prep · {meal.cook_time_minutes} min cook · {meal.servings} servings
            </p>
          </div>

          {meal.description && (
            <p className="mb-3 text-sm text-text-primary">{meal.description}</p>
          )}

          {meal.why_this_meal && (
            <div className="mb-4 rounded-xl bg-primary-50 p-3 text-sm text-primary-700">
              <strong>Why this meal:</strong> {meal.why_this_meal}
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

          <div className="flex gap-2">
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
              onClick={() => setCooked(!cooked)}
              className={`flex-1 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                cooked
                  ? 'border-green-500 bg-green-100 text-green-700'
                  : 'border-divider bg-white text-text-primary'
              }`}
            >
              {cooked ? 'Cooked!' : 'Mark cooked'}
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
    </div>
  )
}