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
import { useAuthStore } from '@/store/authStore';

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

// Zones as percentages of the model container — calibrated for the body icon
const ZONES: Record<Cat, { top: string; left: string; right: string; height: string; zIndex: number }> = {
  accessories: { top: '4%',  left: '28%', right: '28%', height: '13%', zIndex: 5 },
  outerwear:   { top: '14%', left: '6%',  right: '6%',  height: '40%', zIndex: 2 },
  dresses:     { top: '16%', left: '16%', right: '16%', height: '58%', zIndex: 2 },
  tops:        { top: '18%', left: '16%', right: '16%', height: '30%', zIndex: 3 },
  bottoms:     { top: '46%', left: '16%', right: '16%', height: '32%', zIndex: 3 },
  shoes:       { top: '77%', left: '20%', right: '20%', height: '19%', zIndex: 4 },
};

// Rendering order: back to front
const RENDER_ORDER: Cat[] = ['outerwear', 'dresses', 'bottoms', 'tops', 'shoes', 'accessories'];

// ─── Mannequin ────────────────────────────────────────────────────────────────

function Mannequin() {
  return (
    <View style={manS.wrap} pointerEvents="none">
      <View style={manS.head} />
      <View style={manS.neckRow}>
        <View style={manS.shoulderL} />
        <View style={manS.neck} />
        <View style={manS.shoulderR} />
      </View>
      <View style={manS.torso} />
      <View style={manS.waist} />
      <View style={manS.hips} />
      <View style={manS.legsRow}>
        <View style={manS.leg} />
        <View style={manS.leg} />
      </View>
      <View style={manS.feetRow}>
        <View style={manS.foot} />
        <View style={manS.foot} />
      </View>
    </View>
  );
}

const MC = '#DED8D0';
const manS = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: '6%',
  },
  head:      { width: 46, height: 46, borderRadius: 23, backgroundColor: MC },
  neckRow:   { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 },
  shoulderL: { width: 36, height: 16, backgroundColor: MC, borderTopLeftRadius: 8 },
  neck:      { width: 16, height: 12, backgroundColor: MC },
  shoulderR: { width: 36, height: 16, backgroundColor: MC, borderTopRightRadius: 8 },
  torso:     { width: 78, height: 88, backgroundColor: MC, borderRadius: 4 },
  waist:     { width: 64, height: 12, backgroundColor: MC },
  hips:      { width: 88, height: 22, backgroundColor: MC, borderRadius: 6 },
  legsRow:   { flexDirection: 'row', gap: 8, marginTop: 2 },
  leg:       { width: 34, height: 120, backgroundColor: MC, borderRadius: 6 },
  feetRow:   { flexDirection: 'row', gap: 12, marginTop: 2 },
  foot:      { width: 38, height: 14, backgroundColor: MC, borderRadius: 4 },
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
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={thumbS.wrap}>
      <View style={[thumbS.frame, selected && thumbS.frameSelected]}>
        <Image source={{ uri: item.imageUrl }} style={thumbS.image} resizeMode="contain" />
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
  category,
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
            <Text style={rowS.selectedBadgeText}>{selectedItem.subcategory ?? selectedItem.brand ?? '✓'}</Text>
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
    maxWidth: 100,
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
  const insets     = useSafeAreaInsets();
  const router     = useRouter();
  const items      = useWardrobeStore((s) => s.items);
  const bodyPhoto  = useAuthStore((s) => s.bodyPhotoUri);

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
      // Tapping the already-selected item deselects it
      if (prev[item.category]?.id === item.id) {
        const next = { ...prev };
        delete next[item.category];
        return next;
      }
      return { ...prev, [item.category]: item };
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

        <TouchableOpacity onPress={handleRegenerate} activeOpacity={0.8} style={s.regenBtn}>
          <Ionicons name="shuffle" size={14} color={colors.white} />
          <Text style={s.regenText}>Stel voor</Text>
        </TouchableOpacity>
      </View>

      {/* Model area */}
      <View style={s.modelArea}>
        {/* Background */}
        <View style={StyleSheet.absoluteFill}>
          {bodyPhoto ? (
            <Image
              source={{ uri: bodyPhoto }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          ) : (
            <Mannequin />
          )}
        </View>

        {/* Clothing overlays — rendered back to front */}
        {RENDER_ORDER.map((cat) => {
          const item = selected[cat];
          if (!item) return null;
          const zone = ZONES[cat];
          return (
            <Image
              key={cat}
              source={{ uri: item.imageUrl }}
              style={[
                s.overlay,
                {
                  top: zone.top,
                  left: zone.left,
                  right: zone.right,
                  height: zone.height,
                  zIndex: zone.zIndex,
                },
              ]}
              resizeMode="contain"
            />
          );
        })}

        {/* Clear button (only when items selected) */}
        {selectedCount > 0 && (
          <TouchableOpacity style={s.clearBtn} onPress={handleClearAll} activeOpacity={0.8}>
            <Ionicons name="close" size={14} color={colors.textSecondary} />
            <Text style={s.clearText}>Wis alles</Text>
          </TouchableOpacity>
        )}

        {/* Item count chip */}
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
  modelArea: {
    flex: 1,
    backgroundColor: '#F4F1EC',
    overflow: 'hidden',
  },
  overlay: {
    position: 'absolute',
    bottom: undefined,
  },
  clearBtn: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
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
