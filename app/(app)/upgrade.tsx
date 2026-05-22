import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights, fonts } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useUsageStore, PLANS, PlanType } from '@/store/usageStore';

const PLAN_FEATURES: Record<PlanType, string[]> = {
  free: [
    '25 kledingscans/maand',
    '10 HD productfoto\'s/maand',
    '3 virtual try-ons/maand',
    'Basis garderobe beheer',
    'Outfit builder',
  ],
  starter: [
    '100 kledingscans/maand',
    '50 HD productfoto\'s/maand',
    '20 virtual try-ons/maand',
    'Reiskoffer planner',
    'Outfits opslaan',
  ],
  premium: [
    '250 kledingscans/maand',
    '150 HD productfoto\'s/maand',
    '60 virtual try-ons/maand',
    'Prioriteit verwerking',
    'Geavanceerde statistieken',
    'Huishoud-delen (2 personen)',
  ],
  pro: [
    '500 kledingscans/maand',
    '400 HD productfoto\'s/maand',
    '150 virtual try-ons/maand',
    'Snelste verwerking',
    'Alle premium functies',
    'Huishoud-delen (5 personen)',
    'Prioriteit support',
  ],
};

const PLAN_ORDER: PlanType[] = ['free', 'starter', 'premium', 'pro'];

function PlanCard({ plan, isCurrent }: { plan: PlanType; isCurrent: boolean }) {
  const info     = PLANS[plan];
  const features = PLAN_FEATURES[plan];
  const isPopular = plan === 'premium';
  const isFree    = plan === 'free';
  const setPlan   = useUsageStore((s) => s.setPlan);

  return (
    <View style={[
      cardS.card,
      isCurrent && cardS.cardCurrent,
      isPopular && cardS.cardPopular,
    ]}>
      {isPopular && (
        <View style={cardS.popularBadge}>
          <Text style={cardS.popularText}>Meest populair</Text>
        </View>
      )}

      <Text style={[cardS.planName, isPopular && cardS.planNamePopular]}>{info.label}</Text>

      <View style={cardS.priceRow}>
        {isFree ? (
          <Text style={[cardS.price, isPopular && cardS.pricePopular]}>Gratis</Text>
        ) : (
          <>
            <Text style={[cardS.price, isPopular && cardS.pricePopular]}>€{info.price.toFixed(2).replace('.', ',')}</Text>
            <Text style={[cardS.pricePeriod, isPopular && cardS.pricePeriodPopular]}>/maand</Text>
          </>
        )}
      </View>

      <View style={cardS.divider} />

      <View style={cardS.features}>
        {features.map((feat) => (
          <View key={feat} style={cardS.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={isPopular ? 'rgba(255,255,255,0.9)' : colors.status.success}
            />
            <Text style={[cardS.featureText, isPopular && cardS.featureTextPopular]}>{feat}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          cardS.btn,
          isCurrent && cardS.btnCurrent,
          isPopular && !isCurrent && cardS.btnPopular,
        ]}
        onPress={() => { if (!isCurrent) setPlan(plan); }}
        activeOpacity={isCurrent ? 1 : 0.8}
      >
        <Text style={[
          cardS.btnText,
          isCurrent && cardS.btnTextCurrent,
          isPopular && !isCurrent && cardS.btnTextPopular,
        ]}>
          {isCurrent ? 'Huidig plan' : isFree ? 'Downgraden' : 'Kies dit plan'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const cardS = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardCurrent: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  cardPopular: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  popularBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  popularText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.white,
    letterSpacing: 0.3,
  },
  planName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  planNamePopular: {
    color: colors.white,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  price: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  pricePopular: {
    color: colors.white,
  },
  pricePeriod: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  pricePeriodPopular: {
    color: 'rgba(255,255,255,0.7)',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  features: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  featureTextPopular: {
    color: 'rgba(255,255,255,0.9)',
  },
  btn: {
    borderRadius: 12,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  btnCurrent: {
    backgroundColor: 'transparent',
    borderColor: colors.accent,
  },
  btnPopular: {
    backgroundColor: colors.white,
    borderColor: 'transparent',
  },
  btnText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  btnTextCurrent: {
    color: colors.accent,
  },
  btnTextPopular: {
    color: colors.accent,
  },
});

export default function UpgradeScreen() {
  const insets      = useSafeAreaInsets();
  const router      = useRouter();
  const currentPlan = useUsageStore((s) => s.currentPlan);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[
        s.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <View style={s.hero}>
        <Text style={s.heroTitle}>Kies je plan</Text>
        <Text style={s.heroSubtitle}>
          Upgrade voor meer scans, HD foto's en virtual try-ons elke maand.
        </Text>
      </View>

      <View style={s.cards}>
        {PLAN_ORDER.map((plan) => (
          <PlanCard key={plan} plan={plan} isCurrent={currentPlan === plan} />
        ))}
      </View>

      <Text style={s.footer}>
        Plannen worden maandelijks gefactureerd. Annuleer op elk moment.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screen,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hero: {
    gap: spacing.sm,
  },
  heroTitle: {
    fontFamily: fonts.serif.bold,
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  cards: {
    gap: spacing.base,
  },
  footer: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
