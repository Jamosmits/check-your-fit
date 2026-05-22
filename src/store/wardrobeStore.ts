import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ClothingItem {
  id: string;
  userId: string;
  householdId?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  processedPhotoUrl?: string;
  description?: string;
  category: 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'dresses';
  subcategory?: string;
  brand?: string;
  color?: string;
  colors?: string[];
  colorNames?: string[];
  season?: string[];
  notes?: string;
  timesWorn: number;
  lastWornAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WardrobeFilters {
  category?: ClothingItem['category'];
  color?: string;
  brand?: string;
  season?: string;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'mostWorn' | 'leastWorn';
}

interface WardrobeState {
  items: ClothingItem[];
  filters: WardrobeFilters;
  setItems: (items: ClothingItem[]) => void;
  addItem: (item: ClothingItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<ClothingItem>) => void;
  setFilters: (filters: WardrobeFilters) => void;
  resetFilters: () => void;
}

export const useWardrobeStore = create<WardrobeState>()(
  persist(
    (set) => ({
      items: [],
      filters: {},

      setItems: (items) => set({ items }),

      addItem: (item) =>
        set((state) => ({ items: [item, ...state.items] })),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),

      setFilters: (filters) => set({ filters }),

      resetFilters: () => set({ filters: {} }),
    }),
    {
      name: 'wardrobe-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist items — filters are session-only
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
