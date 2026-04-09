-- Shopping Lists Table Fix
-- Creates the shopping_lists table that was referenced but never created

BEGIN;

-- Create shopping_lists table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  week_of DATE NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  partner_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint
ALTER TABLE shopping_lists 
  ADD CONSTRAINT unique_user_week UNIQUE (user_id, week_of);

-- Add index for faster queries
CREATE INDEX idx_shopping_lists_user_week ON shopping_lists(user_id, week_of);

-- Enable RLS
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own shopping lists" ON shopping_lists;
CREATE POLICY "Users can view own shopping lists" ON shopping_lists
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own shopping lists" ON shopping_lists;
CREATE POLICY "Users can insert own shopping lists" ON shopping_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own shopping lists" ON shopping_lists;
CREATE POLICY "Users can update own shopping lists" ON shopping_lists
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own shopping lists" ON shopping_lists;
CREATE POLICY "Users can delete own shopping lists" ON shopping_lists
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;