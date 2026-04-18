-- Progress timeline: weekly photos + notes per domain.
-- All changes are additive and idempotent.

CREATE TABLE IF NOT EXISTS user_progress_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain      product_domain NOT NULL DEFAULT 'skincare',
  image_url   text NOT NULL,
  storage_path text,                    -- supabase storage object path (for deletes)
  notes       text DEFAULT '',
  mood_score  smallint,                 -- 1..5 self-reported
  taken_at    timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_progress_photos_time
  ON user_progress_photos(user_id, domain, taken_at DESC);

ALTER TABLE user_progress_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress photos"   ON user_progress_photos;
CREATE POLICY "Users can view own progress photos"
  ON user_progress_photos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress photos" ON user_progress_photos;
CREATE POLICY "Users can insert own progress photos"
  ON user_progress_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress photos" ON user_progress_photos;
CREATE POLICY "Users can update own progress photos"
  ON user_progress_photos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own progress photos" ON user_progress_photos;
CREATE POLICY "Users can delete own progress photos"
  ON user_progress_photos FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for progress photos.
-- Ignore errors if it already exists.
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Object-level policies: users can only touch their own folder.
-- Paths look like <user_id>/<uuid>.jpg — first path segment equals auth.uid().
DROP POLICY IF EXISTS "Progress photos: read own"   ON storage.objects;
CREATE POLICY "Progress photos: read own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Progress photos: write own"  ON storage.objects;
CREATE POLICY "Progress photos: write own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Progress photos: delete own" ON storage.objects;
CREATE POLICY "Progress photos: delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'progress-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
