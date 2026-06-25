import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, apiRequest, setAdminToken, clearAdminToken, ADMIN_TOKEN_KEY } from '@/lib/api';
import type { Profile } from '@/types/index';
import { toast } from 'sonner';

// A completely separate session from the customer storefront (different token
// key), so admin and customer logins never affect each other in the same browser.
interface AdminAuthContextType {
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

async function fetchMe(): Promise<{ user: Profile } | null> {
  try { return await apiRequest<{ user: Profile }>('/api/auth/me', { tokenKey: ADMIN_TOKEN_KEY }); }
  catch { return null; }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    fetchMe()
      .then(result => {
        if (cancelled) return;
        if (result?.user) setProfile(result.user);
        else clearAdminToken();
      })
      .catch(() => { if (!cancelled) clearAdminToken(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await api.post<{ token: string; user: Profile }>('/api/auth/login', { email, password });
      // Only admins may hold an admin session.
      if (data.user.role !== 'admin') {
        return { error: new Error('This account does not have admin access.') };
      }
      setAdminToken(data.token);
      setProfile(data.user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    clearAdminToken();
    setProfile(null);
    toast.success('Signed out of admin');
  };

  return (
    <AdminAuthContext.Provider value={{
      profile, loading,
      isAdmin: profile?.role === 'admin',
      signIn, signOut,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (ctx === undefined) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
