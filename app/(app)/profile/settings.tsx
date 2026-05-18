import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { colors } from '@/theme/colors';
import { fontSizes, fontWeights } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

function RowDivider() {
  return <View style={styles.divider} />;
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  rightNode,
  danger,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  rightNode?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={styles.row}
    >
      <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
        <Feather
          name={icon}
          size={18}
          color={danger ? colors.error : colors.textSecondary}
        />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {rightNode ?? (
        onPress ? (
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        ) : null
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation();
  const logout = useAuthStore((s) => s.logout);

  const [outfitReminders, setOutfitReminders] = useState(false);
  const [marketingNotifs, setMarketingNotifs] = useState(false);

  function handleLanguageToggle() {
    const next = locale === 'nl' ? 'en' : 'nl';
    setLocale(next);
  }

  function handleLogout() {
    Alert.alert(
      t('profile.confirmLogout' as never),
      '',
      [
        { text: t('profile.cancelButton' as never), style: 'cancel' },
        {
          text: t('profile.logoutButton' as never),
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('auth_token');
            logout();
            router.replace('/(auth)/welcome');
          },
        },
      ],
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Account verwijderen',
      'Al je gegevens en je garderobe worden permanent verwijderd. Dit kan niet ongedaan gemaakt worden.',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Definitief verwijderen',
          style: 'destructive',
          onPress: () => {
            // TODO: call DELETE /auth/account endpoint
            logout();
            router.replace('/(auth)/welcome');
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.settings' as never)}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Voorkeuren */}
      <SectionHeader label={t('profile.preferences.title' as never)} />
      <Card style={styles.card}>
        <SettingsRow
          icon="globe"
          label={t('profile.preferences.language' as never)}
          value={locale === 'nl' ? '🇳🇱 Nederlands' : '🇬🇧 English'}
          onPress={handleLanguageToggle}
        />
        <RowDivider />
        <SettingsRow
          icon="bell"
          label={t('profile.preferences.outfitReminders' as never)}
          rightNode={
            <Switch
              value={outfitReminders}
              onValueChange={setOutfitReminders}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.border}
            />
          }
        />
        <RowDivider />
        <SettingsRow
          icon="tag"
          label="Shopping notificaties"
          rightNode={
            <Switch
              value={marketingNotifs}
              onValueChange={setMarketingNotifs}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.border}
            />
          }
        />
      </Card>

      {/* Account */}
      <SectionHeader label={t('profile.account.title' as never)} />
      <Card style={styles.card}>
        <SettingsRow
          icon="lock"
          label={t('profile.account.changePassword' as never)}
          onPress={() => {
            Alert.alert('Wachtwoord wijzigen', 'Er wordt een resetlink naar je e-mailadres gestuurd.');
          }}
        />
      </Card>

      {/* Over de app */}
      <SectionHeader label={t('profile.about.title' as never)} />
      <Card style={styles.card}>
        <SettingsRow
          icon="shield"
          label={t('profile.about.privacy' as never)}
          onPress={() => {}}
        />
        <RowDivider />
        <SettingsRow
          icon="file-text"
          label={t('profile.about.terms' as never)}
          onPress={() => {}}
        />
        <RowDivider />
        <SettingsRow
          icon="info"
          label={t('profile.about.version' as never)}
          value="1.0.0"
        />
      </Card>

      {/* Uitloggen */}
      <Button
        label={t('profile.logout' as never)}
        variant="secondary"
        onPress={handleLogout}
      />

      {/* Account verwijderen */}
      <SectionHeader label="Gevaarlijke zone" />
      <Card style={styles.card}>
        <SettingsRow
          icon="trash-2"
          label={t('profile.account.deleteAccount' as never)}
          onPress={handleDeleteAccount}
          danger
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screen,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.textPrimary,
  },
  sectionHeader: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: {
    backgroundColor: '#FFF0EF',
  },
  rowLabel: {
    flex: 1,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textPrimary,
  },
  rowLabelDanger: {
    color: colors.error,
  },
  rowValue: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.base + 32 + spacing.md,
  },
});
