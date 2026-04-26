-- Add clipping fields to recipes table for user-imported recipes
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_domain TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;
