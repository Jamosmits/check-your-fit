import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  TextInput,
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
import { useSettingsStore } from '@/store/settingsStore';
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

function ApiKeyInput({
  label,
  placeholder,
  value,
  onSave,
  helpText,
}: {
  label: string;
  placeholder: string;
  value: string;
  onSave: (key: string) => Promise<void>;
  helpText?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setDraft(value); }, [value]);

  const handleSave = async () => {
    await onSave(draft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const masked = draft.length > 8
    ? `${draft.slice(0, 4)}${'•'.repeat(Math.min(draft.length - 8, 20))}${draft.slice(-4)}`
    : draft;

  return (
    <View style={apiS.container}>
      <Text style={apiS.label}>{label}</Text>
      <View style={apiS.row}>
        <TextInput
          style={apiS.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={false}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[apiS.saveBtn, saved && apiS.saveBtnDone]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={apiS.saveBtnText}>{saved ? '✓' : 'Opslaan'}</Text>
        </TouchableOpacity>
      </View>
      {helpText ? <Text style={apiS.help}>{helpText}</Text> : null}
    </View>
  );
}

const apiS = StyleSheet.create({
  container: { paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.sm },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  saveBtn: {
    paddingHorizontal: spacing.md,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  saveBtnDone: { backgroundColor: colors.status.success },
  saveBtnText: { color: colors.white, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
  help: { fontSize: fontSizes.xs, color: colors.textMuted, lineHeight: 16 },
});

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation();
  const logout = useAuthStore((s) => s.logout);

  const { openaiKey, removeBgKey, isLoaded, loadKeys, setOpenaiKey, setRemoveBgKey } =
    useSettingsStore();

  const [outfitReminders, setOutfitReminders] = useState(false);
  const [marketingNotifs, setMarketingNotifs] = useState(false);

  useEffect(() => {
    if (!isLoaded) loadKeys();
  }, [isLoaded, loadKeys]);

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

      {/* AI-integratie */}
      <SectionHeader label="AI-integratie" />
      <Card style={styles.card}>
        <ApiKeyInput
          label="OpenAI API-sleutel"
          placeholder="sk-..."
          value={openaiKey}
          onSave={setOpenaiKey}
          helpText="Vereist voor de kledingkastscan. Maak een sleutel aan op platform.openai.com."
        />
        <View style={styles.divider} />
        <ApiKeyInput
          label="Remove.bg API-sleutel"
          placeholder="Plak je Remove.bg sleutel"
          value={removeBgKey}
          onSave={setRemoveBgKey}
          helpText="Optioneel — verwijdert achtergronden van kleding. Gratis plan beschikbaar op remove.bg."
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
