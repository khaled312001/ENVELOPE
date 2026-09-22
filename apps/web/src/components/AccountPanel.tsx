/**
 * SIGN IN, OR CREATE AN ACCOUNT, OR NEITHER.
 *
 * The third option is the one that decides the shape of this component. The engine
 * runs perfectly well for someone who types a name and nothing else — that is the
 * path every test and every smoke step drives — and an account changes exactly two
 * things: the run is kept, and what is typed is saved as it is typed.
 *
 * So this is an OFFER with its terms stated, not a gate. A product whose whole
 * proposition is that it does not make silent decisions on the reader's behalf does
 * not get to require a password in order to compute a setback.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE COPY HERE MAY NOT DO.
 *
 * An account proves who holds the account. It proves nothing about the licence
 * number typed beside it, and it enforces nothing about whether the person signing
 * an export is the person who authored the run. Both refusals are older than this
 * component and both survive it. No sentence below may imply that signing in makes
 * a run reviewed, verified, approved or compliant.
 *
 * NO DIGIT APPEARS IN ANY STRING. `antechamber.test.tsx` asserts the rendered text
 * of this screen carries no digit at all — a cheaper and stronger guarantee than
 * reviewing each sentence for a figure — so the password rule is written "twelve
 * characters" rather than with a numeral. The constraint is real either way; it
 * happens to read better as a word.
 *
 * ---------------------------------------------------------------------------
 * THE COPY IS IN `i18n/antechamber.en.ts`, UNDER `account`, AND NOT IN A MODULE OF
 * ITS OWN.
 *
 * This panel renders on one screen and nowhere else, so a dictionary per component
 * would split one page's copy across two files by implementation rather than by
 * what a reader meets. The one string on this screen that is NOT in a dictionary is
 * the server's own sentence for a failed sign-in: it is the only party that knows
 * why a sign-in failed, its wording is deliberately one message for both a wrong
 * password and an unknown email, and a translated copy of it would be a second
 * version of a record nobody issued. It is rendered as the server emitted it, and
 * isolated on the Arabic page so its punctuation stays at the end of its own
 * sentence.
 */

import { useId, useState, type FormEvent } from 'react';

import { AuthFailure } from '../api/auth.js';
import { AR } from '../i18n/antechamber.ar.js';
import { EN } from '../i18n/antechamber.en.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';
import { useSession } from '../session.js';

type Mode = 'in' | 'up';

/**
 * WHERE THE SENTENCE CAME FROM, CARRIED BESIDE IT.
 *
 * The panel has two sources for a failure line and they are not interchangeable:
 * one is the server's, which is a record and is never translated, and one is this
 * component's fallback for the case where there was no sentence at all. Collapsing
 * them into a bare `string` loses the distinction at exactly the moment the Arabic
 * page needs it — a Latin sentence dropped into an RTL paragraph with no isolation
 * renders its full stop at the wrong end.
 */
interface PanelError {
  readonly text: string;
  readonly fromServer: boolean;
}

export function AccountPanel(): JSX.Element {
  const t = useDict(EN, AR).account;
  const { locale } = useLocale();
  const { state, account, signIn, signUp, signOut } = useSession();
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [licence, setLicence] = useState('');
  const [error, setError] = useState<PanelError | null>(null);
  const [busy, setBusy] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const nameId = useId();
  const errorId = useId();
  const headingId = useId();
  const passwordHelpId = useId();
  const emailHelpId = useId();
  const nameHelpId = useId();
  const licenceId = useId();
  const licenceHelpId = useId();

  /*
    `checking` IS RENDERED, AND IT IS NOT RENDERED AS "SIGNED OUT".

    This panel is the first thing on the screen behind every call to action. A
    signed-in reader who sees a sign-in form flash on every navigation has been told
    their session was lost, which is both false and the single most alarming thing
    this screen could say.
  */
  if (state === 'checking') {
    return (
      <div className="plate ac-account ac-account--waiting">
        <p className="muted">{t.checking}</p>
      </div>
    );
  }

  if (state === 'offline') {
    /*
      NOT "SIGN IN TO CONTINUE". The server being unreachable is not evidence that
      the reader has no account, and sending them to a form that cannot submit is
      the wrong instruction. The name-only path below still works, because it is
      answered by the same server — so this says what is true and stops.
    */
    return (
      <div className="plate ac-account" data-state="deferred">
        <p>{t.offline}</p>
      </div>
    );
  }

  if (state === 'signed-in' && account) {
    return (
      <div className="plate ac-account" data-state="derived">
        <h2 className="ac-account__heading" id={headingId}>
          {t.signedIn.heading}
        </h2>
        <p>
          <strong>{account.name}</strong> · <span className="value">{account.email}</span>
        </p>
        <p className="fine-print">{t.signedIn.terms}</p>
        <p className="fine-print">
          {account.licence ? (
            <>
              {t.signedIn.licence}
              <span className="value">{account.licence}</span>
            </>
          ) : (
            t.signedIn.noLicence
          )}
        </p>
        <button type="button" className="button button--sm" onClick={() => void signOut()}>
          {t.signedIn.signOut}
        </button>
      </div>
    );
  }

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'in') await signIn(email, password);
      else {
        const asserted = licence.trim();
        await signUp({ email, password, name, ...(asserted ? { licence: asserted } : {}) });
      }
    } catch (err) {
      /*
        The server's sentence, verbatim, and never a rewrite of it. It is the only
        party that knows why — and its wording for a failed sign-in is deliberately
        one message for both a wrong password and an unknown email, which a helpful
        client-side rephrasing would undo. That holds across languages too: a
        translated failure line would be a second version of a sentence the server
        issued, so what is marked here is where it came from, not what it says.
      */
      setError(
        err instanceof AuthFailure
          ? { text: err.message, fromServer: true }
          : { text: t.error.unknown, fromServer: false },
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="plate ac-account">
      <h2 className="ac-account__heading" id={headingId}>
        {mode === 'in' ? t.heading.in : t.heading.up}
      </h2>

      <p className="ac-account__terms">{t.terms}</p>

      <form className="ac-account__form" onSubmit={(e) => void submit(e)} noValidate>
        {mode === 'up' ? (
          <div className="field">
            <label htmlFor={nameId}>{t.fields.name.label}</label>
            <input
              id={nameId}
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              aria-required="true"
              aria-describedby={nameHelpId}
            />
            {/* The rendered test only exercises the sign-in mode, so nothing would
                have caught this field being undescribed. Added because the rule is
                "every field", not "every field a test happens to render". */}
            <p className="field__help" id={nameHelpId}>
              {t.fields.name.help}
            </p>
          </div>
        ) : null}

        {mode === 'up' ? (
          <div className="field">
            <label htmlFor={licenceId}>{t.fields.licence.label}</label>
            <input
              id={licenceId}
              className="input"
              type="text"
              value={licence}
              onChange={(e) => setLicence(e.target.value)}
              autoComplete="off"
              aria-describedby={licenceHelpId}
            />
            <p className="field__help" id={licenceHelpId}>
              {t.fields.licence.help}
            </p>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor={emailId}>{t.fields.email.label}</label>
          <input
            id={emailId}
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            aria-required="true"
            aria-describedby={emailHelpId}
          />
          {/* EVERY FIELD CARRIES A DESCRIPTION, and `antechamber.test.tsx` asserts
              it rather than trusting it — a rule this panel broke on its first
              render. The description is a fact about the field, never a repeat of
              its label: the email signs you in and is not what appears on an
              export, and a reader is entitled to know which of the two it is. */}
          <p className="field__help" id={emailHelpId}>
            {t.fields.email.help}
          </p>
        </div>

        <div className="field">
          <label htmlFor={passwordId}>{t.fields.password.label}</label>
          <input
            id={passwordId}
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            /*
              `new-password` on the sign-up form and `current-password` on sign-in.
              One value for both makes a password manager offer to change a stored
              password every time somebody signs in.
            */
            autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
            required
            aria-required="true"
            aria-describedby={passwordHelpId}
          />
          <p className="field__help" id={passwordHelpId}>
            {mode === 'up' ? t.fields.password.helpUp : t.fields.password.helpIn}
          </p>
        </div>

        {error ? (
          <p className="ac__error" id={errorId} role="alert">
            {error.fromServer && locale === 'ar' ? (
              /* The server writes in one language by design. On the Arabic page its
                 sentence is a Latin run inside an RTL paragraph, and without
                 isolation its full stop renders at the wrong end of the line. On the
                 English page the document is already `lang="en" dir="ltr"`, so the
                 span would carry nothing and the markup stays as it was. */
              <Verbatim>{error.text}</Verbatim>
            ) : (
              error.text
            )}
          </p>
        ) : null}

        <div className="ac-account__actions">
          <button type="submit" className="button button--primary" disabled={busy}>
            {busy ? t.submit.busy : mode === 'in' ? t.submit.in : t.submit.up}
          </button>
          {/*
            A button, not a link. It changes what is on this screen and navigates
            nowhere, and a link that does not navigate is a control a keyboard
            reader is told the wrong thing about.
          */}
          <button
            type="button"
            className="button button--sm"
            onClick={() => {
              setMode(mode === 'in' ? 'up' : 'in');
              setError(null);
            }}
          >
            {mode === 'in' ? t.toggle.toUp : t.toggle.toIn}
          </button>
        </div>
      </form>
    </div>
  );
}
