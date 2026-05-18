import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

type BadgeCategory = keyof Omit<typeof colors.tag, 'default' | 'defaultText'> extends `${infer K}Text` ? never : keyof typeof colors.tag;

interface BadgeProps {
  label: string;
  category?: 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories' | 'dresses' | 'default';
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
  small?: boolean;
}

export function Badge({
  label,
  category = 'default',
  backgroundColor,
  textColor,
  style,
  small = false,
}: BadgeProps) {
  const tagKey = category as keyof typeof colors.tag;
  const textKey = `${category}Text` as keyof typeof colors.tag;

  const bgColor = backgroundColor ?? colors.tag[tagKey] ?? colors.tag.default;
  const txtColor = textColor ?? colors.tag[textKey] ?? colors.tag.defaultText;

  return (
    <View
      style={[
        styles.badge,
        small && styles.small,
        { backgroundColor: bgColor },
        style,
      ]}
    >
      <Text style={[styles.label, small && styles.labelSmall, { color: txtColor }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontSize: 10,
  },
});
