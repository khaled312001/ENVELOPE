/**
 * `/app` with no actor — the antechamber.
 *
 * This is `ActorPrompt`, moved out of `App.tsx` and respecified as a public page.
 * It is the first screen behind EVERY public call to action — the fold's "run this
 * plot yourself", the readiness band's "open the engine anyway" and the nav's
 * "run a plot" — so it is site copy, it goes through the site's prohibitions test,
 * and it renders inside `SiteChrome` rather than replacing the page. A screen with
 * no nav and no colophon is a dead end, and this is the moment a reader's trust is
 * being converted into an action.
 *
 * Which makes it the worst place on the site to assert a control the software does
 * not perform. The first draft of this screen claimed the reviewer gate requires a
 * person who is not the author. It does not: `canReview`
 * (`apps/api/src/identity.ts:88-90`) tests that a licence string is non-empty and
 * nothing else, it is the only check the G4 handler makes (`server.ts:878`), and it
 * never compares the actor to `run.createdByActorId`. So one person holding one
 * licence number can author a run and sign it, and this deployment records that as
 * a reviewed export. Separation of duties is a control this software does not have,
 * and an asserted control is worse than a missing one because a missing one is
 * visible. The second line below says so in the reader's own words.
 *
 * THREE LINES ABOVE THE FIELDS, in this order and for these reasons:
 *
 *   why we ask       — the name is printed on the export and recorded against each
 *                      gate, so any figure can be traced to whoever entered it, and
 *                      there is no anonymous mode;
 *   the licence      — recorded, not confirmed with anybody, and not compared with
 *                      the author (R11, and `/refusals` §7 carries it in full);
 *   what this is not — no password, no session, no token. Not authentication.
 *
 * The same material lives once more, as a refusal, in `content/shared.tsx`'s
 * `professional` entry. That is deliberate rather than a duplication to collapse:
 * this is the field-side statement, made where the field is, and that is the
 * refusal-page item. If the two ever disagree the shared one is the source.
 *
 * NO FIGURE APPEARS ON THIS PAGE — no bay count, no capacity, no rule count, no
 * readiness figure — and it reads no fixture. `antechamber.test.tsx` asserts the
 * rendered text carries no digit at all, which is a stronger and cheaper guarantee
 * than reviewing each sentence for one.
 *
 * ---------------------------------------------------------------------------
 * THE COPY LIVES IN `i18n/antechamber.en.ts`, AND THE SHAPE OF THAT MODULE IS THE
 * CONTRACT `antechamber.ar.ts` IS HELD TO.
 *
 * Nothing was edited on the way out: the English rendering of this screen is
 * byte-identical to what it was before the strings moved, which is the only
 * property that makes the extraction safe to do at all. What did NOT move is
 * everything the engine and the visitor supply — the step ids, and the step id
 * echoed back from the address. Those are not interface copy in either language.
 */

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';

import type { Actor } from '../api/client.js';
import { guestKey } from '../api/guest-key.js';
import type { PageProps } from '../Root.js';
import { AccountPanel } from '../components/AccountPanel.js';
import { AR } from '../i18n/antechamber.ar.js';
import { EN } from '../i18n/antechamber.en.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';
import { Link } from '../router.js';

/**
 * THE STEP IDS, AND THIS LIST IS A SECOND COPY OF `App.tsx`'s `STEPS`.
 *
 * Said out loud rather than left to be discovered. `STEPS` is module-private to
 * `App.tsx`, this file's author does not own that module, and the antechamber has
 * to name the steps that exist in order to refuse an id that does not — so the
 * choice was a duplicated list or a silently ignored hint, and a silently ignored
 * hint is the defect `/404` exists to refuse. The list is ids only: `App.tsx` owns
 * the labels, and copying those as well would put two spellings of "Parameters" on
 * one site.
 *
 * The repair is one line in a file this page may not touch: export the ids from
 * `App.tsx` and import them here. Reported rather than performed.
 *
 * THEY ARE NOT IN THE DICTIONARY AND MAY NOT BE. They are the engine's own names
 * for its steps — the same class of string as a rule id or a parameter id — and a
 * translated step id would name a step nothing in `App.tsx` answers to.
 */
const STEP_IDS = [
  'intake',
  'plot',
  'parameters',
  'rules',
  'assumptions',
  'capacity',
  'parking',
  'checks',
  'evidence',
  'export',
] as const;

/**
 * `actor` is deliberately not read.
 *
 * `Root` renders this component only when the actor is null; with one it renders
 * `EngineApp` instead. If an actor ever reaches here that is a routing bug in
 * `Root`, and papering over it with a redirect would hide the bug on the one screen
 * where identity is the whole subject. It renders normally and the defect stays
 * visible.
 */
export default function Antechamber({ setActor, navigate, search }: PageProps): JSX.Element {
  const t = useDict(EN, AR);
  const { locale } = useLocale();
  const [name, setName] = useState('');
  const [licence, setLicence] = useState('');
  const [nameMissing, setNameMissing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // `useId` rather than literal ids: `EngineApp` stays mounted in a hidden div
  // beside this page, so a literal id here is a collision waiting for the day that
  // component renders a field of the same name.
  const uid = useId();
  const nameId = `${uid}-name`;
  const nameHelpId = `${uid}-name-help`;
  const nameErrorId = `${uid}-name-error`;
  const licenceId = `${uid}-licence`;
  const licenceHelpId = `${uid}-licence-help`;
  const formHeadingId = `${uid}-form-heading`;

  /*
    ISOLATED ON THE ARABIC PAGE, AND UNTOUCHED ON THE ENGLISH ONE.

    A Latin run inside an Arabic sentence is reordered by the bidirectional
    algorithm at its boundaries, so the closing quotation mark of `“notastep”` and
    the full stop after the step list migrate to the wrong end of the line.
    `Verbatim` sets `dir="ltr" lang="en"` and `rtl.css` isolates it, which fixes
    both.

    It is applied only when the page is in Arabic, and that is not a shortcut. On
    the English page the document is already `lang="en" dir="ltr"`, so the span
    would carry no information a reader or a screen reader could use — and this
    screen's whole English rendering is asserted to be unchanged by the extraction
    that moved its copy into a dictionary. A wrapper that changes the markup in the
    language nobody asked to change is a diff nothing here can justify.
  */
  const ltr = (value: string): ReactNode => (locale === 'ar' ? <Verbatim>{value}</Verbatim> : value);

  /*
    THE DEEP-LINK HINTS ARRIVE HERE AND MUST LEAVE UNCHANGED.

    Public calls to action carry `?demo=worked-example` or `?step=<id>`. Acting on
    them is `EngineApp`'s job; not dropping them is this screen's. The submit
    therefore calls `setActor` and NOTHING ELSE — no `navigate('/app')`, which is
    the obvious-looking line that would rewrite the URL without its query and land a
    visitor who clicked "run this plot yourself" on a blank intake form. `Root`
    keeps the route and `useRouter` keeps `search`, so the hint survives by not
    being touched.
  */
  const params = new URLSearchParams(search);
  const askedForDemo = params.get('demo') === 'worked-example';
  const askedForStep = params.get('step');
  const unknownStep =
    askedForStep !== null && !(STEP_IDS as readonly string[]).includes(askedForStep)
      ? askedForStep
      : null;

  const submit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const person = name.trim();
    if (!person) {
      // The submit does nothing until a name is present, and it says why in text
      // beside the field rather than in a colour, a shake or a disabled control.
      // The button stays enabled on purpose: `app.css` carries the record that the
      // most common report of this screen was "the Continue button does nothing",
      // which is exactly what a disabled control tells a reader who cannot focus it
      // to find out why.
      setNameMissing(true);
      nameRef.current?.focus();
      return;
    }
    const trimmedLicence = licence.trim();
    const actor: Actor = {
      /*
        A KEY, NOT THE NAME.

        The id was the name, lower-cased — so two people who typed "Khaled Ahmed"
        were one actor, and each could open the other's runs. The server now gives a
        guest exactly the runs its id authored (`apps/api/src/access.ts`), which
        makes the id the only thing between one guest's work and another's. It has
        to be unguessable, and a name is the most guessable string there is.
      */
      id: guestKey(),
      name: person,
      ...(trimmedLicence ? { licence: trimmedLicence } : {}),
    };
    setActor(actor);
  };

  return (
    <div className="ac">
      <section className="shell section section--opening">
        <h1 className="ac__title">{t.hero.title}</h1>

        <div className="ac__lede">
          <p>{t.hero.lede.record}</p>
          {/* "NOT VERIFIED", IN THOSE WORDS. The sentence used to read "not confirmed
              with any authority", which is true and reads softer: verification is the
              control a reader assumes a licence field implies, so the denial has to use
              the reader's own word or it is answering a question nobody asked.
              `scripts/smoke.mjs` asserts the phrase on this screen for the same reason —
              it is the first screen behind every public call to action, and so the worst
              place on the site to imply a control the software does not have. */}
          <p>{t.hero.lede.licence}</p>
          {/*
            THIS PARAGRAPH USED TO SAY "THERE IS NO PASSWORD, NO SESSION AND NO
            TOKEN. THIS IS NOT AUTHENTICATION." IT WAS TRUE AND IT IS NOW FALSE.

            There is a password, a session and a token, and leaving the old sentence
            standing would have been the same defect as an unverified licence field
            one register louder: copy asserting the ABSENCE of a control the software
            has, on the screen where a reader decides whether to believe the rest of
            the site.

            What has NOT changed is the pair of refusals either side of it, and they
            are restated here rather than assumed to carry over. An account proves
            who holds the account. It proves nothing about the licence, and it
            enforces nothing about who signs.
          */}
          <p>{t.hero.lede.account}</p>
        </div>
      </section>

      {/*
        THE ACCOUNT PANEL SITS ABOVE THE NAME, AND THAT ORDER IS THE OFFER.

        Reading down: here is what an account does, here is the form for one, and
        here — below it — is the name field that opens the engine without one. A
        reader who wants neither scrolls past a panel; a reader who wants one never
        has to hunt for it. The reverse order would have made the account look like
        an afterthought bolted under a form, which is the opposite of what it is.
      */}
      <section className="shell section section--minor">
        <AccountPanel />
      </section>

      <section className="shell section section--minor" aria-labelledby={formHeadingId}>
        {/* `.section__head` rather than a rule of this page's own: the chassis owns
            the h2's size, weight, tracking and cap-line trim, and a second
            declaration of them here is a second answer to a question already
            settled. There is no index numeral — this is a form, not a numbered
            movement of an argument. */}
        <div className="section__head">
          <h2 id={formHeadingId}>{t.form.heading}</h2>
        </div>

        {/*
          `noValidate`, with `required` kept on the input.

          The constraint is real and belongs in the markup, but a native validation
          bubble is a transient tooltip that vanishes on the next keystroke and is
          not a persistent description of the field. The reason is stated in text,
          associated by `aria-describedby`, and it stays on the page.
        */}
        <form className="plate ac__form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={nameId}>{t.form.name.label}</label>
            <input
              id={nameId}
              ref={nameRef}
              className="input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameMissing) setNameMissing(false);
              }}
              autoComplete="name"
              required
              aria-required="true"
              {...(nameMissing ? { 'aria-invalid': true as const } : {})}
              aria-describedby={nameMissing ? `${nameHelpId} ${nameErrorId}` : nameHelpId}
            />
            <p className="field__help" id={nameHelpId}>
              {t.form.name.help}
            </p>
            {nameMissing ? (
              <p className="ac__error" id={nameErrorId}>
                <strong>{t.form.name.error.lead}</strong> {t.form.name.error.body}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor={licenceId}>{t.form.licence.label}</label>
            <input
              id={licenceId}
              className="input"
              type="text"
              value={licence}
              onChange={(e) => setLicence(e.target.value)}
              autoComplete="off"
              aria-describedby={licenceHelpId}
            />
            {/* The reader who skips the prose above still meets the fact at the
                field, in one clause, because the field is where the assertion is
                made. */}
            <p className="field__help" id={licenceHelpId}>
              {t.form.licence.help}
            </p>
          </div>

          {askedForDemo || unknownStep !== null ? (
            <div className="ac__hints">
              {askedForDemo ? (
                /*
                  WHAT THIS LINE MAY CLAIM, AND WHERE IT STOPS.

                  The hint is carried through untouched — that is this screen's own
                  behaviour and it is verifiable here. What happens next is
                  `EngineApp`'s, and its effect reads `step` only: nothing in
                  `App.tsx` parses `demo` today. So the sentence describes the
                  request and the pass-through, and stops short of promising that
                  the recorded run loads. Promising it would be the exact class of
                  defect this product exists to prevent, on the page where a reader
                  is deciding whether to believe the rest of the site.
                */
                <p className="callout">
                  <span className="callout__body">{t.form.hints.demo}</span>
                </p>
              ) : null}

              {unknownStep !== null ? (
                /* An unrecognised step id is not silently ignored anywhere in this
                   flow. Quietly serving a different screen from the one the address
                   asked for is what `/404` exists to refuse, and it does not stop
                   being that inside `/app`.

                   The id is the VISITOR's text and the list is the ENGINE's, so
                   neither is translated and the sentence is written around them —
                   `lead`, `between` and `tail` in the dictionary. */
                <p className="callout">
                  <span className="callout__body">
                    {t.form.hints.unknownStep.lead}
                    {ltr(unknownStep)}
                    {t.form.hints.unknownStep.between}
                    {ltr(STEP_IDS.join(', '))}
                    {t.form.hints.unknownStep.tail}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="cta">
            {/* The button names its outcome. "Continue" names the click. */}
            <button type="submit" className="button button--primary">
              {t.form.cta.submit}
            </button>
            {/* Beside the button and never under it: this is the reader most likely
                to want the licence-and-authorship material, and it is §7 of that
                page. */}
            <Link to="/refusals" className="button" navigate={navigate}>
              {t.form.cta.refusals}
            </Link>
            <span className="cta__note">{t.form.cta.note}</span>
          </div>
        </form>
      </section>

      {/*
        R5 — every page ends on a limit, never on a call to action. On a page whose
        whole body is a form that is a real constraint rather than a formality: the
        last thing a reader meets before entering a name should be what entering it
        does not buy them.
      */}
      <section className="shell section section--minor reveal">
        <div className="section__head">
          <h2>{t.closing.heading}</h2>
        </div>
        <div className="ac__lede">
          <p>{t.closing.body}</p>
          <p>
            {t.closing.readiness.lead}
            <Link to="/dashboard" navigate={navigate}>
              {t.closing.readiness.link}
            </Link>
            {t.closing.readiness.tail}
          </p>
        </div>
      </section>
    </div>
  );
}
