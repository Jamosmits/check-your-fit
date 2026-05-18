import { AIDetectedItem } from './ClothingItem';

export type ScanJobStatus =
  | 'pending'
  | 'processing'
  | 'awaiting_confirmation'
  | 'completed'
  | 'failed';

export interface ScanJob {
  id: string;
  user_id: string;
  status: ScanJobStatus;
  progress: number;
  source_urls: string[];
  detected_items: AIDetectedItem[] | null;
  confirmed_items: string[] | null;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface StartScanInput {
  source_urls: string[];
}

export interface ConfirmScanInput {
  confirmed_items: ConfirmedItemInput[];
}

export interface ConfirmedItemInput {
  name: string;
  category: string;
  subcategory?: string;
  color?: string;
  colors?: string[];
  brand?: string;
  size?: string;
  material?: string;
  pattern?: string;
  formality?: string;
  season?: string[];
  tags?: string[];
  image_url?: string;
  thumbnail_url?: string;
  notes?: string;
  ai_metadata?: Record<string, unknown>;
}

export interface ScanStatusResponse {
  job_id: string;
  status: ScanJobStatus;
  progress: number;
  detected_items: AIDetectedItem[] | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}
