-- Allio: Favorites + Meal Learning Schema
-- Run this in Supabase Dashboard > SQL Editor

-- ============================================
-- SAVED MEALS (Favorites)
-- ============================================

CREATE TABLE IF NOT EXISTS saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  recipe_name TEXT NOT NULL,
  recipe_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, recipe_name)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_saved_meals_user ON saved_meals(user_id);

-- RLS
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own saved meals" ON saved_meals FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved meals" ON saved_meals FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved meals" ON saved_meals FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- MEAL INSTANCES (for tracking + feedback)
-- ============================================

CREATE TABLE IF NOT EXISTS meal_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  recipe_name TEXT NOT NULL,
  selected_member_ids UUID[] DEFAULT '{}',
  source TEXT DEFAULT 'generated',
  effort_level TEXT DEFAULT 'medium',
  dietary_focus TEXT,
  feedback_text TEXT,
  status TEXT DEFAULT 'generated',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cooked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS meal_member_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_instance_id UUID REFERENCES meal_instances(id) ON DELETE CASCADE NOT NULL,
  household_member_id UUID REFERENCES household_members(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  rating TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meal_instances_household ON meal_instances(household_id);
CREATE INDEX IF NOT EXISTS idx_meal_instances_user ON meal_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_instances_created ON meal_instances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_member_feedback_instance ON meal_member_feedback(meal_instance_id);
CREATE INDEX IF NOT EXISTS idx_meal_member_feedback_member ON meal_member_feedback(household_member_id);

-- RLS for meal_instances
ALTER TABLE meal_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own meal instances" ON meal_instances FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal instances" ON meal_instances FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal instances" ON meal_instances FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS for meal_member_feedback
ALTER TABLE meal_member_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own feedback" ON meal_member_feedback FOR SELECT 
  USING (auth.uid() IN (
    SELECT hm.user_id FROM household_members hm 
    JOIN meal_instances mi ON mi.household_id = hm.household_id 
    WHERE mi.id = meal_instance_id
  ));
CREATE POLICY "Users can insert own feedback" ON meal_member_feedback FOR INSERT 
  WITH CHECK (auth.uid() IN (
    SELECT hm.user_id FROM household_members hm 
    JOIN meal_instances mi ON mi.household_id = hm.household_id 
    WHERE mi.id = meal_instance_id
  ));
CREATE POLICY "Users can update own feedback" ON meal_member_feedback FOR UPDATE 
  USING (auth.uid() IN (
    SELECT hm.user_id FROM household_members hm 
    JOIN meal_instances mi ON mi.household_id = hm.household_id 
    WHERE mi.id = meal_instance_id
  ));

-- ============================================
-- HELPER FUNCTION: Member preference scoring
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

GRANT EXECUTE ON FUNCTION get_member_recipe_score(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_member_recipe_score(UUID, UUID) TO authenticated;

-- Success message
SELECT 'Allio schema created successfully! Tables: saved_meals, meal_instances, meal_member_feedback' as status;