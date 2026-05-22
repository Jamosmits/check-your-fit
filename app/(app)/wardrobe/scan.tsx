import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useScan, ScanMode } from '@/hooks/useScan';
import { useSettingsStore } from '@/store/settingsStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Confetti ────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB347'];

function ConfettiPiece({ index }: { index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const x = useRef(Math.random() * SW).current;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 6 + Math.random() * 9;
  const duration = 1600 + Math.random() * 1000;
  const delay = index * 50;
  const isCircle = Math.random() > 0.5;
  const endAngle = 180 + Math.random() * 360;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
    ]).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-20, SH * 0.75] });
  const opacity    = anim.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] });
  const rotate     = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${endAngle}deg`] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: x,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: isCircle ? size / 2 : 2,
        transform: [{ translateY }, { rotate }],
        opacity,
      }}
    />
  );
}

function Confetti() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 40 }).map((_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </View>
  );
}


// ─── IntroScreen ─────────────────────────────────────────────────────────────

function IntroScreen({ onStart, hasApiKey }: { onStart: (mode: ScanMode) => void; hasApiKey: boolean }) {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const scanLineY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 148] });

  return (
    <View style={introS.container}>
      <View style={introS.preview}>
        <View style={introS.previewBox}>
          <Ionicons name="shirt-outline" size={56} color={colors.textMuted} />
          <Animated.View style={[introS.scanLine, { transform: [{ translateY: scanLineY }] }]} />
        </View>
      </View>

      {!hasApiKey && (
        <View style={introS.banner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.status.info} />
          <Text style={introS.bannerText}>
            Demo-modus actief — voeg een OpenAI-sleutel toe in Instellingen voor echte AI-herkenning.
          </Text>
        </View>
      )}

      <Text style={introS.title}>Scan je kledingkast</Text>
      <Text style={introS.subtitle}>
        Fotografeer je kleding of film je kledingkast. Onze AI herkent elk item automatisch.
      </Text>

      <Card style={introS.tips}>
        <Text style={introS.tipsTitle}>TIPS VOOR EEN GOEDE SCAN</Text>
        {[
          { icon: 'sunny-outline' as const,    text: 'Zorg voor goede belichting' },
          { icon: 'move-outline' as const,     text: 'Beweeg langzaam langs je kast' },
          { icon: 'contrast-outline' as const, text: 'Lichte achtergrond werkt het best' },
        ].map((tip, i) => (
          <View key={i} style={introS.tipRow}>
            <Ionicons name={tip.icon} size={16} color={colors.accent} />
            <Text style={introS.tipText}>{tip.text}</Text>
          </View>
        ))}
      </Card>

      <View style={introS.buttons}>
        <Button label="Kledingkast scannen" onPress={() => onStart('wardrobe')} fullWidth />
        <Button
          label="Enkel item toevoegen"
          onPress={() => onStart('single')}
          variant="secondary"
          fullWidth
        />
      </View>
    </View>
  );
}

const introS = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screen, gap: spacing.base },
  preview: { alignItems: 'center', marginBottom: spacing.xs },
  previewBox: {
    width: 160,
    height: 160,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.55,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.status.infoLight,
    borderRadius: 10,
    padding: spacing.md,
  },
  bannerText: { flex: 1, fontSize: typography.fontSizes.sm, color: colors.status.info, lineHeight: 18 },
  title: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
  },
  subtitle: { fontSize: typography.fontSizes.base, color: colors.textSecondary, lineHeight: 22 },
  tips: { gap: spacing.sm },
  tipsTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tipText: { fontSize: typography.fontSizes.base, color: colors.textPrimary, flex: 1 },
  buttons: { gap: spacing.md, marginTop: spacing.xs },
});

// ─── CameraScreen ─────────────────────────────────────────────────────────────

const PHOTO_TIPS: { icon: string; text: string }[] = [
  { icon: '💡', text: 'Zorg voor goede belichting en een neutrale achtergrond' },
  { icon: '👟', text: 'Schoenen: fotografeer schuin van de zijkant, niet van boven' },
  { icon: '🧥', text: 'Jassen & tops: hang het item op een hanger of leg het plat neer' },
];

function CameraScreen({
  mode,
  onCapture,
  onBack,
}: {
  mode: ScanMode;
  onCapture: (uris: string[]) => void;
  onBack: () => void;
}) {
  const cameraRef = useRef<CameraView>(null);
  const capturedRef = useRef<string[]>([]);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const scanLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (mode === 'wardrobe') {
      scanLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 2400, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 2400, useNativeDriver: true }),
        ]),
      );
      scanLoop.current.start();
    }
    return () => {
      scanLoop.current?.stop();
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleRecord = useCallback(() => {
    if (isRecording) {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      onCapture(capturedRef.current.length > 0 ? capturedRef.current : ['placeholder']);
    } else {
      capturedRef.current = [];
      setIsRecording(true);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      captureIntervalRef.current = setInterval(async () => {
        try {
          const photo = await cameraRef.current?.takePictureAsync({ quality: 0.65 });
          if (photo?.uri) capturedRef.current.push(photo.uri);
        } catch {}
      }, 2500);
    }
  }, [isRecording, onCapture]);

  const handleShot = useCallback(async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) onCapture([photo.uri]);
    } catch {
      Alert.alert('Fout', 'Kon geen foto maken. Probeer opnieuw.');
    }
  }, [onCapture]);

  const handleGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: mode === 'wardrobe',
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      onCapture(result.assets.map((a) => a.uri));
    }
  }, [mode, onCapture]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const scanLineY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, SH * 0.55] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {mode === 'wardrobe' && (
        <Animated.View style={[camS.scanLine, { transform: [{ translateY: scanLineY }] }]} />
      )}

      {mode === 'single' && (
        <View style={camS.gridOverlay} pointerEvents="none">
          <View style={camS.gridBox} />
        </View>
      )}

      {/* Top bar */}
      <View style={camS.topBar}>
        <TouchableOpacity style={camS.circleBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        {isRecording && (
          <View style={camS.recBadge}>
            <View style={camS.recDot} />
            <Text style={camS.recText}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </Text>
          </View>
        )}
        <TouchableOpacity style={camS.circleBtn} onPress={handleGallery} activeOpacity={0.8}>
          <Ionicons name="images-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Photo tips banner */}
      {!tipDismissed && (
        <View style={camS.tipBanner}>
          <Text style={camS.tipEmoji}>{PHOTO_TIPS[tipIndex].icon}</Text>
          <Text style={camS.tipText} numberOfLines={2}>{PHOTO_TIPS[tipIndex].text}</Text>
          <View style={camS.tipActions}>
            {PHOTO_TIPS.length > 1 && (
              <TouchableOpacity
                onPress={() => setTipIndex((i) => (i + 1) % PHOTO_TIPS.length)}
                activeOpacity={0.7}
                style={camS.tipNext}
              >
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setTipDismissed(true)} activeOpacity={0.7} style={camS.tipClose}>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Hint */}
      <View style={camS.hintBox}>
        <Text style={camS.hintText}>
          {mode === 'single'
            ? 'Richt op één kledingstuk — zo volledig mogelijk'
            : isRecording
            ? 'Film langzaam langs je kledingkast'
            : 'Druk op de knop om op te nemen'}
        </Text>
      </View>

      {/* Shutter */}
      <View style={camS.bottom}>
        {mode === 'wardrobe' ? (
          <TouchableOpacity
            style={[camS.shutter, isRecording && camS.shutterRec]}
            onPress={handleRecord}
            activeOpacity={0.9}
          >
            <View style={[camS.shutterInner, isRecording && camS.shutterStop]} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={camS.shutter} onPress={handleShot} activeOpacity={0.9}>
            <View style={camS.shutterWhite} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const camS = StyleSheet.create({
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00FF88',
    opacity: 0.85,
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBox: {
    width: SW * 0.72,
    height: SW * 0.92,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    borderRadius: 10,
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.status.error },
  recText: {
    color: colors.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  tipBanner: {
    position: 'absolute',
    top: 110,
    left: spacing.base,
    right: spacing.base,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tipEmoji: { fontSize: 18 },
  tipText: { flex: 1, color: 'rgba(255,255,255,0.92)', fontSize: typography.fontSizes.sm, lineHeight: 18 },
  tipActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tipNext: { padding: 4 },
  tipClose: { padding: 4 },
  hintBox: {
    position: 'absolute',
    bottom: 148,
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 10,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  hintText: { color: colors.white, fontSize: typography.fontSizes.sm, textAlign: 'center' },
  bottom: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRec: { borderColor: colors.status.error },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.status.error,
  },
  shutterStop: { width: 28, height: 28, borderRadius: 6 },
  shutterWhite: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.white },
});

// ─── ProcessingScreen ─────────────────────────────────────────────────────────

const STEP_LABELS = [
  '📸 Foto analyseren...',
  '✂️ Kledingstuk herkennen...',
  '🎨 Productfoto genereren...',
  '✅ Toevoegen aan kledingkast...',
];

function ProcessingScreen({ label }: { label: string }) {
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const rotate     = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const stepIndex  = STEP_LABELS.indexOf(label);

  return (
    <View style={procS.container}>
      <View style={procS.spinWrap}>
        <Animated.View style={[procS.ring, { transform: [{ rotate }] }]} />
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Ionicons name="shirt-outline" size={40} color="rgba(255,255,255,0.88)" />
        </Animated.View>
      </View>

      <Text style={procS.label}>{label}</Text>

      {/* Step dots */}
      <View style={procS.dots}>
        {STEP_LABELS.map((_, i) => (
          <View
            key={i}
            style={[procS.dot, i <= stepIndex && procS.dotActive]}
          />
        ))}
      </View>

      <Text style={procS.sub}>Even geduld alsjeblieft</Text>
    </View>
  );
}

const procS = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
  },
  spinWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.88)',
    borderTopColor: 'transparent',
  },
  label: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.lg,
    color: colors.white,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: colors.white,
  },
  sub: { fontSize: typography.fontSizes.sm, color: 'rgba(255,255,255,0.32)', marginTop: spacing.xs },
});


// ─── CompleteScreen ───────────────────────────────────────────────────────────

function CompleteScreen({
  addedCount,
  onViewWardrobe,
  onScanAgain,
}: {
  addedCount: number;
  onViewWardrobe: () => void;
  onScanAgain: () => void;
}) {
  const insets    = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 80,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={[complS.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }]}>
      <Confetti />
      <View style={complS.content}>
        <Animated.View style={[complS.check, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark" size={52} color={colors.white} />
        </Animated.View>
        <Text style={complS.title}>Kledingkast bijgewerkt!</Text>
        <Text style={complS.count}>
          {addedCount} {addedCount === 1 ? 'item' : 'items'} toegevoegd
        </Text>
        <Text style={complS.sub}>
          Ga naar je garderobe om je nieuwe items te bekijken en outfits samen te stellen.
        </Text>
      </View>
      <View style={complS.buttons}>
        <Button label="Bekijk kledingkast" onPress={onViewWardrobe} fullWidth />
        <Button label="Nog een scan" onPress={onScanAgain} variant="secondary" fullWidth />
      </View>
    </View>
  );
}

const complS = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.screen },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.base },
  check: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.status.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  count: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.accent,
  },
  sub: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.base,
  },
  buttons: { gap: spacing.md },
});

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ScanScreen() {
  const insets    = useSafeAreaInsets();
  const router    = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const openaiKey = useSettingsStore((s) => s.openaiKey);
  const isLoaded  = useSettingsStore((s) => s.isLoaded);
  const loadKeys  = useSettingsStore((s) => s.loadKeys);

  const {
    scanState,
    scanMode,
    processingLabel,
    error,
    addedCount,
    startScan,
    finishCapture,
    reset,
  } = useScan();

  useEffect(() => {
    if (!isLoaded) loadKeys();
  }, [isLoaded, loadKeys]);

  const handleStart = useCallback(async (mode: ScanMode) => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera toegang vereist',
          'Ga naar Instellingen om camera toegang voor Check Your Fit toe te staan.',
        );
        return;
      }
    }
    startScan(mode);
  }, [permission, requestPermission, startScan]);

  if (scanState === 'CAMERA') {
    return <CameraScreen mode={scanMode} onCapture={finishCapture} onBack={reset} />;
  }

  if (scanState === 'PROCESSING') {
    return <ProcessingScreen label={processingLabel} />;
  }

  if (scanState === 'COMPLETE') {
    return (
      <CompleteScreen
        addedCount={addedCount}
        onViewWardrobe={() => router.replace('/(app)/wardrobe')}
        onScanAgain={reset}
      />
    );
  }

  // INTRO
  return (
    <View style={[mainS.screen, { paddingTop: insets.top }]}>
      <View style={mainS.navBar}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={mainS.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.status.error} />
          <Text style={mainS.errorText}>{error}</Text>
        </View>
      ) : null}

      <IntroScreen onStart={handleStart} hasApiKey={!!openaiKey} />
    </View>
  );
}

const mainS = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  navBar: { paddingHorizontal: spacing.screen, paddingVertical: spacing.sm },
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
  errorText: { flex: 1, fontSize: typography.fontSizes.sm, color: colors.status.error },
});
