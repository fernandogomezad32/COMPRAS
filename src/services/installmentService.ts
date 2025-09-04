import { supabase } from '../lib/supabase';
import type { InstallmentSale, InstallmentPayment, CartItem } from '../types';

export const installmentService = {
  async getAll(): Promise<InstallmentSale[]> {
    const { data, error } = await supabase
      .from('installment_sales')
      .select(`
        *,
        customer:customers(*),
        installment_sale_items(
          *,
          product:products(*)
        ),
        installment_payments(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<InstallmentSale | null> {
    const { data, error } = await supabase
      .from('installment_sales')
      .select(`
        *,
        customer:customers(*),
        installment_sale_items(
          *,
          product:products(*)
        ),
        installment_payments(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getByCustomerId(customerId: string): Promise<InstallmentSale[]> {
    const { data, error } = await supabase
      .from('installment_sales')
      .select(`
        *,
        customer:customers(*),
        installment_sale_items(
          *,
          product:products(*)
        ),
        installment_payments(*)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getOverdue(): Promise<InstallmentSale[]> {
    const { data, error } = await supabase
      .from('installment_sales')
      .select(`
        *,
        customer:customers(*),
        installment_sale_items(
          *,
          product:products(*)
        ),
        installment_payments(*)
      `)
      .eq('status', 'overdue')
      .order('next_payment_date');

    if (error) throw error;
    return data || [];
  },

  async getDueToday(): Promise<InstallmentSale[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('installment_sales')
      .select(`
        *,
        customer:customers(*),
        installment_sale_items(
          *,
          product:products(*)
        ),
        installment_payments(*)
      `)
      .eq('status', 'active')
      .lte('next_payment_date', today)
      .order('next_payment_date');

    if (error) throw error;
    return data || [];
  },

  async create(installmentData: {
    customer_id: string;
    items: CartItem[];
    installment_type: 'daily' | 'weekly' | 'monthly';
    installment_count: number;
    start_date: string;
    notes?: string;
  }): Promise<InstallmentSale> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');

    // Calcular totales
    const total_amount = installmentData.items.reduce(
      (sum, item) => sum + (item.product.price * item.quantity), 0
    );
    const installment_amount = total_amount / installmentData.installment_count;

    // Calcular próxima fecha de pago
    const startDate = new Date(installmentData.start_date);
    let nextPaymentDate = new Date(startDate);
    
    switch (installmentData.installment_type) {
      case 'daily':
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 1);
        break;
      case 'weekly':
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
        break;
      case 'monthly':
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        break;
    }

    // Crear la venta por abonos
    const { data: installmentSale, error: saleError } = await supabase
      .from('installment_sales')
      .insert({
        customer_id: installmentData.customer_id,
        total_amount,
        paid_amount: 0,
        remaining_amount: total_amount,
        installment_type: installmentData.installment_type,
        installment_amount,
        installment_count: installmentData.installment_count,
        paid_installments: 0,
        start_date: installmentData.start_date,
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
        status: 'active',
        notes: installmentData.notes || '',
        created_by: user.id
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Crear los items de la venta
    const saleItems = installmentData.items.map(item => ({
      installment_sale_id: installmentSale.id,
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.product.price * item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('installment_sale_items')
      .insert(saleItems);

    if (itemsError) throw itemsError;

    // Retornar la venta completa
    return await this.getById(installmentSale.id) as InstallmentSale;
  },

  async addPayment(installmentSaleId: string, paymentData: {
    amount: number;
    payment_method: string;
    payment_date: string;
    notes?: string;
  }): Promise<InstallmentPayment> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener el número del próximo pago
    const { count } = await supabase
      .from('installment_payments')
      .select('*', { count: 'exact', head: true })
      .eq('installment_sale_id', installmentSaleId);

    const paymentNumber = (count || 0) + 1;

    const { data, error } = await supabase
      .from('installment_payments')
      .insert({
        installment_sale_id: installmentSaleId,
        payment_number: paymentNumber,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        notes: paymentData.notes || '',
        created_by: user.id
      })
      .select('id, installment_sale_id, payment_number, amount, payment_date, payment_method, notes, created_by, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: InstallmentSale['status']): Promise<InstallmentSale> {
    const { data, error } = await supabase
      .from('installment_sales')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        customer:customers(*),
        installment_sale_items(
          *,
          product:products(*)
        ),
        installment_payments(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    // Primero eliminar los items (esto restaurará el stock automáticamente)
    const { error: itemsError } = await supabase
      .from('installment_sale_items')
      .delete()
      .eq('installment_sale_id', id);

    if (itemsError) throw itemsError;

    // Eliminar los pagos
    const { error: paymentsError } = await supabase
      .from('installment_payments')
      .delete()
      .eq('installment_sale_id', id);

    if (paymentsError) throw paymentsError;

    // Eliminar la venta por abonos
    const { error: saleError } = await supabase
      .from('installment_sales')
      .delete()
      .eq('id', id);

    if (saleError) throw saleError;
  },

  async getStats(): Promise<{
    totalInstallmentSales: number;
    activeInstallmentSales: number;
    overdueInstallmentSales: number;
    totalAmountFinanced: number;
    totalAmountPaid: number;
    totalAmountPending: number;
    paymentsToday: number;
    paymentsThisWeek: number;
  }> {
    // Total de ventas por abonos
    const { count: totalInstallmentSales } = await supabase
      .from('installment_sales')
      .select('*', { count: 'exact', head: true });

    // Ventas activas
    const { count: activeInstallmentSales } = await supabase
      .from('installment_sales')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Ventas vencidas
    const { count: overdueInstallmentSales } = await supabase
      .from('installment_sales')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'overdue');

    // Montos totales
    const { data: salesData } = await supabase
      .from('installment_sales')
      .select('total_amount, paid_amount, remaining_amount');

    const totalAmountFinanced = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
    const totalAmountPaid = salesData?.reduce((sum, sale) => sum + sale.paid_amount, 0) || 0;
    const totalAmountPending = salesData?.reduce((sum, sale) => sum + sale.remaining_amount, 0) || 0;

    // Pagos de hoy
    const today = new Date().toISOString().split('T')[0];
    const { count: paymentsToday } = await supabase
      .from('installment_payments')
      .select('*', { count: 'exact', head: true })
      .eq('payment_date', today);

    // Pagos de esta semana
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const { count: paymentsThisWeek } = await supabase
      .from('installment_payments')
      .select('*', { count: 'exact', head: true })
      .gte('payment_date', weekStart.toISOString().split('T')[0]);

    return {
      totalInstallmentSales: totalInstallmentSales || 0,
      activeInstallmentSales: activeInstallmentSales || 0,
      overdueInstallmentSales: overdueInstallmentSales || 0,
      totalAmountFinanced,
      totalAmountPaid,
      totalAmountPending,
      paymentsToday: paymentsToday || 0,
      paymentsThisWeek: paymentsThisWeek || 0
    };
  }
};