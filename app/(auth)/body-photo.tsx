import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights, fonts } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useAuthStore } from '@/store/authStore';

export default function BodyPhotoScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const setBodyPhoto = useAuthStore((s) => s.setBodyPhoto);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);

  const handlePick = useCallback(async (source: 'camera' | 'gallery') => {
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cameratoegang nodig', 'Geef toegang via de apparaatinstellingen.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [2, 3],
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [2, 3],
      });
    }
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const handleContinue = useCallback(async () => {
    setSaving(true);
    if (photoUri) await setBodyPhoto(photoUri);
    router.replace('/(auth)/household-setup');
  }, [photoUri, setBodyPhoto, router]);

  const handleSkip = useCallback(() => {
    router.replace('/(auth)/household-setup');
  }, [router]);

  return (
    <View style={[s.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={s.skipBtn}>
          <Text style={s.skipText}>Overslaan</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={s.body}>
        <Text style={s.title}>Jouw try-on foto</Text>
        <Text style={s.subtitle}>
          Voeg een foto van jezelf toe voor het beste virtual try-on resultaat.
          Sta rechtop in neutrale kleding op een lichte achtergrond.
        </Text>

        {/* Photo preview / placeholder */}
        {photoUri ? (
          <TouchableOpacity
            style={s.photoWrap}
            onPress={() => handlePick('gallery')}
            activeOpacity={0.9}
          >
            <Image source={{ uri: photoUri }} style={s.photo} resizeMode="cover" />
            <View style={s.photoOverlay}>
              <Ionicons name="checkmark-circle" size={32} color="#4CD964" />
              <Text style={s.photoOverlayText}>Foto geselecteerd</Text>
              <Text style={s.photoOverlayHint}>Tik om te wijzigen</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={s.placeholder}>
            <Ionicons name="person-outline" size={64} color={colors.textMuted} />
            <Text style={s.placeholderText}>Nog geen foto</Text>
          </View>
        )}

        {/* Tips */}
        <View style={s.tips}>
          {[
            { icon: 'sunny-outline',     text: 'Goede belichting' },
            { icon: 'body-outline',      text: 'Sta rechtop, volledig zichtbaar' },
            { icon: 'color-fill-outline',text: 'Lichte, neutrale achtergrond' },
          ].map(({ icon, text }) => (
            <View key={icon} style={s.tip}>
              <Ionicons name={icon as never} size={16} color={colors.accent} />
              <Text style={s.tipText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => handlePick('camera')}
          activeOpacity={0.8}
        >
          <Ionicons name="camera-outline" size={22} color={colors.white} />
          <Text style={s.actionBtnText}>Foto maken</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnSecondary]}
          onPress={() => handlePick('gallery')}
          activeOpacity={0.8}
        >
          <Ionicons name="images-outline" size={22} color={colors.accent} />
          <Text style={[s.actionBtnText, s.actionBtnTextSecondary]}>Uit galerij</Text>
        </TouchableOpacity>

        {photoUri && (
          <TouchableOpacity
            style={[s.actionBtn, s.actionBtnConfirm, saving && s.actionBtnDisabled]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={saving}
          >
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
            <Text style={s.actionBtnText}>Doorgaan</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  skipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    alignItems: 'center',
    gap: spacing.xl,
  },
  title: {
    fontFamily: fonts.serif.bold,
    fontSize: fontSizes.xxxl,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  photoWrap: {
    width: 200,
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  photo: { width: '100%', height: '100%' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.base,
    gap: spacing.xs,
  },
  photoOverlayText: {
    color: colors.white,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  photoOverlayHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fontSizes.xs,
  },
  placeholder: {
    width: 200,
    height: 280,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  placeholderText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  tips: {
    gap: spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: spacing.base,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tipText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  actions: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.base,
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: spacing.md + 2,
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  actionBtnConfirm: {
    backgroundColor: colors.textPrimary,
    marginTop: spacing.xs,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
  actionBtnTextSecondary: {
    color: colors.accent,
  },
});
