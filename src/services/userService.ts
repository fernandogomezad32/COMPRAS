import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

export const userService = {
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        created_by_profile:user_profiles!user_profiles_created_by_fkey(
          id,
          email,
          full_name,
          role
        )
      `)
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data;
  },

  async getAll(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        created_by_profile:user_profiles!user_profiles_created_by_fkey(
          id,
          email,
          full_name,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        created_by_profile:user_profiles!user_profiles_created_by_fkey(
          id,
          email,
          full_name,
          role
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createUser(userData: {
    email: string;
    password: string;
    full_name: string;
    role: 'admin' | 'employee';
  }): Promise<UserProfile> {
    // Verificar que el usuario actual es super_admin
    const currentUser = await this.getCurrentUserProfile();
    if (!currentUser || currentUser.role !== 'super_admin') {
      throw new Error('Solo los super administradores pueden crear usuarios');
    }

    // Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role,
        created_by: currentUser.id
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Error al crear el usuario');

    // El perfil se crea automáticamente por el trigger
    // Esperar un momento y luego obtener el perfil creado
    await new Promise(resolve => setTimeout(resolve, 1000));

    const profile = await this.getById(authData.user.id);
    if (!profile) throw new Error('Error al crear el perfil del usuario');

    return profile;
  },

  async updateUser(id: string, updates: {
    full_name?: string;
    role?: 'admin' | 'employee';
    status?: 'active' | 'inactive';
  }): Promise<UserProfile> {
    // Verificar que el usuario actual es super_admin
    const currentUser = await this.getCurrentUserProfile();
    if (!currentUser || currentUser.role !== 'super_admin') {
      throw new Error('Solo los super administradores pueden actualizar usuarios');
    }

    // No permitir cambiar el rol de otro super_admin
    const targetUser = await this.getById(id);
    if (targetUser?.role === 'super_admin' && updates.role && updates.role !== 'super_admin') {
      throw new Error('No se puede cambiar el rol de un super administrador');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        created_by_profile:user_profiles!user_profiles_created_by_fkey(
          id,
          email,
          full_name,
          role
        )
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteUser(id: string): Promise<void> {
    // Verificar que el usuario actual es super_admin
    const currentUser = await this.getCurrentUserProfile();
    if (!currentUser || currentUser.role !== 'super_admin') {
      throw new Error('Solo los super administradores pueden eliminar usuarios');
    }

    // No permitir eliminar super_admins
    const targetUser = await this.getById(id);
    if (targetUser?.role === 'super_admin') {
      throw new Error('No se puede eliminar un super administrador');
    }

    // No permitir auto-eliminación
    if (id === currentUser.id) {
      throw new Error('No puedes eliminar tu propia cuenta');
    }

    // Eliminar usuario de auth (esto también eliminará el perfil por CASCADE)
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
  },

  async changePassword(userId: string, newPassword: string): Promise<void> {
    // Verificar que el usuario actual es super_admin
    const currentUser = await this.getCurrentUserProfile();
    if (!currentUser || currentUser.role !== 'super_admin') {
      throw new Error('Solo los super administradores pueden cambiar contraseñas');
    }

    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) throw error;
  },

  async getStats(): Promise<{
    totalUsers: number;
    superAdmins: number;
    admins: number;
    employees: number;
    activeUsers: number;
    inactiveUsers: number;
  }> {
    const users = await this.getAll();

    return {
      totalUsers: users.length,
      superAdmins: users.filter(u => u.role === 'super_admin').length,
      admins: users.filter(u => u.role === 'admin').length,
      employees: users.filter(u => u.role === 'employee').length,
      activeUsers: users.filter(u => u.status === 'active').length,
      inactiveUsers: users.filter(u => u.status === 'inactive').length
    };
  },

  async checkPermissions(): Promise<{
    canCreateUsers: boolean;
    canManageUsers: boolean;
    userRole: string | null;
  }> {
    const currentUser = await this.getCurrentUserProfile();
    
    return {
      canCreateUsers: currentUser?.role === 'super_admin',
      canManageUsers: currentUser?.role === 'super_admin',
      userRole: currentUser?.role || null
    };
  }
};