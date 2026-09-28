/**
 * `/settings` — the account's own page.
 *
 * ---------------------------------------------------------------------------
 * WHAT A SETTINGS PAGE IS FOR IN A PRODUCT LIKE THIS ONE.
 *
 * In most applications this screen is furniture: a name, an avatar, a theme, a
 * dark-pattern delete button three clicks deep. Here two of the fields are
 * load-bearing on the evidence trail, and the page is worth building mainly so
 * that they can be said out loud.
 *
 * The NAME goes on every `USER_SET` value and on every `G4` signature. A reader
 * who changes it will reasonably assume the change is retroactive — a display
 * name usually is — and it is not, because a run is never rewritten. That
 * sentence is in the panel, not in a help centre.
 *
 * The LICENCE is the sharper one. `CLAUDE.md` lists it among the disclosures
 * still owed in writing: *"the licence on `G4` is recorded and never verified"*.
 * A field that takes a licence number and says nothing beside it teaches a reader
 * that something checked it. Nothing did. So the field carries the disclosure in
 * the place the assertion is made, which is the only place it is any use.
 *
 * ---------------------------------------------------------------------------
 * NO CONTROL APPEARS THAT THE SERVER CANNOT HONOUR.
 *
 * `docs/06-plan/platform-plan.md` states the rule for the roles screen — *"no
 * roles screen ships before the server enforces the roles it displays"* — and it
 * governs every field here. That is why the two routes this page calls were
 * written first, and why the email field is a disabled input with a sentence
 * rather than an enabled one that fails: a control that looks operable and is not
 * is a claim the product cannot meet.
 *
 * It is also why there is no device list, no two-factor row, no notification
 * preferences and no delete-account button. Each would be a plausible-looking
 * control over something this deployment does not have.
 *
 * ---------------------------------------------------------------------------
 * THE SERVER'S SENTENCES ARE NOT TRANSLATED.
 *
 * `AccountPanel` established the pattern and `docs/05-design/arabic-glossary.md`
 * gives the rule: a message the server emitted is a record, and a translated copy
 * of it is a second record nobody issued. A wrong current password and a refused
 * new one both come back in the server's own words, rendered inside `Ltr` so the
 * bidirectional algorithm cannot carry the full stop to the wrong end.
 *
 * NO AMBER ON THIS PAGE. Nothing here is an `ASSUMED` value. A "you have unsaved
 * changes" strip in amber would be the single most effective way to teach a reader
 * that amber means "attention" — which is what §13.1 exists to prevent.
 */

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';

import { AuthFailure } from '../api/auth.js';
import { useDict, useLocale, useT, LanguageToggle } from '../i18n/locale.js';
import { AR } from '../i18n/settings.ar.js';
import { EN } from '../i18n/settings.en.js';
import type { PageProps } from '../Root.js';
import { Link } from '../router.js';
import { useSession } from '../session.js';

/**
 * A server sentence, carried with the fact that it came from the server.
 *
 * The same shape as `AccountPanel`'s `PanelError` and for the same reason: this
 * page has two sources of failure text and they are not interchangeable. One is
 * the server's, which is a record and is rendered verbatim; one is this file's
 * fallback for a failure that arrived with no sentence at all. A bare `string`
 * loses the distinction exactly where the Arabic page needs it.
 */
interface Failure {
  readonly text: string;
  readonly fromServer: boolean;
}

/** The server's own sentence, isolated on an RTL page; ours, translated, is not. */
function FailureLine({ failure, rtl }: { readonly failure: Failure; readonly rtl: boolean }) {
  return (
    <p className="settings__error" role="alert">
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

/**
 * One panel of the page.
 *
 * A `<section>` with its own heading rather than a `<fieldset>`: these are four
 * separate concerns, each with its own submit or no submit at all, and a screen
 * reader's rotor should be able to jump between them by heading.
 */
function Panel({
  heading,
  lede,
  children,
}: {
  readonly heading: string;
  readonly lede: string;
  readonly children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="settings__panel plate" aria-labelledby={id}>
      <h2 className="settings__panel-heading" id={id}>
        {heading}
      </h2>
      <p className="settings__panel-lede">{lede}</p>
      {children}
    </section>
  );
}

/**
 * THE FOUR PANELS, EXPORTED, and the reason is the one `Work.tsx` records.
 *
 * `renderToStaticMarkup` runs no effects and there is no session in a static
 * render, so the page component itself can only ever reach its signed-out branch
 * in a test. Everything a reader actually meets here — three forms, two
 * disclosures, twelve labels and the licence sentence — would be scanned by
 * nothing at all. `Work.tsx` exports `RunTable` for exactly this and
 * `Dashboard.tsx` exports `DashboardPanels`; the alternative is a page test that
 * measures the empty state and reports it as coverage.
 *
 * It takes the `account` as a prop rather than reading the session, so a test can
 * render it. The two MUTATIONS still come from the session hook, whose default
 * context supplies no-ops — which is correct for a static render and is the only
 * thing a static render could do with them.
 */
export function SettingsPanels({
  account,
  theme,
  toggleTheme,
}: {
  readonly account: { readonly email: string; readonly name: string; readonly licence: string | null };
  readonly theme: 'light' | 'dark';
  readonly toggleTheme: () => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  /* The page's own dictionary, and the chrome's — the theme control below reuses
     the masthead's sentence rather than writing a second one. */
  const chrome = useT();
  const { locale } = useLocale();
  const rtl = locale === 'ar';
  const { updateProfile, changePassword, signOut } = useSession();

  /* ------------------------------------------------------------- profile */
  const [name, setName] = useState('');
  const [licence, setLicence] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<Failure | null>(null);

  /*
    THE FORM IS SEEDED FROM THE ACCOUNT, ONCE IT ARRIVES.

    `useSession` starts in `checking` and the account lands a tick later, so a
    `useState(account?.name ?? '')` initialiser reads null on the first render and
    never runs again — the form would render permanently empty for a signed-in
    reader, which is precisely the bug `Root`'s actor-adoption effect records
    having been found by driving the product rather than by reading it.

    It re-seeds when the ACCOUNT ID changes, not on every account object: after a
    successful save the session's account is replaced with the stored one, and
    re-seeding there would be harmless but would also silently discard an edit a
    reader made while the request was in flight.
  */
  useEffect(() => {
    setName(account.name);
    setLicence(account.licence ?? '');
  }, [account.name, account.licence]);

  /* ------------------------------------------------------------ password */
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordDone, setPasswordDone] = useState(false);
  const [passwordError, setPasswordError] = useState<Failure | null>(null);
  const [mismatch, setMismatch] = useState(false);

  const [signingOut, setSigningOut] = useState(false);

  const nameId = useId();
  const nameHelpId = useId();
  const nameErrorId = useId();
  const licenceId = useId();
  const licenceHelpId = useId();
  const emailId = useId();
  const emailHelpId = useId();
  const currentId = useId();
  const currentHelpId = useId();
  const nextId = useId();
  const nextHelpId = useId();
  const confirmId = useId();
  const confirmErrorId = useId();
  const themeHelpId = useId();
  const languageHelpId = useId();

  /*
    AN ERROR APPEARS AFTER AN INTERACTION, NEVER BEFORE ONE.

    This was written as `name.trim() === ''` and a render probe caught what that
    does: the form seeds from the account in an effect, effects do not run before
    the first paint, so the field rendered `aria-invalid="true"` with "a run
    signed by nobody is a run with no author" under it — on a form the reader had
    not touched, about a name the account already has. A screen reader announces
    that on arrival.

    `touched` is the whole fix and it is the ordinary one: the field is invalid
    only once somebody has emptied it themselves.
  */
  const nameMissing = nameTouched && name.trim() === '';

  async function saveProfile(e: FormEvent): Promise<void> {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    if (name.trim() === '') {
      // Submitting is an interaction too, so the message has to be reachable
      // that way and not only by blurring the field.
      setNameTouched(true);
      return;
    }
    setProfileBusy(true);
    try {
      await updateProfile({ name: name.trim(), licence: licence.trim() });
      setProfileSaved(true);
    } catch (err) {
      setProfileError(
        err instanceof AuthFailure
          ? { text: err.message, fromServer: true }
          : { text: t.failed, fromServer: false },
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function submitPassword(e: FormEvent): Promise<void> {
    e.preventDefault();
    setPasswordError(null);
    setPasswordDone(false);

    /*
      THE ONLY CHECK THIS FORM MAKES ITSELF, and it is the only one it can: the
      server never sees the confirmation field, so nothing else could catch a typo
      in it. Every other rule about a password belongs to the route that enforces
      it, and is reported in the route's own words.
    */
    if (next !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setPasswordBusy(true);
    try {
      await changePassword({ current, next });
      setPasswordDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setPasswordError(
        err instanceof AuthFailure
          ? { text: err.message, fromServer: true }
          : { text: t.failed, fromServer: false },
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="shell section section--minor settings__panels">
        {/* ------------------------------------------------------- profile */}
        <Panel heading={t.profile.heading} lede={t.profile.lede}>
          <p className="settings__note">{t.profile.retro}</p>

          <form className="settings__form" onSubmit={saveProfile} noValidate>
            <div className="field">
              <label htmlFor={nameId}>{t.profile.name.label}</label>
              <input
                id={nameId}
                className="input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameTouched(true);
                  setProfileSaved(false);
                }}
                onBlur={() => setNameTouched(true)}
                autoComplete="name"
                aria-required="true"
                {...(nameMissing ? { 'aria-invalid': true as const } : {})}
                aria-describedby={nameMissing ? `${nameHelpId} ${nameErrorId}` : nameHelpId}
              />
              <p className="field__help" id={nameHelpId}>
                {t.profile.name.help}
              </p>
              {nameMissing ? (
                <p className="settings__error" id={nameErrorId}>
                  {t.profile.name.missing}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor={licenceId}>
                {t.profile.licence.label}{' '}
                <span className="field__optional">({t.profile.licence.optional})</span>
              </label>
              <input
                id={licenceId}
                className="input"
                type="text"
                value={licence}
                onChange={(e) => {
                  setLicence(e.target.value);
                  setProfileSaved(false);
                }}
                aria-describedby={licenceHelpId}
              />
              <p className="field__help" id={licenceHelpId}>
                {t.profile.licence.help} {t.profile.licence.clear}
              </p>
            </div>

            {/*
              THE EMAIL IS SHOWN AND CANNOT BE EDITED, and the sentence says why in
              terms of what it would break rather than as a missing feature. It is
              `readOnly` rather than `disabled`: a disabled input is skipped by
              keyboard navigation, so a reader tabbing through the form would never
              reach the explanation attached to it.
            */}
            <div className="field">
              <label htmlFor={emailId}>{t.profile.email.label}</label>
              <input
                id={emailId}
                className="input"
                type="text"
                value={account.email}
                readOnly
                dir="ltr"
                aria-describedby={emailHelpId}
              />
              <p className="field__help" id={emailHelpId}>
                {t.profile.email.help}
              </p>
            </div>

            <div className="cta">
              <button type="submit" className="button button--primary" disabled={profileBusy}>
                {profileBusy ? t.profile.saving : t.profile.save}
              </button>
              {profileSaved ? (
                <span className="settings__ok" role="status">
                  {t.profile.saved}
                </span>
              ) : null}
            </div>
            {profileError ? <FailureLine failure={profileError} rtl={rtl} /> : null}
          </form>
        </Panel>

        {/* ------------------------------------------------------ password */}
        <Panel heading={t.password.heading} lede={t.password.lede}>
          <form className="settings__form" onSubmit={submitPassword} noValidate>
            <div className="field">
              <label htmlFor={currentId}>{t.password.current.label}</label>
              <input
                id={currentId}
                className="input"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                aria-required="true"
                aria-describedby={currentHelpId}
              />
              <p className="field__help" id={currentHelpId}>
                {t.password.current.help}
              </p>
            </div>

            <div className="field">
              <label htmlFor={nextId}>{t.password.next.label}</label>
              <input
                id={nextId}
                className="input"
                type="password"
                value={next}
                onChange={(e) => {
                  setNext(e.target.value);
                  setMismatch(false);
                  setPasswordDone(false);
                }}
                autoComplete="new-password"
                aria-required="true"
                aria-describedby={nextHelpId}
              />
              <p className="field__help" id={nextHelpId}>
                {t.password.next.help}
              </p>
            </div>

            <div className="field">
              <label htmlFor={confirmId}>{t.password.confirm.label}</label>
              <input
                id={confirmId}
                className="input"
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setMismatch(false);
                }}
                autoComplete="new-password"
                aria-required="true"
                {...(mismatch ? { 'aria-invalid': true as const } : {})}
                {...(mismatch ? { 'aria-describedby': confirmErrorId } : {})}
              />
              {mismatch ? (
                <p className="settings__error" id={confirmErrorId} role="alert">
                  {t.password.confirm.mismatch}
                </p>
              ) : null}
            </div>

            <div className="cta">
              <button type="submit" className="button button--primary" disabled={passwordBusy}>
                {passwordBusy ? t.password.submitting : t.password.submit}
              </button>
              {passwordDone ? (
                <span className="settings__ok" role="status">
                  {t.password.done}
                </span>
              ) : null}
            </div>
            {passwordError ? <FailureLine failure={passwordError} rtl={rtl} /> : null}
          </form>
        </Panel>

        {/* ------------------------------------------------------ sessions */}
        <Panel heading={t.sessions.heading} lede={t.sessions.lede}>
          <p className="settings__note">{t.sessions.noList}</p>
          <div className="cta">
            {/*
              NOT `button--primary`, AND NOT `button--danger` EITHER.

              The primary action on this page is saving a name. Signing out of
              every device is deliberate, occasionally urgent, and not destructive
              — nothing is lost, the account and every run survive it — so dressing
              it as a destruction would be a false alarm, and dressing it as the
              page's main action would be a trap.
            */}
            <button
              type="button"
              className="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut().finally(() => setSigningOut(false));
              }}
            >
              {signingOut ? t.sessions.signingOut : t.sessions.signOutEverywhere}
            </button>
          </div>
        </Panel>

        {/* ---------------------------------------------------- appearance */}
        <Panel heading={t.appearance.heading} lede={t.appearance.lede}>
          <div className="field">
            <span className="settings__control-label" id={themeHelpId}>
              {t.appearance.theme.label}
            </span>
            {/*
              THE THEME COMES DOWN FROM `Root`, WHICH OWNS THE ONLY `useTheme()`.

              A second hook here would be a fourth copy of one fact — the third and
              fourth having already desynchronised once, which is the note on that
              hook call. `aria-pressed` rather than a checkbox: it is the same
              control the masthead carries, and two controls for one setting must
              announce themselves the same way.
            */}
            <button
              type="button"
              className="button button--sm"
              onClick={toggleTheme}
              aria-pressed={theme === 'dark'}
              aria-describedby={themeHelpId}
            >
              <span aria-hidden="true">{theme === 'light' ? '◐' : '◑'}</span>
              {/*
                THE CHROME'S OWN SENTENCE, NOT A SECOND ONE.

                The first version read "◐ Theme", which repeats the label above it
                and says nothing about what pressing it does. The masthead's toggle
                already carries "Switch to the dark theme" as its accessible name
                in both languages; two controls for one setting that announce
                themselves differently is the same defect as two copies of a number.
              */}
              {theme === 'light' ? chrome.themeToggle.toDark : chrome.themeToggle.toLight}
            </button>
            <p className="field__help">{t.appearance.theme.help}</p>
          </div>

          <div className="field">
            <span className="settings__control-label" id={languageHelpId}>
              {t.appearance.language.label}
            </span>
            <LanguageToggle />
            <p className="field__help">{t.appearance.language.help}</p>
          </div>
        </Panel>
    </div>
  );
}

/**
 * The page: the heading, and the session gate in front of the panels.
 *
 * SIGNED OUT IS A STATE THIS PAGE HANDLES, NOT ONE IT REDIRECTS AWAY FROM.
 * `/settings` is reachable from the rail, from a bookmark and from a pasted link,
 * and a signed-out reader arriving here needs to be told what they are looking at
 * rather than bounced to a page they did not ask for. `checking` renders the same
 * thing rather than a spinner: it lasts one request, and a flash of "no account"
 * followed by a form is worse than either.
 */
export default function Settings({ navigate, theme, toggleTheme }: PageProps): JSX.Element {
  const t = useDict(EN, AR);
  const { state, account } = useSession();

  return (
    <div className="settings">
      <section className="shell section section--opening">
        <h1 className="settings__title">{t.title}</h1>
        <p className="settings__lede">{t.lede}</p>
      </section>

      {state === 'signed-in' && account ? (
        <SettingsPanels account={account} theme={theme} toggleTheme={toggleTheme} />
      ) : (
        <section className="shell section section--minor">
          <p className="settings__lede">{t.signedOut.heading}</p>
          <p className="settings__lede">{t.signedOut.body}</p>
          <div className="cta">
            <Link to="/app" className="button button--primary" navigate={navigate}>
              {t.signedOut.cta}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
