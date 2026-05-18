import api from './api';

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  conditionCode: string;
  humidity: number;
  windSpeed: number;
  windUnit: string;
  icon: string;
  location: string;
  timestamp: string;
}

export interface WeatherForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
  conditionCode: string;
  icon: string;
  precipitation: number;
}

export interface DestinationWeather {
  location: string;
  forecast: WeatherForecast[];
  averageTemp: number;
  dominantCondition: string;
}

export const weatherService = {
  getWeather: async (lat: number, lng: number): Promise<WeatherData> => {
    const response = await api.get<WeatherData>('/weather/current', {
      params: { lat, lng },
    });
    return response.data;
  },

  getWeatherForDestination: async (
    city: string,
    startDate: string,
    endDate: string,
  ): Promise<DestinationWeather> => {
    const response = await api.get<DestinationWeather>('/weather/destination', {
      params: { city, startDate, endDate },
    });
    return response.data;
  },
};
