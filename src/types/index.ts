export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  tax_id?: string;
  customer_type: 'individual' | 'business';
  notes: string;
  created_at: string;
  updated_at: string;
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
  supplier_id: string | null;
  supplier_code: string | null;
  status: 'active' | 'inactive';
  category?: Category;
  supplier?: Supplier;
}

export interface Sale {
  id: string;
  total: number;
  subtotal: number;
  tax: number;
  discount_amount: number;
  discount_percentage: number;
  discount_type: 'none' | 'amount' | 'percentage';
  customer_name: string;
  customer_email: string;
  customer_id: string | null;
  payment_method: 'cash' | 'card' | 'transfer' | 'nequi' | 'daviplata' | 'bancolombia';
  status: string;
  user_id: string | null;
  created_at: string;
  amount_received: number;
  change_amount: number;
  invoice_number: string;
  invoice_barcode: string;
  invoice_generated_at: string;
  sale_items?: SaleItem[];
  customer?: Customer;
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
  returns?: Return[];
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

export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  tax_id?: string;
  payment_terms: string;
  credit_limit: number;
  status: 'active' | 'inactive';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  name: string;
  description: string;
  type: 'sales' | 'inventory' | 'customers' | 'suppliers' | 'custom';
  filters: Record<string, any>;
  date_range: {
    start_date?: string;
    end_date?: string;
    period?: 'today' | 'week' | 'month' | 'year' | 'custom';
  };
  created_by: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Return {
  id: string;
  sale_id: string;
  sale_item_id: string;
  product_id: string;
  customer_id: string | null;
  quantity_returned: number;
  reason: string;
  return_type: 'refund' | 'exchange' | 'warranty';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  refund_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  processed_by: string | null;
  notes: string;
  return_date: string;
  created_at: string;
  updated_at: string;
  sale?: Sale;
  sale_item?: SaleItem;
  product?: Product;
  customer?: Customer;
}