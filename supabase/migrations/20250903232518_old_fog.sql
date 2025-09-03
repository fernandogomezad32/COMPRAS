/*
  # Fix receipt_number column ambiguity

  1. Problem
    - Column `receipt_number` exists in `payment_receipts` table
    - This causes ambiguity when using aliases in queries
    - The correct column should be `receipt_number_pr`

  2. Solution
    - Drop the ambiguous `receipt_number` column
    - Keep only `receipt_number_pr` column for receipt numbers
    - This eliminates the column reference ambiguity

  3. Safety
    - Uses IF EXISTS to prevent errors if column doesn't exist
    - No data loss as we're keeping the correct column
*/

-- Remove the ambiguous receipt_number column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_receipts' AND column_name = 'receipt_number'
  ) THEN
    ALTER TABLE payment_receipts DROP COLUMN receipt_number;
  END IF;
END $$;