import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useHouseholdStore } from '@/store/householdStore';
import api from '@/services/api';

type Mode = 'select' | 'create' | 'join';

interface HouseholdOption {
  key: Mode;
  emoji: string;
  title: string;
  subtitle: string;
}

const OPTIONS: HouseholdOption[] = [
  {
    key: 'select',
    emoji: '🏠',
    title: 'Ik woon alleen',
    subtitle: 'Sla deze stap over en ga direct naar je garderobe',
  },
  {
    key: 'create',
    emoji: '👨‍👩‍👧',
    title: 'Nieuw huishouden aanmaken',
    subtitle: 'Maak een huishouden aan en nodig anderen uit',
  },
  {
    key: 'join',
    emoji: '🔗',
    title: 'Joinen via code',
    subtitle: 'Sluit je aan bij een bestaand huishouden',
  },
];

export default function HouseholdSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setHousehold = useHouseholdStore((s) => s.setHousehold);

  const [mode, setMode] = useState<Mode>('select');
  const [householdName, setHouseholdName] = useState('');
  const [nickname, setNickname] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectAlone = useCallback(() => {
    router.replace('/(app)/');
  }, [router]);

  const handleCreateHousehold = useCallback(async () => {
    if (!householdName.trim()) {
      setError('Voer een naam in voor het huishouden.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{
        id: string;
        name: string;
        ownerId: string;
        inviteCode: string;
        createdAt: string;
      }>('/household', {
        name: householdName.trim(),
        nickname: nickname.trim() || undefined,
      });
      setHousehold(response.data);
      setGeneratedCode(response.data.inviteCode);
    } catch {
      setError(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  }, [householdName, nickname, setHousehold, t]);

  const handleJoinHousehold = useCallback(async () => {
    if (joinCode.trim().length !== 6) {
      setError('Voer een geldige 6-cijferige code in.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{
        id: string;
        name: string;
        ownerId: string;
        inviteCode: string;
        createdAt: string;
      }>('/household/join', { inviteCode: joinCode.trim().toUpperCase() });
      setHousehold(response.data);
      router.replace('/(app)/');
    } catch {
      setError('Ongeldige uitnodigingscode. Probeer het opnieuw.');
    } finally {
      setIsLoading(false);
    }
  }, [joinCode, setHousehold, router]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('household.title')}</Text>
        <Text style={styles.subtitle}>Hoe wil je je garderobe beheren?</Text>

        <View style={styles.options}>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              activeOpacity={0.8}
              onPress={() => {
                if (opt.key === 'select') {
                  handleSelectAlone();
                } else {
                  setMode(opt.key);
                  setError(null);
                  setGeneratedCode(null);
                }
              }}
            >
              <Card
                style={[
                  styles.optionCard,
                  mode === opt.key && styles.optionCardActive,
                ]}
                elevated
              >
                <View style={styles.optionRow}>
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{opt.title}</Text>
                    <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                  </View>
                  {mode === opt.key && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Create household form */}
        {mode === 'create' && !generatedCode && (
          <View style={styles.form}>
            <Input
              label={t('household.create.namePlaceholder')}
              value={householdName}
              onChangeText={setHouseholdName}
              autoCapitalize="words"
            />
            <Input
              label="Jouw bijnaam (optioneel)"
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="words"
            />
            {error !== null && <Text style={styles.errorText}>{error}</Text>}
            <Button
              label={t('household.create.cta')}
              onPress={handleCreateHousehold}
              isLoading={isLoading}
              fullWidth
            />
          </View>
        )}

        {/* Generated invite code */}
        {mode === 'create' && generatedCode !== null && (
          <View style={styles.codeSection}>
            <Text style={styles.codeLabel}>{t('household.invite.title')}</Text>
            <Card style={styles.codeCard}>
              <Text style={styles.codeText}>{generatedCode}</Text>
            </Card>
            <Text style={styles.codeHint}>
              Deel deze code met je huishoudgenoten om hen toe te voegen.
            </Text>
            <Button
              label="Naar de app"
              onPress={() => router.replace('/(app)/')}
              fullWidth
              style={styles.continueButton}
            />
          </View>
        )}

        {/* Join household form */}
        {mode === 'join' && (
          <View style={styles.form}>
            <Input
              label={t('household.join.codePlaceholder')}
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
            />
            {error !== null && <Text style={styles.errorText}>{error}</Text>}
            <Button
              label={t('household.join.cta')}
              onPress={handleJoinHousehold}
              isLoading={isLoading}
              fullWidth
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.skipLink}
          onPress={() => router.replace('/(app)/')}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>{t('common.skip')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screen,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontFamily: typography.fonts.serif.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    lineHeight: typography.lineHeights.xxl,
  },
  subtitle: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  options: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  optionCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionCardActive: {
    borderColor: colors.accent,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionEmoji: {
    fontSize: 28,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  errorText: {
    fontSize: typography.fontSizes.sm,
    color: colors.status.error,
    textAlign: 'center',
  },
  codeSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  codeLabel: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  codeCard: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  codeText: {
    fontFamily: typography.fonts.serif.bold,
    fontSize: typography.fontSizes.xxl,
    color: colors.accent,
    letterSpacing: 6,
  },
  codeHint: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  continueButton: {
    width: '100%',
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  skipText: {
    fontSize: typography.fontSizes.base,
    color: colors.textMuted,
  },
});
