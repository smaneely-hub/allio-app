-- Migration: Add demographic columns
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS dietary_restrictions text[] DEFAULT '{}';
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS food_preferences text[] DEFAULT '{}';
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS health_considerations text[] DEFAULT '{}';
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS cooking_comfort text;
ALTER TABLE households ADD COLUMN IF NOT EXISTS cooking_comfort text;
