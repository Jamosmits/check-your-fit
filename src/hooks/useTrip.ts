import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripService, CreateTripData, UpdateTripData, Trip } from '@/services/tripService';

const TRIPS_KEY = 'trips';

export function useTrips() {
  return useQuery({
    queryKey: [TRIPS_KEY],
    queryFn: () => tripService.getTrips(),
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: [TRIPS_KEY, id],
    queryFn: () => tripService.getTrip(id),
    enabled: !!id,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTripData) => tripService.createTrip(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY] });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTripData }) =>
      tripService.updateTrip(id, data),
    onSuccess: (trip: Trip) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY] });
      queryClient.setQueryData([TRIPS_KEY, trip.id], trip);
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tripService.deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_KEY] });
    },
  });
}
