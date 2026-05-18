import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  Dimensions,
  ListRenderItemInfo,
  Text,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ClothingItem } from '@/store/wardrobeStore';
import { ClothingCard } from './ClothingCard';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { colors } from '@/theme/colors';
import { fontSizes } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_GAP = spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.screen * 2 - ITEM_GAP) / COLUMN_COUNT;

interface ClothingGridProps {
  items: ClothingItem[];
  isLoading?: boolean;
  onItemPress: (item: ClothingItem) => void;
  onItemDelete?: (item: ClothingItem) => void;
  onItemMarkWorn?: (item: ClothingItem) => void;
  emptyMessage?: string;
  numColumns?: number;
}

const SKELETON_COUNT = 6;

function SkeletonGrid() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <View key={index} style={styles.cardWrapper}>
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}

export function ClothingGrid({
  items,
  isLoading = false,
  onItemPress,
  onItemDelete,
  onItemMarkWorn,
  emptyMessage = 'No items found.',
}: ClothingGridProps) {
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ClothingItem>) => (
      <Animated.View
        style={styles.cardWrapper}
        entering={FadeInDown.delay(index * 60).springify()}
      >
        <ClothingCard
          item={item}
          onPress={onItemPress}
          onDelete={onItemDelete}
          onMarkWorn={onItemMarkWorn}
        />
      </Animated.View>
    ),
    [onItemPress, onItemDelete, onItemMarkWorn],
  );

  const keyExtractor = useCallback((item: ClothingItem) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonGrid />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={COLUMN_COUNT}
      contentContainerStyle={styles.list}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: ITEM_GAP,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.screen,
    gap: ITEM_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
  },
  emptyText: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
