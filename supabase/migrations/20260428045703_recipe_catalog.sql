ALTER TABLE recipes
 ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating BETWEEN 1 AND 5),
 ADD COLUMN IF NOT EXISTS cooked_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS category TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_recipes_user_favorite
 ON recipes(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_recipes_user_rating
 ON recipes(user_id, rating);
CREATE INDEX IF NOT EXISTS idx_recipes_user_cooked_at
 ON recipes(user_id, cooked_at DESC);
