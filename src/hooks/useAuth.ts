import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { userService } from '../services/userService';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error && error.message.includes('refresh_token_not_found')) {
          // Token expirado, limpiar sesión silenciosamente
          await supabase.auth.signOut();
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
      } catch (error) {
        // En caso de error, asegurar que el usuario esté deslogueado
        setUser(null);
        setUserProfile(null);
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setUserProfile(null);
    return { error };
  };

  return {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
  };
}