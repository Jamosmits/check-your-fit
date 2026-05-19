import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWardrobeStore, ClothingItem, WardrobeFilters } from '@/store/wardrobeStore';
import { useAuthStore } from '@/store/authStore';
import { CreateItemData, UpdateItemData } from '@/services/wardrobeService';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyFilters(items: ClothingItem[], filters?: WardrobeFilters): ClothingItem[] {
  let result = [...items];

  if (filters?.category) result = result.filter((i) => i.category === filters.category);
  if (filters?.color)    result = result.filter((i) => i.colors?.includes(filters.color!) || i.color === filters.color);
  if (filters?.brand)    result = result.filter((i) => i.brand?.toLowerCase().includes(filters.brand!.toLowerCase()));
  if (filters?.season)   result = result.filter((i) => i.season?.includes(filters.season!));
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (i) =>
        i.category.includes(q) ||
        i.subcategory?.toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q),
    );
  }

  switch (filters?.sortBy) {
    case 'oldest':   result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));  break;
    case 'mostWorn': result.sort((a, b) => (b.timesWorn ?? 0) - (a.timesWorn ?? 0)); break;
    case 'leastWorn':result.sort((a, b) => (a.timesWorn ?? 0) - (b.timesWorn ?? 0)); break;
    default:         result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));  break; // newest
  }

  return result;
}

// ── hooks ─────────────────────────────────────────────────────────────────────

export function useWardrobeItems(filters?: WardrobeFilters) {
  const allItems = useWardrobeStore((s) => s.items);

  const data = useMemo(() => applyFilters(allItems, filters), [allItems, filters]);

  return {
    data,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve({ data }),
  };
}

export function useWardrobeItem(id: string) {
  const items = useWardrobeStore((s) => s.items);
  const item  = items.find((i) => i.id === id);

  return {
    data: item ?? null,
    isLoading: false,
    error: item ? null : new Error(`Item ${id} niet gevonden`),
  };
}

export function useCreateWardrobeItem() {
  const addItem = useWardrobeStore((s) => s.addItem);
  const userId  = useAuthStore((s) => s.user?.id ?? 'local');

  return useMutation({
    mutationFn: async (data: CreateItemData): Promise<ClothingItem> => {
      const now = new Date().toISOString();
      return {
        id:        makeId(),
        userId,
        imageUrl:  data.imageUrl,
        category:  data.category,
        subcategory: data.subcategory,
        brand:     data.brand,
        color:     data.color,
        colors:    data.colors ?? [],
        season:    data.season ?? [],
        notes:     data.notes,
        timesWorn: 0,
        createdAt: now,
        updatedAt: now,
      };
    },
    onSuccess: (item) => addItem(item),
  });
}

export function useUpdateWardrobeItem() {
  const updateItem = useWardrobeStore((s) => s.updateItem);
  const items      = useWardrobeStore((s) => s.items);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemData }): Promise<ClothingItem> => {
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new Error(`Item ${id} niet gevonden`);
      return { ...existing, ...data, updatedAt: new Date().toISOString() };
    },
    onSuccess: (item) => updateItem(item.id, item),
  });
}

export function useDeleteWardrobeItem() {
  const removeItem = useWardrobeStore((s) => s.removeItem);

  return useMutation({
    mutationFn: async (id: string) => id,
    onSuccess: (id) => removeItem(id),
  });
}

export function useMarkWorn() {
  const updateItem = useWardrobeStore((s) => s.updateItem);
  const items      = useWardrobeStore((s) => s.items);

  return useMutation({
    mutationFn: async (id: string): Promise<ClothingItem> => {
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new Error(`Item ${id} niet gevonden`);
      return {
        ...existing,
        timesWorn: (existing.timesWorn ?? 0) + 1,
        lastWornAt: new Date().toISOString(),
        updatedAt:  new Date().toISOString(),
      };
    },
    onSuccess: (item) => updateItem(item.id, item),
  });
}
