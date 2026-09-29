/**
 * The page's theme, published for the components too deep to be handed it.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT A SECOND `useTheme()`.
 *
 * `Root` owns the only `useTheme()` in the application, and the comment on that
 * hook call records why: there were three once, and they desynchronised exactly
 * as three copies of one fact do — toggling on one page left another holding the
 * old value, so its first click set the theme to what it already was and appeared
 * to do nothing.
 *
 * So this provider OWNS NOTHING. It takes the value `Root` already holds and
 * republishes it. There is no setter on it and no state in it; a component that
 * wants to CHANGE the theme still has to be a page and still gets `toggleTheme`
 * through `PageProps`. Reading is the only thing that was missing.
 *
 * ---------------------------------------------------------------------------
 * WHY READING WAS MISSING, AND WHY A PROP WOULD NOT DO.
 *
 * `Illustration` picks the dark file in React rather than in CSS or `<picture>`
 * — `img.tsx` argues that at length — so every call site needs the theme. The
 * call sites are the step primers, the empty states and the auth panel, and not
 * one of them is a page: `StepPrimer` is six components below `Root`, and the
 * step panels between it and the page take their props from the engine's own
 * state. Threading `theme` through all of them would put a display concern into
 * six signatures that have nothing to do with display, and the first component
 * anyone forgot would silently serve a light image on a dark page.
 *
 * The default outside a provider is `'light'`, which is the correct palette
 * rather than a placeholder: a light image on a light page is right, and a test
 * that renders one component alone gets the light file without arranging
 * anything.
 */

import { createContext, useContext, type ReactNode } from 'react';

const Ctx = createContext<'light' | 'dark'>('light');

export function PageTheme({
  value,
  children,
}: {
  readonly value: 'light' | 'dark';
  readonly children: ReactNode;
}): JSX.Element {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The theme the page is painted in. `'light'` outside a provider — see above. */
export function usePageTheme(): 'light' | 'dark' {
  return useContext(Ctx);
}
