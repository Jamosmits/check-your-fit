import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSettingsStore } from '@/store/settingsStore';

let _client: SupabaseClient | null = null;

/**
 * Returns a Supabase client built from the URL + key stored in settingsStore.
 * Returns null when either value is missing (Supabase not configured).
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey } = useSettingsStore.getState();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  if (!supabaseUrl.match(/^https:\/\/[a-z0-9-]+\.supabase\.co$/i)) {
    console.error(
      '[Supabase] URL incorrect — gebruik format: https://xxxx.supabase.co',
      '(ontvangen:', supabaseUrl, ')',
    );
    return null;
  }

  if (_client) return _client;

  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

/** Call this when credentials change so the next getSupabaseClient() re-builds. */
export function invalidateSupabaseClient() {
  _client = null;
}
