/*
  # Agregar funcionalidad de descuentos a ventas

  1. Modificaciones a tabla existente
    - Agregar columna `discount_amount` a la tabla `sales`
    - Agregar columna `discount_percentage` a la tabla `sales`
    - Agregar columna `discount_type` a la tabla `sales`

  2. Funcionalidad
    - Soporte para descuentos en monto fijo o porcentaje
    - Cálculo automático del total con descuento aplicado
    - Mantener compatibilidad con ventas existentes
*/

-- Agregar columnas de descuento a la tabla sales
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE sales ADD COLUMN discount_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE sales ADD COLUMN discount_percentage numeric(5,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'discount_type'
  ) THEN
    ALTER TABLE sales ADD COLUMN discount_type text DEFAULT 'none';
  END IF;
END $$;

-- Agregar constraint para discount_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sales_discount_type_check'
  ) THEN
    ALTER TABLE sales ADD CONSTRAINT sales_discount_type_check 
    CHECK (discount_type IN ('none', 'amount', 'percentage'));
  END IF;
END $$;

-- Agregar constraint para discount_percentage (0-100)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sales_discount_percentage_check'
  ) THEN
    ALTER TABLE sales ADD CONSTRAINT sales_discount_percentage_check 
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
  END IF;
END $$;

-- Agregar constraint para discount_amount (no negativo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sales_discount_amount_check'
  ) THEN
    ALTER TABLE sales ADD CONSTRAINT sales_discount_amount_check 
    CHECK (discount_amount >= 0);
  END IF;
END $$;