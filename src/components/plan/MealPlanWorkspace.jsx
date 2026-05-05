import { useEffect, useMemo, useState } from 'react'
import { addDays, buildPlannerWeek, getStartOfWeek } from '../../lib/planner'
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

function EmptyDayState({ onAddMeal }) {
  return (
    <div className="px-1 py-2 text-sm text-ink-secondary">
      No meals planned{' '}
      <button type="button" onClick={onAddMeal} className="font-medium text-ink-primary underline underline-offset-2 transition-colors duration-150 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 cursor-pointer rounded-md">
        + Add meal
      </button>
    </div>
  )
}

function formatWeekRange(week) {
  const start = week[0]?.date
  const end = week[6]?.date
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

function formatDayRange(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function DaySection({ day, expanded, onToggle, onOpenMeal, onOpenDayActions, onOpenMealActions, onOpenAddMeal, showHeaderActions = true }) {
  const isToday = day.date.toDateString() === new Date().toDateString()

  return (
    <section className="relative rounded-2xl bg-white px-3 py-2">
      {isToday ? <span className="absolute left-0 top-4 h-10 w-1 rounded-full bg-primary-400" /> : null}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onToggle} className="flex flex-1 cursor-pointer items-center gap-3 rounded-2xl text-left transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2">
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
          <ChevronDownIcon className={`h-5 w-5 text-ink-tertiary transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {showHeaderActions ? (
          <button type="button" onClick={() => onOpenDayActions(day)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-2 text-ink-tertiary transition-colors duration-150 hover:bg-stone-100 hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Day actions">
            <MoreVerticalIcon className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="space-y-2 pb-1 pt-3 transition-all duration-150">
          {day.meals.length === 0 ? <EmptyDayState onAddMeal={() => onOpenAddMeal(day, 'dinner')} /> : null}
          {day.meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onOpenMeal={onOpenMeal} onActionsClick={() => onOpenMealActions({ meal, label: meal.title || meal.name || 'Meal' })} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

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
}) {
  const windowStart = useMemo(() => {
    const next = new Date(selectedDate)
    next.setHours(0, 0, 0, 0)
    return viewMode === 'week' ? getStartOfWeek(next) : next
  }, [selectedDate, viewMode])
  const plannerWeek = useMemo(() => buildPlannerWeek({ weekStart: viewStart(windowStart, viewMode), meals }), [meals, windowStart, viewMode])
  const selectedDay = useMemo(() => {
    if (viewMode === 'day') {
      return plannerWeek.find((day) => day.date.toDateString() === windowStart.toDateString()) || plannerWeek[0] || null
    }
    return plannerWeek[0] || null
  }, [plannerWeek, viewMode, windowStart])
  const [expandedDays, setExpandedDays] = useState({})
  const [animateKey, setAnimateKey] = useState(0)

  useEffect(() => {
    const todayString = new Date().toDateString()
    setExpandedDays((current) => {
      const next = {}
      plannerWeek.forEach((day) => {
        next[day.key] = day.date.toDateString() === todayString
      })
      return Object.keys(current).length > 0 ? { ...next, ...current } : next
    })
  }, [plannerWeek])

  useEffect(() => {
    setAnimateKey((current) => current + 1)
  }, [windowStart.toDateString(), viewMode])

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="sticky top-0 z-20 border-b border-surface-muted bg-white">
        <div className="mx-auto max-w-2xl px-4 pb-4 pt-3">
          <div className="flex justify-center">
            <div className="inline-flex rounded-full bg-surface-muted p-1">
              {['day', 'week'].map((mode) => {
                const active = viewMode === mode
                return (
                  <button key={mode} type="button" onClick={() => onChangeViewMode(mode)} className={`h-9 cursor-pointer rounded-full px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${active ? 'bg-white text-ink-primary shadow-card' : 'text-ink-secondary hover:bg-stone-100 hover:text-ink-primary'}`}>
                    {mode === 'day' ? 'Day' : 'Week'}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[40px_1fr_40px] items-center gap-3">
            <button type="button" onClick={onPrev} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-2 text-ink-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Previous range">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="font-display text-lg text-ink-primary">{viewMode === 'week' ? formatRelativeWeekLabel(windowStart) : selectedDay ? selectedDay.dayName : formatDayRange(windowStart)}</div>
              <div className="text-sm text-ink-secondary">{viewMode === 'week' ? formatWeekRange(plannerWeek) : formatDayRange(windowStart)}</div>
            </div>
            <button type="button" onClick={onNext} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-2 text-ink-primary transition-colors duration-150 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" aria-label="Next range">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <div key={animateKey} className="animate-fadeIn space-y-3">
          {viewMode === 'week' ? plannerWeek.map((day) => (
            <DaySection
              key={day.key}
              day={day}
              expanded={Boolean(expandedDays[day.key])}
              onToggle={() => setExpandedDays((current) => ({ ...current, [day.key]: !current[day.key] }))}
              onOpenMeal={onOpenMeal}
              onOpenDayActions={onOpenDayActions}
              onOpenMealActions={onOpenMealActions}
              onOpenAddMeal={onOpenAddMeal}
            />
          )) : selectedDay ? (
            <DaySection
              day={selectedDay}
              expanded
              onToggle={() => {}}
              onOpenMeal={onOpenMeal}
              onOpenDayActions={onOpenDayActions}
              onOpenMealActions={onOpenMealActions}
              onOpenAddMeal={onOpenAddMeal}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function viewStart(date, viewMode) {
  return viewMode === 'week' ? getStartOfWeek(date) : getStartOfWeek(date)
}
