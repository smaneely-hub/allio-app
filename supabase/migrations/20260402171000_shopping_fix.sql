-- Fix shopping_lists table

BEGIN;

-- Add week_of column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_lists' AND column_name = 'week_of') THEN
    ALTER TABLE shopping_lists ADD COLUMN week_of DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_lists' AND column_name = 'items') THEN
    ALTER TABLE shopping_lists ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_lists' AND column_name = 'partner_data') THEN
    ALTER TABLE shopping_lists ADD COLUMN partner_data JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_lists' AND column_name = 'user_id') THEN
    ALTER TABLE shopping_lists ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_lists' AND column_name = 'household_id') THEN
    ALTER TABLE shopping_lists ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Add unique constraint (will fail if exists, that's ok)
ALTER TABLE shopping_lists ADD CONSTRAINT unique_user_week UNIQUE (user_id, week_of);

-- Add index
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_week ON shopping_lists(user_id, week_of);

-- Add RLS if not enabled
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- Add policies
DROP POLICY IF EXISTS "Users can view own shopping lists" ON shopping_lists;
CREATE POLICY "Users can view own shopping lists" ON shopping_lists FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own shopping lists" ON shopping_lists;
CREATE POLICY "Users can insert own shopping lists" ON shopping_lists FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own shopping lists" ON shopping_lists;
CREATE POLICY "Users can update own shopping lists" ON shopping_lists FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own shopping lists" ON shopping_lists;
CREATE POLICY "Users can delete own shopping lists" ON shopping_lists FOR DELETE USING (auth.uid() = user_id);

COMMIT;
