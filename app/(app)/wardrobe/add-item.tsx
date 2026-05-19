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

type Category = ClothingItem['category'];

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'tops',        label: 'Bovenstuk'   },
  { key: 'bottoms',     label: 'Onderstuk'   },
  { key: 'outerwear',   label: 'Bovenkleding'},
  { key: 'shoes',       label: 'Schoenen'    },
  { key: 'accessories', label: 'Accessoires' },
  { key: 'dresses',     label: 'Jurk / rok'  },
];

const SEASONS   = ['Lente', 'Zomer', 'Herfst', 'Winter'];
const COLOR_SWATCHES = [
  '#000000','#FFFFFF','#808080','#C0392B','#E74C3C',
  '#E67E22','#F1C40F','#2ECC71','#27AE60','#3498DB',
  '#2980B9','#9B59B6','#1ABC9C','#D4A96A','#F5E6C8',
];
const STYLE_TAGS = ['Casual','Formeel','Sport','Avond','Strand','Werk'];

// Known webshops → demo product data
const DEMO_PRODUCTS: Record<string, Partial<ClothingItem> & { name: string }> = {
  zalando:  { name: 'Zalando product', category: 'tops',    subcategory: 'T-shirt',     brand: 'Tommy Hilfiger', colors: ['#FFFFFF'] },
  asos:     { name: 'ASOS product',    category: 'bottoms', subcategory: 'Slim jeans',  brand: 'ASOS Design',   colors: ['#1E3A5F'] },
  zara:     { name: 'Zara product',    category: 'dresses', subcategory: 'Midi jurk',   brand: 'Zara',          colors: ['#2C2C2C'] },
  hm:       { name: 'H&M product',     category: 'tops',    subcategory: 'Overhemd',    brand: 'H&M',           colors: ['#87CEEB'] },
  uniqlo:   { name: 'Uniqlo product',  category: 'tops',    subcategory: 'T-shirt',     brand: 'Uniqlo',        colors: ['#FFFFFF'] },
  mango:    { name: 'Mango product',   category: 'outerwear',subcategory:'Blazer',      brand: 'Mango',         colors: ['#8B4513'] },
  nike:     { name: 'Nike product',    category: 'shoes',   subcategory: 'Sneakers',    brand: 'Nike',          colors: ['#FFFFFF'] },
  adidas:   { name: 'Adidas product',  category: 'shoes',   subcategory: 'Sneakers',    brand: 'Adidas',        colors: ['#FFFFFF'] },
};

function detectShop(url: string): string | null {
  const lower = url.toLowerCase();
  for (const key of Object.keys(DEMO_PRODUCTS)) {
    if (lower.includes(key.replace('hm', 'h&m').replace('hm', 'h-m').replace('hm', 'hm.'))) {
      return key;
    }
  }
  if (lower.includes('h&m') || lower.includes('hm.com')) return 'hm';
  return null;
}

export default function AddItemScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mutateAsync: createItem } = useCreateWardrobeItem();

  // URL import
  const [urlInput, setUrlInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Photo + form
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState('');
  const [brand, setBrand] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── URL import ──────────────────────────────────────────────────────────────
  const handleImportUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    setIsImporting(true);
    setError(null);
    try {
      // Simulate a brief loading delay, then parse locally — no backend needed
      await new Promise((r) => setTimeout(r, 900));
      const shop = detectShop(urlInput);
      if (shop && DEMO_PRODUCTS[shop]) {
        const p = DEMO_PRODUCTS[shop];
        if (p.category) setCategory(p.category);
        if (p.subcategory) setSubcategory(p.subcategory);
        if (p.brand) setBrand(p.brand);
        if (p.colors) setSelectedColors(p.colors);
        // Use the URL itself as the image source so the item has something to show
        setImageUri(urlInput.trim());
        setUrlInput('');
      } else {
        Alert.alert(
          'Webshop niet herkend',
          'Ondersteunde webshops: Zalando, ASOS, Zara, H&M, Uniqlo, Mango, Nike, Adidas.\n\nVoeg de URL toe als afbeelding of vul de gegevens handmatig in.',
          [
            {
              text: 'Gebruik URL als foto',
              onPress: () => { setImageUri(urlInput.trim()); setUrlInput(''); },
            },
            { text: 'Handmatig invullen', style: 'cancel' },
          ],
        );
      }
    } catch {
      setError('URL importeren mislukt. Vul de gegevens handmatig in.');
    } finally {
      setIsImporting(false);
    }
  }, [urlInput]);

  // ── Image picker ────────────────────────────────────────────────────────────
  const pickImage = useCallback(async (source: 'camera' | 'gallery') => {
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Cameratoegang vereist'); return; }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8, allowsEditing: true, aspect: [3, 4],
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8, allowsEditing: true, aspect: [3, 4],
      });
    }
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const toggleColor  = (c: string) => setSelectedColors((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);
  const toggleSeason = (s: string) => setSelectedSeasons((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);
  const toggleStyle  = (s: string) => setSelectedStyles((p)  => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  const handleSave = useCallback(async () => {
    if (!imageUri) { setError('Voeg een foto toe.'); return; }
    if (!category) { setError('Selecteer een categorie.'); return; }
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Item toevoegen</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} activeOpacity={0.7}>
            {isSaving
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Text style={styles.saveText}>{t('common.save')}</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── URL IMPORT ─────────────────────────────────────────────────── */}
          <View style={styles.urlSection}>
            <View style={styles.urlHeader}>
              <Ionicons name="link-outline" size={18} color={colors.accent} />
              <Text style={styles.urlTitle}>Importeer via webshop URL</Text>
            </View>
            <View style={styles.urlRow}>
              <View style={styles.urlInputWrap}>
                <Input
                  label="Webshop URL"
                  placeholder="https://www.zalando.nl/product/..."
                  value={urlInput}
                  onChangeText={setUrlInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
              <TouchableOpacity
                style={[styles.urlButton, (!urlInput.trim() || isImporting) && styles.urlButtonDisabled]}
                onPress={handleImportUrl}
                disabled={!urlInput.trim() || isImporting}
                activeOpacity={0.8}
              >
                {isImporting
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.urlButtonText}>Importeer</Text>
                }
              </TouchableOpacity>
            </View>
            <Text style={styles.urlHint}>Zalando · ASOS · Zara · H&M · Uniqlo · Nike · meer</Text>
          </View>

          {/* ── DIVIDER ────────────────────────────────────────────────────── */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>of voeg foto toe</Text>
            <View style={styles.orLine} />
          </View>

          {/* ── PHOTO ──────────────────────────────────────────────────────── */}
          {!imageUri ? (
            <View style={styles.photoSection}>
              <TouchableOpacity
                style={styles.photoPlaceholder}
                onPress={() => Alert.alert('Foto toevoegen', undefined, [
                  { text: 'Camera',  onPress: () => pickImage('camera')  },
                  { text: 'Galerij', onPress: () => pickImage('gallery') },
                  { text: t('common.cancel'), style: 'cancel' },
                ])}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
                <Text style={styles.photoPlaceholderText}>Foto toevoegen</Text>
                <Text style={styles.photoPlaceholderSub}>Camera of galerij</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoSection}>
              <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="contain" />
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={() => Alert.alert('Foto wijzigen', undefined, [
                  { text: 'Camera',  onPress: () => pickImage('camera')  },
                  { text: 'Galerij', onPress: () => pickImage('gallery') },
                  { text: t('common.cancel'), style: 'cancel' },
                ])}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={16} color={colors.white} />
                <Text style={styles.changePhotoText}>Wijzigen</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── CATEGORY ───────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Categorie *</Text>
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.chip, category === cat.key && styles.chipActive]}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, category === cat.key && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── SUBCATEGORY + BRAND ────────────────────────────────────────── */}
          <View style={styles.section}>
            <Input label="Subcategorie (bijv. T-shirt)" value={subcategory} onChangeText={setSubcategory} />
            <Input label={t('wardrobe.item.brand')} value={brand} onChangeText={setBrand} />
          </View>

          {/* ── COLORS ─────────────────────────────────────────────────────── */}
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
                      name="checkmark" size={14}
                      color={color === '#FFFFFF' || color === '#F1C40F' ? colors.accent : colors.white}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── STYLE TAGS ─────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Stijl</Text>
            <View style={styles.chipGrid}>
              {STYLE_TAGS.map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[styles.chip, selectedStyles.includes(style) && styles.chipActive]}
                  onPress={() => toggleStyle(style)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, selectedStyles.includes(style) && styles.chipTextActive]}>
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── SEASON ─────────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('wardrobe.item.season')}</Text>
            <View style={styles.seasonRow}>
              {SEASONS.map((season) => (
                <TouchableOpacity
                  key={season}
                  style={[styles.seasonChip, selectedSeasons.includes(season) && styles.seasonChipActive]}
                  onPress={() => toggleSeason(season)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.seasonChipText, selectedSeasons.includes(season) && styles.seasonChipTextActive]}>
                    {season}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {error !== null && <Text style={styles.errorText}>{error}</Text>}

          <Button label={t('common.save')} onPress={handleSave} isLoading={isSaving} fullWidth style={styles.saveButton} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screen, paddingVertical: spacing.base,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontFamily: typography.fonts.serif.bold, fontSize: typography.fontSizes.md, color: colors.textPrimary },
  saveText:    { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.semibold, color: colors.accent },
  content:     { paddingHorizontal: spacing.screen, paddingTop: spacing.base },

  // URL import
  urlSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.base,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  urlHeader:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  urlTitle:       { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.semibold, color: colors.textPrimary },
  urlRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  urlInputWrap:   { flex: 1 },
  urlButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minWidth: 90,
    alignItems: 'center',
  },
  urlButtonDisabled: { opacity: 0.4 },
  urlButtonText:     { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold, color: colors.white },
  urlHint:           { fontSize: typography.fontSizes.xs, color: colors.textMuted },

  orRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontSize: typography.fontSizes.sm, color: colors.textMuted },

  // Photo
  photoSection: {
    marginBottom: spacing.xl, borderRadius: 16, overflow: 'hidden',
    aspectRatio: 3 / 4, backgroundColor: '#FFFFFF', maxHeight: 320,
  },
  photoPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 16,
  },
  photoPlaceholderText: { fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.medium, color: colors.textSecondary },
  photoPlaceholderSub:  { fontSize: typography.fontSizes.sm, color: colors.textMuted },
  photo:                { width: '100%', height: '100%' },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  analyzingText:   { color: colors.white, fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium },
  changePhotoButton: {
    position: 'absolute', bottom: spacing.sm, right: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs, borderRadius: 8,
  },
  changePhotoText: { color: colors.white, fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.medium },

  // Form
  section:      { marginBottom: spacing.xl, gap: spacing.sm },
  sectionLabel: {
    fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.xs,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderRadius: 100, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive:     { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText:       { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium, color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  colorGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorSwatch:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorSwatchWhite:  { borderWidth: 1, borderColor: colors.border },
  colorSwatchSelected: { borderWidth: 2.5, borderColor: colors.accent, transform: [{ scale: 1.15 }] },
  seasonRow:         { flexDirection: 'row', gap: spacing.sm },
  seasonChip: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.surface,
  },
  seasonChipActive:     { backgroundColor: colors.accent, borderColor: colors.accent },
  seasonChipText:       { fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.medium, color: colors.textSecondary },
  seasonChipTextActive: { color: colors.white },
  errorText:  { fontSize: typography.fontSizes.sm, color: colors.status.error, textAlign: 'center', marginBottom: spacing.md },
  saveButton: { marginTop: spacing.sm },
});
