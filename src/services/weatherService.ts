import axios from 'axios';

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
  clothingRecommendation: string;
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

const WMO_CONDITIONS: Record<number, { label: string; icon: string }> = {
  0:  { label: 'Zonnig',               icon: 'sunny' },
  1:  { label: 'Overwegend zonnig',     icon: 'sunny' },
  2:  { label: 'Deels bewolkt',         icon: 'partly-sunny' },
  3:  { label: 'Bewolkt',              icon: 'cloudy' },
  45: { label: 'Mist',                 icon: 'cloudy' },
  48: { label: 'IJsmist',              icon: 'cloudy' },
  51: { label: 'Lichte motregen',      icon: 'rainy' },
  53: { label: 'Motregen',             icon: 'rainy' },
  55: { label: 'Zware motregen',       icon: 'rainy' },
  61: { label: 'Lichte regen',         icon: 'rainy' },
  63: { label: 'Regen',               icon: 'rainy' },
  65: { label: 'Zware regen',          icon: 'rainy' },
  71: { label: 'Lichte sneeuw',        icon: 'snow' },
  73: { label: 'Sneeuw',              icon: 'snow' },
  75: { label: 'Zware sneeuw',         icon: 'snow' },
  80: { label: 'Lichte regenbuien',    icon: 'rainy' },
  81: { label: 'Regenbuien',           icon: 'rainy' },
  82: { label: 'Zware regenbuien',     icon: 'rainy' },
  95: { label: 'Onweer',              icon: 'thunderstorm' },
  96: { label: 'Onweer met hagel',     icon: 'thunderstorm' },
  99: { label: 'Zwaar onweer',         icon: 'thunderstorm' },
};

function getClothingTip(temp: number, conditionCode: number): string {
  const isRainy = [51,53,55,61,63,65,80,81,82,95,96,99].includes(conditionCode);
  if (isRainy) return `${temp < 10 ? 'Warme jas en' : 'Lichte regenjas,'} neem een paraplu mee.`;
  if (temp < 0)  return 'Zware winterjas, muts, sjaal en handschoenen nodig.';
  if (temp < 5)  return 'Dikke jas en laagjes aanbevolen.';
  if (temp < 10) return 'Warme jas nodig, laagjes aanbevolen.';
  if (temp < 15) return 'Lichte jas of dikke trui volstaat.';
  if (temp < 20) return 'T-shirt met een dun jasje erboven.';
  if (temp < 25) return 'Lekker zomers gekleed, eventueel een dun laagje.';
  return 'Zomerse outfit — houd het luchtig en licht.';
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': 'CheckYourFit/1.0' }, timeout: 4000 },
    );
    const addr = res.data?.address;
    return addr?.city ?? addr?.town ?? addr?.village ?? addr?.county ?? 'Huidige locatie';
  } catch {
    return 'Huidige locatie';
  }
}

export const weatherService = {
  getWeather: async (lat: number, lng: number): Promise<WeatherData> => {
    const [weatherRes, location] = await Promise.all([
      axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: lat,
          longitude: lng,
          current: 'temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m',
          wind_speed_unit: 'kmh',
          timezone: 'auto',
        },
        timeout: 8000,
      }),
      reverseGeocode(lat, lng),
    ]);

    const current = weatherRes.data.current;
    const code: number = current.weathercode;
    const condition = WMO_CONDITIONS[code] ?? { label: 'Onbekend', icon: 'partly-sunny' };
    const temp = Math.round(current.temperature_2m);

    return {
      temperature: temp,
      feelsLike: Math.round(current.apparent_temperature),
      condition: condition.label,
      conditionCode: String(code),
      humidity: current.relativehumidity_2m,
      windSpeed: Math.round(current.windspeed_10m),
      windUnit: 'km/h',
      icon: condition.icon,
      location,
      timestamp: current.time,
      clothingRecommendation: getClothingTip(temp, code),
    };
  },

  getWeatherForDestination: async (
    city: string,
    _startDate: string,
    _endDate: string,
  ): Promise<DestinationWeather> => {
    // Geocode city → coordinates
    const geoRes = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: { name: city, count: 1, language: 'nl', format: 'json' },
      timeout: 6000,
    });
    const place = geoRes.data?.results?.[0];
    if (!place) throw new Error(`Stad "${city}" niet gevonden`);

    const forecastRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: place.latitude,
        longitude: place.longitude,
        daily: 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max',
        timezone: 'auto',
        forecast_days: 7,
      },
      timeout: 8000,
    });

    const daily = forecastRes.data.daily;
    const forecast: WeatherForecast[] = daily.time.map((date: string, i: number) => {
      const code: number = daily.weathercode[i];
      return {
        date,
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        condition: WMO_CONDITIONS[code]?.label ?? 'Onbekend',
        conditionCode: String(code),
        icon: WMO_CONDITIONS[code]?.icon ?? 'partly-sunny',
        precipitation: daily.precipitation_probability_max[i] ?? 0,
      };
    });

    const avgTemp = Math.round(
      forecast.reduce((s, d) => s + (d.high + d.low) / 2, 0) / forecast.length,
    );

    return {
      location: place.name,
      forecast,
      averageTemp: avgTemp,
      dominantCondition: forecast[0].condition,
    };
  },
};
