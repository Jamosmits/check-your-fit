import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  emoji: string;
  background: string;
  titleKey: 'onboarding.scan.title' | 'onboarding.outfits.title' | 'onboarding.trips.title';
  subtitleKey:
    | 'onboarding.scan.subtitle'
    | 'onboarding.outfits.subtitle'
    | 'onboarding.trips.subtitle';
}

const SLIDES: Slide[] = [
  {
    emoji: '👗',
    background: '#F8F0E8',
    titleKey: 'onboarding.scan.title',
    subtitleKey: 'onboarding.scan.subtitle',
  },
  {
    emoji: '✨',
    background: '#EEF4FF',
    titleKey: 'onboarding.outfits.title',
    subtitleKey: 'onboarding.outfits.subtitle',
  },
  {
    emoji: '🏠',
    background: '#EEFAF3',
    titleKey: 'onboarding.trips.title',
    subtitleKey: 'onboarding.trips.subtitle',
  },
];

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  }, []);

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * SCREEN_WIDTH, animated: true });
    } else {
      router.push('/(auth)/register');
    }
  }, [activeIndex, router]);

  const handleLogin = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);

  const isLastSlide = activeIndex === SLIDES.length - 1;
  const currentSlide = SLIDES[activeIndex];

  return (
    <View style={[styles.container, { backgroundColor: currentSlide.background }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <View
            key={index}
            style={[styles.slide, { backgroundColor: slide.background, width: SCREEN_WIDTH }]}
          >
            <View style={styles.slideContent}>
              <Text style={styles.emoji}>{slide.emoji}</Text>
              <Text style={styles.title}>{t(slide.titleKey)}</Text>
              <Text style={styles.subtitle}>{t(slide.subtitleKey)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + spacing.base,
            paddingTop: spacing.xl,
          },
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>

        <Button
          label={isLastSlide ? t('onboarding.trips.cta') : t('onboarding.scan.cta')}
          onPress={handleNext}
          fullWidth
          style={styles.button}
        />

        {isLastSlide && (
          <TouchableOpacity onPress={handleLogin} style={styles.loginLink}>
            <Text style={styles.loginText}>{t('onboarding.welcome.login')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emoji: {
    fontSize: 80,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSizes.xxxl,
    fontFamily: typography.fonts.serif.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.base,
    lineHeight: typography.lineHeights.xxxl,
  },
  subtitle: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeights.md,
  },
  footer: {
    paddingHorizontal: spacing.screen,
    backgroundColor: 'transparent',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 20,
  },
  button: {
    marginBottom: spacing.base,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  loginText: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
