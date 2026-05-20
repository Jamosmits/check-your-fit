import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { useWardrobeItems, useDeleteWardrobeItem, useMarkWorn } from '@/hooks/useWardrobe';
import { useWardrobeStore, ClothingItem } from '@/store/wardrobeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { ClothingCard } from '@/components/wardrobe/ClothingCard';
import { FilterBar } from '@/components/wardrobe/FilterBar';
import { Input } from '@/components/ui/Input';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { Button } from '@/components/ui/Button';

type FilterCategory = 'all' | ClothingItem['category'];
type SortOption = 'newest' | 'oldest' | 'mostWorn' | 'leastWorn';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'newest', label: 'Nieuwste' },
  { key: 'oldest', label: 'Oudste' },
  { key: 'mostWorn', label: 'Meest gedragen' },
  { key: 'leastWorn', label: 'Minst gedragen' },
];

const NUM_COLUMNS = 2;
const SKELETON_COUNT = 6;

export default function WardrobeIndexScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const filters = {
    category: activeCategory !== 'all' ? activeCategory : undefined,
    search: search || undefined,
    sortBy,
  };

  const { isLoading, error, refetch } = useWardrobeItems(filters);
  const items = useWardrobeStore((s) => s.items);
  const removeBgKey = useSettingsStore((s) => s.removeBgKey);
  const [removeBgBannerDismissed, setRemoveBgBannerDismissed] = useState(false);
  const showRemoveBgBanner = !removeBgKey && items.length > 0 && !removeBgBannerDismissed;
  const { mutate: deleteItem } = useDeleteWardrobeItem();
  const { mutate: markWorn } = useMarkWorn();

  const filteredItems = items.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.category.includes(q) ||
        (item.subcategory?.toLowerCase().includes(q) ?? false) ||
        (item.brand?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'mostWorn':
        return b.timesWorn - a.timesWorn;
      case 'leastWorn':
        return a.timesWorn - b.timesWorn;
      default:
        return 0;
    }
  });

  const handleItemPress = useCallback(
    (item: ClothingItem) => {
      router.push(`/(app)/wardrobe/${item.id}`);
    },
    [router],
  );

  const handleDelete = useCallback(
    (item: ClothingItem) => {
      deleteItem(item.id);
    },
    [deleteItem],
  );

  const handleMarkWorn = useCallback(
    (item: ClothingItem) => {
      markWorn(item.id);
    },
    [markWorn],
  );

  const renderItem = ({ item, index }: { item: ClothingItem; index: number }) => (
    <View style={[styles.itemWrapper, index % 2 === 0 ? styles.itemLeft : styles.itemRight]}>
      <ClothingCard
        item={item}
        onPress={handleItemPress}
        onDelete={handleDelete}
        onMarkWorn={handleMarkWorn}
      />
    </View>
  );

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('wardrobe.title')}</Text>
        <TouchableOpacity
          onPress={() => router.push('/(app)/wardrobe/scan')}
          style={styles.headerButton}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Input
          label={t('wardrobe.search.placeholder')}
          value={search}
          onChangeText={setSearch}
          containerStyle={styles.searchInput}
          rightElement={
            search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="search" size={20} color={colors.textMuted} />
            )
          }
        />
      </View>

      {/* Filter bar */}
      <FilterBar
        activeCategory={activeCategory}
        onCategoryChange={(cat) => setActiveCategory(cat as FilterCategory)}
      />

      {/* Sort row */}
      <View style={styles.sortRow}>
        <Text style={styles.itemCount}>
          {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}
        </Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortMenuOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <Ionicons name="swap-vertical" size={16} color={colors.textSecondary} />
          <Text style={styles.sortLabel}>
            {SORT_OPTIONS.find((o) => o.key === sortBy)?.label}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort dropdown */}
      {sortMenuOpen && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.sortOption,
                sortBy === opt.key && styles.sortOptionActive,
              ]}
              onPress={() => {
                setSortBy(opt.key);
                setSortMenuOpen(false);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === opt.key && styles.sortOptionTextActive,
                ]}
              >
                {opt.label}
              </Text>
              {sortBy === opt.key && (
                <Ionicons name="checkmark" size={16} color={colors.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Remove.bg tip banner */}
      {showRemoveBgBanner && (
        <TouchableOpacity
          style={styles.tipBanner}
          onPress={() => router.push('/(app)/profile/settings')}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles-outline" size={14} color={colors.status.info} />
          <Text style={styles.tipBannerText}>
            Voeg Remove.bg key toe voor professionele productfoto's
          </Text>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); setRemoveBgBannerDismissed(true); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Content */}
      {isLoading ? (
        <FlatList
          data={Array.from({ length: SKELETON_COUNT })}
          numColumns={NUM_COLUMNS}
          keyExtractor={(_, i) => `skeleton-${i}`}
          renderItem={({ index }) => (
            <View style={[styles.itemWrapper, index % 2 === 0 ? styles.itemLeft : styles.itemRight]}>
              <SkeletonCard />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : error ? (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.stateTitle}>{t('common.error')}</Text>
          <Button label={t('common.retry')} onPress={() => refetch()} variant="secondary" />
        </View>
      ) : sortedItems.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyEmoji}>👗</Text>
          <Text style={styles.stateTitle}>{t('wardrobe.empty.title')}</Text>
          <Text style={styles.stateSubtitle}>{t('wardrobe.empty.subtitle')}</Text>
          <View style={styles.emptyActions}>
            <Button
              label={t('wardrobe.empty.cta')}
              onPress={() => router.push('/(app)/wardrobe/scan')}
              variant="primary"
            />
            <Button
              label="Handmatig toevoegen"
              onPress={() => router.push('/(app)/wardrobe/add-item')}
              variant="secondary"
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
          numColumns={NUM_COLUMNS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() => router.push('/(app)/wardrobe/add-item')}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
  },
  headerButton: {
    padding: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.xs,
  },
  searchInput: {
    marginBottom: 0,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
  },
  itemCount: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sortLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  sortDropdown: {
    position: 'absolute',
    right: spacing.screen,
    top: 180,
    zIndex: 100,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 180,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  sortOptionActive: {
    backgroundColor: colors.surfaceAlt,
  },
  sortOptionText: {
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
  },
  sortOptionTextActive: {
    fontWeight: typography.fontWeights.semibold,
    color: colors.accent,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl + 80,
  },
  itemWrapper: {
    flex: 1,
    padding: spacing.xs,
  },
  itemLeft: {
    paddingRight: spacing.xs,
  },
  itemRight: {
    paddingLeft: spacing.xs,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  stateTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyActions: {
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.sm,
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.screen,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.status.infoLight,
    borderRadius: 10,
  },
  tipBannerText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.status.info,
    fontWeight: typography.fontWeights.medium,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
});
