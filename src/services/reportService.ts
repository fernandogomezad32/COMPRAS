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

    if (error) throw error;
    return data;
  },

  async create(report: Omit<Report, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<Report> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');
    
    // Verificar permisos de usuario
    const userRole = user.user_metadata?.role || 'employee';
    if (userRole === 'employee') {
      throw new Error('No tienes permisos para crear reportes. Contacta a un administrador.');
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        ...report,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Report>): Promise<Report> {
    // Verificar permisos de usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    const userRole = user.user_metadata?.role || 'employee';
    if (userRole === 'employee') {
      throw new Error('No tienes permisos para editar reportes. Contacta a un administrador.');
    }

    const { data, error } = await supabase
      .from('reports')
      .update(updates)
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
    
    const userRole = user.user_metadata?.role || 'employee';
    if (userRole === 'employee') {
      throw new Error('No tienes permisos para eliminar reportes. Contacta a un administrador.');
    }

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async toggleFavorite(id: string, isFavorite: boolean): Promise<Report> {
    // This functionality is not supported in the current schema
    throw new Error('Favorite functionality not available');
  },

  async getFavorites(): Promise<Report[]> {
    // This functionality is not supported in the current schema
    return [];
  }
};