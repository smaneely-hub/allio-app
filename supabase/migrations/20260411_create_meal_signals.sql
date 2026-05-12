-- Additive restore: meal_signals was originally created under migration
-- 202604110001_create_meal_signals.sql. This file uses IF NOT EXISTS guards
-- so it is safe to apply to any environment regardless of order.

CREATE TABLE IF NOT EXISTS public.meal_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meal_name text NOT NULL,
  signal_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meal_signals_pkey PRIMARY KEY (id)
);

ALTER TABLE public.meal_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meal_signals_select" ON public.meal_signals;
CREATE POLICY "meal_signals_select"
  ON public.meal_signals
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "meal_signals_insert" ON public.meal_signals;
CREATE POLICY "meal_signals_insert"
  ON public.meal_signals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
