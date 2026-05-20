import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useWardrobeStore, ClothingItem } from '@/store/wardrobeStore';

const { height: SH } = Dimensions.get('window');
const THUMB = 76;
const CLOSET_HEIGHT = Math.round(SH * 0.41);

type Cat = ClothingItem['category'];

const CATEGORIES: { key: Cat; label: string; icon: string }[] = [
  { key: 'tops',        label: 'Tops',        icon: '👕' },
  { key: 'bottoms',     label: 'Bottoms',     icon: '👖' },
  { key: 'outerwear',   label: 'Jassen',      icon: '🧥' },
  { key: 'dresses',     label: 'Jurken',      icon: '👗' },
  { key: 'shoes',       label: 'Schoenen',    icon: '👟' },
  { key: 'accessories', label: 'Accessoires', icon: '💍' },
];

// ─── FlatLaySlot ─────────────────────────────────────────────────────────────

interface SlotProps {
  item?: ClothingItem | null;
  label: string;
  style?: object;
  onDeselect?: () => void;
}

function FlatLaySlot({ item, label, style, onDeselect }: SlotProps) {
  const uri = item ? (item.processedPhotoUrl ?? item.imageUrl) : null;

  if (!uri) {
    return (
      <View style={[flatS.slot, flatS.slotEmpty, style]}>
        <Ionicons name="add-circle-outline" size={22} color="#C8C4BC" />
        <Text style={flatS.slotLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[flatS.slot, flatS.slotFilled, style]}>
      <Image source={{ uri }} style={flatS.slotImage} resizeMode="contain" />
      {onDeselect && (
        <TouchableOpacity style={flatS.removeBtn} onPress={onDeselect} activeOpacity={0.8}>
          <Ionicons name="close" size={11} color={colors.white} />
        </TouchableOpacity>
      )}
      {item?.brand && (
        <View style={flatS.brandTag}>
          <Text style={flatS.brandText} numberOfLines={1}>{item.brand}</Text>
        </View>
      )}
    </View>
  );
}

const flatS = StyleSheet.create({
  slot: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  slotEmpty: {
    borderWidth: 1.5,
    borderColor: '#DDD8D0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FAFAF8',
  },
  slotFilled: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  slotLabel: {
    fontSize: typography.fontSizes.xs,
    color: '#B0A89E',
    fontWeight: typography.fontWeights.medium,
  },
  slotImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.white,
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  brandText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

// ─── FlatLayCanvas ────────────────────────────────────────────────────────────

function FlatLayCanvas({
  selected,
  onDeselect,
}: {
  selected: Partial<Record<Cat, ClothingItem>>;
  onDeselect: (cat: Cat) => void;
}) {
  const hasDress = !!selected.dresses;
  // When a dress is selected, tops/bottoms slots are hidden
  const topItem   = hasDress ? selected.dresses  : selected.tops;
  const topLabel  = hasDress ? 'Jurk'            : 'Top';
  const topCat: Cat = hasDress ? 'dresses'       : 'tops';

  return (
    <View style={canvasS.container}>
      {/* Row 1 — Outerwear + Top/Dress */}
      <View style={canvasS.row}>
        <FlatLaySlot
          item={selected.outerwear}
          label="Jas / Blazer"
          style={canvasS.slotHalf}
          onDeselect={() => onDeselect('outerwear')}
        />
        <FlatLaySlot
          item={topItem}
          label={topLabel}
          style={canvasS.slotHalf}
          onDeselect={() => onDeselect(topCat)}
        />
      </View>

      {/* Row 2 — Bottoms + Accessories (hidden if dress selected) */}
      {!hasDress && (
        <View style={canvasS.row}>
          <FlatLaySlot
            item={selected.bottoms}
            label="Broek / Rok"
            style={canvasS.slotBottoms}
            onDeselect={() => onDeselect('bottoms')}
          />
          <FlatLaySlot
            item={selected.accessories}
            label="Accessoires"
            style={canvasS.slotAccessory}
            onDeselect={() => onDeselect('accessories')}
          />
        </View>
      )}

      {/* Row 3 — Shoes (full width, landscape) */}
      <FlatLaySlot
        item={selected.shoes}
        label="Schoenen"
        style={canvasS.slotShoes}
        onDeselect={() => onDeselect('shoes')}
      />
    </View>
  );
}

const GAP = spacing.sm;
const canvasS = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.base,
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    flex: 4,
  },
  slotHalf: {
    flex: 1,
  },
  slotBottoms: {
    flex: 3,
  },
  slotAccessory: {
    flex: 2,
  },
  slotShoes: {
    flex: 2,
  },
});

// ─── ItemThumb ────────────────────────────────────────────────────────────────

function ItemThumb({
  item,
  selected,
  onPress,
}: {
  item: ClothingItem;
  selected: boolean;
  onPress: () => void;
}) {
  const uri = item.processedPhotoUrl ?? item.imageUrl;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={thumbS.wrap}>
      <View style={[thumbS.frame, selected && thumbS.frameSelected]}>
        <Image source={{ uri }} style={thumbS.image} resizeMode="contain" />
        {selected && (
          <View style={thumbS.checkBadge}>
            <Ionicons name="checkmark" size={10} color={colors.white} />
          </View>
        )}
      </View>
      {item.brand ? (
        <Text style={thumbS.brand} numberOfLines={1}>{item.brand}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const thumbS = StyleSheet.create({
  wrap:  { width: THUMB + 8, alignItems: 'center', gap: 4 },
  frame: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  frameSelected: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  image: { width: '100%', height: '100%' },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    maxWidth: THUMB + 8,
  },
});

// ─── CategoryRow ──────────────────────────────────────────────────────────────

function CategoryRow({
  label,
  icon,
  items,
  selectedItem,
  onSelect,
}: {
  category: Cat;
  label: string;
  icon: string;
  items: ClothingItem[];
  selectedItem: ClothingItem | null;
  onSelect: (item: ClothingItem) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (items.length === 0) return null;

  return (
    <View style={rowS.container}>
      <View style={rowS.header}>
        <Text style={rowS.icon}>{icon}</Text>
        <Text style={rowS.label}>{label}</Text>
        {selectedItem && (
          <View style={rowS.selectedBadge}>
            <Text style={rowS.selectedBadgeText} numberOfLines={1}>
              {selectedItem.subcategory ?? selectedItem.brand ?? '✓'}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => setCollapsed((c) => !c)}
          activeOpacity={0.7}
          style={rowS.hideBtn}
        >
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={14}
            color={colors.textMuted}
          />
          <Text style={rowS.hideBtnText}>{collapsed ? 'Toon' : 'Verberg'}</Text>
        </TouchableOpacity>
      </View>

      {!collapsed && (
        <FlatList
          data={items}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(i) => i.id}
          contentContainerStyle={rowS.list}
          renderItem={({ item }) => (
            <ItemThumb
              item={item}
              selected={selectedItem?.id === item.id}
              onPress={() => onSelect(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const rowS = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: 4,
    gap: spacing.xs,
  },
  icon:  { fontSize: 14 },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    flex: 1,
  },
  selectedBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: 110,
  },
  selectedBadgeText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  hideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  hideBtnText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  list: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TryOnScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const items   = useWardrobeStore((s) => s.items);

  const [selected, setSelected] = useState<Partial<Record<Cat, ClothingItem>>>({});

  const itemsByCategory = useMemo(() => {
    const map: Partial<Record<Cat, ClothingItem[]>> = {};
    for (const item of items) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category]!.push(item);
    }
    return map;
  }, [items]);

  const handleSelect = useCallback((item: ClothingItem) => {
    setSelected((prev) => {
      if (prev[item.category]?.id === item.id) {
        const next = { ...prev };
        delete next[item.category];
        return next;
      }
      return { ...prev, [item.category]: item };
    });
  }, []);

  const handleDeselect = useCallback((cat: Cat) => {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[cat];
      return next;
    });
  }, []);

  const handleRegenerate = useCallback(() => {
    const next: Partial<Record<Cat, ClothingItem>> = {};
    for (const { key } of CATEGORIES) {
      const pool = itemsByCategory[key];
      if (pool && pool.length > 0) {
        next[key] = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    setSelected(next);
  }, [itemsByCategory]);

  const handleClearAll = useCallback(() => setSelected({}), []);

  const selectedCount = Object.keys(selected).length;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={s.headerTitle}>Outfit samenstellen</Text>

        <View style={s.headerRight}>
          {selectedCount > 0 && (
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7} style={s.clearBtn}>
              <Text style={s.clearText}>Wis</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleRegenerate} activeOpacity={0.8} style={s.regenBtn}>
            <Ionicons name="shuffle" size={14} color={colors.white} />
            <Text style={s.regenText}>Stel voor</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Flat lay canvas */}
      <View style={s.canvas}>
        {items.length === 0 ? (
          <View style={s.emptyCanvas}>
            <Ionicons name="shirt-outline" size={36} color="#C8C4BC" />
            <Text style={s.emptyCanvasText}>
              Tik op items hieronder om een outfit samen te stellen
            </Text>
          </View>
        ) : (
          <FlatLayCanvas selected={selected} onDeselect={handleDeselect} />
        )}

        {selectedCount > 0 && (
          <View style={s.countChip}>
            <Text style={s.countText}>{selectedCount} item{selectedCount !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Closet panel */}
      <View style={[s.closet, { height: CLOSET_HEIGHT + insets.bottom }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.base }}
        >
          {items.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="shirt-outline" size={32} color={colors.textMuted} />
              <Text style={s.emptyText}>
                Geen kledingstukken gevonden.{'\n'}Scan je kledingkast om te beginnen.
              </Text>
              <TouchableOpacity
                style={s.scanCta}
                onPress={() => router.push('/(app)/wardrobe/scan')}
                activeOpacity={0.8}
              >
                <Text style={s.scanCtaText}>Kledingkast scannen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            CATEGORIES.map(({ key, label, icon }) => (
              <CategoryRow
                key={key}
                category={key}
                label={label}
                icon={icon}
                items={itemsByCategory[key] ?? []}
                selectedItem={selected[key] ?? null}
                onSelect={handleSelect}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  clearText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  regenText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.white,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#F7F4EF',
  },
  emptyCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyCanvasText: {
    fontSize: typography.fontSizes.sm,
    color: '#B0A89E',
    textAlign: 'center',
    lineHeight: 20,
  },
  countChip: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  countText: {
    fontSize: typography.fontSizes.xs,
    color: colors.white,
    fontWeight: typography.fontWeights.semibold,
  },
  closet: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  scanCta: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  scanCtaText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.white,
  },
});
