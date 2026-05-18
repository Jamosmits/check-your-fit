import { create } from 'zustand';

export interface OutfitItem {
  itemId: string;
  position?: { x: number; y: number };
}

export interface Outfit {
  id: string;
  userId: string;
  name?: string;
  items: OutfitItem[];
  occasion?: string;
  season?: string[];
  timesWorn: number;
  lastWornAt?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface OutfitState {
  outfits: Outfit[];
  setOutfits: (outfits: Outfit[]) => void;
  addOutfit: (outfit: Outfit) => void;
  removeOutfit: (id: string) => void;
  updateOutfit: (id: string, updates: Partial<Outfit>) => void;
}

export const useOutfitStore = create<OutfitState>((set) => ({
  outfits: [],

  setOutfits: (outfits) => set({ outfits }),

  addOutfit: (outfit) =>
    set((state) => ({ outfits: [outfit, ...state.outfits] })),

  removeOutfit: (id) =>
    set((state) => ({ outfits: state.outfits.filter((o) => o.id !== id) })),

  updateOutfit: (id, updates) =>
    set((state) => ({
      outfits: state.outfits.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    })),
}));
