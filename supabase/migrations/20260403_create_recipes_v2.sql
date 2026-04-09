-- Create a new recipes table with the correct schema
DROP TABLE IF EXISTS recipes_v2 CASCADE;

CREATE TABLE recipes_v2 (
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

-- Create index
CREATE INDEX idx_recipes_v2_meal_type ON recipes_v2(meal_type) WHERE active = true;
CREATE INDEX idx_recipes_v2_cuisine ON recipes_v2(cuisine) WHERE active = true;
CREATE INDEX idx_recipes_v2_weeknight ON recipes_v2(weeknight_score DESC) WHERE active = true;

-- Add RLS
ALTER TABLE recipes_v2 ENABLE ROW LEVEL SECURITY;

-- Copy data from old recipes table if it has any
INSERT INTO recipes_v2 (title, slug, description, cuisine, meal_type)
SELECT title, slug, description, cuisine, 'dinner' 
FROM recipes 
ON CONFLICT (slug) DO NOTHING;
