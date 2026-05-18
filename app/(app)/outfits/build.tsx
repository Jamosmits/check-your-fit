import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { useWardrobeStore, ClothingItem } from '@/store/wardrobeStore';
import { useCreateOutfit, useAISuggestions } from '@/hooks/useOutfits';
import { OutfitCanvas } from '@/components/outfits/OutfitCanvas';
import { FilterBar } from '@/components/wardrobe/FilterBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type FilterCategory = 'all' | ClothingItem['category'];

const OCCASION_OPTIONS = [
  { key: 'casual', label: 'Casual' },
  { key: 'work', label: 'Werk' },
  { key: 'evening', label: 'Avond' },
  { key: 'sport', label: 'Sport' },
  { key: 'formal', label: 'Formeel' },
];

export default function OutfitBuildScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const allItems = useWardrobeStore((s) => s.items);
  const { mutateAsync: createOutfit, isPending: isSaving } = useCreateOutfit();

  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [canvasItems, setCanvasItems] = useState<
    Array<{ itemId: string; position: { x: number; y: number } }>
  >([]);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [isAISuggesting, setIsAISuggesting] = useState(false);

  const filteredItems = allItems.filter((item) =>
    activeCategory === 'all' ? true : item.category === activeCategory,
  );

  const { refetch: fetchAISuggestion } = useAISuggestions({});

  const handleAISuggest = useCallback(async () => {
    setIsAISuggesting(true);
    try {
      const result = await fetchAISuggestion();
      const suggestion = result.data?.[0];
      if (suggestion) {
        const newCanvasItems = suggestion.items.map((itemId, index) => ({
          itemId,
          position: {
            x: 20 + (index % 3) * 120,
            y: 20 + Math.floor(index / 3) * 120,
          },
        }));
        setCanvasItems(newCanvasItems);
        if (suggestion.occasion) {
          setSelectedOccasion(suggestion.occasion);
        }
      }
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setIsAISuggesting(false);
    }
  }, [fetchAISuggestion, t]);

  const handleSave = useCallback(async () => {
    if (canvasItems.length === 0) {
      Alert.alert('Voeg minimaal één item toe aan je outfit.');
      return;
    }
    try {
      const outfit = await createOutfit({
        name: outfitName || undefined,
        items: canvasItems,
        occasion: selectedOccasion ?? undefined,
      });
      setSaveModalVisible(false);
      router.replace(`/(app)/outfits/${outfit.id}`);
    } catch {
      Alert.alert(t('common.error'));
    }
  }, [canvasItems, outfitName, selectedOccasion, createOutfit, router, t]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('outfits.create.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Canvas area */}
      <View style={styles.canvasArea}>
        <OutfitCanvas
          availableItems={filteredItems}
          onItemsChange={setCanvasItems}
        />
      </View>

      {/* Wardrobe items with filter */}
      <View style={styles.wardrobeSection}>
        <FilterBar
          activeCategory={activeCategory}
          onCategoryChange={(cat) => setActiveCategory(cat as FilterCategory)}
        />
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity
          style={styles.bottomBarBtn}
          onPress={handleAISuggest}
          disabled={isAISuggesting}
          activeOpacity={0.8}
        >
          {isAISuggesting ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="sparkles" size={20} color={colors.accent} />
          )}
          <Text style={styles.bottomBarBtnText}>AI: Maak compleet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomBarBtn, styles.bottomBarBtnPrimary]}
          onPress={() => setSaveModalVisible(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="checkmark" size={20} color={colors.white} />
          <Text style={[styles.bottomBarBtnText, styles.bottomBarBtnTextPrimary]}>
            {t('outfits.create.save')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Save modal */}
      <Modal
        visible={saveModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSaveModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('outfits.create.save')}</Text>

            <Input
              label={t('outfits.create.namePlaceholder')}
              value={outfitName}
              onChangeText={setOutfitName}
            />

            <Text style={styles.occasionLabel}>{t('outfits.create.occasion')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.occasionScroll}
            >
              {OCCASION_OPTIONS.map((occ) => (
                <TouchableOpacity
                  key={occ.key}
                  style={[
                    styles.occasionChip,
                    selectedOccasion === occ.key && styles.occasionChipActive,
                  ]}
                  onPress={() =>
                    setSelectedOccasion(
                      selectedOccasion === occ.key ? null : occ.key,
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.occasionChipText,
                      selectedOccasion === occ.key && styles.occasionChipTextActive,
                    ]}
                  >
                    {occ.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                label={t('common.cancel')}
                onPress={() => setSaveModalVisible(false)}
                variant="secondary"
                style={styles.modalBtn}
              />
              <Button
                label={t('common.save')}
                onPress={handleSave}
                isLoading={isSaving}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  canvasArea: {
    flex: 1,
  },
  wardrobeSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  bottomBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bottomBarBtnPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  bottomBarBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.accent,
  },
  bottomBarBtnTextPrimary: {
    color: colors.white,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
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
    marginBottom: spacing.xs,
  },
  occasionLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  occasionScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  occasionChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  occasionChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  occasionChipText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  occasionChipTextActive: {
    color: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});
