-- Social graph + activity events. Privacy on activity_events is enforced at
-- the API layer (joins to users_profile.is_public) — see SQL comment below.

CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower
  ON user_follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_following
  ON user_follows (following_id, created_at DESC);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows: select for authed" ON user_follows;
CREATE POLICY "follows: select for authed"
  ON user_follows FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "follows: insert own" ON user_follows;
CREATE POLICY "follows: insert own"
  ON user_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows: delete own" ON user_follows;
CREATE POLICY "follows: delete own"
  ON user_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('added_product', 'rated_product')),
  product_name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  rating product_rating,
  domain product_domain NOT NULL,
  product_id uuid REFERENCES user_products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_user_created
  ON activity_events (user_id, created_at DESC);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- NOTE: SELECT is broadly granted to authenticated users. Privacy
-- (users_profile.is_public) is enforced at the API layer via joins. This
-- keeps RLS simple while letting the feed/profile routes filter holistically.
COMMENT ON TABLE activity_events IS
  'Privacy enforced at the API layer (join users_profile.is_public). RLS only restricts writes to the owning user.';

DROP POLICY IF EXISTS "activity: select for authed" ON activity_events;
CREATE POLICY "activity: select for authed"
  ON activity_events FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "activity: insert own" ON activity_events;
CREATE POLICY "activity: insert own"
  ON activity_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "activity: delete own" ON activity_events;
CREATE POLICY "activity: delete own"
  ON activity_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
