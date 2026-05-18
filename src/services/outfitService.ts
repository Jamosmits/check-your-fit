import api from './api';
import { Outfit } from '@/store/outfitStore';

export interface CreateOutfitData {
  name?: string;
  items: Array<{ itemId: string; position?: { x: number; y: number } }>;
  occasion?: string;
  season?: string[];
}

export interface UpdateOutfitData extends Partial<CreateOutfitData> {}

export interface AISuggestionContext {
  weatherTemp?: number;
  weatherCondition?: string;
  occasion?: string;
  date?: string;
}

export interface OutfitSuggestion {
  id: string;
  items: string[];
  reason: string;
  occasion?: string;
  weatherMatch?: number;
}

export const outfitService = {
  getOutfits: async (): Promise<Outfit[]> => {
    const response = await api.get<Outfit[]>('/outfits');
    return response.data;
  },

  getOutfit: async (id: string): Promise<Outfit> => {
    const response = await api.get<Outfit>(`/outfits/${id}`);
    return response.data;
  },

  createOutfit: async (data: CreateOutfitData): Promise<Outfit> => {
    const response = await api.post<Outfit>('/outfits', data);
    return response.data;
  },

  updateOutfit: async (id: string, data: UpdateOutfitData): Promise<Outfit> => {
    const response = await api.patch<Outfit>(`/outfits/${id}`, data);
    return response.data;
  },

  deleteOutfit: async (id: string): Promise<void> => {
    await api.delete(`/outfits/${id}`);
  },

  getAISuggestions: async (context: AISuggestionContext): Promise<OutfitSuggestion[]> => {
    const response = await api.post<OutfitSuggestion[]>('/outfits/suggestions', context);
    return response.data;
  },
};
