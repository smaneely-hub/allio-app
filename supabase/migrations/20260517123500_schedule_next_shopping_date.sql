ALTER TABLE weekly_schedules
  ADD COLUMN IF NOT EXISTS next_shopping_date DATE;
