/**
 * THE MARKS, IN ONE HAND.
 *
 * ---------------------------------------------------------------------------
 * WHY THEY ARE DRAWN HERE AND NOT INSTALLED.
 *
 * An icon set is a second designer's hand on the page. Lucide, Feather and the
 * rest are drawn at 24 on a 2px round-capped stroke with generous radii, and
 * this site is drawn at 16 on a 1.5px SQUARE cap with no radius anywhere —
 * because every other line on it is a drawing convention borrowed from a
 * drawing sheet, and a rounded chevron beside a dimension string reads as two
 * products stitched together. Twelve marks is less work than reconciling a set.
 *
 * They are also drawings of the SUBJECT rather than of a generic category: the
 * parking mark is a bay with a car in it, the readiness mark is a list with its
 * last row unfilled, the refusals mark is the one shape this product's whole
 * argument turns on. That is worth more than familiarity at this size.
 *
 * ---------------------------------------------------------------------------
 * `Record<Route, …>` AND NOT `Partial`.
 *
 * This table used to live in `AppSidebar.tsx` with seven of its twelve entries
 * `null`, and its own comment argued the exhaustive record: a `Partial` compiles
 * and ships a route with an empty box beside it. The record is kept and the
 * seven nulls are now drawn, so the nav, the rail and the colophon all read one
 * table — three places that were free to disagree about what a route looks like
 * and now cannot.
 *
 * EVERY MARK IS `aria-hidden`. Each one sits beside its own label in the same
 * link; announced, it would read the destination twice. There is no icon-only
 * control on this site, which is the condition that makes that safe.
 */
import type { JSX } from 'react';

import type { Route } from './router.js';

/* ==========================================================================
 * THE ROUTE MARKS
 * ======================================================================= */

export const ROUTE_GLYPH: Readonly<Record<Route, JSX.Element>> = {
  /* the answer  a sheet with one figure ruled under it — the governing band. */
  '/': (
    <>
      <path d="M2.5 2.5 H13.5 V13.5 H2.5 Z" />
      <path d="M5 6 H9" />
      <path d="M5 9.5 H11" />
      <path d="M5 11.5 H11" />
    </>
  ),
  /* parking  a car standing between two bay lines. The first version added a
     horizontal through the middle for the aisle, and at 16px a vertical crossed
     by a horizontal with a box on it reads as a FLAG — the aisle is a line this
     mark does not have room for. */
  '/parking': (
    <>
      <path d="M2.5 2 V14 M13.5 2 V14" />
      <path d="M5 4.5 H11 V11.5 H5 Z" />
    </>
  ),
  /* exports  a sheet and the direction a file leaves it in. */
  '/exports': (
    <>
      <path d="M3.5 2.5 H12.5 V13.5 H3.5 Z" />
      <path d="M8 5.5 V10.5" />
      <path d="M5.5 8 L8 10.5 L10.5 8" />
    </>
  ),
  /* refusals  the struck square. The same shape the product draws for a claim it
     will not make, which is the page's entire subject. */
  '/refusals': (
    <>
      <path d="M2.5 2.5 H13.5 V13.5 H2.5 Z" />
      <path d="M13.5 2.5 L2.5 13.5" />
    </>
  ),
  /* readiness  a checklist whose FIRST row is an empty box and whose other two
     are struck. The page leads with what is not ready, and the mark leads with it
     too. Three identical boxes beside two rules — the first attempt — read as a
     flag at this size and said nothing about readiness at any size. */
  '/readiness': (
    <>
      <path d="M1.5 2.5 H4.5 V5.5 H1.5 Z" />
      <path d="M1.5 8 L3 9.5 L5 7" />
      <path d="M1.5 12 L3 13.5 L5 11" />
      <path d="M6.75 4 H14.5 M6.75 8.25 H14.5 M6.75 12.25 H14.5" />
    </>
  ),
  /* sign in  a way through a wall. */
  '/sign-in': (
    <>
      <path d="M9.5 2.5 H13.5 V13.5 H9.5" />
      <path d="M2.5 8 H9.5" />
      <path d="M6 5 L9 8 L6 11" />
    </>
  ),
  /* sign up  a figure and the mark that adds one. */
  '/sign-up': (
    <>
      <path d="M6 3.5 a1.6 1.6 0 1 1 0 3.2 a1.6 1.6 0 1 1 0 -3.2" />
      <path d="M2.5 12.5 v-1 a2 2 0 0 1 2 -2 h3 a2 2 0 0 1 2 2 v1" />
      <path d="M12 3.5 V8 M9.75 5.75 H14.25" />
    </>
  ),
  /* accept an invitation  an envelope, open. */
  '/accept-invite': (
    <>
      <path d="M2.5 4 H13.5 V12 H2.5 Z" />
      <path d="M2.5 4 L8 8.5 L13.5 4" />
    </>
  ),
  /* run a plot  the affection plan: a sheet with a corner cut and two rules. */
  '/app': (
    <>
      <path d="M2.5 4.5 L5.5 2.5 L13.5 2.5 L13.5 13.5 L2.5 13.5 Z" />
      <path d="M5.5 7.5 L10.5 7.5 M5.5 10.5 L10.5 10.5" />
    </>
  ),
  /* your work  one sheet in front of another. */
  '/work': (
    <>
      <path d="M2.5 5.5 L9.5 5.5 L9.5 13.5 L2.5 13.5 Z" />
      <path d="M5.5 5.5 L5.5 2.5 L12.5 2.5 L12.5 10.5 L9.5 10.5" />
    </>
  ),
  /*
    workspace  three figures on one baseline — people, not a building. The rail's
               other two marks are drawings of the subject matter; this one is
               drawn in the same hand rather than borrowed from an icon set.
  */
  '/workspace': (
    <>
      <path d="M8 3.5 a1.6 1.6 0 1 1 0 3.2 a1.6 1.6 0 1 1 0 -3.2" />
      <path d="M3.5 12.5 v-1 a2 2 0 0 1 2 -2 h5 a2 2 0 0 1 2 2 v1" />
      <path d="M2.5 7.5 h1.5 M12 7.5 h1.5" />
    </>
  ),
  /* settings  two sliders, each set somewhere different. */
  '/settings': (
    <>
      <path d="M2.5 5.5 L13.5 5.5 M2.5 10.5 L13.5 10.5" />
      <path d="M5.5 3.5 L5.5 7.5 M10.5 8.5 L10.5 12.5" />
    </>
  ),
};

/* ==========================================================================
 * THE COLOPHON GROUPS
 * ======================================================================= */

/** The four column headings in the footer sitemap. */
export type Group = 'claim' | 'product' | 'method' | 'reference';

export const GROUP_GLYPH: Readonly<Record<Group, JSX.Element>> = {
  /* what it does not claim  a seal, and the rule it is struck through by. */
  claim: (
    <>
      <path d="M8 2.5 a4 4 0 1 1 0 8 a4 4 0 1 1 0 -8" />
      <path d="M5.2 3.7 L10.8 9.3" />
      <path d="M3.5 13.5 H12.5" />
    </>
  ),
  /* the product  a solid, seen in three quarters. */
  product: (
    <>
      <path d="M8 2 L14 5 V11 L8 14 L2 11 V5 Z" />
      <path d="M2 5 L8 8 L14 5" />
      <path d="M8 8 V14" />
    </>
  ),
  /* how it works  dividers, set to a span. */
  method: (
    <>
      <path d="M8 2.5 L3.5 13.5 M8 2.5 L12.5 13.5" />
      <path d="M5.75 8 H10.25" />
    </>
  ),
  /* reference  a book, open. */
  reference: (
    <>
      <path d="M8 4.5 V13.5" />
      <path d="M8 4.5 L2.5 3 V11.5 L8 13.5" />
      <path d="M8 4.5 L13.5 3 V11.5 L8 13.5" />
    </>
  ),
};

/* ==========================================================================
 * THE FRAME
 * ======================================================================= */

/**
 * One `<svg>` for every mark on the site.
 *
 * `currentColor` and nothing else: a mark takes the ink of the text it sits
 * beside, so it follows the theme, the hover and the inverted band without a
 * rule of its own — and `drawing-classes.test.ts`'s lesson applies here too,
 * that an SVG with no ink declared falls back to black.
 */
export function Icon({
  glyph,
  className,
  size = 16,
}: {
  readonly glyph: JSX.Element;
  readonly className?: string | undefined;
  readonly size?: number;
}): JSX.Element {
  return (
    <svg
      {...(className === undefined ? {} : { className })}
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {glyph}
    </svg>
  );
}
