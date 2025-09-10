import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'employee';
  status: 'active' | 'inactive';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const userService = {
  async getAll(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getCurrentUserRole(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data?.role || 'employee';
  },

  async create(userData: {
    email: string;
    password: string;
    full_name: string;
    role: 'super_admin' | 'admin' | 'employee';
    status: 'active' | 'inactive';
  }): Promise<UserProfile> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) throw new Error('Usuario no autenticado');

    // Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: undefined,
        data: {
          full_name: userData.full_name
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Error al crear el usuario');

    // Crear perfil de usuario
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        status: userData.status,
        created_by: currentUser.id
      })
      .select()
      .single();

    if (profileError) throw profileError;
    return profile;
  },

  async update(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    // Nota: En un entorno de producción, esto requeriría permisos especiales
    // Por ahora, el usuario tendrá que cambiar su contraseña manualmente
    throw new Error('Cambio de contraseña no implementado. El usuario debe cambiarla desde su perfil.');
  },

  async updateStatus(id: string, status: 'active' | 'inactive'): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) throw new Error('Usuario no autenticado');
    if (currentUser.id === id) throw new Error('No puedes eliminarte a ti mismo');

    // Verificar que el usuario a eliminar no sea super_admin
    const { data: userToDelete } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', id)
      .single();

    if (userToDelete?.role === 'super_admin') {
      throw new Error('No se puede eliminar un super administrador');
    }

    // Eliminar perfil de usuario
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (profileError) throw profileError;

    // Nota: En un entorno de producción, también eliminarías el usuario de auth
    // pero esto requiere permisos especiales del service role
  },

  async checkSuperAdminExists(): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  },

  async createInitialSuperAdmin(userData: {
    email: string;
    password: string;
    full_name: string;
  }): Promise<void> {
    // Verificar que no exista ya un super admin
    const superAdminExists = await this.checkSuperAdminExists();
    if (superAdminExists) {
      throw new Error('Ya existe un super administrador en el sistema');
    }

    // Crear usuario
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: undefined,
        data: {
          full_name: userData.full_name
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Error al crear el super administrador');

    // Crear perfil como super admin
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        role: 'super_admin',
        status: 'active',
        created_by: null // Primer usuario, no tiene creador
      });

    if (profileError) throw profileError;
  }
};