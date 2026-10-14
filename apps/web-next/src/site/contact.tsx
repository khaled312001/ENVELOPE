import { motion, useReducedMotion } from 'motion/react';

import { SITE_AR } from '../i18n/site.ar.js';
import { SITE_EN } from '../i18n/site.en.js';
import { cn } from '../lib/cn.js';
import { useLocale } from '../lib/locale.js';

/** Where a reader reaches the people behind the site. Published on every page, on purpose. */
export const CONTACT = {
  phone: '+971 54 717 8555',
  /** wa.me takes the number in international form, digits only. */
  whatsapp: '971547178555',
  email: 'info@plotlogic.dev',
} as const;

export function whatsappHref(text?: string): string {
  return `https://wa.me/${CONTACT.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** WhatsApp's glyph, the speech bubble and handset, in `currentColor`. */
export function WhatsAppGlyph({ className }: { readonly className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

/*
  THE FLOATING WHATSAPP BUTTON.

  In the brand's blue-violet, not WhatsApp's green: green on this site means a
  DERIVED value, and a button that borrowed it would teach a reader the colour
  means nothing in particular. The glyph is what makes it recognisable.

  It sits at the end of the line (bottom right in English, bottom left in
  Arabic), arrives once after the page has settled, and its glyph turns briefly
  every few seconds. Its label is in words, because an icon alone is not a name.
*/
export function WhatsAppButton(): JSX.Element {
  const { locale } = useLocale();
  const s = locale === 'ar' ? SITE_AR : SITE_EN;
  const reduce = useReducedMotion();
  return (
    <motion.a
      href={whatsappHref(s.whatsapp.greeting)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={s.whatsapp.label}
      className="group fixed end-4 bottom-4 z-40 flex items-center gap-2 sm:end-6 sm:bottom-6"
      initial={reduce ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 1.2 }}
    >
      <span className="pointer-events-none hidden translate-x-2 rounded-full border border-line bg-panel px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap text-fg opacity-0 shadow-soft transition-[opacity,transform] duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:block rtl:-translate-x-2">
        {s.whatsapp.tip}
      </span>
      <span className="relative grid size-14 place-items-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-alt-solid" aria-hidden="true" />
        <span
          className={cn(
            'relative grid size-14 place-items-center rounded-full bg-linear-to-br from-brand-solid to-brand-alt-solid text-on-brand shadow-lifted',
            'transition-transform duration-200 group-hover:scale-110 group-active:scale-95 motion-reduce:group-hover:scale-100',
          )}
        >
          <WhatsAppGlyph className="size-7 animate-wiggle" />
        </span>
      </span>
    </motion.a>
  );
}
