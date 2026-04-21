-- Beauty Wiki — LLM-maintained, per-user, interlinked markdown knowledge base.
-- See docs/beauty-wiki-plan.md for design. Additive + idempotent.

-- Pages live here. One row per logical path (unique per user).
CREATE TABLE IF NOT EXISTS user_wiki_pages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path        text        NOT NULL,
  title       text        NOT NULL,
  summary     text        NOT NULL DEFAULT '',
  content     text        NOT NULL DEFAULT '',
  version     integer     NOT NULL DEFAULT 1,
  source_refs jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, path)
);

CREATE INDEX IF NOT EXISTS idx_user_wiki_pages_user       ON user_wiki_pages (user_id);
CREATE INDEX IF NOT EXISTS idx_user_wiki_pages_user_path  ON user_wiki_pages (user_id, path);
CREATE INDEX IF NOT EXISTS idx_user_wiki_pages_fts
  ON user_wiki_pages
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(content,'')));

-- Append-only event log. Kept separate from the content pages so we can prune
-- heavy rewrites without losing the timeline.
CREATE TABLE IF NOT EXISTS user_wiki_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       text        NOT NULL,  -- ingest | query | lint | manual
  subject    text        NOT NULL DEFAULT '',
  summary    text        NOT NULL DEFAULT '',
  meta       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_wiki_log_user_time ON user_wiki_log (user_id, created_at DESC);

-- Background job queue — tiny, Postgres-native, no BullMQ. The Vercel cron
-- hits /api/wiki/worker to drain it.
CREATE TABLE IF NOT EXISTS user_wiki_jobs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         text        NOT NULL,  -- product.add | product.update | routine.update | profile.update | progress.photo | lint | seed
  ref_id       text,
  payload      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status       text        NOT NULL DEFAULT 'queued',  -- queued | running | done | failed
  attempts     integer     NOT NULL DEFAULT 0,
  last_error   text,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_wiki_jobs_status_time ON user_wiki_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_user_wiki_jobs_user_time   ON user_wiki_jobs (user_id, created_at DESC);

-- Row-level security — users can only see their own wiki. Service role (used
-- by background workers) bypasses RLS.
ALTER TABLE user_wiki_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wiki_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wiki_jobs  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wiki pages: owner read"   ON user_wiki_pages;
CREATE POLICY "wiki pages: owner read"   ON user_wiki_pages FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wiki pages: owner write"  ON user_wiki_pages;
CREATE POLICY "wiki pages: owner write"  ON user_wiki_pages FOR ALL    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wiki log: owner read"     ON user_wiki_log;
CREATE POLICY "wiki log: owner read"     ON user_wiki_log   FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wiki jobs: owner read"    ON user_wiki_jobs;
CREATE POLICY "wiki jobs: owner read"    ON user_wiki_jobs  FOR SELECT USING (auth.uid() = user_id);

-- auto-bump version + updated_at on upsert
CREATE OR REPLACE FUNCTION user_wiki_pages_touch() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_wiki_pages_touch ON user_wiki_pages;
CREATE TRIGGER trg_user_wiki_pages_touch
  BEFORE INSERT OR UPDATE ON user_wiki_pages
  FOR EACH ROW EXECUTE FUNCTION user_wiki_pages_touch();
