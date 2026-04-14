-- Security hardening: production-only edge functions removed, RLS tightened, and missing policies added.

BEGIN;

ALTER TABLE IF EXISTS usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recipes_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS households ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS schedule_slots ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS recipes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS recipes_v2
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Authenticated users can insert usage tracking" ON usage_tracking;
DROP POLICY IF EXISTS "Users can view own usage tracking" ON usage_tracking;
DROP POLICY IF EXISTS "Users can insert own usage tracking" ON usage_tracking;

CREATE POLICY "Users can view own usage tracking" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage tracking" ON usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can read recipes" ON recipes;
DROP POLICY IF EXISTS "Service role can manage recipes" ON recipes;
DROP POLICY IF EXISTS "Users can read recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete recipes" ON recipes;

CREATE POLICY "Users can read recipes" ON recipes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert recipes" ON recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update recipes" ON recipes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete recipes" ON recipes
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read recipes_v2" ON recipes_v2;
DROP POLICY IF EXISTS "Users can insert recipes_v2" ON recipes_v2;
DROP POLICY IF EXISTS "Users can update recipes_v2" ON recipes_v2;
DROP POLICY IF EXISTS "Users can delete recipes_v2" ON recipes_v2;

CREATE POLICY "Users can read recipes_v2" ON recipes_v2
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert recipes_v2" ON recipes_v2
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update recipes_v2" ON recipes_v2
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete recipes_v2" ON recipes_v2
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "households_select" ON households;
DROP POLICY IF EXISTS "households_insert" ON households;
DROP POLICY IF EXISTS "households_update" ON households;
DROP POLICY IF EXISTS "households_delete" ON households;

CREATE POLICY "households_select" ON households
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = households.id
        AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "households_insert" ON households
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "households_update" ON households
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = households.id
        AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "households_delete" ON households
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = households.id
        AND hm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "members_select" ON household_members;
DROP POLICY IF EXISTS "members_insert" ON household_members;
DROP POLICY IF EXISTS "members_update" ON household_members;
DROP POLICY IF EXISTS "members_delete" ON household_members;

CREATE POLICY "members_select" ON household_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "members_insert" ON household_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "members_update" ON household_members
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "members_delete" ON household_members
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "plans_select" ON meal_plans;
DROP POLICY IF EXISTS "plans_insert" ON meal_plans;
DROP POLICY IF EXISTS "plans_update" ON meal_plans;
DROP POLICY IF EXISTS "plans_delete" ON meal_plans;

CREATE POLICY "plans_select" ON meal_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "plans_insert" ON meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plans_update" ON meal_plans
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plans_delete" ON meal_plans
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "schedules_select" ON weekly_schedules;
DROP POLICY IF EXISTS "schedules_insert" ON weekly_schedules;
DROP POLICY IF EXISTS "schedules_update" ON weekly_schedules;
DROP POLICY IF EXISTS "schedules_delete" ON weekly_schedules;

CREATE POLICY "schedules_select" ON weekly_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "schedules_insert" ON weekly_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "schedules_update" ON weekly_schedules
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "schedules_delete" ON weekly_schedules
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "slots_select" ON schedule_slots;
DROP POLICY IF EXISTS "slots_insert" ON schedule_slots;
DROP POLICY IF EXISTS "slots_update" ON schedule_slots;
DROP POLICY IF EXISTS "slots_delete" ON schedule_slots;

CREATE POLICY "slots_select" ON schedule_slots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "slots_insert" ON schedule_slots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "slots_update" ON schedule_slots
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "slots_delete" ON schedule_slots
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;
