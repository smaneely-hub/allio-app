import { useMemo, useState } from 'react'
import { buildPlannerWeek, formatWeekLabel, getStartOfWeek } from '../../lib/planner'
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

function EmptyDayState({ onAddMeal }) {
  return (
    <div className="rounded-xl bg-surface-card p-4 shadow-card">
      <div className="text-sm text-ink-secondary">No meals planned</div>
      <button type="button" onClick={onAddMeal} className="mt-2 text-sm font-medium text-accent-blue">
        Add meal
      </button>
    </div>
  )
}

function DaySection({ day, defaultOpen = false, onOpenMeal, onOpenDayActions, onOpenMealActions, onOpenAddMeal }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="overflow-hidden rounded-2xl bg-surface-base">
      <div className="flex items-center gap-3 px-1 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex flex-1 items-center gap-3 text-left">
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg text-ink-primary">{day.dayName}</div>
            <div className="text-sm text-ink-secondary">{day.dateLabel}</div>
          </div>
          <div className="text-sm text-ink-tertiary">— kcal</div>
          <ChevronDownIcon className={`h-4 w-4 text-ink-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" onClick={() => onOpenDayActions(day)} className="flex h-10 w-10 items-center justify-center text-ink-tertiary" aria-label="Day actions">
          <MoreVerticalIcon className="h-5 w-5" />
        </button>
      </div>

      {open ? (
        <div className="space-y-2 pb-3">
          {day.meals.length === 0 ? <EmptyDayState onAddMeal={() => onOpenAddMeal(day, 'dinner')} /> : null}
          {day.mealGroups.map((group) => (
            <div key={group.slot} className="space-y-2">
              <div className="flex items-center justify-between px-1 pt-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">{group.label}</div>
                {group.meals.length === 0 ? (
                  <button type="button" onClick={() => onOpenAddMeal(day, group.slot)} className="text-xs font-medium text-accent-blue">+ Add</button>
                ) : null}
              </div>
              {group.meals.length > 0 ? group.meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} onOpenMeal={onOpenMeal} onActionsClick={(mealId) => onOpenMealActions({ mealId, meal, label: meal.title || meal.name || group.label })} />
              )) : (
                <div className="rounded-xl border border-dashed border-surface-muted bg-surface-card px-3 py-3 text-sm text-ink-secondary">No meal planned</div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function DayViewContent({ selectedDay, onOpenMeal, onOpenMealActions, onOpenAddMeal }) {
  if (!selectedDay) return null

  return (
    <div className="space-y-3">
      {selectedDay.mealGroups.map((group) => (
        <div key={group.slot} className="rounded-2xl bg-surface-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">{group.label}</div>
            {group.meals.length === 0 ? <button type="button" onClick={() => onOpenAddMeal(selectedDay, group.slot)} className="text-xs font-medium text-accent-blue">+ Add</button> : null}
          </div>
          {group.meals.length > 0 ? (
            <div className="space-y-2">
              {group.meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} onOpenMeal={onOpenMeal} onActionsClick={(mealId) => onOpenMealActions({ mealId, meal, label: meal.title || meal.name || group.label })} />
              ))}
            </div>
          ) : (
            <EmptyDayState onAddMeal={() => onOpenAddMeal(selectedDay, group.slot)} />
          )}
        </div>
      ))}
    </div>
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
  const weekStart = useMemo(() => getStartOfWeek(selectedDate), [selectedDate])
  const plannerWeek = useMemo(() => buildPlannerWeek({ weekStart, meals }), [meals, weekStart])
  const selectedDay = useMemo(() => {
    const iso = selectedDate.toISOString().slice(0, 10)
    return plannerWeek.find((day) => day.date.toISOString().slice(0, 10) === iso) || plannerWeek[0]
  }, [plannerWeek, selectedDate])
  const today = new Date()

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="sticky top-0 z-10 bg-surface-base pt-0">
        <div className="mx-auto max-w-md px-4 pb-4 pt-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={onPrev} className="flex h-10 w-10 items-center justify-center text-ink-primary" aria-label="Previous range">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="text-center text-sm font-medium text-ink-primary">{formatWeekLabel(weekStart)}</div>
            <button type="button" onClick={onNext} className="flex h-10 w-10 items-center justify-center text-ink-primary" aria-label="Next range">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 inline-flex rounded-full bg-surface-muted p-1">
            {['day', 'week'].map((mode) => {
              const active = viewMode === mode
              return (
                <button key={mode} type="button" onClick={() => onChangeViewMode(mode)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'bg-surface-card text-ink-primary shadow-card' : 'text-ink-secondary'}`}>
                  {mode === 'day' ? 'Day' : 'Week'}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pb-24">
        {viewMode === 'week' ? (
          <div className="space-y-2">
            {plannerWeek.map((day) => (
              <DaySection key={day.key} day={day} defaultOpen={day.date.toDateString() === today.toDateString()} onOpenMeal={onOpenMeal} onOpenDayActions={onOpenDayActions} onOpenMealActions={onOpenMealActions} onOpenAddMeal={onOpenAddMeal} />
            ))}
          </div>
        ) : (
          <DayViewContent selectedDay={selectedDay} onOpenMeal={onOpenMeal} onOpenMealActions={onOpenMealActions} onOpenAddMeal={onOpenAddMeal} />
        )}
      </div>
    </div>
  )
}
