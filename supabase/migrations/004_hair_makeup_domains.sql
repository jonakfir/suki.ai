-- Expand Suki beyond skincare: add hair + makeup domains, preferences, shades.
-- All changes are additive and idempotent.

-- ───────────────────────── product domain ─────────────────────────
DO $$ BEGIN
  CREATE TYPE product_domain AS ENUM ('skincare', 'haircare', 'makeup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE user_products
  ADD COLUMN IF NOT EXISTS domain product_domain NOT NULL DEFAULT 'skincare';

CREATE INDEX IF NOT EXISTS idx_user_products_domain
  ON user_products(user_id, domain);

-- ───────────────────────── extend product_category ─────────────────────────
-- Haircare
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'shampoo';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'conditioner';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'hair_mask';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'hair_oil';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'hair_styling';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'scalp_treatment';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'heat_protectant';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'leave_in';
-- Makeup
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'foundation';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'concealer';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'powder';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'blush';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'bronzer';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'highlighter';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'lipstick';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'lip_gloss';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'lip_liner';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'eyeshadow';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'eyeliner';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'mascara';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'brow';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'primer';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'setting_spray';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'makeup_remover';

-- ───────────────────────── color / shade for makeup ─────────────────────────
ALTER TABLE user_products ADD COLUMN IF NOT EXISTS shade_name  text;
ALTER TABLE user_products ADD COLUMN IF NOT EXISTS shade_hex   text;
ALTER TABLE user_products ADD COLUMN IF NOT EXISTS shade_finish text;  -- matte, dewy, satin, glossy, shimmer

-- ───────────────────────── hair profile ─────────────────────────
DO $$ BEGIN
  CREATE TYPE hair_type AS ENUM ('straight', 'wavy', 'curly', 'coily');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hair_texture AS ENUM ('fine', 'medium', 'thick');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hair_porosity AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS hair_type      hair_type;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS hair_texture   hair_texture;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS hair_porosity  hair_porosity;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS hair_concerns  text[] DEFAULT '{}';
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS hair_goals     text[] DEFAULT '{}';
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS is_color_treated boolean DEFAULT false;

-- ───────────────────────── makeup profile ─────────────────────────
DO $$ BEGIN
  CREATE TYPE makeup_style AS ENUM ('natural', 'everyday', 'bold', 'glam', 'editorial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coverage_preference AS ENUM ('sheer', 'medium', 'full');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE finish_preference AS ENUM ('matte', 'natural', 'dewy', 'glossy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS makeup_style        makeup_style;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS coverage_preference coverage_preference;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS finish_preference   finish_preference;
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS undertone           text; -- warm, cool, neutral, olive

-- ───────────────────────── preference mode ─────────────────────────
DO $$ BEGIN
  CREATE TYPE preference_mode AS ENUM ('budget', 'simple', 'high_end', 'most_recommended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS preference_mode preference_mode NOT NULL DEFAULT 'most_recommended';

-- ───────────────────────── routine_steps: allow all domains ─────────────────
-- time_of_day already supports morning/evening/weekly. Add a domain scope.
ALTER TABLE user_routine_steps
  ADD COLUMN IF NOT EXISTS domain product_domain NOT NULL DEFAULT 'skincare';

CREATE INDEX IF NOT EXISTS idx_user_routine_steps_domain
  ON user_routine_steps(user_id, domain, time_of_day, position);
