-- Saved products flag on user_products
ALTER TABLE user_products
  ADD COLUMN IF NOT EXISTS is_saved boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_products_saved
  ON user_products(user_id, is_saved)
  WHERE is_saved = true;

-- Shared trigger function for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Routine steps
CREATE TABLE IF NOT EXISTS user_routine_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  time_of_day text NOT NULL CHECK (time_of_day IN ('morning', 'evening', 'weekly')),
  position int NOT NULL DEFAULT 0,
  product_id uuid REFERENCES user_products(id) ON DELETE SET NULL,
  step_name text,
  instruction text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_routine_steps_order
  ON user_routine_steps(user_id, time_of_day, position);

DROP TRIGGER IF EXISTS trg_user_routine_steps_updated_at ON user_routine_steps;
CREATE TRIGGER trg_user_routine_steps_updated_at
  BEFORE UPDATE ON user_routine_steps
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_routine_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own routine steps" ON user_routine_steps;
CREATE POLICY "Users can view own routine steps"
  ON user_routine_steps FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own routine steps" ON user_routine_steps;
CREATE POLICY "Users can insert own routine steps"
  ON user_routine_steps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own routine steps" ON user_routine_steps;
CREATE POLICY "Users can update own routine steps"
  ON user_routine_steps FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own routine steps" ON user_routine_steps;
CREATE POLICY "Users can delete own routine steps"
  ON user_routine_steps FOR DELETE
  USING (auth.uid() = user_id);
