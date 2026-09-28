/**
 * The contents of a long page, at the head of it.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS: FIVE PAGES BETWEEN SEVEN AND FOURTEEN SCREENS TALL.
 *
 *   /parking    13.7 screens, 9 sections
 *   /refusals   13.0 screens
 *   /exports     8.5 screens
 *   /            7.7 screens, 5 sections
 *   /readiness   7.1 screens, 7 sections
 *
 * Each already carries `01 / 07` in its rail gutter, so a reader eleven screens
 * down knows the ordinal of the thing in front of them — and has no way to learn
 * what the other six are, or to reach one. The numerator without the list is the
 * half of the information that is no use on its own.
 *
 * These pages are arguments, and the honest thing to show a reader before asking
 * for fourteen screens of attention is the outline of the argument. That is also
 * the thing a sceptical reader wants first: `/refusals` is where somebody goes
 * looking for the overclaim, and making them scroll for it reads as burying it.
 *
 * ---------------------------------------------------------------------------
 * IT IS A LIST AT THE TOP, NOT A RAIL BESIDE THE PAGE.
 *
 * A sticky rail was the first design and the geometry refuses it: `--page-max` is
 * 78rem, so at 1440px there are 96px of gutter on each side and a legible rail
 * needs 216px. It would have fitted only above ~1760px — a rail that appears on
 * one reader's monitor and not another's, which is worse than no rail, because
 * the two readers cannot describe the page to each other.
 *
 * A second sticky bar under the masthead was the other candidate. The masthead
 * already carries `REGULATORY VALIDITY — NOT ASSESSED`, which is the one line on
 * this site that may never be crowded, and a second band under it would compete
 * with exactly that. A list at the top costs it nothing.
 *
 * ---------------------------------------------------------------------------
 * THE LABELS ARE THE HEADINGS, PASSED AS DATA.
 *
 * `entries` carries the same dictionary strings the `<h2>`s render, so a heading
 * and its contents line cannot say different things. They are NOT read out of the
 * DOM: a contents block assembled after paint is empty in a static render, empty
 * in the screenshot a design review reads, and empty on paper — and every test in
 * `apps/web/test` renders these pages with `renderToStaticMarkup`, which runs no
 * effects at all. The drift this guards against is real but it is cheaper to
 * catch with a test than to buy with an empty element.
 *
 * `href` targets the `id` already on each `<h2>` — the one `aria-labelledby`
 * names — so this adds no new identifiers and cannot point at a section that has
 * been renamed out from under it.
 *
 * ---------------------------------------------------------------------------
 * NO ACTIVE STATE, AND THAT IS A DECISION.
 *
 * Marking the section the reader is in needs an IntersectionObserver, and this
 * block has scrolled out of sight by the time the answer would differ from "the
 * first one". Spending an observer, a state hook and a re-render per scroll on a
 * distinction nobody can see is the kind of thing that ships because it sounds
 * modern. The workspace rail and the flow rail both mark their current item,
 * because both are on screen while it changes.
 */

import { useT } from '../i18n/locale.js';

export type ContentsEntry = {
  /** The `id` of the section's own heading — already there for `aria-labelledby`. */
  readonly id: string;
  /** The heading's text, from the same dictionary key the heading reads. */
  readonly label: string;
};

export function PageContents({
  entries,
}: {
  readonly entries: readonly ContentsEntry[];
}): JSX.Element | null {
  const t = useT();
  // A page with one section has no contents worth printing. Not a guard against a
  // bug — `/work` and `/settings` are short by design and may one day call this.
  if (entries.length < 2) return null;
  return (
    <nav className="contents shell" aria-labelledby="contents-title">
      <h2 className="contents__title" id="contents-title">
        {t.contents.title}
      </h2>
      <ol className="contents__list">
        {entries.map((e, i) => (
          <li key={e.id} className="contents__item">
            <a className="contents__link" href={`#${e.id}`}>
              {/*
                The numeral is `aria-hidden`: an ordered list is already announced
                with its ordinals, so reading it would give "one, zero one, …".
                It is inside the link rather than beside it so the whole row is one
                target — a 44px row is a comfortable hit, a 14px numeral is not.
              */}
              <span className="contents__num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="contents__label">{e.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
