-- Add subscription_source to households so billing provider can be tracked.
-- When multiple billing paths exist (Play Billing, Stripe, promo, admin grant),
-- subscription_source tells us which path set subscription_tier = 'premium'.
-- This is required for refund handling, receipt verification, and debugging.
--
-- Valid values mirror BILLING_PROVIDERS in src/lib/billing.js:
--   play_billing  — Google Play In-App Purchases (Android)
--   stripe        — Stripe (web)
--   promo         — Promotional / gifted grant
--   manual        — Admin-set or legacy row (unknown source)

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS subscription_source TEXT DEFAULT 'manual'
  CHECK (subscription_source IN ('play_billing', 'stripe', 'promo', 'manual'));
