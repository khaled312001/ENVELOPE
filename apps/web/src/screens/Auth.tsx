/**
 * `/sign-in` and `/sign-up` — one component, two routes.
 *
 * ---------------------------------------------------------------------------
 * WHY TWO ROUTES AND NOT A TAB.
 *
 * A tabbed panel is one address for two intentions, so a link cannot say which
 * one it means, the back button cannot return to the other, and a reader sent
 * "create an account here" lands on a sign-in form. Two routes, each with its own
 * title, description and history entry; the switch between them is a link, not a
 * state.
 *
 * And it is ONE COMPONENT, because the two forms differ by two fields and a verb.
 * Two files would be one file plus a copy of the argument about what an account
 * is and is not — and that argument is the part that must not drift.
 *
 * ---------------------------------------------------------------------------
 * FOUR OF THE SIX AUTH SCREENS IN §6.2 ARE NOT BUILT, and the reason is §6.4's
 * rule rather than time: *no screen ships before the server enforces what it
 * displays.*
 *
 *   `/forgot-password`, `/reset-password`  need a token store and a mailer.
 *   `/verify-email`                        needs a mailer.
 *   `/accept-invite`                       needs invitations, which need tenancy.
 *
 * This deployment sends no email. A "forgot your password" link would be a link
 * to a form that cannot work, and a greyed one would be a promise with no date
 * attached. So the screen SAYS there is no reset — `noRecovery` — which is the
 * honest version of the same information, in the place a reader looks for the
 * link that is not there.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE COPY MAY NOT DO.
 *
 * An account changes exactly two things: the run is kept, and what was typed is
 * saved as it was typed. It does not make a run reviewed, verified, approved or
 * compliant, and nothing here checks the licence number beside it. A sign-up
 * screen is the place in a product where a promise is most likely to be made and
 * least likely to be read by anyone who could check it — so both halves are on
 * the page, in the aside, on both routes.
 *
 * NO AMBER. Nothing on this screen is an `ASSUMED` value.
 */

import { useId, useState, type FormEvent } from 'react';

import { AuthFailure } from '../api/auth.js';
import { AR } from '../i18n/auth.ar.js';
import { EN } from '../i18n/auth.en.js';
import { useDict, useLocale } from '../i18n/locale.js';
import { Figure } from '../img.js';
import type { PageProps } from '../Root.js';
import { Link } from '../router.js';
import { useSession } from '../session.js';

type Mode = 'in' | 'up';

/**
 * A failure, with where the sentence came from.
 *
 * The same shape `AccountPanel` and `Settings` use, for the same reason: the
 * server's sentence is a record and is rendered verbatim; this file's fallback is
 * interface copy and is translated. A bare `string` loses the distinction exactly
 * where the Arabic page needs it — a Latin sentence dropped into an RTL paragraph
 * renders its full stop at the wrong end.
 */
interface Failure {
  readonly text: string;
  readonly fromServer: boolean;
}

/**
 * WHERE A READER GOES AFTER SIGNING IN.
 *
 * `?next=` from the query string, and only ever a path on this site. An open
 * redirect is the classic bug in exactly this parameter: `?next=https://…` on a
 * sign-in page is how a phishing link borrows a real domain's sign-in form. So the
 * value must start with a single `/` and must not start with `//`, which is a
 * protocol-relative URL and therefore another origin.
 */
function safeNext(search: string): string {
  const raw = new URLSearchParams(search).get('next');
  if (!raw) return '/work';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/work';
  return raw;
}

export function AuthScreen({ mode, page }: { readonly mode: Mode; readonly page: PageProps }) {
  const t = useDict(EN, AR);
  const { locale } = useLocale();
  const rtl = locale === 'ar';
  const { state, account, signIn, signUp } = useSession();
  const copy = mode === 'in' ? t.in : t.up;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [licence, setLicence] = useState('');
  const [reveal, setReveal] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Failure | null>(null);

  const emailId = useId();
  const emailHelpId = useId();
  const passwordId = useId();
  const passwordHelpId = useId();
  const nameId = useId();
  const nameHelpId = useId();
  const nameErrorId = useId();
  const licenceId = useId();
  const licenceHelpId = useId();
  const errorId = useId();

  const nameMissing = mode === 'up' && nameTouched && name.trim() === '';

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (mode === 'up' && name.trim() === '') {
      setNameTouched(true);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'in') await signIn(email, password);
      else {
        await signUp({
          email,
          password,
          name: name.trim(),
          ...(licence.trim() ? { licence: licence.trim() } : {}),
        });
      }
      page.navigate(safeNext(page.search) as never);
    } catch (err) {
      setError(
        err instanceof AuthFailure
          ? { text: err.message, fromServer: true }
          : { text: t.failed, fromServer: false },
      );
    } finally {
      setBusy(false);
    }
  }

  /*
    ALREADY SIGNED IN IS A STATE THIS PAGE ANSWERS, NOT ONE IT REDIRECTS AWAY
    FROM.

    A reader who follows a bookmark to `/sign-in` while signed in has not made a
    mistake, and bouncing them to a page they did not ask for hides which account
    they are in — which is the one thing they were most likely checking. So it
    says who, and offers the two places they were probably going.

    `checking` falls through to the form rather than rendering a spinner: it lasts
    one request, and a flash of "you are signed in" followed by a form is worse
    than either.
  */
  if (state === 'signed-in' && account) {
    return (
      <div className="auth">
        <section className="shell section section--opening">
          <h1 className="auth__title">{copy.title}</h1>
          <p className="auth__lede">
            {t.signedIn.before}
            <strong>{account.name}</strong>
            {t.signedIn.after}
          </p>
          <div className="cta">
            <Link to="/work" className="button button--primary" navigate={page.navigate}>
              {t.signedIn.cta}
            </Link>
            <Link to="/settings" className="button" navigate={page.navigate}>
              {t.signedIn.settings}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="shell section section--opening auth__split">
        <div className="auth__form-col">
          <h1 className="auth__title">{copy.title}</h1>
          <p className="auth__lede">{copy.lede}</p>

          <form className="auth__form" onSubmit={submit} noValidate>
            {mode === 'up' ? (
              <>
                <div className="field">
                  <label htmlFor={nameId}>{t.fields.name.label}</label>
                  <input
                    id={nameId}
                    className="input"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameTouched(true);
                    }}
                    onBlur={() => setNameTouched(true)}
                    autoComplete="name"
                    aria-required="true"
                    {...(nameMissing ? { 'aria-invalid': true as const } : {})}
                    aria-describedby={nameMissing ? `${nameHelpId} ${nameErrorId}` : nameHelpId}
                  />
                  <p className="field__help" id={nameHelpId}>
                    {t.fields.name.help}
                  </p>
                  {nameMissing ? (
                    <p className="auth__error" id={nameErrorId}>
                      {t.fields.name.missing}
                    </p>
                  ) : null}
                </div>

                <div className="field">
                  <label htmlFor={licenceId}>
                    {t.fields.licence.label}{' '}
                    <span className="field__optional">({t.fields.licence.optional})</span>
                  </label>
                  <input
                    id={licenceId}
                    className="input"
                    type="text"
                    value={licence}
                    onChange={(e) => setLicence(e.target.value)}
                    aria-describedby={licenceHelpId}
                  />
                  <p className="field__help" id={licenceHelpId}>
                    {t.fields.licence.help}
                  </p>
                </div>
              </>
            ) : null}

            <div className="field">
              <label htmlFor={emailId}>{t.fields.email.label}</label>
              <input
                id={emailId}
                className="input"
                type="email"
                inputMode="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-required="true"
                aria-describedby={emailHelpId}
              />
              {/* On sign-in the address is a credential and needs no explanation;
                  on sign-up it is a decision, so the consequence is stated. */}
              {mode === 'up' ? (
                <p className="field__help" id={emailHelpId}>
                  {t.fields.email.help}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor={passwordId}>{t.fields.password.label}</label>
              {/*
                THE REVEAL IS A BUTTON INSIDE THE FIELD, AND ITS NAME IS A VERB.

                Not an eye glyph with no name, which is what every product in the
                survey ships. `aria-pressed` would be wrong — this is not a setting
                that persists, it is an action whose name changes with the state —
                so the name is "Show the password" / "Hide the password" and that
                is the whole announcement.

                It is `type="button"`. A bare `<button>` inside a `<form>` submits.
              */}
              <div className="auth__reveal-wrap">
                <input
                  id={passwordId}
                  className="input auth__reveal-input"
                  type={reveal ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                  aria-required="true"
                  {...(mode === 'up' ? { 'aria-describedby': passwordHelpId } : {})}
                />
                <button
                  type="button"
                  className="auth__reveal"
                  onClick={() => setReveal((v) => !v)}
                >
                  {reveal ? t.fields.password.hide : t.fields.password.show}
                </button>
              </div>
              {mode === 'up' ? (
                <p className="field__help" id={passwordHelpId}>
                  {t.fields.password.help}
                </p>
              ) : null}
            </div>

            {/*
              `aria-live="polite"` on a container that is ALWAYS in the document.

              A region that appears at the same moment its content does is not
              announced by most screen readers — the live region has to exist
              before the text arrives. This is the mistake that makes an inline
              form error silent, and it is invisible to every test that only
              checks the text is present.
            */}
            <div className="auth__live" aria-live="polite" id={errorId}>
              {error ? (
                <p className="auth__error">
                  {error.fromServer && rtl ? (
                    <span dir="ltr" lang="en">
                      {error.text}
                    </span>
                  ) : (
                    error.text
                  )}
                </p>
              ) : null}
            </div>

            <div className="cta">
              <button type="submit" className="button button--primary" disabled={busy}>
                {busy ? copy.busy : copy.submit}
              </button>
              {new URLSearchParams(page.search).get('next') ? (
                <span className="cta__note">{t.returning}</span>
              ) : null}
            </div>
          </form>

          <p className="auth__switch">
            {copy.switchPrompt}{' '}
            <Link to={mode === 'in' ? '/sign-up' : '/sign-in'} navigate={page.navigate}>
              {copy.switchCta}
            </Link>
          </p>

          {mode === 'in' ? <p className="auth__note">{t.noRecovery}</p> : null}
        </div>

        {/*
          THE ASIDE IS THE OFFER AND ITS LIMIT, and the image is behind it.

          `Figure` renders NOTHING while the file is absent — no element and
          no request — so this column is the two paragraphs today and the two
          paragraphs over a drawing when #18 arrives. The layout does not change
          shape either way, which is why the panel is a background layer rather
          than a sibling column that would collapse.
        */}
        <aside className="auth__aside" aria-label={t.aside.what}>
          <Figure name="auth-panel" className="auth__panel-img" />
          <div className="auth__aside-body">
            <p>{t.aside.what}</p>
            <p className="auth__aside-not">{t.aside.not}</p>
            <p className="auth__aside-guest">{t.aside.guest}</p>
            <Link to="/app" className="button button--sm" navigate={page.navigate}>
              {t.aside.guestCta}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function SignIn(page: PageProps): JSX.Element {
  return <AuthScreen mode="in" page={page} />;
}

export function SignUp(page: PageProps): JSX.Element {
  return <AuthScreen mode="up" page={page} />;
}
