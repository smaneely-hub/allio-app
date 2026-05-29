-- Household shared access: allow household members with linked Allio accounts
-- to read the household owner's schedules, slots, and meal plans.
--
-- Design:
--   household_members.linked_user_id = the auth.users ID of a member who has
--   their own account. This is distinct from user_id (the owner's ID).
--
-- Access is SELECT-only. Linked members cannot modify the owner's data.
-- A SECURITY DEFINER helper function is used to break the potential RLS
-- recursion when household_members policies reference household_members.

BEGIN;

-- 1. Add linked_user_id to household_members
ALTER TABLE household_members
  ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS household_members_linked_user_id_idx
  ON household_members(linked_user_id)
  WHERE linked_user_id IS NOT NULL;

-- 2. SECURITY DEFINER helper: returns all household IDs where the calling
--    user is a linked member. Bypasses RLS to avoid recursive policy loops.
CREATE OR REPLACE FUNCTION linked_household_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT household_id
  FROM household_members
  WHERE linked_user_id = auth.uid()
    AND linked_user_id IS NOT NULL;
$$;

-- 3. households: owner can read their own; linked members can read the household.
--    Replaces the security-hardening "households_select" policy.
DROP POLICY IF EXISTS "households_select" ON households;
DROP POLICY IF EXISTS "Users can select their own households" ON households;
CREATE POLICY "households_select" ON households
  FOR SELECT USING (
    auth.uid() = user_id
    OR id = ANY(ARRAY(SELECT linked_household_ids()))
  );

-- 4. household_members: owner can read all members in their household;
--    linked members can read members of the household they belong to.
DROP POLICY IF EXISTS "members_select" ON household_members;
DROP POLICY IF EXISTS "Users can select their own members" ON household_members;
CREATE POLICY "members_select" ON household_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT linked_household_ids()))
  );

-- 5. weekly_schedules: owner access unchanged; linked members can read
--    schedules belonging to their linked household.
DROP POLICY IF EXISTS "schedules_select" ON weekly_schedules;
DROP POLICY IF EXISTS "Users can select their own schedules" ON weekly_schedules;
CREATE POLICY "schedules_select" ON weekly_schedules
  FOR SELECT USING (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT linked_household_ids()))
  );

-- 6. schedule_slots: no household_id column, so join through weekly_schedules.
DROP POLICY IF EXISTS "slots_select" ON schedule_slots;
DROP POLICY IF EXISTS "Users can select their own slots" ON schedule_slots;
CREATE POLICY "slots_select" ON schedule_slots
  FOR SELECT USING (
    auth.uid() = user_id
    OR schedule_id IN (
      SELECT ws.id
      FROM weekly_schedules ws
      WHERE ws.household_id = ANY(ARRAY(SELECT linked_household_ids()))
    )
  );

-- 7. meal_plans: owner access unchanged; linked members can read plans
--    belonging to their linked household.
DROP POLICY IF EXISTS "plans_select" ON meal_plans;
DROP POLICY IF EXISTS "Users can select their own plans" ON meal_plans;
CREATE POLICY "plans_select" ON meal_plans
  FOR SELECT USING (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT linked_household_ids()))
  );

COMMIT;
