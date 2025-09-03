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
  sale_items?: SaleItem[];
  customer?: Customer;
  payment_receipt?: PaymentReceipt[];
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

export interface PaymentReceipt {
  id: string;
  sale_id: string;
  receipt_number_pr: string;
  barcode: string;
  receipt_type: 'sale' | 'refund' | 'exchange' | 'credit_note';
  status: 'active' | 'cancelled' | 'voided';
  issued_at: string;
  voided_at?: string;
  void_reason?: string;
  created_at: string;
  updated_at: string;
  sale?: Sale;
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