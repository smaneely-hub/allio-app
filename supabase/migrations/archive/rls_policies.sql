-- RLS Policies for Allio App
-- Run this in Supabase SQL Editor

-- ============================================================
-- households
-- ============================================================
DROP POLICY IF EXISTS "households_select" ON households;
DROP POLICY IF EXISTS "households_insert" ON households;
DROP POLICY IF EXISTS "households_update" ON households;
DROP POLICY IF EXISTS "households_delete" ON households;

CREATE POLICY "households_select" ON households FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "households_insert" ON households FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "households_update" ON households FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "households_delete" ON households FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- household_members
-- ============================================================
DROP POLICY IF EXISTS "members_select" ON household_members;
DROP POLICY IF EXISTS "members_insert" ON household_members;
DROP POLICY IF EXISTS "members_update" ON household_members;
DROP POLICY IF EXISTS "members_delete" ON household_members;

CREATE POLICY "members_select" ON household_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "members_insert" ON household_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_update" ON household_members FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_delete" ON household_members FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- weekly_schedules
-- ============================================================
DROP POLICY IF EXISTS "schedules_select" ON weekly_schedules;
DROP POLICY IF EXISTS "schedules_insert" ON weekly_schedules;
DROP POLICY IF EXISTS "schedules_update" ON weekly_schedules;
DROP POLICY IF EXISTS "schedules_delete" ON weekly_schedules;

CREATE POLICY "schedules_select" ON weekly_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "schedules_insert" ON weekly_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "schedules_update" ON weekly_schedules FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "schedules_delete" ON weekly_schedules FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- schedule_slots
-- ============================================================
DROP POLICY IF EXISTS "slots_select" ON schedule_slots;
DROP POLICY IF EXISTS "slots_insert" ON schedule_slots;
DROP POLICY IF EXISTS "slots_update" ON schedule_slots;
DROP POLICY IF EXISTS "slots_delete" ON schedule_slots;

CREATE POLICY "slots_select" ON schedule_slots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "slots_insert" ON schedule_slots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "slots_update" ON schedule_slots FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "slots_delete" ON schedule_slots FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- meal_plans
-- ============================================================
DROP POLICY IF EXISTS "plans_select" ON meal_plans;
DROP POLICY IF EXISTS "plans_insert" ON meal_plans;
DROP POLICY IF EXISTS "plans_update" ON meal_plans;
DROP POLICY IF EXISTS "plans_delete" ON meal_plans;

CREATE POLICY "plans_select" ON meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plans_insert" ON meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plans_update" ON meal_plans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plans_delete" ON meal_plans FOR DELETE USING (auth.uid() = user_id);