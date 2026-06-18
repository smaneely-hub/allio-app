import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { SwapModal } from '../SwapModal'
import { useSubscription } from '../../hooks/useSubscription'
import { UpgradePrompt } from '../UpgradePrompt'
import { normalizeRecipe } from '../../lib/recipeSchema'
import { CookingMode } from '../CookingMode'
import { MealDetailBody } from '../MealDetailBody'

const DOW_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DOW_INITIALS = { mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S' }

function getRecurrenceLabel(recurrence) {
  if (!recurrence) return null

  // V2 format
  if (recurrence.frequency) {
    const { frequency, interval = 1, byWeekday = [] } = recurrence
    if (frequency === 'none') return null
    if (frequency === 'daily') return interval === 1 ? 'Daily' : `Every ${interval}d`
    if (frequency === 'weekly') {
      if (byWeekday.length > 0) {
        const initials = DOW_ORDER.filter((d) => byWeekday.includes(d)).map((d) => DOW_INITIALS[d]).join('')
        return interval === 1 ? initials : `${initials}·${interval}wk`
      }
      return interval === 1 ? 'Weekly' : `Every ${interval}wk`
    }
    if (frequency === 'monthly') return interval === 1 ? 'Monthly' : `Every ${interval}mo`
    if (frequency === 'yearly') return interval === 1 ? 'Yearly' : `Every ${interval}yr`
    return null
  }

  // Legacy Phase 1 format
  const legacyLabels = { daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }
  return legacyLabels[recurrence.type] || null
}

function RepeatIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M17 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 23l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MoreVerticalIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UtensilsIcon(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M3 2v7c0 1.1.9 2 2 2h3V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v8c0 1.1.9 2 2 2h3Z" /></svg>
}
function ShoppingBagIcon(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
}
function TruckIcon(props) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M10 17h4V5H2v12h3" /><path d="M14 8h4l4 4v5h-3" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>
}

const nonCookingMeta = {
  eat_out: { label: 'Eating out', icon: UtensilsIcon },
  takeout: { label: 'Takeout', icon: ShoppingBagIcon },
  delivery: { label: 'Delivery', icon: TruckIcon },
}


export function MealCard({ meal, onSwap = async () => {}, onOpenMeal, onActionsClick }) {
  const { isPremium, upgradeToPremium } = useSubscription()
  const [cookingMode, setCookingMode] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState(null)
  const mealSource = meal?.meal_source || 'generated'

  const recipe = useMemo(() => normalizeRecipe({
    ...meal,
    title: meal.title || meal.name,
    prepTime: meal.prep_time_minutes,
    cookTime: meal.cook_time_minutes,
    totalTime: meal.total_time_minutes,
    ingredientGroups: meal.ingredientGroups,
    instructionGroups: meal.instructionGroups,
    substitutions: meal.substitutions,
    nutrition: meal.nutrition,
    tags: meal.recipeTags,
    sourceNote: meal.sourceNote,
    imagePrompt: meal.imagePrompt,
  }), [meal])

  const startCooking = () => {
    if (!isPremium) {
      setUpgradeFeature('cooking_mode')
      return
    }
    setCookingMode(true)
  }

  const toggleExpanded = () => {
    const next = !expanded
    setExpanded(next)
    if (next) onOpenMeal?.(meal)
  }

  // Portal so CookingMode escapes any stacking context in the planner workspace
  const cookingOverlay = cookingMode ? createPortal(
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-white px-4 pb-24 pt-0">
      <CookingMode meal={meal} onExit={() => setCookingMode(false)} />
    </div>,
    document.body
  ) : null

  if (meal.swap_pending) {
    return (
      <div className="card flex items-center gap-3 p-3">
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-surface-muted" />
        <div className="flex-1 space-y-2 animate-pulse">
          <div className="h-4 w-2/3 rounded bg-surface-muted" />
          <div className="h-3 w-1/3 rounded bg-surface-muted" />
        </div>
      </div>
    )
  }

  const mealTitle = meal.title || meal.name || 'Meal'
  const prepTime = meal.prep_time_minutes || recipe.prepTime || 0
  const cookTime = meal.cook_time_minutes || recipe.cookTime || 0
  const mealImage = meal.image_url || recipe.imageUrl || null
  const servings = meal.servings || recipe.servings || 1
  const calories = meal.calories || meal.nutrition?.calories || '—'
  const whyNote = meal?.why_this_meal || null

  const inlineDetail = expanded ? (
    <div className="border-t border-surface-muted">
      {mealImage && (
        <div className="aspect-video w-full overflow-hidden">
          <img src={mealImage} alt={mealTitle} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="space-y-4 px-3 pb-4 pt-3">
        <div>
          <h3 className="text-base font-semibold text-ink-primary">{mealTitle}</h3>
          <p className="mt-1 text-sm text-ink-secondary">{servings} servings · {calories} kcal</p>
        </div>
        {(prepTime > 0 || cookTime > 0) && (
          <div className="flex flex-wrap gap-2">
            {prepTime > 0 && <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">Prep {prepTime} min</span>}
            {cookTime > 0 && <span className="rounded-full bg-warm-50 px-3 py-1 text-xs text-ink-secondary">Cook {cookTime} min</span>}
          </div>
        )}
        {whyNote && (
          <div className="rounded-xl border border-primary-100 bg-primary-50 p-3">
            <p className="text-xs font-semibold text-primary-800">💡 Why this meal</p>
            <p className="mt-1 text-sm text-primary-700">{whyNote}</p>
          </div>
        )}
        <MealDetailBody
          meal={meal}
          contextKeyPrefix={`plan-${meal.id || meal.name}`}
          onStartCooking={startCooking}
        />
      </div>
    </div>
  ) : null

  if (['eat_out', 'takeout', 'delivery'].includes(mealSource)) {
    const meta = nonCookingMeta[mealSource]
    const Icon = meta.icon
    const title = meal.place_name || meta.label
    const subtitle = meal.source_note ? `${meta.label} · ${meal.source_note}` : meta.label
    return (
      <>
        {cookingOverlay}
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
            <button type="button" onClick={toggleExpanded} className="group flex min-w-0 items-center gap-3 rounded-2xl p-1 text-left transition duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-secondary transition duration-150 group-hover:bg-stone-100 group-hover:scale-[1.02]">
                <Icon className="h-6 w-6 transition-colors duration-150 group-hover:text-ink-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink-primary transition-colors duration-150 group-hover:text-stone-900">{title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-secondary transition-colors duration-150 group-hover:text-ink-primary">
                  <span className="truncate">{subtitle}</span>
                  {getRecurrenceLabel(meal.recurrence) ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-700">
                      <RepeatIcon className="h-3 w-3" />
                      {getRecurrenceLabel(meal.recurrence)}
                      {meal.is_occurrence ? ' · occ' : ''}
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-tertiary transition-colors duration-150 group-hover:bg-stone-100 group-hover:text-ink-primary">
                <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              </span>
            </button>
            <button type="button" onClick={(event) => { event.stopPropagation(); onActionsClick?.(meal) }} className="relative z-10 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center self-center rounded-full p-2 text-ink-tertiary transition-colors duration-150 hover:bg-stone-100 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Meal actions">
              <MoreVerticalIcon className="h-5 w-5" />
            </button>
          </div>
          {inlineDetail}
        </div>
        <UpgradePrompt feature={upgradeFeature} onClose={() => setUpgradeFeature(null)} onUpgrade={upgradeToPremium} />
      </>
    )
  }

  return (
    <>
      {cookingOverlay}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3">
          <button type="button" onClick={toggleExpanded} className="group flex min-w-0 items-center gap-3 rounded-2xl p-1 text-left transition duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${mealTitle}`}>
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-muted transition duration-150 group-hover:scale-[1.02]">
              {mealImage ? <img src={mealImage} alt={mealTitle} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-surface-muted" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink-primary transition-colors duration-150 group-hover:text-stone-900">{mealTitle}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-secondary transition-colors duration-150 group-hover:text-ink-primary">
                <span>{servings} servings · {calories} kcal</span>
                {getRecurrenceLabel(meal.recurrence) ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-700">
                    <RepeatIcon className="h-3 w-3" />
                    {getRecurrenceLabel(meal.recurrence)}
                    {meal.is_occurrence ? ' · occ' : ''}
                  </span>
                ) : null}
              </div>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-tertiary transition-colors duration-150 group-hover:bg-stone-100 group-hover:text-ink-primary">
              <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </span>
          </button>
          <button type="button" onClick={(event) => { event.stopPropagation(); onActionsClick?.(meal) }} className="relative z-10 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center self-center rounded-full p-2 text-ink-tertiary transition-colors duration-150 hover:bg-stone-100 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Meal actions">
            <MoreVerticalIcon className="h-5 w-5" />
          </button>
        </div>
        {inlineDetail}
      </div>
      <SwapModal isOpen={showSwapModal} onClose={() => !swapping && setShowSwapModal(false)} onSwap={async (suggestion) => { try { setSwapping(true); await onSwap(meal, suggestion || ''); setShowSwapModal(false) } finally { setSwapping(false) } }} mealName={meal.name} loading={swapping} />
      <UpgradePrompt feature={upgradeFeature} onClose={() => setUpgradeFeature(null)} onUpgrade={upgradeToPremium} />
    </>
  )
}
