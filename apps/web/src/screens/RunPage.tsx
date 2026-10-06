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
 * - Review and files: the two export gates as the run records them, the review
 *   gate's signature for an account that may give it, and the run's files once both
 *   are signed. The page decides nothing here that the server does not decide again:
 *   it offers the signature to the accounts the server would accept it from, and
 *   every file request is checked against the gates on arrival.
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

import { AuthFailure, accountRuns, type RunAccess, type RunFileFormat } from '../api/auth.js';
import type { RunView } from '../api/client.js';
import { EnvelopePanel, ParkingStep } from '../App.js';
import { AssumptionRegister } from '../components/AssumptionRegister.js';
import { CapacityBands } from '../components/CapacityBands.js';
import { DrawingSet } from '../components/DrawingSet.js';
import { GfaStatement } from '../components/GfaStatement.js';
import { ModelFigure } from '../components/ModelFigure.js';
import { ParkingPlan, VehicleAccessPanel } from '../components/ParkingPlan.js';
import { ProvenanceTree, type ProvTree } from '../components/ProvenanceTree.js';
import { ChecksStep } from './ChecksStep.js';
import { hashOf } from '../gateHash.js';
import { AR } from '../i18n/runPage.ar.js';
import { downloadObject, openObject, printObject } from '../documents.js';
import { EN } from '../i18n/runPage.en.js';
import { useDict } from '../i18n/locale.js';
import { Link, type Href } from '../router.js';
import { useSession } from '../session.js';
import { group, Ltr, RunTable, useBandLabel, type RunRow } from './Work.js';

const day = (iso: string): string => iso.slice(0, 10);
const time = (iso: string): string => iso.slice(11, 16);

/** The review gate's id, as the engine names it. An identifier, so not copy. */
const REVIEW_GATE = 'G4';

/** The two gates an export answers to, by the keys the API stores them under. */
const ASSUMPTIONS_KEY = 'G3_ASSUMPTIONS_ACKNOWLEDGED';
const REVIEW_KEY = 'G4_REVIEWER_NAMED';
const EXPORT_KEYS = [ASSUMPTIONS_KEY, REVIEW_KEY] as const;

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
  const session = useSession();
  const [run, setRun] = useState<Stored | null>(null);
  const [error, setError] = useState<LoadError | null>(null);

  /*
    After a signature the run is read again rather than patched here: the gate is
    the server's record, and a page that wrote its own copy of it could show a
    signature the server had refused.
  */
  const reload = (): void => {
    accountRuns
      .get(runId)
      .then(setRun)
      .catch(() => setError('failed'));
  };

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

  /*
    THE DERIVATION DRAWER, ON THE RUN PAGE TOO.

    Every figure in the sections below is a button that opens the value's own
    graph — the same route, the same tree component and the same panel the engine
    flow uses. A run page that printed the figures without them would be showing
    traced values as plain numbers, which is the one thing this product may not
    do: the trace is not a feature of the step, it is a property of the value.
  */
  const [inspecting, setInspecting] = useState<{ nodeId: string; tree: ProvTree | null } | null>(null);
  const inspect = (nodeId: string): void => {
    setInspecting({ nodeId, tree: null });
    accountRuns
      .provenance(runId, nodeId)
      .then((tree) => setInspecting({ nodeId, tree }))
      .catch(() => setInspecting(null));
  };

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
                {/* From the run's own gate record, not the list row, so a signature
                    given on this page shows here without the list being read again.
                    Out of the export gates, not four: G1 and G2 precede the run and
                    are never stored against it, so "of 4" could not reach four. */}
                <div>
                  <dt>{t.answer.gates}</dt>
                  <dd>
                    <span className="value">{EXPORT_KEYS.filter((k) => run.gates?.[k]).length}</span>
                    {t.answer.gatesOf}
                    <span className="value">{EXPORT_KEYS.length}</span>
                    {run.gates?.[REVIEW_KEY] ? (
                      <>
                        {t.answer.signedBy}
                        <Ltr>{run.gates[REVIEW_KEY].actorName}</Ltr>
                      </>
                    ) : (
                      t.answer.notSigned
                    )}
                  </dd>
                </div>
              </dl>

              <figure className="figure rn__model" id="rn-model">
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

          {/*
            THE WHOLE ANSWER, ON THE PAGE THAT HOLDS THE RUN.

            These are the engine's own panels — the same components the ten-step
            flow renders, given the same run — and that is the point rather than a
            convenience. A run page that re-stated the capacity, the parking or
            the checks in its own markup would be a second renderer of the same
            figures, free to drift from the first; the defect `pnpm parity`
            exists to catch between the screen, the paper and the DXF is the same
            defect between two screens.

            Nothing is recomputed and nothing is editable. The run is a record:
            the assumptions are read-only (see `AssumptionRegister`), the gates
            are given where they are given, and `plot` is passed as null because
            the sheets draw the building model and the plot outline belongs to the
            step that is still choosing one.
          */}
          <div className="shell section rn__results">
            <CapacityBands
              capacity={run.capacity}
              onInspect={inspect}
              governingAssumption={
                run.capacity.governingBand === 'PARKING'
                  ? run.assumptions.find((a) => a.parameterId === 'parking.bay_area_factor')
                  : undefined
              }
            />
            {run.gfaStatement ? <GfaStatement statement={run.gfaStatement} onInspect={inspect} /> : null}
            <EnvelopePanel run={run} onInspect={inspect} />
          </div>

          <div className="shell section rn__results" id="rn-drawings">
            <ParkingStep run={run} plot={null} onInspect={inspect} />
          </div>

          <div className="shell section rn__results">
            <ChecksStep run={run} />
          </div>

          <div className="shell section rn__results">
            <AssumptionRegister
              assumptions={run.assumptions}
              acknowledged={Boolean(run.gates?.[ASSUMPTIONS_KEY])}
              onAcknowledge={() => undefined}
              onEdit={() => undefined}
              onInspect={inspect}
              readOnly
            />
          </div>

          <ReviewPanel run={run} licence={session.account?.licence ?? null} onSigned={reload} />

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

      {/* The derivation of whichever figure was clicked, in the drawer the engine
          flow uses. Last in the document so it does not come between the sections,
          and `inspect` closes it by setting the state back to null. */}
      {inspecting ? (
        <ProvenanceTree
          tree={inspecting.tree}
          loading={inspecting.tree === null}
          onClose={() => setInspecting(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Why the signature did not go through. `session` is the one the page can say in its
 * own words; any other refusal is the server's sentence, shown as it was sent — the
 * reason a reviewer is refused (no licence, not their run, a stale subject) is the
 * server's to state, and a paraphrase here would drift from it.
 */
type SignRefusal = { readonly kind: 'session' } | { readonly kind: 'server'; readonly sentence: string };

/** What the browser is asked to do with a file: read it, print it, or save it. */
type Delivery = 'open' | 'print' | 'download';


/**
 * The run's files, in the order a reader wants them: what to read, then what to
 * open elsewhere.
 *
 * `opens` means the browser can render it, which is the same property that makes
 * it printable — the two documents that open in a tab are the two that are
 * print-first HTML, and the PDF is the browser's own save of them.
 */
const FILES: readonly { readonly format: RunFileFormat; readonly opens: boolean; readonly drawn: boolean }[] = [
  { format: 'html', opens: true, drawn: false },
  { format: 'sheets', opens: true, drawn: true },
  { format: 'json', opens: false, drawn: false },
  { format: 'dxf', opens: false, drawn: true },
  { format: 'glb', opens: false, drawn: true },
  { format: 'xlsx', opens: false, drawn: false },
];

const EXTENSION: Record<RunFileFormat, string> = {
  html: 'html',
  sheets: 'html',
  json: 'json',
  dxf: 'dxf',
  glb: 'glb',
  xlsx: 'xlsx',
};

/**
 * What the panel reads of a run, and nothing more: its id, its gates, the reader's
 * role on it, whether it has a model to draw, and the subject G4 is signed over —
 * which is only ever hashed, so it is `unknown` here rather than a shape to rely on.
 */
export type ReviewSubject = Pick<Stored, 'runId' | 'gates' | 'access' | 'building'> & {
  readonly capacity: unknown;
};

/**
 * The two export gates, the review signature, and the files behind them.
 *
 * Exported so the tests can render each state — signed, unsigned, reader, no
 * licence — without a server.
 *
 * THE ASSUMPTION GATE IS NOT OFFERED HERE, and that is the design. G3 is given on the
 * register, where every assumption is listed; this page shows a count. A button here
 * would accept a list the reader never opened, which is exactly why the engine's own
 * export step sends the reader back to the register instead of offering one.
 */
export function ReviewPanel({
  run,
  licence,
  onSigned,
}: {
  readonly run: ReviewSubject;
  /** The licence number on the signed-in account, or null. The server decides again. */
  readonly licence: string | null;
  readonly onSigned: () => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const gates = run.gates ?? {};
  const assumptions = gates[ASSUMPTIONS_KEY];
  const review = gates[REVIEW_KEY];
  const mayReview = run.access === 'author' || run.access === 'reviewer';
  const ready = Boolean(assumptions && review);
  const [signing, setSigning] = useState(false);
  const [refusal, setRefusal] = useState<SignRefusal | null>(null);
  // Keyed by format AND delivery: two buttons on one row, and only the one that
  // was pressed should read “Preparing…”.
  const [fetching, setFetching] = useState<string | null>(null);
  const [fileRefusal, setFileRefusal] = useState<string | null>(null);

  const sign = (): void => {
    setSigning(true);
    setRefusal(null);
    accountRuns
      .signReview(run.runId, hashOf(run.capacity))
      .then(onSigned)
      .catch((e: unknown) => {
        if (e instanceof AuthFailure && e.status === 401) setRefusal({ kind: 'session' });
        else setRefusal({ kind: 'server', sentence: e instanceof Error ? e.message : String(e) });
      })
      .finally(() => setSigning(false));
  };

  const fetchFile = (format: RunFileFormat, how: Delivery): void => {
    setFetching(`${format}:${how}`);
    setFileRefusal(null);
    accountRuns
      .file(run.runId, format)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        if (how === 'print') printObject(url);
        else if (how === 'open') openObject(url);
        else downloadObject(url, `envelope-${run.runId.slice(0, 8)}.${EXTENSION[format]}`);
      })
      .catch((e: unknown) => setFileRefusal(e instanceof Error ? e.message : String(e)))
      .finally(() => setFetching(null));
  };

  const when = (at: string): string => `${day(at)} ${time(at)}`;

  return (
    <section className="shell section" aria-labelledby="rn-review">
      <div className="section__head">
        <h2 id="rn-review">{t.review.title}</h2>
        <p className="wk__note">{t.review.note}</p>
      </div>

      <ol className="gate-list rn__gates">
        <li className={assumptions ? 'is-done' : undefined}>
          <span className="gate-list__glyph" aria-hidden="true">
            {assumptions ? '✓' : '○'}
          </span>
          <div>
            <strong>{t.review.assumptions}</strong>
            {assumptions ? (
              <p>
                {t.review.by}
                <Ltr>{assumptions.actorName}</Ltr>
                {t.review.at}
                <Ltr>{when(assumptions.at)}</Ltr>
              </p>
            ) : (
              <p>
                {t.review.unsigned} {t.review.assumptionsWhere}
              </p>
            )}
          </div>
        </li>
        <li className={review ? 'is-done' : undefined}>
          <span className="gate-list__glyph" aria-hidden="true">
            {review ? '✓' : '○'}
          </span>
          <div>
            <strong>{t.review.signed}</strong>
            {review ? (
              <p>
                {t.review.by}
                <Ltr>{review.actorName}</Ltr>
                {t.review.at}
                <Ltr>{when(review.at)}</Ltr>
              </p>
            ) : !mayReview ? (
              <p>
                {t.review.unsigned} {t.review.readerOnly}
              </p>
            ) : licence === null ? (
              <p>
                {t.review.unsigned} {t.review.noLicence}
              </p>
            ) : (
              <>
                <p>
                  {t.review.unsigned} {t.review.signNote}
                </p>
                <button type="button" className="button" onClick={sign} disabled={signing} aria-busy={signing}>
                  {signing ? (
                    t.review.signing
                  ) : (
                    /* One span: `.button` is a flex row with a gap, and three loose
                       children read "( G4 )" with the gap on both sides of the id. */
                    <span>
                      {t.review.signBefore}
                      <Ltr>{REVIEW_GATE}</Ltr>
                      {t.review.signAfter}
                    </span>
                  )}
                </button>
              </>
            )}
            {refusal ? (
              <p className="ac__error" role="alert">
                {refusal.kind === 'session' ? (
                  t.review.session
                ) : (
                  <>
                    {t.review.refusedBefore}
                    <Ltr>{refusal.sentence}</Ltr>
                  </>
                )}
              </p>
            ) : null}
          </div>
        </li>
      </ol>

      <div className="rn__files">
        <h3>{t.files.title}</h3>

        {/*
          LOOKING AT IT IS NOT EXPORTING IT, so these two sit OUTSIDE the gate.

          The panel offered the 3D model and the drawing set as downloads and as
          nothing else: to see either, a reader had to satisfy both gates, fetch a
          file and open it in another program. Both are already drawn on this page
          from the same model the files are written from — so these are links to
          what is here, not a second renderer, and they answer before G3 and G4
          because reading your own run is not a thing to be gated.

          G3 and G4 still hold everything they held: a FILE leaves this page, and
          the server checks both gates again on every request for one.
        */}
        <p className="rn__file-view">
          <a className="button" href="#rn-model">
            {t.files.viewModel}
          </a>
          <a className="button" href="#rn-drawings">
            {t.files.viewDrawings}
          </a>
        </p>

        {ready ? (
          <>
            <ul className="rn__file-list">
              {FILES.filter((f) => !f.drawn || run.building).map(({ format, opens }) => (
                <li key={format}>
                  <button
                    type="button"
                    className={format === 'html' ? 'button button--primary' : 'button'}
                    onClick={() => fetchFile(format, opens ? 'open' : 'download')}
                    disabled={fetching !== null}
                    aria-busy={fetching === `${format}:${opens ? 'open' : 'download'}`}
                  >
                    {fetching === `${format}:${opens ? 'open' : 'download'}`
                      ? t.files.preparing
                      : t.files[format]}
                  </button>
                  {opens ? (
                    <button
                      type="button"
                      className="button"
                      onClick={() => fetchFile(format, 'print')}
                      disabled={fetching !== null}
                      aria-busy={fetching === `${format}:print`}
                    >
                      {fetching === `${format}:print` ? t.files.preparing : t.files.print}
                    </button>
                  ) : null}
                  {opens ? <span className="rn__file-note">{t.files.newTab}</span> : null}
                </li>
              ))}
            </ul>
            <p className="rn__file-note">{t.files.pdfNote}</p>
            {fileRefusal ? (
              <p className="ac__error" role="alert">
                {t.files.refusedBefore}
                <Ltr>{fileRefusal}</Ltr>
              </p>
            ) : null}
          </>
        ) : (
          <p className="wk__note">{t.files.locked}</p>
        )}
      </div>
    </section>
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
