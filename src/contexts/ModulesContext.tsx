import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { SiteModule } from '@/types/index';

interface ModulesContextType {
  modules: SiteModule[];
  loading: boolean;
  /** Returns true if a module is enabled. Defaults to true until loaded / when unknown. */
  isEnabled: (key: string) => boolean;
  refresh: () => Promise<void>;
}

const ModulesContext = createContext<ModulesContextType | undefined>(undefined);

export function ModulesProvider({ children }: { children: ReactNode }) {
  const [modules, setModules] = useState<SiteModule[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await api.get<SiteModule[]>('/api/modules');
      if (Array.isArray(data)) setModules(data);
    } catch { /* keep defaults */ }
    finally { setLoaded(true); setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const isEnabled = (key: string) => {
    // Until modules load, default to enabled so nothing flashes hidden.
    if (!loaded) return true;
    const m = modules.find(x => x.key === key);
    return m ? m.enabled : true;
  };

  return (
    <ModulesContext.Provider value={{ modules, loading, isEnabled, refresh }}>
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModulesContext);
  if (ctx === undefined) throw new Error('useModules must be used within a ModulesProvider');
  return ctx;
}
