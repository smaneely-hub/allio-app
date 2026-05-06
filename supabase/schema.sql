-- Allio Database Schema
-- Run this in Supabase Dashboard > SQL Editor

-- Enable Row Level Security
ALTER TABLE IF EXISTS households ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS meal_plans ENABLE ROW LEVEL SECURITY;

-- Households table
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  planning_scope TEXT DEFAULT 'entire household',
  meal_sharing TEXT DEFAULT 'mostly shared',
  budget_sensitivity TEXT DEFAULT 'moderate',
  diet_focus TEXT DEFAULT 'balanced',
  total_people INTEGER DEFAULT 2,
  low_prep_nights INTEGER DEFAULT 1,
  repeat_tolerance TEXT DEFAULT 'moderate',
  leftovers_for_lunch TEXT DEFAULT 'sometimes',
  adventurousness TEXT DEFAULT 'mixed',
  staples_on_hand TEXT DEFAULT 'olive oil, salt, pepper, garlic, rice, pasta',
  planning_priorities TEXT[] DEFAULT ARRAY['healthy eating', 'reduce grocery chaos'],
  cooking_comfort TEXT DEFAULT 'comfortable',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Household members table
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  label TEXT,
  age INTEGER,
  role TEXT DEFAULT 'adult',
  gender TEXT,
  sex TEXT,
  height_inches INTEGER,
  weight_lbs INTEGER,
  activity_level TEXT DEFAULT 'moderate',
  goal TEXT DEFAULT 'maintain',
  restrictions TEXT,
  preferences TEXT,
  dietary_restrictions TEXT[] DEFAULT ARRAY[]::TEXT[],
  food_preferences TEXT[] DEFAULT ARRAY[]::TEXT[],
  allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
  health_considerations TEXT[] DEFAULT ARRAY[]::TEXT[],
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly schedules table
CREATE TABLE IF NOT EXISTS weekly_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  week_start_date DATE NOT NULL,
  shopping_day TEXT DEFAULT 'Sunday',
  week_notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Schedule slots table
-- Note: uses 'day' and 'meal' (not day_of_week / meal_type)
CREATE TABLE IF NOT EXISTS schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  schedule_id UUID REFERENCES weekly_schedules(id) ON DELETE CASCADE NOT NULL,
  day TEXT NOT NULL,
  meal TEXT NOT NULL,
  attendees TEXT[],
  effort_level TEXT DEFAULT 'medium',
  planning_notes TEXT,
  is_leftover BOOLEAN DEFAULT FALSE,
  leftover_source TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  schedule_id UUID REFERENCES weekly_schedules(id) ON DELETE SET NULL,
  week_of DATE,
  status TEXT DEFAULT 'draft',
  plan JSONB,
  draft_plan JSONB,
  refined_plan JSONB,
  refined_at TIMESTAMPTZ,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for households
CREATE POLICY "Users can select their own households" ON households FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own households" ON households FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own households" ON households FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own households" ON households FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for household_members
CREATE POLICY "Users can select their own members" ON household_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own members" ON household_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own members" ON household_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own members" ON household_members FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for weekly_schedules
CREATE POLICY "Users can select their own schedules" ON weekly_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own schedules" ON weekly_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own schedules" ON weekly_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own schedules" ON weekly_schedules FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for schedule_slots
CREATE POLICY "Users can select their own slots" ON schedule_slots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own slots" ON schedule_slots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own slots" ON schedule_slots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own slots" ON schedule_slots FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for meal_plans
CREATE POLICY "Users can select their own plans" ON meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plans" ON meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plans" ON meal_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plans" ON meal_plans FOR DELETE USING (auth.uid() = user_id);
