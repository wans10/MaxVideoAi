export const locales = ['en', 'fr', 'es', 'zh'] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'en';

export const localeLabels: Record<AppLocale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español (LatAm)',
  zh: '简体中文',
};

export const localeRegions: Record<AppLocale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-419',
  zh: 'zh-CN',
};

export const localePathnames: Record<AppLocale, string> = {
  en: '',
  fr: 'fr',
  es: 'es',
  zh: 'zh',
};
