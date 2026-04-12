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
CREATE POLICY "meal_signals_select" ON public.meal_signals
  ON public.meal_signals
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "meal_signals_insert" ON public.meal_signals;
CREATE POLICY "meal_signals_insert"
  ON public.meal_signals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
