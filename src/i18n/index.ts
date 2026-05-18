import { I18n } from 'i18n-js';
import * as ExpoLocalization from 'expo-localization';
import { useCallback, useState } from 'react';
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
  const [locale, setLocaleState] = useState(i18n.locale);

  const translate = useCallback(
    (scope: TranslationScope, options?: Record<string, unknown>): string => {
      return i18n.t(scope, options);
    },
    [],
  );

  const setLocale = useCallback((newLocale: string) => {
    i18n.locale = newLocale;
    setLocaleState(newLocale);
  }, []);

  return { t: translate, locale, setLocale };
}

export default i18n;
