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
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

type Gender = 'man' | 'vrouw' | 'anders';

const GENDER_OPTIONS: { key: Gender; label: string }[] = [
  { key: 'man', label: 'Man' },
  { key: 'vrouw', label: 'Vrouw' },
  { key: 'anders', label: 'Anders' },
];

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = useCallback(async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Vul alle velden in.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ user: { id: string; name: string; email: string; avatarUrl?: string }; token: string }>(
        '/auth/register',
        { name: name.trim(), email: email.trim().toLowerCase(), password, gender },
      );
      await setAuth(response.data.user, response.data.token);
      router.replace('/(auth)/body-photo');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 409) {
        setError(t('auth.register.error.emailTaken'));
      } else {
        setError(t('auth.register.error.generic'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, gender, setAuth, router, t]);

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
        <Text style={styles.title}>{t('auth.register.title')}</Text>

        <View style={styles.form}>
          <Input
            label={t('auth.register.nameLabel')}
            placeholder={t('auth.register.namePlaceholder')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
          />

          <Input
            label={t('auth.register.emailLabel')}
            placeholder={t('auth.register.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label={t('auth.register.passwordLabel')}
            placeholder={t('auth.register.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <View style={styles.genderSection}>
            <Text style={styles.genderLabel}>Geslacht (optioneel)</Text>
            <View style={styles.genderPills}>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.genderPill,
                    gender === opt.key && styles.genderPillActive,
                  ]}
                  onPress={() => setGender(gender === opt.key ? null : opt.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.genderPillText,
                      gender === opt.key && styles.genderPillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {error !== null && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <Button
            label={t('auth.register.submitButton')}
            onPress={handleRegister}
            isLoading={isLoading}
            fullWidth
            style={styles.submitButton}
          />
        </View>

        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>{t('auth.register.hasAccount')} </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>{t('auth.register.login')}</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: spacing.xxl,
    lineHeight: typography.lineHeights.xxl,
  },
  form: {
    gap: spacing.base,
  },
  genderSection: {
    marginTop: spacing.sm,
  },
  genderLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.sm,
  },
  genderPills: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderPill: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 100,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  genderPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  genderPillText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  genderPillTextActive: {
    color: colors.white,
  },
  errorText: {
    fontSize: typography.fontSizes.sm,
    color: colors.status.error,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  loginPrompt: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: typography.fontSizes.base,
    color: colors.accent,
    fontWeight: typography.fontWeights.semibold,
    textDecorationLine: 'underline',
  },
});
