-- Premium tier system for Allio
-- Run this SQL to set up the premium features infrastructure

-- 1. Add tier column to households (subscription_tier for quick access)
ALTER TABLE households ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium'));
ALTER TABLE households ADD COLUMN IF NOT EXISTS premium_since TIMESTAMP;
ALTER TABLE households ADD COLUMN IF NOT EXISTS subscription_id TEXT;
-- 2. Usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_action ON usage_tracking(user_id, action);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_created ON usage_tracking(created_at);
-- 3. Add partner_data column to shopping_lists
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS partner_data JSONB DEFAULT '{}';
-- 4. Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  enabled_for_free BOOLEAN DEFAULT FALSE,
  enabled_for_premium BOOLEAN DEFAULT TRUE,
  description TEXT
);
-- Insert default feature flags
INSERT INTO feature_flags (name, enabled_for_free, enabled_for_premium, description) VALUES
  ('email_delivery', false, true, 'Email meal plans and shopping lists'),
  ('unlimited_plans', false, true, 'Generate unlimited meal plans'),
  ('cooking_mode', false, true, 'Step-by-step cooking mode'),
  ('health_customizations', false, true, 'Health-aware meal planning'),
  ('ad_free', false, true, 'Remove advertisements'),
  ('shopping_sharing', false, true, 'Share shopping lists'),
  ('plan_history', false, true, 'View past meal plans')
ON CONFLICT (name) DO NOTHING;
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_households_user_id ON households(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);
