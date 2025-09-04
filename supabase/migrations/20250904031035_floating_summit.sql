/*
  # Fix ambiguous column reference in installment payment trigger

  1. Problem
    - The trigger function `update_installment_sale_amounts` has an ambiguous reference to `next_payment_date`
    - This causes errors when inserting payments into `installment_payments` table

  2. Solution
    - Replace the existing trigger function with a corrected version
    - Properly qualify all column references with table aliases
    - Remove any potential variable name conflicts
*/

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_installment_amounts_on_payment ON installment_payments;
DROP FUNCTION IF EXISTS update_installment_sale_amounts();

-- Create the corrected function
CREATE OR REPLACE FUNCTION update_installment_sale_amounts()
RETURNS TRIGGER AS $$
DECLARE
  sale_record installment_sales%ROWTYPE;
  new_paid_amount NUMERIC(12,2);
  new_remaining_amount NUMERIC(12,2);
  new_paid_installments INTEGER;
  new_status TEXT;
  next_due_date DATE;
BEGIN
  -- Get the current installment sale record
  SELECT * INTO sale_record
  FROM installment_sales 
  WHERE id = NEW.installment_sale_id;
  
  -- Calculate new totals
  SELECT COALESCE(SUM(amount), 0) INTO new_paid_amount
  FROM installment_payments 
  WHERE installment_sale_id = NEW.installment_sale_id;
  
  new_remaining_amount := sale_record.total_amount - new_paid_amount;
  new_paid_installments := FLOOR(new_paid_amount / sale_record.installment_amount);
  
  -- Determine new status
  IF new_remaining_amount <= 0 THEN
    new_status := 'completed';
    next_due_date := NULL;
  ELSE
    -- Calculate next payment date
    next_due_date := sale_record.start_date;
    
    CASE sale_record.installment_type
      WHEN 'daily' THEN
        next_due_date := next_due_date + INTERVAL '1 day' * (new_paid_installments + 1);
      WHEN 'weekly' THEN
        next_due_date := next_due_date + INTERVAL '1 week' * (new_paid_installments + 1);
      WHEN 'monthly' THEN
        next_due_date := next_due_date + INTERVAL '1 month' * (new_paid_installments + 1);
    END CASE;
    
    -- Check if overdue
    IF next_due_date < CURRENT_DATE THEN
      new_status := 'overdue';
    ELSE
      new_status := 'active';
    END IF;
  END IF;
  
  -- Update the installment sale
  UPDATE installment_sales 
  SET 
    paid_amount = new_paid_amount,
    remaining_amount = new_remaining_amount,
    paid_installments = new_paid_installments,
    next_payment_date = next_due_date,
    status = new_status,
    updated_at = now()
  WHERE id = NEW.installment_sale_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_installment_amounts_on_payment
  AFTER INSERT ON installment_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_installment_sale_amounts();