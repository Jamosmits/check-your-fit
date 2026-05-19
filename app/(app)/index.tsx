import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore } from '@/store/householdStore';
import { useWardrobeStore, ClothingItem } from '@/store/wardrobeStore';
import { useWardrobeItems } from '@/hooks/useWardrobe';
import { useWeather } from '@/hooks/useWeather';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useSidebar } from '@/context/SidebarContext';

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function getGreeting(): 'home.greeting.morning' | 'home.greeting.afternoon' | 'home.greeting.evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function WeatherCard() {
  const { t } = useTranslation();
  const { weather, isLoading } = useWeather();

  if (isLoading) {
    return (
      <Card style={styles.weatherCard}>
        <SkeletonLoader height={20} width="40%" />
        <View style={{ height: spacing.sm }} />
        <SkeletonLoader height={14} width="60%" />
      </Card>
    );
  }

  if (!weather) return null;

  const weatherIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    sunny: 'sunny',
    clear: 'sunny',
    cloudy: 'cloudy',
    rain: 'rainy',
    storm: 'thunderstorm',
    snow: 'snow',
  };
  const conditionKey = Object.keys(weatherIconMap).find((k) =>
    weather.condition.toLowerCase().includes(k),
  );
  const iconName = conditionKey
    ? weatherIconMap[conditionKey]
    : 'partly-sunny';

  return (
    <Card style={styles.weatherCard}>
      <View style={styles.weatherRow}>
        <Ionicons name={iconName} size={36} color={colors.accent} />
        <View style={styles.weatherInfo}>
          <Text style={styles.weatherTemp}>{Math.round(weather.temperature)}°C</Text>
          <Text style={styles.weatherCondition}>{weather.condition}</Text>
          {weather.location ? (
            <Text style={styles.weatherLocation}>{weather.location}</Text>
          ) : null}
        </View>
        <View style={styles.weatherExtra}>
          <Text style={styles.weatherExtraLabel}>Voelt als</Text>
          <Text style={styles.weatherExtraValue}>{Math.round(weather.feelsLike)}°</Text>
          <Text style={styles.weatherExtraLabel}>Vochtigheid</Text>
          <Text style={styles.weatherExtraValue}>{weather.humidity}%</Text>
        </View>
      </View>
      {weather.clothingRecommendation ? (
        <View style={styles.weatherTipRow}>
          <Ionicons name="shirt-outline" size={14} color={colors.accent} />
          <Text style={styles.weatherRecommendation}>{weather.clothingRecommendation}</Text>
        </View>
      ) : null}
    </Card>
  );
}

function ForgottenItemRow({
  item,
  onDismiss,
}: {
  item: ClothingItem;
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.forgottenItem}>
      <View style={styles.forgottenDot} />
      <Text style={styles.forgottenName} numberOfLines={1}>
        {item.subcategory ?? item.category}
      </Text>
      <TouchableOpacity
        onPress={() => onDismiss(item.id)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const members = useHouseholdStore((s) => s.members);
  const { open: openSidebar } = useSidebar();
  const items = useWardrobeStore((s) => s.items);

  const [refreshing, setRefreshing] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { refetch } = useWardrobeItems();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const forgottenItems = items.filter((item) => {
    if (dismissedIds.has(item.id)) return false;
    if (!item.lastWornAt) return true;
    return Date.now() - new Date(item.lastWornAt).getTime() > SIXTY_DAYS_MS;
  });

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  }, []);

  const greetingKey = getGreeting();
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={openSidebar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="menu" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.greeting}>
              {t(greetingKey)}{firstName ? `, ${firstName}` : ''}
            </Text>
            <Text style={styles.date}>{formatDate()}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/profile')}
            activeOpacity={0.8}
          >
            <Avatar name={user?.name} imageUrl={user?.avatarUrl} size={44} />
          </TouchableOpacity>
        </View>

        {/* Weather */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.weather.title')}</Text>
          <WeatherCard />
        </View>

        {/* Outfit van vandaag */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.suggestedOutfit.title')}</Text>
          <Card style={styles.outfitCard}>
            <View style={styles.outfitPlaceholder}>
              <Ionicons name="shirt-outline" size={40} color={colors.textMuted} />
              <Text style={styles.outfitPlaceholderText}>
                Stel je outfit voor vandaag samen
              </Text>
              <Button
                label="Outfit samenstellen"
                onPress={() => router.push('/(app)/outfits/try-on')}
                variant="secondary"
                style={styles.outfitButton}
              />
            </View>
          </Card>
        </View>

        {/* Household members */}
        {members.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('household.members')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.membersScroll}
            >
              {members.map((member) => (
                <TouchableOpacity
                  key={member.userId}
                  style={styles.memberItem}
                  onPress={() =>
                    router.push(`/(app)/household/member/${member.userId}`)
                  }
                  activeOpacity={0.8}
                >
                  <Avatar name={member.name} imageUrl={member.avatarUrl} size={52} />
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Forgotten items */}
        {forgottenItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vergeten items</Text>
            <Card style={styles.forgottenCard}>
              <Text style={styles.forgottenSubtitle}>
                {forgottenItems.length} item{forgottenItems.length !== 1 ? 's' : ''} niet gedragen in 60+ dagen
              </Text>
              {forgottenItems.slice(0, 5).map((item) => (
                <ForgottenItemRow
                  key={item.id}
                  item={item}
                  onDismiss={handleDismiss}
                />
              ))}
            </Card>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snel starten</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/(app)/wardrobe/scan')}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="camera" size={22} color={colors.accent} />
              </View>
              <Text style={styles.quickActionLabel}>{t('home.quickActions.scan')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/(app)/outfits/try-on')}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="shirt" size={22} color={colors.accent} />
              </View>
              <Text style={styles.quickActionLabel}>Styler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/(app)/trip/new')}
              activeOpacity={0.8}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name="airplane" size={22} color={colors.accent} />
              </View>
              <Text style={styles.quickActionLabel}>{t('home.quickActions.trip')}</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
  },
  greeting: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
    lineHeight: typography.lineHeights.xl,
  },
  date: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
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
    marginBottom: spacing.sm,
  },
  weatherCard: {
    marginHorizontal: spacing.screen,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xxl,
    color: colors.textPrimary,
  },
  weatherCondition: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  weatherLocation: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  weatherExtra: {
    alignItems: 'flex-end',
    gap: 2,
  },
  weatherExtraLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  weatherExtraValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  weatherTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  weatherRecommendation: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  outfitCard: {
    marginHorizontal: spacing.screen,
  },
  outfitPlaceholder: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  outfitPlaceholderText: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  outfitButton: {
    minHeight: 40,
  },
  membersScroll: {
    paddingHorizontal: spacing.screen,
    gap: spacing.base,
  },
  memberItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberName: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    maxWidth: 56,
    textAlign: 'center',
  },
  forgottenCard: {
    marginHorizontal: spacing.screen,
  },
  forgottenSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  forgottenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  forgottenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.status.warning,
  },
  forgottenName: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screen,
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  quickActionLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
  },
});
