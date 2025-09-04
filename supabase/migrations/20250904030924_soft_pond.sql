/*
  # Fix ambiguous column reference in installment payment trigger

  1. Problem
    - The trigger function `update_installment_sale_amounts` has an ambiguous reference to `next_payment_date`
    - This causes errors when inserting payments into `installment_payments` table

  2. Solution
    - Update the trigger function to explicitly qualify the column reference
    - Use `installment_sales.next_payment_date` instead of just `next_payment_date`

  3. Changes
    - Recreate the trigger function with proper column qualification
*/

-- Drop and recreate the function with proper column qualification
DROP FUNCTION IF EXISTS update_installment_sale_amounts();

CREATE OR REPLACE FUNCTION update_installment_sale_amounts()
RETURNS TRIGGER AS $$
DECLARE
  installment_sale_record RECORD;
  total_paid NUMERIC;
  remaining NUMERIC;
  next_date DATE;
BEGIN
  -- Get the installment sale record
  SELECT * INTO installment_sale_record
  FROM installment_sales
  WHERE id = NEW.installment_sale_id;

  -- Calculate total paid amount
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM installment_payments
  WHERE installment_sale_id = NEW.installment_sale_id;

  -- Calculate remaining amount
  remaining := installment_sale_record.total_amount - total_paid;

  -- Calculate next payment date
  next_date := installment_sale_record.next_payment_date;
  
  IF remaining > 0 THEN
    CASE installment_sale_record.installment_type
      WHEN 'daily' THEN
        next_date := installment_sale_record.next_payment_date + INTERVAL '1 day';
      WHEN 'weekly' THEN
        next_date := installment_sale_record.next_payment_date + INTERVAL '1 week';
      WHEN 'monthly' THEN
        next_date := installment_sale_record.next_payment_date + INTERVAL '1 month';
    END CASE;
  END IF;

  -- Update installment sale amounts and status
  UPDATE installment_sales
  SET 
    paid_amount = total_paid,
    remaining_amount = remaining,
    paid_installments = (
      SELECT COUNT(*)
      FROM installment_payments
      WHERE installment_sale_id = NEW.installment_sale_id
    ),
    next_payment_date = CASE 
      WHEN remaining <= 0 THEN NULL
      ELSE next_date
    END,
    status = CASE
      WHEN remaining <= 0 THEN 'completed'
      WHEN installment_sales.next_payment_date < CURRENT_DATE AND remaining > 0 THEN 'overdue'
      ELSE 'active'
    END,
    updated_at = now()
  WHERE id = NEW.installment_sale_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;