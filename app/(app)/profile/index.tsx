import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { useWardrobeStore } from '@/store/wardrobeStore';
import { useWardrobeItems } from '@/hooks/useWardrobe';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { ClothingCard } from '@/components/wardrobe/ClothingCard';

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

function BodyPhotoSection() {
  const bodyPhotoUri = useAuthStore((s) => s.bodyPhotoUri);
  const setBodyPhoto = useAuthStore((s) => s.setBodyPhoto);

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
      setBodyPhoto(result.assets[0].uri);
    }
  }, [setBodyPhoto]);

  const handlePress = useCallback(() => {
    Alert.alert(
      bodyPhotoUri ? 'Lichaamsfoto wijzigen' : 'Lichaamsfoto toevoegen',
      'Gebruikt voor virtual try-on. Sta rechtop in neutrale kleding.',
      [
        { text: 'Camera',  onPress: () => pickBodyPhoto('camera')  },
        { text: 'Galerij', onPress: () => pickBodyPhoto('gallery') },
        ...(bodyPhotoUri ? [{ text: 'Verwijder foto', style: 'destructive' as const, onPress: () => setBodyPhoto(null) }] : []),
        { text: 'Annuleer', style: 'cancel' },
      ],
    );
  }, [bodyPhotoUri, pickBodyPhoto, setBodyPhoto]);

  return (
    <Card style={bodyStyles.card}>
      <View style={bodyStyles.header}>
        <Ionicons name="body-outline" size={20} color={colors.accent} />
        <View style={bodyStyles.headerText}>
          <Text style={bodyStyles.title}>Lichaamsfoto</Text>
          <Text style={bodyStyles.subtitle}>Voor virtual try-on</Text>
        </View>
        <TouchableOpacity onPress={handlePress} style={bodyStyles.addBtn} activeOpacity={0.8}>
          <Ionicons name={bodyPhotoUri ? 'create-outline' : 'add'} size={18} color={colors.white} />
          <Text style={bodyStyles.addBtnText}>{bodyPhotoUri ? 'Wijzig' : 'Voeg toe'}</Text>
        </TouchableOpacity>
      </View>

      {bodyPhotoUri ? (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={bodyStyles.photoWrap}>
          <Image source={{ uri: bodyPhotoUri }} style={bodyStyles.photo} resizeMode="cover" />
          <View style={bodyStyles.photoOverlay}>
            <Ionicons name="checkmark-circle" size={28} color="#4CD964" />
            <Text style={bodyStyles.photoOverlayText}>Foto opgeslagen</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={handlePress} style={bodyStyles.placeholder} activeOpacity={0.8}>
          <Ionicons name="person-outline" size={48} color={colors.textMuted} />
          <Text style={bodyStyles.placeholderText}>Tik om een foto toe te voegen</Text>
          <Text style={bodyStyles.placeholderHint}>Sta rechtop · neutrale achtergrond · goede belichting</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

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
    color: colors.warning,
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
    height: 200, backgroundColor: colors.surfaceAlt,
  },
  photo: { width: '100%', height: '100%' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: spacing.md, gap: spacing.xs,
  },
  photoOverlayText: { color: colors.white, fontSize: fontSizes.sm, fontWeight: fontWeights.medium },
  placeholder: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: 12, padding: spacing.xl,
    alignItems: 'center', gap: spacing.sm,
  },
  placeholderText: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.textSecondary },
  placeholderHint: { fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
