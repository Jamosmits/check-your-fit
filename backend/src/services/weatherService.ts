import axios from 'axios';
import { WeatherDay } from '../models/Trip';

interface WeatherAPICurrentResponse {
  location: {
    name: string;
    country: string;
    localtime: string;
  };
  current: {
    temp_c: number;
    feelslike_c: number;
    humidity: number;
    condition: {
      text: string;
      icon: string;
    };
    wind_kph: number;
    precip_mm: number;
    uv: number;
  };
}

interface WeatherAPIForecastResponse {
  location: {
    name: string;
    country: string;
  };
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        avghumidity: number;
        daily_chance_of_rain: number;
        condition: {
          text: string;
          icon: string;
        };
      };
    }>;
  };
}

interface CurrentWeatherData {
  location: string;
  country: string;
  temp_c: number;
  feels_like_c: number;
  humidity: number;
  condition: string;
  condition_icon: string;
  wind_kph: number;
  precip_mm: number;
  uv_index: number;
  local_time: string;
}

function getApiKey(): string {
  const key = process.env['WEATHER_API_KEY'];
  if (!key) throw new Error('WEATHER_API_KEY is not configured');
  return key;
}

const BASE_URL = 'https://api.weatherapi.com/v1';

// ── getWeatherForecast ────────────────────────────────────────────────────────

export async function getWeatherForecast(location: string, days: number): Promise<WeatherDay[]> {
  const apiKey = getApiKey();
  const clampedDays = Math.min(Math.max(days, 1), 14);

  const response = await axios.get<WeatherAPIForecastResponse>(`${BASE_URL}/forecast.json`, {
    params: {
      key: apiKey,
      q: location,
      days: clampedDays,
      aqi: 'no',
      alerts: 'no',
    },
    timeout: 10000,
  });

  const forecastDays = response.data.forecast.forecastday;

  return forecastDays.map((day) => ({
    date: day.date,
    max_temp_c: day.day.maxtemp_c,
    min_temp_c: day.day.mintemp_c,
    avg_temp_c: day.day.avgtemp_c,
    condition: day.day.condition.text,
    condition_icon: `https:${day.day.condition.icon}`,
    chance_of_rain: day.day.daily_chance_of_rain,
    humidity: day.day.avghumidity,
  }));
}

// ── getCurrentWeatherData ─────────────────────────────────────────────────────

export async function getCurrentWeatherData(location: string): Promise<CurrentWeatherData> {
  const apiKey = getApiKey();

  const response = await axios.get<WeatherAPICurrentResponse>(`${BASE_URL}/current.json`, {
    params: {
      key: apiKey,
      q: location,
      aqi: 'no',
    },
    timeout: 10000,
  });

  const { current, location: loc } = response.data;

  return {
    location: loc.name,
    country: loc.country,
    temp_c: current.temp_c,
    feels_like_c: current.feelslike_c,
    humidity: current.humidity,
    condition: current.condition.text,
    condition_icon: `https:${current.condition.icon}`,
    wind_kph: current.wind_kph,
    precip_mm: current.precip_mm,
    uv_index: current.uv,
    local_time: loc.localtime,
  };
}
