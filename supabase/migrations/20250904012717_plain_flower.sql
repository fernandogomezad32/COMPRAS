/*
  # Revisión y corrección completa de la estructura de base de datos

  1. Verificación de tablas existentes
    - `categories` - Categorías de productos
    - `customers` - Clientes del sistema
    - `products` - Productos del inventario
    - `suppliers` - Proveedores
    - `sales` - Ventas realizadas
    - `sale_items` - Items de cada venta
    - `reports` - Reportes guardados

  2. Corrección de relaciones
    - products -> categories (FK)
    - products -> suppliers (FK)
    - sales -> customers (FK)
    - sales -> users (FK de auth.users)
    - sale_items -> sales (FK)
    - sale_items -> products (FK)
    - reports -> users (FK de auth.users)

  3. Funciones y triggers necesarios
    - Función para actualizar updated_at
    - Función para manejar stock en ventas
    - Triggers para updated_at automático
    - Triggers para manejo de stock

  4. Políticas RLS
    - Verificar que todas las tablas tengan RLS habilitado
    - Políticas apropiadas para usuarios autenticados
*/

-- Crear función para actualizar updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear función para actualizar stock después de venta
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Reducir stock del producto
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear función para restaurar stock cuando se elimina una venta
CREATE OR REPLACE FUNCTION restore_stock_on_sale_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Restaurar stock del producto
    UPDATE products 
    SET stock_quantity = stock_quantity + OLD.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.product_id;
    
    RETURN OLD;
END;
$$ language 'plpgsql';

-- Crear función para actualizar updated_at en reports
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Verificar y crear tabla users si no existe (para las relaciones FK)
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS en users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política para users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Users can read own data'
    ) THEN
        CREATE POLICY "Users can read own data"
            ON users
            FOR ALL
            TO authenticated
            USING (auth.uid() = id);
    END IF;
END $$;

-- Verificar estructura de categories
DO $$
BEGIN
    -- Verificar columnas necesarias
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'id'
    ) THEN
        ALTER TABLE categories ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'name'
    ) THEN
        ALTER TABLE categories ADD COLUMN name text NOT NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'description'
    ) THEN
        ALTER TABLE categories ADD COLUMN description text DEFAULT '';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE categories ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Verificar estructura de suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'suppliers' AND column_name = 'payment_terms'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN payment_terms text DEFAULT 'net_30';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'suppliers' AND column_name = 'credit_limit'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN credit_limit numeric(12,2) DEFAULT 0;
    END IF;
END $$;

-- Verificar estructura de products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'supplier_id'
    ) THEN
        ALTER TABLE products ADD COLUMN supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'supplier_code'
    ) THEN
        ALTER TABLE products ADD COLUMN supplier_code text;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'status'
    ) THEN
        ALTER TABLE products ADD COLUMN status text DEFAULT 'active';
    END IF;
END $$;

-- Verificar estructura de sales
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales' AND column_name = 'discount_amount'
    ) THEN
        ALTER TABLE sales ADD COLUMN discount_amount numeric(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales' AND column_name = 'discount_percentage'
    ) THEN
        ALTER TABLE sales ADD COLUMN discount_percentage numeric(5,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales' AND column_name = 'discount_type'
    ) THEN
        ALTER TABLE sales ADD COLUMN discount_type text DEFAULT 'none';
    END IF;
    
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

-- Verificar que todas las foreign keys existan
DO $$
BEGIN
    -- FK products -> categories
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_category_id_fkey'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT products_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
    END IF;
    
    -- FK products -> suppliers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_supplier_id_fkey'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT products_supplier_id_fkey 
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
    END IF;
    
    -- FK sales -> customers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_customer_id_fkey'
    ) THEN
        ALTER TABLE sales 
        ADD CONSTRAINT sales_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;
    
    -- FK sales -> users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_user_id_fkey'
    ) THEN
        ALTER TABLE sales 
        ADD CONSTRAINT sales_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- FK sale_items -> sales
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sale_items_sale_id_fkey'
    ) THEN
        ALTER TABLE sale_items 
        ADD CONSTRAINT sale_items_sale_id_fkey 
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;
    END IF;
    
    -- FK sale_items -> products
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sale_items_product_id_fkey'
    ) THEN
        ALTER TABLE sale_items 
        ADD CONSTRAINT sale_items_product_id_fkey 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
    END IF;
    
    -- FK reports -> users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reports_created_by_fkey'
    ) THEN
        ALTER TABLE reports 
        ADD CONSTRAINT reports_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Verificar que todos los triggers existan
DO $$
BEGIN
    -- Trigger para updated_at en products
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_products_updated_at'
    ) THEN
        CREATE TRIGGER update_products_updated_at
            BEFORE UPDATE ON products
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Trigger para updated_at en customers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_customers_updated_at'
    ) THEN
        CREATE TRIGGER update_customers_updated_at
            BEFORE UPDATE ON customers
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Trigger para updated_at en suppliers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_suppliers_updated_at'
    ) THEN
        CREATE TRIGGER update_suppliers_updated_at
            BEFORE UPDATE ON suppliers
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Trigger para updated_at en reports
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_reports_updated_at'
    ) THEN
        CREATE TRIGGER update_reports_updated_at
            BEFORE UPDATE ON reports
            FOR EACH ROW
            EXECUTE FUNCTION update_reports_updated_at();
    END IF;
    
    -- Trigger para actualizar stock después de venta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_stock_after_sale'
    ) THEN
        CREATE TRIGGER update_stock_after_sale
            AFTER INSERT ON sale_items
            FOR EACH ROW
            EXECUTE FUNCTION update_product_stock();
    END IF;
    
    -- Trigger para restaurar stock al eliminar venta
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'restore_stock_on_sale_item_deletion'
    ) THEN
        CREATE TRIGGER restore_stock_on_sale_item_deletion
            AFTER DELETE ON sale_items
            FOR EACH ROW
            EXECUTE FUNCTION restore_stock_on_sale_deletion();
    END IF;
END $$;

-- Verificar constraints de check
DO $$
BEGIN
    -- Check constraint para status en products
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'products_status_check'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT products_status_check 
        CHECK (status IN ('active', 'inactive'));
    END IF;
    
    -- Check constraint para customer_type en customers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'customers_customer_type_check'
    ) THEN
        ALTER TABLE customers 
        ADD CONSTRAINT customers_customer_type_check 
        CHECK (customer_type IN ('individual', 'business'));
    END IF;
    
    -- Check constraint para status en suppliers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'suppliers_status_check'
    ) THEN
        ALTER TABLE suppliers 
        ADD CONSTRAINT suppliers_status_check 
        CHECK (status IN ('active', 'inactive'));
    END IF;
    
    -- Check constraint para payment_method en sales
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'sales_payment_method_check'
    ) THEN
        ALTER TABLE sales 
        ADD CONSTRAINT sales_payment_method_check 
        CHECK (payment_method IN ('cash', 'card', 'transfer', 'nequi', 'daviplata', 'bancolombia'));
    END IF;
    
    -- Check constraint para discount_type en sales
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'sales_discount_type_check'
    ) THEN
        ALTER TABLE sales 
        ADD CONSTRAINT sales_discount_type_check 
        CHECK (discount_type IN ('none', 'amount', 'percentage'));
    END IF;
    
    -- Check constraint para discount_percentage en sales
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'sales_discount_percentage_check'
    ) THEN
        ALTER TABLE sales 
        ADD CONSTRAINT sales_discount_percentage_check 
        CHECK (discount_percentage >= 0 AND discount_percentage <= 100);
    END IF;
    
    -- Check constraint para discount_amount en sales
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'sales_discount_amount_check'
    ) THEN
        ALTER TABLE sales 
        ADD CONSTRAINT sales_discount_amount_check 
        CHECK (discount_amount >= 0);
    END IF;
END $$;

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);

CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Verificar que todas las tablas tengan RLS habilitado
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Verificar políticas RLS para categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' AND policyname = 'Usuarios autenticados pueden leer categorías'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden leer categorías"
            ON categories FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' AND policyname = 'Usuarios autenticados pueden crear categorías'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden crear categorías"
            ON categories FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' AND policyname = 'Usuarios autenticados pueden actualizar categorías'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden actualizar categorías"
            ON categories FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' AND policyname = 'Usuarios autenticados pueden eliminar categorías'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden eliminar categorías"
            ON categories FOR DELETE
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Verificar políticas RLS para customers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' AND policyname = 'Usuarios autenticados pueden leer clientes'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden leer clientes"
            ON customers FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' AND policyname = 'Usuarios autenticados pueden crear clientes'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden crear clientes"
            ON customers FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' AND policyname = 'Usuarios autenticados pueden actualizar clientes'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden actualizar clientes"
            ON customers FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' AND policyname = 'Usuarios autenticados pueden eliminar clientes'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden eliminar clientes"
            ON customers FOR DELETE
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Verificar políticas RLS para products
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Usuarios autenticados pueden leer productos'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden leer productos"
            ON products FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Usuarios autenticados pueden crear productos'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden crear productos"
            ON products FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Usuarios autenticados pueden actualizar productos'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden actualizar productos"
            ON products FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'products' AND policyname = 'Usuarios autenticados pueden eliminar productos'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden eliminar productos"
            ON products FOR DELETE
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Verificar políticas RLS para suppliers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'suppliers' AND policyname = 'Usuarios autenticados pueden leer proveedores'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden leer proveedores"
            ON suppliers FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'suppliers' AND policyname = 'Usuarios autenticados pueden crear proveedores'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden crear proveedores"
            ON suppliers FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'suppliers' AND policyname = 'Usuarios autenticados pueden actualizar proveedores'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden actualizar proveedores"
            ON suppliers FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'suppliers' AND policyname = 'Usuarios autenticados pueden eliminar proveedores'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden eliminar proveedores"
            ON suppliers FOR DELETE
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Verificar políticas RLS para sales
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales' AND policyname = 'Usuarios pueden leer todas las ventas'
    ) THEN
        CREATE POLICY "Usuarios pueden leer todas las ventas"
            ON sales FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales' AND policyname = 'Usuarios pueden crear ventas'
    ) THEN
        CREATE POLICY "Usuarios pueden crear ventas"
            ON sales FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales' AND policyname = 'Usuarios autenticados pueden actualizar ventas'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden actualizar ventas"
            ON sales FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sales' AND policyname = 'Usuarios autenticados pueden eliminar ventas'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden eliminar ventas"
            ON sales FOR DELETE
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Verificar políticas RLS para sale_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sale_items' AND policyname = 'Usuarios pueden leer items de venta'
    ) THEN
        CREATE POLICY "Usuarios pueden leer items de venta"
            ON sale_items FOR SELECT
            TO authenticated
            USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sale_items' AND policyname = 'Usuarios pueden crear items de venta'
    ) THEN
        CREATE POLICY "Usuarios pueden crear items de venta"
            ON sale_items FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sale_items' AND policyname = 'Usuarios autenticados pueden actualizar items de venta'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden actualizar items de venta"
            ON sale_items FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sale_items' AND policyname = 'Usuarios autenticados pueden eliminar items de venta'
    ) THEN
        CREATE POLICY "Usuarios autenticados pueden eliminar items de venta"
            ON sale_items FOR DELETE
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Verificar políticas RLS para reports
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reports' AND policyname = 'Users can read own reports'
    ) THEN
        CREATE POLICY "Users can read own reports"
            ON reports FOR SELECT
            TO authenticated
            USING (auth.uid() = created_by);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reports' AND policyname = 'Users can create reports'
    ) THEN
        CREATE POLICY "Users can create reports"
            ON reports FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = created_by);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reports' AND policyname = 'Users can update own reports'
    ) THEN
        CREATE POLICY "Users can update own reports"
            ON reports FOR UPDATE
            TO authenticated
            USING (auth.uid() = created_by)
            WITH CHECK (auth.uid() = created_by);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reports' AND policyname = 'Users can delete own reports'
    ) THEN
        CREATE POLICY "Users can delete own reports"
            ON reports FOR DELETE
            TO authenticated
            USING (auth.uid() = created_by);
    END IF;
END $$;