import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Creates a Supabase client on every call using the current values from
 * settingsStore.  No module-level caching — this guarantees the correct
 * credentials are always used regardless of when settings were loaded.
 *
 * Returns null when URL or anon key is missing / invalid.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey } = useSettingsStore.getState();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Niet geconfigureerd — voeg URL en anon key toe in Instellingen');
    return null;
  }

  // Accept optional trailing slash by stripping it before validation
  const normalizedUrl = supabaseUrl.replace(/\/$/, '');
  if (!normalizedUrl.match(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i)) {
    console.error(
      '[Supabase] URL onjuist — gebruik formaat: https://xxxx.supabase.co',
      '(ontvangen:', supabaseUrl.slice(0, 40), ')',
    );
    return null;
  }

  return createClient(normalizedUrl, supabaseAnonKey);
}

/** No-op kept for backward compatibility with callers that used the cached client. */
export function invalidateSupabaseClient() {}
