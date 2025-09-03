import { supabase } from '../lib/supabase';
import type { Sale, SaleItem, CartItem, PaymentReceipt } from '../types';

export const saleService = {
  async getAll(): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        total,
        subtotal,
        tax,
        customer_name,
        customer_email,
        payment_method,
        status,
        user_id,
        created_at,
        customer_id,
        amount_received,
        change_amount,
        discount_amount,
        discount_percentage,
        discount_type,
        customer:customers(*),
        sale_items(
          *,
          product:products(*)
        ),
        payment_receipt:payment_receipts(
          id,
          sale_id,
          receipt_number:receipt_number_pr,
          barcode,
          receipt_type,
          status,
          issued_at,
          voided_at,
          void_reason,
          created_at,
          updated_at
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
        id,
        total,
        subtotal,
        tax,
        customer_name,
        customer_email,
        payment_method,
        status,
        user_id,
        created_at,
        customer_id,
        amount_received,
        change_amount,
        discount_amount,
        discount_percentage,
        discount_type,
        customer:customers(*),
        sale_items(
          *,
          product:products(*)
        ),
        payment_receipt:payment_receipts(
          id,
          sale_id,
          receipt_number:receipt_number_pr,
          barcode,
          receipt_type,
          status,
          issued_at,
          voided_at,
          void_reason,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(saleData: {
    items: CartItem[];
    customer_id?: string;
    customer_name: string;
    customer_email: string;
    payment_method: string;
    discount_type?: 'none' | 'amount' | 'percentage';
    discount_amount?: number;
    discount_percentage?: number;
    amount_received?: number;
    change_amount?: number;
  }): Promise<Sale> {
    const { 
      items, 
      customer_id, 
      customer_name, 
      customer_email, 
      payment_method, 
      discount_type = 'none',
      discount_amount = 0,
      discount_percentage = 0,
      amount_received = 0, 
      change_amount = 0 
    } = saleData;
    
    // Calcular totales
    const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    
    // Calcular descuento
    let discountValue = 0;
    if (discount_type === 'amount') {
      discountValue = discount_amount;
    } else if (discount_type === 'percentage') {
      discountValue = (subtotal * discount_percentage) / 100;
    }
    
    const total = Math.max(0, subtotal - discountValue);

    // Crear la venta
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total,
        subtotal,
        tax: 0,
        discount_amount: discountValue,
        discount_percentage: discount_type === 'percentage' ? discount_percentage : 0,
        discount_type,
        customer_id,
        customer_name,
        customer_email,
        payment_method,
        amount_received,
        change_amount,
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

  async update(id: string, updates: Partial<Sale>): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:customers(*),
        sale_items(
          *,
          product:products(*)
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    // Primero eliminar los items de la venta (esto restaurará el stock automáticamente)
    const { error: itemsError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', id);

    if (itemsError) throw itemsError;

    // Luego eliminar la venta
    const { error: saleError } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (saleError) throw saleError;
  },

  async updateStatus(id: string, status: string): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .update({ status })
      .eq('id', id)
      .select(`
        id,
        total,
        subtotal,
        tax,
        customer_name,
        customer_email,
        payment_method,
        status,
        user_id,
        created_at,
        customer_id,
        amount_received,
        change_amount,
        discount_amount,
        discount_percentage,
        discount_type,
        customer:customers(*),
        sale_items(
          *,
          product:products(*)
        )
      `)
      .single();

    if (error) throw error;
    return data;
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