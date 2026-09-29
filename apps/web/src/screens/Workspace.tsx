/**
 * `/workspace` — the firm, its people, its invitations and its log.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS SCREEN EXISTS AT ALL, GIVEN §6.4.
 *
 * `docs/06-plan/platform-plan.md`: *"No roles screen ships before the server
 * enforces the roles it displays."* `AppSidebar` refused a workspace switcher on
 * exactly that ground and said so in its own docblock: *"A switcher over one
 * implicit workspace is a control that claims tenancy this deployment does not
 * have, on the element a reader would trust most."*
 *
 * That was true and is no longer. `apps/api/src/org-routes.ts` enforces the four
 * roles, `apps/api/src/access.ts` resolves membership on every run and plot, and
 * `apps/api/test/tenancy.test.ts` attacks each rule from the side that should be
 * refused. So the screen may be built — and every control on it maps to a check
 * the server makes, not to a check this file makes.
 *
 * ---------------------------------------------------------------------------
 * THE SERVER DECIDES; THIS FILE ONLY DECLINES TO OFFER.
 *
 * `mayInvite` and `mayRename` come from the API, and the role comparisons below
 * use the same ranks the server uses. None of that is authorisation. An admin who
 * edits the DOM and presses a button they cannot see is refused by the route, in
 * its own sentence. Hiding a control is a courtesy — it stops the product offering
 * a button that answers 403 — and the moment it is mistaken for a security
 * boundary is the moment somebody removes a server check because "the UI already
 * prevents it".
 *
 * ---------------------------------------------------------------------------
 * FOUR DISCLOSURES ARE ON THIS PAGE AND NONE OF THEM IS IN A TOOLTIP.
 *
 * The name is unverified; members read each other's work; a licence is recorded
 * and never verified; nothing stops an author signing their own review. Each sits
 * beside the control it qualifies, because a disclosure a reader has to open is a
 * disclosure written for the author of the product rather than its reader.
 *
 * ---------------------------------------------------------------------------
 * NO AMBER ANYWHERE. Nothing on this page is an `ASSUMED` value. A role that is
 * about to change, an invitation that is about to expire and a workspace nobody
 * verified are all things a designer would reach for amber to mark, and §13.1
 * reserves it for one meaning. The page uses weight, rule and position instead.
 */

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';

import {
  RANK,
  WorkspaceFailure,
  workspaces,
  type AuditEventView,
  type InviteView,
  type MemberView,
  type MintedInvite,
  type WorkspaceDetail,
  type WorkspaceRole,
} from '../api/workspace.js';
import { useDict, useLocale } from '../i18n/locale.js';
import { AR } from '../i18n/workspace.ar.js';
import { EN } from '../i18n/workspace.en.js';
import type { PageProps } from '../Root.js';
import { Link } from '../router.js';
import { useSession } from '../session.js';
import { useWorkspace } from '../workspace.js';

const ROLE_ORDER: readonly WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer'];

/** `{name}` and friends, filled. One function, so no sentence is built by concatenation. */
function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

/**
 * A server sentence, carried with the fact that it came from the server.
 *
 * The same shape `Settings.tsx` and `AccountPanel` use, for the same reason: a
 * refusal the server wrote is a record and is rendered in its own words, isolated
 * inside `dir="ltr"` on an Arabic page so the bidirectional algorithm cannot carry
 * its full stop to the other end. A sentence this file wrote is translated.
 */
interface Failure {
  readonly text: string;
  readonly fromServer: boolean;
}

function FailureLine({ failure, rtl }: { readonly failure: Failure; readonly rtl: boolean }) {
  return (
    <p className="ws__error" role="alert">
      {failure.fromServer && rtl ? (
        <span dir="ltr" lang="en">
          {failure.text}
        </span>
      ) : (
        failure.text
      )}
    </p>
  );
}

const asFailure = (e: unknown, fallback: string): Failure =>
  e instanceof WorkspaceFailure
    ? { text: e.message, fromServer: true }
    : { text: fallback, fromServer: false };

/** One panel. A `<section>` with a heading, so a rotor can jump between them. */
function Panel({
  heading,
  lede,
  children,
}: {
  readonly heading: string;
  readonly lede?: string;
  readonly children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="ws__panel plate" aria-labelledby={id}>
      <h2 className="ws__panel-heading" id={id}>
        {heading}
      </h2>
      {lede ? <p className="ws__panel-lede">{lede}</p> : null}
      {children}
    </section>
  );
}

/**
 * A confirmation that restates the action and the object.
 *
 * `ux-writing`'s rule, and it is load-bearing here rather than decorative:
 * removing somebody is the one act on this page that takes work away from a
 * person, and "OK" as the confirm button is how it gets done by accident. The
 * title asks — "Remove Layla from the workspace?" — and the button answers in the
 * same words.
 *
 * NOT A MODAL. An inline disclosure inside the row, so there is no focus trap to
 * get wrong, no backdrop, and no element painted over the table the reader is
 * checking against. `AppSidebar` made the same call for the same reason.
 */
function Confirm({
  question,
  body,
  action,
  cancel,
  busy,
  busyLabel,
  onConfirm,
  onCancel,
}: {
  readonly question: string;
  readonly body: string;
  readonly action: string;
  readonly cancel: string;
  readonly busy: boolean;
  readonly busyLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <div className="ws__confirm" role="group" aria-label={question}>
      <p className="ws__confirm-question">{question}</p>
      <p className="ws__confirm-body">{body}</p>
      <div className="ws__confirm-actions">
        <button type="button" className="button button--primary" onClick={onConfirm} disabled={busy}>
          {busy ? busyLabel : action}
        </button>
        <button type="button" className="button" onClick={onCancel} disabled={busy}>
          {cancel}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ the panels */

export interface WorkspaceActions {
  readonly setRole: (accountId: string, role: WorkspaceRole) => Promise<void>;
  readonly remove: (accountId: string) => Promise<void>;
  readonly rename: (name: string) => Promise<void>;
  readonly invite: (email: string, role: WorkspaceRole) => Promise<MintedInvite>;
  readonly withdraw: (inviteId: string) => Promise<void>;
}

const NO_ACTIONS: WorkspaceActions = {
  setRole: async () => {},
  remove: async () => {},
  rename: async () => {},
  invite: async () => {
    throw new Error('no actions');
  },
  withdraw: async () => {},
};

/**
 * THE PANELS, EXPORTED, for the reason `Settings.tsx` and `Work.tsx` both record.
 *
 * `renderToStaticMarkup` runs no effects and there is no session in a static
 * render, so the route component can only ever reach its signed-out branch in a
 * test — and every disclosure, every role sentence and every label on this page
 * would be scanned by nothing at all. It takes its data as props; the mutations
 * default to no-ops, which is the only thing a static render could do with them.
 */
export function WorkspacePanels({
  detail,
  accountId,
  audit,
  actions = NO_ACTIONS,
  inviteOrigin = '',
}: {
  readonly detail: WorkspaceDetail;
  readonly accountId: string;
  /** `null` for a member or a viewer — the server does not send it, and the page says so. */
  readonly audit: readonly AuditEventView[] | null;
  readonly actions?: WorkspaceActions;
  /** The site's own origin, for the invitation link. Empty in a static render. */
  readonly inviteOrigin?: string;
}): JSX.Element {
  const t = useDict(EN, AR);
  const { locale } = useLocale();
  const rtl = locale === 'ar';
  const mine = RANK[detail.role];

  return (
    <>
      <MembersPanel
        detail={detail}
        accountId={accountId}
        mine={mine}
        actions={actions}
        rtl={rtl}
        t={t}
      />

      <Panel heading={t.roles.heading}>
        <dl className="ws__roles">
          {ROLE_ORDER.map((role) => (
            <div className="ws__role" key={role}>
              <dt className="ws__role-name">{t.roles[role].name}</dt>
              <dd className="ws__role-can">{t.roles[role].can}</dd>
            </div>
          ))}
        </dl>
        <p className="ws__note">{t.roles.lastOwner}</p>
        {/* Disclosures 3 and 4, where somebody is choosing who may review. */}
        <p className="ws__note ws__note--strong">{t.roles.reviewNote}</p>
      </Panel>

      <InvitesPanel
        detail={detail}
        actions={actions}
        origin={inviteOrigin}
        rtl={rtl}
        t={t}
      />

      <RenamePanel detail={detail} actions={actions} rtl={rtl} t={t} />

      <AuditPanel audit={audit} t={t} />
    </>
  );
}

type Dict = typeof EN;

/* --------------------------------------------------------------------- members */

function MembersPanel({
  detail,
  accountId,
  mine,
  actions,
  rtl,
  t,
}: {
  readonly detail: WorkspaceDetail;
  readonly accountId: string;
  readonly mine: number;
  readonly actions: WorkspaceActions;
  readonly rtl: boolean;
  readonly t: Dict;
}) {
  const [busyOn, setBusyOn] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<Failure | null>(null);

  const owners = detail.members.filter((m) => m.role === 'owner').length;

  const change = async (member: MemberView, role: WorkspaceRole): Promise<void> => {
    setBusyOn(member.accountId);
    setError(null);
    try {
      await actions.setRole(member.accountId, role);
    } catch (e) {
      setError(asFailure(e, t.state.offline));
    } finally {
      setBusyOn(null);
    }
  };

  const drop = async (member: MemberView): Promise<void> => {
    setBusyOn(member.accountId);
    setError(null);
    try {
      await actions.remove(member.accountId);
      setConfirming(null);
    } catch (e) {
      setError(asFailure(e, t.state.offline));
    } finally {
      setBusyOn(null);
    }
  };

  return (
    <Panel heading={t.members.heading} lede={t.members.lede}>
      {/* Disclosure 2. The sentence somebody accepting an invitation consents to. */}
      <p className="ws__note">{t.members.disclosure}</p>
      {error ? <FailureLine failure={error} rtl={rtl} /> : null}

      <div className="schedule">
        <table className="ws__table">
        <thead>
          <tr>
            <th scope="col">{t.members.columns.person}</th>
            <th scope="col">{t.members.columns.role}</th>
            <th scope="col">{t.members.columns.since}</th>
            <th scope="col">
              <span className="sr-only">{t.members.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {detail.members.map((member) => {
            const self = member.accountId === accountId;
            const theirs = RANK[member.role];
            /* The same two comparisons the server makes. See the file header:
               this declines to offer; it does not authorise. */
            const mayAct = !self && mine >= RANK['admin'] && mine > theirs;
            const lastOwner = member.role === 'owner' && owners <= 1;
            const mayLeave = self && !lastOwner;

            return (
              <tr key={member.accountId}>
                <th scope="row" className="ws__person">
                  <span className="ws__person-name">
                    {member.name ?? <em className="ws__missing">{t.members.missingAccount}</em>}
                    {self ? <span className="ws__you"> ({t.members.you})</span> : null}
                  </span>
                  {member.email ? (
                    <span className="ws__person-email" dir="ltr" lang="en">
                      {member.email}
                    </span>
                  ) : null}
                  <span className="ws__person-licence">
                    {member.licence ? (
                      <>
                        {t.members.licenceLabel}{' '}
                        <span dir="ltr" lang="en">
                          {member.licence}
                        </span>
                      </>
                    ) : (
                      t.members.noLicence
                    )}
                  </span>
                </th>
                <td>
                  {mayAct ? (
                    <RoleSelect
                      value={member.role}
                      /* An admin cannot hand out a rank above their own. */
                      max={mine}
                      busy={busyOn === member.accountId}
                      busyLabel={t.members.roleSaving}
                      label={`${t.members.columns.role} — ${member.name ?? member.accountId}`}
                      t={t}
                      onChange={(role) => void change(member, role)}
                    />
                  ) : (
                    <span className="ws__role-fixed">{t.roles[member.role].name}</span>
                  )}
                </td>
                <td>
                  <time dateTime={member.addedAt} dir="ltr">
                    {member.addedAt.slice(0, 10)}
                  </time>
                </td>
                <td className="ws__row-actions">
                  {confirming === member.accountId ? (
                    <Confirm
                      question={
                        self
                          ? t.members.confirmLeave
                          : fill(t.members.confirmRemove, {
                              name: member.name ?? member.accountId,
                            })
                      }
                      body={self ? t.members.confirmLeaveBody : t.members.confirmRemoveBody}
                      action={
                        self
                          ? t.members.confirmLeaveAction
                          : fill(t.members.confirmRemoveAction, {
                              name: member.name ?? member.accountId,
                            })
                      }
                      cancel={t.members.cancel}
                      busy={busyOn === member.accountId}
                      busyLabel={self ? t.members.leaving : t.members.removing}
                      onConfirm={() => void drop(member)}
                      onCancel={() => setConfirming(null)}
                    />
                  ) : mayAct || mayLeave ? (
                    <button
                      type="button"
                      className="button"
                      onClick={() => setConfirming(member.accountId)}
                    >
                      {self ? t.members.leave : t.members.remove}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/**
 * The role control.
 *
 * A `<select>` and not a menu of buttons: four mutually exclusive values with a
 * current one is what a select is, it is reachable by keyboard everywhere without
 * a line of JavaScript, and a custom listbox here would be a focus-management bug
 * on the one screen where a mis-click changes somebody's access.
 */
function RoleSelect({
  value,
  max,
  busy,
  busyLabel,
  label,
  t,
  onChange,
}: {
  readonly value: WorkspaceRole;
  readonly max: number;
  readonly busy: boolean;
  readonly busyLabel: string;
  readonly label: string;
  readonly t: Dict;
  readonly onChange: (role: WorkspaceRole) => void;
}) {
  const id = useId();
  return (
    <span className="ws__role-control">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="ws__select"
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value as WorkspaceRole)}
      >
        {ROLE_ORDER.filter((role) => RANK[role] <= max).map((role) => (
          <option key={role} value={role}>
            {t.roles[role].name}
          </option>
        ))}
      </select>
      {busy ? <span className="ws__busy">{busyLabel}</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------------- invites */

function InvitesPanel({
  detail,
  actions,
  origin,
  rtl,
  t,
}: {
  readonly detail: WorkspaceDetail;
  readonly actions: WorkspaceActions;
  readonly origin: string;
  readonly rtl: boolean;
  readonly t: Dict;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [busy, setBusy] = useState(false);
  const [minted, setMinted] = useState<MintedInvite | null>(null);
  const [copied, setCopied] = useState<false | 'ok' | 'failed'>(false);
  const [error, setError] = useState<Failure | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const emailId = useId();
  const emailHelpId = useId();
  const roleId = useId();

  if (!detail.mayInvite) {
    return (
      <Panel heading={t.invites.heading} lede={t.invites.lede}>
        <p className="ws__note">{t.invites.hiddenFromMembers}</p>
      </Panel>
    );
  }

  const link = minted ? `${origin}${minted.path}` : '';

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email.trim()) {
      setError({ text: t.invites.missingEmail, fromServer: false });
      return;
    }
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const made = await actions.invite(email.trim(), role);
      setMinted(made);
      setEmail('');
    } catch (err) {
      setError(asFailure(err, t.state.offline));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied('ok');
    } catch {
      /* A blocked clipboard is not an error the reader caused. The link is on
         screen and selectable; the message says to copy it by hand. */
      setCopied('failed');
    }
  };

  const withdraw = async (invite: InviteView): Promise<void> => {
    setWithdrawing(invite.inviteId);
    setError(null);
    try {
      await actions.withdraw(invite.inviteId);
      setConfirming(null);
    } catch (err) {
      setError(asFailure(err, t.state.offline));
    } finally {
      setWithdrawing(null);
    }
  };

  const outstanding = detail.invites;

  return (
    <Panel heading={t.invites.heading} lede={t.invites.lede}>
      <form className="ws__form" onSubmit={(e) => void submit(e)} noValidate>
        <div className="field">
          <label htmlFor={emailId}>{t.invites.emailLabel}</label>
          <input
            id={emailId}
            type="email"
            dir="ltr"
            autoComplete="off"
            value={email}
            aria-describedby={emailHelpId}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="field__help" id={emailHelpId}>
            {t.invites.emailHelp}
          </p>
        </div>
        <div className="field">
          <label htmlFor={roleId}>{t.invites.roleLabel}</label>
          <select
            id={roleId}
            className="ws__select"
            value={role}
            onChange={(e) => setRole(e.target.value as WorkspaceRole)}
          >
            {ROLE_ORDER.filter((r) => RANK[r] <= RANK[detail.role]).map((r) => (
              <option key={r} value={r}>
                {t.roles[r].name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="button button--primary" disabled={busy}>
          {busy ? t.invites.submitting : t.invites.submit}
        </button>
      </form>

      {error ? <FailureLine failure={error} rtl={rtl} /> : null}

      {minted ? (
        <div className="ws__minted" role="status">
          <h3 className="ws__minted-heading">{t.invites.madeHeading}</h3>
          <p className="ws__minted-lede">{t.invites.madeLede}</p>
          {/*
            A READ-ONLY INPUT, NOT A <p>. It is selectable on a phone with one tap,
            it survives a copy that loses the line break, and it cannot be edited
            into something that is not the link somebody was sent.
          */}
          <input className="ws__link" dir="ltr" readOnly value={link} aria-label={link} />
          <div className="ws__minted-actions">
            <button type="button" className="button" onClick={() => void copy()}>
              {t.invites.copy}
            </button>
            {copied === 'ok' ? <span className="ws__ok">{t.invites.copied}</span> : null}
            {copied === 'failed' ? <span className="ws__note">{t.invites.copyFailed}</span> : null}
          </div>
          {/* The server's own sentence about having no mailer, in its own words. */}
          <p className="ws__note" dir={rtl ? 'ltr' : undefined} lang={rtl ? 'en' : undefined}>
            {minted.note}
          </p>
        </div>
      ) : null}

      <h3 className="ws__sub">{t.invites.listHeading}</h3>
      {outstanding.length === 0 ? (
        <p className="ws__empty">
          {t.invites.none} {t.invites.noneAdmin}
        </p>
      ) : (
        <div className="schedule">
          <table className="ws__table">
          <thead>
            <tr>
              <th scope="col">{t.invites.columns.person}</th>
              <th scope="col">{t.invites.columns.role}</th>
              <th scope="col">{t.invites.columns.state}</th>
              <th scope="col">{t.invites.columns.expires}</th>
              <th scope="col">
                <span className="sr-only">{t.members.columns.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {outstanding.map((invite) => (
              <tr key={invite.inviteId}>
                <th scope="row" dir="ltr" lang="en" className="ws__person-email">
                  {invite.email}
                </th>
                <td>{t.roles[invite.role].name}</td>
                <td>{t.invites.state[invite.state]}</td>
                <td>
                  <time dateTime={invite.expiresAt} dir="ltr">
                    {invite.expiresAt.slice(0, 10)}
                  </time>
                </td>
                <td className="ws__row-actions">
                  {confirming === invite.inviteId ? (
                    <Confirm
                      question={fill(t.invites.confirmWithdraw, { email: invite.email })}
                      body={t.invites.confirmWithdrawBody}
                      action={t.invites.confirmWithdrawAction}
                      cancel={t.members.cancel}
                      busy={withdrawing === invite.inviteId}
                      busyLabel={t.invites.withdrawing}
                      onConfirm={() => void withdraw(invite)}
                      onCancel={() => setConfirming(null)}
                    />
                  ) : invite.state === 'open' ? (
                    <button
                      type="button"
                      className="button"
                      onClick={() => setConfirming(invite.inviteId)}
                    >
                      {t.invites.withdraw}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------- rename */

function RenamePanel({
  detail,
  actions,
  rtl,
  t,
}: {
  readonly detail: WorkspaceDetail;
  readonly actions: WorkspaceActions;
  readonly rtl: boolean;
  readonly t: Dict;
}) {
  const [name, setName] = useState(detail.name);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const id = useId();

  useEffect(() => {
    setName(detail.name);
  }, [detail.name]);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) {
      setError({ text: t.rename.missing, fromServer: false });
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await actions.rename(name.trim());
      setSaved(true);
    } catch (err) {
      setError(asFailure(err, t.state.offline));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel heading={t.rename.heading} lede={t.rename.lede}>
      {detail.mayRename ? (
        <form className="ws__form" onSubmit={(e) => void submit(e)} noValidate>
          <div className="field">
            <label htmlFor={id}>{t.rename.label}</label>
            <input id={id} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" className="button button--primary" disabled={busy}>
            {busy ? t.rename.saving : t.rename.submit}
          </button>
          {saved ? <span className="ws__ok">{t.rename.saved}</span> : null}
        </form>
      ) : (
        <p className="ws__note">{t.rename.ownerOnly}</p>
      )}
      {error ? <FailureLine failure={error} rtl={rtl} /> : null}
    </Panel>
  );
}

/* --------------------------------------------------------------------- audit */

function AuditPanel({
  audit,
  t,
}: {
  readonly audit: readonly AuditEventView[] | null;
  readonly t: Dict;
}) {
  if (audit === null) {
    return (
      <Panel heading={t.audit.heading} lede={t.audit.lede}>
        <p className="ws__note">{t.audit.adminOnly}</p>
      </Panel>
    );
  }
  return (
    <Panel heading={t.audit.heading} lede={t.audit.lede}>
      <p className="ws__note">{t.audit.renamed}</p>
      {audit.length === 0 ? (
        <p className="ws__empty">{t.audit.none}</p>
      ) : (
        <ol className="ws__log">
          {audit.map((event) => (
            <li className="ws__event" key={event.eventId}>
              <time className="ws__event-at" dateTime={event.at} dir="ltr">
                {event.at.slice(0, 16).replace('T', ' ')}
              </time>
              <p className="ws__event-line">
                <span className="ws__event-actor">{event.actor.label}</span>{' '}
                {t.audit.actions[event.action as keyof typeof t.audit.actions] ??
                  t.audit.actions.unknown}
                {event.subject ? (
                  <>
                    {' '}
                    <span className="ws__event-subject" dir="ltr" lang="en">
                      {event.subject}
                    </span>
                  </>
                ) : null}
              </p>
              <AuditDetail event={event} t={t} />
              {/* The recorded name and the current one, side by side, never in
                  place of one another — see `audit.renamed`. */}
              {event.actor.currentName && event.actor.currentName !== event.actor.label ? (
                <p className="ws__event-rename">
                  {event.actor.currentName} — {t.audit.then} {event.actor.label}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/**
 * The structured half of an event, turned into a phrase.
 *
 * `detail` is JSON the server wrote, never a sentence: a sentence stored at write
 * time cannot be translated, and this product ships in two languages. So the keys
 * are read here and the words come from the dictionary.
 */
function AuditDetail({ event, t }: { readonly event: AuditEventView; readonly t: Dict }) {
  const d = event.detail;
  const str = (k: string): string | null => (typeof d[k] === 'string' ? (d[k] as string) : null);

  const from = str('from');
  const to = str('to');
  if (from && to) {
    return (
      <p className="ws__event-detail">
        {fill(t.audit.roleChange, {
          from: t.roles[from as WorkspaceRole]?.name ?? from,
          to: t.roles[to as WorkspaceRole]?.name ?? to,
        })}
      </p>
    );
  }

  const plot = str('plotNumber');
  if (plot) {
    return (
      <p className="ws__event-detail">
        {fill(t.audit.onPlot, { plot })}
      </p>
    );
  }

  const gate = str('gate');
  if (gate) {
    const licence = str('licenceAsserted');
    return (
      <p className="ws__event-detail">
        <span dir="ltr" lang="en">
          {fill(t.audit.gate, { gate })}
        </span>
        {' — '}
        {licence ? fill(t.audit.licenceAsserted, { licence }) : t.audit.noLicence}
      </p>
    );
  }

  const role = str('role');
  if (role) {
    return (
      <p className="ws__event-detail">{t.roles[role as WorkspaceRole]?.name ?? role}</p>
    );
  }
  return null;
}

/* -------------------------------------------------------------- the empty state */

export function NoWorkspace({
  onCreate,
  heading,
  lede,
}: {
  readonly onCreate: (name: string) => Promise<void>;
  /**
   * The empty state's own words by default, and different ones when this is the
   * "create another" form at the foot of a workspace somebody already has. The
   * empty state argues what a workspace BUYS, which is the right thing to say to
   * a person who has none and the wrong thing to repeat to a person reading their
   * own members table.
   */
  readonly heading?: string;
  readonly lede?: string;
}): JSX.Element {
  const t = useDict(EN, AR);
  const { locale } = useLocale();
  const rtl = locale === 'ar';
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(null);
  const id = useId();
  const helpId = useId();

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) {
      setError({ text: t.empty.missing, fromServer: false });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate(name.trim());
    } catch (err) {
      setError(asFailure(err, t.state.offline));
    } finally {
      setBusy(false);
    }
  };

  const own = heading === undefined;
  return (
    <Panel heading={heading ?? t.empty.heading} lede={lede ?? t.empty.lede}>
      {own ? <p className="ws__prose">{t.empty.value}</p> : null}
      <form className="ws__form" onSubmit={(e) => void submit(e)} noValidate>
        <div className="field">
          <label htmlFor={id}>{t.empty.create}</label>
          <input
            id={id}
            value={name}
            aria-describedby={helpId}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="field__help" id={helpId}>
            {t.empty.help}
          </p>
        </div>
        <button type="submit" className="button button--primary" disabled={busy}>
          {busy ? t.empty.creating : t.empty.submit}
        </button>
      </form>
      {error ? <FailureLine failure={error} rtl={rtl} /> : null}
    </Panel>
  );
}

/* ---------------------------------------------------------------- the switcher */

export function WorkspacePicker(): JSX.Element {
  const t = useDict(EN, AR);
  const { list, active, setActive } = useWorkspace();
  const id = useId();

  return (
    <div className="ws__picker">
      <label className="ws__picker-label" htmlFor={id}>
        {t.picker.label}
      </label>
      <select
        id={id}
        className="ws__select"
        value={active?.orgId ?? ''}
        onChange={(e) => setActive(e.target.value === '' ? null : e.target.value)}
      >
        <option value="">{t.picker.personal}</option>
        {list.map((o) => (
          <option key={o.orgId} value={o.orgId}>
            {o.name}
          </option>
        ))}
      </select>
      {/* The consequence, next to the control. A run cannot be moved afterwards. */}
      <p className="ws__picker-effect">
        {active ? t.picker.effect : t.picker.personalEffect}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------- the page */

export default function Workspace({ navigate }: PageProps): JSX.Element {
  const t = useDict(EN, AR);
  const { locale } = useLocale();
  const rtl = locale === 'ar';
  const { state: sessionState, account } = useSession();
  const { state, list, active, setActive, refresh, create } = useWorkspace();

  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [audit, setAudit] = useState<readonly AuditEventView[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Failure | null>(null);

  const orgId = active?.orgId ?? null;

  const load = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const found = await workspaces.get(id);
      setDetail(found);
      /*
        THE LOG IS ASKED FOR SEPARATELY, AND A 403 IS AN ANSWER.

        A member is refused it by the server, which is correct, and the page shows
        "owners and admins can read this" rather than an error — the request
        failing and the reader not being allowed are different facts and the page
        must not render the second as the first.
      */
      if (RANK[found.role] >= RANK['admin']) {
        const { events } = await workspaces.audit(id);
        setAudit(events);
      } else {
        setAudit(null);
      }
    } catch (e) {
      setDetail(null);
      setError(asFailure(e, t.state.offline));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId === null) {
      setDetail(null);
      setAudit(null);
      return;
    }
    void load(orgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (sessionState === 'checking' || state === 'checking') {
    return <Shell title={t.title} lede={t.lede}>{<p className="ws__empty">{t.state.loading}</p>}</Shell>;
  }

  if (sessionState !== 'signed-in' || !account) {
    return (
      <Shell title={t.title} lede={t.lede}>
        <Panel heading={t.state.signedOut} lede={t.state.signedOutHelp}>
          <Link to="/sign-in" navigate={navigate} className="button button--primary">
            {t.state.signIn}
          </Link>
        </Panel>
      </Shell>
    );
  }

  if (state === 'offline') {
    return (
      <Shell title={t.title} lede={t.lede}>
        <Panel heading={t.state.offline} lede={t.state.offlineHelp}>
          <button type="button" className="button" onClick={() => void refresh()}>
            {t.state.retry}
          </button>
        </Panel>
      </Shell>
    );
  }

  /* Closed over an id that is known to be a string, rather than asserting a
     nullable one five times: the branch below is the only caller. */
  const actionsFor = (org: string): WorkspaceActions => ({
    setRole: async (id, role) => {
      await workspaces.setRole(org, id, role);
      await load(org);
    },
    remove: async (id) => {
      await workspaces.remove(org, id);
      /* Removing yourself ends the membership this page is reading, so the list
         is reloaded and the active workspace falls back to personal. */
      if (id === account.accountId) {
        setActive(null);
        await refresh();
      } else {
        await load(org);
      }
    },
    rename: async (name) => {
      await workspaces.rename(org, name);
      await Promise.all([load(org), refresh()]);
    },
    invite: async (email, role) => {
      const made = await workspaces.invite(org, email, role);
      await load(org);
      return made;
    },
    withdraw: async (inviteId) => {
      await workspaces.withdrawInvite(org, inviteId);
      await load(org);
    },
  });

  return (
    <Shell title={t.title} lede={t.lede}>
      {list.length > 0 ? <WorkspacePicker /> : null}
      {error ? <FailureLine failure={error} rtl={rtl} /> : null}

      {list.length === 0 ? (
        <NoWorkspace
          onCreate={async (name) => {
            await create(name);
          }}
        />
      ) : orgId === null ? (
        <Panel heading={t.empty.heading} lede={t.empty.lede}>
          <p className="ws__prose">{t.picker.personalEffect}</p>
        </Panel>
      ) : loading && !detail ? (
        <p className="ws__empty">{t.state.loading}</p>
      ) : detail ? (
        <WorkspacePanels
          detail={detail}
          accountId={account.accountId}
          audit={audit}
          actions={actionsFor(orgId)}
          inviteOrigin={typeof window === 'undefined' ? '' : window.location.origin}
        />
      ) : null}

      {list.length > 0 ? (
        <NoWorkspace
          heading={t.picker.another}
          lede={t.empty.help}
          onCreate={async (name) => {
            await create(name);
          }}
        />
      ) : null}
    </Shell>
  );
}

function Shell({
  title,
  lede,
  children,
}: {
  readonly title: string;
  readonly lede: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="ws">
      <section className="shell section section--opening" aria-labelledby="ws-title">
        <h1 id="ws-title">{title}</h1>
        <p className="ws__lede">{lede}</p>
      </section>
      <div className="shell section">{children}</div>
    </div>
  );
}
