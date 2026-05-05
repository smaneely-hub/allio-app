CREATE TABLE IF NOT EXISTS public_try_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  feedback text NOT NULL CHECK (feedback IN ('up', 'down')),
  feedback_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_try_feedback_session ON public_try_feedback(session_id);

CREATE INDEX IF NOT EXISTS idx_public_try_feedback_recipe ON public_try_feedback(recipe_id);

ALTER TABLE public_try_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can insert try feedback"
ON public_try_feedback FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "service role can read try feedback"
ON public_try_feedback FOR SELECT
TO service_role
USING (true);
