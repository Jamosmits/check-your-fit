import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Outfit } from '@/store/outfitStore';
import { useWardrobeStore } from '@/store/wardrobeStore';
import { useTranslation } from '@/hooks/useTranslation';

interface OutfitCardProps {
  outfit: Outfit;
  onPress: (outfit: Outfit) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const MAX_THUMBNAILS = 4;

export function OutfitCard({ outfit, onPress }: OutfitCardProps) {
  const { t } = useTranslation();
  const items = useWardrobeStore((s) => s.items);
  const scale = useSharedValue(1);

  const outfitItems = outfit.items
    .slice(0, MAX_THUMBNAILS)
    .map((oi) => items.find((i) => i.id === oi.itemId))
    .filter(Boolean);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const remainingCount = outfit.items.length - MAX_THUMBNAILS;

  return (
    <AnimatedTouchable
      style={[styles.container, animatedStyle]}
      onPress={() => onPress(outfit)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <View style={styles.thumbnailGrid}>
        {outfitItems.map((item, index) =>
          item ? (
            <Image
              key={item.id}
              source={{ uri: item.processedPhotoUrl ?? item.thumbnailUrl ?? item.imageUrl }}
              style={[
                styles.thumbnail,
                outfitItems.length === 1 && styles.thumbnailFull,
              ]}
              resizeMode="cover"
            />
          ) : null,
        )}
        {remainingCount > 0 && (
          <View style={[styles.thumbnail, styles.moreOverlay]}>
            <Text style={styles.moreText}>+{remainingCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        {outfit.name ? (
          <Text style={styles.name} numberOfLines={1}>
            {outfit.name}
          </Text>
        ) : null}
        <View style={styles.meta}>
          {outfit.occasion ? (
            <Text style={styles.occasion}>{outfit.occasion}</Text>
          ) : null}
          <Text style={styles.wornCount}>
            {outfit.timesWorn} {t('outfits.detail.worn')}
          </Text>
        </View>
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
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
  thumbnailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    aspectRatio: 4 / 3,
    backgroundColor: colors.surfaceAlt,
  },
  thumbnail: {
    width: '50%',
    height: '50%',
  },
  thumbnailFull: {
    width: '100%',
    height: '100%',
  },
  moreOverlay: {
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  footer: {
    padding: spacing.sm,
  },
  name: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  occasion: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  wornCount: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
});
