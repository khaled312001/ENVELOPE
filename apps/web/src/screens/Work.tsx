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
 */

import { useEffect, useState } from 'react';

import type { PageProps } from '../Root.js';
import { Link } from '../router.js';
import { useSession } from '../session.js';

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
 * `Dashboard.tsx` makes this argument already and it holds here: `toLocaleString`
 * renders differently on the reader's machine than on the one the screenshot was
 * taken on, so a date in a bug report and a date on the screen stop matching. The
 * ISO date, sliced, is the same everywhere.
 */
const day = (iso: string): string => iso.slice(0, 10);
const time = (iso: string): string => iso.slice(11, 16);

/** The draft keys the product writes, in the reader's words rather than the form's. */
const DRAFT_LABELS: Readonly<Record<string, string>> = {
  'plot-form': 'A plot you started entering',
};

export function RunTable({
  rows,
  caption,
  empty,
}: {
  readonly rows: readonly RunRow[];
  readonly caption: string;
  readonly empty: string;
}): JSX.Element {
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
            <th scope="col">Plot</th>
            <th scope="col">Governing capacity</th>
            <th scope="col">What binds it</th>
            <th scope="col">Assumed</th>
            <th scope="col">Gates</th>
            <th scope="col">Run</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.runId}>
              <td>
                <span className="wk__plot">{r.plotNumber}</span>
                <span className="wk__community">{r.community}</span>
              </td>
              <td>
                {/*
                  THE FIGURE AND THE BAND THAT PRODUCED IT ARE ONE CELL.

                  Splitting them puts a column of capacities beside a column of
                  bands, and a column of capacities is a portfolio valuation — the
                  comparison the three-band model exists to refuse. Together they
                  are one statement: this many square metres, from this band.
                */}
                <span className="value">{r.governingGfaM2}</span> m²
                <span className="wk__band">band {r.governingBand}</span>
              </td>
              <td>{r.bindingLabel}</td>
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
                <span className="value">{r.gatesSatisfied}</span> of <span className="value">4</span>
                {r.reviewer ? (
                  <span className="wk__reviewer">signed by {r.reviewer.name}</span>
                ) : (
                  <span className="wk__reviewer muted">not signed</span>
                )}
              </td>
              <td>
                <span className="wk__when">
                  {day(r.createdAt)} {time(r.createdAt)}
                </span>
                {r.sharedRole ? <span className="chip">{r.sharedRole}</span> : null}
                {r.draftRules ? (
                  /* The run was computed against rules nobody approved. It is the
                     single most important qualifier a stored run carries, and a
                     list that omitted it would be presenting a demonstration as a
                     record. */
                  <span className="chip chip--deferred">draft rules</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Work({ navigate }: PageProps): JSX.Element {
  const { state, account } = useSession();
  const [view, setView] = useState<WorkView | null>(null);
  const [error, setError] = useState<string | null>(null);

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
              ? String((body as { error: unknown }).error)
              : `the server answered ${r.status}`,
          );
          return;
        }
        setView(body as WorkView);
      })
      .catch(() => {
        if (!cancelled) setError('the list could not be loaded');
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  return (
    <div className="wk">
      <section className="shell section section--opening" aria-labelledby="wk-h">
        <h1 id="wk-h">Your work</h1>
        <p className="wk__lede">
          Every run you author is kept exactly as it was computed, with its inputs, its
          assumptions and its provenance graph. Nothing here is recomputed to fill a column.
        </p>
      </section>

      {state === 'checking' ? (
        <section className="shell section section--minor">
          <p className="muted">Checking whether you are signed in…</p>
        </section>
      ) : null}

      {state === 'signed-out' || state === 'offline' ? (
        <section className="shell section section--minor">
          <div className="plate">
            <p>
              This list is kept against an account. Open the engine and create one, or sign in
              — a run authored without an account is computed identically and is not kept.
            </p>
            <Link to="/app" navigate={navigate} className="button button--primary">
              Open the engine
            </Link>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="shell section section--minor">
          <p className="banner banner--danger" role="alert">
            {error}
          </p>
        </section>
      ) : null}

      {view ? (
        <>
          <section className="shell section" aria-labelledby="wk-authored">
            <div className="section__head">
              <h2 id="wk-authored">Runs you authored</h2>
            </div>
            <RunTable
              rows={view.authored}
              caption="Runs authored by this account"
              empty="You have not authored a run yet. The engine opens from “Run a plot”."
            />
          </section>

          <section className="shell section" aria-labelledby="wk-shared">
            <div className="section__head">
              <h2 id="wk-shared">Shared with you</h2>
              <p className="wk__note">
                {/*
                  The one sentence on this page that describes a control, so it says
                  exactly what the control is and stops. Being named a reviewer means
                  the run is readable; it does not mean the licence was checked, and
                  the export still records an assertion rather than a verification.
                */}
                A run someone shared with you, in the role they named. A reviewer role makes the
                run readable; it does not verify anybody’s licence.
              </p>
            </div>
            <RunTable
              rows={view.shared}
              caption="Runs shared with this account"
              empty="Nothing has been shared with you."
            />
          </section>

          <section className="shell section section--minor" aria-labelledby="wk-drafts">
            <div className="section__head">
              <h2 id="wk-drafts">Unfinished</h2>
              <p className="wk__note">
                What you had typed when you last closed the tab. A draft is not a run: nothing
                in it has been computed, and it carries no provenance.
              </p>
            </div>
            {view.drafts.length === 0 ? (
              <p className="muted wk__empty">Nothing unfinished.</p>
            ) : (
              <ul className="wk__drafts">
                {view.drafts.map((d) => (
                  <li key={d.draftKey}>
                    <span>{DRAFT_LABELS[d.draftKey] ?? d.draftKey}</span>
                    <span className="wk__when">
                      {day(d.updatedAt)} {time(d.updatedAt)}
                    </span>
                    <Link to="/app" navigate={navigate}>
                      Resume it
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

                `/api/work` is the first route in the product with any authorization,
                and `/api/runs` still lists every run to any identified actor. A page
                that showed a private list without saying that would be implying an
                isolation the deployment does not have everywhere.
              */}
              This list is scoped to your account. Other routes in this deployment are not:
              any identified caller can still read any run through the API. That is disclosed
              rather than fixed, and it is on{' '}
              <Link to="/refusals" navigate={navigate}>
                what it refuses
              </Link>
              .
            </p>
          </section>
        </>
      ) : null}

      {state === 'signed-in' && account && !view && !error ? (
        <section className="shell section section--minor">
          <p className="muted">Loading your runs…</p>
        </section>
      ) : null}
    </div>
  );
}
