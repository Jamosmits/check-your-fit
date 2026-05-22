import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights, fonts } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useWeather } from '@/hooks/useWeather';
import { useAISuggestions } from '@/hooks/useOutfits';
import { useWardrobeStore } from '@/store/wardrobeStore';
import { useTranslation } from '@/hooks/useTranslation';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { Card } from '@/components/ui/Card';
import { OutfitSuggestion } from '@/services/outfitService';

function WeatherIcon({ condition }: { condition: string }) {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    sunny: 'sunny',
    clear: 'sunny',
    cloudy: 'cloudy',
    overcast: 'cloud',
    rain: 'rainy',
    drizzle: 'rainy',
    storm: 'thunderstorm',
    snow: 'snow',
    fog: 'cloud',
    wind: 'flag',
  };
  const key = condition.toLowerCase();
  const iconName = Object.entries(iconMap).find(([k]) => key.includes(k))?.[1] ?? 'partly-sunny';
  return <Ionicons name={iconName} size={28} color={colors.accent} />;
}

interface SuggestionCardProps {
  suggestion: OutfitSuggestion;
  onUse: (suggestion: OutfitSuggestion) => void;
}

function SuggestionCard({ suggestion, onUse }: SuggestionCardProps) {
  const { t } = useTranslation();
  const items = useWardrobeStore((s) => s.items);
  const suggestionItems = suggestion.items
    .slice(0, 3)
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean);

  return (
    <Card style={styles.suggestionCard} padding="sm">
      <View style={styles.suggestionThumbnails}>
        {suggestionItems.map((item) =>
          item ? (
            <Image
              key={item.id}
              source={{ uri: item.processedPhotoUrl ?? item.thumbnailUrl ?? item.imageUrl }}
              style={styles.suggestionThumb}
              resizeMode="cover"
            />
          ) : null,
        )}
      </View>
      <Text style={styles.suggestionReason} numberOfLines={2}>
        {suggestion.reason}
      </Text>
      <TouchableOpacity
        style={styles.useButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onUse(suggestion);
        }}
      >
        <Text style={styles.useButtonText}>{t('outfits.suggestions.use')}</Text>
      </TouchableOpacity>
    </Card>
  );
}

interface WeatherOutfitSuggestionProps {
  onUseOutfit: (suggestion: OutfitSuggestion) => void;
}

export function WeatherOutfitSuggestion({ onUseOutfit }: WeatherOutfitSuggestionProps) {
  const { t } = useTranslation();
  const { weather, isLoading: weatherLoading } = useWeather();

  const context = weather
    ? {
        weatherTemp: weather.temperature,
        weatherCondition: weather.condition,
      }
    : {};

  const { data: suggestions, isLoading: suggestionsLoading, refetch } = useAISuggestions(context);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const isLoading = weatherLoading || suggestionsLoading;

  return (
    <View style={styles.container}>
      {weather && (
        <View style={styles.weatherHeader}>
          <WeatherIcon condition={weather.condition} />
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherTemp}>{Math.round(weather.temperature)}°</Text>
            <Text style={styles.weatherCondition}>{weather.condition}</Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('outfits.suggestions.forWeather')}</Text>
      </View>

      {isLoading ? (
        <View style={styles.skeletonRow}>
          <SkeletonLoader width={160} height={200} borderRadius={12} />
          <SkeletonLoader width={160} height={200} borderRadius={12} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsScroll}
        >
          {(suggestions ?? []).map((s) => (
            <SuggestionCard key={s.id} suggestion={s} onUse={onUseOutfit} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    fontFamily: fonts.serif.bold,
    fontSize: fontSizes.xxl,
    color: colors.textPrimary,
    lineHeight: fontSizes.xxl * 1.2,
  },
  weatherCondition: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  refreshButton: {
    padding: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  suggestionsScroll: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
  },
  skeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
  },
  suggestionCard: {
    width: 160,
  },
  suggestionThumbnails: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.sm,
  },
  suggestionThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
  },
  suggestionReason: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  useButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  useButtonText: {
    color: colors.white,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
});
