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
 */

import { type FormEvent, useEffect, useId, useState } from 'react';

import { AuthFailure, accountRuns, type RunAccess } from '../api/auth.js';
import type { RunView } from '../api/client.js';
import { ModelFigure } from '../components/ModelFigure.js';
import { Link, type Href } from '../router.js';
import { bandLabel, group, RunTable, type RunRow } from './Work.js';

const day = (iso: string): string => iso.slice(0, 10);
const time = (iso: string): string => iso.slice(11, 16);

type Stored = RunView & { readonly access: RunAccess };

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
  const [run, setRun] = useState<Stored | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setError(
          e instanceof AuthFailure && e.status === 404
            ? 'This run is not on your list. Either it does not exist, or it was not shared with you.'
            : 'The run could not be loaded. Reload the page to try again.',
        );
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
            Your work
          </Link>
        </p>
        <h1 id="rn-h">{run ? `Plot ${run.plot.plotNumber}` : 'A run'}</h1>
        {run ? (
          <p className="wk__lede">
            {run.plot.community} · computed {row ? `${day(row.createdAt)} ${time(row.createdAt)}` : 'earlier'}
            {row ? ` by ${row.createdBy}` : ''}. Kept exactly as it was computed; nothing on this
            page is recomputed.
          </p>
        ) : null}
        {run?.draftRules ? (
          <p className="rn__draft">
            <span className="chip chip--deferred">draft rules</span> Computed against rules no
            named professional has approved.
          </p>
        ) : null}
      </section>

      {error ? (
        <section className="shell section section--minor">
          <p className="banner banner--danger" role="alert">
            {error}
          </p>
        </section>
      ) : null}

      {!run && !error ? (
        <section className="shell section section--minor">
          <p className="muted">Loading the run…</p>
        </section>
      ) : null}

      {run ? (
        <>
          <section className="shell section" aria-labelledby="rn-answer">
            <div className="section__head">
              <h2 id="rn-answer">The answer</h2>
            </div>
            <div className="rn__layout">
              <dl className="rn__facts">
                <div>
                  <dt>Governing capacity</dt>
                  <dd className="rn__governing">
                    <span className="value">{group(run.capacity.governingGfa.value)}</span> m²
                    <span className="wk__band">{bandLabel(run.capacity.governingBand)}</span>
                  </dd>
                </div>
                <div>
                  <dt>What binds it</dt>
                  <dd>{run.capacity.governingConstraint.label}</dd>
                </div>
                <div>
                  <dt>Levels the answer places</dt>
                  <dd>
                    <span className="value">{run.capacity.levels.value}</span> of{' '}
                    <span className="value">{run.envelope.maxLevelsByHeight.value}</span> the height permits
                  </dd>
                </div>
                <div>
                  <dt>Values assumed</dt>
                  <dd>
                    <span className="value">{run.assumptions.length}</span>
                  </dd>
                </div>
                {row ? (
                  <div>
                    <dt>Gates</dt>
                    <dd>
                      <span className="value">{row.gatesSatisfied}</span> of <span className="value">4</span>
                      {row.reviewer ? ` · signed by ${row.reviewer.name}` : ' · not signed'}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <figure className="figure rn__model">
                <div className="figure__plate">
                  {run.building ? (
                    <ModelFigure
                      model={run.building}
                      label={
                        `This run's building in 3D: ${run.capacity.levels.value} levels of floor ` +
                        'area inside the envelope the rules permit. The figures beside it state the ' +
                        'same in words.'
                      }
                    />
                  ) : (
                    <p className="rn__nomodel">
                      This run was computed before the engine built a model of the whole building,
                      so there is nothing to stand up. Compute the plot again to see it.
                    </p>
                  )}
                </div>
                <figcaption className="figure__caption">
                  <p className="figure__source">
                    {run.building?.placedLevels
                      ? 'As the engine stacked it · solid levels are the answer, outlines are height the answer leaves unused · '
                      : run.building
                        ? 'As the engine stacked it · stored before the model recorded which levels the answer places, so every level the height permits is drawn solid · '
                        : ''}
                    amber marks what the engine assumed where no rule decides · regulatory validity —
                    not assessed
                  </p>
                </figcaption>
              </figure>
            </div>
          </section>

          <section className="shell section" aria-labelledby="rn-siblings">
            <div className="section__head">
              <h2 id="rn-siblings">Other runs of this plot</h2>
              <p className="wk__note">
                Each is its own run, with its own inputs and assumptions. Read them side by side;
                nothing here is computed between them.
              </p>
            </div>
            <RunTable
              rows={siblings}
              caption={`Other runs of plot ${run.plot.plotNumber}`}
              empty="This is the only run of this plot on your list."
              navigate={navigate}
            />
          </section>

          <section className="shell section section--minor" aria-labelledby="rn-share">
            <div className="section__head">
              <h2 id="rn-share">Share this run</h2>
            </div>
            {run.access === 'author' ? (
              <ShareForm runId={runId} />
            ) : (
              <p className="wk__note">
                You can open this run as its {run.access}. Only the account that computed it can
                share it.
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

type Role = 'reviewer' | 'reader';

function ShareForm({ runId }: { readonly runId: string }): JSX.Element {
  const emailId = useId();
  const helpId = useId();
  const errorId = useId();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ readonly email: string; readonly role: Role } | null>(null);

  const submit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const address = email.trim();
    if (!address.includes('@')) {
      setProblem('Enter the email address of the account you are sharing with.');
      return;
    }
    if (role === null) {
      setProblem('Choose what they may do with the run: review it, or only read it.');
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
        setProblem(
          err instanceof AuthFailure && err.status === 401
            ? 'Your session has ended. Sign in again, then share the run.'
            : 'The run could not be shared. Try again in a moment.',
        );
      })
      .finally(() => setSending(false));
  };

  return (
    <form className="plate rn__share" onSubmit={submit} noValidate>
      <p className="wk__note">
        Give another account access to this run. A reviewer may sign the review gate (G4); a
        reader may only open it. Nobody&rsquo;s licence is checked.
      </p>
      <div className="field">
        <label htmlFor={emailId}>Their email address</label>
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
          The address they signed up with.
        </p>
      </div>
      <fieldset className="choice-set">
        <legend className="field-group__legend">What they may do</legend>
        {(
          [
            ['reviewer', 'Review it', 'Open the run and sign the review gate, G4.'],
            ['reader', 'Read it', 'Open the run. Nothing else.'],
          ] as const
        ).map(([value, title, detail]) => (
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
          {problem}
        </p>
      ) : null}
      <div className="cta">
        <button type="submit" className="button button--primary" disabled={sending} aria-busy={sending}>
          {sending ? 'Sharing…' : 'Share the run'}
        </button>
      </div>
      {done ? (
        <p className="rn__shared" role="status">
          If an account uses {done.email}, it can now open this run as a {done.role}. This page does
          not say whether one does, so it cannot be used to find out who has an account.
        </p>
      ) : null}
    </form>
  );
}
