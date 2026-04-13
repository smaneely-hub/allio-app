-- Planner workspace data model expansion
-- Backward-compatible additive migration for mobile-first day/week planner

ALTER TABLE weekly_schedules
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shopping_day TEXT DEFAULT 'Sunday',
  ADD COLUMN IF NOT EXISTS week_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

ALTER TABLE schedule_slots
  ADD COLUMN IF NOT EXISTS day TEXT,
  ADD COLUMN IF NOT EXISTS meal TEXT,
  ADD COLUMN IF NOT EXISTS attendees TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE meal_plans
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS week_of DATE,
  ADD COLUMN IF NOT EXISTS planner_version INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS day_notes JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS meal_index JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS planned_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  schedule_id UUID REFERENCES weekly_schedules(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  day_name TEXT NOT NULL,
  status TEXT DEFAULT 'planned',
  note TEXT DEFAULT '',
  source_day_id UUID REFERENCES planned_days(id) ON DELETE SET NULL,
  copied_from_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (meal_plan_id, day_date)
);

CREATE TABLE IF NOT EXISTS planned_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE NOT NULL,
  planned_day_id UUID REFERENCES planned_days(id) ON DELETE CASCADE NOT NULL,
  slot_key TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT DEFAULT '',
  locked BOOLEAN DEFAULT FALSE,
  recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  copied_from_meal_id UUID REFERENCES planned_meals(id) ON DELETE SET NULL,
  source_type TEXT DEFAULT 'generated',
  image_url TEXT,
  prep_time_minutes INTEGER DEFAULT 0,
  cook_time_minutes INTEGER DEFAULT 0,
  servings NUMERIC DEFAULT 1,
  amount_to_eat NUMERIC DEFAULT 1,
  amount_unit TEXT DEFAULT 'serving',
  calories NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  ingredients JSONB DEFAULT '[]'::jsonb,
  directions JSONB DEFAULT '[]'::jsonb,
  foods JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS planned_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS planned_meals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can select their own planned_days" ON planned_days FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own planned_days" ON planned_days FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own planned_days" ON planned_days FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own planned_days" ON planned_days FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can select their own planned_meals" ON planned_meals FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert their own planned_meals" ON planned_meals FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update their own planned_meals" ON planned_meals FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete their own planned_meals" ON planned_meals FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
