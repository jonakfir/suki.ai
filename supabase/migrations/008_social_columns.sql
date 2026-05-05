-- Social additions: handles + privacy on users_profile, featured flag on
-- recommendations. Additive + idempotent so existing rows keep working.

ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

-- Case-insensitive uniqueness, but only for rows that have claimed a handle.
CREATE UNIQUE INDEX IF NOT EXISTS users_profile_username_lower_unique
  ON users_profile (LOWER(username))
  WHERE username IS NOT NULL;

-- Format check is added NOT VALID so existing NULL/legacy rows don't fail.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_profile_username_format_chk'
  ) THEN
    ALTER TABLE users_profile
      ADD CONSTRAINT users_profile_username_format_chk
      CHECK (username ~ '^[a-z0-9_]{3,20}$') NOT VALID;
  END IF;
END $$;

-- "Featured" recommendations (hand-curated highlights). The base table is
-- `recommendations` (see 001_initial.sql) — verified before adding.
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT NULL;
