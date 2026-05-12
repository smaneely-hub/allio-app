BEGIN;

ALTER TABLE public.household_members
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMIT;
