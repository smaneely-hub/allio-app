-- Per-user recipe interaction tracking: favorites, ratings, and cook history.
-- Separate from the recipes table so each user's interactions are independent.

CREATE TABLE IF NOT EXISTS recipe_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  times_cooked INTEGER NOT NULL DEFAULT 0,
  last_cooked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_interactions_user
  ON recipe_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_interactions_recipe
  ON recipe_interactions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_interactions_favorites
  ON recipe_interactions(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_recipe_interactions_rating
  ON recipe_interactions(user_id, rating);
CREATE INDEX IF NOT EXISTS idx_recipe_interactions_cooked
  ON recipe_interactions(user_id, times_cooked DESC);

ALTER TABLE recipe_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recipe interactions"
  ON recipe_interactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
