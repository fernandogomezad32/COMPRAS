import { supabase } from '../lib/supabase';
import type { Customer } from '../types';

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    // Verificar permisos de usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    // Obtener rol del usuario desde metadata
    const userRole = user.user_metadata?.role || 'employee';
    if (userRole === 'employee') {
      throw new Error('No tienes permisos para crear clientes. Contacta a un administrador.');
    }

    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    // Verificar permisos de usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    // Obtener rol del usuario desde metadata
    const userRole = user.user_metadata?.role || 'employee';
    if (userRole === 'employee') {
      throw new Error('No tienes permisos para editar clientes. Contacta a un administrador.');
    }

    const { data, error } = await supabase
      .from('customers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    // Verificar permisos de usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    // Obtener rol del usuario desde metadata
    const userRole = user.user_metadata?.role || 'employee';
    if (userRole === 'employee') {
      throw new Error('No tienes permisos para eliminar clientes. Contacta a un administrador.');
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async search(term: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
      .order('name')
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  async getStats(): Promise<{
    totalCustomers: number;
    newCustomersThisMonth: number;
    topCustomers: Array<Customer & { totalPurchases: number; totalSpent: number }>;
  }> {
    // Total customers
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // New customers this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newCustomersThisMonth } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());

    // Top customers (this would need a more complex query in production)
    const { data: customers } = await supabase
      .from('customers')
      .select(`
        *,
        sales(total, created_at)
      `);

    const topCustomers = (customers || [])
      .map(customer => {
        const sales = customer.sales || [];
        const totalPurchases = sales.length;
        const totalSpent = sales.reduce((sum: number, sale: any) => sum + sale.total, 0);
        return {
          ...customer,
          totalPurchases,
          totalSpent
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return {
      totalCustomers: totalCustomers || 0,
      newCustomersThisMonth: newCustomersThisMonth || 0,
      topCustomers
    };
  }
};