import type { Metadata } from 'next';
import { TakedownForm, type TakedownFormCopy } from './TakedownForm';
import { resolveLocale } from '@/lib/i18n/server';
import type { AppLocale } from '@/i18n/locales';
import { ObfuscatedEmailLink } from '@/components/marketing/ObfuscatedEmailLink';
import { buildSeoMetadata } from '@/lib/seo/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await resolveLocale()) as AppLocale;
  return buildSeoMetadata({
    locale,
    title: 'Notice & Takedown',
    description: 'Report abusive or unlawful content generated through MaxVideoAI.',
    hreflangGroup: 'legalTakedown',
    englishPath: '/legal/takedown',
    availableLocales: ['en', 'fr', 'es'] as AppLocale[],
    ogType: 'article',
    imageAlt: 'Notice and takedown policy',
  });
}

const HEADER_COPY: Record<AppLocale, { title: string; effective: string; companyLine: string; contactLabel: string }> = {
  en: {
    title: 'Notice & Takedown',
    effective: 'Effective date: 28 October 2025',
    companyLine: 'Company: MaxVideoAI',
    contactLabel: 'Contact:',
  },
  fr: {
    title: 'Notification & retrait',
    effective: "Date d’entrée en vigueur : 28 octobre 2025",
    companyLine: 'Société : MaxVideoAI',
    contactLabel: 'Contact :',
  },
  es: {
    title: 'Notificación y retirada',
    effective: 'Fecha de entrada en vigor: 28 de octubre de 2025',
    companyLine: 'Empresa: MaxVideoAI',
    contactLabel: 'Contacto:',
  },
  zh: {
    title: '通知与下架',
    effective: '生效日期：2025年10月28日',
    companyLine: '公司：MaxVideoAI',
    contactLabel: '联系方式：',
  },
};

const FORM_COPY: Record<AppLocale, TakedownFormCopy> = {
  en: {
    emailLabel: 'Contact email',
    urlLabel: 'URL of the content',
    urlPlaceholder: 'https://maxvideoai.com/video/...',
    reasonLabel: 'Reason',
    reasons: {
      copyright: 'Copyright / IP infringement',
      privacy: 'Privacy / Personal data',
      defamation: 'Defamation',
      trademark: 'Trademark violation',
      other: 'Other unlawful content',
    },
    detailsLabel: 'Details',
    detailsPlaceholder: 'Describe the issue and why it breaches your rights or the law.',
    detailsHint: 'Provide enough information for us to locate and assess the content.',
    attachmentLabel: 'Supporting file (optional, max 2 MB)',
    attachmentError: 'Attachments must be smaller than 2 MB.',
    errors: { submit: 'Unable to submit report.' },
    success: 'Thank you. We have received your report and will follow up shortly.',
    submitLabel: 'Submit report',
    submittingLabel: 'Sending…',
  },
  fr: {
    emailLabel: 'E-mail de contact',
    urlLabel: 'URL du contenu',
    urlPlaceholder: 'https://maxvideoai.com/video/...',
    reasonLabel: 'Motif',
    reasons: {
      copyright: 'Atteinte aux droits d’auteur / IP',
      privacy: 'Vie privée / Données personnelles',
      defamation: 'Diffamation',
      trademark: 'Violation de marque',
      other: 'Autre contenu illégal',
    },
    detailsLabel: 'Détails',
    detailsPlaceholder: 'Décrivez le problème et pourquoi il viole vos droits ou la loi.',
    detailsHint: 'Précisez suffisamment d’informations pour localiser et évaluer le contenu.',
    attachmentLabel: 'Pièce jointe (optionnelle, 2 Mo max)',
    attachmentError: 'Les pièces jointes doivent faire moins de 2 Mo.',
    errors: { submit: 'Impossible d’envoyer le signalement.' },
    success: 'Merci. Nous avons bien reçu votre signalement et vous répondrons rapidement.',
    submitLabel: 'Envoyer le signalement',
    submittingLabel: 'Envoi…',
  },
  es: {
    emailLabel: 'Correo de contacto',
    urlLabel: 'URL del contenido',
    urlPlaceholder: 'https://maxvideoai.com/video/...',
    reasonLabel: 'Motivo',
    reasons: {
      copyright: 'Infracción de copyright / PI',
      privacy: 'Privacidad / Datos personales',
      defamation: 'Difamación',
      trademark: 'Violación de marca',
      other: 'Otro contenido ilegal',
    },
    detailsLabel: 'Detalles',
    detailsPlaceholder: 'Describe el problema y por qué infringe tus derechos o la ley.',
    detailsHint: 'Incluye suficiente información para localizar y evaluar el contenido.',
    attachmentLabel: 'Archivo de soporte (opcional, máx. 2 MB)',
    attachmentError: 'El archivo adjunto debe ser menor a 2 MB.',
    errors: { submit: 'No se pudo enviar el reporte.' },
    success: 'Gracias. Hemos recibido tu reporte y te contactaremos en breve.',
    submitLabel: 'Enviar reporte',
    submittingLabel: 'Enviando…',
  },
  zh: {
    emailLabel: '联系电子邮件',
    urlLabel: '内容网址',
    urlPlaceholder: 'https://maxvideoai.com/video/...',
    reasonLabel: '原因',
    reasons: {
      copyright: '版权 / 知识产权侵权',
      privacy: '隐私 / 个人数据',
      defamation: '诽谤',
      trademark: '商标侵权',
      other: '其他非法内容',
    },
    detailsLabel: '详情',
    detailsPlaceholder: '描述问题以及它为何侵犯您的权利或法律。',
    detailsHint: '提供足够的信息以便我们定位和评估内容。',
    attachmentLabel: '支持文件（可选，最大 2 MB）',
    attachmentError: '附件必须小于 2 MB。',
    errors: { submit: '无法提交报告。' },
    success: '谢谢。我们已收到您的报告，并将尽快跟进。',
    submitLabel: '提交报告',
    submittingLabel: '正在发送…',
  },
};

function TakedownArticle({ locale }: { locale: AppLocale }) {
  switch (locale) {
    case 'fr':
      return (
        <article className="space-y-4 text-base leading-relaxed text-text-secondary">
          <p>
            Si un contenu généré via MaxVideoAI porte atteinte à vos droits ou enfreint la loi, utilisez ce formulaire pour demander un examen. Nous accusons réception, enquêtons rapidement et prenons
            les mesures appropriées (suppression ou suspension de compte si nécessaire).
          </p>
          <p>
            Pour les urgences (sécurité personnelle ou demandes officielles), écrivez à{' '}
            <ObfuscatedEmailLink
              user="legal"
              domain="maxvideoai.com"
              label="legal@maxvideoai.com"
              placeholder="legal [at] maxvideoai.com"
            />{' '}
            avec « URGENT » dans l’objet.
          </p>
        </article>
      );
    case 'es':
      return (
        <article className="space-y-4 text-base leading-relaxed text-text-secondary">
          <p>
            Si un contenido generado con MaxVideoAI vulnera tus derechos o la ley, utiliza este formulario para solicitar una revisión. Confirmaremos la recepción, investigaremos con rapidez y actuaremos
            en consecuencia (incluida la retirada del contenido o la suspensión de cuentas cuando proceda).
          </p>
          <p>
            Para casos urgentes (seguridad personal o solicitudes policiales), escribe a{' '}
            <ObfuscatedEmailLink
              user="legal"
              domain="maxvideoai.com"
              label="legal@maxvideoai.com"
              placeholder="legal [at] maxvideoai.com"
            />{' '}
            con “URGENT” en el asunto.
          </p>
        </article>
      );
    default:
      return (
        <article className="space-y-4 text-base leading-relaxed text-text-secondary">
          <p>
            If content generated through MaxVideoAI infringes your rights or violates the law, use this form to request a review. We will acknowledge receipt, investigate promptly, and take appropriate
            action (including removal or account suspension when justified).
          </p>
          <p>
            For urgent reports (personal safety or law-enforcement matters), email{' '}
            <ObfuscatedEmailLink
              user="legal"
              domain="maxvideoai.com"
              label="legal@maxvideoai.com"
              placeholder="legal [at] maxvideoai.com"
            />{' '}
            with “URGENT” in the subject line.
          </p>
        </article>
      );
  }
}

export default async function TakedownPage() {
  const locale = await resolveLocale();
  const header = HEADER_COPY[locale] ?? HEADER_COPY.en;
  const formCopy = FORM_COPY[locale] ?? FORM_COPY.en;

  return (
    <div className="stack-gap-lg">
      <header className="stack-gap-sm">
        <h1 className="text-xl font-semibold text-text-primary">{header.title}</h1>
        <p className="text-sm text-text-secondary">{header.effective}</p>
        <p className="text-sm text-text-secondary">{header.companyLine}</p>
        <p className="text-sm text-text-secondary">
          {header.contactLabel}{' '}
          <ObfuscatedEmailLink
            user="legal"
            domain="maxvideoai.com"
            label="legal@maxvideoai.com"
            placeholder="legal [at] maxvideoai.com"
          />
        </p>
      </header>

      <TakedownArticle locale={locale} />

      <TakedownForm copy={formCopy} />
    </div>
  );
}
