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
import { useOutfits } from '@/hooks/useOutfits';
import { useOutfitStore, Outfit } from '@/store/outfitStore';
import { OutfitCard } from '@/components/outfits/OutfitCard';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { Button } from '@/components/ui/Button';

type OccasionFilter = 'all' | 'casual' | 'work' | 'evening' | 'sport';

const OCCASION_TABS: { key: OccasionFilter; label: string }[] = [
  { key: 'all', label: 'Alles' },
  { key: 'casual', label: 'Casual' },
  { key: 'work', label: 'Werk' },
  { key: 'evening', label: 'Avond' },
  { key: 'sport', label: 'Sport' },
];

const NUM_COLUMNS = 2;
const SKELETON_COUNT = 4;

export default function OutfitsIndexScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<OccasionFilter>('all');

  const { isLoading, error, refetch } = useOutfits();
  const outfits = useOutfitStore((s) => s.outfits);

  const filteredOutfits = outfits.filter((outfit) => {
    if (activeTab === 'all') return true;
    return outfit.occasion?.toLowerCase() === activeTab;
  });

  const handleOutfitPress = useCallback(
    (outfit: Outfit) => {
      router.push(`/(app)/outfits/${outfit.id}`);
    },
    [router],
  );

  const renderItem = ({ item, index }: { item: Outfit; index: number }) => (
    <View style={[styles.itemWrapper, index % 2 === 0 ? styles.itemLeft : styles.itemRight]}>
      <OutfitCard outfit={item} onPress={handleOutfitPress} />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('outfits.title')}</Text>
      </View>

      {/* Occasion tabs */}
      <View style={styles.tabBar}>
        <FlatList
          data={OCCASION_TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(tab) => tab.key}
          contentContainerStyle={styles.tabScroll}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )}
        />
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
      ) : filteredOutfits.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyEmoji}>👗</Text>
          <Text style={styles.stateTitle}>{t('outfits.empty.title')}</Text>
          <Text style={styles.stateSubtitle}>{t('outfits.empty.subtitle')}</Text>
          <Button
            label={t('outfits.empty.create')}
            onPress={() => router.push('/(app)/outfits/build')}
          />
        </View>
      ) : (
        <FlatList
          data={filteredOutfits}
          numColumns={NUM_COLUMNS}
          keyExtractor={(outfit) => outfit.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() => router.push('/(app)/outfits/build')}
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
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabScroll: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
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
