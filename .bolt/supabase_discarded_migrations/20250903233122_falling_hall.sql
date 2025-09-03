/*
  # Eliminar tabla payment_receipts

  1. Eliminación de tabla
    - Eliminar tabla `payment_receipts` y todas sus dependencias
    - Eliminar triggers y funciones relacionadas
    - Limpiar referencias en otras tablas

  2. Limpieza
    - Eliminar funciones de trigger relacionadas
    - Eliminar políticas RLS
    - Eliminar índices asociados

  3. Notas importantes
    - Esta operación eliminará todos los comprobantes de pago existentes
    - Las ventas seguirán funcionando normalmente sin comprobantes
*/

-- Eliminar trigger de creación de comprobantes en ventas
DROP TRIGGER IF EXISTS create_receipt_after_sale ON sales;

-- Eliminar funciones relacionadas con comprobantes
DROP FUNCTION IF EXISTS create_payment_receipt();
DROP FUNCTION IF EXISTS update_payment_receipts_updated_at();

-- Eliminar tabla payment_receipts
DROP TABLE IF EXISTS payment_receipts CASCADE;