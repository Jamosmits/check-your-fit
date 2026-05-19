import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
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

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);
  const loginAsDemo = useAuthStore((s) => s.loginAsDemo);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Vul je e-mailadres en wachtwoord in.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{
        user: { id: string; name: string; email: string; avatarUrl?: string };
        token: string;
      }>('/auth/login', { email: email.trim().toLowerCase(), password });
      await setAuth(response.data.user, response.data.token);
      router.replace('/(app)/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 401) {
        setError(t('auth.login.error.invalidCredentials'));
      } else {
        setError(t('auth.login.error.generic'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, setAuth, router, t]);

  const handleSkip = useCallback(() => {
    loginAsDemo();
    router.replace('/(app)/');
  }, [loginAsDemo, router]);

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
        <Text style={styles.title}>{t('auth.login.title')}</Text>

        <View style={styles.form}>
          <Input
            label={t('auth.login.emailLabel')}
            placeholder={t('auth.login.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label={t('auth.login.passwordLabel')}
            placeholder={t('auth.login.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity onPress={() => {}} style={styles.forgotLink}>
            <Text style={styles.forgotText}>{t('auth.login.forgotPassword')}</Text>
          </TouchableOpacity>

          {error !== null && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <Button
            label={t('auth.login.submitButton')}
            onPress={handleLogin}
            isLoading={isLoading}
            fullWidth
            style={styles.submitButton}
          />
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerPrompt}>{t('auth.login.noAccount')} </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>{t('auth.login.register')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>of</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipLabel}>Bekijk app met demo data</Text>
          <Text style={styles.skipSub}>Geen account nodig · 15 kledingstukken · 4 outfits</Text>
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
    marginBottom: spacing.xxl,
    lineHeight: typography.lineHeights.xxl,
  },
  form: {
    gap: spacing.base,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
  },
  forgotText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  errorText: {
    fontSize: typography.fontSizes.sm,
    color: colors.status.error,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  registerPrompt: {
    fontSize: typography.fontSizes.base,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: typography.fontSizes.base,
    color: colors.accent,
    fontWeight: typography.fontWeights.semibold,
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  skipButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  skipLabel: {
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  skipSub: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
});
