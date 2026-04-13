ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS yield_text TEXT,
  ADD COLUMN IF NOT EXISTS total_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS ingredient_groups_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS instruction_groups_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tips_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS substitutions_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS nutrition_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tags_v2_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_note TEXT,
  ADD COLUMN IF NOT EXISTS image_prompt TEXT;

UPDATE recipes
SET yield_text = COALESCE(yield_text, CASE WHEN servings IS NOT NULL THEN servings::text || ' servings' ELSE NULL END),
    total_time_minutes = COALESCE(total_time_minutes, COALESCE(prep_time_minutes, 0) + COALESCE(cook_time_minutes, 0)),
    ingredient_groups_json = CASE
      WHEN ingredient_groups_json IS NULL OR ingredient_groups_json = '[]'::jsonb THEN jsonb_build_array(jsonb_build_object('ingredients', CASE
        WHEN ingredients_json IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(ingredients_json) = 'array' THEN ingredients_json
        ELSE jsonb_build_array(ingredients_json)
      END))
      ELSE ingredient_groups_json
    END,
    instruction_groups_json = CASE
      WHEN instruction_groups_json IS NULL OR instruction_groups_json = '[]'::jsonb THEN jsonb_build_array(jsonb_build_object('steps', (
        SELECT COALESCE(jsonb_agg(CASE WHEN jsonb_typeof(value) = 'string' THEN jsonb_build_object('text', value #>> '{}') ELSE value END), '[]'::jsonb)
        FROM jsonb_array_elements(CASE
          WHEN instructions_json IS NULL THEN '[]'::jsonb
          WHEN jsonb_typeof(instructions_json) = 'array' THEN instructions_json
          ELSE jsonb_build_array(instructions_json)
        END) value
      )))
      ELSE instruction_groups_json
    END,
    tips_json = COALESCE(CASE WHEN jsonb_typeof(tips_json) = 'array' THEN tips_json ELSE '[]'::jsonb END, '[]'::jsonb),
    substitutions_json = COALESCE(CASE WHEN jsonb_typeof(substitutions_json) = 'array' THEN substitutions_json ELSE '[]'::jsonb END, '[]'::jsonb),
    tags_v2_json = CASE
      WHEN tags_v2_json IS NULL OR tags_v2_json = '{}'::jsonb OR jsonb_typeof(tags_v2_json) <> 'object' THEN jsonb_build_object(
        'cuisine', COALESCE(cuisine, ''),
        'mealType', COALESCE(meal_type, ''),
        'dietary', CASE
          WHEN dietary_flags_json IS NULL THEN '[]'::jsonb
          WHEN jsonb_typeof(dietary_flags_json) = 'array' THEN dietary_flags_json
          ELSE jsonb_build_array(dietary_flags_json)
        END,
        'season', NULL,
        'cookingMethod', '[]'::jsonb
      )
      ELSE tags_v2_json
    END;
