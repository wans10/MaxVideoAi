import type { AppLocale } from '@/i18n/locales';

type BreadcrumbLabels = {
  home: string;
  models: string;
  examples: string;
  pricing: string;
  blog: string;
};

const BREADCRUMB_LABELS: Record<AppLocale, BreadcrumbLabels> = {
  en: {
    home: 'Home',
    models: 'Models',
    examples: 'Examples',
    pricing: 'Pricing',
    blog: 'Blog',
  },
  fr: {
    home: 'Accueil',
    models: 'Modèles',
    examples: 'Exemples',
    pricing: 'Tarifs',
    blog: 'Blog',
  },
  es: {
    home: 'Inicio',
    models: 'Modelos',
    examples: 'Ejemplos',
    pricing: 'Precios',
    blog: 'Blog',
  },
  zh: {
    home: '首页',
    models: '模型',
    examples: '示例',
    pricing: '定价',
    blog: '博客',
  },
};

export function getBreadcrumbLabels(locale: AppLocale): BreadcrumbLabels {
  return BREADCRUMB_LABELS[locale] ?? BREADCRUMB_LABELS.en;
}
