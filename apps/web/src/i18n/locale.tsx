/**
 * ONE LOCALE, OWNED IN ONE PLACE — for the same reason there is one `useTheme`.
 *
 * `App.tsx` records what happened when three components each held their own theme:
 * they desynchronised, and a toggle on one screen appeared to do nothing on
 * another. A locale is worse, because a page half in each language is not a wrong
 * colour, it is a page that cannot be read. `Root` holds the only provider and
 * everything else reads the context.
 *
 * ---------------------------------------------------------------------------
 * THE DEFAULT IS A REAL DICTIONARY, NOT `null`.
 *
 * Every render test in `apps/web/test` mounts a screen directly with
 * `renderToStaticMarkup` and no provider. A context that threw without one would
 * turn a translation feature into a test-suite outage, and — worse — would push
 * every future test towards wrapping in a provider it does not care about. The
 * default is English, which is what those tests assert against.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { AR } from './chrome.ar.js';
import { EN, type ChromeDictionary } from './chrome.en.js';

export type Locale = 'en' | 'ar';

/**
 * `envelope.` and not `topai.`, matching `envelope.theme`.
 *
 * `index.html` states the rule: TOP.ai is the public name, ENVELOPE stays the name
 * of the packages, the directories and the storage keys, because renaming a key
 * signs every returning reader out of their own setting for a change that is a
 * wordmark rather than a migration.
 */
const STORAGE_KEY = 'envelope.locale';

export const DIRECTION: Readonly<Record<Locale, 'ltr' | 'rtl'>> = {
  en: 'ltr',
  ar: 'rtl',
};

const DICTIONARIES: Readonly<Record<Locale, ChromeDictionary>> = { en: EN, ar: AR };

interface LocaleValue {
  readonly locale: Locale;
  readonly dir: 'ltr' | 'rtl';
  readonly t: ChromeDictionary;
  readonly setLocale: (next: Locale) => void;
}

const LocaleContext = createContext<LocaleValue>({
  locale: 'en',
  dir: 'ltr',
  t: EN,
  setLocale: () => {},
});

function read(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    /* Blocked storage is not a reason to fail to render. */
    return 'en';
  }
}

export function LocaleProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(read);

  /*
    `lang` AND `dir` BOTH, AND ON `<html>`.

    `dir` is what turns 235 logical properties into a right-to-left layout — the
    stylesheets were written in `inline-size`, `margin-inline` and `border-inline-
    start` throughout, so the direction change is a one-attribute change for
    almost the whole site rather than a second stylesheet.

    `lang` is not decoration beside it: it selects the Arabic font stack, it tells a
    screen reader which voice to use, and it is what makes the `lang="en"` on a
    `Verbatim` span mean something. A page with `dir="rtl"` and `lang="en"` reads
    every engine string in an Arabic voice and every Arabic sentence in an English
    one.
  */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', locale);
    root.setAttribute('dir', DIRECTION[locale]);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* as above */
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  return (
    <LocaleContext.Provider
      value={{ locale, dir: DIRECTION[locale], t: DICTIONARIES[locale], setLocale }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * A SUBTREE IN ONE FIXED LOCALE, with no storage and no effect on `<html>`.
 *
 * For render tests. `renderToStaticMarkup` runs no effects and has no
 * `localStorage`, so `LocaleProvider` can only ever render English there — which
 * left every Arabic dictionary on the site rendered by nothing until a browser
 * opened it. This is how a test asks for the Arabic page and scans what a reader
 * would read.
 */
export function StaticLocale({
  locale,
  children,
}: {
  readonly locale: Locale;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <LocaleContext.Provider
      value={{ locale, dir: DIRECTION[locale], t: DICTIONARIES[locale], setLocale: () => {} }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleValue {
  return useContext(LocaleContext);
}

/** The chrome dictionary for the active locale. */
export function useT(): ChromeDictionary {
  return useContext(LocaleContext).t;
}

/**
 * A SCREEN'S OWN DICTIONARY, PASSED IN RATHER THAN LOOKED UP.
 *
 * There is no registry and no key namespace. A screen imports its two modules and
 * hands them both to this hook:
 *
 *   const t = useDict(EN, AR);
 *
 * Three things follow from that shape, and each of them is the reason for it.
 *
 * FIRST, `<T,>(en: T, ar: T): T` means the two modules must be the SAME TYPE. The
 * English module is written without `as const`, so its values widen to `string` and
 * the type it exports is a shape; the Arabic module declares itself against that
 * shape. A missing Arabic key, a misspelled one, or one nobody removed from either
 * side is a compile error. A translation layer that falls back to English on a
 * missing key produces a page that looks finished in two languages at once and
 * reports nothing — the i18n form of a hidden default.
 *
 * SECOND, a screen's dictionary is reachable only from that screen. Nothing can
 * accidentally render the parking page's wording on the refusals page, and no
 * global object grows a key for every string on the site.
 *
 * THIRD, and this is what made the translation partitionable at all: one screen is
 * exactly three files — its component and its two dictionaries — owned by one
 * author, with no shared file to serialise on. A single `ar.ts` would have been a
 * file every translation pass had to edit at once.
 *
 * Unused modules are dropped by the bundler as usual; there is no dynamic import
 * here because the Arabic strings are a few kilobytes and a split point that saves
 * nothing costs a request at the moment the reader switches.
 */
export function useDict<T>(en: T, ar: T): T {
  return useContext(LocaleContext).locale === 'ar' ? ar : en;
}

/**
 * WHAT THE ENGINE SAID, RENDERED AS IT SAID IT.
 *
 * A basis string, a formula off the provenance graph, a rule id, a parameter id, a
 * gate name. `docs/05-design/arabic-glossary.md` carries the argument in full and
 * it is short: a basis string is a RECORD OF WHY A NUMBER WAS ASSUMED. It is
 * emitted by the engine, carried in the provenance graph, printed in the report and
 * signed at G4. Translating it manufactures a second version of a piece of evidence
 * that nobody issued — and there would then be two answers to "what did the engine
 * say", which is the failure `verify-worked-example.mjs` exists to prevent for
 * figures.
 *
 * `dir="ltr"` is not cosmetic either. Latin text inside an RTL paragraph is
 * reordered by the bidirectional algorithm at its boundaries, so a trailing full
 * stop or a bracketed citation migrates to the wrong end of the string. An
 * identifier that renders as `(FR-DEF-002` is a citation a reader cannot check.
 *
 * `unicode-bidi: isolate` in `rtl.css` finishes the job: it stops this run from
 * reordering the Arabic around it.
 */
export function Verbatim({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}): JSX.Element {
  return (
    <span dir="ltr" lang="en" className={className ? `verbatim ${className}` : 'verbatim'}>
      {children}
    </span>
  );
}

/**
 * The switch.
 *
 * IT SAYS THE TARGET LANGUAGE IN THE TARGET LANGUAGE'S OWN SCRIPT — «العربية» on
 * the English site, "English" on the Arabic one. A reader who cannot read the
 * current page's language is exactly the reader this control is for, so labelling
 * it "Arabic" in English would put the one word they need in the one script they
 * came here to leave.
 *
 * NO FLAG. A flag is a country. Arabic is not a country, and the reader in Dubai
 * whose site this is would be offered someone else's.
 *
 * It is a button rather than a two-state toggle with `aria-pressed`: "pressed" is
 * the wrong model for a choice between two named things, and the theme control
 * beside it already uses `aria-pressed` correctly for a genuine on/off.
 */
export function LanguageToggle(): JSX.Element {
  const { locale, setLocale, t } = useLocale();
  return (
    <button
      type="button"
      className="button button--sm"
      lang={locale === 'en' ? 'ar' : 'en'}
      onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
    >
      <span aria-hidden="true">{t.switchTo}</span>
      <span className="sr-only" lang={locale}>
        {t.switchToLabel}
      </span>
    </button>
  );
}
