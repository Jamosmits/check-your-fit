import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  Share,
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
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type TryOnState = 'no-photo' | 'uploading' | 'processing' | 'result' | 'error';

export default function TryOnScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [state, setState] = useState<TryOnState>('no-photo');
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [resultImageUri, setResultImageUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUploadPhoto = useCallback(
    async (view: 'front' | 'side') => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cameratoegang vereist');
        return;
      }

      Alert.alert(`${view === 'front' ? 'Voor' : 'Zij'}foto uploaden`, undefined, [
        {
          text: 'Camera',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.9,
              allowsEditing: true,
              aspect: [3, 4],
            });
            if (!result.canceled && result.assets[0]) {
              setFrontPhotoUri(result.assets[0].uri);
              await startTryOn(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Galerij',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.9,
              allowsEditing: true,
              aspect: [3, 4],
            });
            if (!result.canceled && result.assets[0]) {
              setFrontPhotoUri(result.assets[0].uri);
              await startTryOn(result.assets[0].uri);
            }
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    },
    [t],
  );

  const startTryOn = async (uri: string) => {
    setState('processing');
    try {
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 2500));
      // In a real implementation, call the try-on API
      setResultImageUri(uri); // placeholder: show uploaded photo as result
      setState('result');
    } catch {
      setErrorMessage(t('common.error'));
      setState('error');
    }
  };

  const handleShare = useCallback(async () => {
    if (!resultImageUri) return;
    try {
      await Share.share({
        url: resultImageUri,
        message: 'Kijk hoe mijn outfit eruitziet! via Check Your Fit',
      });
    } catch {
      // Share cancelled
    }
  }, [resultImageUri]);

  const handleRetry = useCallback(() => {
    setState('no-photo');
    setFrontPhotoUri(null);
    setResultImageUri(null);
    setErrorMessage(null);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Probeer aan</Text>
        {state === 'result' && (
          <TouchableOpacity onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={24} color={colors.accent} />
          </TouchableOpacity>
        )}
        {state !== 'result' && <View style={{ width: 24 }} />}
      </View>

      {/* No photo state */}
      {state === 'no-photo' && (
        <View style={styles.centered}>
          <Text style={styles.noPhotoEmoji}>🧍</Text>
          <Text style={styles.noPhotoTitle}>Upload je foto</Text>
          <Text style={styles.noPhotoSubtitle}>
            Upload een voor- en zijaanzichtfoto om te zien hoe de outfit op jou staat.
          </Text>

          <View style={styles.photoSlots}>
            <Card style={styles.photoSlot}>
              <View style={styles.photoSlotContent}>
                <Ionicons name="person-outline" size={32} color={colors.textMuted} />
                <Text style={styles.photoSlotLabel}>Voorzijde</Text>
                <Button
                  label="Uploaden"
                  onPress={() => handleUploadPhoto('front')}
                  variant="secondary"
                  style={styles.photoSlotBtn}
                />
              </View>
            </Card>
            <Card style={styles.photoSlot}>
              <View style={styles.photoSlotContent}>
                <Ionicons name="person-outline" size={32} color={colors.textMuted} />
                <Text style={styles.photoSlotLabel}>Zijkant</Text>
                <Button
                  label="Uploaden"
                  onPress={() => handleUploadPhoto('side')}
                  variant="secondary"
                  style={styles.photoSlotBtn}
                />
              </View>
            </Card>
          </View>
        </View>
      )}

      {/* Processing state */}
      {state === 'processing' && (
        <View style={styles.centered}>
          <View style={styles.processingContent}>
            {frontPhotoUri && (
              <Image
                source={{ uri: frontPhotoUri }}
                style={styles.processingPhoto}
                resizeMode="cover"
              />
            )}
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
            </View>
          </View>
          <Text style={styles.processingTitle}>Je outfit wordt op jou gepast...</Text>
          <View style={styles.skeletonRow}>
            <SkeletonLoader height={14} width="60%" />
          </View>
        </View>
      )}

      {/* Result state */}
      {state === 'result' && resultImageUri && (
        <View style={styles.resultContainer}>
          <Image
            source={{ uri: resultImageUri }}
            style={styles.resultImage}
            resizeMode="cover"
          />
          <View style={[styles.resultActions, { paddingBottom: insets.bottom + spacing.base }]}>
            <Button
              label="Opnieuw proberen"
              onPress={handleRetry}
              variant="secondary"
              fullWidth
            />
            <Button
              label="Deel"
              onPress={handleShare}
              fullWidth
            />
          </View>
        </View>
      )}

      {/* Error state */}
      {state === 'error' && (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.textMuted} />
          <Text style={styles.noPhotoTitle}>{t('common.error')}</Text>
          {errorMessage && (
            <Text style={styles.noPhotoSubtitle}>{errorMessage}</Text>
          )}
          <Button label={t('common.retry')} onPress={handleRetry} />
        </View>
      )}
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
  },
  headerTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  noPhotoEmoji: {
    fontSize: 64,
  },
  noPhotoTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  noPhotoSubtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  photoSlots: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.md,
  },
  photoSlot: {
    flex: 1,
  },
  photoSlotContent: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  photoSlotLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  photoSlotBtn: {
    minHeight: 36,
  },
  processingContent: {
    width: 200,
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.base,
    backgroundColor: colors.surfaceAlt,
  },
  processingPhoto: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  skeletonRow: {
    width: '100%',
    alignItems: 'center',
  },
  resultContainer: {
    flex: 1,
  },
  resultImage: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  resultActions: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
