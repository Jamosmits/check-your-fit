import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Returns settings keys from SecureStore.
 * Triggers loadKeys() on mount when not yet hydrated so callers never
 * need to call loadKeys() themselves.
 * All key fields are empty strings until isLoaded === true.
 */
export function useSettings() {
  const isLoaded       = useSettingsStore((s) => s.isLoaded);
  const loadKeys       = useSettingsStore((s) => s.loadKeys);
  const openaiKey      = useSettingsStore((s) => s.openaiKey);
  const replicateKey   = useSettingsStore((s) => s.replicateKey);
  const fashnKey       = useSettingsStore((s) => s.fashnKey);
  const anthropicKey   = useSettingsStore((s) => s.anthropicKey);
  const removeBgKey    = useSettingsStore((s) => s.removeBgKey);
  const supabaseUrl    = useSettingsStore((s) => s.supabaseUrl);
  const supabaseAnonKey = useSettingsStore((s) => s.supabaseAnonKey);

  useEffect(() => {
    if (!isLoaded) loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — trigger once on mount, not on every re-render

  return {
    isLoaded,
    openaiKey,
    replicateKey,
    fashnKey,
    anthropicKey,
    removeBgKey,
    supabaseUrl,
    supabaseAnonKey,
  };
}
