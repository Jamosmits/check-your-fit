import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const OPENAI_KEY    = 'settings_openai_key';
const REMOVEBG_KEY  = 'settings_removebg_key';
const REPLICATE_KEY = 'settings_replicate_key';

interface SettingsState {
  openaiKey:    string;
  removeBgKey:  string;
  replicateKey: string;
  isLoaded:     boolean;
  setOpenaiKey:    (key: string) => Promise<void>;
  setRemoveBgKey:  (key: string) => Promise<void>;
  setReplicateKey: (key: string) => Promise<void>;
  loadKeys: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  openaiKey:    '',
  removeBgKey:  '',
  replicateKey: '',
  isLoaded:     false,

  setOpenaiKey: async (key) => {
    await SecureStore.setItemAsync(OPENAI_KEY, key);
    set({ openaiKey: key });
  },

  setRemoveBgKey: async (key) => {
    await SecureStore.setItemAsync(REMOVEBG_KEY, key);
    set({ removeBgKey: key });
  },

  setReplicateKey: async (key) => {
    await SecureStore.setItemAsync(REPLICATE_KEY, key);
    set({ replicateKey: key });
  },

  loadKeys: async () => {
    const [openai, removebg, replicate] = await Promise.all([
      SecureStore.getItemAsync(OPENAI_KEY).catch(() => ''),
      SecureStore.getItemAsync(REMOVEBG_KEY).catch(() => ''),
      SecureStore.getItemAsync(REPLICATE_KEY).catch(() => ''),
    ]);
    set({
      openaiKey:    openai    ?? '',
      removeBgKey:  removebg  ?? '',
      replicateKey: replicate ?? '',
      isLoaded: true,
    });
  },
}));
