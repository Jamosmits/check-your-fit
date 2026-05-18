import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { useScan } from '@/hooks/useScan';
import { ScannedItem } from '@/services/scanService';
import { ScanOverlay } from '@/components/wardrobe/ScanOverlay';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PROCESSING_LABELS = [
  'Video analyseren...',
  'Kleding herkennen...',
  'Achtergronden verwijderen...',
  'Items catalogiseren...',
];

function IntroState({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();

  const tips = [
    { icon: 'sunny-outline' as const, text: t('scan.intro.tips.light') },
    { icon: 'hand-left-outline' as const, text: t('scan.intro.tips.slow') },
    { icon: 'image-outline' as const, text: t('scan.intro.tips.background') },
  ];

  return (
    <View style={styles.stateContainer}>
      <View style={styles.introContent}>
        <Text style={styles.introEmoji}>📷</Text>
        <Text style={styles.introTitle}>{t('scan.intro.title')}</Text>
        <Text style={styles.introSubtitle}>{t('scan.intro.subtitle')}</Text>

        <Card style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>{t('scan.intro.tips.title')}</Text>
          {tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name={tip.icon} size={18} color={colors.accent} />
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </Card>
      </View>

      <Button
        label={t('scan.intro.cta')}
        onPress={onStart}
        fullWidth
        style={styles.actionButton}
      />
    </View>
  );
}

function RecordingState({
  onStop,
  capturedPhotos,
}: {
  onStop: (photos: string[]) => void;
  capturedPhotos: string[];
}) {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const photosRef = useRef<string[]>([]);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    // Auto-capture a photo every 2 seconds while recording
    captureIntervalRef.current = setInterval(async () => {
      try {
        const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6, base64: false });
        if (photo?.uri) {
          photosRef.current = [...photosRef.current, photo.uri];
        }
      } catch {
        // Ignore capture errors
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    };
  }, []);

  const handleStop = useCallback(() => {
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    onStop(photosRef.current.length > 0 ? photosRef.current : ['placeholder']);
  }, [onStop]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <View style={StyleSheet.absoluteFill}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <ScanOverlay active />

      {/* REC indicator */}
      <View style={styles.recContainer}>
        <View style={styles.recDot} />
        <Text style={styles.recText}>REC {timeStr}</Text>
      </View>

      {/* Stop button */}
      <View style={styles.recordingBottom}>
        <TouchableOpacity style={styles.stopButton} onPress={handleStop} activeOpacity={0.9}>
          <View style={styles.stopIcon} />
        </TouchableOpacity>
        <Text style={styles.stopLabel}>{t('scan.recording.stop')}</Text>
      </View>
    </View>
  );
}

function ProcessingState() {
  const { t } = useTranslation();
  const [labelIndex, setLabelIndex] = useState(0);
  const rotation = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1800, easing: Easing.linear }),
      -1,
      false,
    );
    progress.value = withTiming(0.85, { duration: 8000 });

    const labelTimer = setInterval(() => {
      setLabelIndex((i) => (i + 1) % PROCESSING_LABELS.length);
    }, 2000);

    return () => {
      cancelAnimation(rotation);
      clearInterval(labelTimer);
    };
  }, [rotation, progress]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.stateContainer, styles.processingContainer]}>
      <Animated.View style={[styles.spinnerRing, spinStyle]}>
        <View style={styles.spinnerInner} />
      </Animated.View>

      <Text style={styles.processingTitle}>{t('scan.processing.title')}</Text>
      <Text style={styles.processingLabel}>{PROCESSING_LABELS[labelIndex]}</Text>
      <Text style={styles.processingSubtitle}>{t('scan.processing.subtitle')}</Text>
    </View>
  );
}

function ReviewState({
  items,
  confirmedIds,
  rejectedIds,
  onConfirm,
  onReject,
  onConfirmAll,
  onSubmit,
  isSubmitting,
}: {
  items: ScannedItem[];
  confirmedIds: Set<string>;
  rejectedIds: Set<string>;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onConfirmAll: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.reviewContainer}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewTitle}>
          {t('scan.review.itemsFound', { count: items.length })}
        </Text>
        <TouchableOpacity onPress={onConfirmAll} activeOpacity={0.8}>
          <Text style={styles.confirmAllText}>{t('scan.review.confirmAll')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.reviewList}
        renderItem={({ item }) => {
          const isConfirmed = confirmedIds.has(item.id);
          const isRejected = rejectedIds.has(item.id);
          return (
            <Card style={[styles.reviewItem, isRejected && styles.reviewItemRejected]}>
              <View style={styles.reviewItemRow}>
                <View style={styles.reviewItemInfo}>
                  <Badge
                    label={item.subcategory ?? item.category}
                    category={item.category}
                  />
                  {item.brand && (
                    <Text style={styles.reviewItemBrand}>{item.brand}</Text>
                  )}
                  <Text style={styles.reviewItemConfidence}>
                    {Math.round(item.confidence * 100)}% zeker
                  </Text>
                </View>
                <View style={styles.reviewActions}>
                  <TouchableOpacity
                    style={[styles.reviewBtn, isRejected && styles.reviewBtnActive]}
                    onPress={() => onReject(item.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={isRejected ? colors.white : colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reviewBtn, styles.reviewBtnConfirm, isConfirmed && styles.reviewBtnConfirmActive]}
                    onPress={() => onConfirm(item.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={isConfirmed ? colors.white : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        }}
      />

      <View style={[styles.reviewFooter, { paddingBottom: insets.bottom + spacing.base }]}>
        <Button
          label={`${t('scan.review.confirm')} (${confirmedIds.size})`}
          onPress={onSubmit}
          isLoading={isSubmitting}
          fullWidth
        />
      </View>
    </View>
  );
}

function CompleteState({
  confirmedCount,
  onViewWardrobe,
  onScanAgain,
}: {
  confirmedCount: number;
  onViewWardrobe: () => void;
  onScanAgain: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.stateContainer}>
      <View style={styles.completeContent}>
        <Text style={styles.completeEmoji}>✅</Text>
        <Text style={styles.completeTitle}>{t('scan.complete.title')}</Text>
        <Text style={styles.completeSubtitle}>
          {t('scan.complete.subtitle', { count: confirmedCount })}
        </Text>
      </View>

      <View style={styles.completeActions}>
        <Button
          label={t('scan.complete.cta')}
          onPress={onViewWardrobe}
          fullWidth
        />
        <Button
          label={t('scan.complete.scanAgain')}
          onPress={onScanAgain}
          variant="secondary"
          fullWidth
        />
      </View>
    </View>
  );
}

export default function ScanScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    scanState,
    scannedItems,
    confirmedIds,
    rejectedIds,
    error,
    confirmedCount,
    startRecording,
    stopRecordingAndUpload,
    confirmItem,
    rejectItem,
    confirmAll,
    submitReview,
    reset,
  } = useScan();

  const handleStartRecording = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(t('scan.errors.permission'));
        return;
      }
    }
    startRecording();
  }, [permission, requestPermission, startRecording, t]);

  const handleStopRecording = useCallback(
    async (photos: string[]) => {
      await stopRecordingAndUpload(photos);
    },
    [stopRecordingAndUpload],
  );

  const handleSubmitReview = useCallback(async () => {
    setIsSubmitting(true);
    await submitReview();
    setIsSubmitting(false);
  }, [submitReview]);

  if (scanState === 'RECORDING') {
    return (
      <RecordingState
        onStop={handleStopRecording}
        capturedPhotos={[]}
      />
    );
  }

  if (scanState === 'PROCESSING') {
    return <ProcessingState />;
  }

  if (scanState === 'REVIEW') {
    return (
      <ReviewState
        items={scannedItems}
        confirmedIds={confirmedIds}
        rejectedIds={rejectedIds}
        onConfirm={confirmItem}
        onReject={rejectItem}
        onConfirmAll={confirmAll}
        onSubmit={handleSubmitReview}
        isSubmitting={isSubmitting}
      />
    );
  }

  if (scanState === 'COMPLETE') {
    return (
      <CompleteState
        confirmedCount={confirmedCount}
        onViewWardrobe={() => router.replace('/(app)/wardrobe')}
        onScanAgain={reset}
      />
    );
  }

  // INTRO state
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {error !== null && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.status.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <IntroState onStart={handleStartRecording} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
  },
  stateContainer: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  introContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.base,
  },
  introEmoji: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  introTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  tipsCard: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tipsTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tipText: {
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
    flex: 1,
  },
  actionButton: {
    marginTop: spacing.base,
  },
  recContainer: {
    position: 'absolute',
    top: 60,
    left: spacing.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.error,
  },
  recText: {
    color: colors.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  recordingBottom: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.sm,
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: colors.status.error,
  },
  stopLabel: {
    color: colors.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  processingContainer: {
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: colors.white,
    borderTopColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  spinnerInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2C2C2E',
  },
  processingTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  processingLabel: {
    fontSize: typography.fontSizes.md,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  processingSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  reviewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingTop: 60,
    paddingBottom: spacing.base,
  },
  reviewTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.lg,
    color: colors.textPrimary,
  },
  confirmAllText: {
    fontSize: typography.fontSizes.sm,
    color: colors.accent,
    fontWeight: typography.fontWeights.semibold,
  },
  reviewList: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
    paddingBottom: 120,
  },
  reviewItem: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewItemRejected: {
    opacity: 0.4,
  },
  reviewItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reviewItemInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  reviewItemBrand: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  reviewItemConfidence: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reviewBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnActive: {
    backgroundColor: colors.status.error,
  },
  reviewBtnConfirm: {
    backgroundColor: colors.surfaceAlt,
  },
  reviewBtnConfirmActive: {
    backgroundColor: colors.status.success,
  },
  reviewFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  completeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  completeEmoji: {
    fontSize: 72,
  },
  completeTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  completeSubtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  completeActions: {
    gap: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.screen,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.status.errorLight,
    borderRadius: 10,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.status.error,
  },
});
