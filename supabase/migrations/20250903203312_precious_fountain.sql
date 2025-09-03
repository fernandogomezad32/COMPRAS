/*
  # Add status field to products table

  1. Changes
    - Add `status` column to `products` table with default value 'active'
    - Add check constraint to ensure status is either 'active' or 'inactive'
    - Update existing products to have 'active' status

  2. Security
    - No changes to RLS policies needed as the field follows existing permissions
*/

-- Add status column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'status'
  ) THEN
    ALTER TABLE products ADD COLUMN status text DEFAULT 'active' NOT NULL;
  END IF;
END $$;

-- Add check constraint for status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'products_status_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_status_check 
    CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- Update existing products to have active status
UPDATE products SET status = 'active' WHERE status IS NULL;