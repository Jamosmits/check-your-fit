import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { useHouseholdStore } from '@/store/householdStore';
import { ClothingItem } from '@/store/wardrobeStore';
import { wardrobeService } from '@/services/wardrobeService';
import { ClothingCard } from '@/components/wardrobe/ClothingCard';
import { FilterBar } from '@/components/wardrobe/FilterBar';
import { Avatar } from '@/components/ui/Avatar';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type FilterCategory = 'all' | ClothingItem['category'];

const NUM_COLUMNS = 2;
const SKELETON_COUNT = 6;

export default function MemberWardrobeScreen() {
  const { t } = useTranslation();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const members = useHouseholdStore((s) => s.members);
  const member = members.find((m) => m.userId === userId);

  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [search, setSearch] = useState('');

  const {
    data: wardrobeData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['wardrobe', 'member', userId, { category: activeCategory, search }],
    queryFn: () =>
      wardrobeService.getItems({
        category: activeCategory !== 'all' ? activeCategory : undefined,
        search: search || undefined,
      }),
    enabled: !!userId,
  });

  const items = wardrobeData?.data ?? [];

  const handleItemPress = useCallback(
    (_item: ClothingItem) => {
      // Read-only view — no navigation to item detail
    },
    [],
  );

  const renderItem = ({ item, index }: { item: ClothingItem; index: number }) => (
    <View style={[styles.itemWrapper, index % 2 === 0 ? styles.itemLeft : styles.itemRight]}>
      <ClothingCard item={item} onPress={handleItemPress} />
    </View>
  );

  if (!member) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Ionicons name="person-outline" size={48} color={colors.textMuted} />
        <Text style={styles.stateTitle}>Lid niet gevonden</Text>
        <Button label={t('common.back')} onPress={() => router.back()} variant="ghost" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Avatar name={member.name} imageUrl={member.avatarUrl} size={32} />
          <Text style={styles.headerTitle}>
            {t('household.viewingWardrobe', { name: member.name.split(' ')[0] })}
          </Text>
        </View>
        <View style={{ width: 24 }} />
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

      {/* Count */}
      <View style={styles.countRow}>
        <Text style={styles.itemCount}>
          {items.length} items
        </Text>
      </View>

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
      ) : items.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyEmoji}>👗</Text>
          <Text style={styles.stateTitle}>{t('wardrobe.empty.title')}</Text>
          <Text style={styles.stateSubtitle}>
            {member.name.split(' ')[0]} heeft nog geen items in de garderobe.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          numColumns={NUM_COLUMNS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  backButton: {
    position: 'absolute',
    top: spacing.base,
    left: spacing.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.xs,
  },
  searchInput: {
    marginBottom: 0,
  },
  countRow: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
  },
  itemCount: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
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
});
