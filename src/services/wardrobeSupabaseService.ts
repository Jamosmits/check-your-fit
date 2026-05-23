import { ClothingItem } from '@/store/wardrobeStore';
import { getSupabaseClient } from './supabase';
import { useSettingsStore } from '@/store/settingsStore';

const TABLE = 'clothing_items';

// ─── Row ↔ ClothingItem mapping ───────────────────────────────────────────────

interface DbRow {
  id: string;
  user_id: string;
  name: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  color: string | null;
  colors: string | null;           // JSON array
  color_names: string | null;      // JSON array
  season: string | null;           // JSON array
  notes: string | null;
  description: string | null;
  original_image_url: string;
  generated_image_url: string | null;
  thumbnail_url: string | null;
  times_worn: number;
  last_worn: string | null;
  created_at: string;
  updated_at: string;
}

function toRow(item: ClothingItem): Omit<DbRow, 'created_at' | 'updated_at'> & { created_at: string; updated_at: string } {
  return {
    id:                   item.id,
    user_id:              item.userId,
    name:                 item.subcategory ?? null,
    category:             item.category,
    subcategory:          item.subcategory ?? null,
    brand:                item.brand ?? null,
    color:                item.color ?? null,
    colors:               item.colors ? JSON.stringify(item.colors) : null,
    color_names:          item.colorNames ? JSON.stringify(item.colorNames) : null,
    season:               item.season ? JSON.stringify(item.season) : null,
    notes:                item.notes ?? null,
    description:          item.description ?? null,
    original_image_url:   item.imageUrl,
    generated_image_url:  item.processedPhotoUrl ?? null,
    thumbnail_url:        item.thumbnailUrl ?? null,
    times_worn:           item.timesWorn ?? 0,
    last_worn:            item.lastWornAt ?? null,
    created_at:           item.createdAt,
    updated_at:           item.updatedAt,
  };
}

function fromRow(row: DbRow): ClothingItem {
  return {
    id:               row.id,
    userId:           row.user_id,
    imageUrl:         row.original_image_url,
    thumbnailUrl:     row.thumbnail_url ?? undefined,
    processedPhotoUrl: row.generated_image_url ?? undefined,
    description:      row.description ?? undefined,
    category:         row.category as ClothingItem['category'],
    subcategory:      row.subcategory ?? undefined,
    brand:            row.brand ?? undefined,
    color:            row.color ?? undefined,
    colors:           row.colors ? (JSON.parse(row.colors) as string[]) : [],
    colorNames:       row.color_names ? (JSON.parse(row.color_names) as string[]) : [],
    season:           row.season ? (JSON.parse(row.season) as string[]) : [],
    notes:            row.notes ?? undefined,
    timesWorn:        row.times_worn ?? 0,
    lastWornAt:       row.last_worn ?? undefined,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const wardrobeSupabaseService = {
  async fetchAll(userId: string): Promise<ClothingItem[]> {
    const { supabaseUrl, supabaseAnonKey } = useSettingsStore.getState();
    console.log('[Supabase] fetchAll — URL:', supabaseUrl ? supabaseUrl.slice(0, 30) : 'LEEG',
      '| key:', supabaseAnonKey ? supabaseAnonKey.slice(0, 8) + '…' : 'LEEG',
      '| userId:', userId);

    const sb = getSupabaseClient();
    if (!sb) throw new Error('Supabase niet geconfigureerd');

    const { data, error } = await sb
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] fetchAll FOUT:', error.message);
      throw new Error(`Supabase fetch: ${error.message}`);
    }
    console.log('[Supabase] fetchAll SUCCESS —', (data as DbRow[]).length, 'items');
    return (data as DbRow[]).map(fromRow);
  },

  async insert(item: ClothingItem): Promise<void> {
    const { supabaseUrl, supabaseAnonKey } = useSettingsStore.getState();
    const label = item.subcategory ?? item.category;
    console.log('[Supabase] insert poging voor item:', label);
    console.log('[Supabase] URL:', supabaseUrl ? supabaseUrl.slice(0, 20) : 'LEEG',
      '| key:', supabaseAnonKey ? supabaseAnonKey.slice(0, 8) + '…' : 'LEEG');

    const sb = getSupabaseClient();
    if (!sb) {
      console.warn('[Supabase] niet geconfigureerd — item bewaard in lokale AsyncStorage als fallback');
      return;
    }

    const { error } = await sb.from(TABLE).insert(toRow(item));
    if (error) {
      console.error('[Supabase] insert resultaat: FOUT —', error.message);
      throw new Error(`Supabase insert: ${error.message}`);
    }
    console.log('[Supabase] insert resultaat: SUCCESS —', label);
  },

  async update(id: string, updates: Partial<ClothingItem>): Promise<void> {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Supabase not configured');

    // Build only the columns that changed
    const patch: Partial<DbRow> = { updated_at: new Date().toISOString() };
    if (updates.subcategory   !== undefined) { patch.name = updates.subcategory; patch.subcategory = updates.subcategory; }
    if (updates.category      !== undefined) patch.category = updates.category;
    if (updates.brand         !== undefined) patch.brand = updates.brand ?? null;
    if (updates.color         !== undefined) patch.color = updates.color ?? null;
    if (updates.colors        !== undefined) patch.colors = JSON.stringify(updates.colors);
    if (updates.colorNames    !== undefined) patch.color_names = JSON.stringify(updates.colorNames);
    if (updates.season        !== undefined) patch.season = JSON.stringify(updates.season);
    if (updates.notes         !== undefined) patch.notes = updates.notes ?? null;
    if (updates.description   !== undefined) patch.description = updates.description ?? null;
    if (updates.processedPhotoUrl !== undefined) patch.generated_image_url = updates.processedPhotoUrl ?? null;
    if (updates.timesWorn     !== undefined) patch.times_worn = updates.timesWorn;
    if (updates.lastWornAt    !== undefined) patch.last_worn = updates.lastWornAt ?? null;

    const { error } = await sb.from(TABLE).update(patch).eq('id', id);
    if (error) throw new Error(`Supabase update: ${error.message}`);
  },

  async remove(id: string): Promise<void> {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Supabase not configured');

    const { error } = await sb.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(`Supabase delete: ${error.message}`);
  },
};
