// Billing provider abstractions and entitlement resolution.
//
// Integration status:
//   - Android / Play Billing: NOT yet integrated
//   - Web / Stripe: NOT yet integrated
//
// Play Billing integration path (when ready):
//   1. Add @capacitor-community/in-app-purchases (or equivalent) plugin
//   2. Implement initiatePlayBillingPurchase() to call the native purchase flow
//   3. On purchase success, call the Supabase edge function to verify the
//      purchase token with the Google Play Developer API
//   4. Edge function sets households.subscription_tier, subscription_source,
//      and subscription_id — the client NEVER writes these directly
//   5. useSubscription re-fetches the household row to pick up the new tier

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
}

export const BILLING_PROVIDERS = {
  PLAY_BILLING: 'play_billing',
  STRIPE: 'stripe',
  PROMO: 'promo',
  MANUAL: 'manual',
}

// Price shown in UI. Update here when the price changes — not scattered across components.
export const PREMIUM_PRICE_MONTHLY = '6.99'

// Play Console product IDs. These must match exactly what is configured in the
// Google Play Console under Monetize → Subscriptions when Play Billing is set up.
export const PLAY_PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'allio_premium_monthly',
}

/**
 * Derive entitlement state from a households DB row.
 * All tier resolution should go through here rather than reading
 * subscription_tier inline across the codebase.
 */
export function resolveEntitlement(household) {
  const tier =
    household?.subscription_tier === SUBSCRIPTION_TIERS.PREMIUM
      ? SUBSCRIPTION_TIERS.PREMIUM
      : SUBSCRIPTION_TIERS.FREE

  return {
    tier,
    isPremium: tier === SUBSCRIPTION_TIERS.PREMIUM,
    source: household?.subscription_source ?? null,
    subscriptionId: household?.subscription_id ?? null,
  }
}

/**
 * Stub: initiate a Play Billing purchase for the given product ID.
 * Returns { supported: false } until the native plugin is wired up.
 */
export async function initiatePlayBillingPurchase() {
  return { supported: false, reason: 'Play Billing not yet integrated' }
}

/**
 * Stub: restore Play Billing purchases (e.g. after reinstall / device change).
 * Returns { supported: false } until the native plugin is wired up.
 */
export async function restorePlayBillingPurchases() {
  return { supported: false, reason: 'Play Billing not yet integrated' }
}
