import type { ReactNode } from 'react';

import { engineNote } from './engine-notes.js';
import { useLocale } from './locale.js';

/*
  THE ENGINE'S WORDS ARE NOT THE FRONT PAGE'S.

  These three lived in `locale.tsx`, which every page loads before it draws, and
  so the whole dictionary of engine sentences (`@envelope/report/words`) did too.
  It grew with every wave until the front page loaded 1,002 KB against its
  950 KB budget (17 Oct 2026). Only the studio and the screens that show a run's
  sentences read them, and those are lazy, so the dictionary rides with them.
*/

/**
 * Text the engine wrote — a basis, a rule label, a validator's sentence. One
 * whose wording `engine-notes` recognises is said briefly in the page's
 * language; one it does not is shown verbatim and, on an Arabic page, marked as
 * English and left-to-right, so its punctuation stays at its own end and a
 * screen reader changes voice for it.
 */
export function EngineText({ children, className }: { readonly children: ReactNode; readonly className?: string }): JSX.Element {
  const { locale } = useLocale();
  // A sentence the readers know is said in the page's language (Eng. Mohamed, 16 Oct 2026); the rest stays verbatim.
  const said = typeof children === 'string' ? engineNote(children, locale) : null;
  if (said !== null) return <span className={className}>{said}</span>;
  return locale === 'ar' ? (
    <span dir="ltr" lang="en" className={className}>
      {children}
    </span>
  ) : (
    <span className={className}>{children}</span>
  );
}

/**
 * A refusal or notice from the engine, in the page's language. One no reader
 * knows is not shown bare on an Arabic page: an Arabic line says what it is, and
 * the engine's English sits beneath it as written.
 */
export function EngineMessage({ text }: { readonly text: string }): JSX.Element {
  const { locale, t } = useLocale();
  const said = engineNote(text, locale);
  if (said !== null) return <span>{said}</span>;
  if (locale === 'en') return <span>{text}</span>;
  return (
    <span className="grid gap-1">
      <span className="text-secondary">{t.studio.untranslated}</span>
      <span dir="ltr" lang="en" className="text-[12px]">
        {text}
      </span>
    </span>
  );
}

/** A parking or access sentence from the engine: short and in the page's language when known, verbatim otherwise. */
export function EngineNote({ text, className }: { readonly text: string; readonly className?: string }): JSX.Element {
  const { locale } = useLocale();
  const said = engineNote(text, locale);
  return said === null ? <EngineText {...(className ? { className } : {})}>{text}</EngineText> : <span className={className}>{said}</span>;
}
