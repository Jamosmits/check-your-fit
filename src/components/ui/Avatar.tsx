import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: number;
  style?: ViewStyle;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(name: string): string {
  const avatarColors = [
    colors.tag.tops,
    colors.tag.bottoms,
    colors.tag.outerwear,
    colors.tag.shoes,
    colors.tag.accessories,
    colors.tag.dresses,
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function Avatar({ name, imageUrl, size = 40, style }: AvatarProps) {
  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: name ? getAvatarColor(name) : colors.surfaceAlt,
  };

  const initials = name ? getInitials(name) : '?';
  const fontSize = size * 0.38;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, containerStyle, style]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.container, containerStyle, style]}>
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    overflow: 'hidden',
  },
  initials: {
    color: colors.accent,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.5,
  },
});
