ALTER TABLE household_members ADD COLUMN IF NOT EXISTS sex text;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS height_inches integer;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS weight_lbs integer;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS activity_level text;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS goal text DEFAULT 'maintain';
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS allergies text[] DEFAULT '{}';
