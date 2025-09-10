import { supabase } from '../lib/supabase';
import type { Report } from '../types';

export const reportService = {
  async getAll(): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Report | null> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getFavorites(): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('is_favorite', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getByType(type: Report['type']): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(report: Omit<Report, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<Report> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');

    // Validar que los campos requeridos estén presentes
    if (!report.name || !report.type) {
      throw new Error('Nombre y tipo de reporte son requeridos');
    }

    // Asegurar que filters y date_range sean objetos válidos
    const reportData = {
      ...report,
      filters: report.filters || {},
      date_range: report.date_range || { period: 'month' },
      created_by: user.id
    };

    const { data, error } = await supabase
      .from('reports')
      .insert(reportData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Report>): Promise<Report> {
    // Asegurar que filters y date_range sean objetos válidos si se están actualizando
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.filters !== undefined) {
      updateData.filters = updates.filters || {};
    }

    if (updates.date_range !== undefined) {
      updateData.date_range = updates.date_range || { period: 'month' };
    }

    const { data, error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleFavorite(id: string, isFavorite: boolean): Promise<Report> {
    const { data, error } = await supabase
      .from('reports')
      .update({ 
        is_favorite: isFavorite,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getStats(): Promise<{
    totalReports: number;
    favoriteReports: number;
    reportsByType: Record<string, number>;
    recentReports: Report[];
  }> {
    const { data: reports } = await supabase
      .from('reports')
      .select('*');

    const totalReports = reports?.length || 0;
    const favoriteReports = reports?.filter(r => r.is_favorite).length || 0;
    
    const reportsByType = reports?.reduce((acc, report) => {
      acc[report.type] = (acc[report.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    
    return {
      totalReports,
      favoriteReports,
      reportsByType,
      recentReports: data || []
    };
  },

  async duplicate(id: string, newName?: string): Promise<Report> {
    const originalReport = await this.getById(id);
    if (!originalReport) throw new Error('Reporte no encontrado');

    const duplicatedReport = {
      name: newName || `${originalReport.name} (Copia)`,
      description: originalReport.description,
      type: originalReport.type,
      filters: originalReport.filters,
      date_range: originalReport.date_range,
      is_favorite: false
    };

    return await this.create(duplicatedReport);
  }
};