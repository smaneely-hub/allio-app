-- Recipes Table Fix - Adds required columns to existing recipes table

BEGIN;

-- Create recipes table if it doesn't exist (will be no-op if table exists)
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  slug TEXT,
  description TEXT,
  cuisine TEXT,
  meal_type TEXT,
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

-- Add missing columns one by one (safe if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'title') THEN
    ALTER TABLE recipes ADD COLUMN title TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'slug') THEN
    ALTER TABLE recipes ADD COLUMN slug TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'cuisine') THEN
    ALTER TABLE recipes ADD COLUMN cuisine TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'meal_type') THEN
    ALTER TABLE recipes ADD COLUMN meal_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'prep_time_minutes') THEN
    ALTER TABLE recipes ADD COLUMN prep_time_minutes INTEGER DEFAULT 15;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'cook_time_minutes') THEN
    ALTER TABLE recipes ADD COLUMN cook_time_minutes INTEGER DEFAULT 30;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'servings') THEN
    ALTER TABLE recipes ADD COLUMN servings INTEGER DEFAULT 4;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'ingredients_json') THEN
    ALTER TABLE recipes ADD COLUMN ingredients_json JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'instructions_json') THEN
    ALTER TABLE recipes ADD COLUMN instructions_json JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'kid_friendly_score') THEN
    ALTER TABLE recipes ADD COLUMN kid_friendly_score INTEGER DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'weeknight_score') THEN
    ALTER TABLE recipes ADD COLUMN weeknight_score INTEGER DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'leftovers_score') THEN
    ALTER TABLE recipes ADD COLUMN leftovers_score INTEGER DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'active') THEN
    ALTER TABLE recipes ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'difficulty') THEN
    ALTER TABLE recipes ADD COLUMN difficulty TEXT DEFAULT 'medium';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'dietary_flags_json') THEN
    ALTER TABLE recipes ADD COLUMN dietary_flags_json JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'allergen_flags_json') THEN
    ALTER TABLE recipes ADD COLUMN allergen_flags_json JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'tags_json') THEN
    ALTER TABLE recipes ADD COLUMN tags_json JSONB DEFAULT '[]'::jsonb;
  END IF;
END
$$;

-- Create indexes (will fail silently if they exist)
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_recipes_weeknight ON recipes(weeknight_score DESC) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_recipes_kid_friendly ON recipes(kid_friendly_score DESC) WHERE active = true;

-- Shopping lists table
CREATE TABLE IF NOT EXISTS shopping_lists (
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

-- Add RLS for shopping_lists
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own shopping lists" ON shopping_lists;
CREATE POLICY "Users can view own shopping lists" ON shopping_lists FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own shopping lists" ON shopping_lists;
CREATE POLICY "Users can insert own shopping lists" ON shopping_lists FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own shopping lists" ON shopping_lists;
CREATE POLICY "Users can update own shopping lists" ON shopping_lists FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own shopping lists" ON shopping_lists;
CREATE POLICY "Users can delete own shopping lists" ON shopping_lists FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_week ON shopping_lists(user_id, week_of);

COMMIT;
