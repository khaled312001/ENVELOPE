/**
 * `/sign-in` and `/sign-up`, rendered.
 *
 * ---------------------------------------------------------------------------
 * A SIGN-UP SCREEN IS WHERE A PRODUCT PROMISES.
 *
 * It is the last surface before somebody commits, every convention in the
 * category fills it with reassurance, and it is read by people who have not yet
 * seen a single output. On this product that makes it the highest-risk page on
 * the site: an account changes exactly two things — the run is kept, and what was
 * typed is saved as it was typed — and it reviews, verifies, approves and
 * certifies nothing.
 *
 * So the refusal is asserted PRESENT, in both languages, on both routes. The
 * site-wide prohibitions would pass on a page that had simply deleted it.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR SCREENS THAT ARE NOT HERE.
 *
 * §6.2 specifies six auth screens; four need a mailer, a token store or tenancy,
 * and none of the three exists. §6.4's rule — *no screen ships before the server
 * enforces what it displays* — is why they are absent, and the test below asserts
 * the ABSENCE: a "Forgot your password?" link would be a link to a form that
 * cannot work, and a greyed one would be a promise with no date attached.
 *
 * What ships instead is a sentence saying there is no reset and why, which is
 * asserted present for the same reason the refusal is.
 */

import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { StaticLocale } from '../src/i18n/locale.js';
import { SignIn, SignUp } from '../src/screens/Auth.js';
import {
  arabicReadingText,
  BANNED_IN_HAND_WRITTEN_COPY,
  expectNoEnglishProse,
  expectSitewideProhibitions,
  pageProps,
  stripTags,
} from './prohibitions.js';

const stripped = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const SOURCE = readFileSync(new URL('../src/screens/Auth.tsx', import.meta.url), 'utf8');
const DICT = stripped('../src/i18n/auth.en.ts');
const DICT_AR = stripped('../src/i18n/auth.ar.ts');

const signIn = (search = ''): string =>
  renderToStaticMarkup(<SignIn {...pageProps({ search })} />);
const signUp = (search = ''): string =>
  renderToStaticMarkup(<SignUp {...pageProps({ search })} />);
const arabic = (): string =>
  renderToStaticMarkup(
    <StaticLocale locale="ar">
      <SignUp {...pageProps()} />
    </StaticLocale>,
  );

const text = (markup: string): string => stripTags(markup).replace(/\s+/g, ' ');

describe('/sign-in and /sign-up', () => {
  it('carry the site-wide prohibitions', () => {
    expectSitewideProhibitions(signIn(), '/sign-in');
    expectSitewideProhibitions(signUp(), '/sign-up');
  });

  it('use none of the hand-written apology vocabulary', () => {
    for (const banned of BANNED_IN_HAND_WRITTEN_COPY) {
      expect(DICT, `auth.en.ts matched ${banned}`).not.toMatch(banned);
      expect(SOURCE, `Auth.tsx matched ${banned}`).not.toMatch(banned);
    }
  });

  /* ------------------------------------------------------------------------
   * WHAT AN ACCOUNT IS NOT — the sentence the category deletes.
   * --------------------------------------------------------------------- */

  it('says on both routes that an account reviews and approves nothing', () => {
    for (const [label, markup] of [
      ['/sign-in', signIn()],
      ['/sign-up', signUp()],
    ] as const) {
      const t = text(markup);
      expect(t, `${label} dropped the refusal`).toMatch(
        /does not make a run reviewed, verified, approved or compliant/i,
      );
      expect(t, `${label} dropped the validity sentence`).toMatch(
        /regulatory validity is never assessed/i,
      );
    }
  });

  it('says it in Arabic too', () => {
    const t = arabicReadingText(arabic());
    expect(t).toContain('ولا يجعل تشغيلةً مُراجَعةً');
    expect(t).toContain('لا تُقيَّم إطلاقًا');
    // «الرخصة», never «الترخيص» — that word is TRAKHEES, and using the
    // authority's name for the field would read as though the number had been
    // checked with them.
    expect(DICT_AR).not.toMatch(/الترخيص/);
  });

  it('discloses on the sign-up form that the licence is never verified', () => {
    // In the place the assertion is first made, which is the only place it is any
    // use. A field that takes a licence number and says nothing teaches a reader
    // that something checked it.
    const t = text(signUp());
    expect(t).toMatch(/never verified/i);
    expect(t).toMatch(/no registry is connected/i);
    expect(arabicReadingText(arabic())).toContain('ولا يُتحقَّق منه إطلاقًا');
  });

  /* ------------------------------------------------------------------------
   * §6.4 — NO SCREEN BEFORE THE SERVER ENFORCES IT.
   * --------------------------------------------------------------------- */

  it('offers no route this deployment cannot serve', () => {
    const markup = signIn() + signUp();
    for (const absent of ['/forgot-password', '/reset-password', '/verify-email', '/accept-invite']) {
      expect(markup, `the auth screens link to ${absent}, which does not exist`).not.toContain(
        `href="${absent}"`,
      );
    }
    // And no social button: it would send every client's address to a third
    // party for no gain, which §6.2 refuses by name.
    expect(text(markup).toLowerCase()).not.toMatch(/sign in with (google|apple|microsoft|github)/);
  });

  it('says there is no password reset, rather than leaving the link out in silence', () => {
    // A reader who cannot sign in looks for a link. Its absence with no
    // explanation reads as a bug; with a sentence it reads as a deployment that
    // has not connected a mailer, which is what it is.
    expect(text(signIn())).toMatch(/there is no password reset/i);
    expect(text(signIn())).toMatch(/sends no email/i);
  });

  /* ------------------------------------------------------------------------
   * THE FORM ITSELF.
   * --------------------------------------------------------------------- */

  it('gives the password reveal a name, not a glyph', () => {
    // Every icon-only reveal in the survey shipped with no accessible name. This
    // one is a word, and the word changes with the state.
    expect(text(signIn())).toMatch(/show the password/i);
    // And it is `type="button"`: a bare button inside a form submits it.
    expect(signIn()).toMatch(/<button type="button" class="auth__reveal"/);
  });

  it('has a live region in the document before there is anything to announce', () => {
    /*
      THE FAILURE THIS CATCHES IS SILENT AND UNIVERSAL.

      A live region that appears at the same moment its content does is not
      announced by most screen readers — the region has to exist first. Every
      test that only checks the error text is present passes on the broken
      version, which is why this asserts the EMPTY region on first render.
    */
    expect(signIn()).toMatch(/<div class="auth__live" aria-live="polite"/);
  });

  it('marks no field invalid before the reader has touched it', () => {
    // The same defect `/settings` had: an error announced on arrival, about a
    // form nobody has touched.
    expect(signUp()).not.toMatch(/aria-invalid="true"/);
    expect(text(signUp())).not.toMatch(/a run signed by nobody/i);
  });

  it('labels every input, and never with a placeholder', () => {
    const markup = signUp();
    const ids = [...markup.matchAll(/<label for="([^"]+)"/g)].map((m) => m[1]);
    const inputs = [...markup.matchAll(/<input[^>]*id="([^"]+)"/g)].map((m) => m[1]);
    expect(inputs.length).toBeGreaterThan(0);
    for (const id of inputs) {
      expect(ids, `input ${id} has no label`).toContain(id);
    }
    // A placeholder disappears the moment anyone types, which is when it is
    // needed. `voice-tone.md` refuses it as a label everywhere.
    expect(markup).not.toMatch(/<input[^>]*placeholder=/);
  });

  /* ------------------------------------------------------------------------
   * THE OPEN REDIRECT, which is the classic bug in exactly this parameter.
   * --------------------------------------------------------------------- */

  it('will not be talked into sending a reader off the site', () => {
    /*
      `?next=https://…` on a sign-in page is how a phishing link borrows a real
      domain's form. `safeNext` accepts a path beginning with a single `/` and
      nothing else — `//evil.example` is a protocol-relative URL and therefore
      another origin, which is the case a naive `startsWith('/')` lets through.

      Asserted over the SOURCE, because the redirect happens after a successful
      sign-in and a static render never reaches it.
    */
    expect(SOURCE).toContain("raw.startsWith('//')");
    expect(SOURCE).toMatch(/if \(!raw\.startsWith\('\/'\)/);
  });

  it('tells the reader they will be sent back, only when they will be', () => {
    expect(text(signIn('?next=/work'))).toMatch(/you will go back to where you were/i);
    expect(text(signIn())).not.toMatch(/you will go back to where you were/i);
  });

  /* ------------------------------------------------------------------------
   * THE ARABIC PAGE, AND THE IMAGE THAT IS NOT THERE.
   * --------------------------------------------------------------------- */

  it('leaves no English prose outside an isolated span', () => {
    expectNoEnglishProse(arabic(), '/sign-up in Arabic');
  });

  it('renders no image element while there is no image', () => {
    /*
      `src/assets/img/` is empty, and `Illustration` reads it with
      `import.meta.glob` — so a name with no file emits NO ELEMENT and makes no
      request. That matters beyond tidiness: a missing `<img>` paints the
      browser's broken-file glyph, and the request logs a console error that
      `pnpm smoke` counts as a failure on every route carrying one.
    */
    expect(signIn()).not.toContain('<img');
    // And the panel is still the same shape: the aside is the two paragraphs,
    // with the image behind them when it lands, rather than a column that
    // appears with the asset.
    expect(signIn()).toContain('auth__aside-body');
  });

  it('paints no amber', () => {
    const markup = signIn() + signUp();
    expect(markup).not.toMatch(/data-state=["']assumed["']/);
    expect(markup).not.toMatch(/traced--assumed/);
    expect(stripped('../src/screens/Auth.tsx')).not.toMatch(/uncertain|amber/i);
  });
});
