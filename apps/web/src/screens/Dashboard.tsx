/**
 * `/dashboard` — deployment readiness.
 *
 * A product dashboard almost always answers "how much are we doing" — runs this
 * week, plots added, a green ring at ninety-four per cent. This one answers
 * "what is not ready", and it puts that first, because on this product the two
 * questions have opposite answers: the engine works, and nothing it produces may
 * be quoted.
 *
 * It is READINESS, never uptime. Nothing on this page monitors availability, and
 * the word *status* does not appear on it in any sentence a reader could take for
 * one — `/dashboard` is the route the site map says "must never be renamed in a
 * way that implies it does".
 *
 * ---
 *
 * FIVE RULES, and each one is a defect that has already happened somewhere in
 * this repository or is one `className` away from happening here.
 *
 * 1. **Readiness leads, activity follows.** A page that opens on volume while
 *    approvals read zero measures motion and calls it progress. So §3 is first
 *    and largest and §5 is below it, and that ordering is asserted in the test
 *    rather than left to whoever next redesigns the page.
 *
 * 2. **No tile is ever green.** `Stat`'s state union has no `ok` member, so the
 *    green readiness tile is not merely unused — it is unreachable, and
 *    `.stat--ok` was deleted from the stylesheet in the same pass. A count that
 *    has been met is stated plainly; it is not celebrated. The union is the gate,
 *    because a string assertion over rendered markup catches the class name and
 *    not the decision to add one.
 *
 * 3. **The invariants tile is `dormant`, and dormant is NOT amber.** It used to
 *    be `state="partial"`, which the stylesheet painted in `--uncertain` — amber
 *    as a READINESS STATUS, on the site's most-forwarded page of numbers. Amber
 *    is reserved exclusively for ASSUMED. This tile does not mean "assumed"; it
 *    means the rest of the checks had nothing to read, which is NOT ASSESSED. It
 *    takes the deferred pair, and the state is renamed from `partial` to
 *    `dormant` because a class called `partial` invites the next amber.
 *
 * 4. **Nothing is computed here.** Every value comes from `/api/dashboard` or
 *    from the build-time snapshot that script writes. A dashboard that recomputed
 *    a figure could disagree with the run it names.
 *
 * 5. **No number on this page is typed by a human.** Every count, total, version
 *    and percentage is interpolated from the payload. Where the payload has
 *    nothing to say, the page prints an em dash and says why — it does not fill
 *    the gap with a figure, and it does not label the gap with a claim the
 *    payload cannot support (see `Swing`).
 *
 * ---
 *
 * TWO MODES, ONE RENDERER.
 *
 * With an actor it fetches live from the deployment the reader is connected to.
 * Without one it renders `readiness.json` — a dated snapshot written at build time
 * by `scripts/verify-readiness.mjs` against a store seeded only with the synthetic
 * worked example, with `recentRuns` projected to `[]` and the output scanned
 * against the site's deletion list before the build is allowed to pass.
 *
 * It does **not** fabricate an actor to reach the API at runtime. `/api/dashboard`
 * calls `actorFrom`, and putting an invented name into the identity chain of a
 * product whose identity badge is load-bearing is the one failure this site cannot
 * survive. The snapshot exists precisely so that it never has to.
 *
 * The snapshot keeps the API's own `DashboardView` shape, so one renderer serves
 * both paths and there is no second implementation of a page of numbers.
 *
 * ---
 *
 * TWO LANGUAGES, AND RULE 5 SURVIVES BOTH.
 *
 * Every sentence on this page comes from `i18n/dashboard.en.ts` or its Arabic
 * counterpart, and the English module is the type the Arabic one is held to, so a
 * missing translation is a compile error rather than an English sentence rendering
 * under an Arabic frame.
 *
 * Nothing else moved. No figure is in either dictionary — the four helpers
 * (`ofTotal`, `ranOfTotal`, `lifeSafetyDeferred`, `truncated`) carry word order and
 * take their values from the payload, because a digit typed into a dictionary is
 * rule 5's defect one language further from anyone who would notice it. Nor is any
 * ENGINE string: the blocking sentence, every basis, the rule, parameter and
 * instrument ids, the gate names, the clause references and both versions stay
 * exactly where they were, wrapped in `Verbatim` where they sit inside prose so the
 * bidirectional algorithm cannot carry a full stop to the wrong end of an
 * identifier. `docs/05-design/arabic-glossary.md` carries the argument.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

import { api, ApiError, type Actor, type DashboardView } from '../api/client.js';
import { PageContents } from '../components/PageContents.js';
import { Glyph } from '../components/SiteChrome.js';
import { AR } from '../i18n/dashboard.ar.js';
import { EN, type DashboardDictionary } from '../i18n/dashboard.en.js';
import { useDict, Verbatim } from '../i18n/locale.js';
// `Href`, not `Route`. Every CTA on this site carries a query — `/app?demo=…`,
// `/app?step=…` — and a `Route`-only signature rejects all of them.
import { Link, type Href } from '../router.js';
import SNAPSHOT from './readiness.json' with { type: 'json' };
/* The drawings row reads the worked example's file counts, in both modes: they are
   a property of the build, measured when it was made, not of the deployment's data. */
import WORKED from './worked-example.json' with { type: 'json' };

/** The cars each file draws for the worked example — see `verify-worked-example.mjs`. */
const CARS = WORKED.verified.exports.cars;

/**
 * The band label for a band the ENGINE named.
 *
 * `governingBand` is a token off the run and the dictionary holds the three the
 * product knows. A token it does not know falls back to itself — the engine's own
 * word, untranslated, which is the correct failure: a band this page has no label
 * for is still a band the run reported, and inventing one would put a word on the
 * page that no rule produced.
 */
const bandLabel = (t: DashboardDictionary, band: string): string =>
  (t.bands as Record<string, string>)[band] ?? band;

/**
 * Which reading the page is showing. It is a prop rather than a boolean derived
 * from `data`, because a payload cannot tell you where it came from — and §1's
 * whole job is to say where it came from.
 *
 * The default is `snapshot`, which is the signed-out path and the only one
 * `pages.tsx` reaches `DashboardPanels` on directly.
 */
type Source = 'live' | 'snapshot';

/**
 * The reference the exposure bars are scaled against — a FIXED number, not the
 * largest value present.
 *
 * A bar normalised to the maximum makes the top row full-width whatever it is
 * worth, so a two per cent swing on a small set draws the same picture as a forty
 * per cent one. The column exists to answer "how much does this assumption move
 * the answer", and a self-normalising bar answers "which of these is biggest",
 * which the ordering already says.
 */
const SWING_REFERENCE_PCT = 50;

/**
 * A timestamp a reader can check, formatted without a locale.
 *
 * `toLocaleString` renders differently under the test's Node and the reader's
 * browser, and differently again per machine — so the one figure on this page
 * that says when the rest of it was measured would be the one figure no gate
 * could pin. The ISO string is sliced, the zone is named, and the machine-readable
 * original goes in `dateTime`.
 */
const stamp = (iso: string): string => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

/**
 * Whether a citation names a real instrument.
 *
 * Every seed rule carries `instrumentId: 'PLACEHOLDER-NOT-A-REAL-INSTRUMENT'`,
 * `sourcePage: 0` and clause text prefixed `[NOT SOURCED]`. Only the instrument
 * id and the clause reference are on the wire — the dashboard serialiser in
 * `apps/api` sends two fields of the citation and no more — so placeholder-ness is
 * read off the instrument id, which is the field that says so in capitals. When a
 * rule is finally sourced against a real instrument the chip disappears on its
 * own, which is the correct direction for a signal to fail.
 */
const isUnsourced = (instrumentId: string): boolean => /PLACEHOLDER/i.test(instrumentId);

/* =========================================================================
 * The route component
 * ====================================================================== */

/**
 * `/dashboard` is dispatched ABOVE the actor check, so `actor` is nullable here
 * and the signed-out reader is the normal case rather than the exception.
 *
 * The prop type is a subset of `PageProps` rather than `PageProps` itself, which
 * makes this function assignable to `PageComponent` and still callable with the
 * two props `pages.tsx` passes it today. A page cannot reach for a router, an
 * identity or a theme of its own; taking fewer props than the contract offers is
 * the one direction that is safe in both.
 */
export function Dashboard({
  actor,
  navigate,
}: {
  readonly actor: Actor | null;
  readonly navigate: (to: Href) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const [data, setData] = useState<DashboardView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No actor, no request. The snapshot is a build-time import, so the signed-out
    // path has no loading interval at all — a missing file fails the build, which
    // is the correct place for that failure to land.
    if (!actor) return undefined;
    let live = true;
    void api
      .dashboard(actor)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e instanceof ApiError ? e.message : String(e));
      });
    return () => {
      live = false;
    };
  }, [actor]);

  if (!actor) {
    return (
      <DashboardPanels
        data={SNAPSHOT as DashboardView}
        navigate={navigate}
        source="snapshot"
      />
    );
  }

  /*
    THE THREE SIGNED-IN STATES, KEPT AS THEY WERE.

    An error, one line saying it is reading, or the panels. What is prohibited is
    the obvious next move: this must never become a skeleton with placeholder
    figures in the tile positions, because a grey rectangle where a count belongs
    is a number the reader supplies themselves — and on this page they will supply
    a better one than the truth.
  */
  if (error) {
    return (
      <div className="shell">
        <div className="banner banner--blocked" role="alert">
          <div>
            <strong>{t.fetch.errorTitle}</strong>
            {/* The message is the API's own, so it is rendered as it arrived — and
                "as it arrived" is `Verbatim` on a right-to-left page. It is an
                English string this page did not author, sitting under an Arabic
                heading: without `lang="en"` a screen reader reads it in the wrong
                voice, and without the isolate its closing full stop moves to the
                left of the sentence it ends. */}
            <p>
              <Verbatim>{error}</Verbatim>
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="shell">
        <p className="muted">{t.fetch.loading}</p>
      </div>
    );
  }

  return <DashboardPanels data={data} navigate={navigate} source="live" />;
}

/* =========================================================================
 * The page, given data
 * ====================================================================== */

/**
 * The screen, given a payload.
 *
 * Split from the fetch so the page can be rendered in a test against a known
 * payload. That is not a testing convenience dressed as architecture — the
 * assertions that matter here are prohibitions ("never a composite score", "never
 * a tick where a count belongs", "never amber on a readiness state"), and a
 * prohibition you cannot render is a prohibition nobody enforces.
 *
 * It renders no `<main>`, no header, no footer and no skip link: `SiteChrome`
 * owns the single `<main id="main">` and this page renders into it. It also
 * renders no `<h1>` — `pages.tsx` opens the route with one, and two elements
 * claiming the top of the document is the same defect as two `#main`s.
 */
export function DashboardPanels({
  data,
  navigate,
  source = 'snapshot',
}: {
  readonly data: DashboardView;
  readonly navigate: (to: Href) => void;
  readonly source?: Source;
}): JSX.Element {
  const t = useDict(EN, AR);
  const { readiness: r, volume } = data;
  const showRuns = source === 'live';

  /*
    THE SECTION INDEX, AND ITS DENOMINATOR, ARE DERIVED.

    `04 / 07` in the rail gutter is a fact about the page rather than a claim
    about the engine, which is what makes it safe to state — but only while
    nothing types it. The recent-runs section exists for a signed-in reader and
    not for a signed-out one, so a hand-written denominator would be wrong on
    exactly one of the two readings and right on the other, which is the shape of
    error nobody notices.
  */
  /*
    ONE RECORD, READ THREE WAYS: the margin ordinal, the denominator, and the
    contents list at the head of the page. The heading text sits here beside the
    id so the outline and the `<h2>` cannot say different things — the section
    order and the section names were two lists before, and the only reason they
    agreed was that nobody had edited one of them yet.
  */
  const order: readonly { readonly id: string; readonly label: string }[] = [
    { id: 'not-ready', label: t.notReady.title },
    { id: 'change', label: t.change.title },
    { id: 'volume', label: t.volume.title },
    { id: 'exposure', label: t.exposure.title },
    { id: 'deferred', label: t.deferred.title },
    { id: 'drawings', label: t.drawings.title },
    ...(showRuns ? [{ id: 'runs', label: t.runs.title }] : []),
    { id: 'no-score', label: t.noScore.title },
  ];
  const pad = (n: number): string => String(n).padStart(2, '0');
  const index = (id: string): JSX.Element => (
    <p className="index railed__margin" aria-hidden="true">
      {pad(order.findIndex((s) => s.id === id) + 1)}
      <span className="index__of"> / {pad(order.length)}</span>
    </p>
  );

  return (
    <>
      {/* --- 1. Provenance of this page ---------------------------------- */}
      {/*
        FIRST, before a single figure. A reader forwarded this link has no way to
        know whether they are looking at a live deployment or at a dated file, and
        every other sentence on the page depends on which.
      */}
      {/* `.shell` is the column and `.db-dateline` is the measure. They are two
          elements rather than one class list: the shell centres its own box, so a
          paragraph carrying both had its 70-character measure centred inside the
          page column and read as centred text under a left-aligned title. */}
      <div className="shell">
        {/* The timestamp and the engine version are the payload's, so both are
            `Verbatim`: `dir="ltr" lang="en"` around a Latin run, and `.verbatim`'s
            `unicode-bidi: isolate` so the full stop that ends this sentence cannot
            migrate to the wrong end of a version number on the Arabic page. The
            wrapper is outside the styled span rather than merged into it, so
            `.db-ver` keeps the mono face it has always had. */}
        <p className="db-dateline">
          {source === 'live' ? (
            <>{t.dateline.live}</>
          ) : (
            <>
              {t.dateline.snapshotBefore}{' '}
              <Verbatim>
                <time dateTime={data.generatedAt}>{stamp(data.generatedAt)}</time>
              </Verbatim>{' '}
              {t.dateline.snapshotAfter}
            </>
          )}{' '}
          {t.dateline.engine}{' '}
          <Verbatim>
            <span className="db-ver">{data.engineVersion}</span>
          </Verbatim>
          .
        </p>
      </div>

      {/* --- 2. The blocking sentence, verbatim --------------------------- */}
      {/*
        `readiness.blocking` is written by the engine, not by this page, and it is
        rendered as it arrives. No `role="alert"`: this is static content on first
        paint, and an alert role announces on insertion, so it would interrupt a
        screen-reader user reading the page they asked for. Its prominence is
        carried by position, by the frame and by the drawn mark.
      */}
      <div className="shell db-blocking">
        <div className="callout" data-state="variance">
          <span className="callout__mark">
            <Glyph name="never-claimed" />
          </span>
          <div className="callout__body">
            {/* "PRODUCED HERE", NOT "ON THIS PAGE". The narrower sentence disclaimed
                the page and left the deployment unqualified, while the engine's own
                blocking sentence directly beneath it disclaims everything the
                deployment emits — "none of it is a capacity assessment and none of it
                may be quoted to a third party". A heading that scopes the denial more
                tightly than the paragraph it introduces reads as the limit of the
                denial. `scripts/smoke.mjs` asserts the wider wording. */}
            <strong>{t.blocking.title}</strong>
            {/* THE ENGINE WROTE THIS SENTENCE, so it is carried the way every other
                engine string on this page is carried. `readiness.blocking` is
                English prose the page did not author and may not translate; under an
                Arabic heading it needs `lang="en"` for the voice and the isolate for
                the three full stops in it, the last of which otherwise resolves to
                the paragraph direction and renders at the wrong end of the run. */}
            <p>
              <Verbatim>{r.blocking}</Verbatim>
            </p>
          </div>
        </div>
      </div>

      <PageContents entries={order.map((s) => ({ id: `db-${s.id}`, label: s.label }))} />

      {/* --- 3. What is not ready ---------------------------------------- */}
      <section className="shell section section--major railed" aria-labelledby="db-not-ready">
        {index('not-ready')}
        <div className="railed__body">
          <div className="section__head">
            <h2 id="db-not-ready">{t.notReady.title}</h2>
            <p className="db-lede">
              {t.notReady.ledeBefore} <em>{t.notReady.ledeEmphasis}</em>{' '}
              {t.notReady.ledeAfter}
            </p>
          </div>

          <div className="section__body">
            <div className="stat-row">
              <Stat
                label={t.notReady.rules.label}
                /*
                  Zero is blocked, and so is any figure short of the total. The
                  first clause is written separately rather than folded into the
                  comparison because a store holding no rules at all reads
                  `0 of 0` — equal to its total, and emphatically not ready.
                */
                state={r.rulesApproved === 0 || r.rulesApproved < r.rulesTotal ? 'blocked' : 'plain'}
                /* Both figures are the payload's; the dictionary supplies only the
                   word between them, which is not the same word in both languages. */
                value={t.ofTotal(String(r.rulesApproved), String(r.rulesTotal))}
                note={
                  <>
                    {/* THE RULE ID IS THE ENGINE'S AND IS NEVER TRANSLATED. English
                        opens the sentence with it and Arabic opens with the verb, so
                        the prose is split around it rather than templated into one
                        string that would fix the English word order in both. */}
                    {t.notReady.rules.noteBefore}
                    <Verbatim>
                      <span className="ident">FR-RUL-001</span>
                    </Verbatim>
                    {t.notReady.rules.noteAfter}
                  </>
                }
              />
              <Stat
                label={t.notReady.definitions.label}
                state={
                  r.definitionsSigned === 0 || r.definitionsSigned < r.definitionsTotal
                    ? 'blocked'
                    : 'plain'
                }
                value={t.ofTotal(String(r.definitionsSigned), String(r.definitionsTotal))}
                note={
                  <>
                    {t.notReady.definitions.annexLabel}{' '}
                    <Verbatim>
                      <span className="db-ver">{r.annexVersion}</span>
                    </Verbatim>
                    {t.notReady.definitions.annexSeparator}
                    {r.annexSigned
                      ? t.notReady.definitions.signed
                      : t.notReady.definitions.unsigned}
                    {t.notReady.definitions.afterSigned}
                    {t.notReady.definitions.noteBefore}
                    <Verbatim>
                      <span className="ident">FR-DEF-001 AC5</span>
                    </Verbatim>
                    {t.notReady.definitions.noteAfter}
                  </>
                }
              />
              {/*
                THE RESIDUE, NAMED RATHER THAN STYLED AROUND.

                `invariantsTotal` is `latest?.invariants.total ?? 18` in the handler,
                so on a store with no run a TYPED eighteen would reach a public page
                through the API. The seeded snapshot always has a run, which closes
                it — and if `invariantsRan` is null anyway the tile does not render
                at all, rather than setting a real denominator against a missing
                numerator. Rendering `— of 18` would put a typed figure on the page
                in the position a reader trusts most.
              */}
              {r.invariantsRan === null ? null : (
                <Stat
                  label={t.notReady.invariants.label}
                  state="dormant"
                  value={t.ofTotal(String(r.invariantsRan), String(r.invariantsTotal))}
                  note={<>{t.notReady.invariants.note}</>}
                />
              )}
            </div>

            {/* Both paragraphs come from `content/shared.tsx`. Neither is re-typed
                here: `DORMANT_IS_NOT_A_PASS` also renders on `/method`, and a
                paragraph written twice is a paragraph that says two things after
                the first design pass. `dashboard.en.ts` IMPORTS them rather than
                restating them, which is how the single source survives the move
                into a dictionary — the Arabic is the only new prose. */}
            <div className="refusal">
              <h3 className="refusal__title">{t.notReady.dormant.heading}</h3>
              <p>{t.notReady.dormant.body}</p>
            </div>
            <div className="refusal">
              <h3 className="refusal__title">{t.notReady.seedRules.heading}</h3>
              <p>{t.notReady.seedRules.body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- 4. What would change these numbers -------------------------- */}
      {/*
        The section that turns the zeros above from a confession into a plan. A gap
        with an owner is a plan; a gap without one is an excuse.

        AND THERE ARE NO DATES ON IT. An owner is a plan; a date is a promise, and
        this product does not make those — least of all on the page a funder reads.
      */}
      <section className="shell section railed" aria-labelledby="db-change">
        {index('change')}
        <div className="railed__body">
          <div className="section__head">
            <h2 id="db-change">{t.change.title}</h2>
            <p className="db-lede">{t.change.lede}</p>
          </div>

          <div className="section__body">
            <ol className="grid db-plan">
              <li className="plate">
                <p className="db-owner">{t.change.architect.owner}</p>
                <h3 className="plate__title">{t.change.architect.title}</h3>
                <p className="plate__subtitle">{t.change.architect.body}</p>
              </li>
              <li className="plate">
                <p className="db-owner">{t.change.annex.owner}</p>
                <h3 className="plate__title">{t.change.annex.title}</h3>
                <p className="plate__subtitle">{t.change.annex.body}</p>
              </li>
              <li className="plate">
                <p className="db-owner">{t.change.schedule.owner}</p>
                <h3 className="plate__title">{t.change.schedule.title}</h3>
                <p className="plate__subtitle">{t.change.schedule.body}</p>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* --- 5. What has been run ---------------------------------------- */}
      <section className="shell section railed" aria-labelledby="db-volume">
        {index('volume')}
        <div className="railed__body">
          <div className="section__head">
            <h2 id="db-volume">{t.volume.title}</h2>
            <p className="db-lede">
              {source === 'snapshot' ? (
                <>{t.volume.ledeSnapshot}</>
              ) : (
                <>{t.volume.ledeLive}</>
              )}{' '}
              {t.volume.ledeTail}
            </p>
          </div>

          <div className="section__body">
            <div className="stat-row stat-row--compact">
              <Stat label={t.volume.plots} value={String(volume.plots)} state="plain" />
              <Stat label={t.volume.runs} value={String(volume.runs)} state="plain" />
              <Stat
                label={t.volume.reviewed}
                value={String(volume.reviewed)}
                state="plain"
                note={
                  <>
                    {t.volume.reviewedNoteBefore}
                    {/* The gate name is the engine's. It is `Verbatim` so that the full
                        stop that follows it stays with the sentence and not with the
                        identifier on a right-to-left page. */}
                    <Verbatim>
                      <span className="ident">G4</span>
                    </Verbatim>
                    {t.volume.reviewedNoteAfter}
                  </>
                }
              />
              <Stat label={t.volume.exported} value={String(volume.exported)} state="plain" />
            </div>

            <h3 className="db-subhead">{t.volume.bindsTitle}</h3>
            <p className="db-fine">{t.volume.bindsNote}</p>
            {/* `runsShown` and not `runs`: the split is over the runs the payload
                actually counted, and dividing by a larger total would draw three
                bars that add up to less than the whole for no visible reason. */}
            <BandSplit bands={data.governingBands} total={volume.runsShown} />
          </div>
        </div>
      </section>

      {/* --- 6. Where the answers are least anchored ---------------------- */}
      <section className="shell section railed" aria-labelledby="db-exposure">
        {index('exposure')}
        <div className="railed__body">
          <div className="section__head">
            <h2 id="db-exposure">{t.exposure.title}</h2>
            <p className="db-lede">{t.exposure.lede}</p>
          </div>

          <div className="section__body">
            {data.assumptionExposure.length === 0 ? (
              <div className="empty" data-state="deferred">
                <p className="empty__title">{t.exposure.emptyTitle}</p>
                <p>{t.exposure.emptyBody}</p>
              </div>
            ) : (
              <div
                className="schedule"
                role="region"
                aria-label={t.exposure.regionLabel}
                tabIndex={0}
              >
                <table>
                  <caption className="sr-only">{t.exposure.caption}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="schedule__rank">
                        {t.exposure.columns.rank}
                      </th>
                      <th scope="col">{t.exposure.columns.parameter}</th>
                      <th scope="col" className="schedule__num">
                        {t.exposure.columns.swing}
                      </th>
                      <th scope="col" className="schedule__num">
                        {t.exposure.columns.runs}
                      </th>
                      <th scope="col" className="schedule__fill">
                        {t.exposure.columns.basis}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.assumptionExposure.map((a, i) => (
                      <tr key={a.parameterId}>
                        {/* `data-label` is re-emitted as the row header below the fold
                            — `site.css` sets `content: attr(data-label)` — so it is a
                            RENDERED string and takes the same dictionary key as the
                            column it repeats. The two cannot drift. */}
                        <td className="schedule__rank" data-label={t.exposure.columns.rank}>
                          {i + 1}
                        </td>
                        <th
                          scope="row"
                          className="db-param"
                          data-label={t.exposure.columns.parameter}
                        >
                          {/* ONE ELEMENT, not two. Below the fold a schedule cell is
                              a two-track grid whose first track holds the re-emitted
                              header, so two children auto-place into two ROWS and the
                              chip lands underneath the label rather than beside the
                              identifier it qualifies. R9's rule is that the state is
                              in the same eyeful as the identifier; a wrapper is what
                              makes that survive the fold. */}
                          <span className="db-param__id">
                            {/* THE PARAMETER ID IS THE ENGINE'S. `rtl.css` isolates
                                every `code` on an Arabic page, so the layout was
                                already right — but only `Verbatim` carries
                                `lang="en"`, and `parking.bay_area_factor` read aloud
                                in an Arabic voice is not the identifier. The wrapper
                                sits OUTSIDE the `code` rather than merged into it,
                                so `.db code.ident` keeps the mono face: merged, the
                                `.verbatim` sans family would win and de-monospace
                                every identifier on the English page too. */}
                            <Verbatim>
                              <code className="ident">{a.parameterId}</code>
                            </Verbatim>
                            <span className="chip" data-state="assumed">
                              <Glyph name="assumed" />
                              {t.exposure.assumedChip}
                            </span>
                          </span>
                        </th>
                        <td className="schedule__num" data-label={t.exposure.columns.swing}>
                          <Swing effect={a.maxRelativeEffect} />
                        </td>
                        <td className="schedule__num" data-label={t.exposure.columns.runs}>
                          {a.runs}
                        </td>
                        <td className="schedule__fill" data-label={t.exposure.columns.basis}>
                          {/*
                            THE BASIS IS RENDERED VERBATIM, and that is a rule rather
                            than a convenience. A basis string is engine-authored prose,
                            so the fix for a basis that should not be public is always at
                            source and never a truncation on the page — an assumption
                            without a basis is not an assumption, it is a guess with a
                            label. `apps/web/test/dashboard.test.tsx` scans the snapshot
                            for the figures that may not reach a public page, which is
                            the same rule asserted from the other side.

                            AND "VERBATIM" IS THE ELEMENT, not only the intent. The
                            glossary names a basis string first in its list of things
                            that must be rendered inside `dir="ltr" lang="en"`: it is
                            a signed record of why a number was assumed, it ends in a
                            full stop, and in an Arabic table cell an unisolated full
                            stop resolves to the paragraph direction and prints at the
                            left of the sentence it closes.
                          */}
                          <p>
                            <Verbatim>{a.basis}</Verbatim>
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/*
              THE ONE HONEST CORRECTION ON THIS PAGE, and it is a regression fix.

              This column used to print "not measured" against a zero. The dashboard
              serialiser in `apps/api` writes
              `const effect = a.sensitivity?.relativeEffect ?? '0'`, so a sensitivity
              nobody measured and one measured at zero arrive here as the same string
              — and the page was labelling a measured zero as unmeasured. Those two
              mean opposite things.

              Printing `0.0%` would be the other half of the same error: it reads as
              "this assumption does not matter", which is a claim about a measurement
              the payload may not carry. So a zero prints an em dash, the sentence
              below says what the em dash stands for, and the owner is named. The
              serialiser is where the distinction has to be restored —
              `maxRelativeEffect` becomes `string | null`, the `?? '0'` goes, and the
              comparison skips nulls. That is an API change, and it is not this
              page's to make.
            */}
            <p className="db-note">
              {t.exposure.noteBefore}
              <Verbatim>
                <span className="ident">apps/api</span>
              </Verbatim>
              {t.exposure.noteAfter}
            </p>
          </div>
        </div>
      </section>

      {/* --- 7. Applicable, and never assessed ---------------------------- */}
      <section className="shell section railed" aria-labelledby="db-deferred">
        {index('deferred')}
        <div className="railed__body">
          <div className="section__head">
            <h2 id="db-deferred">{t.deferred.title}</h2>
            <p className="db-lede">{t.deferred.lede}</p>
          </div>

          <div className="section__body">
            {data.deferred.length === 0 ? (
              <div className="empty" data-state="deferred">
                <p className="empty__title">{t.deferred.emptyTitle}</p>
                <p>{t.deferred.emptyBody}</p>
              </div>
            ) : (
              <ul className="db-rules">
                {data.deferred.map((d) => (
                  <li key={d.ruleId} className="db-rule">
                    <p className="db-rule__head">
                      {/* The rule id is the engine's, and it opens a line whose next
                          element is an Arabic chip. `Verbatim` outside the `code`,
                          for the same two reasons as the parameter id above: the
                          `lang="en"` the stylesheet cannot supply, and the mono face
                          the wrapper would take away if the classes were merged. */}
                      <Verbatim>
                        <code className="ident">{d.ruleId}</code>
                      </Verbatim>
                      {/* «لم يُقيَّم» — the absence of an act, never a verdict.
                          «غير صالح» and «غير مطابق» would convert a refusal to assess
                          into an adverse finding, which is a stronger claim than the
                          affirmative one this product refuses to make. */}
                      <span className="chip" data-state="deferred">
                        <Glyph name="deferred" />
                        {t.deferred.notAssessed}
                      </span>
                      {d.isLifeSafety ? (
                        <span className="chip" data-state="variance">
                          <Glyph name="variance" />
                          {t.deferred.lifeSafety}
                        </span>
                      ) : null}
                      {/*
                        R9, in the same eyeful and never in a footnote. A rule
                        identifier set beside a clause reference reads as a
                        regulation unless something in the same view says otherwise,
                        and on a seed deployment that clause reference points at an
                        instrument that does not exist.
                      */}
                      {isUnsourced(d.citation.instrumentId) ? (
                        <span className="chip" data-state="blocked">
                          <Glyph name="never-claimed" />
                          {t.deferred.draftNotSourced}
                        </span>
                      ) : null}
                    </p>
                    {/* THE WHOLE LINE IS THE ENGINE'S: a parameter id, a clause
                        reference and an instrument id, none of them translated. It
                        is isolated as one run rather than three, so the two
                        separators stay between the same two identifiers on a
                        right-to-left page as on a left-to-right one. */}
                    <p className="db-rule__meta">
                      <Verbatim>
                        <span className="ident">{d.parameterId}</span> ·{' '}
                        {d.citation.clauseReference} ·{' '}
                        <span className="ident">{d.citation.instrumentId}</span>
                      </Verbatim>
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {data.deferred.some((d) => isUnsourced(d.citation.instrumentId)) ? (
              <div className="refusal">
                <h3 className="refusal__title">{t.deferred.refusalTitle}</h3>
                <p>{t.deferred.refusalBody}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* --- 8. Whether the drawings agree with the engine --------------- */}
      {/*
        THE SAME CARS IN EVERY FILE, counted in the files themselves. The build stops
        if they differ, so this row can only print equal numbers — which is exactly why
        the paragraph under it says what equal numbers do and do not show. Equal counts
        without that sentence would read as a check on the layout; they are a check on
        the drawings.
      */}
      <section className="shell section railed" aria-labelledby="db-drawings">
        {index('drawings')}
        <div className="railed__body">
          <div className="section__head">
            <h2 id="db-drawings">{t.drawings.title}</h2>
            <p className="db-lede">{t.drawings.lede}</p>
          </div>

          <div className="section__body">
            <div className="stat-row stat-row--compact">
              <Stat label={t.drawings.engine} value={String(CARS.engine)} state="plain" />
              <Stat label={t.drawings.drawingSet} value={String(CARS.drawingSet)} state="plain" />
              <Stat label={t.drawings.dxf} value={String(CARS.dxf)} state="plain" />
              <Stat label={t.drawings.modelFile} value={String(CARS.modelFile)} state="plain" />
            </div>
            <div className="refusal">
              <h3 className="refusal__title">{t.drawings.scopeTitle}</h3>
              <p>{t.drawings.scopeBody}</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- 9. Recent runs, signed in only ------------------------------- */}
      {/*
        Behind the actor, because the table carries the names of the people who
        authored and reviewed each run. The snapshot writes `recentRuns` as `[]`
        rather than omitting the key, so the shape holds and there is still nothing
        of anyone's to publish.
      */}
      {showRuns ? (
        <section className="shell section railed" aria-labelledby="db-runs">
          {index('runs')}
          <div className="railed__body">
            <div className="section__head">
              <h2 id="db-runs">{t.runs.title}</h2>
              <p className="db-lede">{t.runs.lede}</p>
            </div>

            <div className="section__body">
              {data.recentRuns.length === 0 ? (
                <div className="empty">
                  <p className="empty__title">{t.runs.emptyTitle}</p>
                  <p>{t.runs.emptyBody}</p>
                  <Link to="/app" navigate={navigate} className="button">
                    {t.runs.emptyCta}
                  </Link>
                </div>
              ) : (
                <div
                  className="schedule"
                  role="region"
                  aria-label={t.runs.regionLabel}
                  tabIndex={0}
                >
                  <table>
                    <caption className="sr-only">{t.runs.caption}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t.runs.columns.plot}</th>
                        <th scope="col">{t.runs.columns.governing}</th>
                        <th scope="col" className="schedule__num">
                          {t.runs.columns.capacity}
                        </th>
                        <th scope="col" className="schedule__num">
                          {t.runs.columns.levels}
                        </th>
                        <th scope="col">{t.runs.columns.checks}</th>
                        <th scope="col">{t.runs.columns.reviewer}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentRuns.map((run) => (
                        <tr key={run.runId}>
                          <th scope="row" data-label={t.runs.columns.plot}>
                            {/* A plot number is a name as issued, not a label this
                                page owns — `DJAZ1MED12RES011` has to match the sheet
                                in the reader's hand. It takes the same isolate as the
                                community beside it; leaving one of the two unwrapped
                                was the inconsistency, not a second opinion. */}
                            <Verbatim>{run.plotNumber}</Verbatim>
                            {/* A plot number, a community and an area as the run
                                recorded them, with two separators between them. One
                                isolate over the whole line, so the separators stay
                                between the same two values in both directions. */}
                            <span className="db-rule__meta">
                              <Verbatim>
                                {run.community} · {run.plotAreaM2} m²
                              </Verbatim>
                            </span>
                          </th>
                          <td data-label={t.runs.columns.governing}>
                            <span className="chip" data-state="binding">
                              {bandLabel(t, run.governingBand)}
                            </span>
                            {/* The binding label is the engine's own words. */}
                            <span className="db-rule__meta">
                              <Verbatim>{run.bindingLabel}</Verbatim>
                            </span>
                          </td>
                          <td className="schedule__num" data-label={t.runs.columns.capacity}>
                            <span className="value">
                              {run.governingGfaM2}
                              <span className="value__unit">m²</span>
                            </span>
                          </td>
                          <td className="schedule__num" data-label={t.runs.columns.levels}>
                            {run.levels}
                          </td>
                          <td data-label={t.runs.columns.checks}>
                            {/*
                              Ran of total, never a tick. A green check here would say
                              "everything was checked" on a run where some of them had
                              nothing to check — the one conflation this whole product
                              refuses. Both figures come off the run.
                            */}
                            <span className="db-rule__meta">
                              {t.runs.ranOfTotal(
                                String(run.invariants.ran ?? '—'),
                                String(run.invariants.total),
                              )}
                            </span>
                            {run.lifeSafetyDeferred ? (
                              <span className="chip" data-state="variance">
                                {t.runs.lifeSafetyDeferred(String(run.lifeSafetyDeferred))}
                              </span>
                            ) : null}
                          </td>
                          {/* The reviewer's name is left exactly as it was recorded and
                              is NOT marked `lang="en"`: a signature is a person's name,
                              not an engine string, and half of them will be Arabic. */}
                          <td data-label={t.runs.columns.reviewer}>
                            {run.reviewer ? (
                              run.reviewer.name
                            ) : (
                              <span className="muted">{t.runs.notSigned}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {data.recentRuns.length > 0 && data.recentRuns.length < volume.runs ? (
                <p className="db-fine">
                  {t.runs.truncated(String(data.recentRuns.length), String(volume.runs))}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* --- 10. No score, and not an availability page ------------------- */}
      {/*
        R5: the last block of every page is what that page did not prove. Here that
        is the shape of the page itself — the thing it deliberately refuses to
        become.
      */}
      <section className="shell section section--minor railed" aria-labelledby="db-no-score">
        {index('no-score')}
        <div className="railed__body">
          <div className="section__head">
            <h2 id="db-no-score">{t.noScore.title}</h2>
          </div>

          <div className="section__body">
            <div className="refusal">
              <h3 className="refusal__title">{t.noScore.composite.heading}</h3>
              <p>{t.noScore.composite.body}</p>
            </div>
            <div className="refusal">
              <h3 className="refusal__title">{t.noScore.availability.heading}</h3>
              <p>{t.noScore.availability.body}</p>
            </div>

            <div className="cta">
              <Link to="/refusals" navigate={navigate} className="button">
                {t.noScore.ctaLabel}
              </Link>
              <p className="cta__note">{t.noScore.ctaNote}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* =========================================================================
 * Parts
 * ====================================================================== */

/**
 * A readiness figure.
 *
 * THE STATE UNION HAS NO `ok` MEMBER, and its absence is the whole point. The
 * green readiness tile is not merely unused here — it is unreachable, so a design
 * pass cannot reintroduce it by adding one `className`, and `.stat--ok` was
 * deleted from the stylesheet in the same pass. A string assertion over rendered
 * markup catches the class name; only the union catches the decision.
 *
 * `dormant` is the deferred state and NOT amber. It is emitted for the invariants
 * tile, where it does not mean "assumed" — nothing on this page is an assumed
 * value — but "the rest of the checks had nothing to read", which is NOT ASSESSED.
 * The name was `partial` and was changed with the colour, because a class called
 * `partial` invites the next amber.
 *
 * Each state carries a drawn mark as well as a colour, so the row survives
 * greyscale, a photocopy and a colour vision deficiency.
 */
function Stat({
  label,
  value,
  state,
  note,
}: {
  readonly label: string;
  readonly value: string;
  readonly state: 'dormant' | 'blocked' | 'plain';
  readonly note?: ReactNode;
}): JSX.Element {
  return (
    <div className={`stat stat--${state}`}>
      <span className="stat__value">
        {state === 'plain' ? null : (
          <span className="stat__mark">
            <Glyph name={state === 'blocked' ? 'variance' : 'deferred'} />
          </span>
        )}
        {value}
      </span>
      <span className="stat__label">{label}</span>
      {note ? <span className="stat__note">{note}</span> : null}
    </div>
  );
}

/**
 * The measured swing, as a figure and a bar.
 *
 * A zero renders an em dash rather than `0.0%` or `not measured`. See the note in
 * §6 above for the argument in full and for the owner of the fix: the two things
 * arrive here as one string, so the page must say neither.
 */
function Swing({ effect }: { readonly effect: string }): JSX.Element {
  const t = useDict(EN, AR);
  const pct = Number(effect) * 100;
  if (!Number.isFinite(pct) || pct <= 0) {
    return (
      <span className="db-swing">
        <span className="db-swing__figure" aria-hidden="true">
          —
        </span>
        <span className="sr-only">{t.exposure.noFigure}</span>
      </span>
    );
  }
  const width = Math.min(100, (pct / SWING_REFERENCE_PCT) * 100);
  return (
    <span className="db-swing">
      <span className="db-swing__figure">{pct.toFixed(1)}%</span>
      <span
        className="meter db-swing__bar"
        data-state="assumed"
        aria-hidden="true"
        style={{ '--meter-value': `${width.toFixed(2)}%` } as CSSProperties}
      >
        <span className="meter__fill" />
      </span>
    </span>
  );
}

/**
 * Which limit bound, across the runs this store holds.
 *
 * THE BARS ARE NEUTRAL, and that is a ruling rather than a shortage of colour. The
 * chassis meter has a `binding` state painted in the interactive blue, and using
 * it here would assert in colour which band governs — a claim no page may make in
 * anything but a value templated from the data, because a rule edit that made a
 * different band bind would leave a coloured bar false with every gate green. The
 * label and the count carry the answer; the bar carries only the magnitude.
 */
function BandSplit({
  bands,
  total,
}: {
  readonly bands: Record<string, number>;
  readonly total: number;
}): JSX.Element {
  const t = useDict(EN, AR);
  if (total === 0) {
    return (
      <div className="empty">
        <p className="empty__title">{t.volume.split.emptyTitle}</p>
        <p>{t.volume.split.emptyBody}</p>
      </div>
    );
  }
  return (
    <ul className="db-split">
      {/* The three bands in the dictionary's own key order, which is A, B, C in both
          languages: the letters are the engine's names for them. */}
      {Object.entries(t.bands).map(([key, label]) => {
        const n = bands[key] ?? 0;
        const pct = (n / total) * 100;
        return (
          <li key={key} className="db-split__row">
            <span className="db-split__label">{label}</span>
            <span
              className="meter"
              aria-hidden="true"
              style={{ '--meter-value': `${pct.toFixed(2)}%` } as CSSProperties}
            >
              <span className="meter__fill" />
            </span>
            <span className="db-split__count">
              {n} <span className="muted">{t.volume.split.of} {total}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
