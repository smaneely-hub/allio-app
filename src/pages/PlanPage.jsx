import { useMemo, useEffect } from 'react'
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
  const autoGenerate = searchParams.get('auto_generate') === 'true'
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

  // Auto-generate on mount if requested
  useEffect(() => {
    if (autoGenerate && !loading && !mealPlan && !generating) {
      console.log('[PlanPage] Auto-generating meal plan...')
      generateMealPlan().catch(err => {
        console.error('[PlanPage] Auto-generate failed:', err)
      })
    }
  }, [autoGenerate, loading, mealPlan, generating])

  // Remove auto_generate from URL after triggering
  useEffect(() => {
    if (autoGenerate && mealPlan) {
      navigate(window.location.pathname + '?schedule_id=' + scheduleId, { replace: true })
    }
  }, [autoGenerate, mealPlan])

  const groupedMeals = useMemo(() => {
    const meals = mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []
    return days.reduce((acc, day) => {
      acc[day] = meals.filter((meal) => meal.day === day)
      return acc
    }, {})
  }, [mealPlan])

  // Only show days that have meals
  const activeDays = useMemo(() => {
    const meals = mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []
    const daysWithMeals = [...new Set(meals.map((m) => m.day))]
    return daysWithMeals.length > 0 ? daysWithMeals : days
  }, [mealPlan])
  
  const dayLabels = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
    thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
  }

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
    <div className="pb-24">
      {/* Mobile-first header - minimal top gap */}
      <div className="card pt-2 md:pt-3">
        {/* Status badge - own line */}
        <div className="mb-2 inline-flex rounded-full bg-warm-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-warm-700">
          {mealPlan?.status || 'draft'}
        </div>
        
        {/* Heading - smaller on mobile */}
        <h1 className="font-display text-xl md:text-3xl text-warm-900">Meal Plan</h1>
        
        {/* Generate button - full width on mobile */}
        <button type="button" onClick={handleGenerate} disabled={generating || !scheduleId} className="btn-primary w-full mt-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">
          {generating ? 'Planning your meals…' : 'Generate'}
        </button>
        
        {/* Action buttons - side by side on mobile */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={handleFinalize} disabled={!mealPlan} className="btn-secondary text-xs font-medium disabled:opacity-50">
            Finalize Plan
          </button>
          <button type="button" onClick={() => navigate('/shop')} className="btn-secondary text-xs font-medium">
            View Shopping List
          </button>
        </div>
      </div>

      {/* Meal cards - full width, less padding */}
      {generating ? (
        <PlanGenerationLoading />
      ) : loading ? (
        <PlanSkeleton />
      ) : error ? (
        <div className="card border-2 border-red-200 bg-red-50 mx-3">
          <div className="text-sm text-red-700">{error.message || 'Something went wrong while loading the plan.'}</div>
          <button type="button" onClick={handleGenerate} className="mt-4 btn-primary">
            Retry
          </button>
        </div>
      ) : !(mealPlan?.draft_plan?.meals?.length || mealPlan?.plan?.meals?.length) ? (
        <div className="mx-3">
          <EmptyState
            emoji="🍽️"
            headline="Your week is wide open"
            body="Set up your schedule and we'll plan meals that actually fit your life."
            ctaLabel="Set up your schedule"
            ctaLink="/schedule"
          />
        </div>
      ) : (
        <div className="space-y-4 px-3 md:px-0">
          {activeDays.map((day) => (
            <div key={day} className="card p-3 md:p-4">
              <div className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-warm-500">{dayLabels[day] || day}</div>
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
                  <div className="rounded-xl border border-dashed border-warm-200 p-3 text-xs text-warm-400">No meals yet</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
