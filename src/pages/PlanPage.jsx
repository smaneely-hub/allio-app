import { useMemo, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useMealPlan } from '../hooks/useMealPlan'
import { useHousehold } from '../hooks/useHousehold'
import { useSchedule } from '../hooks/useSchedule'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { MealCard } from '../components/plan/MealCard'
import { aggregateShoppingList } from '../lib/aggregateShoppingList'
import { formatMealPlanEmail } from '../lib/formatMealPlanEmail'
import { supabase } from '../lib/supabase'
import { PlanSkeleton, EmptyState, PlanGenerationLoading, MealCardSkeleton } from '../components/LoadingStates'
import { UpgradePrompt } from '../components/UpgradePrompt'
import { AdSlot } from '../components/AdSlot'

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export function PlanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scheduleId = searchParams.get('schedule_id')
  const autoGenerate = searchParams.get('auto_generate') === 'true'
  
  // Subscription hook for premium features
  const { isPremium, canGeneratePlan, trackUsage, upgradeToPremium, loading: subLoading } = useSubscription()
  
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
  
  const { household } = useHousehold()
  const { schedule } = useSchedule(scheduleId)
  const { user } = useAuth()

  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState(null)

  const hasMeals = mealPlan?.draft_plan?.meals?.length > 0 || mealPlan?.plan?.meals?.length > 0
  useEffect(() => {
    if (autoGenerate && !loading && !hasMeals && !generating) {
      console.log('[PlanPage] Auto-generating meal plan...')
      generateMealPlan()
        .then(() => console.log('[PlanPage] Auto-generate completed'))
        .catch(err => {
          console.error('[PlanPage] Auto-generate failed:', err)
          toast.error(err.message || 'Failed to generate meal plan')
        })
    }
  }, [autoGenerate, loading, hasMeals, generating])

  useEffect(() => {
    if (autoGenerate && hasMeals) {
      navigate(window.location.pathname + '?schedule_id=' + scheduleId, { replace: true })
    }
  }, [autoGenerate, hasMeals])

  const groupedMeals = useMemo(() => {
    const meals = mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []
    return days.reduce((acc, day) => {
      acc[day] = meals.filter((meal) => meal.day === day)
      return acc
    }, {})
  }, [mealPlan])

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
    // Check if free user has used their weekly plan
    if (!isPremium) {
      const { allowed, used, limit } = await canGeneratePlan()
      if (!allowed) {
        setUpgradeFeature('unlimited_plans')
        setShowUpgradePrompt(true)
        return
      }
    }
    
    try {
      await generateMealPlan()
      // Track usage
      await trackUsage('plan_generate', { schedule_id: scheduleId })
      toast.success('Meal plan generated successfully.')
    } catch (generationError) {
      toast.error(generationError.message || 'Unable to generate meal plan.')
    }
  }

  const handleFinalize = async () => {
    try {
      await finalizePlan()
      const meals = mealPlan?.draft_plan?.meals || []
      const items = aggregateShoppingList({ meals }, household?.staples_on_hand || '')
      
      const { error: shopError } = await supabase
        .from('shopping_lists')
        .upsert({
          user_id: user.id,
          schedule_id: scheduleId,
          status: 'active',
          items: items,
        }, { onConflict: 'user_id,schedule_id' })
      
      if (shopError) {
        console.error('[PlanPage] Shopping list save error:', shopError)
      }
      
      toast.success('Plan finalized. Shopping list generated.')
    } catch (finalizeError) {
      toast.error(finalizeError.message || 'Unable to finalize plan.')
    }
  }

  const [emailing, setEmailing] = useState(false)
  
  const handleEmailPlan = async () => {
    // Check if premium - email is a premium feature
    if (!isPremium) {
      setUpgradeFeature('email_delivery')
      setShowUpgradePrompt(true)
      return
    }
    
    setEmailing(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser?.email) {
        toast.error('Could not find your email')
        return
      }
      
      const meals = mealPlan?.draft_plan?.meals || mealPlan?.plan?.meals || []
      const weekLabel = schedule?.week_start 
        ? `Week of ${new Date(schedule.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` 
        : 'This Week'
      const html = formatMealPlanEmail({ meals }, household?.household_name || household?.name || 'My Household', weekLabel)
      
      const { error } = await supabase.functions.invoke('send-email', {
        body: { to: authUser.email, subject: `Your Allio Meal Plan — ${weekLabel}`, html }
      })
      
      if (error?.message?.includes('404') || error?.status === 404) {
        toast.error('Email feature coming soon!')
      } else if (error) {
        throw error
      } else {
        toast.success(`Meal plan sent to ${authUser.email}!`)
        await trackUsage('email_sent')
      }
    } catch (err) {
      console.error('[PlanPage] Email error:', err)
      toast.error('Couldn\'t send email. Try again.')
    } finally {
      setEmailing(false)
    }
  }

  const isDraft = mealPlan?.status !== 'active'

  return (
    <div className="pb-24">
      {/* Week context header */}
      <div className="mb-3 px-1 pt-2">
        {/* Gradient accent */}
        <div className="h-1 w-12 bg-gradient-to-r from-primary-400 via-teal-400 to-purple-400 rounded-full mb-2"></div>
        <div className="text-sm text-text-muted">
          {schedule?.week_start ? `Week of ${new Date(schedule.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'This week'}
        </div>
        <div className="font-display text-2xl md:text-3xl text-text-primary">
          Your Meal Plan
        </div>
      </div>
      
      {/* Action card */}
      <div className="card pt-3 pb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Status badge */}
        <div className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          isDraft 
            ? 'bg-amber-100 text-amber-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {mealPlan?.status || 'draft'}
        </div>
        
        {/* Generate button - hero style when no meals */}
        {!hasMeals ? (
          <button 
            type="button" 
            onClick={handleGenerate} 
            disabled={generating || !scheduleId} 
            className="w-full mt-2 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-4 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {generating ? 'Planning your meals…' : '✨ Generate Your Meal Plan'}
          </button>
        ) : (
          <>
            <button type="button" onClick={handleGenerate} disabled={generating || !scheduleId} className="btn-primary w-full mt-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {generating ? 'Planning your meals…' : 'Generate'}
            </button>
            
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button type="button" onClick={handleFinalize} disabled={!mealPlan} className="btn-secondary text-sm disabled:opacity-50">
                Finalize
              </button>
              <button type="button" onClick={() => navigate('/shop')} className="btn-secondary text-sm">
                Shopping List
              </button>
            </div>
          </>
        )}
      </div>

      {/* Loading/Error states */}
      {generating ? (
        <PlanGenerationLoading />
      ) : loading ? (
        <PlanSkeleton />
      ) : error ? (
        <div className="card mt-4 border-2 border-red-200 bg-red-50/50 mx-3">
          <div className="text-sm text-red-700">{error.message || 'Something went wrong while loading the plan.'}</div>
          <button type="button" onClick={handleGenerate} className="mt-4 btn-primary">
            Retry
          </button>
        </div>
      ) : !(mealPlan?.draft_plan?.meals?.length || mealPlan?.plan?.meals?.length) ? (
        <div className="mx-3 mt-4">
          <EmptyState
            emoji="🍽️"
            headline="Your week is wide open"
            body="Set up your schedule and we'll plan meals that actually fit your life."
            ctaLabel="Set up your schedule"
            ctaLink="/schedule"
          />
        </div>
      ) : (
        // Meal cards by day
        <div className="space-y-4 px-3 md:px-0 mt-4">
          {activeDays.map((day) => (
            <div key={day} className="card p-4 hover:shadow-md transition-shadow duration-200">
              <div className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-text-secondary">{dayLabels[day] || day}</div>
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
                  <div className="rounded-xl border border-dashed border-divider p-4 text-sm text-text-muted text-center">No meals yet</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom actions */}
      {mealPlan?.status === 'active' && (
        <div className="card mt-4 mx-3">
          <button type="button" onClick={() => navigate('/schedule')} className="btn-primary w-full">
            Plan Next Week →
          </button>
        </div>
      )}

      {mealPlan?.status === 'active' && (
        <div className="card mt-3 mx-3">
          <button type="button" onClick={handleEmailPlan} disabled={emailing} className="btn-ghost w-full text-sm text-text-secondary">
            {emailing ? 'Sending...' : '📧 Email my plan'}
          </button>
        </div>
      )}

      {/* Ad slot for free tier */}
      {!isPremium && (
        <div className="mx-3 mt-4">
          <AdSlot size="banner" position="plan_bottom" />
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt 
        isOpen={showUpgradePrompt} feature={upgradeFeature} 
        onClose={() => {
          setShowUpgradePrompt(false)
          setUpgradeFeature(null)
        }} 
      />
    </div>
  )
}