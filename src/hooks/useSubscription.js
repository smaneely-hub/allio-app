// Subscription and feature access hook
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const FEATURES = {
  meal_plan_generate: { free: 1, premium: Infinity, period: 7 }, // 1 per week for free
  email_delivery: { free: false, premium: true },
  cooking_mode: { free: false, premium: true },
  health_customization: { free: false, premium: true },
  shopping_share: { free: false, premium: true },
  plan_history: { free: false, premium: true },
  ad_free: { free: false, premium: true },
}

export function useSubscription() {
  const [tier, setTier] = useState('free')
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function initSubscription() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setTier('free')
      setSubscription(null)
      setLoading(false)
    }

    initSubscription()
  }, [])

  const isPremium = tier === 'premium'
  const isFreeTier = tier === 'free'

  // Check if user can access a feature
  const checkFeatureAccess = useCallback((featureName) => {
    const feature = FEATURES[featureName]
    if (!feature) return false

    if (isPremium) return true

    // For free tier, check limits
    if (typeof feature.free === 'number') {
      // This would need to check actual usage - handled separately
      return true // Will be checked at point of use
    }

    return feature.free
  }, [isPremium])

  // Get usage count for an action
  const getUsageCount = useCallback(async (action, sinceDaysAgo = 7) => {
    if (!user) return 0

    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - sinceDaysAgo)

    try {
      const { count, error } = await supabase
        .from('usage_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action', action)
        .gte('created_at', sinceDate.toISOString())

      if (error) {
        const errorText = `${error.code || ''} ${error.message || ''}`
        if (error.code === 'PGRST205' || error.status === 404 || errorText.includes('404') || errorText.toLowerCase().includes('not found')) {
          console.warn('[useSubscription] usage_tracking unavailable; continuing without telemetry')
          return 0
        }
        console.warn('[useSubscription] usage count check failed; continuing without telemetry', error)
        return 0
      }
      return count || 0
    } catch (err) {
      console.warn('[useSubscription] usage count threw; continuing without telemetry', err)
      return 0
    }
  }, [user])

  // Track usage
  const trackUsage = useCallback(async (action, metadata = {}) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: user.id,
          action,
          metadata
        })

      if (error) {
        const errorText = `${error.code || ''} ${error.message || ''}`
        if (error.code === 'PGRST205' || error.status === 404 || errorText.includes('404') || errorText.toLowerCase().includes('not found')) {
          console.warn('[useSubscription] usage_tracking unavailable; continuing without telemetry')
          return
        }
        console.warn('[useSubscription] trackUsage failed; continuing without telemetry', error)
      }
    } catch (err) {
      console.warn('[useSubscription] trackUsage threw; continuing without telemetry', err)
    }
  }, [user])

  // Check if user can generate a meal plan (1 per week for free)
  const canGeneratePlan = useCallback(async () => {
    if (isPremium) return { allowed: true }

    const usageCount = await getUsageCount('plan_generate', 7)
    const limit = FEATURES.meal_plan_generate.free

    return {
      allowed: usageCount < limit,
      used: usageCount,
      limit,
      remaining: Math.max(0, limit - usageCount)
    }
  }, [isPremium, getUsageCount])

  // Upgrade to premium (beta temporary)
  const upgradeToPremium = useCallback(async () => {
    if (!user) return false

    await supabase
      .from('households')
      .update({ subscription_tier: 'premium' })
      .eq('user_id', user.id)

    setTier('premium')
    return true
  }, [user])

  return {
    tier,
    isPremium,
    isFreeTier,
    loading,
    subscription,
    checkFeatureAccess,
    trackUsage,
    getUsageCount,
    canGeneratePlan,
    upgradeToPremium,
  }
}