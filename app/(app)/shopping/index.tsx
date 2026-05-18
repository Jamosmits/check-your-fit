import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import {
  shoppingService,
  ShoppingSuggestion,
  WardrobeGap,
  CompatibilityResult,
} from '@/services/shoppingService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Badge } from '@/components/ui/Badge';

function PriorityDot({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const colorMap = {
    high: colors.status.error,
    medium: colors.status.warning,
    low: colors.status.info,
  };
  return (
    <View
      style={[styles.priorityDot, { backgroundColor: colorMap[priority] }]}
    />
  );
}

function GapCard({ gap }: { gap: WardrobeGap }) {
  return (
    <Card style={styles.gapCard}>
      <View style={styles.gapTop}>
        <PriorityDot priority={gap.priority} />
        <View style={styles.gapInfo}>
          <Text style={styles.gapTitle}>
            {gap.subcategory ?? gap.category}
          </Text>
          <Text style={styles.gapReason}>{gap.reason}</Text>
        </View>
      </View>
    </Card>
  );
}

function ProductCard({ suggestion }: { suggestion: ShoppingSuggestion }) {
  const { t } = useTranslation();

  const handleView = useCallback(async () => {
    try {
      await Linking.openURL(suggestion.productUrl);
    } catch {
      Alert.alert('Kan link niet openen');
    }
  }, [suggestion.productUrl]);

  return (
    <Card style={styles.productCard}>
      {suggestion.imageUrl && (
        <Image
          source={{ uri: suggestion.imageUrl }}
          style={styles.productImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {suggestion.name}
        </Text>
        {suggestion.brand && (
          <Text style={styles.productBrand}>{suggestion.brand}</Text>
        )}
        {suggestion.price !== undefined && (
          <Text style={styles.productPrice}>
            €{suggestion.price.toFixed(2)}
          </Text>
        )}
        <Text style={styles.productCompatibility} numberOfLines={2}>
          {suggestion.reason}
        </Text>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={handleView}
          activeOpacity={0.8}
        >
          <Text style={styles.viewButtonText}>Bekijk</Text>
          <Ionicons name="open-outline" size={14} color={colors.white} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

function CompatibilityChecker() {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    if (!url.trim()) return;
    setIsChecking(true);
    setError(null);
    setResult(null);
    try {
      const res = await shoppingService.checkProductCompatibility(url.trim());
      setResult(res);
    } catch {
      setError(t('common.error'));
    } finally {
      setIsChecking(false);
    }
  }, [url, t]);

  return (
    <Card style={styles.compatCard}>
      <Text style={styles.compatTitle}>{t('shopping.compatibility.title')}</Text>
      <Input
        label={t('shopping.compatibility.urlPlaceholder')}
        value={url}
        onChangeText={setUrl}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error !== null && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      <Button
        label={t('shopping.compatibility.check')}
        onPress={handleCheck}
        isLoading={isChecking}
        fullWidth
      />

      {result !== null && (
        <View style={styles.compatResult}>
          <View style={styles.compatScoreRow}>
            <View
              style={[
                styles.compatScoreDot,
                {
                  backgroundColor: result.isCompatible
                    ? colors.status.success
                    : colors.status.warning,
                },
              ]}
            />
            <Text style={styles.compatScoreText}>
              {result.isCompatible
                ? t('shopping.compatibility.result.compatible')
                : t('shopping.compatibility.result.incompatible')}
            </Text>
            <Text style={styles.compatScore}>{Math.round(result.score * 100)}%</Text>
          </View>
          {result.styleAnalysis && (
            <Text style={styles.compatAnalysis}>{result.styleAnalysis}</Text>
          )}
          {result.matches.length > 0 && (
            <View style={styles.compatMatches}>
              <Text style={styles.compatMatchesLabel}>
                {t('shopping.compatibility.result.matches')}
              </Text>
              {result.matches.slice(0, 3).map((match) => (
                <Text key={match.itemId} style={styles.compatMatchItem}>
                  • {match.itemName}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

export default function ShoppingIndexScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const {
    data: gaps,
    isLoading: gapsLoading,
  } = useQuery({
    queryKey: ['shopping', 'gaps'],
    queryFn: shoppingService.getWardrobeGaps,
  });

  const {
    data: suggestions,
    isLoading: suggestionsLoading,
  } = useQuery({
    queryKey: ['shopping', 'suggestions'],
    queryFn: shoppingService.getSuggestions,
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('shopping.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Wardrobe gaps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('shopping.gaps.title')}</Text>
          <Text style={styles.sectionSubtitle}>{t('shopping.gaps.subtitle')}</Text>

          {gapsLoading ? (
            <View style={styles.skeletonContainer}>
              <SkeletonLoader height={72} borderRadius={12} />
              <SkeletonLoader height={72} borderRadius={12} />
            </View>
          ) : gaps && gaps.length > 0 ? (
            <View style={styles.gapsList}>
              {gaps.map((gap, i) => (
                <GapCard key={i} gap={gap} />
              ))}
            </View>
          ) : (
            <Card style={styles.noGapsCard}>
              <Ionicons name="checkmark-circle" size={28} color={colors.status.success} />
              <Text style={styles.noGapsText}>Je garderobe is compleet!</Text>
            </Card>
          )}
        </View>

        {/* Suggestions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('shopping.suggestions.title')}</Text>

          {suggestionsLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsScroll}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={styles.productSkeletonWrapper}>
                  <SkeletonLoader height={200} borderRadius={12} />
                </View>
              ))}
            </ScrollView>
          ) : suggestions && suggestions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsScroll}
            >
              {suggestions.map((suggestion) => (
                <ProductCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </ScrollView>
          ) : (
            <Card style={styles.noGapsCard}>
              <Text style={styles.noGapsText}>Geen suggesties beschikbaar</Text>
            </Card>
          )}
        </View>

        {/* Compatibility checker */}
        <View style={[styles.section, { paddingHorizontal: spacing.screen }]}>
          <CompatibilityChecker />
        </View>

        {/* Affiliate disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            * Some links may be affiliate links. We may earn a small commission
            when you make a purchase through our links, at no extra cost to you.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.md,
  },
  skeletonContainer: {
    paddingHorizontal: spacing.screen,
    gap: spacing.md,
  },
  gapsList: {
    paddingHorizontal: spacing.screen,
    gap: spacing.md,
  },
  gapCard: {},
  gapTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  gapInfo: {
    flex: 1,
  },
  gapTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  gapReason: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  noGapsCard: {
    marginHorizontal: spacing.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  noGapsText: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
  },
  productsScroll: {
    paddingHorizontal: spacing.screen,
    gap: spacing.md,
  },
  productSkeletonWrapper: {
    width: 160,
  },
  productCard: {
    width: 160,
    padding: 0,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surfaceAlt,
  },
  productInfo: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  productName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  productBrand: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  productPrice: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textPrimary,
  },
  productCompatibility: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 6,
    marginTop: spacing.xs,
  },
  viewButtonText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  compatCard: {},
  compatTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSizes.sm,
    color: colors.status.error,
    textAlign: 'center',
  },
  compatResult: {
    marginTop: spacing.md,
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  compatScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compatScoreDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  compatScoreText: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  compatScore: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  compatAnalysis: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  compatMatches: {
    gap: spacing.xs,
  },
  compatMatchesLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compatMatchItem: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  disclaimer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  disclaimerText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
