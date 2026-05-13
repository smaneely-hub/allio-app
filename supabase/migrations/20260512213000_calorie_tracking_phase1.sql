BEGIN;

CREATE TABLE IF NOT EXISTS daily_nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  total_calories NUMERIC NOT NULL DEFAULT 0,
  total_protein_g NUMERIC NOT NULL DEFAULT 0,
  total_carbs_g NUMERIC NOT NULL DEFAULT 0,
  total_fat_g NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE TABLE IF NOT EXISTS meal_nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  daily_log_id UUID REFERENCES daily_nutrition_logs(id) ON DELETE SET NULL,
  log_date DATE NOT NULL,
  meal_slot TEXT NOT NULL DEFAULT 'dinner' CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  entry_name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('planner', 'manual')),
  meal_instance_id UUID REFERENCES meal_instances(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  recipe_name TEXT,
  servings NUMERIC NOT NULL DEFAULT 1,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  nutrition_source TEXT NOT NULL DEFAULT 'manual' CHECK (nutrition_source IN ('recipe', 'manual', 'estimated')),
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_nutrition_logs_user_date ON daily_nutrition_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_nutrition_logs_user_date ON meal_nutrition_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_nutrition_logs_daily_log_id ON meal_nutrition_logs(daily_log_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_nutrition_logs_meal_instance_unique ON meal_nutrition_logs(meal_instance_id) WHERE meal_instance_id IS NOT NULL;

ALTER TABLE daily_nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_nutrition_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily nutrition logs" ON daily_nutrition_logs;
CREATE POLICY "Users can view own daily nutrition logs" ON daily_nutrition_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily nutrition logs" ON daily_nutrition_logs;
CREATE POLICY "Users can insert own daily nutrition logs" ON daily_nutrition_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily nutrition logs" ON daily_nutrition_logs;
CREATE POLICY "Users can update own daily nutrition logs" ON daily_nutrition_logs
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own daily nutrition logs" ON daily_nutrition_logs;
CREATE POLICY "Users can delete own daily nutrition logs" ON daily_nutrition_logs
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own meal nutrition logs" ON meal_nutrition_logs;
CREATE POLICY "Users can view own meal nutrition logs" ON meal_nutrition_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own meal nutrition logs" ON meal_nutrition_logs;
CREATE POLICY "Users can insert own meal nutrition logs" ON meal_nutrition_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meal nutrition logs" ON meal_nutrition_logs;
CREATE POLICY "Users can update own meal nutrition logs" ON meal_nutrition_logs
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meal nutrition logs" ON meal_nutrition_logs;
CREATE POLICY "Users can delete own meal nutrition logs" ON meal_nutrition_logs
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION recompute_daily_nutrition_log(p_user_id UUID, p_log_date DATE)
RETURNS daily_nutrition_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row daily_nutrition_logs;
BEGIN
  INSERT INTO daily_nutrition_logs (
    user_id,
    log_date,
    total_calories,
    total_protein_g,
    total_carbs_g,
    total_fat_g,
    created_at,
    updated_at
  )
  SELECT
    p_user_id,
    p_log_date,
    COALESCE(SUM(calories), 0),
    COALESCE(SUM(protein_g), 0),
    COALESCE(SUM(carbs_g), 0),
    COALESCE(SUM(fat_g), 0),
    NOW(),
    NOW()
  FROM meal_nutrition_logs
  WHERE user_id = p_user_id
    AND log_date = p_log_date
  ON CONFLICT (user_id, log_date)
  DO UPDATE SET
    total_calories = EXCLUDED.total_calories,
    total_protein_g = EXCLUDED.total_protein_g,
    total_carbs_g = EXCLUDED.total_carbs_g,
    total_fat_g = EXCLUDED.total_fat_g,
    updated_at = NOW()
  RETURNING * INTO v_row;

  UPDATE meal_nutrition_logs
  SET daily_log_id = v_row.id,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND log_date = p_log_date
    AND (daily_log_id IS NULL OR daily_log_id <> v_row.id);

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION recompute_daily_nutrition_log(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recompute_daily_nutrition_log(UUID, DATE) TO authenticated;

COMMIT;
