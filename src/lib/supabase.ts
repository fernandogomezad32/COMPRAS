import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          tax_id: string | null;
          customer_type: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          tax_id?: string | null;
          customer_type?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          tax_id?: string | null;
          customer_type?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          created_at?: string;
        };
      };
      products: {
        Row: {
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
          status: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          price: number;
          cost?: number;
          category_id?: string | null;
          supplier_id?: string | null;
          supplier_code?: string | null;
          stock_quantity?: number;
          min_stock?: number;
          barcode?: string | null;
          created_at?: string;
          updated_at?: string;
          status?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          cost?: number;
          category_id?: string | null;
          supplier_id?: string | null;
          supplier_code?: string | null;
          stock_quantity?: number;
          min_stock?: number;
          barcode?: string | null;
          created_at?: string;
          updated_at?: string;
          status?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          total: number;
          subtotal: number;
          tax: number;
          discount_amount: number;
          discount_percentage: number;
          discount_type: string;
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
        };
        Insert: {
          id?: string;
          total: number;
          subtotal: number;
          tax?: number;
          discount_amount?: number;
          discount_percentage?: number;
          discount_type?: string;
          customer_name?: string;
          customer_email?: string;
          customer_id?: string | null;
          payment_method?: string;
          status?: string;
          user_id?: string | null;
          created_at?: string;
          amount_received?: number;
          change_amount?: number;
          invoice_number?: string;
          invoice_barcode?: string;
          invoice_generated_at?: string;
        };
        Update: {
          id?: string;
          total?: number;
          subtotal?: number;
          tax?: number;
          discount_amount?: number;
          discount_percentage?: number;
          discount_type?: string;
          customer_name?: string;
          customer_email?: string;
          customer_id?: string | null;
          payment_method?: string;
          status?: string;
          user_id?: string | null;
          created_at?: string;
          amount_received?: number;
          change_amount?: number;
          invoice_number?: string;
          invoice_barcode?: string;
          invoice_generated_at?: string;
        };
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_person: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          tax_id: string | null;
          payment_terms: string;
          credit_limit: number;
          status: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          tax_id?: string | null;
          payment_terms?: string;
          credit_limit?: number;
          status?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_person?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          tax_id?: string | null;
          payment_terms?: string;
          credit_limit?: number;
          status?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      returns: {
        Row: {
          id: string;
          sale_id: string;
          sale_item_id: string;
          product_id: string;
          customer_id: string | null;
          quantity_returned: number;
          reason: string;
          return_type: string;
          condition: string;
          refund_amount: number;
          status: string;
          processed_by: string | null;
          notes: string;
          return_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          sale_item_id: string;
          product_id: string;
          customer_id?: string | null;
          quantity_returned: number;
          reason: string;
          return_type?: string;
          condition?: string;
          refund_amount?: number;
          status?: string;
          processed_by?: string | null;
          notes?: string;
          return_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          sale_item_id?: string;
          product_id?: string;
          customer_id?: string | null;
          quantity_returned?: number;
          reason?: string;
          return_type?: string;
          condition?: string;
          refund_amount?: number;
          status?: string;
          processed_by?: string | null;
          notes?: string;
          return_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoice_config: {
        Row: {
          id: string;
          company_name: string;
          company_address: string;
          company_city: string;
          company_phone: string;
          company_email: string;
          company_website: string | null;
          company_tax_id: string | null;
          company_logo_url: string | null;
          paper_size: string;
          currency: string;
          currency_symbol: string;
          tax_rate: number;
          include_tax: boolean;
          show_barcode: boolean;
          show_company_logo: boolean;
          footer_text: string;
          terms_and_conditions: string;
          invoice_prefix: string;
          barcode_position: string;
          font_size: string;
          language: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name: string;
          company_address?: string;
          company_city?: string;
          company_phone?: string;
          company_email?: string;
          company_website?: string | null;
          company_tax_id?: string | null;
          company_logo_url?: string | null;
          paper_size?: string;
          currency?: string;
          currency_symbol?: string;
          tax_rate?: number;
          include_tax?: boolean;
          show_barcode?: boolean;
          show_company_logo?: boolean;
          footer_text?: string;
          terms_and_conditions?: string;
          invoice_prefix?: string;
          barcode_position?: string;
          font_size?: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          company_address?: string;
          company_city?: string;
          company_phone?: string;
          company_email?: string;
          company_website?: string | null;
          company_tax_id?: string | null;
          company_logo_url?: string | null;
          paper_size?: string;
          currency?: string;
          currency_symbol?: string;
          tax_rate?: number;
          include_tax?: boolean;
          show_barcode?: boolean;
          show_company_logo?: boolean;
          footer_text?: string;
          terms_and_conditions?: string;
          invoice_prefix?: string;
          barcode_position?: string;
          font_size?: string;
          language?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: string;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: string;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: string;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      installment_sales: {
        Row: {
          id: string;
          customer_id: string;
          total_amount: number;
          paid_amount: number;
          remaining_amount: number;
          installment_type: string;
          installment_amount: number;
          installment_count: number;
          paid_installments: number;
          start_date: string;
          next_payment_date: string;
          status: string;
          notes: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          total_amount: number;
          paid_amount?: number;
          remaining_amount: number;
          installment_type: string;
          installment_amount: number;
          installment_count: number;
          paid_installments?: number;
          start_date: string;
          next_payment_date: string;
          status?: string;
          notes?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          total_amount?: number;
          paid_amount?: number;
          remaining_amount?: number;
          installment_type?: string;
          installment_amount?: number;
          installment_count?: number;
          paid_installments?: number;
          start_date?: string;
          next_payment_date?: string;
          status?: string;
          notes?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      installment_sale_items: {
        Row: {
          id: string;
          installment_sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          installment_sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          installment_sale_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
        };
      };
      installment_payments: {
        Row: {
          id: string;
          installment_sale_id: string;
          payment_number: number;
          amount: number;
          payment_date: string;
          payment_method: string;
          notes: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          installment_sale_id: string;
          payment_number: number;
          amount: number;
          payment_date: string;
          payment_method: string;
          notes?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          installment_sale_id?: string;
          payment_number?: number;
          amount?: number;
          payment_date?: string;
          payment_method?: string;
          notes?: string;
          created_by?: string | null;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          title: string;
          description: string;
          report_type: string;
          date_range_start: string | null;
          date_range_end: string | null;
          filters: any;
          data: any;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          report_type: string;
          date_range_start?: string | null;
          date_range_end?: string | null;
          filters?: any;
          data?: any;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          report_type?: string;
          date_range_start?: string | null;
          date_range_end?: string | null;
          filters?: any;
          data?: any;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};