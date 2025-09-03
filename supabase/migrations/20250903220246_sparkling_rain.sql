/*
  # Agregar campos de pago y cambio a ventas

  1. Nuevos Campos
    - `amount_received` (numeric) - Monto recibido del cliente
    - `change_amount` (numeric) - Cambio a devolver al cliente
  
  2. Valores por defecto
    - amount_received: 0
    - change_amount: 0
*/

-- Agregar campos de pago a la tabla sales
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'amount_received'
  ) THEN
    ALTER TABLE sales ADD COLUMN amount_received numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'change_amount'
  ) THEN
    ALTER TABLE sales ADD COLUMN change_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;