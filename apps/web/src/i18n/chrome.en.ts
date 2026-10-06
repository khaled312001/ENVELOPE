/**
 * THE CHROME DICTIONARY, AND THE TYPE EVERY OTHER LOCALE IS HELD TO.
 *
 * `export type ChromeDictionary = typeof EN` — so the English module IS the
 * contract. `chrome.ar.ts` declares `const AR: ChromeDictionary`, and a missing key,
 * a misspelled key or a key nobody removed from one side is a COMPILE ERROR rather
 * than a string that silently renders in the wrong language.
 *
 * That choice is the same one `packages/invariants` makes about its dependencies:
 * the guarantee is structural, not a convention someone has to remember. A
 * translation layer that falls back to English on a missing key is the i18n
 * equivalent of a hidden default — it produces a page that looks finished, in two
 * languages at once, and nothing anywhere reports it.
 *
 * NOTE THE ABSENCE OF `as const`. With it, every value would widen to its own string
 * literal type and the Arabic module could not satisfy the contract without
 * repeating the English text. Without it the values are `string` and the shape is
 * what is enforced, which is exactly the intent.
 *
 * ONE MODULE PER SCREEN, not one file per language. `parking.ar.ts` and
 * `refusals.ar.ts` are separate files because the screens are separately
 * translatable and separately reviewable — a single `ar.ts` would be a file that
 * every translation pass has to edit at once.
 */

/* IMPORTED, NOT RESTATED. `content/shared.tsx` is the single source of the
   permanent sentence and a test asserts every route emits it; a second English copy
   here would be the exact duplication that module exists to prevent. Only the
   Arabic is new. */
import { DISCLAIMER } from '../content/shared.js';
import ROUTE_DATA from '../routes.json' with { type: 'json' };
import type { Route } from '../router.js';

/** The routes, typed, so a new page cannot be added without a label in both locales. */
export type RouteKey = Route;

const ROUTE_KEYS = ROUTE_DATA.map((r) => r.path) as readonly RouteKey[];

export const EN = {
  /** The endonym of the OTHER language — what the switch offers, in its own script. */
  switchTo: 'العربية',
  /**
   * The accessible name of the switch. It says the target language in English
   * because the control is read in the page's current language, and it names the
   * direction change because that is the largest thing the button does.
   */
  switchToLabel: 'Switch the site to Arabic, right to left',

  skipTo: (page: string): string => `Skip to ${page.toLowerCase()}`,
  navLabel: 'Site',
  sections: 'Sections',
  close: 'Close',
  runAPlot: 'Run a plot',

  /**
   * THE NAV'S ONE ACTION, AND IT CHANGES WITH WHO IS READING.
   *
   * It used to be "Run a plot" in both states, which is the CTA a marketing site
   * puts there and the wrong one here: the engine is not what somebody who has
   * already signed in comes back for, and somebody who has not is being offered
   * work before an account. «غير الهيدر ويكون زر دخول بدل زر البلوت» — 6 Oct 2026.
   *
   * Signed out it is the door. Signed in it is the name and the way out, and the
   * action moves to `/work`, where the list it acts on is.
   *
   * `signOut` is a VERB AND AN OBJECT, not "Change". The engine's own header
   * called it that, and "Change" beside a name reads as "edit this name".
   */
  account: {
    signIn: 'Sign in',
    yourWork: 'Your work',
    signOut: 'Sign out',
    /** Names the chip for a screen reader: the name alone is not a destination. */
    whoLabel: (name: string): string => `Signed in as ${name} — open your work`,
  },

  /**
   * THE THEME CONTROL'S ONLY WORDS, and they were the last English left in the nav.
   *
   * The visible glyph is `◐`, so this span is the whole accessible name of the
   * control — which means that on the Arabic page a screen reader announced the
   * language switch in Arabic and the button beside it in English. A label that is
   * only read by the readers who cannot see the icon is exactly the label that gets
   * left behind in a translation, and nothing in the markup looks wrong.
   */
  themeToggle: {
    toDark: 'Switch to the dark theme',
    toLight: 'Switch to the light theme',
  },

  /**
   * THE WORKSPACE RAIL.
   *
   * `label` is its landmark name and is deliberately not "Navigation": the page
   * already has one nav called "Site", and two landmarks with the same name is a
   * screen reader listing two identical entries and no way to tell them apart.
   *
   * `guest` is the short form of a refusal `/refusals` carries in full. A rail that
   * looked the same signed in and signed out would be the one element on this site
   * that hid which of the two you are — and the difference is not cosmetic: a
   * guest's runs live behind a key in one browser and are lost when it is cleared.
   */
  /*
   * THE CONTENTS OF A LONG PAGE. Shared, because five pages carry one — and a
   * heading each page wrote for itself would be five wordings for one thing.
   *
   * "On this page" rather than "Contents": the reader is already on the page, and
   * the phrase says what the list covers AND what it does not, which "Contents"
   * at the top of a site leaves open.
   */
  contents: {
    title: 'On this page',
  },

  rail: {
    label: 'Your workspace',
    heading: 'Workspace',
    signedInAs: 'Signed in as',
    /* Where new plots and runs are being filed. A run keeps the workspace it was
       computed in, so this is consequential on every step and the rail says it on
       every page rather than only on the page that changes it. */
    filingUnder: 'Filing work under',
    personal: 'On my own',
    /* The accessible name of the collapse control, which CHANGES with the state:
       a name that stayed the same would leave a screen-reader user to infer the
       direction from `aria-expanded` alone. */
    collapse: 'Collapse the workspace rail',
    expand: 'Expand the workspace rail',
    guest: 'You are working as a guest. This browser holds the key to these runs; clearing it loses them, and no other device can reach them.',
  },

  masthead: {
    validity: 'REGULATORY VALIDITY — NOT ASSESSED',
    rulesApproved: 'Rules approved',
    definitionsSigned: 'Definitions signed',
  },

  colophon: {
    groups: {
      claim: 'What it does not claim',
      product: 'The product',
      method: 'How to check it',
      reference: 'This deployment',
    },
    engineVersion: 'Engine',
    annexVersion: 'definitions annex',
    unreported: 'unreported',
    unsigned: 'unsigned',
    /*
      THE SCOPE OF THE READINESS PAGE, said in the footer of every page.

      It was the one hand-typed sentence left in the colophon, so it rendered in
      English under an Arabic footer — and, because it is a Latin run in an RTL
      block with nothing isolating it, its full stop migrated to the head of the
      wrapped line: `.availability`. A sentence whose own punctuation has moved is
      not a sentence a reader trusts, and this one is a scope limit.
    */
    readinessNote: 'Readiness, not uptime — nothing here monitors availability.',
  },

  /**
   * THE PERMANENT SENTENCE, in three parts because the middle one is emphasised and
   * a single string would put the emphasis inside the translation's control.
   * `content/shared.tsx` holds the argument for why it exists once and only once.
   */
  /*
    WIDENED HERE, NOT THERE.

    `DISCLAIMER` is `as const` in `content/shared.tsx` and that is right where it
    lives — the literal types are what let a test assert the exact sentence. But a
    literal type propagates into `ChromeDictionary`, and the contract would then
    demand that the ARABIC disclaimer be the English string, character for
    character. The three casts keep the strictness where it does work and drop it
    where it would make the translation impossible.
  */
  disclaimer: {
    lead: DISCLAIMER.lead as string,
    emphasis: DISCLAIMER.emphasis as string,
    body: DISCLAIMER.body as string,
  },

  /**
   * WHAT THE ENGINE SAID, MARKED AS SUCH.
   *
   * Rendered beside any surface that shows an engine string verbatim on a
   * non-English page. It is not an apology for an incomplete translation — the
   * engine emits one language by design, because a basis string is a signed record
   * and a translated record is a second record. `docs/05-design/arabic-glossary.md`
   * carries the argument.
   */
  verbatimNotice:
    'Values the engine produced — a basis, a formula, a rule reference — are shown as it emitted them.',

  /**
   * The state of the translation itself, said on the page rather than discovered.
   * A page whose body has not been translated says so, in the language the reader
   * asked for, instead of presenting English prose under an Arabic frame as though
   * that were the finished design.
   */
  untranslated: {
    title: 'This page is not translated yet',
    body: 'Its frame is in Arabic and its text is still in English. The engine and every figure work identically in both.',
  },

  /** The governing text, said once, in the colophon. */
  governingLanguage: '',

  /**
   * Route titles, descriptions and both labels. `routes.json` carries the English
   * ones and is read by the router, `smoke.mjs` and `shoot.mjs`; this mirrors them
   * so a locale can override every one without a second route table.
   */
  routes: Object.fromEntries(
    ROUTE_DATA.map((r) => [
      r.path,
      {
        title: r.title,
        description: r.description,
        navLabel: r.navLabel,
        footerLabel: r.footerLabel,
      },
    ]),
  ) as Record<
    RouteKey,
    {
      readonly title: string;
      readonly description: string;
      readonly navLabel: string | null;
      readonly footerLabel: string;
    }
  >,

  notFound: {
    title: 'Not found — TOP.ai',
    footerLabel: 'Not found',
  },
};

export type ChromeDictionary = typeof EN;

export { ROUTE_KEYS };
