import { supabase } from '../lib/supabase';
import type { Return } from '../types';

export const returnService = {
  async getAll(): Promise<Return[]> {
    const { data, error } = await supabase
      .from('returns')
      .select(`
        *,
        sale:sales(*),
        sale_item:sale_items(*),
        product:products(*),
        customer:customers(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Return | null> {
    const { data, error } = await supabase
      .from('returns')
      .select(`
        *,
        sale:sales(*),
        sale_item:sale_items(*),
        product:products(*),
        customer:customers(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getBySaleId(saleId: string): Promise<Return[]> {
    const { data, error } = await supabase
      .from('returns')
      .select(`
        *,
        sale:sales(*),
        sale_item:sale_items(*),
        product:products(*),
        customer:customers(*)
      `)
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(returnData: {
    sale_id: string;
    sale_item_id: string;
    product_id: string;
    customer_id?: string;
    quantity_returned: number;
    reason: string;
    return_type: 'refund' | 'exchange' | 'warranty';
    condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
    refund_amount?: number;
    notes?: string;
  }): Promise<Return> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('returns')
      .insert({
        ...returnData,
        refund_amount: returnData.refund_amount || 0,
        notes: returnData.notes || '',
        processed_by: user?.id,
        status: 'pending'
      })
      .select(`
        *,
        sale:sales(*),
        sale_item:sale_items(*),
        product:products(*),
        customer:customers(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Return>): Promise<Return> {
    const { data, error } = await supabase
      .from('returns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        sale:sales(*),
        sale_item:sale_items(*),
        product:products(*),
        customer:customers(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: Return['status'], notes?: string): Promise<Return> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('returns')
      .update({
        status,
        processed_by: user?.id,
        notes: notes || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        sale:sales(*),
        sale_item:sale_items(*),
        product:products(*),
        customer:customers(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('returns')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getStats(): Promise<{
    totalReturns: number;
    pendingReturns: number;
    completedReturns: number;
    totalRefundAmount: number;
    returnsByType: Record<string, number>;
    returnsByReason: Record<string, number>;
  }> {
    const { data: returns } = await supabase
      .from('returns')
      .select('*');

    const totalReturns = returns?.length || 0;
    const pendingReturns = returns?.filter(r => r.status === 'pending').length || 0;
    const completedReturns = returns?.filter(r => r.status === 'completed').length || 0;
    const totalRefundAmount = returns?.reduce((sum, r) => sum + (r.refund_amount || 0), 0) || 0;

    const returnsByType = returns?.reduce((acc, r) => {
      acc[r.return_type] = (acc[r.return_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const returnsByReason = returns?.reduce((acc, r) => {
      const reason = r.reason || 'Sin especificar';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return {
      totalReturns,
      pendingReturns,
      completedReturns,
      totalRefundAmount,
      returnsByType,
      returnsByReason
    };
  },

  async getReturnableItems(saleId: string): Promise<Array<{
    sale_item_id: string;
    product_id: string;
    product_name: string;
    quantity_sold: number;
    quantity_returned: number;
    quantity_available: number;
    unit_price: number;
  }>> {
    // Obtener items de la venta
    const { data: saleItems, error: saleError } = await supabase
      .from('sale_items')
      .select(`
        id,
        product_id,
        quantity,
        unit_price,
        product:products(name)
      `)
      .eq('sale_id', saleId);

    if (saleError) throw saleError;

    // Obtener devoluciones existentes para esta venta
    const { data: existingReturns, error: returnsError } = await supabase
      .from('returns')
      .select('sale_item_id, quantity_returned')
      .eq('sale_id', saleId);

    if (returnsError) throw returnsError;

    // Calcular cantidades disponibles para devolución
    const returnableItems = saleItems?.map(item => {
      const totalReturned = existingReturns
        ?.filter(r => r.sale_item_id === item.id)
        .reduce((sum, r) => sum + r.quantity_returned, 0) || 0;

      return {
        sale_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product?.name || 'Producto eliminado',
        quantity_sold: item.quantity,
        quantity_returned: totalReturned,
        quantity_available: item.quantity - totalReturned,
        unit_price: item.unit_price
      };
    }).filter(item => item.quantity_available > 0) || [];

    return returnableItems;
  }
};