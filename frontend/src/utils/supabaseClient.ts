import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const SUPABASE_AUTH_STORAGE_KEY = 'edamaa-supabase-auth';

let supabaseClient: SupabaseClient | null | undefined;

export const isSupabaseBrowserConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const getSupabaseBrowserClient = () => {
  if (supabaseClient !== undefined) {
    return supabaseClient;
  }

  if (!isSupabaseBrowserConfigured()) {
    supabaseClient = null;
    return null;
  }

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: SUPABASE_AUTH_STORAGE_KEY,
    },
  });

  return supabaseClient;
};
