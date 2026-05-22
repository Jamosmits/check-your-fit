import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useWardrobeStore, ClothingItem } from '@/store/wardrobeStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUsageStore, LimitReachedError } from '@/store/usageStore';
import { generateFashnTryOn } from '@/services/fashnService';
import { generateTryOn } from '@/services/tryOnService';

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

  return (
    <View style={canvasS.container}>
      {/* Row 1 — Outerwear + Top, or Dress centered */}
      {hasDress ? (
        <View style={[canvasS.row, canvasS.rowTop]}>
          <FlatLaySlot
            item={selected.dresses}
            label="Jurk"
            style={canvasS.slotDress}
            onDeselect={() => onDeselect('dresses')}
          />
        </View>
      ) : (
        <View style={[canvasS.row, canvasS.rowTop]}>
          <FlatLaySlot
            item={selected.outerwear}
            label="Jas / Blazer"
            style={canvasS.slotHalf}
            onDeselect={() => onDeselect('outerwear')}
          />
          <FlatLaySlot
            item={selected.tops}
            label="Top"
            style={canvasS.slotHalf}
            onDeselect={() => onDeselect('tops')}
          />
        </View>
      )}

      {/* Row 2 — Bottoms centered (hidden if dress) */}
      {!hasDress && (
        <View style={[canvasS.row, canvasS.rowMid]}>
          <FlatLaySlot
            item={selected.bottoms}
            label="Broek / Rok"
            style={canvasS.slotBottoms}
            onDeselect={() => onDeselect('bottoms')}
          />
        </View>
      )}

      {/* Row 3 — Shoes left, accessories right */}
      <View style={[canvasS.row, canvasS.rowBottom]}>
        <FlatLaySlot
          item={selected.shoes}
          label="Schoenen"
          style={canvasS.slotShoes}
          onDeselect={() => onDeselect('shoes')}
        />
        <FlatLaySlot
          item={selected.accessories}
          label="Accessoires"
          style={canvasS.slotAccessory}
          onDeselect={() => onDeselect('accessories')}
        />
      </View>
    </View>
  );
}

const GAP = spacing.sm;
const canvasS = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.base,
    gap: GAP,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  rowTop:    { flex: 5 },
  rowMid:    { flex: 4 },
  rowBottom: { flex: 2 },
  slotHalf: {
    flex: 1,
  },
  slotDress: {
    flex: 1,
    alignSelf: 'center',
    maxWidth: '55%',
  },
  slotBottoms: {
    flex: 1,
  },
  slotShoes: {
    flex: 3,
  },
  slotAccessory: {
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
  const insets      = useSafeAreaInsets();
  const router      = useRouter();
  const items          = useWardrobeStore((s) => s.items);
  const modelPhotoUrl  = useAuthStore((s) => s.modelPhotoUrl);
  const openaiKey      = useSettingsStore((s) => s.openaiKey);
  const fashnKey       = useSettingsStore((s) => s.fashnKey);
  const replicateKey   = useSettingsStore((s) => s.replicateKey);
  const isSettingsLoaded = useSettingsStore((s) => s.isLoaded);
  const loadKeys       = useSettingsStore((s) => s.loadKeys);
  const checkLimit     = useUsageStore((s) => s.checkLimit);
  const increment      = useUsageStore((s) => s.increment);

  // Ensure keys are hydrated from SecureStore before this screen is used
  useEffect(() => {
    if (!isSettingsLoaded) loadKeys();
  }, [isSettingsLoaded, loadKeys]);

  const [selected,    setSelected]    = useState<Partial<Record<Cat, ClothingItem>>>({});
  const [isTryingOn,  setIsTryingOn]  = useState(false);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);

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

  const buildOutfitDescription = useCallback(() => {
    return Object.values(selected)
      .map((item) => {
        // Use the full GPT-4o description when available for maximum accuracy
        if (item.description) return item.description;
        // Fallback: build from metadata fields
        return [
          item.colorNames?.slice(0, 2).join(' and ') ?? item.color,
          item.subcategory ?? item.category,
          item.brand,
          item.notes,
        ].filter(Boolean).join(' ');
      })
      .join('. ');
  }, [selected]);

  const handleTryOn = useCallback(async () => {
    if (!modelPhotoUrl || selectedCount === 0) return;

    try {
      checkLimit('tryOn');
    } catch (e) {
      if (e instanceof LimitReachedError) {
        Alert.alert('Limiet bereikt', e.message, [{ text: 'Upgraden', style: 'default' }, { text: 'Sluiten', style: 'cancel' }]);
        return;
      }
    }

    // Debug: log key presence so we can confirm hydration in the console
    console.log('[tryOn] keys —',
      `replicate: ${replicateKey ? replicateKey.slice(0, 4) + '…' : '(empty)'}`,
      `fashn: ${fashnKey ? fashnKey.slice(0, 4) + '…' : '(empty)'}`,
      `openai: ${openaiKey ? openaiKey.slice(0, 4) + '…' : '(empty)'}`,
      `settingsLoaded: ${isSettingsLoaded}`,
    );

    if (!isSettingsLoaded) {
      Alert.alert('Even geduld', 'Instellingen worden nog geladen. Probeer opnieuw.');
      return;
    }

    setIsTryingOn(true);
    try {
      let result: string;
      if (fashnKey || replicateKey) {
        const garments = Object.values(selected)
          .filter((item) => item.processedPhotoUrl ?? item.imageUrl)
          .map((item) => ({
            imageUri:    item.processedPhotoUrl ?? item.imageUrl,
            category:    item.category,
            description: item.description,
          }));
        result = await generateFashnTryOn(modelPhotoUrl, garments, fashnKey, replicateKey);
      } else if (openaiKey) {
        const description = buildOutfitDescription();
        result = await generateTryOn(modelPhotoUrl, description, openaiKey);
      } else {
        throw new Error('Geen API key beschikbaar. Stel een Replicate, Fashn.ai of OpenAI key in bij Instellingen.');
      }
      setTryOnResult(result);
      await increment('tryOn');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Try-on mislukt';
      console.error('[TryOnScreen] handleTryOn error:', e);
      Alert.alert('Try-On Fout', msg);
    } finally {
      setIsTryingOn(false);
    }
  }, [modelPhotoUrl, fashnKey, replicateKey, openaiKey, isSettingsLoaded, selectedCount, selected, buildOutfitDescription, checkLimit, increment]);

  const handleShare = useCallback(async () => {
    if (!tryOnResult) return;
    try {
      await Share.share({ message: 'Mijn outfit van vandaag 👗', url: tryOnResult });
    } catch {
      // user cancelled share — no-op
    }
  }, [tryOnResult]);

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

      {/* Canvas — shows flat-lay OR try-on result */}
      <View style={s.canvas}>
        {tryOnResult ? (
          <>
            <Image source={{ uri: tryOnResult }} style={s.tryOnImage} resizeMode="contain" />
            <View style={s.tryOnResultBar}>
              <TouchableOpacity style={s.tryOnResultBtn} onPress={handleShare} activeOpacity={0.8}>
                <Ionicons name="share-outline" size={16} color={colors.accent} />
                <Text style={s.tryOnResultBtnText}>Delen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.tryOnResultBtn}
                onPress={() => { setTryOnResult(null); handleTryOn(); }}
                activeOpacity={0.8}
                disabled={isTryingOn}
              >
                {isTryingOn
                  ? <ActivityIndicator size="small" color={colors.accent} />
                  : <Ionicons name="refresh" size={16} color={colors.accent} />}
                <Text style={s.tryOnResultBtnText}>{isTryingOn ? 'Bezig...' : 'Opnieuw'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.tryOnResultBtn} onPress={() => setTryOnResult(null)} activeOpacity={0.8}>
                <Ionicons name="shirt-outline" size={16} color={colors.textSecondary} />
                <Text style={[s.tryOnResultBtnText, { color: colors.textSecondary }]}>Flat-lay</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
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

            {modelPhotoUrl && selectedCount > 0 && (
              <TouchableOpacity
                style={s.tryOnBtn}
                onPress={handleTryOn}
                activeOpacity={0.85}
                disabled={isTryingOn}
              >
                {isTryingOn ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="person" size={15} color={colors.white} />
                )}
                <Text style={s.tryOnText}>
                  {isTryingOn ? 'Bezig...' : 'Pas op model'}
                </Text>
              </TouchableOpacity>
            )}
          </>
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
    backgroundColor: colors.white,
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
  tryOnBtn: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: { elevation: 5 },
    }),
  },
  tryOnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.white,
  },
  tryOnImage: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.surfaceAlt,
  },
  tryOnResultBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tryOnResultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: spacing.sm + 2,
  },
  tryOnResultBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.accent,
  },
});
