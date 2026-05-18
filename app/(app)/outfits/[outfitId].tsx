import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { useOutfit, useDeleteOutfit, useUpdateOutfit } from '@/hooks/useOutfits';
import { useMarkWorn } from '@/hooks/useWardrobe';
import { useWardrobeStore } from '@/store/wardrobeStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';

function OutfitItemGrid({ itemIds }: { itemIds: string[] }) {
  const items = useWardrobeStore((s) => s.items);
  const outfitItems = itemIds
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean);

  return (
    <View style={styles.itemGrid}>
      {outfitItems.map((item) =>
        item ? (
          <View key={item.id} style={styles.gridItem}>
            <Image
              source={{ uri: item.thumbnailUrl ?? item.imageUrl }}
              style={styles.gridItemImage}
              resizeMode="cover"
            />
            <Text style={styles.gridItemLabel} numberOfLines={1}>
              {item.subcategory ?? item.category}
            </Text>
          </View>
        ) : null,
      )}
    </View>
  );
}

export default function OutfitDetailScreen() {
  const { t } = useTranslation();
  const { outfitId } = useLocalSearchParams<{ outfitId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: outfit, isLoading, error } = useOutfit(outfitId ?? '');
  const { mutateAsync: deleteOutfit, isPending: isDeleting } = useDeleteOutfit();
  const { mutateAsync: updateOutfit } = useUpdateOutfit();
  const { mutateAsync: markWorn } = useMarkWorn();

  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [plannedDate, setPlannedDate] = useState<string | null>(null);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('outfits.detail.delete'),
      'Weet je zeker dat je deze outfit wilt verwijderen?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteOutfit(outfitId ?? '');
            router.back();
          },
        },
      ],
    );
  }, [deleteOutfit, outfitId, router, t]);

  const handleMarkWorn = useCallback(async () => {
    if (!outfit) return;
    // Mark all items in outfit as worn
    for (const outfitItem of outfit.items) {
      try {
        await markWorn(outfitItem.itemId);
      } catch {
        // ignore individual failures
      }
    }
    Alert.alert('✓ Outfit gemarkeerd als gedragen vandaag');
  }, [outfit, markWorn]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <SkeletonLoader height={240} borderRadius={16} />
          <View style={{ height: spacing.base }} />
          <SkeletonLoader height={20} width="50%" />
          <View style={{ height: spacing.sm }} />
          <SkeletonLoader height={14} width="30%" />
        </View>
      </View>
    );
  }

  if (error || !outfit) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <Button label={t('common.back')} onPress={() => router.back()} variant="ghost" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(app)/outfits/try-on')}
          style={styles.tryOnButton}
          activeOpacity={0.8}
        >
          <Ionicons name="person" size={18} color={colors.accent} />
          <Text style={styles.tryOnText}>Probeer aan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <View style={styles.content}>
          {/* Outfit image or collage */}
          {outfit.imageUrl ? (
            <Image
              source={{ uri: outfit.imageUrl }}
              style={styles.outfitImage}
              resizeMode="cover"
            />
          ) : (
            <Card style={styles.collageCard}>
              <OutfitItemGrid itemIds={outfit.items.map((i) => i.itemId)} />
            </Card>
          )}

          {/* Title */}
          <Text style={styles.outfitTitle}>
            {outfit.name ?? 'Outfit'}
          </Text>

          {/* Tags row */}
          <View style={styles.tagsRow}>
            {outfit.occasion && (
              <Badge label={outfit.occasion} />
            )}
            {outfit.season?.map((s) => (
              <Badge key={s} label={s} small />
            ))}
          </View>

          {/* Stats */}
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{outfit.timesWorn}</Text>
                <Text style={styles.statLabel}>{t('outfits.detail.worn')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{outfit.items.length}</Text>
                <Text style={styles.statLabel}>items</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statValue}>
                  {outfit.lastWornAt ? formatDate(outfit.lastWornAt) : '—'}
                </Text>
                <Text style={styles.statLabel}>{t('outfits.detail.lastWorn')}</Text>
              </View>
            </View>
          </Card>

          {/* AI reasoning placeholder */}
          <Card style={styles.reasoningCard}>
            <View style={styles.reasoningHeader}>
              <Ionicons name="sparkles" size={16} color={colors.accent} />
              <Text style={styles.reasoningTitle}>AI advies</Text>
            </View>
            <Text style={styles.reasoningText}>
              Deze outfit combineert goed op basis van kleur en stijl. Perfect voor{' '}
              {outfit.occasion ?? 'verschillende gelegenheden'}.
            </Text>
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              label={t('outfits.detail.wear')}
              onPress={handleMarkWorn}
              fullWidth
            />
            <Button
              label="Inplannen"
              onPress={() => setPlanModalVisible(true)}
              variant="secondary"
              fullWidth
            />
            <Button
              label={t('outfits.detail.delete')}
              onPress={handleDelete}
              variant="ghost"
              isLoading={isDeleting}
              fullWidth
              textStyle={{ color: colors.status.error }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Plan modal */}
      <Modal
        visible={planModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPlanModalVisible(false)}
      >
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Outfit inplannen</Text>
          <Text style={styles.modalSubtitle}>
            Kies een datum om deze outfit in te plannen.
          </Text>
          <View style={styles.modalActions}>
            <Button
              label="Vandaag"
              onPress={() => {
                setPlannedDate(new Date().toISOString());
                setPlanModalVisible(false);
              }}
              variant="secondary"
              style={styles.modalBtn}
            />
            <Button
              label="Morgen"
              onPress={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setPlannedDate(tomorrow.toISOString());
                setPlanModalVisible(false);
              }}
              variant="secondary"
              style={styles.modalBtn}
            />
          </View>
          <Button
            label={t('common.cancel')}
            onPress={() => setPlanModalVisible(false)}
            variant="ghost"
            fullWidth
          />
        </View>
      </Modal>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.base,
  },
  tryOnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tryOnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.accent,
  },
  content: {
    paddingHorizontal: spacing.screen,
    gap: spacing.base,
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
  },
  collageCard: {
    padding: spacing.md,
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridItem: {
    width: '22%',
    alignItems: 'center',
    gap: spacing.xs,
  },
  gridItemImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  gridItemLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  outfitTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statsCard: {},
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  reasoningCard: {},
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  reasoningTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.accent,
  },
  reasoningText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.md,
  },
  errorText: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    marginTop: 'auto',
    gap: spacing.md,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.lg,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
});
