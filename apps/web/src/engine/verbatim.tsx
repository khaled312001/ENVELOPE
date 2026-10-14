import type { ReactNode } from 'react';

import { useLocale, Verbatim } from '../i18n/locale.js';

/**
 * An engine string, isolated on the Arabic page and untouched on the English one.
 *
 * A Latin run inside an Arabic sentence is reordered at its boundaries by the
 * bidirectional algorithm, so a trailing full stop or a bracketed citation lands at
 * the wrong end. `Verbatim` sets `dir="ltr" lang="en"`. On the English page the
 * document already is both, so the span would carry nothing — and the engine
 * screens' English rendering is held byte-identical to what it was before their
 * copy moved.
 */
export function useVerbatim(): (value: ReactNode) => ReactNode {
  const { locale } = useLocale();
  return (value) => (locale === 'ar' ? <Verbatim>{value}</Verbatim> : value);
}
