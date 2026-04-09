-- Multi-user preference architecture
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- PHASE 1: New Tables for Meal Learning
-- ============================================

-- Meal instances: one row per generated meal event
CREATE TABLE IF NOT EXISTS meal_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  recipe_name TEXT NOT NULL,
  selected_member_ids UUID[] DEFAULT '{}',
  source TEXT DEFAULT 'generated', -- 'generated', 'swap', 'planner'
  effort_level TEXT DEFAULT 'medium',
  dietary_focus TEXT,
  feedback_text TEXT,
  status TEXT DEFAULT 'generated', -- 'generated', 'cooked', 'rated'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cooked_at TIMESTAMPTZ
);

-- Meal member feedback: per-person reaction
CREATE TABLE IF NOT EXISTS meal_member_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_instance_id UUID REFERENCES meal_instances(id) ON DELETE CASCADE NOT NULL,
  household_member_id UUID REFERENCES household_members(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  rating TEXT NOT NULL, -- 'loved_it', 'liked_it', 'it_was_okay', 'did_not_like', 'did_not_eat'
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_meal_instances_household ON meal_instances(household_id);
CREATE INDEX IF NOT EXISTS idx_meal_instances_user ON meal_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_instances_created ON meal_instances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_member_feedback_instance ON meal_member_feedback(meal_instance_id);
CREATE INDEX IF NOT EXISTS idx_meal_member_feedback_member ON meal_member_feedback(household_member_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE meal_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_member_feedback ENABLE ROW LEVEL SECURITY;

-- meal_instances policies
CREATE POLICY "Users can select own meal instances" ON meal_instances FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal instances" ON meal_instances FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal instances" ON meal_instances FOR UPDATE 
  USING (auth.uid() = user_id);

-- meal_member_feedback policies
CREATE POLICY "Users can select own feedback" ON meal_member_feedback FOR SELECT 
  USING (auth.uid() IN (
    SELECT user_id FROM household_members hm 
    JOIN meal_instances mi ON mi.household_id = hm.household_id 
    WHERE mi.id = meal_instance_id
  ));
CREATE POLICY "Users can insert own feedback" ON meal_member_feedback FOR INSERT 
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM household_members hm 
    JOIN meal_instances mi ON mi.household_id = hm.household_id 
    WHERE mi.id = meal_instance_id
  ));
CREATE POLICY "Users can update own feedback" ON meal_member_feedback FOR UPDATE 
  USING (auth.uid() IN (
    SELECT user_id FROM household_members hm 
    JOIN meal_instances mi ON mi.household_id = hm.household_id 
    WHERE mi.id = meal_instance_id
  ));

-- ============================================
-- Helper Function: Get Member Preference Score
-- ============================================

CREATE OR REPLACE FUNCTION get_member_recipe_score(
  p_household_member_id UUID,
  p_recipe_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE rating
      WHEN 'loved_it' THEN 2
      WHEN 'liked_it' THEN 1
      WHEN 'it_was_okay' THEN 0
      WHEN 'did_not_like' THEN -2
      WHEN 'did_not_eat' THEN -1
      ELSE 0
    END
  ), 0) INTO score
  FROM meal_member_feedback
  WHERE household_member_id = p_household_member_id
    AND recipe_id = p_recipe_id;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Helper Function: Get Group Preference Score
-- ============================================

CREATE OR REPLACE FUNCTION get_group_recipe_score(
  p_member_ids UUID[],
  p_recipe_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  member_id UUID;
  member_score INTEGER;
  has_negative BOOLEAN := FALSE;
BEGIN
  FOREACH member_id IN ARRAY p_member_ids
  LOOP
    member_score := get_member_recipe_score(member_id, p_recipe_id);
    score := score + member_score;
    
    -- Track if any member disliked
    IF member_score < 0 THEN
      has_negative := TRUE;
    END IF;
  END LOOP;
  
  -- Strongly penalize if anyone disliked (negative multiplier)
  IF has_negative THEN
    score := score * 2;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;