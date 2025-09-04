import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    };
  };
};