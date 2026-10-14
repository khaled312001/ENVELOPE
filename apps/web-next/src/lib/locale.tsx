import { Direction } from 'radix-ui';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from 'react';
import { type Location, useLocation, useNavigate } from 'react-router';

import { AR } from '../i18n/ar.js';
import { engineNote } from './engine-notes.js';
import { EN, type Dict } from '../i18n/en.js';

export type Locale = 'en' | 'ar';

/*
  THE LANGUAGE IS IN THE ADDRESS.

  `/product` is English and `/ar/product` is the same page in Arabic.
  A language held only in localStorage is invisible to a search engine, to a
  link somebody pastes into a message, and to the `hreflang` pair each page
  declares — so the path decides, and storage only remembers the last choice
  under the key the current site uses, so a reader who chose Arabic there
  arrives here in Arabic too.

  The router sees ONE route tree for both languages: `App` strips the `/ar`
  prefix before matching, so switching language keeps the screen mounted —
  a half-drawn plot in the studio survives the switch.

  `lang` and `dir` are set together and never one without the other: `lang`
  picks the font and the screen-reader voice, `dir` does the layout.
*/
const KEY = 'envelope.locale';
const PREFIX = '/ar';

export function localeOf(pathname: string): Locale {
  return pathname === PREFIX || pathname.startsWith(`${PREFIX}/`) ? 'ar' : 'en';
}

/** The path without its language prefix — what the route tree matches. */
export function bare(pathname: string): string {
  return localeOf(pathname) === 'ar' ? pathname.slice(PREFIX.length) || '/' : pathname;
}

/** A path in a given language. Idempotent: a path already carrying the prefix keeps one. */
export function localised(path: string, locale: Locale): string {
  if (!path.startsWith('/')) return path;
  const [pathname = '/', rest = ''] = path.split(/(?=[?#])/, 2);
  const plain = bare(pathname);
  if (locale === 'en') return plain + rest;
  return (plain === '/' ? PREFIX : PREFIX + plain) + rest;
}

export function remembered(): Locale | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'ar' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

function remember(locale: Locale): void {
  try {
    localStorage.setItem(KEY, locale);
  } catch {
    /* not remembered; still applied */
  }
}

interface LocaleValue {
  readonly locale: Locale;
  readonly dir: 'ltr' | 'rtl';
  readonly t: Dict;
  readonly setLocale: (next: Locale) => void;
  /** An app path in the current language — for every `to` and `navigate`. */
  readonly href: (path: string) => string;
}

const LocaleContext = createContext<LocaleValue | null>(null);

export function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export function LocaleProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const locale = localeOf(location.pathname);

  useEffect(() => {
    applyLocale(locale);
    remember(locale);
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      remember(next);
      navigate(localised(location.pathname, next) + location.search + location.hash, { replace: true, preventScrollReset: true });
    },
    [navigate, location],
  );

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      dir: locale === 'ar' ? 'rtl' : 'ltr',
      t: locale === 'ar' ? AR : EN,
      setLocale,
      href: (path: string) => localised(path, locale),
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>
      <Direction.Provider dir={value.dir}>{children}</Direction.Provider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleValue {
  const v = useContext(LocaleContext);
  if (!v) throw new Error('useLocale outside LocaleProvider');
  return v;
}

/** The location the route tree matches: the real one, without its language prefix. */
export function bareLocation(location: Location): Location {
  return { ...location, pathname: bare(location.pathname) };
}

/**
 * Text the engine wrote — a basis, a rule label, a validator's sentence. The
 * glossary forbids translating it, so on an Arabic page it is marked as English
 * and left-to-right: its punctuation stays at its own end and a screen reader
 * changes voice for it.
 */
export function EngineText({ children, className }: { readonly children: ReactNode; readonly className?: string }): JSX.Element {
  const { locale } = useLocale();
  return locale === 'ar' ? (
    <span dir="ltr" lang="en" className={className}>
      {children}
    </span>
  ) : (
    <span className={className}>{children}</span>
  );
}

/** A parking or access sentence from the engine: short and in the page's language when known, verbatim otherwise. */
export function EngineNote({ text, className }: { readonly text: string; readonly className?: string }): JSX.Element {
  const { locale } = useLocale();
  const said = engineNote(text, locale);
  return said === null ? <EngineText {...(className ? { className } : {})}>{text}</EngineText> : <span className={className}>{said}</span>;
}
