import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { tripService, Trip } from '@/services/tripService';
import { useHouseholdStore } from '@/store/householdStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';

const TOTAL_STEPS = 5;

type TripType = {
  key: string;
  emoji: string;
  label: string;
};

const TRIP_TYPES: TripType[] = [
  { key: 'vacation', emoji: '☀️', label: 'Vakantie' },
  { key: 'work', emoji: '💼', label: 'Werk' },
  { key: 'festival', emoji: '🎪', label: 'Festival' },
  { key: 'citytrip', emoji: '🏙️', label: 'Citytrip' },
  { key: 'beach', emoji: '🏖️', label: 'Strand' },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i < current ? styles.stepDotDone : i === current ? styles.stepDotActive : styles.stepDotInactive,
          ]}
        />
      ))}
    </View>
  );
}

function StepDestination({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Waar ga je naartoe?</Text>
      <Input
        label={t('trip.create.destinationPlaceholder')}
        value={value}
        onChangeText={onChange}
        autoCapitalize="words"
      />
    </View>
  );
}

function StepDates({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
}: {
  startDate: string;
  endDate: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Wanneer ga je?</Text>
      <Input
        label={t('trip.create.startDate')}
        value={startDate}
        onChangeText={onChangeStart}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />
      <Input
        label={t('trip.create.endDate')}
        value={endDate}
        onChangeText={onChangeEnd}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />
    </View>
  );
}

function StepTripType({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Wat voor reis?</Text>
      <View style={styles.tripTypeGrid}>
        {TRIP_TYPES.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.tripTypeCard,
              selected.includes(type.key) && styles.tripTypeCardActive,
            ]}
            onPress={() => onToggle(type.key)}
            activeOpacity={0.8}
          >
            <Text style={styles.tripTypeEmoji}>{type.emoji}</Text>
            <Text
              style={[
                styles.tripTypeLabel,
                selected.includes(type.key) && styles.tripTypeLabelActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function StepTravelers({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (userId: string) => void;
}) {
  const members = useHouseholdStore((s) => s.members);

  if (members.length === 0) {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Reizigers</Text>
        <Text style={styles.stepSubtitle}>
          Je reist alleen. Voeg huishoudleden toe om samen in te pakken.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Wie gaan er mee?</Text>
      <View style={styles.travelersGrid}>
        {members.map((member) => (
          <TouchableOpacity
            key={member.userId}
            style={[
              styles.travelerCard,
              selected.includes(member.userId) && styles.travelerCardActive,
            ]}
            onPress={() => onToggle(member.userId)}
            activeOpacity={0.8}
          >
            <Avatar name={member.name} imageUrl={member.avatarUrl} size={48} />
            <Text style={styles.travelerName} numberOfLines={1}>
              {member.name.split(' ')[0]}
            </Text>
            {selected.includes(member.userId) && (
              <View style={styles.travelerCheck}>
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function StepResult({ trip }: { trip: Trip }) {
  const [packed, setPacked] = useState<Set<string>>(new Set());

  const togglePacked = (id: string) => {
    setPacked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const categories = Array.from(
    new Set(trip.packingList.map((item) => item.category)),
  );

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Jouw paklijst</Text>
      <Text style={styles.stepSubtitle}>
        {trip.packingList.length} items voor {trip.destination}
      </Text>

      {categories.map((cat) => (
        <View key={cat} style={styles.packCategory}>
          <Text style={styles.packCategoryTitle}>{cat}</Text>
          {trip.packingList
            .filter((item) => item.category === cat)
            .map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.packItem}
                onPress={() => togglePacked(item.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.packCheck,
                    packed.has(item.id) && styles.packCheckDone,
                  ]}
                >
                  {packed.has(item.id) && (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  )}
                </View>
                <Text
                  style={[
                    styles.packItemName,
                    packed.has(item.id) && styles.packItemNameDone,
                  ]}
                >
                  {item.name}
                </Text>
                {item.isSuggested && (
                  <View style={styles.suggestedBadge}>
                    <Text style={styles.suggestedBadgeText}>AI</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
        </View>
      ))}
    </View>
  );
}

export default function NewTripScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTravelers, setSelectedTravelers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);

  const toggleType = useCallback((key: string) => {
    setSelectedTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const toggleTraveler = useCallback((userId: string) => {
    setSelectedTravelers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }, []);

  const validateStep = useCallback((): boolean => {
    switch (step) {
      case 0:
        if (!destination.trim()) {
          Alert.alert('Voer een bestemming in.');
          return false;
        }
        return true;
      case 1:
        if (!startDate.trim() || !endDate.trim()) {
          Alert.alert('Voer vertrek- en terugkomstdatum in.');
          return false;
        }
        return true;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  }, [step, destination, startDate, endDate]);

  const handleNext = useCallback(async () => {
    if (!validateStep()) return;

    if (step === 3) {
      // Generate trip
      setIsGenerating(true);
      try {
        const trip = await tripService.createTrip({
          destination: destination.trim(),
          startDate,
          endDate,
          occasions: selectedTypes,
        });
        setCreatedTrip(trip);
        setStep(4);
      } catch {
        Alert.alert(t('common.error'));
      } finally {
        setIsGenerating(false);
      }
    } else {
      setStep((s) => s + 1);
    }
  }, [step, validateStep, destination, startDate, endDate, selectedTypes, t]);

  const handleBack = useCallback(() => {
    if (step === 0) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  }, [step, router]);

  const stepTitles = [
    'Bestemming',
    'Datums',
    'Type reis',
    'Reizigers',
    'Paklijst',
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
            <Ionicons
              name={step === 0 ? 'close' : 'arrow-back'}
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('trip.create.title')}</Text>
          <Text style={styles.stepCounter}>
            {step + 1}/{TOTAL_STEPS}
          </Text>
        </View>

        <StepIndicator current={step} total={TOTAL_STEPS} />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <StepDestination value={destination} onChange={setDestination} />
          )}
          {step === 1 && (
            <StepDates
              startDate={startDate}
              endDate={endDate}
              onChangeStart={setStartDate}
              onChangeEnd={setEndDate}
            />
          )}
          {step === 2 && (
            <StepTripType selected={selectedTypes} onToggle={toggleType} />
          )}
          {step === 3 && (
            <StepTravelers
              selected={selectedTravelers}
              onToggle={toggleTraveler}
            />
          )}
          {step === 4 && createdTrip && (
            <StepResult trip={createdTrip} />
          )}
        </ScrollView>

        {/* Bottom actions */}
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: insets.bottom + spacing.base },
          ]}
        >
          {step < 4 ? (
            <Button
              label={
                step === 3 ? t('trip.create.save') : t('common.next')
              }
              onPress={handleNext}
              isLoading={isGenerating}
              fullWidth
            />
          ) : (
            <Button
              label="Klaar"
              onPress={() => router.replace('/(app)/trip')}
              fullWidth
            />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  stepCounter: {
    fontSize: typography.fontSizes.sm,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  stepDot: {
    height: 4,
    borderRadius: 2,
    width: 24,
  },
  stepDotDone: {
    backgroundColor: colors.accent,
  },
  stepDotActive: {
    backgroundColor: colors.accent,
    width: 36,
  },
  stepDotInactive: {
    backgroundColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xl,
  },
  stepContent: {
    gap: spacing.base,
  },
  stepTitle: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xl,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  tripTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tripTypeCard: {
    width: '44%',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  tripTypeCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  tripTypeEmoji: {
    fontSize: 32,
  },
  tripTypeLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  tripTypeLabelActive: {
    color: colors.accent,
    fontWeight: typography.fontWeights.semibold,
  },
  travelersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  travelerCard: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    position: 'relative',
    minWidth: 80,
  },
  travelerCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '10',
  },
  travelerName: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
    maxWidth: 72,
    textAlign: 'center',
  },
  travelerCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
  packCategory: {
    marginBottom: spacing.base,
  },
  packCategoryTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  packItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  packCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packCheckDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  packItemName: {
    flex: 1,
    fontSize: typography.fontSizes.base,
    color: colors.textPrimary,
  },
  packItemNameDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  suggestedBadge: {
    backgroundColor: colors.status.infoLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  suggestedBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.status.info,
  },
  bottomBar: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
