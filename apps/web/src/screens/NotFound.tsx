/**
 * The 404 — rendered at whatever address the visitor asked for.
 *
 * A route renders *at* a URL; this renders *instead of* one, which is why
 * `NOT_FOUND` is a sentinel in `router.tsx` rather than a member of `ROUTES`, and
 * why the address bar keeps whatever was typed. Before the sentinel existed an
 * unknown path rendered `/` under the wrong URL. On a product whose whole
 * proposition is that nothing is quietly substituted, quietly substituting a page
 * is the one bug the router may not have.
 *
 * ---
 *
 * THE PATH ECHO, AND WHY "ESCAPED" WAS NOT ENOUGH.
 *
 * React escapes what it interpolates, so markup inside a path cannot become markup
 * on the page. That closes injection and leaves the larger hole open: escaping
 * stops markup, it does not stop WORDS. `/we-are-fully-compliant-and-certified`
 * would render that sentence on a TOP.ai-branded page, in the house voice, in the
 * reader's eyeline — a compliance claim typed by an address bar and published by
 * us. Four constraints, and the fourth is the one that does the work:
 *
 *   (a) only `location.pathname` is echoed. Never the query, never the hash: they
 *       are not the address that missed, and they are the longest and least
 *       controlled part of a URL.
 *   (b) the echo is capped, ellipsis included, so a chip cannot become a paragraph.
 *   (c) every character outside `[A-Za-z0-9/._-]` becomes `·`, so a path cannot
 *       reintroduce whitespace, quotation or punctuation and set itself as prose.
 *   (d) it is a SPECIMEN and not a sentence — mono, on `--surface-inset`, inside a
 *       `<code>` chip, with slashed zeros. A mono string on its own ground cannot
 *       be read as the page speaking, and that is the whole defence, because (a) to
 *       (c) leave the words legible and are meant to: the reader asked for this
 *       address, and showing it is not the same as adopting it.
 *
 * THE RESIDUE, WRITTEN DOWN RATHER THAN DISCOVERED. `-` survives (c) and is a word
 * boundary, so a single word out of `prohibitions.ts`'s banned sets still reaches
 * the page inside a path — `/regulator-approved` is the sharpest case, and a path
 * long enough to push the negating label out of that module's sixty-character
 * window would carry an unnegated one. The alternative is a page that silently
 * rewrites the address it was asked for, which is this page's own failure committed
 * one level down. So the treatment is the answer, the label immediately before the
 * chip denies it, and `not-found.test.tsx` renders the hostile set and asserts what
 * actually holds rather than what would be comfortable.
 *
 * ---
 *
 * THE STATUS CODE. A static host with a single-page fallback serves this shell for
 * every address and answers 200, so a page reading "nothing has been substituted
 * for it" can arrive under a header saying a page was found — a quieter version of
 * the defect it exists to fix, and an invitation to index every mistyped address as
 * a real page. The half that can be closed here is closed here: the render adds
 * `<meta name="robots" content="noindex">` and removes it again on unmount. The
 * other half is the host's fallback status, it belongs to whoever deploys this
 * build, and where it cannot be set the page is honest in its body and wrong in its
 * header. That is said on the page as well as in this comment — a residue a reader
 * cannot see is one nobody owns.
 */

import { useEffect } from 'react';

import { AR } from '../i18n/notFound.ar.js';
import { EN } from '../i18n/notFound.en.js';
/*
  `useT` AS WELL AS `useDict`, AND THE SECOND ONE IS NOT A CONVENIENCE.

  Two things on this page are the CHROME'S words and not this page's: the four
  column headings of the site list, and the label of every link in it. The colophon
  renders both from `chrome`'s dictionary, and a site list that named its groups or
  its pages differently from the footer would be two site maps — four, across two
  languages. `useDict` carries what this page says; `useT` carries what the site
  calls its own pages.

  Nothing on the import path reaches a screen: `i18n/locale.js` imports the two
  chrome dictionaries, which reach `content/shared.js`, `routes.json` and a
  TYPE-ONLY `router.js`. The cycle `page-meta.ts` exists to have broken stays broken.
*/
import { Figure } from '../img.js';
import { useDict, useT, Verbatim } from '../i18n/locale.js';
import type { PageProps } from '../Root.js';
/*
  THE METADATA, NOT `pages.tsx`. This module used to import `PAGES`, which
  `pages.tsx` builds while importing this file — a cycle that was safe only one way,
  so nothing at module scope here was allowed to touch the binding and the group list
  had to be assembled at render time. `page-meta.ts` holds the same record without
  the components and imports no screen, so the cycle is gone and the `Route` typing
  that makes an invented page a compile error — the trade this page is least able to
  afford — is intact.
*/
import { PAGE_META, type PageMeta } from '../page-meta.js';
import { Link, ROUTES, type Route } from '../router.js';

/* -------------------------------------------------------------------------
 * The echo
 * ---------------------------------------------------------------------- */

/** The cap on the echoed path, the ellipsis counted inside it. */
const ECHO_MAX = 80;

/**
 * Everything a path may keep. Everything else is REPLACED and never dropped: a
 * dropped character makes the echo shorter than the address and quietly wrong about
 * what was asked for, which is the same class of substitution this page refuses.
 */
const OUTSIDE_SPECIMEN = /[^A-Za-z0-9/._-]/g;

/**
 * The address, as a specimen.
 *
 * `·` and `…` are themselves outside the permitted set. They are added after the
 * pass, deliberately, and they are the only two characters on the chip that the
 * visitor did not type — which is why they are visibly not letters.
 */
export function specimenPath(pathname: string): string {
  const replaced = pathname.replace(OUTSIDE_SPECIMEN, '·');
  return replaced.length > ECHO_MAX ? `${replaced.slice(0, ECHO_MAX - 1)}…` : replaced;
}

/**
 * The path this render was asked for, and nothing else about the URL.
 *
 * `typeof window` rather than a bare read: this component is rendered to static
 * markup under `environment: 'node'`, where there is no location at all. A missing
 * address is the empty case — the chip is omitted and the sentence stands alone —
 * and never a crash on the page that exists to handle a bad address.
 */
export function requestedPath(): string {
  return typeof window === 'undefined' ? '' : window.location.pathname;
}

/* -------------------------------------------------------------------------
 * The site list
 * ---------------------------------------------------------------------- */

/**
 * The order of the columns. The HEADINGS are no longer here, and their departure is
 * the repair this page was owed.
 *
 * They were copied into this file as the ONE duplication on the page, because
 * `SiteChrome.tsx`'s constants were not exported and that file is the chrome's to
 * edit. They are in `chrome.en.ts` now — `t.colophon.groups`, which the colophon
 * itself renders — so the site list and the footer read one record instead of
 * agreeing by hand, and the Arabic pair cannot drift apart the way two English
 * copies could not be stopped from drifting.
 *
 * The ORDER stays, because it is structure rather than copy: *what it does not
 * claim* is first, here as in the colophon. A conventional site puts the product
 * column in that slot.
 */
const GROUP_ORDER: readonly PageMeta['group'][] = ['claim', 'product', 'method', 'reference'];

/**
 * The three worth arriving at instead. Typed as `Route`, so a page that is not in
 * this build cannot be linked to: an invented page is the one failure this site
 * cannot survive, and this is the page whose own site list would be the lie.
 */
const INSTEAD: readonly Route[] = ['/', '/parking', '/refusals'];

/**
 * The site list, at module scope now that reading the record here is no longer a
 * cycle. An EMPTY COLUMN IS OMITTED rather than rendered as a heading over nothing,
 * exactly as the colophon does it: `method` has no members until the pages in it are
 * built, and a heading over no links is a promise with a date attached.
 */
const GROUPS: readonly { readonly group: PageMeta['group']; readonly members: readonly Route[] }[] =
  GROUP_ORDER.map((group) => ({
    group,
    members: ROUTES.filter((r) => PAGE_META[r].group === group),
  })).filter((g) => g.members.length > 0);

/* -------------------------------------------------------------------------
 * The page
 * ---------------------------------------------------------------------- */

export default function NotFound({ navigate }: PageProps): JSX.Element {
  const t = useDict(EN, AR);
  const chrome = useT();

  /*
    NOINDEX WHILE THIS PAGE IS MOUNTED, AND NOT A CHARACTER LONGER.

    The removal is the half that is easy to forget and expensive to forget: this is
    a single-page application, so a meta left in the head survives a client-side
    navigation and would mark every real page noindex from the moment one visitor
    mistyped one address.
  */
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'robots');
    meta.setAttribute('content', 'noindex');
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const echo = specimenPath(requestedPath());

  return (
    <div className="nf">
      <section className="shell section section--opening figured">
        <div className="figured__text">
          <h1 className="nf__title">{t.hero.title}</h1>
          <p className="nf__lede">{t.hero.lede}</p>

          {echo ? (
            /*
              THE LABEL IS PART OF THE TREATMENT AND NOT A CAPTION. It denies the
              address immediately before the address is shown, so the words on the chip
              arrive already refused. It is also what keeps the hostile render inside
              `prohibitions.ts`'s negation window — see the residue note at the top of
              this file for the case where that is not enough.
            */
            <p className="nf__echo">
              <span className="nf__echo-label">{t.hero.echoLabel}</span>
              <code className="nf__path">{echo}</code>
            </p>
          ) : null}

          <p className="nf__note">{t.hero.note}</p>
          {echo ? <p className="nf__note nf__note--fine">{t.hero.specimen}</p> : null}
        </div>
        {/* The sheet index with one position empty — `image-prompts.md` #23.
            It is described, not decorative: a 404 that says "not here" in words
            and shows a gap in a grid is saying it twice, and the second way is
            the one a reader who cannot read the page still gets. */}
        <Figure name="state-not-here" className="figured__figure" />
      </section>

      <section className="shell section reveal">
        <div className="section__head">
          <h2>{t.index.title}</h2>
          <p className="nf__lede nf__lede--sub">{t.index.lede}</p>
        </div>
        <div className="section__body">
          <div className="nf__map">
            {GROUPS.map(({ group, members }) => (
              <div className="nf__group" key={group}>
                <h3>{chrome.colophon.groups[group]}</h3>
                <ul>
                  {members.map((r) => (
                    <li key={r}>
                      <Link to={r} navigate={navigate}>
                        {chrome.routes[r].footerLabel}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell section section--minor reveal">
        <div className="section__head">
          <h2>{t.instead.title}</h2>
        </div>
        <div className="section__body">
          <ul className="nf__ways">
            {INSTEAD.map((r) => (
              <li key={r}>
                <Link to={r} navigate={navigate}>
                  {chrome.routes[r].footerLabel}
                </Link>
              </li>
            ))}
          </ul>

          {/* R5: the page ends on a limit rather than on a call to action, and the
              limit is this page's own.

              `200` IS RENDERED HERE AND IS IN NEITHER DICTIONARY. It is a protocol
              constant, in the class the glossary keeps verbatim beside `G4` and
              `INV-15`, and re-typing it into an Arabic sentence would make it a
              figure with no provenance in a file nothing checks. `Verbatim` is also
              what stops it moving: a Latin numeral run against an Arabic comma is
              reordered at its boundary by the bidirectional algorithm unless it is
              isolated, and `200،` with its comma at the wrong end is a status code a
              reader cannot check. On the English page the span is `lang="en"` inside
              `lang="en"` and changes nothing a reader sees. */}
          <p className="nf__residue">
            <strong>{t.instead.residue.headline}</strong>
            {t.instead.residue.beforeStatus}
            <Verbatim>200</Verbatim>
            {t.instead.residue.afterStatus}
          </p>
        </div>
      </section>
    </div>
  );
}
