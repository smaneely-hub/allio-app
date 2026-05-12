BEGIN;

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS profile_member_id UUID REFERENCES public.household_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_preferences_profile_member_id
  ON public.user_preferences(profile_member_id);

WITH first_member AS (
  SELECT DISTINCT ON (hm.user_id)
    hm.user_id,
    hm.id AS member_id,
    hm.age,
    hm.sex,
    hm.height_inches,
    hm.weight_lbs,
    hm.activity_level,
    hm.goal
  FROM public.household_members hm
  ORDER BY hm.user_id, hm.created_at ASC, hm.id ASC
)
UPDATE public.user_preferences up
SET
  profile_member_id = COALESCE(up.profile_member_id, fm.member_id),
  weight_kg = NULL,
  height_cm = NULL,
  age_years = NULL,
  sex = NULL,
  activity_level = NULL,
  goal_type = COALESCE(up.goal_type, 'maintain')
FROM first_member fm
WHERE up.user_id = fm.user_id;

COMMIT;
