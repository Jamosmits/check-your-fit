import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const OPENAI_KEY   = 'settings_openai_key';
const REMOVEBG_KEY = 'settings_removebg_key';

interface SettingsState {
  openaiKey:   string;
  removeBgKey: string;
  isLoaded:    boolean;
  setOpenaiKey:   (key: string) => Promise<void>;
  setRemoveBgKey: (key: string) => Promise<void>;
  loadKeys: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  openaiKey:   '',
  removeBgKey: '',
  isLoaded:    false,

  setOpenaiKey: async (key) => {
    await SecureStore.setItemAsync(OPENAI_KEY, key);
    set({ openaiKey: key });
  },

  setRemoveBgKey: async (key) => {
    await SecureStore.setItemAsync(REMOVEBG_KEY, key);
    set({ removeBgKey: key });
  },

  loadKeys: async () => {
    const [openai, removebg] = await Promise.all([
      SecureStore.getItemAsync(OPENAI_KEY).catch(() => ''),
      SecureStore.getItemAsync(REMOVEBG_KEY).catch(() => ''),
    ]);
    set({ openaiKey: openai ?? '', removeBgKey: removebg ?? '', isLoaded: true });
  },
}));
