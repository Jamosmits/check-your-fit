export type ClothingCategory =
  | 'tops'
  | 'bottoms'
  | 'shoes'
  | 'outerwear'
  | 'accessories'
  | 'underwear'
  | 'activewear'
  | 'swimwear'
  | 'sleepwear'
  | 'formalwear'
  | 'other';

export type ClothingSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export type ClothingFormality = 'casual' | 'smart-casual' | 'formal' | 'athletic';

export interface ClothingItem {
  id: string;
  user_id: string;
  household_id: string | null;
  name: string;
  category: ClothingCategory;
  subcategory: string | null;
  color: string | null;
  colors: string[] | null;
  brand: string | null;
  size: string | null;
  material: string | null;
  pattern: string | null;
  formality: ClothingFormality | null;
  season: ClothingSeason[] | null;
  tags: string[] | null;
  image_url: string | null;
  thumbnail_url: string | null;
  original_image_url: string | null;
  wear_count: number;
  last_worn_at: Date | null;
  purchase_date: Date | null;
  purchase_price: number | null;
  notes: string | null;
  is_active: boolean;
  ai_metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateClothingItemInput {
  name: string;
  category: ClothingCategory;
  subcategory?: string;
  color?: string;
  colors?: string[];
  brand?: string;
  size?: string;
  material?: string;
  pattern?: string;
  formality?: ClothingFormality;
  season?: ClothingSeason[];
  tags?: string[];
  image_url?: string;
  thumbnail_url?: string;
  original_image_url?: string;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  ai_metadata?: Record<string, unknown>;
}

export interface UpdateClothingItemInput {
  name?: string;
  category?: ClothingCategory;
  subcategory?: string;
  color?: string;
  colors?: string[];
  brand?: string;
  size?: string;
  material?: string;
  pattern?: string;
  formality?: ClothingFormality;
  season?: ClothingSeason[];
  tags?: string[];
  image_url?: string;
  thumbnail_url?: string;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  is_active?: boolean;
}

export interface ClothingItemFilter {
  category?: ClothingCategory;
  season?: ClothingSeason;
  formality?: ClothingFormality;
  color?: string;
  tags?: string[];
  search?: string;
  is_active?: boolean;
  user_id?: string;
}

export interface AIDetectedItem {
  name: string;
  category: ClothingCategory;
  subcategory?: string;
  color?: string;
  colors?: string[];
  brand?: string;
  material?: string;
  pattern?: string;
  formality?: ClothingFormality;
  season?: ClothingSeason[];
  tags?: string[];
  confidence: number;
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
