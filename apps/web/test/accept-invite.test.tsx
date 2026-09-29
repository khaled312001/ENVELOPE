/**
 * `/accept-invite` — the other end of the link, rendered.
 *
 * The shared scans come from `prohibitions.ts`. What is asserted here is the one
 * property that makes this URL safe to hand out, and it is a property of what the
 * page DOES NOT SAY.
 *
 * ---------------------------------------------------------------------------
 * IT MUST NEVER EXPLAIN WHY AN INVITATION WAS REFUSED.
 *
 * Expired, withdrawn, already used, addressed to a different person, or never a
 * real token — `org-routes.ts` answers all five with one identical sentence,
 * because distinguishing them turns this URL into an oracle for "is that person a
 * member of that firm". The page has to hold the same line, and the failure mode
 * is a helpful branch somebody adds later: "this link has expired" reads as better
 * product copy and is the whole exposure.
 *
 * So the words "expired", "withdrawn", "already accepted" and "not your
 * invitation" are asserted ABSENT from this page's own dictionary and source, in
 * both languages. The only sentence a reader gets is the server's, rendered
 * verbatim.
 *
 * ---------------------------------------------------------------------------
 * IT MUST NOT JOIN ON LOAD.
 *
 * Joining is consented to, not clicked into: everybody in the workspace will read
 * the joiner's work and the joiner will read theirs. The page therefore carries
 * that disclosure ABOVE the button, and the button is what acts — asserted by the
 * markup carrying a button and the source having no accept-on-mount.
 */

import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { StaticLocale } from '../src/i18n/locale.js';
import AcceptInvite from '../src/screens/AcceptInvite.js';
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

const SOURCE = stripped('../src/screens/AcceptInvite.tsx');
const DICT = stripped('../src/i18n/workspace.en.ts');
const DICT_AR = stripped('../src/i18n/workspace.ar.ts');

/** No token in the address: the state a reader reaches by opening the path itself. */
const bare = (): string => renderToStaticMarkup(<AcceptInvite {...pageProps()} />);

/** A token present, no session: the state a reader reaches from a message. */
const withToken = (): string =>
  renderToStaticMarkup(<AcceptInvite {...pageProps({ search: '?token=abcdefgh' })} />);

const withTokenAr = (): string =>
  renderToStaticMarkup(
    <StaticLocale locale="ar">
      <AcceptInvite {...pageProps({ search: '?token=abcdefgh' })} />
    </StaticLocale>,
  );

const text = (markup: string): string => stripTags(markup).replace(/\s+/g, ' ');

describe('/accept-invite', () => {
  it('carries the site-wide prohibitions in both of its states', () => {
    expectSitewideProhibitions(bare(), '/accept-invite with no token');
    expectSitewideProhibitions(withToken(), '/accept-invite with a token');
  });

  it('uses none of the hand-written apology vocabulary', () => {
    for (const banned of BANNED_IN_HAND_WRITTEN_COPY) {
      expect(SOURCE, `AcceptInvite.tsx matched ${banned}`).not.toMatch(banned);
    }
  });

  it('never tells a reader why an invitation was refused', () => {
    /*
      THE ORACLE TEST. Each of these is a plausible, friendlier sentence, and each
      one of them answers a question about somebody else's membership to whoever
      holds a URL. They are asserted absent from the page's OWN copy — the server's
      single sentence is rendered verbatim and is the only thing a reader gets.
    */
    for (const leak of [
      /this (link|invitation) has expired/i,
      /(invitation|link) was withdrawn/i,
      /already been accepted/i,
      /not your invitation/i,
      /addressed to (a different|another) (person|account)/i,
      /no such (invitation|workspace)/i,
    ]) {
      expect(SOURCE, `AcceptInvite.tsx matched ${leak}`).not.toMatch(leak);
      expect(DICT, `workspace.en.ts's accept copy matched ${leak}`).not.toMatch(leak);
    }
  });

  it('has exactly one refusal sentence, and it is the server’s', () => {
    // The dictionary carries no refusal of its own for this route: the only
    // sentence shown on a refused token comes back from the API.
    expect(SOURCE).toMatch(/e instanceof WorkspaceFailure \? e\.message/);
    expect(SOURCE).not.toMatch(/setRefusal\('[^']+'\)/);
  });

  it('says the link works for one account, in every state', () => {
    // The one piece of advice that is true whatever went wrong, so it can be
    // given without distinguishing the cases.
    expect(text(withToken())).toMatch(/only works for the account holding the address/i);
    expect(arabicReadingText(withTokenAr())).toMatch(/لا يعمل الرابط إلا للحساب صاحب العنوان/);
  });

  it('answers a bare address with what is missing, not with an error', () => {
    const t = text(bare());
    expect(t).toMatch(/This address has no invitation in it/i);
    expect(t).toMatch(/Ask whoever invited you to send the whole link/i);
    expect(t).not.toMatch(/error|failed/i);
  });

  it('does not join on load', () => {
    // The disclosure is above the act, and the act is a button. An effect that
    // called `accept` would take the consent the disclosure exists to ask for.
    expect(SOURCE).not.toMatch(/useEffect\([\s\S]{0,400}workspaces\.accept/);
    expect(SOURCE).toMatch(/onClick=\{\(\) => void join\(\)\}/);
  });

  it('renders no English prose in Arabic', () => {
    expectNoEnglishProse(withTokenAr(), '/accept-invite in Arabic');
  });

  it('uses no colloquial Arabic', () => {
    for (const banned of ['مش ', 'مفيش', 'عشان', 'دلوقتي', 'إزاي', 'اللي ', 'بيقول']) {
      expect(DICT_AR, `workspace.ar.ts contains "${banned}"`).not.toContain(banned);
    }
  });
});
