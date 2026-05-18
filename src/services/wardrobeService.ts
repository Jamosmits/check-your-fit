import api from './api';
import { ClothingItem, WardrobeFilters } from '@/store/wardrobeStore';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateItemData {
  imageUrl: string;
  thumbnailUrl?: string;
  category: ClothingItem['category'];
  subcategory?: string;
  brand?: string;
  color?: string;
  colors?: string[];
  season?: string[];
  notes?: string;
}

export interface UpdateItemData extends Partial<CreateItemData> {}

export const wardrobeService = {
  getItems: async (filters?: WardrobeFilters): Promise<PaginatedResponse<ClothingItem>> => {
    const params: Record<string, string | undefined> = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.color) params.color = filters.color;
    if (filters?.brand) params.brand = filters.brand;
    if (filters?.season) params.season = filters.season;
    if (filters?.search) params.search = filters.search;
    if (filters?.sortBy) params.sortBy = filters.sortBy;

    const response = await api.get<PaginatedResponse<ClothingItem>>('/wardrobe/items', { params });
    return response.data;
  },

  getItem: async (id: string): Promise<ClothingItem> => {
    const response = await api.get<ClothingItem>(`/wardrobe/items/${id}`);
    return response.data;
  },

  createItem: async (data: CreateItemData): Promise<ClothingItem> => {
    const response = await api.post<ClothingItem>('/wardrobe/items', data);
    return response.data;
  },

  updateItem: async (id: string, data: UpdateItemData): Promise<ClothingItem> => {
    const response = await api.patch<ClothingItem>(`/wardrobe/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id: string): Promise<void> => {
    await api.delete(`/wardrobe/items/${id}`);
  },

  markWorn: async (id: string): Promise<ClothingItem> => {
    const response = await api.post<ClothingItem>(`/wardrobe/items/${id}/worn`);
    return response.data;
  },
};
