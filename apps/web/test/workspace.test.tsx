/**
 * `/workspace` — the firm, its people and its log, rendered.
 *
 * The shared scans come from `prohibitions.ts`. What is asserted here is what is
 * true of THIS page and of no other — and, as on `/settings`, most of it is a
 * PRESENCE assertion, which is unusual in this suite and is the point.
 *
 * ---------------------------------------------------------------------------
 * FOUR DISCLOSURES, ASSERTED PRESENT, IN BOTH LANGUAGES.
 *
 * A members table with four role names on it implies an authorisation system, a
 * verified organisation and an audit trail somebody checks. This deployment has
 * exactly one of those three. The four sentences that say which are the only thing
 * standing between this page and an overclaim, and every one of them fails in the
 * same direction: deleting it makes the page cleaner, breaks nothing else, and
 * turns a careful product into a boastful one.
 *
 *   1. The workspace name is unverified.
 *   2. Members read each other's work, including assumptions somebody typed.
 *   3. A licence on a review is recorded and never verified.
 *   4. Nothing stops the person who computed a run from signing it themselves.
 *
 * (3) and (4) are the sharpest. A role named "reviewer" is the single most
 * effective way this product could imply a second pair of eyes it does not
 * enforce, and the sentence next to the role table is what stops it.
 *
 * ---------------------------------------------------------------------------
 * NO CONTROL THE SERVER CANNOT HONOUR — §6.4, mechanised where it can be.
 *
 * A viewer must not be offered a role control; a member must not be offered the
 * invite form; the last owner must not be offered a way out. Each is asserted by
 * rendering the panels in that role and looking for the control's absence, because
 * each would otherwise be a button that answers 403 — and because a screen that
 * offers an action the server refuses is how a reader learns to distrust every
 * other control on the page.
 *
 * ---------------------------------------------------------------------------
 * THE TOKEN IS NEVER IN THE MARKUP. An invitations table is a table somebody
 * screenshots, and a token in it is a live credential in an image.
 *
 * ---------------------------------------------------------------------------
 * NO AMBER. Nothing on this page is an `ASSUMED` value. Four things here are
 * exactly what a designer reaches for amber to mark — an unverified name, an
 * unchecked licence, an expiring invitation, a role mid-change — and §13.1
 * reserves it. The assertion is over the stylesheet, where the temptation lands.
 */

import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { AuditEventView, WorkspaceDetail, WorkspaceRole } from '../src/api/workspace.js';
import { StaticLocale } from '../src/i18n/locale.js';
import Workspace, { WorkspacePanels, NoWorkspace } from '../src/screens/Workspace.js';
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

const SOURCE = readFileSync(new URL('../src/screens/Workspace.tsx', import.meta.url), 'utf8');
/* The same file with its comments gone — its header argues at length about amber
   in order to refuse it, and a scan that read the argument as a use would delete
   the argument to pass. */
const CODE = stripped('../src/screens/Workspace.tsx');
const DICT = stripped('../src/i18n/workspace.en.ts');
const DICT_AR = stripped('../src/i18n/workspace.ar.ts');
/**
 * The stylesheet WITHOUT its comments.
 *
 * The same rule `settings.test.tsx` applies to a dictionary: a comment that names
 * a token in order to refuse it — "NOTHING IN THIS FILE PAINTS `--uncertain`" — is
 * the record of the decision, and a scan that read it as a use would delete the
 * record to pass. The declarations are the unit of assertion.
 */
const CSS = readFileSync(new URL('../src/styles/workspace.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

/**
 * A workspace shaped by the API's own type.
 *
 * `CLAUDE.md` records what a fixture that has drifted from the type it claims to
 * be goes on proving — the web render fixture was structurally not a `Plot` for as
 * long as it existed — so this is annotated as `WorkspaceDetail` rather than left
 * as an object literal that merely resembles one.
 */
const detail = (over: Partial<WorkspaceDetail> = {}): WorkspaceDetail => ({
  orgId: 'org-1',
  name: 'Dubai Design Partners',
  createdAt: '2026-09-01T10:00:00.000Z',
  role: 'owner',
  members: [
    {
      accountId: 'acc-1',
      role: 'owner',
      addedAt: '2026-09-01T10:00:00.000Z',
      name: 'Khaled Haggagy',
      email: 'khaled@example.com',
      licence: 'ENG-12345',
    },
    {
      accountId: 'acc-2',
      role: 'member',
      addedAt: '2026-09-04T10:00:00.000Z',
      name: 'Layla Saeed',
      email: 'layla@example.com',
      licence: null,
    },
  ],
  invites: [
    {
      inviteId: 'inv-1',
      email: 'newcomer@example.com',
      role: 'viewer',
      createdAt: '2026-09-05T10:00:00.000Z',
      expiresAt: '2026-09-12T10:00:00.000Z',
      acceptedAt: null,
      revokedAt: null,
      state: 'open',
    },
  ],
  mayInvite: true,
  mayRename: true,
  ...over,
});

const AUDIT: readonly AuditEventView[] = [
  {
    eventId: 'ev-1',
    at: '2026-09-04T10:00:00.000Z',
    action: 'member.role_changed',
    subject: 'acc-2',
    detail: { from: 'member', to: 'viewer' },
    actor: { accountId: 'acc-1', label: 'Khaled Haggagy', currentName: 'K. Haggagy' },
  },
  {
    eventId: 'ev-2',
    at: '2026-09-01T10:00:00.000Z',
    action: 'org.created',
    subject: 'org-1',
    detail: { name: 'Dubai Design Partners' },
    actor: { accountId: 'acc-1', label: 'Khaled Haggagy', currentName: 'K. Haggagy' },
  },
];

/** The page with no session provider, which is the signed-out branch. */
const page = (): string => renderToStaticMarkup(<Workspace {...pageProps()} />);

const panels = (over: Partial<WorkspaceDetail> = {}, audit = AUDIT): string =>
  renderToStaticMarkup(
    <WorkspacePanels detail={detail(over)} accountId="acc-1" audit={audit} />,
  );

const panelsAr = (over: Partial<WorkspaceDetail> = {}): string =>
  renderToStaticMarkup(
    <StaticLocale locale="ar">
      <WorkspacePanels detail={detail(over)} accountId="acc-1" audit={AUDIT} />
    </StaticLocale>,
  );

const text = (markup: string): string => stripTags(markup).replace(/\s+/g, ' ');

describe('/workspace', () => {
  it('carries the site-wide prohibitions, signed out and signed in', () => {
    expectSitewideProhibitions(page(), '/workspace signed out');
    expectSitewideProhibitions(panels(), '/workspace panels');
    expectSitewideProhibitions(
      renderToStaticMarkup(<NoWorkspace onCreate={async () => {}} />),
      '/workspace empty state',
    );
  });

  it('uses none of the hand-written apology vocabulary', () => {
    for (const banned of BANNED_IN_HAND_WRITTEN_COPY) {
      expect(DICT, `workspace.en.ts matched ${banned}`).not.toMatch(banned);
      expect(SOURCE, `Workspace.tsx matched ${banned}`).not.toMatch(banned);
    }
  });

  /* ------------------------------------------------------- the four disclosures */

  it('says the workspace name is verified by nobody', () => {
    const t = text(panels());
    expect(t).toMatch(/Nothing checked that a firm by this name exists/i);
    expect(arabicReadingText(panelsAr())).toMatch(/لا شيء تحقق من وجود مكتب بهذا الاسم/);
  });

  it('says members read each other’s work, and what that includes', () => {
    const t = text(panels());
    expect(t).toMatch(/open every plot and every run computed in this workspace/i);
    // Not a vague "shared access" — the specific thing a person is consenting to.
    expect(t).toMatch(/assumptions somebody entered by hand/i);
    expect(arabicReadingText(panelsAr())).toMatch(/الافتراضات التي أدخلها أحدهم بيده/);
  });

  it('says a licence on a review is recorded and never verified', () => {
    const t = text(panels());
    expect(t).toMatch(/recorded and never verified/i);
    expect(t).toMatch(/no registry is connected/i);
    expect(arabicReadingText(panelsAr())).toMatch(/يسجل ولا يتحقق منه أحد/);
  });

  it('says nothing stops an author signing their own review', () => {
    // The sharpest of the four. A role named "reviewer" implies a second pair of
    // eyes; this is the sentence that refuses to let it.
    const t = text(panels());
    expect(t).toMatch(/nothing here stops the person who computed a run from signing it themselves/i);
    expect(t).toMatch(/A role is not a second pair of eyes/i);
    expect(arabicReadingText(panelsAr())).toMatch(/لا شيء هنا يمنع من حسب الدراسة أن يوقعها بنفسه/);
    expect(arabicReadingText(panelsAr())).toMatch(/الدور ليس عينا ثانية/);
  });

  it('says what every role may do, so a role name is never a bare word', () => {
    const t = text(panels());
    for (const phrase of [
      'rename the workspace',
      'Cannot touch an owner',
      'Cannot enter a plot or start a run',
    ]) {
      expect(t, `the roles table is missing "${phrase}"`).toMatch(new RegExp(phrase, 'i'));
    }
    expect(t).toMatch(/last owner cannot leave or be removed/i);
  });

  /* ------------------------------------------ no control the server cannot honour */

  const ROLE_CONTROL = /<select[^>]*class="ws__select"/;

  it('offers no role control to a viewer', () => {
    const markup = panels({ role: 'viewer', mayInvite: false, mayRename: false }, AUDIT);
    expect(markup).not.toMatch(ROLE_CONTROL);
    // …and does offer one to an owner, so the assertion above is about the role
    // and not about a control this page never renders.
    expect(panels()).toMatch(ROLE_CONTROL);
  });

  it('offers no invite form to a member, and says who can see invitations', () => {
    const markup = panels({ role: 'member', mayInvite: false, mayRename: false, invites: [] });
    expect(markup).not.toMatch(/name="email"|type="email"/);
    expect(text(markup)).toMatch(/Only owners and admins see who has been invited/i);
  });

  it('offers no way out to the last owner, and one to everybody else', () => {
    const alone = panels({
      members: [detail().members[0]!],
    });
    expect(text(alone)).not.toMatch(/Leave this workspace/i);

    const two = panels({
      members: [detail().members[0]!, { ...detail().members[1]!, role: 'owner' }],
    });
    expect(text(two)).toMatch(/Leave this workspace/i);
  });

  it('tells a member that the log is not theirs to read, rather than showing an error', () => {
    // A 403 on the log is an ANSWER, and rendering it as a failed request would
    // tell a member the product is broken when it is working exactly as designed.
    const markup = panels({ role: 'member', mayInvite: false, mayRename: false }, []);
    expect(text(panels({ role: 'member', mayInvite: false, mayRename: false }))).toBeTruthy();
    expect(markup).toBeTruthy();
    const noAudit = renderToStaticMarkup(
      <WorkspacePanels detail={detail({ role: 'member' })} accountId="acc-1" audit={null} />,
    );
    expect(text(noAudit)).toMatch(/Owners and admins can read this/i);
    expect(text(noAudit)).not.toMatch(/could not be loaded/i);
  });

  /* --------------------------------------------------------- the one-time token */

  it('never renders an invitation token or its hash', () => {
    const markup = panels();
    expect(markup).not.toMatch(/tokenHash/i);
    // The invitations table shows the address, the role and the state, and the
    // link exists only in the response to the request that made it.
    expect(text(markup)).toMatch(/newcomer@example\.com/);
    expect(text(markup)).toMatch(/Waiting/);
  });

  it('says an invitation is a link this product does not email', () => {
    const t = text(panels());
    expect(t).toMatch(/TOP\.ai sends no email and does not claim to/i);
    expect(arabicReadingText(panelsAr())).toMatch(/لا يرسل TOP\.ai بريدا ولا يقول إنه يرسله/);
  });

  it('says the link is shown once — over the dictionary, where the sentence lives', () => {
    /*
      The minted link appears only in the response to the request that made it, so
      a static render cannot reach it and the assertion is over the copy instead.
      It is worth asserting at all because "it cannot be shown again" is the whole
      reason a reader copies it now rather than closing the tab.
    */
    expect(DICT).toMatch(/It is not stored and cannot be shown again/i);
    expect(DICT_AR).toContain('لا يخزن ولا يمكن إظهاره ثانية');
  });

  /* ---------------------------------------------------------------------- log */

  it('keeps the recorded name beside the current one, never instead of it', () => {
    const t = text(panels());
    expect(t).toMatch(/Khaled Haggagy/);
    expect(t).toMatch(/K\. Haggagy/);
    expect(t).toMatch(/then known as/i);
    expect(t).toMatch(/A log that rewrote itself would not be a log/i);
  });

  it('says the log cannot be edited or deleted by anybody, including an owner', () => {
    expect(text(panels())).toMatch(/Nothing here can be edited or deleted, by anybody, including an owner/i);
  });

  it('turns a stored action key into a sentence rather than printing the key', () => {
    const t = text(panels());
    expect(t).toMatch(/changed a role/i);
    expect(t).toMatch(/from Member to Viewer/i);
    // The key itself is not what a reader is shown.
    expect(t).not.toMatch(/member\.role_changed/);
  });

  /* -------------------------------------------------------------------- amber */

  it('paints no amber anywhere on the page', () => {
    for (const token of ['--uncertain', '--amber']) {
      expect(CSS, `workspace.css reads ${token}`).not.toContain(token);
    }
    expect(CODE).not.toMatch(/assumed|uncertain/i);
  });

  it('reads semantic tokens only', () => {
    // `pnpm contrast`'s assertion (9) is the real gate; this catches it in the
    // suite the author is already running.
    const primitives = CSS.match(/var\(--(?:graphite|grey|blue|amber|red|green|teal)-\d+\)/g);
    expect(primitives ?? []).toEqual([]);
  });

  /* ------------------------------------------------------------------- arabic */

  it('renders no English prose in Arabic', () => {
    expectNoEnglishProse(panelsAr(), '/workspace panels in Arabic');
  });

  it('keeps every one of the four disclosures in the Arabic dictionary', () => {
    // Asserted over the DICTIONARY as well as the render, because a disclosure
    // deleted from one language and kept in the other is invisible to every
    // reviewer who reads only the other.
    for (const phrase of [
      'لا يتحقق أحد',
      'يسجل ولا يتحقق منه أحد',
      'لا شيء هنا يمنع',
      'الافتراضات التي أدخلها أحدهم بيده',
    ]) {
      expect(DICT_AR, `workspace.ar.ts is missing "${phrase}"`).toContain(phrase);
    }
  });

  it('uses no colloquial Arabic', () => {
    // `docs/05-design/arabic-glossary.md` §5. A page that drifts into dialect
    // reads as a chat message and undoes the register the refusals depend on.
    for (const banned of ['مش ', 'مفيش', 'عشان', 'دلوقتي', 'إزاي', 'اللي ', 'بيقول']) {
      expect(DICT_AR, `workspace.ar.ts contains "${banned}"`).not.toContain(banned);
    }
  });

  it('never calls anything compliant, in either language', () => {
    expect(DICT_AR).not.toMatch(/مطابق/);
    expect(text(panels())).not.toMatch(/\bcompliant\b/i);
  });
});
