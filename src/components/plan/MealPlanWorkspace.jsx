import { useEffect, useMemo, useState } from 'react'
import { addDays, buildPlannerDays, getStartOfWeek, MEAL_SLOTS, DAY_SHORT } from '../../lib/planner'
import { MealCard } from './MealCard'

function ChevronLeftIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
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

function MoreVerticalIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function SparklesIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function DonutMacro({ nutrition }) {
  const carbs = Number(nutrition?.carbs || 0)
  const fat = Number(nutrition?.fat || 0)
  const protein = Number(nutrition?.protein || 0)
  const total = carbs + fat + protein
  if (!total) return null

  const radius = 13
  const circumference = 2 * Math.PI * radius
  const segments = [
    { value: carbs, className: 'text-primary-400' },
    { value: fat, className: 'text-secondary-400' },
    { value: protein, className: 'text-accent-blue' },
  ].filter((segment) => segment.value > 0)

  let offset = 0

  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90">
      <circle cx="16" cy="16" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-muted" />
      {segments.map((segment, index) => {
        const length = (segment.value / total) * circumference
        const dashOffset = -offset
        offset += length
        return (
          <circle
            key={`${segment.className}-${index}`}
            cx="16"
            cy="16"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={dashOffset}
            className={segment.className}
          />
        )
      })}
    </svg>
  )
}

const SLOT_DOT_COLOR = {
  breakfast: 'bg-orange-400',
  lunch: 'bg-sky-400',
  dinner: 'bg-primary-400',
  snack: 'bg-stone-400',
}

function MonthView({ selectedDate, meals, onSelectDay }) {
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const currentMonth = selectedDate.getMonth()
  const monthStart = useMemo(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1), [selectedDate])

  const mealCoverage = useMemo(() => {
    const map = {}
    meals.forEach((meal) => {
      const key = meal.day
      if (!map[key]) map[key] = new Set()
      map[key].add(meal.meal || meal.slot || 'dinner')
    })
    return map
  }, [meals])

  const weeks = useMemo(() => {
    const gridStart = getStartOfWeek(monthStart)
    const allDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
    const showSixWeeks = allDays[35].getMonth() === currentMonth
    const gridDays = showSixWeeks ? allDays : allDays.slice(0, 35)
    const result = []
    for (let i = 0; i < gridDays.length; i += 7) result.push(gridDays.slice(i, i + 7))
    return result
  }, [monthStart, currentMonth])

  return (
    <div className="mt-2">
      <div className="mb-2 grid grid-cols-7">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-ink-tertiary">{d}</div>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((date, dayIndex) => {
              const isInMonth = date.getMonth() === currentMonth
              const isToday = date.toDateString() === today.toDateString()
              const fullDayName = date.toLocaleDateString('en-US', { weekday: 'long' })
              const shortKey = DAY_SHORT[fullDayName]
              const filledSlots = mealCoverage[shortKey] || new Set()

              return (
                <button
                  key={dayIndex}
                  type="button"
                  onClick={() => onSelectDay(date)}
                  className={`flex cursor-pointer flex-col items-center rounded-xl py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${isToday ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-stone-50'} ${isInMonth ? '' : 'opacity-30'}`}
                >
                  <span className={`text-sm leading-none ${isToday ? 'font-semibold text-primary-700' : 'font-medium text-ink-primary'}`}>
                    {date.getDate()}
                  </span>
                  <div className="mt-1.5 flex gap-0.5">
                    {MEAL_SLOTS.map((slot) => (
                      <div
                        key={slot}
                        className={`h-1.5 w-1.5 rounded-full ${filledSlots.has(slot) ? SLOT_DOT_COLOR[slot] : 'bg-surface-muted'}`}
                      />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function SlotGroup({ slotGroup, day, onOpenAddMeal, onGenerateSlot, generating, onOpenMealActions, onOpenMeal }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">{slotGroup.label}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {slotGroup.meals.length === 0 && onGenerateSlot ? (
            <button
              type="button"
              onClick={() => onGenerateSlot(day.key, slotGroup.slot)}
              disabled={generating}
              className="flex cursor-pointer items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 transition-colors duration-150 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SparklesIcon className="h-3 w-3" />
              Generate
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenAddMeal(day, slotGroup.slot)}
            className="flex cursor-pointer items-center gap-1 rounded-full border border-surface-muted bg-white px-2.5 py-1 text-xs font-medium text-ink-secondary transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <PlusIcon className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>
      {slotGroup.meals.length > 0 ? (
        <div className="space-y-2">
          {slotGroup.meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onOpenMeal={onOpenMeal}
              onActionsClick={() => onOpenMealActions({ meal, label: meal.title || meal.name || 'Meal' })}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DaySection({ day, expanded, onToggle, collapsible, onOpenMeal, onOpenDayActions, onOpenMealActions, onOpenAddMeal, onGenerateSlot, generating, showHeaderActions = true }) {
  const isToday = day.date.toDateString() === new Date().toDateString()

  return (
    <section className="relative rounded-2xl bg-white px-3 py-2">
      {isToday ? <span className="absolute left-0 top-4 h-10 w-1 rounded-full bg-primary-400" /> : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={collapsible ? onToggle : undefined}
          className={`flex flex-1 items-center gap-3 rounded-2xl text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${collapsible ? 'cursor-pointer hover:bg-stone-50' : 'cursor-default'}`}
        >
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg text-ink-primary">{day.dayName}</div>
            <div className="text-sm text-ink-secondary">{day.dateLabel}</div>
          </div>
          <div className="flex items-center gap-3">
            <DonutMacro nutrition={day.nutrition} />
            <div className="text-right">
              <div className="text-sm font-medium tabular-nums text-ink-primary">{day.totalCalories || '—'}</div>
              <div className="text-xs text-ink-secondary">kcal</div>
            </div>
          </div>
          {collapsible ? (
            <ChevronDownIcon className={`h-5 w-5 text-ink-tertiary transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
          ) : null}
        </button>
        {showHeaderActions ? (
          <button
            type="button"
            onClick={() => onOpenDayActions(day)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-2 text-ink-tertiary transition-colors duration-150 hover:bg-stone-100 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
            aria-label="Day actions"
          >
            <MoreVerticalIcon className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="space-y-4 pb-2 pt-3">
          {MEAL_SLOTS.map((slot) => {
            const group = day.mealGroups.find((g) => g.slot === slot) || { slot, label: slot.charAt(0).toUpperCase() + slot.slice(1), meals: [] }
            return (
              <SlotGroup
                key={slot}
                slotGroup={group}
                day={day}
                onOpenAddMeal={onOpenAddMeal}
                onGenerateSlot={onGenerateSlot}
                generating={generating}
                onOpenMealActions={onOpenMealActions}
                onOpenMeal={onOpenMeal}
              />
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function formatWeekRange(days) {
  const start = days[0]?.date
  const end = days[days.length - 1]?.date
  if (!start || !end) return ''
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function formatRelativeWeekLabel(weekStart) {
  const todayStart = getStartOfWeek(new Date())
  const diff = Math.round((getStartOfWeek(weekStart).getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'This Week'
  if (diff === 7) return 'Next Week'
  if (diff === -7) return 'Last Week'
  return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function getViewHeader(viewMode, plannerDays, windowStart) {
  if (viewMode === 'month') {
    return {
      primary: windowStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      secondary: '',
    }
  }
  if (viewMode === 'week') {
    return {
      primary: formatRelativeWeekLabel(windowStart),
      secondary: formatWeekRange(plannerDays),
    }
  }
  if (viewMode === '3day') {
    const start = plannerDays[0]?.date
    const end = plannerDays[plannerDays.length - 1]?.date
    if (!start || !end) return { primary: '', secondary: '' }
    return {
      primary: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      secondary: '',
    }
  }
  const dayObj = plannerDays[0]
  if (!dayObj) return { primary: '', secondary: '' }
  const isToday = dayObj.date.toDateString() === new Date().toDateString()
  return {
    primary: isToday ? 'Today' : dayObj.dayName,
    secondary: dayObj.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
  }
}

const VIEW_MODES = [
  { id: 'day', label: 'Day' },
  { id: '3day', label: '3 Days' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

export function MealPlanWorkspace({
  meals = [],
  selectedDate,
  viewMode,
  onChangeViewMode,
  onPrev,
  onNext,
  onOpenMeal,
  onOpenDayActions,
  onOpenMealActions,
  onOpenAddMeal,
  generating = false,
  onGenerateSlot,
  onSelectMonthDay,
}) {
  const windowStart = useMemo(() => {
    const next = new Date(selectedDate)
    next.setHours(0, 0, 0, 0)
    return viewMode === 'week' ? getStartOfWeek(next) : next
  }, [selectedDate, viewMode])

  const dayCount = viewMode === 'day' ? 1 : viewMode === '3day' ? 3 : viewMode === 'week' ? 7 : 0
  const plannerDays = useMemo(
    () => buildPlannerDays({ start: windowStart, count: dayCount, meals }),
    [meals, windowStart, dayCount],
  )

  const [expandedDays, setExpandedDays] = useState({})
  const [animateKey, setAnimateKey] = useState(0)

  useEffect(() => {
    if (viewMode !== 'week') return
    const todayString = new Date().toDateString()
    setExpandedDays((current) => {
      const next = {}
      plannerDays.forEach((day) => {
        next[day.key] = day.date.toDateString() === todayString
      })
      return Object.keys(current).length > 0 ? { ...next, ...current } : next
    })
  }, [plannerDays, viewMode])

  useEffect(() => {
    setAnimateKey((current) => current + 1)
  }, [windowStart.toDateString(), viewMode])

  const { primary, secondary } = getViewHeader(viewMode, plannerDays, windowStart)

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="sticky top-0 z-20 border-b border-surface-muted bg-white">
        <div className="mx-auto max-w-2xl px-4 pb-4 pt-3">
          <div className="flex justify-center">
            <div className="inline-flex rounded-full bg-surface-muted p-1">
              {VIEW_MODES.map(({ id, label }) => {
                const active = viewMode === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChangeViewMode(id)}
                    className={`h-9 cursor-pointer rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${active ? 'bg-white text-ink-primary shadow-card' : 'text-ink-secondary hover:bg-stone-100 hover:text-ink-primary'}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[40px_1fr_40px] items-center gap-3">
            <button
              type="button"
              onClick={onPrev}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-2 text-ink-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
              aria-label="Previous"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="font-display text-lg text-ink-primary">{primary}</div>
              {secondary ? <div className="text-sm text-ink-secondary">{secondary}</div> : null}
            </div>
            <button
              type="button"
              onClick={onNext}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-2 text-ink-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
              aria-label="Next"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <div key={animateKey} className="animate-fadeIn space-y-3">
          {viewMode === 'month' ? (
            <MonthView
              selectedDate={windowStart}
              meals={meals}
              onSelectDay={onSelectMonthDay || (() => {})}
            />
          ) : viewMode === 'week' ? (
            plannerDays.map((day) => (
              <DaySection
                key={day.key}
                day={day}
                collapsible
                expanded={Boolean(expandedDays[day.key])}
                onToggle={() => setExpandedDays((current) => ({ ...current, [day.key]: !current[day.key] }))}
                onOpenMeal={onOpenMeal}
                onOpenDayActions={onOpenDayActions}
                onOpenMealActions={onOpenMealActions}
                onOpenAddMeal={onOpenAddMeal}
                onGenerateSlot={onGenerateSlot}
                generating={generating}
              />
            ))
          ) : (
            plannerDays.map((day) => (
              <DaySection
                key={day.key}
                day={day}
                collapsible={false}
                expanded
                onToggle={() => {}}
                onOpenMeal={onOpenMeal}
                onOpenDayActions={onOpenDayActions}
                onOpenMealActions={onOpenMealActions}
                onOpenAddMeal={onOpenAddMeal}
                onGenerateSlot={onGenerateSlot}
                generating={generating}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
