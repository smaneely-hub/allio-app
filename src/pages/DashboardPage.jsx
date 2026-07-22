import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../hooks/useAuth'
import { useHousehold } from '../hooks/useHousehold'
import { useSchedule } from '../hooks/useSchedule'
import { useShoppingList } from '../hooks/useShoppingList'
import { useNutritionProfile } from '../hooks/useNutritionProfile'
import { supabase } from '../lib/supabase'
import { getDailyTargets } from '../lib/nutritionTargets'
import { addManualMealLog, addPlannedMealLog, deleteMealLog } from '../lib/nutritionLogging'
import { addNutritionLogToPlanner } from '../lib/plannerSync'
import { normalizeMealRecord } from '../lib/mealSchema'
import { formatIsoLocalDate, getStartOfWeek } from '../lib/planner'
import { categorizeIngredient } from '../lib/shoppingListUtils'
import { WeightTrendCard } from '../components/health/WeightTrendCard'
import { MacroBars } from '../components/nutrition/MacroBars'
import { ManualLogModal } from '../components/nutrition/ManualLogModal'
import { FoodPickerModal } from '../components/nutrition/FoodPickerModal'
import { CatalogPickerModal } from '../components/planner/CatalogPickerModal'

// Module-level constants: stable across renders for the lifetime of this page load
const TODAY_ISO = new Date().toISOString().slice(0, 10)
const _tomorrow = new Date()
_tomorrow.setDate(_tomorrow.getDate() + 1)
const TOMORROW_ISO = _tomorrow.toISOString().slice(0, 10)

function dayShort(date = new Date()) {
  return date.toLocaleDateString('en-US', { weekday: 'long' }).slice(0, 3).toLowerCase()
}

const TODAY_SHORT = dayShort()
const TOMORROW_SHORT = dayShort(_tomorrow)

const SHOPPING_DAY_LABELS = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}
const MEAL_SLOT_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }

function getNextShoppingDate(shoppingDay) {
  const DAY_NUMS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
  const target = DAY_NUMS[shoppingDay]
  if (target == null) return null
  const today = new Date()
  let diff = target - today.getDay()
  if (diff <= 0) diff += 7
  const next = new Date(today)
  next.setDate(today.getDate() + diff)
  return next
}

function getPlanMealsForDay(mealPlan, targetShort, targetIso) {
  const rawMeals = mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []
  if (!rawMeals.length) return []
  const normalized = rawMeals.map((m) => normalizeMealRecord(m))
  const byDate = normalized.filter((m) => m?.date === targetIso)
  if (byDate.length) return byDate
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const weekStart = formatIsoLocalDate(getStartOfWeek(todayDate))
  const planDates = normalized.map((m) => m?.date).filter(Boolean)
  if (planDates.some((d) => d >= weekStart)) {
    return normalized.filter((m) => m?.day === targetShort)
  }
  return []
}

// Matching keys: name+slot (name-based approximation — see tradeoff in report)
function planMealKey(meal) {
  return `${String(meal.name || meal.title || '').trim().toLowerCase()}::${meal.meal || 'dinner'}`
}
function logMatchKey(log) {
  return `${String(log.entry_name || '').trim().toLowerCase()}::${log.meal_slot}`
}

function AddFoodSheet({ open, onClose, onManual, onFoodDB, onCatalog }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center px-4 pb-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl text-text-primary">Log food</h3>
          <button type="button" onClick={onClose} className="rounded-full border border-divider px-3 py-1 text-sm text-text-secondary">✕</button>
        </div>
        <div className="space-y-2">
          {[
            { icon: '✏️', label: 'Manual entry', detail: 'Enter name and macros by hand', action: onManual },
            { icon: '🔍', label: 'Food database', detail: 'Search common and branded foods', action: onFoodDB },
            { icon: '📚', label: 'From your recipes', detail: 'Pick from your saved catalog', action: onCatalog },
          ].map(({ icon, label, detail, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="flex w-full items-center gap-3 rounded-2xl border border-divider bg-white px-4 py-3 text-left transition-colors hover:bg-primary-50"
            >
              <span className="text-xl">{icon}</span>
              <div>
                <div className="text-sm font-medium text-text-primary">{label}</div>
                <div className="text-xs text-text-muted">{detail}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  useDocumentTitle('Home | Allio')

  const { user } = useAuth()
  const { household } = useHousehold()
  const { schedule, slots } = useSchedule()
  const { shoppingList, items: shopItems, addItem: addShopItem } = useShoppingList(user?.id, null)
  const { weightHistory, profile: nutProfile } = useNutritionProfile()

  const [planMeals, setPlanMeals] = useState([])
  const [tomorrowMeals, setTomorrowMeals] = useState([])
  const [todayLogs, setTodayLogs] = useState([])
  const [dailyLog, setDailyLog] = useState(null)
  const [targets, setTargets] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)

  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [foodOpen, setFoodOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('dinner')
  const [catalogPrefill, setCatalogPrefill] = useState('')
  const [saving, setSaving] = useState(false)

  const [shopName, setShopName] = useState('')
  const [shopAdding, setShopAdding] = useState(false)

  const refreshDailyLogs = useCallback(async () => {
    if (!user?.id) return
    const [logsRes, dailyRes] = await Promise.all([
      supabase.from('meal_nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', TODAY_ISO).order('logged_at', { ascending: true }),
      supabase.from('daily_nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', TODAY_ISO).maybeSingle(),
    ])
    setTodayLogs(logsRes.data || [])
    setDailyLog(dailyRes.data || null)
  }, [user?.id])

  const load = useCallback(async () => {
    if (!user?.id) { setDataLoading(false); return }
    setDataLoading(true)
    try {
      const [planRes, logsRes, dailyRes, targetData] = await Promise.all([
        supabase.from('meal_plans').select('draft_plan, plan').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('meal_nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', TODAY_ISO).order('logged_at', { ascending: true }),
        supabase.from('daily_nutrition_logs').select('*').eq('user_id', user.id).eq('log_date', TODAY_ISO).maybeSingle(),
        getDailyTargets(user.id),
      ])

      const todayMeals = getPlanMealsForDay(planRes.data, TODAY_SHORT, TODAY_ISO)
      const tomMeals = getPlanMealsForDay(planRes.data, TOMORROW_SHORT, TOMORROW_ISO)

      // Auto-hydrate: ensure today's planned meals are in the nutrition log
      const existing = logsRes.data || []
      const existingKeys = new Set(
        existing.filter((e) => e.notes === 'Auto-added from meal plan').map(logMatchKey)
      )
      const missing = todayMeals.filter((m) => !existingKeys.has(planMealKey(m)))

      if (missing.length) {
        await Promise.allSettled(
          missing.map((meal) => addPlannedMealLog({ user_id: user.id, log_date: TODAY_ISO, meal }))
        )
        await refreshDailyLogs()
      } else {
        setTodayLogs(existing)
        setDailyLog(dailyRes.data || null)
      }

      setPlanMeals(todayMeals)
      setTomorrowMeals(tomMeals)
      setTargets(targetData)
    } catch (err) {
      console.error('[DashboardPage] load error', err)
    } finally {
      setDataLoading(false)
    }
  }, [user?.id, refreshDailyLogs])

  useEffect(() => { load() }, [load])

  // A planned meal is "eaten" when there's a matching planner nutrition log entry
  const eatenKeys = useMemo(() => {
    const keys = todayLogs
      .filter((l) => l.source_type === 'planner' || l.notes === 'Auto-added from meal plan')
      .map(logMatchKey)
    return new Set(keys)
  }, [todayLogs])

  const toggleEaten = async (meal) => {
    const key = planMealKey(meal)
    const isEaten = eatenKeys.has(key)
    try {
      if (isEaten) {
        const match = todayLogs.find(
          (l) => logMatchKey(l) === key && (l.source_type === 'planner' || l.notes === 'Auto-added from meal plan')
        )
        if (match) await deleteMealLog(match.id)
      } else {
        await addPlannedMealLog({ user_id: user.id, log_date: TODAY_ISO, meal })
      }
      await refreshDailyLogs()
    } catch {
      toast.error('Could not update eaten status')
    }
  }

  const openAddFood = (slot = 'dinner') => {
    setSelectedSlot(slot)
    setAddSheetOpen(true)
  }

  const handleManualSave = async (form) => {
    if (!user?.id) return
    setSaving(true)
    try {
      const servings = Math.max(0.5, Number(form.servings) || 1)
      const savedEntry = await addManualMealLog({
        user_id: user.id,
        meal_slot: form.meal_slot,
        log_date: form.log_date,
        name: form.name,
        calories: Math.round(Number(form.calories || 0) * servings),
        protein_g: Math.round(Number(form.protein_g || 0) * servings * 10) / 10,
        carbs_g: Math.round(Number(form.carbs_g || 0) * servings * 10) / 10,
        fat_g: Math.round(Number(form.fat_g || 0) * servings * 10) / 10,
        notes: form.notes,
        serving_count: servings,
      })
      toast.success('Meal logged')
      if (form.addToPlanner && savedEntry) {
        try {
          const result = await addNutritionLogToPlanner({ userId: user.id, logEntry: savedEntry })
          toast(result.alreadyExists ? 'Already in your planner' : 'Also added to planner')
        } catch (planErr) {
          toast.error(planErr.message || 'Could not add to planner')
        }
      }
      setManualOpen(false)
      setCatalogPrefill('')
      await refreshDailyLogs()
    } catch {
      toast.error('Could not save meal log')
    } finally {
      setSaving(false)
    }
  }

  const handleFoodAdd = async (food) => {
    if (!user?.id) return
    setSaving(true)
    try {
      await addManualMealLog({
        user_id: user.id,
        log_date: TODAY_ISO,
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
      setFoodOpen(false)
      await refreshDailyLogs()
    } catch {
      toast.error('Could not add food')
    } finally {
      setSaving(false)
    }
  }

  const handleCatalogPick = (recipe) => {
    setCatalogOpen(false)
    setCatalogPrefill(recipe.title || '')
    setManualOpen(true)
  }

  const handleShopAdd = async (e) => {
    e.preventDefault()
    if (!shopName.trim()) return
    setShopAdding(true)
    try {
      await addShopItem(shoppingList?.id, {
        name: shopName.trim(),
        category: categorizeIngredient(shopName),
        source: 'manual',
      })
      setShopName('')
      toast.success('Added to list')
    } catch {
      toast.error('Could not add item')
    } finally {
      setShopAdding(false)
    }
  }

  const macroTotals = {
    calories: Number(dailyLog?.total_calories || 0),
    protein_g: Number(dailyLog?.total_protein_g || 0),
    carbs_g: Number(dailyLog?.total_carbs_g || 0),
    fat_g: Number(dailyLog?.total_fat_g || 0),
  }

  const nextShoppingDate = useMemo(() => {
    if (schedule?.next_shopping_date) return new Date(`${schedule.next_shopping_date}T00:00:00`)
    if (schedule?.shopping_day) return getNextShoppingDate(schedule.shopping_day)
    return null
  }, [schedule])

  const uncheckedShopItems = useMemo(() => (shopItems || []).filter((i) => !i.checked), [shopItems])
  const tomorrowSlots = useMemo(
    () => slots.filter((s) => s.day === TOMORROW_SHORT && !s.is_leftover),
    [slots]
  )
  const householdName = household?.name || household?.household_name || ''
  const showTomorrow = tomorrowMeals.length > 0 || tomorrowSlots.length > 0

  if (dataLoading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-4 py-6">
        <div className="text-text-secondary">Loading your day…</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:px-6 md:pb-24 md:pt-6">
      <div className="space-y-7 md:space-y-6">

        {/* Header */}
        <section>
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400" />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl text-text-primary md:text-4xl">
                {householdName ? `Good day, ${householdName}` : 'Good day'}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/tonight" className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700">
                Quick Meal
              </Link>
              <Link to="/nutrition" className="rounded-full border border-divider bg-white px-4 py-2 text-sm text-text-secondary shadow-sm hover:bg-primary-50">
                Full nutrition log →
              </Link>
            </div>
          </div>
        </section>

        {/* Today's planned meals */}
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-text-primary">Today's meals</h2>
              <p className="mt-0.5 text-sm text-text-secondary">Planned meals are pre-logged. Uncheck any you skipped.</p>
            </div>
            <button
              type="button"
              onClick={() => openAddFood('dinner')}
              className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              + Log food
            </button>
          </div>

          <div className="mt-4 space-y-2.5 md:space-y-2">
            {planMeals.length > 0 ? planMeals.map((meal, idx) => {
              const eaten = eatenKeys.has(planMealKey(meal))
              const slotLabel = MEAL_SLOT_LABELS[meal.meal] || meal.meal || 'Meal'
              const calories = Number(meal.nutrition?.calories || meal.calories || 0)
              return (
                <div
                  key={meal.id || idx}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${eaten ? 'border-green-200 bg-green-50' : 'border-divider bg-white'}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleEaten(meal)}
                    aria-label={eaten ? 'Mark as not eaten' : 'Mark as eaten'}
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${eaten ? 'border-green-500 bg-green-500' : 'border-warm-300 hover:border-green-400'}`}
                  >
                    {eaten && <span className="text-xs font-bold text-white">✓</span>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium ${eaten ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                      {meal.name || meal.title || 'Planned meal'}
                    </div>
                    <div className="text-xs capitalize text-text-muted">{slotLabel}</div>
                  </div>
                  {calories > 0 ? (
                    <div className="flex-shrink-0 text-xs text-text-muted">~{Math.round(calories)} kcal</div>
                  ) : null}
                </div>
              )
            }) : (
              <div className="rounded-2xl border border-dashed border-divider p-5 text-center text-sm text-text-muted">
                No meals planned for today.{' '}
                <Link to="/planner" className="text-primary-600 underline">Open Planner</Link> to build your week.
              </div>
            )}
          </div>

          {/* Calorie progress bar */}
          {targets?.calories ? (
            <div className="mt-4 rounded-2xl bg-surface px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Calories today</span>
                <span className="font-medium text-text-primary">
                  {macroTotals.calories.toLocaleString()} / {targets.calories.toLocaleString()} kcal
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-100">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all"
                  style={{ width: `${Math.min(100, (macroTotals.calories / targets.calories) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
        </section>

        {/* Shopping + Weight/Macros */}
        <section className="grid gap-5 lg:grid-cols-2 lg:gap-4">

          {/* Shopping */}
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-text-primary">Shopping</h2>
                {nextShoppingDate ? (
                  <p className="mt-0.5 text-sm text-text-secondary">
                    Next: {nextShoppingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                ) : schedule?.shopping_day ? (
                  <p className="mt-0.5 text-sm text-text-secondary">
                    Shopping day: {SHOPPING_DAY_LABELS[schedule.shopping_day] || schedule.shopping_day}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-text-secondary">No shopping day set</p>
                )}
              </div>
              <Link to="/groceries" className="text-sm font-medium text-primary-600">View all</Link>
            </div>

            <form onSubmit={handleShopAdd} className="mt-4 flex gap-2">
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="input min-w-0 flex-1"
                placeholder="Add an item…"
              />
              <button type="submit" disabled={shopAdding || !shopName.trim()} className="btn-primary flex-shrink-0 disabled:opacity-50">
                Add
              </button>
            </form>

            <div className="mt-3 space-y-2 md:space-y-1.5">
              {uncheckedShopItems.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-xl border border-divider bg-white px-3 py-2 text-sm">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-primary-300" />
                  <span className="flex-1 truncate text-text-primary">{item.name}</span>
                  {item.quantity ? <span className="text-xs text-text-muted">{item.quantity}</span> : null}
                </div>
              ))}
              {uncheckedShopItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-divider p-4 text-center text-sm text-text-muted">
                  {shopItems.length > 0 ? 'All items checked!' : 'Shopping list is empty.'}
                </div>
              ) : null}
              {uncheckedShopItems.length > 6 ? (
                <Link to="/groceries" className="block text-center text-sm text-primary-600 hover:underline">
                  +{uncheckedShopItems.length - 6} more items
                </Link>
              ) : null}
            </div>
          </div>

          {/* Weight + Macros */}
          <div className="space-y-5 md:space-y-4">
            <WeightTrendCard
              entries={weightHistory || []}
              targetWeightKg={nutProfile?.target_weight_kg ? Number(nutProfile.target_weight_kg) : null}
              isMetric={false}
              defaultRangeDays={30}
            />
            {targets ? <MacroBars totals={macroTotals} targets={targets} /> : null}
          </div>
        </section>

        {/* Tomorrow preview (subordinate) */}
        {showTomorrow ? (
          <section>
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                Tomorrow — {_tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
              <Link to="/planner" className="text-xs text-primary-500">Edit plan</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-2">
              {tomorrowMeals.length > 0 ? tomorrowMeals.map((meal, idx) => (
                <div key={meal.id || idx} className="rounded-2xl border border-divider bg-surface px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-text-muted">
                    {MEAL_SLOT_LABELS[meal.meal] || meal.meal}
                  </div>
                  <div className="mt-1 text-sm font-medium leading-snug text-text-primary">
                    {meal.name || meal.title}
                  </div>
                </div>
              )) : tomorrowSlots.map((slot, idx) => (
                <div key={slot.id || idx} className="rounded-2xl border border-dashed border-divider bg-surface px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-text-muted">
                    {MEAL_SLOT_LABELS[slot.meal] || slot.meal}
                  </div>
                  <div className="mt-1 text-sm text-text-secondary">
                    {slot.planning_notes || 'Slot planned'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

      </div>

      {/* Modals */}
      <AddFoodSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onManual={() => { setAddSheetOpen(false); setManualOpen(true) }}
        onFoodDB={() => { setAddSheetOpen(false); setFoodOpen(true) }}
        onCatalog={() => { setAddSheetOpen(false); setCatalogOpen(true) }}
      />

      <ManualLogModal
        open={manualOpen}
        initialSlot={selectedSlot}
        initialName={catalogPrefill}
        item={null}
        onClose={() => { setManualOpen(false); setCatalogPrefill('') }}
        onSave={handleManualSave}
        saving={saving}
      />

      <FoodPickerModal
        open={foodOpen}
        userId={user?.id}
        initialSlot={selectedSlot}
        onClose={() => setFoodOpen(false)}
        onPick={handleFoodAdd}
      />

      <CatalogPickerModal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onPick={handleCatalogPick}
      />
    </div>
  )
}
