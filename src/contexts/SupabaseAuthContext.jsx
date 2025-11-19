
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { supabaseAdmin } from '@/lib/customSupabaseAdmin';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select(`
            *,
            clinic:clinics(*)
          `)
      .eq('id', userId)
      .maybeSingle(); // Use maybeSingle to prevent error on no rows

    if (error) {
      console.error("Error fetching profile:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar perfil",
        description: "Não foi possível carregar os dados do seu perfil.",
      });
      return null;
    }
    return data;
  }, [toast]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const userProfile = await fetchProfile(user.id);
      setProfile(userProfile);
    }
  }, [user, fetchProfile]);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      const userProfile = await fetchProfile(currentUser.id);
      setProfile(userProfile);
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      await handleSession(session);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        await handleSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const createProfile = useCallback(async (email, password, profileData) => {
    const name = profileData.name
    const clinic_id = profileData.clinic_id
    const role = profileData.role

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      toast({
        variant: "destructive",
        title: "Erro ao registrar",
        description: authError.message,
      });
      return { user: null, error: authError };
    }

    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: authData.user.id,
          email,
          name,
          role,
          clinic_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error("Profile Error:", profileError);
        toast({
          variant: "destructive",
          title: "Erro ao criar perfil",
          description: profileError.message,
        });
        return { user: authData.user, error: profileError };
      }
    }

    return { user: authData.user, error: null };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Something went wrong",
      });
      setLoading(false);
    } else {
      toast({
        title: "Login realizado com sucesso! 🎉",
        description: "Bem-vindo(a) de volta!",
      });
    }

    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();

    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
      });
    }

    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    createProfile,
    signIn,
    signOut,
    fetchProfile,
    refreshProfile,
  }), [user, session, profile, loading, createProfile, signIn, signOut, fetchProfile, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
