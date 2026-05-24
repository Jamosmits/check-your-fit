import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { invalidateSupabaseClient } from '@/services/supabase';

const OPENAI_KEY        = 'settings_openai_key';
const REMOVEBG_KEY      = 'settings_removebg_key';
// replicateKey uses AsyncStorage (not SecureStore) — avoids SecureStore hydration race on Android
const REPLICATE_AS_KEY  = 'replicate_key';
const FASHN_KEY         = 'settings_fashn_key';
const ANTHROPIC_KEY     = 'settings_anthropic_key';
const SUPABASE_URL_KEY  = 'settings_supabase_url';
const SUPABASE_ANON_KEY = 'settings_supabase_anon_key';

interface SettingsState {
  openaiKey:        string;
  removeBgKey:      string;
  replicateKey:     string;
  fashnKey:         string;
  anthropicKey:     string;
  supabaseUrl:      string;
  supabaseAnonKey:  string;
  isLoaded:         boolean;
  setOpenaiKey:      (key: string) => Promise<void>;
  setRemoveBgKey:    (key: string) => Promise<void>;
  setReplicateKey:   (key: string) => Promise<void>;
  setFashnKey:       (key: string) => Promise<void>;
  setAnthropicKey:   (key: string) => Promise<void>;
  setSupabaseUrl:    (url: string) => Promise<void>;
  setSupabaseAnonKey:(key: string) => Promise<void>;
  loadKeys: () => Promise<void>;
  loadSettings: () => Promise<void>; // alias for loadKeys
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  openaiKey:       '',
  removeBgKey:     '',
  replicateKey:    '',
  fashnKey:        '',
  anthropicKey:    '',
  supabaseUrl:     '',
  supabaseAnonKey: '',
  isLoaded:        false,

  setOpenaiKey: async (key) => {
    await SecureStore.setItemAsync(OPENAI_KEY, key);
    set({ openaiKey: key });
  },

  setRemoveBgKey: async (key) => {
    await SecureStore.setItemAsync(REMOVEBG_KEY, key);
    set({ removeBgKey: key });
  },

  setReplicateKey: async (key) => {
    await AsyncStorage.setItem(REPLICATE_AS_KEY, key);
    set({ replicateKey: key });
  },

  setFashnKey: async (key) => {
    await SecureStore.setItemAsync(FASHN_KEY, key);
    set({ fashnKey: key });
  },

  setAnthropicKey: async (key) => {
    await SecureStore.setItemAsync(ANTHROPIC_KEY, key);
    set({ anthropicKey: key });
  },

  setSupabaseUrl: async (url) => {
    await SecureStore.setItemAsync(SUPABASE_URL_KEY, url);
    invalidateSupabaseClient();
    set({ supabaseUrl: url });
  },

  setSupabaseAnonKey: async (key) => {
    await SecureStore.setItemAsync(SUPABASE_ANON_KEY, key);
    invalidateSupabaseClient();
    set({ supabaseAnonKey: key });
  },

  loadKeys: async () => {
    const [openai, removebg, fashn, anthropic, sbUrl, sbAnon] = await Promise.all([
      SecureStore.getItemAsync(OPENAI_KEY).catch(() => ''),
      SecureStore.getItemAsync(REMOVEBG_KEY).catch(() => ''),
      SecureStore.getItemAsync(FASHN_KEY).catch(() => ''),
      SecureStore.getItemAsync(ANTHROPIC_KEY).catch(() => ''),
      SecureStore.getItemAsync(SUPABASE_URL_KEY).catch(() => ''),
      SecureStore.getItemAsync(SUPABASE_ANON_KEY).catch(() => ''),
    ]);
    // Read replicateKey from AsyncStorage; migrate from old key names on first use
    let replicate = await AsyncStorage.getItem(REPLICATE_AS_KEY).catch(() => null);
    if (!replicate) {
      // Try previous AsyncStorage key name
      const prev = await AsyncStorage.getItem('settings_replicate_key_v2').catch(() => null);
      // Try original SecureStore slot
      const legacy = prev ?? (await SecureStore.getItemAsync('settings_replicate_key').catch(() => null));
      if (legacy) {
        replicate = legacy;
        AsyncStorage.setItem(REPLICATE_AS_KEY, legacy).catch(() => {});
      }
    }
    const next = {
      openaiKey:       openai    ?? '',
      removeBgKey:     removebg  ?? '',
      replicateKey:    replicate ?? '',
      fashnKey:        fashn     ?? '',
      anthropicKey:    anthropic ?? '',
      supabaseUrl:     sbUrl     ?? '',
      supabaseAnonKey: sbAnon    ?? '',
      isLoaded: true,
    };
    set(next);

    function keyStatus(v: string | null) { return v ? v.slice(0, 4) + '…' : 'LEEG'; }
    console.log(
      '[settings] keys geladen —',
      `openai: ${keyStatus(next.openaiKey)}`,
      `replicate: ${keyStatus(next.replicateKey)}`,
      `fashn: ${keyStatus(next.fashnKey)}`,
      `anthropic: ${keyStatus(next.anthropicKey)}`,
      `removebg: ${keyStatus(next.removeBgKey)}`,
      `supabase: ${next.supabaseUrl ? 'geconfigureerd' : 'LEEG'}`,
    );
  },

  // alias so callers can use either name
  loadSettings: async () => {
    await get().loadKeys();
  },
}));
