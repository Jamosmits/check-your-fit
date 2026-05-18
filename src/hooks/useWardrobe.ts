import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wardrobeService, CreateItemData, UpdateItemData } from '@/services/wardrobeService';
import { useWardrobeStore, WardrobeFilters } from '@/store/wardrobeStore';

const WARDROBE_KEY = 'wardrobe';

export function useWardrobeItems(filters?: WardrobeFilters) {
  const setItems = useWardrobeStore((s) => s.setItems);

  return useQuery({
    queryKey: [WARDROBE_KEY, 'items', filters],
    queryFn: async () => {
      const result = await wardrobeService.getItems(filters);
      setItems(result.data);
      return result;
    },
  });
}

export function useWardrobeItem(id: string) {
  return useQuery({
    queryKey: [WARDROBE_KEY, 'item', id],
    queryFn: () => wardrobeService.getItem(id),
    enabled: !!id,
  });
}

export function useCreateWardrobeItem() {
  const queryClient = useQueryClient();
  const addItem = useWardrobeStore((s) => s.addItem);

  return useMutation({
    mutationFn: (data: CreateItemData) => wardrobeService.createItem(data),
    onSuccess: (item) => {
      addItem(item);
      queryClient.invalidateQueries({ queryKey: [WARDROBE_KEY] });
    },
  });
}

export function useUpdateWardrobeItem() {
  const queryClient = useQueryClient();
  const updateItem = useWardrobeStore((s) => s.updateItem);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateItemData }) =>
      wardrobeService.updateItem(id, data),
    onSuccess: (item) => {
      updateItem(item.id, item);
      queryClient.invalidateQueries({ queryKey: [WARDROBE_KEY] });
    },
  });
}

export function useDeleteWardrobeItem() {
  const queryClient = useQueryClient();
  const removeItem = useWardrobeStore((s) => s.removeItem);

  return useMutation({
    mutationFn: (id: string) => wardrobeService.deleteItem(id),
    onSuccess: (_, id) => {
      removeItem(id);
      queryClient.invalidateQueries({ queryKey: [WARDROBE_KEY] });
    },
  });
}

export function useMarkWorn() {
  const queryClient = useQueryClient();
  const updateItem = useWardrobeStore((s) => s.updateItem);

  return useMutation({
    mutationFn: (id: string) => wardrobeService.markWorn(id),
    onSuccess: (item) => {
      updateItem(item.id, item);
      queryClient.invalidateQueries({ queryKey: [WARDROBE_KEY] });
    },
  });
}
