import api from './api';

export interface ShoppingSuggestion {
  id: string;
  name: string;
  brand?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  productUrl: string;
  compatibleItems: string[];
  compatibilityScore: number;
  reason: string;
  category: string;
}

export interface WardrobeGap {
  category: string;
  subcategory?: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedItems?: ShoppingSuggestion[];
}

export interface CompatibilityResult {
  isCompatible: boolean;
  score: number;
  matches: Array<{
    itemId: string;
    itemName: string;
    matchScore: number;
  }>;
  styleAnalysis: string;
  productName?: string;
  productImageUrl?: string;
}

export const shoppingService = {
  getSuggestions: async (): Promise<ShoppingSuggestion[]> => {
    const response = await api.get<ShoppingSuggestion[]>('/shopping/suggestions');
    return response.data;
  },

  checkProductCompatibility: async (url: string): Promise<CompatibilityResult> => {
    const response = await api.post<CompatibilityResult>('/shopping/compatibility', { url });
    return response.data;
  },

  getWardrobeGaps: async (): Promise<WardrobeGap[]> => {
    const response = await api.get<WardrobeGap[]>('/shopping/gaps');
    return response.data;
  },
};
