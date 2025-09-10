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
  title: string;
  description: string;
  report_type: 'sales' | 'inventory' | 'customers' | 'suppliers' | 'returns' | 'installments' | 'financial';
  filters: Record<string, any>;
  date_range_start?: string | null;
  date_range_end?: string | null;
  created_by: string;
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

export interface InvoiceConfig {
  id: string;
  company_name: string;
  company_address: string;
  company_city: string;
  company_phone: string;
  company_email: string;
  company_website?: string;
  company_tax_id?: string;
  company_logo_url?: string;
  paper_size: 'A4' | 'Letter' | 'A5' | 'Thermal';
  currency: string;
  currency_symbol: string;
  tax_rate: number;
  include_tax: boolean;
  show_barcode: boolean;
  show_company_logo: boolean;
  footer_text: string;
  terms_and_conditions: string;
  invoice_prefix: string;
  barcode_position: 'top' | 'bottom';
  font_size: 'small' | 'medium' | 'large';
  language: 'es' | 'en';
  created_at: string;
  updated_at: string;
}

export interface InstallmentSale {
  id: string;
  customer_id: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installment_type: 'daily' | 'weekly' | 'monthly';
  installment_amount: number;
  installment_count: number;
  paid_installments: number;
  start_date: string;
  next_payment_date: string;
  status: 'active' | 'completed' | 'cancelled' | 'overdue';
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  installment_sale_items?: InstallmentSaleItem[];
  installment_payments?: InstallmentPayment[];
}

export interface InstallmentPayment {
  id: string;
  installment_sale_id: string;
  payment_number: number;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'card' | 'transfer' | 'nequi' | 'daviplata' | 'bancolombia';
  notes: string;
  created_by: string | null;
  created_at: string;
}

export interface InstallmentSaleItem {
  id: string;
  installment_sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  product?: Product;
}
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'employee';
  status: 'active' | 'inactive';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
