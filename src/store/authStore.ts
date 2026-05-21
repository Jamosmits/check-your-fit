import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface ModelPoses {
  front: string;
  side: string | null;
  back: string | null;
}

export interface BodyMeasurements {
  heightCm?: number;
  weightKg?: number;
  clothingSize?: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
  shoeSize?: string;
  gender?: 'male' | 'female' | 'other';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isDemo: boolean;
  isLoading: boolean;
  bodyPhotoUri: string | null;
  modelPhotoUrl: string | null;
  modelPoses: ModelPoses | null;
  bodyMeasurements: BodyMeasurements | null;
  setBodyPhoto: (uri: string | null) => Promise<void>;
  setModelPhotoUrl: (url: string | null) => Promise<void>;
  setModelPoses: (poses: ModelPoses | null) => Promise<void>;
  setBodyMeasurements: (m: BodyMeasurements) => Promise<void>;
  setAuth: (user: User, token: string) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

const TOKEN_KEY          = 'auth_token';
const USER_KEY           = 'auth_user';
const BODY_PHOTO_KEY     = 'body_photo_uri';
const MODEL_PHOTO_KEY    = 'model_photo_url';
const MODEL_POSES_KEY    = 'model_poses_json';
const MEASUREMENTS_KEY   = 'body_measurements_json';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isDemo: false,
  isLoading: true,
  bodyPhotoUri: null,
  modelPhotoUrl: null,
  modelPoses: null,
  bodyMeasurements: null,

  setBodyPhoto: async (uri) => {
    if (uri) {
      await SecureStore.setItemAsync(BODY_PHOTO_KEY, uri).catch(() => {});
    } else {
      await SecureStore.deleteItemAsync(BODY_PHOTO_KEY).catch(() => {});
    }
    set({ bodyPhotoUri: uri });
  },

  setModelPhotoUrl: async (url) => {
    if (url) {
      await SecureStore.setItemAsync(MODEL_PHOTO_KEY, url).catch(() => {});
    } else {
      await SecureStore.deleteItemAsync(MODEL_PHOTO_KEY).catch(() => {});
    }
    set({ modelPhotoUrl: url });
  },

  setModelPoses: async (poses) => {
    if (poses) {
      await SecureStore.setItemAsync(MODEL_POSES_KEY, JSON.stringify(poses)).catch(() => {});
    } else {
      await SecureStore.deleteItemAsync(MODEL_POSES_KEY).catch(() => {});
    }
    set({ modelPoses: poses });
  },

  setBodyMeasurements: async (m) => {
    await SecureStore.setItemAsync(MEASUREMENTS_KEY, JSON.stringify(m)).catch(() => {});
    set({ bodyMeasurements: m });
  },

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
      const [token, userJson, bodyPhoto, modelPhoto, posesJson, measurementsJson] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY).catch(() => null),
        SecureStore.getItemAsync(USER_KEY).catch(() => null),
        SecureStore.getItemAsync(BODY_PHOTO_KEY).catch(() => null),
        SecureStore.getItemAsync(MODEL_PHOTO_KEY).catch(() => null),
        SecureStore.getItemAsync(MODEL_POSES_KEY).catch(() => null),
        SecureStore.getItemAsync(MEASUREMENTS_KEY).catch(() => null),
      ]);
      const modelPoses        = posesJson        ? (JSON.parse(posesJson) as ModelPoses) : null;
      const bodyMeasurements  = measurementsJson ? (JSON.parse(measurementsJson) as BodyMeasurements) : null;
      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        set({ user, token, isLoading: false, bodyPhotoUri: bodyPhoto ?? null, modelPhotoUrl: modelPhoto ?? null, modelPoses, bodyMeasurements });
      } else {
        set({ isLoading: false, bodyPhotoUri: bodyPhoto ?? null, modelPhotoUrl: modelPhoto ?? null, modelPoses, bodyMeasurements });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
