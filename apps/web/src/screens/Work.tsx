/**
 * `/work` — what this account has done.
 *
 * ---------------------------------------------------------------------------
 * WHAT A LIST OF RUNS MAY NOT BECOME.
 *
 * The default shape for this screen is a dashboard of tiles: runs this month, total
 * capacity, average levels, a sparkline. Every one of those is a number the engine
 * never produced, computed in the view layer, about a set of runs that share no
 * input — and `CLAUDE.md` names the class: *"Nothing there computes a number a user
 * will see."* An average of two governing capacities from two different plots is not
 * a fact about anything.
 *
 * So there is NO AGGREGATE ON THIS PAGE. No total, no average, no trend, no score.
 * The only counts are counts of rows, which are facts about the list itself and are
 * true by construction.
 *
 * The second temptation is worse: a column of governing capacities reads as a
 * portfolio valuation. Each figure is real, each carries its own assumptions and its
 * own gates, and set side by side in a table they invite exactly the comparison the
 * three-band model exists to refuse. Each row therefore carries what governs it and
 * what it assumed, in the same eyeful as the number — the same rule the landing
 * page's fold obeys.
 *
 * ---------------------------------------------------------------------------
 * THE THREE LISTS, AND WHY THEY ARE THREE.
 *
 * `authored` and `shared` are separated because the difference is a fact about
 * authority, not about layout: a run someone shared with you is a run you did not
 * make, and a reviewer looking at a list where the two are mixed cannot tell whose
 * judgement produced which. `drafts` is separate again because a draft is not a run
 * at all — it is a half-filled form with no provenance graph, no fingerprint and
 * nothing computed, and putting it in the same list would be the one place on this
 * site where an unvalidated input sat beside a traced value.
 *
 * ---------------------------------------------------------------------------
 * TWO LANGUAGES, AND NOTHING THE API SENT IS IN EITHER DICTIONARY.
 *
 * Every sentence, heading and column label comes from `i18n/work.en.ts` or its
 * Arabic twin, held to one type. What a row carries — the plot number, the
 * community, the governing figure, the binding label, a name, a timestamp — stays
 * exactly as the API sent it and is set inside `Ltr` on the Arabic page, so the
 * bidirectional algorithm cannot carry a full stop or a bracket to the wrong end of
 * it. `docs/05-design/arabic-glossary.md` carries the argument.
 */

import { useEffect, useState, type ReactNode } from 'react';

import { AR } from '../i18n/work.ar.js';
import { EN, type WorkDictionary } from '../i18n/work.en.js';
import { useDict, useLocale, useT, Verbatim } from '../i18n/locale.js';
import type { PageProps } from '../Root.js';
import { Link, type Href } from '../router.js';
import { useSession } from '../session.js';
import { RunPage } from './RunPage.js';

export interface RunRow {
  readonly runId: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly plotNumber: string;
  readonly community: string;
  readonly governingBand: string;
  readonly governingGfaM2: string;
  readonly levels: string;
  readonly bindingLabel: string;
  readonly assumptionCount: number;
  readonly draftRules: boolean;
  /** The export gates signed, out of `EXPORT_GATES`. G1 and G2 precede the run and are not stored. */
  readonly gatesSatisfied: number;
  readonly reviewer: { readonly name: string; readonly at: string } | null;
  readonly sharedRole?: 'reviewer' | 'reader';
}

interface WorkView {
  readonly account: { readonly accountId: string; readonly name: string; readonly email: string };
  readonly authored: readonly RunRow[];
  readonly shared: readonly RunRow[];
  readonly drafts: readonly { readonly draftKey: string; readonly updatedAt: string }[];
}

/**
 * A timestamp a reader can check, formatted without a locale.
 *
 * `Readiness.tsx` makes this argument already and it holds here: `toLocaleString`
 * renders differently on the reader's machine than on the one the screenshot was
 * taken on, so a date in a bug report and a date on the screen stop matching. The
 * ISO date, sliced, is the same everywhere — and the same in both languages.
 */
const day = (iso: string): string => iso.slice(0, 10);
const time = (iso: string): string => iso.slice(11, 16);

/**
 * The export gates a stored run can hold: G3 and G4. G1 and G2 gate the computation,
 * so they are given before the run exists and are never stored against it — which is
 * why this is two and not four. A count, so not copy.
 */
const EXPORT_GATES = 2;

/**
 * WHAT THE API SENT, ISOLATED ON THE ARABIC PAGE AND UNTOUCHED ON THE ENGLISH ONE.
 *
 * A plot number, a community, a binding label, a name or a timestamp is a Latin run,
 * and inside an Arabic paragraph the bidirectional algorithm reorders it at its
 * boundaries — `2026-08-30 10:00` renders with its two halves swapped. `Verbatim`
 * sets `dir="ltr" lang="en"` and `rtl.css` isolates it, which fixes that and switches
 * a screen reader's voice for it.
 *
 * On the English page the document is already `lang="en" dir="ltr"`, so the span
 * would carry nothing a reader or a screen reader could use, and the English render
 * of this page is held unchanged by the extraction that moved its copy into a
 * dictionary. `Antechamber.tsx` makes the same choice for the same reason.
 */
export function Ltr({ children }: { readonly children: ReactNode }): JSX.Element {
  const { locale } = useLocale();
  return locale === 'ar' ? <Verbatim>{children}</Verbatim> : <>{children}</>;
}

/**
 * The band's letter. The letters are the engine's names for the three bands — the
 * PRD, the report and every export use them — so they are not copy and sit here
 * rather than in either dictionary; the question each band answers is copy.
 */
const BAND_LETTER: Readonly<Record<string, string>> = {
  REGULATORY: 'A',
  GEOMETRIC: 'B',
  PARKING: 'C',
};

/**
 * A band by its letter and its question, in the dictionary's words.
 *
 * A token this page has no question for falls back to itself — the engine's word,
 * untranslated. A band the page cannot name is still a band the run reported, and
 * inventing a name for it would put a word on the page that no rule produced.
 */
export function bandLabel(t: WorkDictionary, band: string): string {
  const letter = BAND_LETTER[band];
  const question = (t.bands as Readonly<Record<string, string>>)[band];
  return letter && question ? t.band(letter, question) : t.bandToken(band);
}

/**
 * `bandLabel` in the reader's language, for a screen that does not otherwise read
 * this dictionary — `RunPage` names the governing band in the same words as the row
 * it was opened from.
 */
export function useBandLabel(): (band: string) => string {
  const t = useDict(EN, AR);
  return (band: string): string => bandLabel(t, band);
}

/** Thousands separators and not one digit of rounding: the figure is the engine's. */
export function group(value: string): string {
  const [whole, frac] = value.split('.');
  const grouped = (whole ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${grouped}.${frac}` : grouped;
}

/**
 * The runs, as cards.
 *
 * ---------------------------------------------------------------------------
 * IT WAS A SIX-COLUMN TABLE, AND THE CLIENT ASKED FOR A SHOP.
 *
 * «واجعل الداشبورد احترافيه فى تصميمها كأني داخل موقع E-Commerce» (6 Oct 2026).
 * A schedule is the right shape for figures a reader compares column by column,
 * and comparing runs column by column is exactly what this list may not invite:
 * a column of capacities beside a column of plots is a portfolio valuation, and
 * the three-band model exists to refuse that reading. So the card is not only the
 * look he asked for — it is the shape that puts each run's figure with the band
 * that produced it and keeps the next run a card away rather than a row below.
 *
 * WHAT A CARD MAY NOT DO, and none of these are styling decisions:
 *
 *   - nothing is computed across the cards. No total, no average, no "best", no
 *     difference. The page shows runs; the reader compares them.
 *   - the band travels with the figure, in words, inside the same block.
 *   - `draft rules` stays on the card it belongs to. A run computed against rules
 *     nobody approved is a demonstration, and a grid that dropped the chip to
 *     tidy the layout would be presenting it as a record.
 *   - the assumption count is a count and is not painted. The ASSUMED treatment
 *     belongs to a value that IS assumed; teaching a reader that it means "there
 *     were some" is the reservation §13.1 protects.
 *
 * A LIST, NOT A GRID OF DIVS. Each card is an `<li>`, each run's figures are a
 * `<dl>` with real terms, and the whole thing keeps the caption the table had as
 * the list's accessible name — so a screen reader still hears "plot", "governing
 * capacity", "what binds it" against each value instead of a wall of text.
 */
/**
 * THE STRIP ACROSS THE TOP OF THIS PAGE, AND THE LINE IT MAY NOT CROSS.
 *
 * This file's header refuses a dashboard, and it is right to: runs this month,
 * total capacity, average levels, a sparkline — every one of those is a number
 * the engine never produced, computed in the view layer, about a set of runs
 * that share no input. An average of two governing capacities from two different
 * plots is not a fact about anything.
 *
 * It also says what IS permitted, in the same paragraph: *"The only counts are
 * counts of rows, which are facts about the list itself and are true by
 * construction."* That is the whole of this component. Four counts, each of them
 * the length of a list the API sent — how many runs this account authored, how
 * many were shared with it, how many of them carry both export signatures, and
 * how many forms are half-filled. Nothing here is divided, averaged, summed over
 * a unit, or compared across plots; delete the list and the figure goes with it.
 *
 * Why it exists at all: the client asked for the workspace to read as a control
 * panel rather than as a document. A count of rows is the one kind of figure a
 * control panel can show here without inventing a fact, and four of them answer
 * the question somebody opens this page with — how much is here, and how much of
 * it is finished.
 *
 * THE GATE COUNT IS THE ONE WITH A DEFINITION, so it carries it on screen. A run
 * is counted as signed when both export gates are signed, which is the same test
 * the export screen applies; a run with one of two is not "half signed" on this
 * strip, because the files are released on both or on neither.
 */
function WorkTally({ view }: { readonly view: WorkView }): JSX.Element {
  const t = useDict(EN, AR);
  const signed = view.authored.filter((r) => r.gatesSatisfied >= EXPORT_GATES).length;

  const tiles: readonly { readonly key: string; readonly n: number; readonly label: string }[] = [
    { key: 'authored', n: view.authored.length, label: t.tally.authored },
    { key: 'shared', n: view.shared.length, label: t.tally.shared },
    { key: 'signed', n: signed, label: t.tally.signed },
    { key: 'drafts', n: view.drafts.length, label: t.tally.drafts },
  ];

  return (
    <section className="shell section section--minor" aria-labelledby="wk-tally">
      <h2 id="wk-tally" className="sr-only">
        {t.tally.heading}
      </h2>
      <ul className="tally">
        {tiles.map((tile) => (
          <li key={tile.key} className="tally__tile">
            {/* The figure first and the label under it: on a tile the number is
                what is read, and a label above it is read as a heading for a
                section rather than as the name of the figure. */}
            <span className="tally__n value">{tile.n}</span>
            <span className="tally__label">{tile.label}</span>
          </li>
        ))}
      </ul>
      <p className="tally__note">{t.tally.note}</p>
    </section>
  );
}

export function RunTable({
  rows,
  caption,
  empty,
  navigate,
}: {
  readonly rows: readonly RunRow[];
  readonly caption: string;
  readonly empty: string;
  /** With it, each card's heading is a link to the run's own page. */
  readonly navigate?: (to: Href) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  if (rows.length === 0) {
    return <p className="muted wk__empty">{empty}</p>;
  }
  return (
    <ul className="runcards" aria-label={caption}>
      {rows.map((r) => {
        const to: Href = `/work?run=${encodeURIComponent(r.runId)}`;
        return (
          <li key={r.runId} className="runcard">
            <div className="runcard__head">
              <p className="runcard__plot">
                <span className="runcard__number">
                  <Ltr>{r.plotNumber}</Ltr>
                </span>
                <span className="runcard__community">
                  <Ltr>{r.community}</Ltr>
                </span>
              </p>
              <p className="runcard__when">
                <Ltr>
                  {day(r.createdAt)} {time(r.createdAt)}
                </Ltr>
              </p>
            </div>

            {/*
              THE FIGURE AND THE BAND THAT PRODUCED IT ARE ONE BLOCK.

              Separating them would put a capacity where a price goes on the kind
              of card this is modelled on, and a price is a number that stands on
              its own. This one does not: it is this many square metres, from this
              band, and the band is in words beneath it on every card.
            */}
            <p className="runcard__figure">
              <span className="value">{group(r.governingGfaM2)}</span>
              <span className="runcard__unit">m²</span>
            </p>
            <p className="runcard__band">{bandLabel(t, r.governingBand)}</p>

            <dl className="runcard__facts">
              <div>
                <dt>{t.table.columns.binds}</dt>
                <dd>
                  <Ltr>{r.bindingLabel}</Ltr>
                </dd>
              </div>
              <div>
                <dt>{t.table.columns.assumed}</dt>
                <dd>
                  <span className="value">{r.assumptionCount}</span>
                </dd>
              </div>
              <div>
                <dt>{t.table.columns.gates}</dt>
                <dd>
                  <span className="value">{r.gatesSatisfied}</span>
                  {t.table.of}
                  <span className="value">{EXPORT_GATES}</span>
                  {r.reviewer ? (
                    <span className="wk__reviewer">
                      {t.table.signedBy}
                      <Ltr>{r.reviewer.name}</Ltr>
                    </span>
                  ) : (
                    <span className="wk__reviewer muted">{t.table.notSigned}</span>
                  )}
                </dd>
              </div>
            </dl>

            <p className="runcard__chips">
              {r.sharedRole ? <span className="chip">{t.table.roles[r.sharedRole]}</span> : null}
              {r.draftRules ? <span className="chip chip--deferred">{t.table.draftRules}</span> : null}
            </p>

            {navigate ? (
              <Link to={to} navigate={navigate} className="button button--primary runcard__open">
                {t.table.open}
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Why the list did not load, kept as a kind rather than as a sentence.
 *
 * A stored sentence is in whatever language the page was in when the request
 * failed, and switching language afterwards would leave it behind. The server's own
 * sentence is the exception: it is the server's, it is rendered as it arrived, and
 * no dictionary holds a translation of it.
 */
type LoadError =
  | { readonly kind: 'server'; readonly text: string }
  | { readonly kind: 'status'; readonly status: number }
  | { readonly kind: 'network' };

export default function Work({ navigate, search }: PageProps): JSX.Element {
  const t = useDict(EN, AR);
  const chrome = useT();
  const { state, account } = useSession();
  const openRun = new URLSearchParams(search).get('run');
  const [view, setView] = useState<WorkView | null>(null);
  const [error, setError] = useState<LoadError | null>(null);

  useEffect(() => {
    if (state !== 'signed-in') return;
    let cancelled = false;
    void fetch('/api/work')
      .then(async (r) => {
        const body: unknown = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(
            typeof body === 'object' && body !== null && 'error' in body
              ? { kind: 'server', text: String((body as { error: unknown }).error) }
              : { kind: 'status', status: r.status },
          );
          return;
        }
        setView(body as WorkView);
      })
      .catch(() => {
        if (!cancelled) setError({ kind: 'network' });
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  if (openRun && state === 'signed-in') {
    return <RunPage runId={openRun} rows={view ? [...view.authored, ...view.shared] : []} navigate={navigate} />;
  }

  return (
    <div className="wk">
      <section className="shell section section--opening" aria-labelledby="wk-h">
        <h1 id="wk-h">{t.hero.title}</h1>
        <p className="wk__lede">{t.hero.lede}</p>
      </section>

      {state === 'checking' ? (
        <section className="shell section section--minor">
          <p className="muted">{t.checking}</p>
        </section>
      ) : null}

      {state === 'signed-out' || state === 'offline' ? (
        <section className="shell section section--minor">
          <div className="plate">
            <p>{t.signedOut.body}</p>
            <Link to="/app" navigate={navigate} className="button button--primary">
              {t.signedOut.cta}
            </Link>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="shell section section--minor">
          <p className="banner banner--danger" role="alert">
            {error.kind === 'server' ? (
              <Ltr>{error.text}</Ltr>
            ) : error.kind === 'status' ? (
              <>
                {t.fetch.statusBefore}
                <Ltr>{String(error.status)}</Ltr>
                {t.fetch.statusAfter}
              </>
            ) : (
              t.fetch.failed
            )}
          </p>
        </section>
      ) : null}

      {view ? (
        <>
          <WorkTally view={view} />

          <section className="shell section" aria-labelledby="wk-authored">
            <div className="section__head">
              <h2 id="wk-authored">{t.authored.title}</h2>
            </div>
            <RunTable
              rows={view.authored}
              caption={t.authored.caption}
              empty={t.authored.empty(chrome.runAPlot)}
              navigate={navigate}
            />
          </section>

          <section className="shell section" aria-labelledby="wk-shared">
            <div className="section__head">
              <h2 id="wk-shared">{t.shared.title}</h2>
              <p className="wk__note">
                {/*
                  The one sentence on this page that describes a control, so it says
                  exactly what the control is and stops. Being named a reviewer means
                  the run is readable; it does not mean the licence was checked, and
                  the export still records an assertion rather than a verification.
                */}
                {t.shared.note}
              </p>
            </div>
            <RunTable
              rows={view.shared}
              caption={t.shared.caption}
              empty={t.shared.empty}
              navigate={navigate}
            />
          </section>

          <section className="shell section section--minor" aria-labelledby="wk-drafts">
            <div className="section__head">
              <h2 id="wk-drafts">{t.drafts.title}</h2>
              <p className="wk__note">{t.drafts.note}</p>
            </div>
            {view.drafts.length === 0 ? (
              <p className="muted wk__empty">{t.drafts.empty}</p>
            ) : (
              <ul className="wk__drafts">
                {view.drafts.map((d) => (
                  <li key={d.draftKey}>
                    <span>
                      {/* A key the product does not name is the form's own word, as written. */}
                      {(t.drafts.labels as Readonly<Record<string, string>>)[d.draftKey] ?? (
                        <Ltr>{d.draftKey}</Ltr>
                      )}
                    </span>
                    <span className="wk__when">
                      <Ltr>
                        {day(d.updatedAt)} {time(d.updatedAt)}
                      </Ltr>
                    </span>
                    <Link to="/app" navigate={navigate}>
                      {t.drafts.resume}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="shell section section--minor">
            <p className="fine-print">
              {/*
                THE DISCLOSURE THIS PAGE IS OBLIGED TO CARRY.

                It used to say that any identified caller could read any run through
                the API, which was true until `access.ts` scoped every run route to
                its author and the accounts it was shared with. What is still true is
                narrower, and it is what a reader of a private list needs to know:
                there are no firms or projects, only accounts. The sentence is in the
                dictionary, and `work.test.tsx` holds it present there in both
                languages.
              */}
              {t.disclosure.before}
              <Link to="/refusals" navigate={navigate}>
                {t.disclosure.link}
              </Link>
              {t.disclosure.after}
            </p>
          </section>
        </>
      ) : null}

      {state === 'signed-in' && account && !view && !error ? (
        <section className="shell section section--minor">
          <p className="muted">{t.loading}</p>
        </section>
      ) : null}
    </div>
  );
}
