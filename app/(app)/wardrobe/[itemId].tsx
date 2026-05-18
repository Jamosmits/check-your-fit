import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { useWardrobeItem, useDeleteWardrobeItem, useMarkWorn, useUpdateWardrobeItem } from '@/hooks/useWardrobe';
import { ClothingItem } from '@/store/wardrobeStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Input } from '@/components/ui/Input';

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ItemDetailScreen() {
  const { t } = useTranslation();
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: item, isLoading, error } = useWardrobeItem(itemId ?? '');
  const { mutateAsync: deleteItem, isPending: isDeleting } = useDeleteWardrobeItem();
  const { mutateAsync: markWorn, isPending: isMarkingWorn } = useMarkWorn();
  const { mutateAsync: updateItem, isPending: isUpdating } = useUpdateWardrobeItem();

  const [isEditMode, setIsEditMode] = useState(false);
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editBrand, setEditBrand] = useState('');

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('wardrobe.item.confirmDelete'),
      undefined,
      [
        { text: t('wardrobe.item.cancelButton'), style: 'cancel' },
        {
          text: t('wardrobe.item.deleteButton'),
          style: 'destructive',
          onPress: async () => {
            await deleteItem(itemId ?? '');
            router.back();
          },
        },
      ],
    );
  }, [deleteItem, itemId, router, t]);

  const handleMarkWorn = useCallback(async () => {
    await markWorn(itemId ?? '');
    Alert.alert('✓ Gedragen vandaag gemarkeerd');
  }, [markWorn, itemId]);

  const handleEditSave = useCallback(async () => {
    await updateItem({
      id: itemId ?? '',
      data: {
        subcategory: editSubcategory || undefined,
        brand: editBrand || undefined,
      },
    });
    setIsEditMode(false);
  }, [itemId, updateItem, editSubcategory, editBrand]);

  const startEdit = useCallback(() => {
    if (item) {
      setEditSubcategory(item.subcategory ?? '');
      setEditBrand(item.brand ?? '');
      setIsEditMode(true);
    }
  }, [item]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const costPerWear = (itemData: ClothingItem) => {
    // placeholder — price not in model yet
    return '—';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <SkeletonLoader height={320} borderRadius={0} />
        <View style={styles.content}>
          <SkeletonLoader height={20} width="50%" />
          <View style={{ height: spacing.sm }} />
          <SkeletonLoader height={14} width="30%" />
        </View>
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <Button label={t('common.back')} onPress={() => router.back()} variant="ghost" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Nav header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={startEdit} activeOpacity={0.7}>
          <Text style={styles.editText}>{t('common.edit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {/* Photo */}
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.photo}
          resizeMode="cover"
        />

        <View style={styles.content}>
          {/* Category badge + title */}
          <View style={styles.titleRow}>
            <Badge label={item.category} category={item.category} />
          </View>
          <Text style={styles.itemTitle}>
            {item.subcategory ?? item.category}
          </Text>
          {item.brand && (
            <Text style={styles.itemBrand}>{item.brand}</Text>
          )}

          {/* Stats */}
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatCell
                label={t('wardrobe.item.timesWorn')}
                value={String(item.timesWorn)}
              />
              <View style={styles.statDivider} />
              <StatCell
                label={t('wardrobe.item.lastWorn')}
                value={formatDate(item.lastWornAt)}
              />
              <View style={styles.statDivider} />
              <StatCell
                label="Kosten/draag"
                value={costPerWear(item)}
              />
            </View>
          </Card>

          {/* Colors */}
          {item.colors && item.colors.length > 0 && (
            <View style={styles.metaSection}>
              <Text style={styles.metaLabel}>{t('wardrobe.item.color')}</Text>
              <View style={styles.colorRow}>
                {item.colors.map((color) => (
                  <View
                    key={color}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      color === '#FFFFFF' && styles.colorDotWhite,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Season tags */}
          {item.season && item.season.length > 0 && (
            <View style={styles.metaSection}>
              <Text style={styles.metaLabel}>{t('wardrobe.item.season')}</Text>
              <View style={styles.tagRow}>
                {item.season.map((s) => (
                  <Badge key={s} label={s} small />
                ))}
              </View>
            </View>
          )}

          {/* Edit form */}
          {isEditMode && (
            <Card style={styles.editCard}>
              <Text style={styles.editTitle}>Bewerken</Text>
              <Input
                label="Subcategorie"
                value={editSubcategory}
                onChangeText={setEditSubcategory}
              />
              <Input
                label={t('wardrobe.item.brand')}
                value={editBrand}
                onChangeText={setEditBrand}
              />
              <View style={styles.editActions}>
                <Button
                  label={t('common.cancel')}
                  onPress={() => setIsEditMode(false)}
                  variant="secondary"
                  style={styles.editActionBtn}
                />
                <Button
                  label={t('common.save')}
                  onPress={handleEditSave}
                  isLoading={isUpdating}
                  style={styles.editActionBtn}
                />
              </View>
            </Card>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              label={t('wardrobe.item.markWorn')}
              onPress={handleMarkWorn}
              isLoading={isMarkingWorn}
              variant="primary"
              fullWidth
            />
            <Button
              label="Toevoegen aan outfit"
              onPress={() => router.push('/(app)/outfits/build')}
              variant="secondary"
              fullWidth
            />
            <Button
              label={t('wardrobe.item.delete')}
              onPress={handleDelete}
              variant="ghost"
              isLoading={isDeleting}
              fullWidth
              textStyle={{ color: colors.status.error }}
            />
          </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.base,
  },
  backButton: {
    position: 'absolute',
    top: spacing.base,
    left: spacing.screen,
  },
  editText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.accent,
  },
  photo: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceAlt,
    maxHeight: 400,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
  },
  titleRow: {
    marginBottom: spacing.sm,
  },
  itemTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  itemBrand: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsCard: {
    marginTop: spacing.base,
    marginBottom: spacing.base,
  },
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
    fontSize: typography.fontSizes.lg,
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
  metaSection: {
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  metaLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorDotWhite: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  editCard: {
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  editTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editActionBtn: {
    flex: 1,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.base,
  },
  errorText: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
});
