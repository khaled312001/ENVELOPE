/**
 * `/work?run=…` — one stored run, as a page of its own.
 *
 * A query on `/work` rather than a route with a parameter: the router is flat on
 * purpose (see `router.tsx`), and a run page is `/work` in a different state — the
 * same account, the same list, one row opened.
 *
 * WHAT IT SHOWS, AND WHERE EACH PART COMES FROM.
 *
 * - The answer: the run's own figures, as the API stored them. Nothing is
 *   recomputed; a run page that re-executed the engine could show a number the run
 *   never had.
 * - The building: the run's `building`, stood up with the same viewer the engine
 *   uses, still until the reader turns it on. A run stored before the model said
 *   which levels the answer places is drawn whole, and the caption says so.
 * - The other runs of the same plot, as rows. They are separate runs with separate
 *   inputs, so nothing is computed between them — no difference, no change, no
 *   "best". The reader compares; the page does not.
 * - Sharing, for the run's author only. The server answers the same way whether or
 *   not an account uses the address, and so does this page, so it cannot be used to
 *   find out who has an account.
 *
 * TWO LANGUAGES. Every sentence comes from `i18n/runPage.en.ts` or its Arabic twin;
 * everything the run carries — plot, community, figures, the binding label, names,
 * timestamps, the gate id — is set as the API sent it, inside `Ltr` on the Arabic
 * page. The refusals above are held in both dictionaries by `work.test.tsx`.
 */

import { type FormEvent, type ReactNode, useEffect, useId, useState } from 'react';

import { AuthFailure, accountRuns, type RunAccess } from '../api/auth.js';
import type { RunView } from '../api/client.js';
import { ModelFigure } from '../components/ModelFigure.js';
import { AR } from '../i18n/runPage.ar.js';
import { EN } from '../i18n/runPage.en.js';
import { useDict } from '../i18n/locale.js';
import { Link, type Href } from '../router.js';
import { group, Ltr, RunTable, useBandLabel, type RunRow } from './Work.js';

const day = (iso: string): string => iso.slice(0, 10);
const time = (iso: string): string => iso.slice(11, 16);

/** The review gate's id, as the engine names it. An identifier, so not copy. */
const REVIEW_GATE = 'G4';

type Stored = RunView & { readonly access: RunAccess };

/**
 * Why the run did not load, as a kind: a sentence stored in state would stay in the
 * language the page was in when the request failed.
 *
 * `missing` covers BOTH a run that does not exist and a run that was not shared with
 * you. The server gives one 404 for both so a run's existence does not leak, and a
 * page with two kinds here would leak it anyway.
 */
type LoadError = 'missing' | 'failed';

export function RunPage({
  runId,
  rows,
  navigate,
}: {
  readonly runId: string;
  /** Every run on the account's list, authored and shared — the page looks up its siblings here. */
  readonly rows: readonly RunRow[];
  readonly navigate: (to: Href) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const bandLabel = useBandLabel();
  const [run, setRun] = useState<Stored | null>(null);
  const [error, setError] = useState<LoadError | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRun(null);
    setError(null);
    accountRuns
      .get(runId)
      .then((r) => {
        if (!cancelled) setRun(r);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // One sentence for "missing" and "not yours", because the server gives one answer for both.
        setError(e instanceof AuthFailure && e.status === 404 ? 'missing' : 'failed');
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const row = rows.find((r) => r.runId === runId);
  const siblings = run
    ? rows.filter(
        (r) => r.runId !== runId && r.plotNumber === run.plot.plotNumber && r.community === run.plot.community,
      )
    : [];

  return (
    <div className="wk rn">
      <section className="shell section section--opening" aria-labelledby="rn-h">
        <p className="rn__back">
          <Link to="/work" navigate={navigate}>
            {t.back}
          </Link>
        </p>
        <h1 id="rn-h">
          {run ? (
            <>
              {t.plot}
              <Ltr>{run.plot.plotNumber}</Ltr>
            </>
          ) : (
            t.aRun
          )}
        </h1>
        {run ? (
          <p className="wk__lede">
            <Ltr>{run.plot.community}</Ltr>
            {row ? (
              <>
                {t.lede.computedAt}
                <Ltr>{`${day(row.createdAt)} ${time(row.createdAt)}`}</Ltr>
                {t.lede.by}
                <Ltr>{row.createdBy}</Ltr>
              </>
            ) : (
              t.lede.computedEarlier
            )}
            {t.lede.kept}
          </p>
        ) : null}
        {run?.draftRules ? (
          <p className="rn__draft">
            <span className="chip chip--deferred">{t.draftChip}</span>
            {t.draftNote}
          </p>
        ) : null}
      </section>

      {error ? (
        <section className="shell section section--minor">
          <p className="banner banner--danger" role="alert">
            {t.error[error]}
          </p>
        </section>
      ) : null}

      {!run && !error ? (
        <section className="shell section section--minor">
          <p className="muted">{t.loading}</p>
        </section>
      ) : null}

      {run ? (
        <>
          <section className="shell section" aria-labelledby="rn-answer">
            <div className="section__head">
              <h2 id="rn-answer">{t.answer.title}</h2>
            </div>
            <div className="rn__layout">
              <dl className="rn__facts">
                <div>
                  <dt>{t.answer.governing}</dt>
                  <dd className="rn__governing">
                    <span className="value">{group(run.capacity.governingGfa.value)}</span> m²
                    <span className="wk__band">{bandLabel(run.capacity.governingBand)}</span>
                  </dd>
                </div>
                <div>
                  <dt>{t.answer.binds}</dt>
                  <dd>
                    <Ltr>{run.capacity.governingConstraint.label}</Ltr>
                  </dd>
                </div>
                <div>
                  <dt>{t.answer.levels}</dt>
                  <dd>
                    <span className="value">{run.capacity.levels.value}</span>
                    {t.answer.levelsOf}
                    <span className="value">{run.envelope.maxLevelsByHeight.value}</span>
                    {t.answer.heightPermits}
                  </dd>
                </div>
                <div>
                  <dt>{t.answer.assumed}</dt>
                  <dd>
                    <span className="value">{run.assumptions.length}</span>
                  </dd>
                </div>
                {row ? (
                  <div>
                    <dt>{t.answer.gates}</dt>
                    <dd>
                      <span className="value">{row.gatesSatisfied}</span>
                      {t.answer.gatesOf}
                      <span className="value">4</span>
                      {row.reviewer ? (
                        <>
                          {t.answer.signedBy}
                          <Ltr>{row.reviewer.name}</Ltr>
                        </>
                      ) : (
                        t.answer.notSigned
                      )}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <figure className="figure rn__model">
                <div className="figure__plate">
                  {run.building ? (
                    <ModelFigure model={run.building} label={t.model.label(run.capacity.levels.value)} />
                  ) : (
                    <p className="rn__nomodel">{t.model.none}</p>
                  )}
                </div>
                <figcaption className="figure__caption">
                  <p className="figure__source">
                    {run.building?.placedLevels ? t.model.placed : run.building ? t.model.stored : ''}
                    {t.model.tail}
                  </p>
                </figcaption>
              </figure>
            </div>
          </section>

          <section className="shell section" aria-labelledby="rn-siblings">
            <div className="section__head">
              <h2 id="rn-siblings">{t.siblings.title}</h2>
              <p className="wk__note">{t.siblings.note}</p>
            </div>
            <RunTable
              rows={siblings}
              caption={t.siblings.caption(run.plot.plotNumber)}
              empty={t.siblings.empty}
              navigate={navigate}
            />
          </section>

          <section className="shell section section--minor" aria-labelledby="rn-share">
            <div className="section__head">
              <h2 id="rn-share">{t.share.title}</h2>
            </div>
            {run.access === 'author' ? (
              <ShareForm runId={runId} />
            ) : (
              <p className="wk__note">
                {t.share.asBefore}
                {t.roles[run.access]}
                {t.share.asAfter}
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

type Role = 'reviewer' | 'reader';

/** What went wrong with a share, as a kind — the sentence is the dictionary's. */
type Problem = 'email' | 'role' | 'session' | 'failed';

function ShareForm({ runId }: { readonly runId: string }): JSX.Element {
  const t = useDict(EN, AR);
  const emailId = useId();
  const helpId = useId();
  const errorId = useId();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ readonly email: string; readonly role: Role } | null>(null);

  const submit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const address = email.trim();
    if (!address.includes('@')) {
      setProblem('email');
      return;
    }
    if (role === null) {
      setProblem('role');
      return;
    }
    setProblem(null);
    setSending(true);
    accountRuns
      .share(runId, address, role)
      .then(() => {
        setDone({ email: address, role });
        setEmail('');
        setRole(null);
      })
      .catch((err: unknown) => {
        setProblem(err instanceof AuthFailure && err.status === 401 ? 'session' : 'failed');
      })
      .finally(() => setSending(false));
  };

  const choices: readonly (readonly [Role, string, ReactNode])[] = [
    [
      'reviewer',
      t.form.review.title,
      <>
        {t.form.review.detailBefore}
        <Ltr>{REVIEW_GATE}</Ltr>
        {t.form.review.detailAfter}
      </>,
    ],
    ['reader', t.form.read.title, t.form.read.detail],
  ];

  return (
    <form className="plate rn__share" onSubmit={submit} noValidate>
      <p className="wk__note">
        {t.form.noteBefore}
        <Ltr>{REVIEW_GATE}</Ltr>
        {t.form.noteAfter}
      </p>
      <div className="field">
        <label htmlFor={emailId}>{t.form.email}</label>
        <input
          id={emailId}
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          aria-describedby={problem ? `${helpId} ${errorId}` : helpId}
          {...(problem && !email.includes('@') ? { 'aria-invalid': true as const } : {})}
        />
        <p className="field__help" id={helpId}>
          {t.form.emailHelp}
        </p>
      </div>
      <fieldset className="choice-set">
        <legend className="field-group__legend">{t.form.legend}</legend>
        {choices.map(([value, title, detail]) => (
          <label key={value} className={`choice ${role === value ? 'is-selected' : ''}`}>
            <input type="radio" name={`share-role-${runId}`} value={value} checked={role === value} onChange={() => setRole(value)} />
            <span>
              <strong>{title}</strong>
              <span className="choice__detail">{detail}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {problem ? (
        <p className="ac__error" id={errorId} role="alert">
          {t.form.problem[problem]}
        </p>
      ) : null}
      <div className="cta">
        <button type="submit" className="button button--primary" disabled={sending} aria-busy={sending}>
          {sending ? t.form.sending : t.form.submit}
        </button>
      </div>
      {done ? (
        <p className="rn__shared" role="status">
          {t.form.done.before}
          <Ltr>{done.email}</Ltr>
          {t.form.done.middle}
          {t.roles[done.role]}
          {t.form.done.after}
        </p>
      ) : null}
    </form>
  );
}
