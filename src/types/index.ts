export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  category_id: string | null;
  stock_quantity: number;
  min_stock: number;
  barcode: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Sale {
  id: string;
  total: number;
  subtotal: number;
  tax: number;
  customer_name: string;
  customer_email: string;
  payment_method: string;
  status: string;
  user_id: string | null;
  created_at: string;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  product?: Product;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockItems: number;
}