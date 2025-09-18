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
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getCurrentUserRole(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');

    // Prioritize user metadata from JWT (faster and avoids RLS recursion)
    const metadataRole = user.user_metadata?.role;
    if (metadataRole && ['super_admin', 'admin', 'employee'].includes(metadataRole)) {
      return metadataRole;
    }

    // Fallback to database query if role not in metadata or invalid
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role from DB:', error);
        return 'employee'; // Default role in case of error
      }
      
      return data?.role || 'employee';
    } catch (error) {
      console.error('Error in getCurrentUserRole fallback:', error);
      return 'employee';
    }
  },

  async createProfileForAuthUser(
    userId: string,
    email: string,
    fullName: string,
    role: 'super_admin' | 'admin' | 'employee' = 'employee'
  ): Promise<UserProfile> {
    // Update user metadata in auth.users table to include role in JWT
    try {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            full_name: fullName,
            role: role // Ensure role is set in user_metadata for JWT claims
          }
        }
      );

      if (authUpdateError) {
        console.error('Error updating auth user metadata:', authUpdateError);
        // Continue with profile creation even if metadata update fails
      }
    } catch (metadataError) {
      console.error('Error setting user metadata:', metadataError);
      // Continue with profile creation
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role,
        status: 'active',
        created_by: null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async ensureUserProfile(user: any): Promise<void> {
    try {
      // Check if profile already exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing user profile:', selectError);
        return;
      }

      // If profile already exists, skip creation
      if (existingProfile) {
        return;
      }

      // Create profile with role in JWT metadata
      try {
        // First ensure the user has role metadata
        const { error: metadataError } = await supabase.auth.admin.updateUserById(
          user.id,
          {
            user_metadata: {
              full_name: user.user_metadata?.full_name || user.email.split('@')[0],
              role: 'employee' // Default role for new users
            }
          }
        );

        if (metadataError) {
          console.error('Error setting user metadata:', metadataError);
        }

        // Create the profile
        await this.createProfileForAuthUser(
          user.id,
          user.email,
          user.user_metadata?.full_name || user.email.split('@')[0],
          'employee'
        );
      } catch (profileError: any) {
        // Handle any remaining creation errors
        if (profileError?.code !== '23505') { // 23505 is unique constraint violation
          console.error('Error creating user profile:', profileError);
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
      // Don't throw to avoid breaking auth flow
    }
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

    // Create user in auth and include role in user_metadata for JWT claims
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: undefined,
        data: {
          full_name: userData.full_name,
          role: userData.role // Ensure role is set in user_metadata on signup
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Error al crear el usuario');

    // Create user profile
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
    // Update user profile in public.user_profiles table
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    
    if (!data) {
      throw new Error('El perfil de usuario no fue encontrado o ya no existe.');
    }

    // If role is updated, also update user_metadata in auth.users for JWT claims
    if (updates.role) {
      try {
        const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
          id,
          {
            user_metadata: {
              role: updates.role // Update role in user_metadata for JWT claims
            }
          }
        );
        
        if (authUpdateError) {
          console.error('Error updating auth user metadata role:', authUpdateError);
          // Log the error but don't block the profile update
        }
      } catch (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        // Continue without blocking the profile update
      }
    }
    
    return data;
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
      .maybeSingle();

    if (error) throw error;
    
    if (!data) {
      throw new Error('El perfil de usuario no fue encontrado o ya no existe.');
    }
    
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