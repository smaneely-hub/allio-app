// Usage tracking functions
import { supabase } from './supabase'

// Track an action (plan generation, email sent, etc.)
export async function trackUsage(userId, action) {
  const { data, error } = await supabase
    .from('usage_tracking')
    .insert({ user_id: userId, action })
    .select()
  
  if (error) {
    console.error('[trackUsage] Error:', error)
    return null
  }
  return data
}

// Get count of usage for an action within a time window
export async function getUsageCount(userId, action, sinceDaysAgo = 7) {
  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - sinceDaysAgo)
  
  const { data, error, count } = await supabase
    .from('usage_tracking')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', sinceDate.toISOString())
  
  if (error) {
    console.error('[getUsageCount] Error:', error)
    return 0
  }
  
  return count || 0
}

// Check if user can perform a premium action
export async function canPerformAction(userId, action, freeLimit = 1) {
  // Get user's tier
  const { data: household } = await supabase
    .from('households')
    .select('tier')
    .eq('user_id', userId)
    .limit(1)
    .single()
  
  // Premium users can do anything
  if (household?.tier === 'premium') {
    return { allowed: true, isPremium: true }
  }
  
  // Check usage for free tier
  const usageCount = await getUsageCount(userId, action, 7)
  const allowed = usageCount < freeLimit
  
  return { 
    allowed, 
    isPremium: false, 
    usedCount: usageCount, 
    limit: freeLimit 
  }
}

// Get feature flags from database
export async function getFeatureFlags() {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
  
  if (error) {
    console.error('[getFeatureFlags] Error:', error)
    return {}
  }
  
  // Convert to object for easy lookup
  return data.reduce((acc, flag) => {
    acc[flag.name] = {
      free: flag.enabled_for_free,
      premium: flag.enabled_for_premium
    }
    return acc
  }, {})
}

// Check if a feature is enabled for a user's tier
export async function isFeatureEnabled(userId, featureName) {
  const flags = await getFeatureFlags()
  const feature = flags[featureName]
  
  if (!feature) return false
  
  // Get user's tier
  const { data: household } = await supabase
    .from('households')
    .select('tier')
    .eq('user_id', userId)
    .limit(1)
    .single()
  
  const isPremium = household?.tier === 'premium'
  
  return isPremium ? feature.premium : feature.free
}

// Upgrade user to premium (beta temporary)
export async function upgradeToPremium(userId) {
  const { data, error } = await supabase
    .from('households')
    .update({ 
      tier: 'premium',
      premium_since: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) {
    console.error('[upgradeToPremium] Error:', error)
    return null
  }
  
  return data
}

// Get user's current tier info
export async function getUserTier(userId) {
  const { data, error } = await supabase
    .from('households')
    .select('tier, premium_since')
    .eq('user_id', userId)
    .limit(1)
    .single()
  
  if (error) {
    return { tier: 'free', isPremium: false }
  }
  
  return {
    tier: data?.tier || 'free',
    isPremium: data?.tier === 'premium',
    premiumSince: data?.premium_since
  }
}