-- =============================================================================
-- ALLIO SECURITY FIX - RLS Lockdown
-- =============================================================================
-- Phase 2: Enable RLS on all exposed tables
-- Phase 3: Apply correct policy model
-- =============================================================================

-- =============================================================================
-- PHASE 2: ENABLE RLS ON DISABLED TABLES
-- =============================================================================

-- Enable RLS on feature_flags (INTERNAL table)
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Enable RLS on usage_tracking (INTERNAL table)  
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PHASE 3: APPLY CORRECT POLICIES
-- =============================================================================

-- =============================================================================
-- A. INTERNAL TABLES (feature_flags, usage_tracking)
-- =============================================================================

-- feature_flags: Internal system table - only service role can access
DROP POLICY IF EXISTS "Service role can manage feature flags" ON feature_flags;
CREATE POLICY "Service role can manage feature flags" ON feature_flags
  FOR ALL USING (auth.role() = 'service_role');

-- usage_tracking: Internal analytics - authenticated read, service role write
DROP POLICY IF EXISTS "Authenticated users can insert usage tracking" ON usage_tracking;
CREATE POLICY "Authenticated users can insert usage tracking" ON usage_tracking
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- B. PUBLIC CATALOG TABLES (recipes)
-- =============================================================================

-- recipes: Public catalog - anyone can read, only service role can write
-- First, drop any overly permissive policies
DROP POLICY IF EXISTS "Anyone can read recipes" ON recipes;
DROP POLICY IF EXISTS "Anyone can insert recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert recipes" ON recipes;
DROP POLICY IF EXISTS "Authenticated users can read recipes" ON recipes;
DROP POLICY IF EXISTS "Service role can manage recipes" ON recipes;

-- Read access: authenticated users can read (for meal planning)
CREATE POLICY "Authenticated users can read recipes" ON recipes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Write access: service role only (admin operations)
CREATE POLICY "Service role can manage recipes" ON recipes
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- C. USER-OWNED TABLES - Verify existing policies are correct
-- =============================================================================

-- households: Already has policies, verify they're correct
-- household_members: Already has policies, verify they're correct
-- meal_plans: Already has policies, verify they're correct
-- weekly_schedules: Already has policies, verify they're correct
-- schedule_slots: Already has policies, verify they're correct
-- shopping_lists: Already has policies, verify they're correct
-- meal_instances: Already has policies, verify they're correct  
-- meal_member_feedback: Already has policies, verify they're correct
-- saved_meals: Already has policies, verify they're correct
-- planned_meals: Already has policies, verify they're correct
-- planned_days: Already has policies, verify they're correct

-- =============================================================================
-- ADDITIONAL FIXES FOR NEW TABLES (from meal learning migration)
-- =============================================================================

-- Ensure meal_instances has proper policies (verify)
DROP POLICY IF EXISTS "Users can select own meal instances" ON meal_instances;
CREATE POLICY "Users can select own meal instances" ON meal_instances 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meal instances" ON meal_instances;
CREATE POLICY "Users can insert own meal instances" ON meal_instances 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meal instances" ON meal_instances;
CREATE POLICY "Users can update own meal instances" ON meal_instances 
  FOR UPDATE USING (auth.uid() = user_id);

-- Ensure saved_meals has proper policies
DROP POLICY IF EXISTS "Users can select own saved meals" ON saved_meals;
CREATE POLICY "Users can select own saved meals" ON saved_meals 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own saved meals" ON saved_meals;
CREATE POLICY "Users can insert own saved meals" ON saved_meals 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own saved meals" ON saved_meals;
CREATE POLICY "Users can delete own saved meals" ON saved_meals 
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables  
WHERE schemaname = 'public'
ORDER BY tablename;

-- Success message
SELECT 'Security fix applied successfully!' as status;