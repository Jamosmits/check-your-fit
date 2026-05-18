import api from './api';

export interface PackingItem {
  id: string;
  tripId: string;
  wardrobeItemId?: string;
  name: string;
  category: string;
  isPacked: boolean;
  isSuggested: boolean;
}

export interface Trip {
  id: string;
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
  occasions: string[];
  packingList: PackingItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripData {
  destination: string;
  startDate: string;
  endDate: string;
  occasions: string[];
  notes?: string;
}

export interface UpdateTripData extends Partial<CreateTripData> {
  packingList?: Array<{ id: string; isPacked: boolean }>;
}

export const tripService = {
  getTrips: async (): Promise<Trip[]> => {
    const response = await api.get<Trip[]>('/trips');
    return response.data;
  },

  getTrip: async (id: string): Promise<Trip> => {
    const response = await api.get<Trip>(`/trips/${id}`);
    return response.data;
  },

  createTrip: async (data: CreateTripData): Promise<Trip> => {
    const response = await api.post<Trip>('/trips', data);
    return response.data;
  },

  updateTrip: async (id: string, data: UpdateTripData): Promise<Trip> => {
    const response = await api.patch<Trip>(`/trips/${id}`, data);
    return response.data;
  },

  deleteTrip: async (id: string): Promise<void> => {
    await api.delete(`/trips/${id}`);
  },
};
