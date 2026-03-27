import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useMealPlan } from '../hooks/useMealPlan'
import { MealCard } from '../components/plan/MealCard'
import { PlanSkeleton, EmptyState, PlanGenerationLoading, MealCardSkeleton } from '../components/LoadingStates'

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export function PlanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scheduleId = searchParams.get('schedule_id')
  const {
    mealPlan,
    loading,
    generating,
    error,
    generateMealPlan,
    toggleMealLock,
    saveMealNote,
    swapMeal,
    finalizePlan,
  } = useMealPlan(scheduleId)

  const groupedMeals = useMemo(() => {
    const meals = mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []
    return days.reduce((acc, day) => {
      acc[day] = meals.filter((meal) => meal.day === day)
      return acc
    }, {})
  }, [mealPlan])

  const handleGenerate = async () => {
    try {
      await generateMealPlan()
      toast.success('Meal plan generated successfully.')
    } catch (generationError) {
      toast.error(generationError.message || 'Unable to generate meal plan.')
    }
  }

  const handleFinalize = async () => {
    try {
      await finalizePlan()
      toast.success('Plan finalized. Shopping list generated.')
    } catch (finalizeError) {
      toast.error(finalizeError.message || 'Unable to finalize plan.')
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-warm-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-warm-700">
              Status: {mealPlan?.status || 'draft'}
            </div>
            <h1 className="font-display text-3xl text-warm-900">Meal Plan</h1>
            <p className="mt-2 text-sm text-warm-700">Generate a weekly meal plan from your saved household and schedule.</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/shop')} className="btn-ghost text-sm font-medium">
              View Shopping List
            </button>
            <button type="button" onClick={handleFinalize} disabled={!mealPlan || mealPlan.status === 'active'} className="btn-secondary text-sm font-medium disabled:opacity-50">
              Finalize Plan
            </button>
            <button type="button" onClick={handleGenerate} disabled={generating || !scheduleId} className="btn-primary text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">
              {generating ? 'Planning your meals…' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {generating ? (
        <PlanGenerationLoading />
      ) : loading ? (
        <PlanSkeleton />
      ) : error ? (
        <div className="card border-2 border-red-200 bg-red-50">
          <div className="text-sm text-red-700">{error.message || 'Something went wrong while loading the plan.'}</div>
          <button type="button" onClick={handleGenerate} className="mt-4 btn-primary">
            Retry
          </button>
        </div>
      ) : !mealPlan ? (
        <EmptyState
          emoji="🍽️"
          headline="Your week is wide open"
          body="Set up your schedule and we'll plan meals that actually fit your life."
          ctaLabel="Set up your schedule"
          ctaLink="/schedule"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-7">
          {days.map((day) => (
            <div key={day} className="card p-4">
              <div className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-warm-500">{day}</div>
              <div className="space-y-3">
                {groupedMeals[day]?.length ? (
                  groupedMeals[day].map((meal, index) => (
                    <MealCard
                      key={`${meal.meal}-${index}`}
                      meal={meal}
                      onToggleLock={toggleMealLock}
                      onSwap={swapMeal}
                      onSaveNote={saveMealNote}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-warm-200 p-4 text-xs text-warm-400">No meals yet</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
