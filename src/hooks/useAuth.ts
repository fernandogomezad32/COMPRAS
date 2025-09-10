import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { userService } from '../services/userService';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const timeout = setTimeout(() => {
        setError('Timeout al cargar la sesión');
        setLoading(false);
      }, 10000); // 10 segundos timeout

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        clearTimeout(timeout);
        
        if (sessionError && sessionError.message.includes('refresh_token_not_found')) {
          // Token expirado, limpiar sesión silenciosamente
          await supabase.auth.signOut();
          setUser(null);
          setUserProfile(null);
        } else if (sessionError) {
          console.error('Error getting session:', sessionError);
          setError('Error al obtener la sesión');
          setUser(null);
          setUserProfile(null);
        } else {
          setUser(session?.user ?? null);
          if (session?.user) {
            try {
              const profile = await userService.getCurrentUserProfile();
              setUserProfile(profile);
            } catch (error) {
              console.error('Error loading user profile:', error);
              setUserProfile(null);
            }
          }
        }

        // Check if initial setup is needed
        try {
          const { count, error: countError } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'super_admin');

          if (countError) {
            console.error('Error checking super admin count:', countError);
            setNeedsInitialSetup(true);
          } else {
            setNeedsInitialSetup(!count || count === 0);
          }
        } catch (error) {
          console.error('Error checking initial setup:', error);
          setNeedsInitialSetup(true);
        }
      } catch (error) {
        clearTimeout(timeout);
        // En caso de error, asegurar que el usuario esté deslogueado
        console.error('Error in getInitialSession:', error);
        setError('Error al inicializar la aplicación');
        setUser(null);
        setUserProfile(null);
        setNeedsInitialSetup(true);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setUser(session?.user ?? null);
          if (session?.user) {
            try {
              const profile = await userService.getCurrentUserProfile();
              setUserProfile(profile);
            } catch (error) {
              console.error('Error loading user profile:', error);
              setUserProfile(null);
            }
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          setUser(null);
          setUserProfile(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error: { message: 'Error al iniciar sesión' } };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error: { message: 'Error al registrarse' } };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      setUserProfile(null);
      return { error };
    } catch (error) {
      console.error('Error signing out:', error);
      return { error: { message: 'Error al cerrar sesión' } };
    }
  };

  return {
    user,
    userProfile,
    needsInitialSetup,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  };
}