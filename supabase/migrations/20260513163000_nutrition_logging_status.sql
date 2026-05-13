BEGIN;

ALTER TABLE meal_nutrition_logs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'final' CHECK (status IN ('final', 'estimate_required'));

COMMIT;
