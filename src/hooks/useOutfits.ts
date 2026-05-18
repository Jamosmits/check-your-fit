import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  outfitService,
  CreateOutfitData,
  UpdateOutfitData,
  AISuggestionContext,
} from '@/services/outfitService';
import { useOutfitStore } from '@/store/outfitStore';

const OUTFITS_KEY = 'outfits';

export function useOutfits() {
  const setOutfits = useOutfitStore((s) => s.setOutfits);

  return useQuery({
    queryKey: [OUTFITS_KEY],
    queryFn: async () => {
      const outfits = await outfitService.getOutfits();
      setOutfits(outfits);
      return outfits;
    },
  });
}

export function useOutfit(id: string) {
  return useQuery({
    queryKey: [OUTFITS_KEY, id],
    queryFn: () => outfitService.getOutfit(id),
    enabled: !!id,
  });
}

export function useCreateOutfit() {
  const queryClient = useQueryClient();
  const addOutfit = useOutfitStore((s) => s.addOutfit);

  return useMutation({
    mutationFn: (data: CreateOutfitData) => outfitService.createOutfit(data),
    onSuccess: (outfit) => {
      addOutfit(outfit);
      queryClient.invalidateQueries({ queryKey: [OUTFITS_KEY] });
    },
  });
}

export function useUpdateOutfit() {
  const queryClient = useQueryClient();
  const updateOutfit = useOutfitStore((s) => s.updateOutfit);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOutfitData }) =>
      outfitService.updateOutfit(id, data),
    onSuccess: (outfit) => {
      updateOutfit(outfit.id, outfit);
      queryClient.invalidateQueries({ queryKey: [OUTFITS_KEY] });
    },
  });
}

export function useDeleteOutfit() {
  const queryClient = useQueryClient();
  const removeOutfit = useOutfitStore((s) => s.removeOutfit);

  return useMutation({
    mutationFn: (id: string) => outfitService.deleteOutfit(id),
    onSuccess: (_, id) => {
      removeOutfit(id);
      queryClient.invalidateQueries({ queryKey: [OUTFITS_KEY] });
    },
  });
}

export function useAISuggestions(context: AISuggestionContext) {
  return useQuery({
    queryKey: [OUTFITS_KEY, 'suggestions', context],
    queryFn: () => outfitService.getAISuggestions(context),
    enabled: Object.keys(context).length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
