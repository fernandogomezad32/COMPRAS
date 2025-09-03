import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export const productService = {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        supplier:suppliers(*)
      `)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        supplier:suppliers(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getLowStock(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        supplier:suppliers(*)
      `)
      .order('stock_quantity');

    if (error) throw error;
    
    // Filter products where stock_quantity <= min_stock
    const lowStockProducts = (data || []).filter(product => 
      product.stock_quantity <= product.min_stock
    );
    
    return lowStockProducts;
  },

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select(`
        *,
        category:categories(*),
        supplier:suppliers(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        category:categories(*),
        supplier:suppliers(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  async deactivate(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        category:categories(*),
        supplier:suppliers(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateStock(id: string, quantity: number): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ stock_quantity: quantity, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        category:categories(*),
        supplier:suppliers(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }
};