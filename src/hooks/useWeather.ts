import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { weatherService, WeatherData } from '@/services/weatherService';

interface UseWeatherReturn {
  weather: WeatherData | undefined;
  isLoading: boolean;
  error: Error | null;
  locationPermission: Location.PermissionStatus | null;
  refetch: () => void;
}

export function useWeather(): UseWeatherReturn {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] =
    useState<Location.PermissionStatus | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === Location.PermissionStatus.GRANTED) {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setCoords({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        } catch {
          // Location unavailable
        }
      }
    })();
  }, []);

  const query = useQuery({
    queryKey: ['weather', coords],
    queryFn: () => {
      if (!coords) throw new Error('No coordinates');
      return weatherService.getWeather(coords.lat, coords.lng);
    },
    enabled: !!coords,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  return {
    weather: query.data,
    isLoading: query.isLoading,
    error: query.error,
    locationPermission,
    refetch: query.refetch,
  };
}
