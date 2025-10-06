/*
  # Fix next_payment_date constraint for completed installment sales

  1. Changes
    - Modify `next_payment_date` column to allow NULL values
    - This allows ventas por abonos to be completed without constraint errors
    - When a sale is completed, the next_payment_date can be set to NULL

  2. Rationale
    - When an installment sale is completed (status = 'completed'), there is no "next payment"
    - The NOT NULL constraint was causing errors on the final payment
    - Making it nullable is the most logical solution

  3. Migration Safety
    - Uses IF EXISTS to prevent errors if already modified
    - No data is lost in this operation
*/

-- Make next_payment_date nullable to allow completed sales
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'installment_sales' 
      AND column_name = 'next_payment_date'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE installment_sales 
    ALTER COLUMN next_payment_date DROP NOT NULL;
  END IF;
END $$;