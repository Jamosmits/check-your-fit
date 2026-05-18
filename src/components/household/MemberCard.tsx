import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { HouseholdMember } from '@/store/householdStore';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

interface TodaysOutfit {
  imageUrl?: string;
  name?: string;
}

interface MemberCardProps {
  member: HouseholdMember;
  todaysOutfit?: TodaysOutfit;
  isActive?: boolean;
  onPress: (member: HouseholdMember) => void;
}

export function MemberCard({ member, todaysOutfit, isActive = false, onPress }: MemberCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.containerActive]}
      onPress={() => onPress(member)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Avatar
          name={member.name}
          imageUrl={member.avatarUrl}
          size={44}
        />
        {isActive && <View style={styles.activeDot} />}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {member.name}
      </Text>
      {todaysOutfit ? (
        <View style={styles.outfitPreview}>
          {todaysOutfit.imageUrl ? (
            <Image
              source={{ uri: todaysOutfit.imageUrl }}
              style={styles.outfitImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.outfitPlaceholder} />
          )}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 12,
    width: 80,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  containerActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
  },
  header: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.status.success,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  name: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  outfitPreview: {
    width: 40,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  outfitImage: {
    width: '100%',
    height: '100%',
  },
  outfitPlaceholder: {
    flex: 1,
    backgroundColor: colors.border,
  },
});
