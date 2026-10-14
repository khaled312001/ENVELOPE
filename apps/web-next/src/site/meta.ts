import { useEffect } from 'react';

import { localised, type Locale, useLocale } from '../lib/locale.js';
import SEO from './seo.json';

/*
  THE HEAD, KEPT IN STEP WITH THE PAGE.

  `scripts/prerender.mjs` writes each public route's head at build time, so the
  first response already carries its title, description, canonical and
  `hreflang` pair. This hook keeps them right after a client-side navigation —
  from the same `seo.json`, so the two can never disagree. It updates the tags
  the prerender wrote rather than adding new ones: two `<title>`s is a page
  whose name depends on which one a crawler reads first.
*/

export type PagePath = (typeof SEO.pages)[number]['path'];

export function absolute(path: string, locale: Locale): string {
  const local = localised(path, locale);
  return SEO.origin + SEO.base + (local === '/' ? '/' : local);
}

function setMeta(attr: 'name' | 'property', key: string, value: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = value;
}

function setLink(rel: string, href: string, hreflang?: string): void {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    if (hreflang) el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** A public page's head. `null` marks a working screen: not indexed, and named plainly. */
export function usePageMeta(path: PagePath | null, fallbackTitle?: string): void {
  const { locale } = useLocale();
  useEffect(() => {
    const page = path === null ? undefined : SEO.pages.find((p) => p.path === path);
    if (!page) {
      document.title = fallbackTitle ? `${fallbackTitle} — ${SEO.siteName}` : SEO.siteName;
      setMeta('name', 'robots', 'noindex, nofollow');
      return;
    }
    const words = page[locale];
    document.title = words.title;
    setMeta('name', 'robots', 'index, follow');
    setMeta('name', 'description', words.description);
    setMeta('property', 'og:title', words.title);
    setMeta('property', 'og:description', words.description);
    setMeta('property', 'og:url', absolute(page.path, locale));
    setMeta('property', 'og:locale', locale === 'ar' ? 'ar_AE' : 'en_GB');
    setMeta('name', 'twitter:title', words.title);
    setMeta('name', 'twitter:description', words.description);
    setLink('canonical', absolute(page.path, locale));
    setLink('alternate', absolute(page.path, 'en'), 'en');
    setLink('alternate', absolute(page.path, 'ar'), 'ar');
    setLink('alternate', absolute(page.path, 'en'), 'x-default');
  }, [path, locale, fallbackTitle]);
}
