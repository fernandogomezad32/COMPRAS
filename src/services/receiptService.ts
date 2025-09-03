import { supabase } from '../lib/supabase';
import type { PaymentReceipt } from '../types';

export const receiptService = {
  async getAll(): Promise<PaymentReceipt[]> {
    const { data, error } = await supabase
      .from('payment_receipts')
      .select(`
        *,
        sale:sales(
          *,
          customer:customers(*),
          sale_items(
            *,
            product:products(*)
          )
        )
      `)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<PaymentReceipt | null> {
    const { data, error } = await supabase
      .from('payment_receipts')
      .select(`
        *,
        sale:sales(
          *,
          customer:customers(*),
          sale_items(
            *,
            product:products(*)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getBySaleId(saleId: string): Promise<PaymentReceipt | null> {
    const { data, error } = await supabase
      .from('payment_receipts')
      .select(`
        *,
        sale:sales(
          *,
          customer:customers(*),
          sale_items(
            *,
            product:products(*)
          )
        )
      `)
      .eq('sale_id', saleId)
      .single();

    if (error) throw error;
    return data;
  },

  async getByReceiptNumber(receiptNumber: string): Promise<PaymentReceipt | null> {
    const { data, error } = await supabase
      .from('payment_receipts')
      .select(`
        *,
        sale:sales(
          *,
          customer:customers(*),
          sale_items(
            *,
            product:products(*)
          )
        )
      `)
      .eq('receipt_number', receiptNumber)
      .single();

    if (error) throw error;
    return data;
  },

  async getByBarcode(barcode: string): Promise<PaymentReceipt | null> {
    const { data, error } = await supabase
      .from('payment_receipts')
      .select(`
        *,
        sale:sales(
          *,
          customer:customers(*),
          sale_items(
            *,
            product:products(*)
          )
        )
      `)
      .eq('barcode', barcode)
      .single();

    if (error) throw error;
    return data;
  },

  async voidReceipt(id: string, reason: string): Promise<PaymentReceipt> {
    const { data, error } = await supabase
      .from('payment_receipts')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        void_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        sale:sales(
          *,
          customer:customers(*),
          sale_items(
            *,
            product:products(*)
          )
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async reactivateReceipt(id: string): Promise<PaymentReceipt> {
    const { data, error } = await supabase
      .from('payment_receipts')
      .update({
        status: 'active',
        voided_at: null,
        void_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        sale:sales(
          *,
          customer:customers(*),
          sale_items(
            *,
            product:products(*)
          )
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async getStats(): Promise<{
    totalReceipts: number;
    activeReceipts: number;
    voidedReceipts: number;
    todayReceipts: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Total de comprobantes
    const { count: totalReceipts } = await supabase
      .from('payment_receipts')
      .select('*', { count: 'exact', head: true });

    // Comprobantes activos
    const { count: activeReceipts } = await supabase
      .from('payment_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Comprobantes anulados
    const { count: voidedReceipts } = await supabase
      .from('payment_receipts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'voided');

    // Comprobantes de hoy
    const { count: todayReceipts } = await supabase
      .from('payment_receipts')
      .select('*', { count: 'exact', head: true })
      .gte('issued_at', today);

    return {
      totalReceipts: totalReceipts || 0,
      activeReceipts: activeReceipts || 0,
      voidedReceipts: voidedReceipts || 0,
      todayReceipts: todayReceipts || 0
    };
  }
};