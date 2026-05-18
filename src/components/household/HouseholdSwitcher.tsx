import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useHouseholdStore, HouseholdMember } from '@/store/householdStore';
import { useAuthStore } from '@/store/authStore';
import { MemberCard } from './MemberCard';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/hooks/useTranslation';

interface HouseholdSwitcherProps {
  onMemberSelect?: (member: HouseholdMember | null) => void;
}

export function HouseholdSwitcher({ onMemberSelect }: HouseholdSwitcherProps) {
  const { t } = useTranslation();
  const { members, activeMemberId, setActiveMember } = useHouseholdStore();
  const user = useAuthStore((s) => s.user);

  const handleMemberPress = useCallback(
    (member: HouseholdMember) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newId = activeMemberId === member.userId ? null : member.userId;
      setActiveMember(newId);
      onMemberSelect?.(newId ? member : null);
    },
    [activeMemberId, setActiveMember, onMemberSelect],
  );

  const handleMyWardrobePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveMember(null);
    onMemberSelect?.(null);
  }, [setActiveMember, onMemberSelect]);

  const isViewingMine = activeMemberId === null;
  const otherMembers = members.filter((m) => m.userId !== user?.id);

  if (otherMembers.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('household.switchMember')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <TouchableOpacity
          style={[styles.myWardrobeChip, isViewingMine && styles.myWardrobeChipActive]}
          onPress={handleMyWardrobePress}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.myWardrobeText,
              isViewingMine && styles.myWardrobeTextActive,
            ]}
          >
            {t('household.myWardrobe')}
          </Text>
        </TouchableOpacity>
        {otherMembers.map((member) => (
          <MemberCard
            key={member.userId}
            member={member}
            isActive={activeMemberId === member.userId}
            onPress={handleMemberPress}
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
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  scroll: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
    alignItems: 'center',
  },
  myWardrobeChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    height: 36,
    justifyContent: 'center',
  },
  myWardrobeChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  myWardrobeText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
  },
  myWardrobeTextActive: {
    color: colors.white,
  },
});
