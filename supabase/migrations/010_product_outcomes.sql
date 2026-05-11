-- Cohort-based social proof on identified products.
--
-- The scan flow shows users how people who share their skin profile reacted
-- to each identified product. The signal here is `product_outcomes` — a
-- user-attributed, per-product reaction — and the read-path is a SECURITY
-- DEFINER function that rolls up cohort statistics without exposing raw rows.
--
-- Privacy model mirrors `activity_events` (migration 009):
--   * RLS lets every authenticated user SELECT the table; writes are gated
--     to the row owner.
--   * The function joins `users_profile.is_public` AND
--     `users_profile.share_outcomes_in_cohorts` so opted-out users vanish
--     from rollups.
--   * Callers (Next.js routes) are still expected to apply the same join
--     when reading the table directly — see comment on the table.

-- ── share_outcomes_in_cohorts opt-out flag ──────────────────────────────────
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS share_outcomes_in_cohorts boolean NOT NULL DEFAULT true;

-- ── product_outcomes table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  brand text NOT NULL,
  domain product_domain NOT NULL DEFAULT 'skincare',
  -- Stored, deterministic dedup key. Matches `productKey()` in src/lib/cohort.ts.
  product_key text GENERATED ALWAYS AS (
    lower(product_name) || '|' || lower(brand) || '|' || domain::text
  ) STORED,
  outcome text NOT NULL CHECK (outcome IN (
    'helped',
    'no_change',
    'caused_breakouts',
    'caused_irritation',
    'caused_dryness',
    'caused_oiliness',
    'other_negative'
  )),
  severity smallint CHECK (severity IS NULL OR (severity BETWEEN 1 AND 5)),
  after_weeks smallint CHECK (after_weeks IS NULL OR (after_weeks BETWEEN 0 AND 104)),
  notes text NOT NULL DEFAULT '',
  is_anonymous boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_key)
);

COMMENT ON TABLE product_outcomes IS
  'Cross-user reads allowed; privacy enforced at API layer via users_profile.is_public + share_outcomes_in_cohorts join. See get_product_cohort_stats() for the recommended read path.';

CREATE INDEX IF NOT EXISTS idx_product_outcomes_key
  ON product_outcomes (product_key);

CREATE INDEX IF NOT EXISTS idx_product_outcomes_user
  ON product_outcomes (user_id, created_at DESC);

-- Cohort-filter covering index on users_profile. The cohort lookup reads
-- skin_type / age_range / is_public together; INCLUDE keeps them on the
-- index leaf so the planner can avoid the heap for most rows.
CREATE INDEX IF NOT EXISTS idx_users_profile_cohort
  ON users_profile (user_id)
  INCLUDE (skin_type, age_range, is_public);

-- GIN on the concerns array so `&&` (overlap) lookups don't seq-scan.
CREATE INDEX IF NOT EXISTS idx_users_profile_concerns_gin
  ON users_profile USING GIN (skin_concerns);

-- ── updated_at trigger ──────────────────────────────────────────────────────
-- Reuse the shared set_updated_at() function from migration 002.
DROP TRIGGER IF EXISTS trg_product_outcomes_updated_at ON product_outcomes;
CREATE TRIGGER trg_product_outcomes_updated_at
  BEFORE UPDATE ON product_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE product_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outcomes: select for authed" ON product_outcomes;
CREATE POLICY "outcomes: select for authed"
  ON product_outcomes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "outcomes: insert own" ON product_outcomes;
CREATE POLICY "outcomes: insert own"
  ON product_outcomes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "outcomes: update own" ON product_outcomes;
CREATE POLICY "outcomes: update own"
  ON product_outcomes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "outcomes: delete own" ON product_outcomes;
CREATE POLICY "outcomes: delete own"
  ON product_outcomes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── Backfill from user_products ratings ─────────────────────────────────────
-- We treat existing 'love' ratings as 'helped' and 'bad_reaction' as
-- 'caused_irritation' (the closest canonical bucket). Neutrals are skipped
-- so the cohort signal stays conservative.
INSERT INTO product_outcomes (user_id, product_name, brand, domain, outcome)
SELECT
  user_id,
  product_name,
  brand,
  domain,
  CASE rating
    WHEN 'love' THEN 'helped'
    WHEN 'bad_reaction' THEN 'caused_irritation'
  END AS outcome
FROM user_products
WHERE rating IN ('love', 'bad_reaction')
ON CONFLICT (user_id, product_key) DO NOTHING;

-- ── adjacent_age_ranges() ───────────────────────────────────────────────────
-- Mirrors src/lib/cohort.ts::adjacentAgeRanges. Returns the input bucket plus
-- its immediate neighbours so the cohort isn't artificially narrow for users
-- straddling a decade boundary.
CREATE OR REPLACE FUNCTION adjacent_age_ranges(p_age age_range)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_age
    WHEN 'teens' THEN ARRAY['teens', '20s']
    WHEN '20s'   THEN ARRAY['teens', '20s', '30s']
    WHEN '30s'   THEN ARRAY['20s', '30s', '40s']
    WHEN '40s'   THEN ARRAY['30s', '40s', '50+']
    WHEN '50+'   THEN ARRAY['40s', '50+']
    ELSE ARRAY['teens', '20s', '30s', '40s', '50+']
  END;
$$;

GRANT EXECUTE ON FUNCTION adjacent_age_ranges(age_range) TO authenticated;

-- ── get_product_cohort_stats() ──────────────────────────────────────────────
-- Per-key cohort rollup. Returns one row per product_key in p_keys.
--
-- Strategy:
--   1. Resolve the caller's cohort filter (skin_type exact + concerns overlap
--      + adjacent age range).
--   2. For each key, count outcomes from cohort users with both
--      is_public = true AND share_outcomes_in_cohorts = true.
--   3. If the strict cohort has < 5 samples, fall back to ALL public/sharing
--      users (is_fallback = true).
--   4. If even the global pool has < 20 samples for that key, return a NULL
--      sample row so the API layer can rewrite to `cohort: null`.
--
-- positive_pct = (helped) / sample_size  rounded to the nearest integer.
-- top_outcome  = mode() of outcome column over the sampled rows.
CREATE OR REPLACE FUNCTION get_product_cohort_stats(
  p_user_id uuid,
  p_keys text[]
)
RETURNS TABLE (
  product_key text,
  sample_size int,
  positive_pct int,
  top_outcome text,
  top_outcome_pct int,
  is_fallback boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_skin_type skin_type;
  v_concerns text[];
  v_age age_range;
  v_age_buckets text[];
BEGIN
  SELECT up.skin_type, up.skin_concerns, up.age_range
    INTO v_skin_type, v_concerns, v_age
  FROM users_profile up
  WHERE up.user_id = p_user_id;

  v_age_buckets := adjacent_age_ranges(v_age);

  RETURN QUERY
  WITH
  -- Users who share their outcomes (public + opted-in).
  sharing_users AS (
    SELECT up.user_id
    FROM users_profile up
    WHERE up.is_public = true
      AND COALESCE(up.share_outcomes_in_cohorts, true) = true
  ),
  -- Strict cohort: same skin_type, overlapping concerns, adjacent age bucket.
  cohort_users AS (
    SELECT up.user_id
    FROM users_profile up
    JOIN sharing_users su ON su.user_id = up.user_id
    WHERE
      (v_skin_type IS NULL OR up.skin_type = v_skin_type)
      AND (
        v_concerns IS NULL
        OR array_length(v_concerns, 1) IS NULL
        OR up.skin_concerns && v_concerns
      )
      AND (
        v_age IS NULL
        OR up.age_range::text = ANY(v_age_buckets)
      )
  ),
  -- One row per (key, scope) combo: strict + global.
  per_key AS (
    SELECT
      k.key AS product_key,
      po.outcome,
      'strict'::text AS scope
    FROM unnest(p_keys) AS k(key)
    LEFT JOIN product_outcomes po ON po.product_key = k.key
    JOIN cohort_users cu ON cu.user_id = po.user_id
    UNION ALL
    SELECT
      k.key AS product_key,
      po.outcome,
      'global'::text AS scope
    FROM unnest(p_keys) AS k(key)
    LEFT JOIN product_outcomes po ON po.product_key = k.key
    JOIN sharing_users su ON su.user_id = po.user_id
  ),
  rolled AS (
    SELECT
      pk.product_key,
      pk.scope,
      count(*)::int AS sample_size,
      sum(CASE WHEN pk.outcome = 'helped' THEN 1 ELSE 0 END)::int AS helped_count,
      mode() WITHIN GROUP (ORDER BY pk.outcome) AS top_outcome,
      -- count of top_outcome occurrences:
      max(cnt.c)::int AS top_outcome_count
    FROM per_key pk
    LEFT JOIN LATERAL (
      SELECT count(*) AS c
      FROM per_key inner_pk
      WHERE inner_pk.product_key = pk.product_key
        AND inner_pk.scope = pk.scope
        AND inner_pk.outcome = (
          SELECT mode() WITHIN GROUP (ORDER BY outcome)
          FROM per_key mode_pk
          WHERE mode_pk.product_key = pk.product_key
            AND mode_pk.scope = pk.scope
        )
    ) cnt ON true
    WHERE pk.outcome IS NOT NULL
    GROUP BY pk.product_key, pk.scope
  ),
  chosen AS (
    SELECT DISTINCT ON (k.key)
      k.key AS product_key,
      r.sample_size,
      r.helped_count,
      r.top_outcome,
      r.top_outcome_count,
      r.scope
    FROM unnest(p_keys) AS k(key)
    LEFT JOIN rolled r ON r.product_key = k.key
    ORDER BY
      k.key,
      -- Prefer strict when sample_size >= 5, else fall back to global.
      CASE
        WHEN r.scope = 'strict' AND r.sample_size >= 5 THEN 0
        WHEN r.scope = 'global' THEN 1
        ELSE 2
      END
  )
  SELECT
    c.product_key,
    COALESCE(c.sample_size, 0)::int AS sample_size,
    CASE
      WHEN c.sample_size IS NULL OR c.sample_size = 0 THEN 0
      ELSE ROUND(100.0 * c.helped_count / c.sample_size)::int
    END AS positive_pct,
    c.top_outcome,
    CASE
      WHEN c.sample_size IS NULL OR c.sample_size = 0 THEN 0
      ELSE ROUND(100.0 * c.top_outcome_count / c.sample_size)::int
    END AS top_outcome_pct,
    (c.scope = 'global')::boolean AS is_fallback
  FROM chosen c
  -- Suppress rows where even the global fallback has fewer than 20 samples;
  -- the API layer treats absence as cohort: null.
  WHERE c.sample_size IS NOT NULL AND c.sample_size >= 20
    OR (c.scope = 'strict' AND c.sample_size >= 5);
END;
$$;

GRANT EXECUTE ON FUNCTION get_product_cohort_stats(uuid, text[]) TO authenticated;

-- TODO(agentB): the rolled CTE recomputes mode() three times per row via the
-- LATERAL — fine for the scan request fan-out (≤10 keys) but worth refactoring
-- to a single windowed pass when we wire this into trending/feed.
