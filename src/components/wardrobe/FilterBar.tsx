import React, { useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/hooks/useTranslation';
import { ClothingItem } from '@/store/wardrobeStore';

type FilterCategory = 'all' | ClothingItem['category'];

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  category?: FilterCategory;
}

function FilterChip({ label, isActive, onPress, category }: FilterChipProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const bgColor =
    isActive && category && category !== 'all'
      ? colors.tag[category as keyof typeof colors.tag] ?? colors.accent
      : isActive
      ? colors.accent
      : colors.surface;

  const txtColor =
    isActive && category && category !== 'all'
      ? colors.tag[`${category}Text` as keyof typeof colors.tag] ?? colors.white
      : isActive
      ? colors.white
      : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { backgroundColor: bgColor },
        !isActive && styles.chipInactive,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, { color: txtColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface FilterBarProps {
  activeCategory: FilterCategory;
  onCategoryChange: (category: FilterCategory) => void;
}

const CATEGORIES: FilterCategory[] = [
  'all',
  'tops',
  'bottoms',
  'outerwear',
  'shoes',
  'accessories',
  'dresses',
];

export function FilterBar({ activeCategory, onCategoryChange }: FilterBarProps) {
  const { t } = useTranslation();

  const getCategoryLabel = (cat: FilterCategory): string => {
    if (cat === 'all') return t('wardrobe.categories.all');
    return t(`wardrobe.categories.${cat}` as Parameters<typeof t>[0]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        bounces={false}
      >
        {CATEGORIES.map((cat) => (
          <FilterChip
            key={cat}
            label={getCategoryLabel(cat)}
            isActive={activeCategory === cat}
            onPress={() => onCategoryChange(cat)}
            category={cat}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scroll: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    flexShrink: 0,
  },
  chipInactive: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
});
