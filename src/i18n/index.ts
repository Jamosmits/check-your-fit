import { I18n } from 'i18n-js';
import * as ExpoLocalization from 'expo-localization';
import { useCallback } from 'react';
import { nl } from './nl';
import { en } from './en';

const i18n = new I18n({
  nl,
  en,
});

i18n.locale = ExpoLocalization.getLocales()[0]?.languageCode ?? 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export type TranslationScope = Parameters<typeof i18n.t>[0];

export function t(scope: TranslationScope, options?: Record<string, unknown>): string {
  return i18n.t(scope, options);
}

export function useTranslation() {
  const translate = useCallback(
    (scope: TranslationScope, options?: Record<string, unknown>): string => {
      return i18n.t(scope, options);
    },
    [],
  );

  return { t: translate, locale: i18n.locale };
}

export default i18n;
