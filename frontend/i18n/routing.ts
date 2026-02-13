import { defineRouting } from 'next-intl/routing';
import { defaultLocale, locales } from '@/i18n/locales';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  pathnames: {
    '/': '/',
    '/models': {
      en: '/models',
      fr: '/modeles',
      es: '/modelos',
      zh: '/models',
    },
    '/models/[slug]': {
      en: '/models/[slug]',
      fr: '/modeles/[slug]',
      es: '/modelos/[slug]',
      zh: '/models/[slug]',
    },
    '/pricing': {
      en: '/pricing',
      fr: '/tarifs',
      es: '/precios',
      zh: '/pricing',
    },
    '/examples': {
      en: '/examples',
      fr: '/galerie',
      es: '/galeria',
      zh: '/examples',
    },
    '/examples/[model]': {
      en: '/examples/[model]',
      fr: '/galerie/[model]',
      es: '/galeria/[model]',
      zh: '/examples/[model]',
    },
    '/ai-video-engines': {
      en: '/ai-video-engines',
      fr: '/comparatif',
      es: '/comparativa',
      zh: '/ai-video-engines',
    },
    '/ai-video-engines/[slug]': {
      en: '/ai-video-engines/[slug]',
      fr: '/comparatif/[slug]',
      es: '/comparativa/[slug]',
      zh: '/ai-video-engines/[slug]',
    },
    '/ai-video-engines/best-for': {
      en: '/ai-video-engines/best-for',
      fr: '/comparatif/best-for',
      es: '/comparativa/best-for',
      zh: '/ai-video-engines/best-for',
    },
    '/ai-video-engines/best-for/[usecase]': {
      en: '/ai-video-engines/best-for/[usecase]',
      fr: '/comparatif/best-for/[usecase]',
      es: '/comparativa/best-for/[usecase]',
      zh: '/ai-video-engines/best-for/[usecase]',
    },
    '/blog': {
      en: '/blog',
      fr: '/blog',
      es: '/blog',
      zh: '/blog',
    },
    '/blog/[slug]': {
      en: '/blog/[slug]',
      fr: '/blog/[slug]',
      es: '/blog/[slug]',
      zh: '/blog/[slug]',
    },
    '/status': {
      en: '/status',
      fr: '/status',
      es: '/status',
      zh: '/status',
    },
    '/legal/terms': {
      en: '/legal/terms',
      fr: '/legal/terms',
      es: '/legal/terms',
      zh: '/legal/terms',
    },
    '/legal/privacy': {
      en: '/legal/privacy',
      fr: '/legal/privacy',
      es: '/legal/privacy',
      zh: '/legal/privacy',
    },
    '/legal/acceptable-use': {
      en: '/legal/acceptable-use',
      fr: '/legal/acceptable-use',
      es: '/legal/acceptable-use',
      zh: '/legal/acceptable-use',
    },
    '/legal/cookies': {
      en: '/legal/cookies',
      fr: '/legal/cookies',
      es: '/legal/cookies',
      zh: '/legal/cookies',
    },
    '/legal/mentions': {
      en: '/legal/mentions',
      fr: '/legal/mentions',
      es: '/legal/mentions',
      zh: '/legal/mentions',
    },
    '/legal/takedown': {
      en: '/legal/takedown',
      fr: '/legal/takedown',
      es: '/legal/takedown',
      zh: '/legal/takedown',
    },
    '/legal/subprocessors': {
      en: '/legal/subprocessors',
      fr: '/legal/subprocessors',
      es: '/legal/subprocessors',
      zh: '/legal/subprocessors',
    },
    '/legal/cookies-list': {
      en: '/legal/cookies-list',
      fr: '/legal/cookies-list',
      es: '/legal/cookies-list',
      zh: '/legal/cookies-list',
    },
    '/docs': {
      en: '/docs',
      fr: '/docs',
      es: '/docs',
      zh: '/docs',
    },
    '/docs/[slug]': {
      en: '/docs/[slug]',
      fr: '/docs/[slug]',
      es: '/docs/[slug]',
      zh: '/docs/[slug]',
    },
  },
});
