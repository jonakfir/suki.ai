-- AI selfie → skin profile.
--
-- Stores the latest skin analysis as JSON on users_profile so a single
-- lookup hydrates the /skin-profile page. The shape is owned by
-- src/lib/skin-analysis-schema.ts (SkinAnalysisV1). The `generated_at`
-- column is the cache key: API treats a row older than 30 days as stale
-- and regenerates on next request.
--
-- We deliberately do NOT version-bump the JSON via a column — the
-- `schema_version` field inside the payload is the version, and the API
-- layer is responsible for migrating older shapes (none yet, but the
-- contract is in place from v1).

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS skin_analysis_json jsonb;

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS skin_analysis_generated_at timestamptz;

-- Partial index — most rows will have NULL for a long time, so a filtered
-- index keeps the lookup tight without paying for the empties.
CREATE INDEX IF NOT EXISTS idx_users_profile_skin_analysis_gen
  ON users_profile (user_id)
  WHERE skin_analysis_json IS NOT NULL;
