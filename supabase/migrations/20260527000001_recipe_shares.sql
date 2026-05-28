-- Recipe sharing: stores share tokens with a snapshot of shared recipe data.
-- The token is the access credential; anyone with it can read the snapshot.

CREATE TABLE IF NOT EXISTS recipe_shares (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token         TEXT        NOT NULL UNIQUE,
  share_type    TEXT        NOT NULL CHECK (share_type IN ('recipe', 'favorites')),
  created_by    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label         TEXT,
  snapshot_json JSONB       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS recipe_shares_token_idx      ON recipe_shares(token);
CREATE INDEX IF NOT EXISTS recipe_shares_created_by_idx ON recipe_shares(created_by);

ALTER TABLE recipe_shares ENABLE ROW LEVEL SECURITY;

-- Public SELECT: the unguessable token is the access credential
DO $$ BEGIN
  CREATE POLICY "Public can read shares"
    ON recipe_shares FOR SELECT
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Authenticated users can create their own shares
DO $$ BEGIN
  CREATE POLICY "Authenticated users can create shares"
    ON recipe_shares FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Owners can delete their own shares
DO $$ BEGIN
  CREATE POLICY "Owners can delete their own shares"
    ON recipe_shares FOR DELETE
    TO authenticated
    USING (auth.uid() = created_by);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
