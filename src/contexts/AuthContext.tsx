import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setToken, clearToken } from '@/lib/api';
import type { Profile } from '@/types/index';
import { toast } from 'sonner';

// Shape matches what components expect from Supabase User — simplified to profile
export type AppUser = {
  id: string;
  email?: string;
  phone?: string;
};

interface AuthContextType {
  user: AppUser | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchMe(): Promise<{ user: Profile } | null> {
  try { return await api.get<{ user: Profile }>('/api/auth/me'); }
  catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const result = await fetchMe();
    if (result?.user) {
      setProfile(result.user);
      setUser({ id: result.user.id, email: result.user.email, phone: result.user.phone });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('kw_token');
    if (!token) { setLoading(false); return; }
    fetchMe()
      .then(result => {
        if (cancelled) return;
        if (result?.user) {
          setProfile(result.user);
          setUser({ id: result.user.id, email: result.user.email, phone: result.user.phone });
        } else {
          clearToken();
        }
      })
      .catch(() => { if (!cancelled) clearToken(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.post<{ token: string; user: Profile }>('/api/auth/login', { email, password });
      setToken(data.token);
      setProfile(data.user);
      setUser({ id: data.user.id, email: data.user.email, phone: data.user.phone });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    try {
      const data = await api.post<{ token: string; user: Profile }>('/api/auth/register', {
        full_name: fullName, email, phone, password,
      });
      setToken(data.token);
      setProfile(data.user);
      setUser({ id: data.user.id, email: data.user.email, phone: data.user.phone });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    clearToken();
    setUser(null);
    setProfile(null);
    toast.success('Signed out successfully');
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      isAdmin: profile?.role === 'admin',
      signIn, signUp, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

// Kept for any remaining legacy import from old auth file
export async function getProfile(_userId: string): Promise<Profile | null> {
  const result = await fetchMe();
  return result?.user ?? null;
}
