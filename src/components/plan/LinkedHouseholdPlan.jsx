import { useState } from 'react'
import { normalizeMealRecord } from '../../lib/mealSchema'

const DAY_LABEL = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }

// Read-only panel shown to linked household members displaying the owner's
// meal plan for the current week.
export function LinkedHouseholdPlan({ household, plan }) {
  const [expanded, setExpanded] = useState(false)

  const meals = (plan?.draft_plan?.meals || plan?.plan?.meals || [])
    .filter((m) => m?.event_type !== 'shopping' && m?.name)
    .map(normalizeMealRecord)

  if (!meals.length) return null

  const householdName = household?.name || 'Household'

  return (
    <div className="mt-4 rounded-[28px] border border-teal-100 bg-teal-50/60 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-teal-700">Shared household plan</div>
          <div className="mt-0.5 text-xs text-teal-600">
            {householdName} · {meals.length} meal{meals.length !== 1 ? 's' : ''} this week · read-only
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-700 transition-colors duration-150 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 cursor-pointer"
        >
          {expanded ? 'Hide' : 'View'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-1.5">
          {meals.map((meal) => {
            const dayLabel = meal.day ? (DAY_LABEL[meal.day.toLowerCase()] || meal.day) : ''
            const mealLabel = meal.meal ? (MEAL_LABEL[meal.meal.toLowerCase().replace(/\s+/g, '_')] || meal.meal) : ''
            return (
              <div
                key={meal.id || `${meal.day}-${meal.meal}`}
                className="flex items-start justify-between rounded-xl bg-white/75 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-primary truncate">{meal.name}</div>
                  {(dayLabel || mealLabel) && (
                    <div className="mt-0.5 text-xs text-ink-secondary">
                      {[dayLabel, mealLabel].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
