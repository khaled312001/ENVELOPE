/**
 * THE MARKS — Lucide, since 5 Oct 2026.
 *
 * ---------------------------------------------------------------------------
 * WHY THEY ARE INSTALLED AND NO LONGER DRAWN HERE.
 *
 * The twelve hand-drawn marks this file used to hold were argued from the old
 * visual language: the site was inked at 16px on a 1.5px SQUARE cap with no
 * radius anywhere, every line on it borrowed from a drawing sheet, and a
 * rounded chevron beside a dimension string read as two products stitched
 * together. That argument was sound and it is now spent — the client replaced
 * that language on 5 Oct, and a 1.5px square-capped mark is the single clearest
 * tell of the decade the page was asked to leave.
 *
 * Lucide is the set: ISC licence, a strict 24px grid at a 2px round-capped
 * stroke, first-party React package, and it is what the repository's own
 * `design-component` skill already mandates ("use verbatim lucide paths, never
 * hand-approximated path data" — hand-approximation is how a help "?" once
 * rendered as a dot here).
 *
 * `ROUTE_GLYPH` and `GROUP_GLYPH` keep their NAMES and their exhaustive
 * `Record<…>` types. The record is still exhaustive rather than `Partial`,
 * because a `Partial` compiles and ships a route with an empty box beside it.
 *
 * EVERY MARK IS `aria-hidden`. Each sits beside its own label in the same link;
 * announced, it would read the destination twice. There is no icon-only control
 * on this site, which is the condition that makes that safe.
 */
import type { JSX } from 'react';

import {
  BookOpen,
  Boxes,
  CircleSlash,
  FileDown,
  FolderOpen,
  Gauge,
  KeyRound,
  LayoutGrid,
  type LucideIcon,
  Mail,
  ScanLine,
  Settings2,
  SlidersHorizontal,
  SquareStack,
  UserPlus,
  Users,
} from 'lucide-react';

import type { PageMeta } from './page-meta.js';
import type { Route } from './router.js';

/* The colophon's four columns. Taken from `PageMeta` rather than re-declared,
   so a fifth group added there is a compile error here instead of a column with
   no mark beside it. */
type Group = PageMeta['group'];

/* ==========================================================================
 * THE ROUTE MARKS
 * ======================================================================= */

export const ROUTE_GLYPH: Readonly<Record<Route, LucideIcon>> = {
  '/': SquareStack,            /* the answer — levels stacked to a governing figure */
  '/parking': LayoutGrid,      /* bays in a grid */
  '/exports': FileDown,        /* the files that come out */
  '/refusals': CircleSlash,    /* the one shape this product's argument turns on */
  '/app': ScanLine,            /* reading the sheet, which is where a run starts */
  '/work': FolderOpen,         /* the runs this account authored */
  '/sign-in': KeyRound,
  '/sign-up': UserPlus,
  '/settings': Settings2,
  '/workspace': Users,
  '/accept-invite': Mail,
  '/readiness': Gauge,         /* what is not ready, read off a dial */
};

/* ==========================================================================
 * THE GROUP MARKS — the colophon's four columns
 * ======================================================================= */

export const GROUP_GLYPH: Readonly<Record<Group, LucideIcon>> = {
  claim: CircleSlash,
  product: Boxes,
  method: SlidersHorizontal,
  reference: BookOpen,
};

/* ==========================================================================
 * THE FRAME
 * ======================================================================= */

/**
 * One renderer for every mark on the site.
 *
 * `currentColor` and nothing else: a mark takes the ink of the text it sits
 * beside, so it follows the theme, the hover and the inverted band without a
 * rule of its own — and an SVG with no ink declared falls back to black.
 *
 * The prop is still called `glyph` and every call site is unchanged; it now
 * carries a COMPONENT rather than a fragment of paths, which is what lets the
 * set be installed instead of maintained.
 */
export function Icon({
  glyph: Glyph,
  className,
  size = 16,
}: {
  readonly glyph: LucideIcon;
  readonly className?: string | undefined;
  readonly size?: number;
}): JSX.Element {
  return (
    <Glyph
      {...(className === undefined ? {} : { className })}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    />
  );
}

