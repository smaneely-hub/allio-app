BEGIN;

CREATE OR REPLACE FUNCTION public.linked_household_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT household_id
  FROM household_members
  WHERE linked_user_id = auth.uid()
    AND linked_user_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.accessible_household_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM households
  WHERE user_id = auth.uid()
  UNION
  SELECT linked_household_ids();
$$;

ALTER TABLE public.shopping_lists
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

ALTER TABLE public.shopping_list_items
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS shopping_lists_household_id_idx ON public.shopping_lists(household_id);
CREATE INDEX IF NOT EXISTS shopping_list_items_household_id_idx ON public.shopping_list_items(household_id);

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users insert own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users update own shopping lists" ON public.shopping_lists;
DROP POLICY IF EXISTS "Users delete own shopping lists" ON public.shopping_lists;

CREATE POLICY "shopping_lists_select" ON public.shopping_lists
  FOR SELECT USING (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
  );

CREATE POLICY "shopping_lists_insert" ON public.shopping_lists
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      household_id IS NULL
      OR household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
    )
  );

CREATE POLICY "shopping_lists_update" ON public.shopping_lists
  FOR UPDATE USING (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
  );

CREATE POLICY "shopping_lists_delete" ON public.shopping_lists
  FOR DELETE USING (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
  );

DROP POLICY IF EXISTS "Users select own shopping list items" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Users insert own shopping list items" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Users update own shopping list items" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Users delete own shopping list items" ON public.shopping_list_items;

CREATE POLICY "shopping_list_items_select" ON public.shopping_list_items
  FOR SELECT USING (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
    OR list_id IN (
      SELECT sl.id
      FROM public.shopping_lists sl
      WHERE sl.household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
    )
  );

CREATE POLICY "shopping_list_items_insert" ON public.shopping_list_items
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
    OR list_id IN (
      SELECT sl.id
      FROM public.shopping_lists sl
      WHERE sl.household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
    )
  );

CREATE POLICY "shopping_list_items_update" ON public.shopping_list_items
  FOR UPDATE USING (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
    OR list_id IN (
      SELECT sl.id
      FROM public.shopping_lists sl
      WHERE sl.household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
    OR list_id IN (
      SELECT sl.id
      FROM public.shopping_lists sl
      WHERE sl.household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
    )
  );

CREATE POLICY "shopping_list_items_delete" ON public.shopping_list_items
  FOR DELETE USING (
    auth.uid() = user_id
    OR household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
    OR list_id IN (
      SELECT sl.id
      FROM public.shopping_lists sl
      WHERE sl.household_id = ANY(ARRAY(SELECT public.accessible_household_ids()))
    )
  );

CREATE TABLE IF NOT EXISTS public.public_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.public_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('recipe', 'favorites', 'plan_snapshot')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted')),
  title TEXT,
  caption TEXT,
  snapshot_json JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_posts_user_id_idx ON public.public_posts(user_id);
CREATE INDEX IF NOT EXISTS public_posts_published_at_idx ON public.public_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS public_posts_post_type_idx ON public.public_posts(post_type);

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "public_profiles_select_public"
    ON public.public_profiles FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_profiles_upsert_own"
    ON public.public_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_profiles_update_own"
    ON public.public_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_posts_select_visible"
    ON public.public_posts FOR SELECT
    USING (visibility = 'public' OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_posts_insert_own"
    ON public.public_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_posts_update_own"
    ON public.public_posts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_posts_delete_own"
    ON public.public_posts FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
