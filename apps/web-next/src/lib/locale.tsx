import { Direction } from 'radix-ui';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { AR } from '../i18n/ar.js';
import { EN, type Dict } from '../i18n/en.js';

export type Locale = 'en' | 'ar';

/*
  THE SAME STORAGE KEY AS THE CURRENT SITE, so a reader who chose Arabic there
  opens this one in Arabic too. `lang` and `dir` are set together and never one
  without the other: `lang` picks the font and the screen-reader voice, `dir`
  does the layout, and a page carrying one alone is wrong in a way that looks
  deliberate.
*/
const KEY = 'envelope.locale';

function remembered(): Locale {
  try {
    return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

interface LocaleValue {
  readonly locale: Locale;
  readonly dir: 'ltr' | 'rtl';
  readonly t: Dict;
  readonly setLocale: (next: Locale) => void;
}

const LocaleContext = createContext<LocaleValue | null>(null);

export function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export function LocaleProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [locale, setState] = useState<Locale>(remembered);

  useEffect(() => applyLocale(locale), [locale]);

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* not remembered; still applied */
    }
    setState(next);
  }, []);

  const value = useMemo<LocaleValue>(
    () => ({ locale, dir: locale === 'ar' ? 'rtl' : 'ltr', t: locale === 'ar' ? AR : EN, setLocale }),
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
