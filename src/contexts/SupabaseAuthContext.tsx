import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/customSupabaseClient";
import { supabaseAdmin } from "@/lib/customSupabaseAdmin";
import { useToast } from "@/components/ui/use-toast";
import type { ProfileWithClinic, UserRole } from "@/types/database.types";

interface CreateProfileData {
  name: string;
  clinic_id?: string;
  role: UserRole;
  is_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ProfileWithClinic | null;
  loading: boolean;
  createProfile: (
    email: string,
    password: string,
    profileData: CreateProfileData
  ) => Promise<{ user: User | null; error: AuthError | Error | null }>;
  updateUserPassword: (
    userId: string,
    newPassword: string
  ) => Promise<{ error: AuthError | Error | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  fetchProfile: (userId: string) => Promise<ProfileWithClinic | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileWithClinic | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(
    async (userId: string): Promise<ProfileWithClinic | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            *,
            clinic:clinics(*)
          `
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          variant: "destructive",
          title: "Erro ao buscar perfil",
          description: "Não foi possível carregar os dados do seu perfil.",
        });
        return null;
      }
      return data as ProfileWithClinic;
    },
    [toast]
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      const userProfile = await fetchProfile(user.id);
      setProfile(userProfile);
    }
  }, [user, fetchProfile]);

  const handleSession = useCallback(
    async (session: Session | null) => {
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
    },
    [fetchProfile]
  );

  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await handleSession(session);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const createProfile = useCallback(
    async (
      email: string,
      password: string,
      profileData: CreateProfileData
    ): Promise<{ user: User | null; error: AuthError | Error | null }> => {
      const { name, clinic_id, role, is_admin } = profileData;

      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
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
            is_admin: is_admin || false,
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
    },
    [toast]
  );

  const updateUserPassword = useCallback(
    async (
      userId: string,
      newPassword: string
    ): Promise<{ error: AuthError | Error | null }> => {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar senha",
          description: error.message,
        });
        return { error };
      }

      return { error: null };
    },
    [toast]
  );

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error: AuthError | null }> => {
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
    },
    [toast]
  );

  const signOut = useCallback(async (): Promise<{
    error: AuthError | null;
  }> => {
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

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      createProfile,
      updateUserPassword,
      signIn,
      signOut,
      fetchProfile,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      loading,
      createProfile,
      updateUserPassword,
      signIn,
      signOut,
      fetchProfile,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
