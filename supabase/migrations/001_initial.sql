-- Enums
CREATE TYPE skin_type AS ENUM ('oily', 'dry', 'combination', 'normal', 'sensitive');
CREATE TYPE skin_tone AS ENUM ('fair', 'light', 'medium', 'tan', 'deep');
CREATE TYPE age_range AS ENUM ('teens', '20s', '30s', '40s', '50+');
CREATE TYPE budget AS ENUM ('drugstore', 'mid-range', 'luxury', 'mixed');
CREATE TYPE routine_complexity AS ENUM ('minimal', 'moderate', 'full');
CREATE TYPE product_category AS ENUM ('cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'exfoliant', 'mask', 'eye_cream', 'oil', 'treatment', 'other');
CREATE TYPE product_rating AS ENUM ('love', 'neutral', 'bad_reaction');
CREATE TYPE recommendation_type AS ENUM ('add', 'avoid');

-- Users profile
CREATE TABLE users_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  skin_type skin_type,
  skin_concerns text[] DEFAULT '{}',
  skin_tone skin_tone,
  age_range age_range,
  known_allergies text[] DEFAULT '{}',
  budget budget,
  routine_complexity routine_complexity
);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON users_profile FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON users_profile FOR UPDATE
  USING (auth.uid() = user_id);

-- User products
CREATE TABLE user_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  product_name text NOT NULL,
  brand text NOT NULL,
  category product_category NOT NULL DEFAULT 'other',
  rating product_rating NOT NULL DEFAULT 'neutral',
  notes text DEFAULT '',
  is_current boolean DEFAULT false,
  ingredients text[] DEFAULT '{}'
);

ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products"
  ON user_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON user_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON user_products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON user_products FOR DELETE
  USING (auth.uid() = user_id);

-- Recommendations
CREATE TABLE recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  type recommendation_type NOT NULL,
  product_suggestion jsonb NOT NULL,
  generated_at timestamptz DEFAULT now(),
  is_dismissed boolean DEFAULT false
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations"
  ON recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendations"
  ON recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
  ON recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recommendations"
  ON recommendations FOR DELETE
  USING (auth.uid() = user_id);
