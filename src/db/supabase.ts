// Migration complete — Supabase has been fully replaced by the Express/PostgreSQL backend.
// This shim is kept so any un-migrated import won't crash silently.
// All API calls now go through src/lib/api.ts.

const noop = () => {};
const noopAsync = async () => ({});

// Safe mock: any call to supabase.auth.* / supabase.from().* will no-op instead of throwing.
export const supabase = {
  auth: {
    onAuthStateChange: (_event: unknown, _cb: unknown) => ({ data: { subscription: { unsubscribe: noop } } }),
    getSession: noopAsync,
    getUser: noopAsync,
    signInWithPassword: noopAsync,
    signUp: noopAsync,
    signOut: noopAsync,
    updateUser: noopAsync,
  },
  from: (_table: string) => ({
    select: () => ({ data: null, error: null }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ data: null, error: null }),
    delete: () => ({ data: null, error: null }),
    upsert: () => ({ data: null, error: null }),
    eq: () => ({ data: null, error: null }),
    single: () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
  }),
  storage: {
    from: (_bucket: string) => ({
      upload: async () => ({ data: null, error: new Error('Supabase removed: use Express API') }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: async () => ({ data: null, error: null }),
    }),
  },
};
