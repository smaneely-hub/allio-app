import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getDailyTargets } from '../lib/nutritionTargets'
import { addManualMealLog, addPlannedMealLog, deleteMealLog, updateMealLog } from '../lib/nutritionLogging'
import { addNutritionLogToPlanner } from '../lib/plannerSync'
import { formatIsoLocalDate, getStartOfWeek, normalizeDayName } from '../lib/planner'
import { normalizeMealRecord } from '../lib/mealSchema'
import { MacroBars } from '../components/nutrition/MacroBars'
import { MealSlotGroup } from '../components/nutrition/MealSlotGroup'
import { EmptyState } from '../components/nutrition/EmptyState'
import { ManualLogModal } from '../components/nutrition/ManualLogModal'
import { FoodPickerModal } from '../components/nutrition/FoodPickerModal'
import { NutritionTrendsSection } from '../components/nutrition/NutritionTrendsSection'

const SLOT_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
const SLOT_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
}

const SLOT_COLORS = {
  breakfast: '#F97316',
  lunch: '#14B8A6',
  dinner: '#7B8CF6',
  snack: '#EC4899',
}

export function NutritionPage() {
  useDocumentTitle('Nutrition | Allio')
  const { user } = useAuth()
  const [targets, setTargets] = useState(null)
  const [dailyLog, setDailyLog] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('breakfast')
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [hydratingPlan, setHydratingPlan] = useState(false)
  const [foodModalOpen, setFoodModalOpen] = useState(false)
  const [mealsExpanded, setMealsExpanded] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const getTodayPlannedMeals = (mealPlan) => {
    const rawMeals = mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []
    if (!rawMeals.length) return []

    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const todayDayName = normalizeDayName(todayDate.toLocaleDateString('en-US', { weekday: 'long' }))
    const todayShort = todayDayName.slice(0, 3).toLowerCase()
    const normalizedMeals = rawMeals.map((meal) => normalizeMealRecord(meal))

    const exactDateMeals = normalizedMeals.filter((meal) => meal?.date === today)
    if (exactDateMeals.length) return exactDateMeals

    const currentWeekStart = formatIsoLocalDate(getStartOfWeek(todayDate))
    const planDates = normalizedMeals.map((meal) => meal?.date).filter(Boolean)
    const planLooksCurrentWeek = planDates.some((date) => String(date) >= currentWeekStart)

    if (planLooksCurrentWeek) {
      return normalizedMeals.filter((meal) => meal?.day === todayShort)
    }

    return []
  }

  const ensurePlannedMealsLogged = async (existingEntries = []) => {
    if (!user?.id) return false

    const { data: mealPlan } = await supabase
      .from('meal_plans')
      .select('draft_plan, plan')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const plannedMeals = getTodayPlannedMeals(mealPlan)
    const plannerKeys = new Set(
      plannedMeals.map((meal) => `${meal.recipe_id || ''}::${meal.name || meal.title || ''}::${meal.meal || meal.slot || 'dinner'}`)
    )

    const autoAddedEntries = existingEntries.filter((entry) => entry.notes === 'Auto-added from meal plan')
    const staleEntries = autoAddedEntries.filter((entry) => !plannerKeys.has(`${entry.recipe_id || ''}::${entry.entry_name}::${entry.meal_slot}`))

    if (staleEntries.length) {
      const { error } = await supabase.from('meal_nutrition_logs').delete().in('id', staleEntries.map((entry) => entry.id))
      if (error) throw error
    }

    if (!plannedMeals.length) {
      return staleEntries.length > 0
    }

    const existingKeys = new Set(autoAddedEntries.map((entry) => `${entry.recipe_id || ''}::${entry.entry_name}::${entry.meal_slot}`))

    const missingMeals = plannedMeals.filter((meal) => {
      const key = `${meal.recipe_id || ''}::${meal.name || meal.title || ''}::${meal.meal || meal.slot || 'dinner'}`
      return !existingKeys.has(key)
    })

    for (const meal of missingMeals) {
      await addPlannedMealLog({ user_id: user.id, log_date: today, meal })
    }

    return staleEntries.length > 0 || missingMeals.length > 0
  }

  const load = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [targetData, dailyResult, entriesResult] = await Promise.all([
        getDailyTargets(user.id),
        supabase.from('daily_nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', today).maybeSingle(),
        supabase.from('meal_nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', today).order('logged_at', { ascending: true }),
      ])

      if (!hydratingPlan) {
        setHydratingPlan(true)
        const changed = await ensurePlannedMealsLogged(entriesResult.data || [])
        if (changed) {
          await supabase.rpc('recompute_daily_nutrition_log', {
            p_user_id: user.id,
            p_log_date: today,
          })
        }
        const [refreshedDaily, refreshedEntries] = await Promise.all([
          supabase.from('daily_nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', today).maybeSingle(),
          supabase.from('meal_nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', today).order('logged_at', { ascending: true }),
        ])
        setTargets(targetData)
        setDailyLog(refreshedDaily.data || dailyResult.data || null)
        setEntries(refreshedEntries.data || entriesResult.data || [])
        setHydratingPlan(false)
        setLoading(false)
        return
      }

      setTargets(targetData)
      setDailyLog(dailyResult.data || null)
      setEntries(entriesResult.data || [])
    } catch (error) {
      console.error('[NutritionPage] load error', error)
      toast.error('Could not load nutrition logs')
    } finally {
      setHydratingPlan(false)
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.id])

  const totals = {
    calories: Number(dailyLog?.total_calories || 0),
    protein_g: Number(dailyLog?.total_protein_g || 0),
    carbs_g: Number(dailyLog?.total_carbs_g || 0),
    fat_g: Number(dailyLog?.total_fat_g || 0),
  }

  const grouped = useMemo(() => SLOT_ORDER.reduce((acc, slot) => ({ ...acc, [slot]: entries.filter((entry) => entry.meal_slot === slot) }), {}), [entries])
  const slotsWithEntries = useMemo(() => SLOT_ORDER.filter((slot) => (grouped[slot] || []).length > 0), [grouped])
  const dailyMealContributions = useMemo(() => slotsWithEntries.map((slot) => ({
    key: slot,
    label: SLOT_LABELS[slot],
    color: SLOT_COLORS[slot],
    calories: (grouped[slot] || []).reduce((sum, item) => sum + Number(item.calories || 0), 0),
    protein_g: Math.round((grouped[slot] || []).reduce((sum, item) => sum + Number(item.protein_g || 0), 0) * 10) / 10,
    carbs_g: Math.round((grouped[slot] || []).reduce((sum, item) => sum + Number(item.carbs_g || 0), 0) * 10) / 10,
    fat_g: Math.round((grouped[slot] || []).reduce((sum, item) => sum + Number(item.fat_g || 0), 0) * 10) / 10,
  })), [grouped, slotsWithEntries])

  const openAdd = (slot) => {
    setSelectedSlot(slot)
    setEditingItem(null)
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setSelectedSlot(item.meal_slot)
    setModalOpen(true)
  }

  const openFoodPicker = (slot) => {
    setSelectedSlot(slot)
    setFoodModalOpen(true)
  }

  const handleSave = async (form) => {
    if (!user?.id) return
    setSaving(true)
    try {
      const servings = Math.max(0.5, Number(form.servings) || 1)
      const totalCalories = Math.round(Number(form.calories || 0) * servings)
      const totalProtein = Math.round(Number(form.protein_g || 0) * servings * 10) / 10
      const totalCarbs = Math.round(Number(form.carbs_g || 0) * servings * 10) / 10
      const totalFat = Math.round(Number(form.fat_g || 0) * servings * 10) / 10

      let savedEntry = null
      if (editingItem) {
        savedEntry = await updateMealLog(editingItem.id, {
          meal_slot: form.meal_slot,
          log_date: form.log_date,
          entry_name: form.name,
          calories: totalCalories,
          protein_g: totalProtein,
          carbs_g: totalCarbs,
          fat_g: totalFat,
          notes: form.notes,
          servings,
        })
        toast.success('Meal log updated')
      } else {
        savedEntry = await addManualMealLog({
          user_id: user.id,
          meal_slot: form.meal_slot,
          log_date: form.log_date,
          name: form.name,
          calories: totalCalories,
          protein_g: totalProtein,
          carbs_g: totalCarbs,
          fat_g: totalFat,
          notes: form.notes,
          serving_count: servings,
        })
        toast.success('Meal logged')
      }

      if (form.addToPlanner && savedEntry) {
        try {
          const result = await addNutritionLogToPlanner({ userId: user.id, logEntry: savedEntry })
          if (result.alreadyExists) {
            toast('Already in your planner')
          } else {
            toast.success('Also added to planner')
          }
        } catch (plannerErr) {
          console.error('[NutritionPage] planner sync error', plannerErr)
          toast.error(plannerErr.message || 'Could not add to planner')
        }
      }

      setModalOpen(false)
      setEditingItem(null)
      await load()
    } catch (error) {
      console.error('[NutritionPage] save error', error)
      toast.error('Could not save meal log')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    setSaving(true)
    try {
      await deleteMealLog(item.id)
      toast.success('Meal log deleted')
      setModalOpen(false)
      setEditingItem(null)
      await load()
    } catch (error) {
      console.error('[NutritionPage] delete error', error)
      toast.error('Could not delete meal log')
    } finally {
      setSaving(false)
    }
  }

  const handleAddFood = async (food) => {
    if (!user?.id) return
    setSaving(true)
    try {
      await addManualMealLog({
        user_id: user.id,
        log_date: today,
        meal_slot: food.meal_slot,
        name: food.name,
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        food_item_id: food.food_item_id,
        notes: food.notes,
        source_type: food.source_type,
        serving_count: food.serving_count,
      })
      toast.success('Food added')
      setFoodModalOpen(false)
      await load()
    } catch (error) {
      console.error('[NutritionPage] add food error', error)
      toast.error('Could not add food')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 text-text-secondary">Loading nutrition…</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:px-6 md:pt-6">
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-3xl text-text-primary">Nutrition</h1>
          <p className="mt-2 text-sm text-text-secondary">Track what you cooked, what you logged, and where today stands.</p>
        </div>

        {entries.length === 0 ? <EmptyState onAdd={() => openAdd('breakfast')} /> : (
          <section className="rounded-3xl border border-divider bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={() => setMealsExpanded((current) => !current)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <h2 className="font-display text-xl text-text-primary">Today’s macros</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {totals.calories.toLocaleString()} kcal, {slotsWithEntries.length} meal section{slotsWithEntries.length === 1 ? '' : 's'} logged
                </p>
              </div>
              <span className="text-sm text-text-muted">{mealsExpanded ? '▼' : '▲'}</span>
            </button>

            <div className="mt-4">
              <MacroBars totals={totals} targets={targets || {}} mealContributions={dailyMealContributions} />
            </div>

            {mealsExpanded ? (
              <div className="mt-4 grid gap-4">
                {SLOT_ORDER.map((slot) => (
                  <MealSlotGroup key={slot} title={SLOT_LABELS[slot]} items={grouped[slot] || []} onAdd={() => openFoodPicker(slot)} onAddFood={() => openFoodPicker(slot)} onEdit={openEdit} targets={targets || {}} contributionColor={SLOT_COLORS[slot]} />
                ))}
              </div>
            ) : null}
          </section>
        )}

        <NutritionTrendsSection userId={user?.id} />
      </div>

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={() => openAdd('breakfast')} className="text-sm font-medium text-text-secondary underline underline-offset-2">
          Need a custom manual entry instead?
        </button>
      </div>

      <ManualLogModal
        open={modalOpen}
        initialSlot={selectedSlot}
        item={editingItem}
        onClose={() => { setModalOpen(false); setEditingItem(null) }}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={saving}
      />

      <FoodPickerModal
        open={foodModalOpen}
        userId={user?.id}
        initialSlot={selectedSlot}
        onClose={() => setFoodModalOpen(false)}
        onPick={handleAddFood}
      />
    </div>
  )
}
