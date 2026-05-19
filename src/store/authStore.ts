import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isDemo: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isDemo: false,
  isLoading: true,

  setAuth: async (user: User, token: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user, token, isDemo: false });
  },

  loginAsDemo: () => {
    // Import here to avoid circular deps at module init time
    const { DEMO_USER, DEMO_ITEMS, DEMO_OUTFITS, DEMO_HOUSEHOLD, DEMO_MEMBERS } =
      require('@/data/demoData') as typeof import('@/data/demoData');
    const { useWardrobeStore } = require('@/store/wardrobeStore') as typeof import('@/store/wardrobeStore');
    const { useOutfitStore } = require('@/store/outfitStore') as typeof import('@/store/outfitStore');
    const { useHouseholdStore } = require('@/store/householdStore') as typeof import('@/store/householdStore');

    useWardrobeStore.getState().setItems(DEMO_ITEMS);
    useOutfitStore.getState().setOutfits(DEMO_OUTFITS);
    useHouseholdStore.getState().setHousehold(DEMO_HOUSEHOLD);
    useHouseholdStore.getState().setMembers(DEMO_MEMBERS);

    set({ user: DEMO_USER, token: 'demo-token', isDemo: true, isLoading: false });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    // Clear demo data from stores on logout
    const { useWardrobeStore } = require('@/store/wardrobeStore') as typeof import('@/store/wardrobeStore');
    const { useOutfitStore } = require('@/store/outfitStore') as typeof import('@/store/outfitStore');
    const { useHouseholdStore } = require('@/store/householdStore') as typeof import('@/store/householdStore');
    useWardrobeStore.getState().setItems([]);
    useOutfitStore.getState().setOutfits([]);
    useHouseholdStore.getState().setHousehold(null);
    useHouseholdStore.getState().setMembers([]);
    set({ user: null, token: null, isDemo: false });
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        set({ user, token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
