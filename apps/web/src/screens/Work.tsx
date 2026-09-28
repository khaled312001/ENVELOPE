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

export function RunTable({
  rows,
  caption,
  empty,
  navigate,
}: {
  readonly rows: readonly RunRow[];
  readonly caption: string;
  readonly empty: string;
  /** With it, each run's time is a link to the run's own page. */
  readonly navigate?: (to: Href) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  if (rows.length === 0) {
    return (
      <p className="muted wk__empty">{empty}</p>
    );
  }
  return (
    <div className="schedule">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.table.columns.plot}</th>
            <th scope="col">{t.table.columns.governing}</th>
            <th scope="col">{t.table.columns.binds}</th>
            <th scope="col">{t.table.columns.assumed}</th>
            <th scope="col">{t.table.columns.gates}</th>
            <th scope="col">{t.table.columns.run}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.runId}>
              <td>
                <span className="wk__plot">
                  <Ltr>{r.plotNumber}</Ltr>
                </span>
                <span className="wk__community">
                  <Ltr>{r.community}</Ltr>
                </span>
              </td>
              <td>
                {/*
                  THE FIGURE AND THE BAND THAT PRODUCED IT ARE ONE CELL.

                  Splitting them puts a column of capacities beside a column of
                  bands, and a column of capacities is a portfolio valuation — the
                  comparison the three-band model exists to refuse. Together they
                  are one statement: this many square metres, from this band.
                */}
                <span className="value">{group(r.governingGfaM2)}</span> m²
                <span className="wk__band">{bandLabel(t, r.governingBand)}</span>
              </td>
              <td>
                <Ltr>{r.bindingLabel}</Ltr>
              </td>
              <td>
                {/*
                  Not a badge and not a colour. The amber treatment belongs to a
                  value that IS assumed; a count of assumptions is a fact about a
                  run, and painting it amber would teach a reader that amber means
                  "there were some", which is the reservation §13.1 exists to
                  protect.
                */}
                <span className="value">{r.assumptionCount}</span>
              </td>
              <td>
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
              </td>
              <td>
                {navigate ? (
                  <Link to={`/work?run=${encodeURIComponent(r.runId)}`} navigate={navigate} className="wk__when">
                    <Ltr>
                      {day(r.createdAt)} {time(r.createdAt)}
                    </Ltr>
                  </Link>
                ) : (
                  <span className="wk__when">
                    <Ltr>
                      {day(r.createdAt)} {time(r.createdAt)}
                    </Ltr>
                  </span>
                )}
                {r.sharedRole ? <span className="chip">{t.table.roles[r.sharedRole]}</span> : null}
                {r.draftRules ? (
                  /* The run was computed against rules nobody approved. It is the
                     single most important qualifier a stored run carries, and a
                     list that omitted it would be presenting a demonstration as a
                     record. */
                  <span className="chip chip--deferred">{t.table.draftRules}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
