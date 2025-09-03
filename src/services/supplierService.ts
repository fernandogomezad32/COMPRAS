import { supabase } from '../lib/supabase';
import type { Supplier } from '../types';

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async search(term: string): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .or(`name.ilike.%${term}%,contact_person.ilike.%${term}%,email.ilike.%${term}%`)
      .order('name')
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  async getStats(): Promise<{
    totalSuppliers: number;
    activeSuppliers: number;
    inactiveSuppliers: number;
  }> {
    const { count: totalSuppliers } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true });

    const { count: activeSuppliers } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: inactiveSuppliers } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'inactive');

    return {
      totalSuppliers: totalSuppliers || 0,
      activeSuppliers: activeSuppliers || 0,
      inactiveSuppliers: inactiveSuppliers || 0
    };
  }
};