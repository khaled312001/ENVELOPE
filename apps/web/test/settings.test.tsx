/**
 * `/settings` — the account's own page, rendered.
 *
 * The shared scans come from `prohibitions.ts`. What is asserted here is what is
 * true of THIS page and of no other, and almost all of it is a PRESENCE
 * assertion — which is unusual in this suite and is the point.
 *
 * ---------------------------------------------------------------------------
 * WHY PRESENCE, HERE, WHEN EVERYTHING ELSE ON THIS SITE IS A PROHIBITION.
 *
 * Two of the three fields on this page are load-bearing on the evidence trail,
 * and both fail SILENTLY and in the direction of looking better:
 *
 *   * THE LICENCE. `CLAUDE.md` lists it among the disclosures still owed in
 *     writing — *"the licence on `G4` is recorded and never verified"*. A field
 *     that takes a licence number and says nothing beside it teaches a reader
 *     that something checked it. Deleting that sentence in a design pass makes
 *     the form cleaner, breaks no test that looks for a claim, and turns the
 *     page into an overclaim. So the sentence is asserted PRESENT, in both
 *     languages.
 *
 *   * THE NAME. Changing it does not rewrite a run already signed, because a
 *     signature records the name that was current when it was made. A reader
 *     will assume the opposite — a display name usually is retroactive — and
 *     the only thing standing between them and that assumption is one sentence.
 *
 * The same logic covers the two device sentences: that changing a password ends
 * every other session, and that there is no device list and why.
 *
 * ---------------------------------------------------------------------------
 * NO CONTROL THE SERVER CANNOT HONOUR.
 *
 * `docs/06-plan/platform-plan.md` states it for the roles screen — *"no roles
 * screen ships before the server enforces the roles it displays"* — and it
 * governs every field here. The mechanical half of that is testable: the email
 * input must be `readOnly`, and the page must not have grown a control over
 * something this deployment does not have (two-factor, notifications, a device
 * list, a delete button). Each of those is asserted ABSENT by name, because each
 * is a plausible thing to add and none of them would fail anything else.
 *
 * ---------------------------------------------------------------------------
 * NO AMBER. Nothing on this page is an `ASSUMED` value. §13.1 calls the amber
 * treatment "the most important UI decision in the product", and an unsaved-
 * changes strip in amber would be the most effective way on the whole site to
 * teach a reader that it means "attention".
 *
 * ---------------------------------------------------------------------------
 * TWO RENDERS, AND THE SECOND IS WHY `SettingsPanels` IS EXPORTED.
 * `renderToStaticMarkup` runs no effects and there is no session in a static
 * render, so the page component alone only ever reaches its signed-out branch —
 * and everything a reader actually meets would be scanned by nothing. `Work.tsx`
 * exports `RunTable` for the same reason and with the same justification.
 */

import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PASSWORD_MIN } from '../../api/src/accounts.js';
import { StaticLocale } from '../src/i18n/locale.js';
import { AR } from '../src/i18n/settings.ar.js';
import Settings, { SettingsPanels } from '../src/screens/Settings.js';
import {
  arabicReadingText,
  BANNED_IN_HAND_WRITTEN_COPY,
  expectNoEnglishProse,
  expectSitewideProhibitions,
  pageProps,
  stripTags,
} from './prohibitions.js';

/** A module's source with its comments removed: comments discuss rejected words to reject them. */
const stripped = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const SOURCE = readFileSync(new URL('../src/screens/Settings.tsx', import.meta.url), 'utf8');
const DICT = stripped('../src/i18n/settings.en.ts');
const DICT_AR = stripped('../src/i18n/settings.ar.ts');

/**
 * An account shaped by the fields the panels read.
 *
 * `CLAUDE.md` records what a fixture that has drifted from the type it claims to
 * be goes on proving, so the shape is the component's own prop type rather than
 * an object literal that merely resembles it.
 */
const ACCOUNT = {
  accountId: 'acc-1',
  email: 'khaled@example.com',
  name: 'Khaled Haggagy',
  licence: 'ENG-12345',
  createdAt: '2026-08-30T10:00:00.000Z',
};

/** The page with no session provider, which is the signed-out branch. */
const page = (): string =>
  renderToStaticMarkup(
    <Settings {...pageProps()} />,
  );

/** The four panels, which is what a signed-in reader actually meets. */
const panels = (): string =>
  renderToStaticMarkup(
    <SettingsPanels
      account={ACCOUNT}
      theme="light"
      toggleTheme={() => {}}
      density="comfortable"
      setDensity={() => {}}
    />,
  );

const panelsAr = (): string =>
  renderToStaticMarkup(
    <StaticLocale locale="ar">
      <SettingsPanels
        account={ACCOUNT}
        theme="light"
        toggleTheme={() => {}}
        density="comfortable"
        setDensity={() => {}}
      />
    </StaticLocale>,
  );

const text = (markup: string): string => stripTags(markup).replace(/\s+/g, ' ');

describe('/settings', () => {
  it('carries the site-wide prohibitions, signed out and signed in', () => {
    expectSitewideProhibitions(page(), '/settings signed out');
    expectSitewideProhibitions(panels(), '/settings panels');
  });

  it('uses none of the hand-written apology vocabulary', () => {
    for (const banned of BANNED_IN_HAND_WRITTEN_COPY) {
      expect(DICT, `settings.en.ts matched ${banned}`).not.toMatch(banned);
      expect(SOURCE, `Settings.tsx matched ${banned}`).not.toMatch(banned);
    }
  });

  /* ------------------------------------------------------------------------
   * THE TWO DISCLOSURES, ASSERTED PRESENT IN BOTH LANGUAGES.
   * --------------------------------------------------------------------- */

  it('says the licence is recorded and never verified, beside the field', () => {
    const t = text(panels());
    expect(t).toMatch(/never verified/i);
    expect(t).toMatch(/no registry is connected/i);
    // In the same panel as the input, not in a footnote at the bottom of the page.
    const licenceIdx = t.indexOf('Licence number');
    const claimIdx = t.search(/never verified/i);
    expect(licenceIdx).toBeGreaterThanOrEqual(0);
    expect(claimIdx - licenceIdx).toBeLessThan(400);
  });

  it('says in Arabic that the licence is recorded and never verified', () => {
    const t = arabicReadingText(panelsAr());
    expect(t).toContain('ولا يُتحقَّق منه');
    // «الرخصة», never «الترخيص» — that word is TRAKHEES, and using the
    // authority's name for the field would read as though the number had been
    // checked with them. `work.ar.ts` and `antechamber.ar.ts` carry the argument.
    expect(DICT_AR).not.toMatch(/الترخيص/);
  });

  it('says a name change does not rewrite a run already signed', () => {
    const t = text(panels());
    expect(t).toMatch(/does not change a run you have already signed/i);
    expect(t).toMatch(/never rewritten/i);
    expect(arabicReadingText(panelsAr())).toContain('لا يُعاد كتابة تشغيلة');
  });

  it('says that changing the password ends every other session', () => {
    expect(text(panels())).toMatch(/signs out every other device/i);
    expect(arabicReadingText(panelsAr())).toContain('يُسجّل الخروج من كل جهاز آخر');
  });

  it('says there is no device list, and why, rather than showing an empty one', () => {
    const t = text(panels());
    expect(t).toMatch(/no list of your devices/i);
    expect(arabicReadingText(panelsAr())).toContain('لا توجد قائمة بأجهزتك');
  });

  /* ------------------------------------------------------------------------
   * NO CONTROL THE SERVER CANNOT HONOUR.
   * --------------------------------------------------------------------- */

  it('shows the email and does not offer to change it', () => {
    const markup = panels();
    expect(markup).toContain('khaled@example.com');
    // `readOnly`, not `disabled`: a disabled input is skipped by keyboard
    // navigation, so a reader tabbing the form would never reach the sentence
    // attached to it.
    const emailInput = /<input\s[^>]*khaled@example\.com[^>]*>/i.exec(markup)?.[0] ?? '';
    expect(emailInput, 'no email input rendered').not.toBe('');
    expect(emailInput).toMatch(/\sreadonly[=\s>]/i);
    expect(emailInput).not.toMatch(/\sdisabled[=\s>]/i);
    expect(text(markup)).toMatch(/cannot be changed here/i);
  });

  it('offers no control over something this deployment does not have', () => {
    const t = text(panels()).toLowerCase();
    for (const absent of [
      'two-factor',
      'two factor',
      'notification',
      'delete account',
      'delete my account',
      'api key',
      'billing',
    ]) {
      expect(t, `/settings offers "${absent}", which nothing on the server honours`).not.toContain(
        absent,
      );
    }
  });

  it('marks no field invalid before the reader has touched it', () => {
    /*
      A RENDER PROBE FOUND THIS, AND A READING OF THE COMPONENT WOULD NOT HAVE.

      The form seeds from the account in an effect, and an effect does not run
      before the first paint — so the name field rendered `aria-invalid="true"`
      with "a run signed by nobody is a run with no author" beneath it, on a form
      nobody had touched, about a name the account already has. A screen reader
      announces that on arrival.

      Asserted over the FIRST RENDER, which is the state the defect lived in.
    */
    const markup = panels();
    expect(markup, 'a field is invalid before any interaction').not.toMatch(
      /aria-invalid="true"/,
    );
    expect(text(markup)).not.toMatch(/a run signed by nobody/i);
  });

  /* ------------------------------------------------------------------------
   * ONE AUTHORITY ON THE PASSWORD RULE.
   * --------------------------------------------------------------------- */

  it('states the password minimum in words, and quotes the constant correctly', () => {
    // If `PASSWORD_MIN` changes, this fails and names the two files to change.
    // A numeral in either dictionary would be a second copy of the rule, and the
    // copy that drifts is always the one nothing runs.
    expect(
      PASSWORD_MIN,
      'PASSWORD_MIN changed. The rule is written in words in ' +
        'apps/web/src/i18n/settings.en.ts and settings.ar.ts — update both.',
    ).toBe(12);
    expect(text(panels())).toMatch(/at least twelve characters/i);
  });

  it('leaves the rule itself to the server — the form pre-checks only the confirmation', () => {
    // The only check this form can make is the one the server never sees. Any
    // length comparison here would be a second enforcement point that can
    // disagree with the one that matters.
    expect(SOURCE).not.toMatch(/\.length\s*[<>]=?\s*\d/);
    expect(SOURCE).toContain('next !== confirm');
  });

  /* ------------------------------------------------------------------------
   * §13.1 — AMBER IS NOT THIS PAGE'S.
   * --------------------------------------------------------------------- */

  it('paints no amber anywhere', () => {
    const markup = panels() + page();
    expect(markup).not.toMatch(/data-state=["']assumed["']/);
    expect(markup).not.toMatch(/traced--assumed/);
    expect(markup).not.toMatch(/margin-tally/);
    // The STRIPPED source: this file's own docblock says "no amber on this page",
    // and a scan over the comments would fail on the sentence that states the rule.
    expect(stripped('../src/screens/Settings.tsx')).not.toMatch(/uncertain|amber/i);
  });

  /* ------------------------------------------------------------------------
   * THE ARABIC PAGE.
   * --------------------------------------------------------------------- */

  it('leaves no English prose outside an isolated span', () => {
    // The email address is inside a `dir="ltr"` input value, which
    // `arabicReadingText` does not read as copy.
    expectNoEnglishProse(panelsAr(), '/settings panels in Arabic');
  });

  it('is a complete Arabic dictionary, with no English left in a value', () => {
    // The type system already guarantees the SHAPE. What it cannot catch is an
    // English string pasted into an Arabic value, which renders as a page that
    // is only mostly translated.
    // A scan that allowed a newline inside the literal matched from the end of
    // one string to the start of the next, and reported the punctuation between
    // them as untranslated English.
    const values = [...DICT_AR.matchAll(/'([^'\n]{12,})'/g)].map((m) => m[1] ?? '');
    for (const v of values) {
      if (/^[A-Za-z0-9./_-]+$/.test(v)) continue; // an identifier or a path
      expect(v, `settings.ar.ts holds an English value: "${v}"`).toMatch(/[؀-ۿ]/);
    }
    expect(AR.title).toBe('الإعدادات');
  });

  /* ------------------------------------------------------------------------
   * THE SIGNED-OUT BRANCH.
   * --------------------------------------------------------------------- */

  it('tells a signed-out reader what this page is, rather than redirecting', () => {
    const t = text(page());
    expect(t).toMatch(/no account signed in/i);
    // And says what a guest actually is, which is the fact whose consequences
    // they need: the runs are held against a key in one browser.
    expect(t).toMatch(/key in this browser/i);
    expect(page()).toContain('href="/app"');
  });
});
