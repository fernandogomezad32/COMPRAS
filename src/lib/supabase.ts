import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
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
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          price: number;
          cost?: number;
          category_id?: string | null;
          stock_quantity?: number;
          min_stock?: number;
          barcode?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          cost?: number;
          category_id?: string | null;
          stock_quantity?: number;
          min_stock?: number;
          barcode?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sales: {
        Row: {
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
        };
        Insert: {
          id?: string;
          total: number;
          subtotal: number;
          tax?: number;
          customer_name?: string;
          customer_email?: string;
          payment_method?: string;
          status?: string;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          total?: number;
          subtotal?: number;
          tax?: number;
          customer_name?: string;
          customer_email?: string;
          payment_method?: string;
          status?: string;
          user_id?: string | null;
          created_at?: string;
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
    };
  };
};