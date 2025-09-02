import { supabase } from '../lib/supabase';
import type { Sale, SaleItem, CartItem } from '../types';

export const saleService = {
  async getAll(): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items(
          *,
          product:products(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(saleData: {
    items: CartItem[];
    customer_name: string;
    customer_email: string;
    payment_method: string;
    tax_rate: number;
  }): Promise<Sale> {
    const { items, customer_name, customer_email, payment_method, tax_rate } = saleData;
    
    // Calcular totales
    const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const tax = subtotal * (tax_rate / 100);
    const total = subtotal + tax;

    // Crear la venta
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total,
        subtotal,
        tax,
        customer_name,
        customer_email,
        payment_method,
        status: 'completed'
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Crear los items de la venta
    const saleItems = items.map(item => ({
      sale_id: sale.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.product.price * item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw itemsError;

    return sale;
  },

  async getStats(): Promise<{
    totalSales: number;
    totalRevenue: number;
    todayRevenue: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Total de ventas
    const { count: totalSales } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });

    // Revenue total
    const { data: totalRevenueData } = await supabase
      .from('sales')
      .select('total');

    const totalRevenue = totalRevenueData?.reduce((sum, sale) => sum + sale.total, 0) || 0;

    // Revenue de hoy
    const { data: todayRevenueData } = await supabase
      .from('sales')
      .select('total')
      .gte('created_at', today);

    const todayRevenue = todayRevenueData?.reduce((sum, sale) => sum + sale.total, 0) || 0;

    return {
      totalSales: totalSales || 0,
      totalRevenue,
      todayRevenue
    };
  }
};