/**
 * The reader's three browser-held preferences: theme, density and the rail.
 *
 * MOVED OUT OF `App.tsx`, and the move is the point. `Root` owns all three, and
 * `Root` is on every page; while they lived beside `EngineApp`, importing them
 * pulled the whole engine — ten steps, the drawing set, the parking plan — into
 * the bundle a visitor downloads to read the landing page. They import nothing
 * from the engine, so they now sit where the shell can reach them alone.
 */

import { useEffect, useState } from 'react';

/**
 * Light or dark, as a choice rather than an inheritance.
 *
 * The OS preference is not read. Both palettes are contrast-verified
 * (`pnpm contrast`), so dark is a supported option — but the default is the one
 * this artifact is for: a capacity study that gets printed, screenshotted into a
 * deck, and read across a table.
 */
export type Theme = 'light' | 'dark';

/** The three row heights `tokens.css` declares, by the names the attribute uses. */
export const DENSITIES = ['compact', 'comfortable', 'spacious'] as const;
export type Density = (typeof DENSITIES)[number];

/**
 * WHETHER THE WORKSPACE RAIL IS COLLAPSED TO ITS GLYPHS.
 *
 * Written as `data-sidebar-collapsed` on `<html>`, which the stylesheet reads to
 * set the grid column. The attribute is also set by the pre-paint script in
 * `index.html`, for the reason the theme is: a width applied after hydration
 * flashes wide and then narrow, and on a rail beside the content that flash moves
 * every word on the page.
 *
 * It is stored in the BROWSER, like the theme, the language and the density, and
 * `/settings` says so in those words. §6.4's rule is why: a preference that
 * claimed to follow an account would be the smallest possible version of a claim
 * this deployment cannot honour, since there is no tenancy.
 */
export function useSidebar(): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('envelope.sidebar') === 'collapsed';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (collapsed) root.setAttribute('data-sidebar-collapsed', '');
    else root.removeAttribute('data-sidebar-collapsed');
    try {
      localStorage.setItem('envelope.sidebar', collapsed ? 'collapsed' : 'expanded');
    } catch {
      /* blocked storage is not a reason to fail to render */
    }
  }, [collapsed]);

  return [collapsed, setCollapsed];
}

/**
 * THE READING DENSITY OF EVERY SCHEDULE IN THE PRODUCT.
 *
 * Written as `data-density` on `<html>`, which `tokens.css` turns into `--row-h`,
 * which every table row reads as a minimum. One owner, like the theme, and for
 * the same reason: `Root` holds it and passes it down, because three copies of
 * one fact desynchronised once already and the note on `useTheme` records what
 * that looked like.
 *
 * `comfortable` writes NO attribute rather than writing its own name. The
 * stylesheet declares comfortable as the default, so a document with no
 * preference and a document that chose comfortable render identically — and they
 * are one state in the reader's head, so they are one state in the markup.
 */
export function useDensity(): [Density, (d: Density) => void] {
  const [density, setDensity] = useState<Density>(() => {
    try {
      const saved = localStorage.getItem('envelope.density');
      return (DENSITIES as readonly string[]).includes(saved ?? '')
        ? (saved as Density)
        : 'comfortable';
    } catch {
      return 'comfortable';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (density === 'comfortable') root.removeAttribute('data-density');
    else root.setAttribute('data-density', density);
    try {
      localStorage.setItem('envelope.density', density);
    } catch {
      /* blocked storage is not a reason to fail to render */
    }
  }, [density]);

  return [density, setDensity];
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('envelope.theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('envelope.theme', theme);
    } catch {
      /* blocked storage is not a reason to fail to render */
    }
  }, [theme]);

  return [theme, () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))];
}
