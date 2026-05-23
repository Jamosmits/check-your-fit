import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { tripService, Trip } from '@/services/tripService';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';
import { Button } from '@/components/ui/Button';

function TripCard({ trip, onPress }: { trip: Trip; onPress: (trip: Trip) => void }) {
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
    });

  const isPast = new Date(trip.endDate) < new Date();
  const packedCount = trip.packingList.filter((i) => i.isPacked).length;
  const totalCount = trip.packingList.length;
  const packedPercent = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  return (
    <TouchableOpacity onPress={() => onPress(trip)} activeOpacity={0.8}>
      <Card style={[styles.tripCard, isPast && styles.tripCardPast]}>
        <View style={styles.tripTop}>
          <View style={styles.tripInfo}>
            <Text style={styles.tripDestination}>{trip.destination}</Text>
            <Text style={styles.tripDates}>
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            </Text>
          </View>
          <View style={styles.tripBadge}>
            {isPast ? (
              <Text style={styles.tripBadgeText}>Afgelopen</Text>
            ) : (
              <View style={styles.tripBadgeActive}>
                <Text style={styles.tripBadgeActiveText}>Gepland</Text>
              </View>
            )}
          </View>
        </View>

        {/* Occasions */}
        {trip.occasions.length > 0 && (
          <View style={styles.tripOccasions}>
            {trip.occasions.map((occ) => (
              <View key={occ} style={styles.tripOccasionChip}>
                <Text style={styles.tripOccasionText}>{occ}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Packing progress */}
        {totalCount > 0 && (
          <View style={styles.tripProgress}>
            <View style={styles.tripProgressBar}>
              <View
                style={[
                  styles.tripProgressFill,
                  { width: `${packedPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.tripProgressText}>
              {packedCount}/{totalCount} ingepakt
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

export default function TripIndexScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: trips,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['trips'],
    queryFn: tripService.getTrips,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleTripPress = useCallback(
    (_trip: Trip) => {
      // Navigate to trip detail - not in spec as separate screen, navigate to new for now
      router.push('/(app)/trip/new');
    },
    [router],
  );

  const upcomingTrips = (trips ?? []).filter(
    (t) => new Date(t.endDate) >= new Date(),
  );
  const pastTrips = (trips ?? []).filter(
    (t) => new Date(t.endDate) < new Date(),
  );

  const sections = [
    { title: 'Komende reizen', data: upcomingTrips },
    { title: 'Afgelopen reizen', data: pastTrips },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('trip.title')}</Text>
      </View>

      {isLoading ? (
        <FlatList
          data={Array.from({ length: 3 })}
          keyExtractor={(_, i) => `skeleton-${i}`}
          renderItem={() => <SkeletonCard style={styles.skeletonCard} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : error ? (
        <View style={styles.stateContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.stateTitle}>{t('common.error')}</Text>
          <Button label={t('common.retry')} onPress={() => refetch()} variant="secondary" />
        </View>
      ) : (trips ?? []).length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={styles.emptyEmoji}>✈️</Text>
          <Text style={styles.stateTitle}>{t('trip.empty.title')}</Text>
          <Text style={styles.stateSubtitle}>{t('trip.empty.subtitle')}</Text>
          <Button
            label={t('trip.empty.cta')}
            onPress={() => router.push('/(app)/trip/new')}
          />
        </View>
      ) : (
        <FlatList
          data={[...upcomingTrips, ...pastTrips]}
          keyExtractor={(trip) => trip.id}
          renderItem={({ item }) => (
            <TripCard trip={item} onPress={handleTripPress} />
          )}
          ListHeaderComponent={() => (
            <View>
              {upcomingTrips.length > 0 && (
                <Text style={styles.sectionTitle}>Komende reizen</Text>
              )}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() => router.push('/(app)/trip/new')}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
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
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl + 80,
    gap: spacing.md,
  },
  skeletonCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  tripCard: {
    gap: spacing.sm,
  },
  tripCardPast: {
    opacity: 0.7,
  },
  tripTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tripInfo: {
    flex: 1,
  },
  tripDestination: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tripDates: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  tripBadge: {},
  tripBadgeText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  tripBadgeActive: {
    backgroundColor: colors.status.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 100,
  },
  tripBadgeActiveText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.status.success,
  },
  tripOccasions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tripOccasionChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
  },
  tripOccasionText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  tripProgress: {
    gap: spacing.xs,
  },
  tripProgressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  tripProgressFill: {
    height: 4,
    backgroundColor: colors.status.success,
    borderRadius: 2,
  },
  tripProgressText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  stateTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.lg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
});
