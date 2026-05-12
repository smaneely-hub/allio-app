-- Extend user_preferences with nutrition profile and TDEE fields.
-- Also adds shopping list columns that the app already references but were
-- never formally migrated (added via dashboard previously).

BEGIN;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS default_shopping_list_id UUID,
  ADD COLUMN IF NOT EXISTS always_ask_shopping_list BOOLEAN NOT NULL DEFAULT FALSE,
  -- Body stats for TDEE / Mifflin-St Jeor calculation
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS age_years INTEGER,
  ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IS NULL OR sex IN ('male', 'female', 'other')),
  -- Activity & goal
  ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (
    activity_level IS NULL OR
    activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'maintain' CHECK (
    goal_type IS NULL OR
    goal_type IN ('lose', 'maintain', 'gain')
  ),
  ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC,
  -- Nutrition targets (manual override when nutrition_mode = 'manual')
  ADD COLUMN IF NOT EXISTS calories_target INTEGER,
  ADD COLUMN IF NOT EXISTS protein_target_g INTEGER,
  ADD COLUMN IF NOT EXISTS carbs_target_g INTEGER,
  ADD COLUMN IF NOT EXISTS fat_target_g INTEGER,
  -- 'auto' = calculated from TDEE, 'manual' = user-specified
  ADD COLUMN IF NOT EXISTS nutrition_mode TEXT DEFAULT 'auto' CHECK (
    nutrition_mode IS NULL OR
    nutrition_mode IN ('auto', 'manual')
  ),
  -- Dietary preferences at the profile level (merged with household member data)
  ADD COLUMN IF NOT EXISTS foods_to_avoid TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allergies TEXT[] DEFAULT '{}';

COMMIT;
