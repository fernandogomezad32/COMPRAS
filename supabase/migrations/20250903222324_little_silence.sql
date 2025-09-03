/*
  # Eliminar tabla purchase_order_items no utilizada

  1. Eliminaciones
    - Eliminar tabla `purchase_order_items` y sus dependencias
    - Eliminar tabla `purchase_orders` (tabla padre)
    - Eliminar función `update_stock_on_receipt`
    - Eliminar función `generate_order_number`
    
  2. Razón
    - Estas tablas no están siendo utilizadas en la aplicación
    - No hay componentes ni servicios que las usen
    - Simplifica el esquema de la base de datos
*/

-- Eliminar triggers primero
DROP TRIGGER IF EXISTS update_stock_on_receipt_trigger ON purchase_order_items;
DROP TRIGGER IF EXISTS generate_order_number_trigger ON purchase_orders;
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;

-- Eliminar tabla purchase_order_items (tabla hija)
DROP TABLE IF EXISTS purchase_order_items CASCADE;

-- Eliminar tabla purchase_orders (tabla padre)
DROP TABLE IF EXISTS purchase_orders CASCADE;

-- Eliminar funciones relacionadas
DROP FUNCTION IF EXISTS update_stock_on_receipt();
DROP FUNCTION IF EXISTS generate_order_number();