import api from './api';
import { ClothingItem } from '@/store/wardrobeStore';

export type ScanJobStatus = 'pending' | 'uploading' | 'analyzing' | 'cataloging' | 'completed' | 'failed';

export interface ScanJob {
  id: string;
  status: ScanJobStatus;
  progress: number;
  itemsFound?: number;
  results?: ScannedItem[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScannedItem {
  id: string;
  jobId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: ClothingItem['category'];
  subcategory?: string;
  brand?: string;
  color?: string;
  colors?: string[];
  season?: string[];
  confidence: number;
}

export interface StartScanResponse {
  jobId: string;
  uploadUrl?: string;
}

export const scanService = {
  startScan: async (photos: string[]): Promise<StartScanResponse> => {
    const formData = new FormData();
    photos.forEach((uri, index) => {
      const filename = uri.split('/').pop() ?? `photo_${index}.jpg`;
      formData.append('photos', {
        uri,
        name: filename,
        type: 'image/jpeg',
      } as unknown as Blob);
    });

    const response = await api.post<StartScanResponse>('/scan/start', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getScanStatus: async (jobId: string): Promise<ScanJob> => {
    const response = await api.get<ScanJob>(`/scan/jobs/${jobId}`);
    return response.data;
  },

  confirmScanResults: async (
    jobId: string,
    confirmed: string[],
    rejected: string[],
  ): Promise<ClothingItem[]> => {
    const response = await api.post<ClothingItem[]>(`/scan/jobs/${jobId}/confirm`, {
      confirmed,
      rejected,
    });
    return response.data;
  },
};
