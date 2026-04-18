-- Onboarding expansion: basic info (race), face photo for skin analysis,
-- plus placeholders for ad-hoc product text entered during onboarding.
-- Additive + idempotent.

ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS race text;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS face_photo_url text;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS face_photo_storage_path text;
-- Free-text lists captured during onboarding before the user has formal products.
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS initial_products_using text;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS initial_products_bad   text;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS initial_hair_products  text;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS initial_makeup_products text;

-- Private bucket for face photos (skin analysis).
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-photos', 'face-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Face photos: read own"   ON storage.objects;
CREATE POLICY "Face photos: read own"
  ON storage.objects FOR SELECT
  USING (bucket_id='face-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Face photos: write own"  ON storage.objects;
CREATE POLICY "Face photos: write own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='face-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Face photos: update own" ON storage.objects;
CREATE POLICY "Face photos: update own"
  ON storage.objects FOR UPDATE
  USING (bucket_id='face-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Face photos: delete own" ON storage.objects;
CREATE POLICY "Face photos: delete own"
  ON storage.objects FOR DELETE
  USING (bucket_id='face-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
