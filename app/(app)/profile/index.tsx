import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore, BodyMeasurements } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWardrobeStore } from '@/store/wardrobeStore';
import { useWardrobeItems } from '@/hooks/useWardrobe';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { ClothingCard } from '@/components/wardrobe/ClothingCard';
import { processBodyPhoto, generateModelPoses } from '@/services/modelPhotoService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function StatBox({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.statBox, accent && styles.statBoxAccent]}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={[styles.statLabel, accent && styles.statLabelAccent]}>{label}</Text>
    </View>
  );
}

const POSE_LABELS: { key: 'front' | 'side' | 'back'; label: string }[] = [
  { key: 'front', label: 'Voor' },
  { key: 'side',  label: 'Zij'  },
  { key: 'back',  label: 'Achter' },
];

function BodyPhotoSection() {
  const bodyPhotoUri      = useAuthStore((s) => s.bodyPhotoUri);
  const modelPhotoUrl     = useAuthStore((s) => s.modelPhotoUrl);
  const modelPoses        = useAuthStore((s) => s.modelPoses);
  const bodyMeasurements  = useAuthStore((s) => s.bodyMeasurements);
  const setBodyPhoto      = useAuthStore((s) => s.setBodyPhoto);
  const setModelPhotoUrl  = useAuthStore((s) => s.setModelPhotoUrl);
  const setModelPoses     = useAuthStore((s) => s.setModelPoses);
  const openaiKey         = useSettingsStore((s) => s.openaiKey);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [activeTab, setActiveTab] = useState<'front' | 'side' | 'back'>('front');

  // Only show the processed/AI version — never the raw original
  const activePhotoUri = modelPoses
    ? (modelPoses[activeTab] ?? modelPoses.front)
    : modelPhotoUrl;

  const pickBodyPhoto = useCallback(async (source: 'camera' | 'gallery') => {
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Cameratoegang vereist'); return; }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85, allowsEditing: true, aspect: [2, 3],
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85, allowsEditing: true, aspect: [2, 3],
      });
    }
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      await setBodyPhoto(uri);
      if (!openaiKey) {
        Alert.alert(
          'OpenAI key ontbreekt',
          'Stel je OpenAI key in bij Instellingen om je modelfoto te verwerken.',
        );
        return;
      }
      try {
        setIsProcessing(true);
        setProcessingLabel('Model verwerken...');
        const frontUri = await processBodyPhoto(uri, openaiKey, bodyMeasurements ?? undefined);
        await setModelPhotoUrl(frontUri);
        await setModelPoses({ front: frontUri, side: null, back: null });
        setActiveTab('front');

        setProcessingLabel('Poses genereren...');
        const { side, back } = await generateModelPoses(frontUri, openaiKey);
        await setModelPoses({ front: frontUri, side, back });
      } catch (e) {
        console.warn('[BodyPhotoSection] model processing failed:', e);
        Alert.alert('Verwerking mislukt', 'Probeer opnieuw. Controleer je OpenAI key en internetverbinding.');
        // Clear any partial state — don't show the raw original
        await setModelPhotoUrl(null);
        await setModelPoses(null);
      } finally {
        setIsProcessing(false);
        setProcessingLabel('');
      }
    }
  }, [openaiKey, setBodyPhoto, setModelPhotoUrl, setModelPoses]);

  const handlePress = useCallback(() => {
    Alert.alert(
      bodyPhotoUri ? 'Modelfoto wijzigen' : 'Modelfoto toevoegen',
      'Wordt automatisch omgezet naar een professionele modelfoto.',
      [
        { text: 'Camera',  onPress: () => pickBodyPhoto('camera')  },
        { text: 'Galerij', onPress: () => pickBodyPhoto('gallery') },
        ...(bodyPhotoUri ? [{ text: 'Verwijder foto', style: 'destructive' as const, onPress: async () => {
          await setBodyPhoto(null);
          await setModelPhotoUrl(null);
          await setModelPoses(null);
        }}] : []),
        { text: 'Annuleer', style: 'cancel' },
      ],
    );
  }, [bodyPhotoUri, pickBodyPhoto, setBodyPhoto, setModelPhotoUrl, setModelPoses]);

  return (
    <Card style={bodyStyles.card}>
      <View style={bodyStyles.header}>
        <Ionicons name="body-outline" size={20} color={colors.accent} />
        <View style={bodyStyles.headerText}>
          <Text style={bodyStyles.title}>Mijn model</Text>
          <Text style={bodyStyles.subtitle}>Voor virtual try-on</Text>
        </View>
        <TouchableOpacity onPress={handlePress} style={bodyStyles.addBtn} activeOpacity={0.8}>
          <Ionicons name={bodyPhotoUri ? 'create-outline' : 'add'} size={18} color={colors.white} />
          <Text style={bodyStyles.addBtnText}>{bodyPhotoUri ? 'Wijzig' : 'Voeg toe'}</Text>
        </TouchableOpacity>
      </View>

      {isProcessing ? (
        <View style={bodyStyles.processingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={bodyStyles.processingText}>{processingLabel}</Text>
        </View>
      ) : activePhotoUri ? (
        <>
          <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={bodyStyles.photoWrap}>
            <Image source={{ uri: activePhotoUri }} style={bodyStyles.photo} resizeMode="cover" />
          </TouchableOpacity>
          {modelPoses && (
            <View style={bodyStyles.poseRow}>
              {POSE_LABELS.map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[bodyStyles.poseTab, activeTab === key && bodyStyles.poseTabActive]}
                  onPress={() => setActiveTab(key)}
                  activeOpacity={0.8}
                  disabled={!modelPoses[key]}
                >
                  {!modelPoses[key] ? (
                    <ActivityIndicator size="small" color={colors.textMuted} />
                  ) : (
                    <Text style={[bodyStyles.poseTabText, activeTab === key && bodyStyles.poseTabTextActive]}>
                      {label}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      ) : (
        <TouchableOpacity onPress={handlePress} style={bodyStyles.placeholder} activeOpacity={0.8}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={bodyStyles.placeholderText}>Tik om een foto toe te voegen</Text>
          <Text style={bodyStyles.placeholderHint}>Wordt automatisch omgezet naar professionele modelfoto</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const SIZES: BodyMeasurements['clothingSize'][] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const GENDERS: { value: BodyMeasurements['gender']; label: string }[] = [
  { value: 'female', label: 'Vrouw' },
  { value: 'male',   label: 'Man'   },
  { value: 'other',  label: 'Overig'},
];

function BodyMeasurementsSection() {
  const measurements        = useAuthStore((s) => s.bodyMeasurements);
  const setBodyMeasurements = useAuthStore((s) => s.setBodyMeasurements);

  const [draft, setDraft] = useState<BodyMeasurements>(measurements ?? {});
  const [saved, setSaved]  = useState(false);

  const handleSave = useCallback(async () => {
    await setBodyMeasurements(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [draft, setBodyMeasurements]);

  return (
    <Card style={measS.card}>
      <Text style={measS.title}>Lichaamsmaten</Text>
      <Text style={measS.subtitle}>Worden gebruikt voor nauwkeuriger try-on resultaten</Text>

      {/* Gender */}
      <View style={measS.fieldGroup}>
        <Text style={measS.fieldLabel}>Geslacht</Text>
        <View style={measS.chipRow}>
          {GENDERS.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[measS.chip, draft.gender === value && measS.chipActive]}
              onPress={() => setDraft((d) => ({ ...d, gender: value }))}
              activeOpacity={0.8}
            >
              <Text style={[measS.chipText, draft.gender === value && measS.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Height + Weight in a row */}
      <View style={measS.row}>
        <View style={[measS.fieldGroup, { flex: 1 }]}>
          <Text style={measS.fieldLabel}>Lengte (cm)</Text>
          <TextInput
            style={measS.input}
            value={draft.heightCm ? String(draft.heightCm) : ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, heightCm: v ? parseInt(v, 10) : undefined }))}
            placeholder="175"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
        <View style={[measS.fieldGroup, { flex: 1 }]}>
          <Text style={measS.fieldLabel}>Gewicht (kg)</Text>
          <TextInput
            style={measS.input}
            value={draft.weightKg ? String(draft.weightKg) : ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, weightKg: v ? parseInt(v, 10) : undefined }))}
            placeholder="65"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
      </View>

      {/* Clothing size */}
      <View style={measS.fieldGroup}>
        <Text style={measS.fieldLabel}>Kledingmaat</Text>
        <View style={measS.chipRow}>
          {SIZES.map((size) => (
            <TouchableOpacity
              key={size}
              style={[measS.chip, measS.chipSm, draft.clothingSize === size && measS.chipActive]}
              onPress={() => setDraft((d) => ({ ...d, clothingSize: size }))}
              activeOpacity={0.8}
            >
              <Text style={[measS.chipText, draft.clothingSize === size && measS.chipTextActive]}>{size}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Shoe size */}
      <View style={measS.fieldGroup}>
        <Text style={measS.fieldLabel}>Schoenmaat</Text>
        <TextInput
          style={[measS.input, { alignSelf: 'flex-start', minWidth: 80 }]}
          value={draft.shoeSize ?? ''}
          onChangeText={(v) => setDraft((d) => ({ ...d, shoeSize: v || undefined }))}
          placeholder="38"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          maxLength={4}
        />
      </View>

      <TouchableOpacity
        style={[measS.saveBtn, saved && measS.saveBtnDone]}
        onPress={handleSave}
        activeOpacity={0.8}
      >
        <Text style={measS.saveBtnText}>{saved ? '✓ Opgeslagen' : 'Opslaan'}</Text>
      </TouchableOpacity>
    </Card>
  );
}

const measS = StyleSheet.create({
  card:     { gap: spacing.md },
  title:    { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.textPrimary },
  subtitle: { fontSize: fontSizes.xs, color: colors.textSecondary, marginTop: -spacing.xs },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', gap: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipSm: { paddingHorizontal: spacing.sm },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  input: {
    height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, fontSize: fontSizes.base,
    color: colors.textPrimary, backgroundColor: colors.surfaceAlt,
  },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: spacing.sm + 2, alignItems: 'center',
  },
  saveBtnDone: { backgroundColor: colors.status.success },
  saveBtnText: { color: colors.white, fontSize: fontSizes.base, fontWeight: fontWeights.semibold },
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: items = [], isLoading } = useWardrobeItems();

  const stats = useMemo(() => {
    if (!items.length) return null;

    const now = Date.now();
    const forgotten = items.filter(
      (item) =>
        !item.lastWornAt ||
        now - new Date(item.lastWornAt).getTime() > SIXTY_DAYS_MS,
    );

    // Most worn color (colors is string[])
    const colorCount: Record<string, number> = {};
    items.forEach((item) => {
      const dominant = item.colors?.[0] ?? item.color;
      if (dominant) colorCount[dominant] = (colorCount[dominant] ?? 0) + 1;
    });
    const mostWornColor = Object.entries(colorCount).sort((a, b) => b[1] - a[1])[0];

    const topWorn = [...items]
      .sort((a, b) => (b.timesWorn ?? 0) - (a.timesWorn ?? 0))
      .slice(0, 5);

    return { forgotten, mostWornColor, topWorn };
  }, [items]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar
            imageUrl={user?.avatarUrl}
            name={user?.name}
            size={64}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/profile/settings')}
          style={styles.settingsBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="settings" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Stats grid */}
      <Text style={styles.sectionTitle}>{t('profile.stats' as never)}</Text>
      {isLoading ? (
        <View style={styles.statsGrid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.statBox}>
              <SkeletonLoader height={28} width="50%" />
              <View style={{ height: 4 }} />
              <SkeletonLoader height={14} width="80%" />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <StatBox
            value={String(items.length)}
            label={t('profile.totalItems' as never)}
            accent
          />
          <StatBox
            value={stats?.mostWornColor?.[0] ?? '—'}
            label={t('profile.mostWornColor' as never)}
          />
          <StatBox
            value="—"
            label={t('profile.wardrobeValue' as never)}
          />
          <StatBox
            value="—"
            label={t('profile.costPerWear' as never)}
          />
        </View>
      )}

      {/* Top 5 most worn */}
      {!isLoading && stats && stats.topWorn.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('profile.mostWornItems' as never)}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {stats.topWorn.map((item) => (
              <View key={item.id} style={styles.horizontalCard}>
                <ClothingCard
                  item={item}
                  onPress={() => router.push(`/(app)/wardrobe/${item.id}`)}
                />
                <Text style={styles.wornCount}>
                  {item.timesWorn ?? 0}× gedragen
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* Forgotten items */}
      {!isLoading && stats && stats.forgotten.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            {t('profile.forgottenItems' as never)} ({stats.forgotten.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {stats.forgotten.slice(0, 8).map((item) => (
              <View key={item.id} style={styles.horizontalCard}>
                <ClothingCard
                  item={item}
                  onPress={() => router.push(`/(app)/wardrobe/${item.id}`)}
                />
                <Text style={styles.forgottenLabel}>
                  {item.lastWornAt
                    ? `${Math.floor(
                        (Date.now() - new Date(item.lastWornAt).getTime()) /
                          (24 * 60 * 60 * 1000),
                      )}d niet gedragen`
                    : 'Nooit gedragen'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* Body scan */}
      <BodyMeasurementsSection />

      <BodyPhotoSection />

      {/* Settings shortcut */}
      <Card style={styles.settingsCard}>
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => router.push('/(app)/profile/settings')}
        >
          <Feather name="settings" size={20} color={colors.textPrimary} />
          <Text style={styles.settingsRowLabel}>{t('profile.settings' as never)}</Text>
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const STAT_BOX_WIDTH = (SCREEN_WIDTH - spacing.screen * 2 - spacing.md) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screen,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statBox: {
    width: STAT_BOX_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.base,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  statBoxAccent: {
    backgroundColor: colors.accent,
  },
  statValue: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  statValueAccent: {
    color: colors.white,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statLabelAccent: {
    color: 'rgba(255,255,255,0.7)',
  },
  horizontalList: {
    paddingRight: spacing.screen,
    gap: spacing.md,
  },
  horizontalCard: {
    width: 130,
    gap: spacing.xs,
  },
  wornCount: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  forgottenLabel: {
    fontSize: fontSizes.xs,
    color: colors.status.warning,
    textAlign: 'center',
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.md,
  },
  settingsRowLabel: {
    flex: 1,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
});

const bodyStyles = StyleSheet.create({
  card:  { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerText: { flex: 1 },
  title:    { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.textPrimary },
  subtitle: { fontSize: fontSizes.xs,   color: colors.textSecondary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accent, borderRadius: 8,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2,
  },
  addBtnText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.white },
  photoWrap: {
    borderRadius: 12, overflow: 'hidden',
    aspectRatio: 2 / 3, backgroundColor: colors.surfaceAlt,
    maxHeight: 320,
  },
  photo: { width: '100%', height: '100%' },
  processingWrap: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.xl, gap: spacing.md,
  },
  processingText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  poseRow: {
    flexDirection: 'row', gap: spacing.sm,
  },
  poseTab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 10, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    minHeight: 36,
  },
  poseTabActive: {
    backgroundColor: colors.accent, borderColor: colors.accent,
  },
  poseTabText: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, color: colors.textSecondary },
  poseTabTextActive: { color: colors.white },
  placeholder: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: 12, padding: spacing.xl,
    alignItems: 'center', gap: spacing.sm,
  },
  placeholderText: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.textSecondary },
  placeholderHint: { fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
