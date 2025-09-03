/*
  # Agregar métodos de pago específicos para transferencias

  1. Modificaciones
    - Actualizar constraint de payment_method para incluir nuevos métodos
    - Agregar opciones específicas: NEQUI, DAVIPLATA, BANCOLOMBIA

  2. Nuevos métodos de pago
    - nequi: Para pagos con NEQUI
    - daviplata: Para pagos con DAVIPLATA  
    - bancolombia: Para pagos con BANCOLOMBIA
    - Mantener métodos existentes: cash, card, transfer
*/

-- Eliminar constraint existente si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_payment_method_check' 
    AND table_name = 'sales'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT sales_payment_method_check;
  END IF;
END $$;

-- Agregar nuevo constraint con los métodos de pago actualizados
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check 
CHECK (payment_method = ANY (ARRAY[
  'cash'::text, 
  'card'::text, 
  'transfer'::text,
  'nequi'::text,
  'daviplata'::text,
  'bancolombia'::text
]));