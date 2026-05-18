import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { ClothingItem } from '@/store/wardrobeStore';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/hooks/useTranslation';

interface ClothingCardProps {
  item: ClothingItem;
  onPress: (item: ClothingItem) => void;
  onDelete?: (item: ClothingItem) => void;
  onMarkWorn?: (item: ClothingItem) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function ClothingCard({ item, onPress, onDelete, onMarkWorn }: ClothingCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const options: string[] = [];
    if (onMarkWorn) options.push(t('wardrobe.item.markWorn'));
    if (onDelete) options.push(t('wardrobe.item.delete'));
    options.push(t('common.cancel'));

    Alert.alert(
      item.subcategory ?? item.category,
      undefined,
      [
        ...(onMarkWorn
          ? [{ text: t('wardrobe.item.markWorn'), onPress: () => onMarkWorn(item) }]
          : []),
        ...(onDelete
          ? [
              {
                text: t('wardrobe.item.delete'),
                style: 'destructive' as const,
                onPress: () =>
                  Alert.alert(
                    t('wardrobe.item.confirmDelete'),
                    undefined,
                    [
                      { text: t('wardrobe.item.cancelButton'), style: 'cancel' },
                      {
                        text: t('wardrobe.item.deleteButton'),
                        style: 'destructive',
                        onPress: () => onDelete(item),
                      },
                    ],
                  ),
              },
            ]
          : []),
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  }, [item, onDelete, onMarkWorn, t]);

  const categoryKey = item.category as keyof typeof colors.tag;
  const colorDot = item.color ?? (item.colors?.[0]);

  return (
    <AnimatedTouchable
      style={[styles.container, animatedStyle]}
      onPress={() => onPress(item)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      activeOpacity={1}
      delayLongPress={400}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        {colorDot && (
          <View style={[styles.colorDot, { backgroundColor: colorDot }]} />
        )}
      </View>
      <View style={styles.footer}>
        <Badge
          label={item.subcategory ?? item.category}
          category={item.category}
          small
        />
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  imageContainer: {
    aspectRatio: 3 / 4,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceAlt,
  },
  colorDot: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  footer: {
    padding: spacing.sm,
  },
});
