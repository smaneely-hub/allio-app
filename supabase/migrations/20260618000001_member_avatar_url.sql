-- Add optional avatar_url to household_members for profile photos
ALTER TABLE household_members
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
