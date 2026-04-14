-- Add image_url and barcode columns to user_products
ALTER TABLE user_products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE user_products ADD COLUMN IF NOT EXISTS barcode text;
