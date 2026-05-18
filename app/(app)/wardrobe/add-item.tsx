import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { useCreateWardrobeItem } from '@/hooks/useWardrobe';
import { ClothingItem } from '@/store/wardrobeStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import api from '@/services/api';

type Category = ClothingItem['category'];

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'tops', label: 'Bovenstuk' },
  { key: 'bottoms', label: 'Onderstuk' },
  { key: 'outerwear', label: 'Bovenkleding' },
  { key: 'shoes', label: 'Schoenen' },
  { key: 'accessories', label: 'Accessoires' },
  { key: 'dresses', label: 'Jurk / rok' },
];

const SEASONS = ['Lente', 'Zomer', 'Herfst', 'Winter'];

const COLOR_SWATCHES = [
  '#000000', '#FFFFFF', '#808080', '#C0392B', '#E74C3C',
  '#E67E22', '#F1C40F', '#2ECC71', '#27AE60', '#3498DB',
  '#2980B9', '#9B59B6', '#1ABC9C', '#D4A96A', '#F5E6C8',
];

const STYLE_TAGS = ['Casual', 'Formeel', 'Sport', 'Avond', 'Strand', 'Werk'];

export default function AddItemScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mutateAsync: createItem } = useCreateWardrobeItem();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = useCallback(async (source: 'camera' | 'gallery') => {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cameratoegang vereist');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });
    }

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      await analyzeImage(uri);
    }
  }, []);

  const analyzeImage = async (uri: string) => {
    setIsAnalyzing(true);
    try {
      const response = await api.post<{
        category: Category;
        subcategory?: string;
        colors?: string[];
        season?: string[];
      }>('/wardrobe/analyze', { imageUri: uri });
      if (response.data.category) setCategory(response.data.category);
      if (response.data.subcategory) setSubcategory(response.data.subcategory);
      if (response.data.colors) setSelectedColors(response.data.colors);
      if (response.data.season) setSelectedSeasons(response.data.season);
    } catch {
      // AI analysis failed, user fills in manually
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color],
    );
  };

  const toggleSeason = (season: string) => {
    setSelectedSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season],
    );
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style],
    );
  };

  const handleSave = useCallback(async () => {
    if (!imageUri) {
      setError('Voeg een foto toe.');
      return;
    }
    if (!category) {
      setError('Selecteer een categorie.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await createItem({
        imageUrl: imageUri,
        category,
        subcategory: subcategory || undefined,
        brand: brand || undefined,
        colors: selectedColors,
        season: selectedSeasons,
        notes: selectedStyles.join(', ') || undefined,
      });
      router.back();
    } catch {
      setError(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  }, [imageUri, category, subcategory, brand, selectedColors, selectedSeasons, selectedStyles, createItem, router, t]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Item toevoegen</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} activeOpacity={0.7}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.saveText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo section */}
          {!imageUri ? (
            <View style={styles.photoSection}>
              <TouchableOpacity
                style={styles.photoPlaceholder}
                onPress={() => {
                  Alert.alert('Foto toevoegen', undefined, [
                    { text: 'Camera', onPress: () => pickImage('camera') },
                    { text: 'Galerij', onPress: () => pickImage('gallery') },
                    { text: t('common.cancel'), style: 'cancel' },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
                <Text style={styles.photoPlaceholderText}>Foto toevoegen</Text>
                <Text style={styles.photoPlaceholderSub}>Camera of galerij</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoSection}>
              <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
              {isAnalyzing && (
                <View style={styles.analyzingOverlay}>
                  <ActivityIndicator size="large" color={colors.white} />
                  <Text style={styles.analyzingText}>AI analyseert...</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={() => {
                  Alert.alert('Foto wijzigen', undefined, [
                    { text: 'Camera', onPress: () => pickImage('camera') },
                    { text: 'Galerij', onPress: () => pickImage('gallery') },
                    { text: t('common.cancel'), style: 'cancel' },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={16} color={colors.white} />
                <Text style={styles.changePhotoText}>Wijzigen</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Categorie *</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryChip,
                    category === cat.key && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat.key && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Subcategory & Brand */}
          <View style={styles.section}>
            <Input
              label="Subcategorie (bijv. T-shirt)"
              value={subcategory}
              onChangeText={setSubcategory}
            />
            <Input
              label={t('wardrobe.item.brand')}
              value={brand}
              onChangeText={setBrand}
            />
          </View>

          {/* Colors */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('wardrobe.item.color')}</Text>
            <View style={styles.colorGrid}>
              {COLOR_SWATCHES.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    color === '#FFFFFF' && styles.colorSwatchWhite,
                    selectedColors.includes(color) && styles.colorSwatchSelected,
                  ]}
                  onPress={() => toggleColor(color)}
                  activeOpacity={0.8}
                >
                  {selectedColors.includes(color) && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={color === '#FFFFFF' || color === '#F1C40F' ? colors.accent : colors.white}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Style tags */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Stijl</Text>
            <View style={styles.tagRow}>
              {STYLE_TAGS.map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.tag,
                    selectedStyles.includes(style) && styles.tagActive,
                  ]}
                  onPress={() => toggleStyle(style)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tagText,
                      selectedStyles.includes(style) && styles.tagTextActive,
                    ]}
                  >
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Season checkboxes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('wardrobe.item.season')}</Text>
            <View style={styles.seasonRow}>
              {SEASONS.map((season) => (
                <TouchableOpacity
                  key={season}
                  style={[
                    styles.seasonChip,
                    selectedSeasons.includes(season) && styles.seasonChipActive,
                  ]}
                  onPress={() => toggleSeason(season)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.seasonChipText,
                      selectedSeasons.includes(season) && styles.seasonChipTextActive,
                    ]}
                  >
                    {season}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {error !== null && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <Button
            label={t('common.save')}
            onPress={handleSave}
            isLoading={isSaving}
            fullWidth
            style={styles.saveButton}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  saveText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.accent,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
  },
  photoSection: {
    marginBottom: spacing.xl,
    borderRadius: 16,
    overflow: 'hidden',
    aspectRatio: 3 / 4,
    backgroundColor: colors.surfaceAlt,
    maxHeight: 320,
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 16,
  },
  photoPlaceholderText: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  photoPlaceholderSub: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  analyzingText: {
    color: colors.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  changePhotoText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  section: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryChipText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchWhite: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: colors.accent,
    transform: [{ scale: 1.15 }],
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tagActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tagText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  tagTextActive: {
    color: colors.white,
  },
  seasonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  seasonChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  seasonChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  seasonChipText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  seasonChipTextActive: {
    color: colors.white,
  },
  errorText: {
    fontSize: typography.fontSizes.sm,
    color: colors.status.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
});
