import { ClothingSeason, ClothingFormality } from './ClothingItem';

export type OutfitOccasion =
  | 'work'
  | 'casual'
  | 'date'
  | 'sport'
  | 'travel'
  | 'formal'
  | 'beach'
  | 'outdoor'
  | 'home';

export interface Outfit {
  id: string;
  user_id: string;
  household_id: string | null;
  name: string;
  description: string | null;
  item_ids: string[];
  occasion: OutfitOccasion | null;
  season: ClothingSeason[] | null;
  weather_min: number | null;
  weather_max: number | null;
  formality: ClothingFormality | null;
  tags: string[] | null;
  image_url: string | null;
  wear_count: number;
  last_worn_at: Date | null;
  is_ai_generated: boolean;
  ai_metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOutfitInput {
  name: string;
  description?: string;
  item_ids: string[];
  occasion?: OutfitOccasion;
  season?: ClothingSeason[];
  weather_min?: number;
  weather_max?: number;
  formality?: ClothingFormality;
  tags?: string[];
  image_url?: string;
}

export interface UpdateOutfitInput {
  name?: string;
  description?: string;
  item_ids?: string[];
  occasion?: OutfitOccasion;
  season?: ClothingSeason[];
  weather_min?: number;
  weather_max?: number;
  formality?: ClothingFormality;
  tags?: string[];
  image_url?: string;
}

export interface OutfitSuggestionContext {
  occasion?: OutfitOccasion;
  weather?: {
    temp_c: number;
    condition: string;
  };
  exclude_item_ids?: string[];
  formality?: ClothingFormality;
}

export interface OutfitSuggestion {
  name: string;
  description: string;
  item_ids: string[];
  occasion: OutfitOccasion | null;
  formality: ClothingFormality | null;
  weather_min: number | null;
  weather_max: number | null;
  reasoning: string;
}
