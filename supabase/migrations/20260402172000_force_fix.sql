-- Force fix recipes and shopping_lists tables

BEGIN;

-- Drop and recreate recipes table with proper schema
DROP TABLE IF EXISTS recipes CASCADE;

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cuisine TEXT,
  meal_type TEXT NOT NULL,
  prep_time_minutes INTEGER DEFAULT 15,
  cook_time_minutes INTEGER DEFAULT 30,
  servings INTEGER DEFAULT 4,
  ingredients_json JSONB DEFAULT '[]'::jsonb,
  instructions_json JSONB DEFAULT '[]'::jsonb,
  nutrition_json JSONB DEFAULT '{}'::jsonb,
  dietary_flags_json JSONB DEFAULT '[]'::jsonb,
  allergen_flags_json JSONB DEFAULT '[]'::jsonb,
  equipment_json JSONB DEFAULT '[]'::jsonb,
  tags_json JSONB DEFAULT '[]'::jsonb,
  kid_friendly_score INTEGER DEFAULT 5,
  weeknight_score INTEGER DEFAULT 5,
  leftovers_score INTEGER DEFAULT 5,
  cost_tier TEXT DEFAULT 'moderate',
  difficulty TEXT DEFAULT 'medium',
  active BOOLEAN DEFAULT true,
  source_type TEXT DEFAULT 'seed',
  source_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recipes_meal_type ON recipes(meal_type) WHERE active = true;
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine) WHERE active = true;
CREATE INDEX idx_recipes_weeknight ON recipes(weeknight_score DESC) WHERE active = true;
CREATE INDEX idx_recipes_kid_friendly ON recipes(kid_friendly_score DESC) WHERE active = true;

-- Drop and recreate shopping_lists table
DROP TABLE IF EXISTS shopping_lists CASCADE;

CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  week_of DATE NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  partner_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_of)
);

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shopping lists" ON shopping_lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shopping lists" ON shopping_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shopping lists" ON shopping_lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shopping lists" ON shopping_lists
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_shopping_lists_user_week ON shopping_lists(user_id, week_of);

COMMIT;
