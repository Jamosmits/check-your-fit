import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { useHouseholdStore, HouseholdMember } from '@/store/householdStore';
import { useWardrobeStore } from '@/store/wardrobeStore';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

function MemberCard({
  member,
  itemCount,
  onViewWardrobe,
}: {
  member: HouseholdMember;
  itemCount: number;
  onViewWardrobe: (member: HouseholdMember) => void;
}) {
  const { t } = useTranslation();

  return (
    <Card style={styles.memberCard}>
      <View style={styles.memberTop}>
        <Avatar name={member.name} imageUrl={member.avatarUrl} size={52} />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberEmail}>{member.email}</Text>
          {member.role === 'owner' && (
            <Badge label="Beheerder" small backgroundColor={colors.tag.accessories} />
          )}
        </View>
        <View style={styles.memberStats}>
          <Text style={styles.memberItemCount}>{itemCount}</Text>
          <Text style={styles.memberItemLabel}>items</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.viewWardrobeButton}
        onPress={() => onViewWardrobe(member)}
        activeOpacity={0.8}
      >
        <Text style={styles.viewWardrobeText}>Garderobe bekijken</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.accent} />
      </TouchableOpacity>
    </Card>
  );
}

export default function HouseholdIndexScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const household = useHouseholdStore((s) => s.household);
  const members = useHouseholdStore((s) => s.members);
  const items = useWardrobeStore((s) => s.items);

  const getItemCountForMember = useCallback(
    (userId: string) => items.filter((item) => item.userId === userId).length,
    [items],
  );

  const handleShare = useCallback(async () => {
    if (!household) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Sluit je aan bij ons huishouden "${household.name}" op Check Your Fit! Gebruik uitnodigingscode: ${household.inviteCode}`,
        title: 'Uitnodiging voor huishouden',
      });
    } catch {
      // share cancelled
    }
  }, [household]);

  const handleCopyCode = useCallback(() => {
    if (!household) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(t('household.invite.copied'), `Code: ${household.inviteCode}`);
  }, [household, t]);

  const handleViewWardrobe = useCallback(
    (member: HouseholdMember) => {
      router.push(`/(app)/household/member/${member.userId}`);
    },
    [router],
  );

  if (!household) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.emptyEmoji}>🏠</Text>
        <Text style={styles.stateTitle}>Geen huishouden</Text>
        <Text style={styles.stateSubtitle}>
          Maak een huishouden aan of join er een via een uitnodigingscode.
        </Text>
        <Button
          label="Huishouden instellen"
          onPress={() => router.push('/(auth)/household-setup')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('household.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {/* Household info */}
        <Card style={styles.householdCard}>
          <Text style={styles.householdName}>{household.name}</Text>
          <View style={styles.inviteRow}>
            <View style={styles.inviteCode}>
              <Text style={styles.inviteCodeLabel}>{t('household.invite.title')}</Text>
              <Text style={styles.inviteCodeText}>{household.inviteCode}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyCode}
              activeOpacity={0.8}
            >
              <Ionicons name="copy-outline" size={18} color={colors.accent} />
            </TouchableOpacity>
          </View>
          <Button
            label="Uitnodigen via WhatsApp"
            onPress={handleShare}
            variant="secondary"
            fullWidth
            style={styles.shareButton}
          />
        </Card>

        {/* Members */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>
            {t('household.members')} ({members.length})
          </Text>
          {members.map((member) => (
            <MemberCard
              key={member.userId}
              member={member}
              itemCount={getItemCountForMember(member.userId)}
              onViewWardrobe={handleViewWardrobe}
            />
          ))}
        </View>
      </ScrollView>
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
  householdCard: {
    marginHorizontal: spacing.screen,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  householdName: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.lg,
    color: colors.textPrimary,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: spacing.md,
  },
  inviteCode: {
    flex: 1,
  },
  inviteCodeLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteCodeText: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.lg,
    color: colors.accent,
    letterSpacing: 4,
  },
  copyButton: {
    padding: spacing.sm,
  },
  shareButton: {},
  membersSection: {
    paddingHorizontal: spacing.screen,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  memberCard: {
    gap: spacing.md,
  },
  memberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  memberInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  memberName: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  memberEmail: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  memberStats: {
    alignItems: 'center',
  },
  memberItemCount: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.lg,
    color: colors.textPrimary,
  },
  memberItemLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  viewWardrobeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewWardrobeText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.accent,
  },
});
