export type TripActivity =
  | 'beach'
  | 'hiking'
  | 'city'
  | 'formal-dinner'
  | 'sports'
  | 'camping'
  | 'swimming'
  | 'skiing'
  | 'business'
  | 'sightseeing';

export interface PacklistItem {
  item_id: string;
  packed: boolean;
  notes?: string;
}

export interface PacklistByUser {
  [userId: string]: PacklistItem[];
}

export interface WeatherCache {
  fetched_at: string;
  forecast: WeatherDay[];
}

export interface WeatherDay {
  date: string;
  max_temp_c: number;
  min_temp_c: number;
  avg_temp_c: number;
  condition: string;
  condition_icon: string;
  chance_of_rain: number;
  humidity: number;
}

export interface Trip {
  id: string;
  household_id: string;
  created_by: string;
  name: string;
  destination: string;
  start_date: Date;
  end_date: Date;
  activities: TripActivity[] | null;
  traveler_ids: string[];
  packlist: PacklistByUser | null;
  weather_cache: WeatherCache | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTripInput {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  activities?: TripActivity[];
  traveler_ids: string[];
  notes?: string;
}

export interface UpdateTripInput {
  name?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  activities?: TripActivity[];
  traveler_ids?: string[];
  notes?: string;
}

export interface UpdatePacklistInput {
  user_id: string;
  item_id: string;
  packed: boolean;
  notes?: string;
}
