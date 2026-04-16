-- Public /try feedback columns on meals
ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS feedback text CHECK (feedback IN ('up', 'down')),
  ADD COLUMN IF NOT EXISTS feedback_at timestamptz;
