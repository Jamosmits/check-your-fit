import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { invalidateSupabaseClient } from '@/services/supabase';

// All keys stored in AsyncStorage — no SecureStore
const K = {
  openai:      'settings_openai_key',
  removebg:    'settings_removebg_key',
  replicate:   'replicate_key',
  fashn:       'fashn_key',
  anthropic:   'settings_anthropic_key',
  supabaseUrl: 'settings_supabase_url',
  supabaseAnon:'settings_supabase_anon_key',
} as const;

async function as(key: string): Promise<string> {
  return (await AsyncStorage.getItem(key).catch(() => null)) ?? '';
}

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
  loadSettings: () => Promise<void>;
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
    await AsyncStorage.setItem(K.openai, key);
    set({ openaiKey: key });
  },

  setRemoveBgKey: async (key) => {
    await AsyncStorage.setItem(K.removebg, key);
    set({ removeBgKey: key });
  },

  setReplicateKey: async (key) => {
    await AsyncStorage.setItem(K.replicate, key);
    set({ replicateKey: key });
  },

  setFashnKey: async (key) => {
    await AsyncStorage.setItem(K.fashn, key);
    set({ fashnKey: key });
  },

  setAnthropicKey: async (key) => {
    await AsyncStorage.setItem(K.anthropic, key);
    set({ anthropicKey: key });
  },

  setSupabaseUrl: async (url) => {
    await AsyncStorage.setItem(K.supabaseUrl, url);
    invalidateSupabaseClient();
    set({ supabaseUrl: url });
  },

  setSupabaseAnonKey: async (key) => {
    await AsyncStorage.setItem(K.supabaseAnon, key);
    invalidateSupabaseClient();
    set({ supabaseAnonKey: key });
  },

  loadKeys: async () => {
    const [openai, removebg, replicate, fashn, anthropic, sbUrl, sbAnon] = await Promise.all([
      as(K.openai),
      as(K.removebg),
      as(K.replicate),
      as(K.fashn),
      as(K.anthropic),
      as(K.supabaseUrl),
      as(K.supabaseAnon),
    ]);

    const next = {
      openaiKey:       openai,
      removeBgKey:     removebg,
      replicateKey:    replicate,
      fashnKey:        fashn,
      anthropicKey:    anthropic,
      supabaseUrl:     sbUrl,
      supabaseAnonKey: sbAnon,
      isLoaded:        true,
    };
    set(next);

    function keyStatus(v: string) { return v ? v.slice(0, 4) + '…' : 'LEEG'; }
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

  loadSettings: async () => { await get().loadKeys(); },
}));
