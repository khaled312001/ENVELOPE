/**
 * The 404 — its copy, in English, lifted out of the JSX unchanged.
 *
 * `export type NotFoundDictionary = typeof EN`, so this module IS the contract and
 * `notFound.ar.ts` is held to it: a missing Arabic key, a misspelled one or a key
 * nobody removed from either side is a COMPILE ERROR rather than a sentence that
 * silently renders in the wrong language. NOTE THE ABSENCE OF `as const` — with it
 * every value would narrow to its own literal and the Arabic could satisfy the
 * shape only by repeating the English.
 *
 * ---------------------------------------------------------------------------
 * THE THREE THINGS THAT ARE NOT IN HERE, AND WHY EACH ABSENCE IS THE POINT.
 *
 * 1. NO ADDRESS. The echoed path is the VISITOR'S string, not this page's, and it
 *    reaches the markup through `specimenPath` and nothing else. A dictionary that
 *    could hold it would be a second place an address could be written from, on
 *    the one page whose whole argument is that nothing is quietly substituted.
 *
 * 2. NO FIGURE. Not a count, not a ratio, not a status code. `200` stays in the
 *    component — it is a protocol constant, in the class the glossary keeps
 *    verbatim beside `G4` and `INV-15` — which is why the residue paragraph is
 *    split into the part BEFORE it and the part AFTER it. English puts the code
 *    mid-sentence and so does Arabic, but not at the same word, and neither
 *    language may re-type it. A digit in a dictionary is a number with no
 *    provenance.
 *
 * 3. NO GROUP LABEL AND NO LINK TEXT. The site list's column headings and every
 *    link on this page read `chrome`'s `colophon.groups` and `routes[…]
 *    .footerLabel`, which is what the colophon itself reads. This module used to
 *    carry its own copy of the four headings, declared in `NotFound.tsx` as the one
 *    duplication on the page and kept only because `SiteChrome`'s constants were
 *    not exported. They are in the dictionary now, so the duplication is gone
 *    rather than translated — a site list that names its groups differently from
 *    the footer is two site maps, and two site maps in two languages is four.
 *
 * ---------------------------------------------------------------------------
 * WHY `residue.beforeStatus` CARRIES A LEADING SPACE. It follows a `<strong>` in
 * the same paragraph, and the space is the one between the two in the sentence.
 * Keeping it in the string is what makes this render byte-identical to the JSX it
 * was lifted out of.
 */

export const EN = {
  /** The statement, the echo and the two notes under it. */
  hero: {
    title: 'That page is not here',
    lede: 'There is no page at this address, and nothing has been substituted for it.',

    /**
     * NOT A CAPTION. It denies the address immediately before the address is shown,
     * so the words on the chip arrive already refused — see `NotFound.tsx`'s residue
     * note for the case where that is not enough. It renders with no space between
     * it and the chip, and `not-found.test.tsx` asserts exactly that adjacency.
     */
    echoLabel: 'No page at',

    note:
      'A system that quietly serves a different answer from the one it was asked for ' +
      'is the failure this whole product is about. So the address bar still reads ' +
      'what you asked for, the home page has not been served in its place, and the ' +
      'miss is stated.',

    /** Why the chip is set the way it is, said on the page and not only in the source. */
    specimen:
      'The address above is set as a specimen rather than as a sentence: mono, on ' +
      'its own ground, with every character outside a narrow set replaced by a dot ' +
      'and a long address cut short. What an address says is whatever was typed ' +
      'into it, and showing it is not the same as saying it.',
  },

  /** Every page in this build, generated from the route record rather than listed. */
  index: {
    title: 'Every page on this site',
    lede:
      'Generated from the same route record the nav and the colophon read, so a ' +
      'page cannot exist and be missing from this list, and a link here cannot ' +
      'reach a page this build does not have.',
  },

  instead: {
    title: 'Where to go instead',

    /**
     * The page ends on a limit rather than on a call to action, and the limit is
     * this page's own. `beforeStatus` and `afterStatus` are the halves of one
     * sentence with the status code between them.
     */
    residue: {
      headline: 'The header can still be wrong while the body is right.',
      beforeStatus:
        ' A static host with a single-page fallback serves this shell for every address ' +
        'and answers ',
      afterStatus:
        ', so a page saying nothing was substituted can arrive under a ' +
        'header saying a page was found. This render asks a search engine not to ' +
        'collect the address, which is the half that closes from inside the page. The ' +
        'status itself is fallback configuration, and it belongs to whoever deploys ' +
        'this build.',
    },
  },
};

export type NotFoundDictionary = typeof EN;
