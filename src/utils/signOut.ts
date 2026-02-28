import { clearPersistedAuthSession } from './authSession';
import { getSupabaseBrowserClient } from './supabaseClient';

const ADDITIONAL_AUTH_STORAGE_KEYS = ['supabase_access_token', 'edamaa-supabase-auth'];

const clearLocalAuthArtifacts = () => {
  if (typeof window === 'undefined') {
    return;
  }

  clearPersistedAuthSession();
  ADDITIONAL_AUTH_STORAGE_KEYS.forEach((storageKey) => {
    window.localStorage.removeItem(storageKey);
  });

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index) || '';
    if (storageKey.startsWith('sb-') && storageKey.endsWith('-auth-token')) {
      window.localStorage.removeItem(storageKey);
      index -= 1;
    }
  }
};

export const signOutEverywhere = async () => {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    clearLocalAuthArtifacts();
    return;
  }

  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // Always clear local auth artifacts even if remote sign-out fails.
  } finally {
    clearLocalAuthArtifacts();
  }
};
