/**
 * Run persistence — §13.4 immutable-run reproducibility.
 *
 * "A run's stored outputs, inputs, versions, and provenance graph are
 * retrievable unchanged, and the deterministic portion of the pipeline can be
 * re-executed from persisted intermediate artifacts to produce byte-identical
 * results." 100%, required.
 *
 * Two consequences that shape this file:
 *
 * 1. **Runs are append-only.** There is no `update`. Editing an assumption
 *    creates a *new* run that records its parent; the original stays exactly as
 *    it was. A report someone took to an investment committee must still say
 *    what it said.
 * 2. **What is persisted is enumerated by the PRD**, not by convenience:
 *    post-extraction structured inputs, rule-set version and content hash,
 *    metric definitions version, all assumption values, all user inputs, engine
 *    version, RNG seed, and the full provenance graph.
 *
 * ---
 *
 * **Why `node:sqlite` and not Postgres.** PRD §19.1 specifies PostgreSQL 16 +
 * PostGIS. PostGIS is not on the critical path — §14 puts every geometric
 * operation in the kernel with independent recomputation, so the database stores
 * geometry and never computes with it. What remains is a relational store with
 * recursive-CTE support for walking the provenance graph, which SQLite provides.
 *
 * Using the runtime's built-in SQLite means a design partner can run the product
 * with no database server, no Docker and no native compilation. The seam is the
 * {@link RunRepository} interface: a Postgres implementation is a single new
 * class, and the SQL below is deliberately written in the subset both dialects
 * share.
 */

import { createRequire } from 'node:module';

/**
 * `node:sqlite` is resolved through `createRequire` rather than imported.
 *
 * It shipped in Node 22.5 and is not yet in Vite's list of known builtins, so a
 * static `import … from 'node:sqlite'` gets its `node:` prefix stripped during
 * transform and then fails to resolve as a bare `sqlite` package. Going through
 * `createRequire` hands resolution back to Node, where the module exists.
 *
 * This is a toolchain workaround, not a design choice — delete it once Vite
 * knows the module.
 */
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
type DatabaseSync = InstanceType<typeof DatabaseSync>;

export interface StoredRun {
  readonly runId: string;
  readonly tenantId: string;
  readonly plotId: string;
  /** Run this one was derived from, when an assumption was edited. */
  readonly parentRunId: string | null;
  readonly createdAt: string;
  readonly createdByActorId: string;
  readonly createdByActorName: string;
  readonly engineVersion: string;
  readonly annexVersion: string;
  readonly ruleSetHash: string;
  /** Everything the pipeline consumed, serialised. Sufficient to re-execute. */
  readonly input: string;
  /** Everything it produced, including the provenance graph. */
  readonly output: string;
  /**
   * The §3.4 report document, canonically serialised at run time.
   *
   * Stored rather than rebuilt on demand. §13.4 asks for a run to be
   * "retrievable unchanged" and for re-execution to be byte-identical; a report
   * assembled fresh at each export is retrievable *equivalent*, which is a
   * weaker property and one nobody would notice weakening. Canonical
   * key-sorted JSON means two exports of one run are two identical files, so
   * the guarantee is checkable with `diff` rather than with a semantic
   * comparison someone has to be trusted to write.
   */
  readonly report: string;
  /** Content hash over input + versions. Two equal fingerprints are one run. */
  readonly fingerprint: string;
  /** True when the run was built on DRAFT rules and may not be relied upon. */
  readonly draftRules: boolean;
  /** Gate acknowledgements, keyed by gate id. Export is refused without them. */
  readonly gates: string;
}

/**
 * A plot, as stored.
 *
 * Plots used to live in a `Map` on the server object, which was defensible while
 * §13.4 only required *runs* to be durable — "a run's stored outputs, inputs,
 * versions and provenance graph are retrievable unchanged". It stopped being
 * defensible the moment anything wanted to look across plots: a portfolio view
 * over a Map is a view that empties every time the process restarts, and a
 * number that disappears on deploy is worse than no number.
 *
 * The geometry is stored as the serialised `Plot` the engine built, not
 * re-derived from the request. Re-deriving would mean a plot could analyse
 * differently on read than it did on write — the exact drift the run fingerprint
 * exists to detect, reintroduced one layer down.
 */
export interface StoredPlot {
  readonly plotId: string;
  readonly tenantId: string;
  readonly plotNumber: string;
  readonly community: string;
  readonly landUse: string;
  readonly createdAt: string;
  readonly createdByActorId: string;
  readonly createdByActorName: string;
  readonly computedAreaM2: string;
  readonly areaMismatch: boolean;
  readonly frontageCount: number;
  readonly shapeClass: string;
  /** The full `Plot` domain object, serialised. */
  readonly plot: string;
}

/**
 * The persistence seam.
 *
 * Every method returns a promise. SQLite's driver is synchronous and gains
 * nothing from it, but MySQL's cannot be anything else, and an interface shaped
 * around the synchronous backend would have left the other one unimplementable
 * — the seam would have existed in the comments and nowhere else. Resolving an
 * already-computed value is the cheap half of that trade.
 */
export interface RunRepository {
  insert(run: StoredRun): Promise<void>;
  get(runId: string): Promise<StoredRun | undefined>;
  listByPlot(plotId: string): Promise<readonly StoredRun[]>;
  /** Newest first. `limit` bounds the page; the dashboard never asks for all. */
  listRuns(limit?: number): Promise<readonly StoredRun[]>;

  /**
   * The runs one actor authored, newest first.
   *
   * A SEPARATE METHOD RATHER THAN A FILTER OVER `listRuns`, because the filter IS
   * the security property. Reading two hundred runs into memory and dropping the
   * ones that do not match puts every other account’s data into the process that
   * is answering one account’s request, and the day somebody forgets the filter
   * the defect is a disclosure rather than a wrong list.
   */
  listRunsByActor(actorId: string, limit?: number): Promise<readonly StoredRun[]>;

  /** The named runs, in one statement — used to resolve what was shared with someone. */
  getMany(runIds: readonly string[]): Promise<readonly StoredRun[]>;
  countRuns(): Promise<number>;
  /** Replace the gate record. The only mutable field, and only ever additive. */
  recordGate(runId: string, gates: string): Promise<void>;

  insertPlot(plot: StoredPlot): Promise<void>;
  getPlot(plotId: string): Promise<StoredPlot | undefined>;
  listPlots(limit?: number): Promise<readonly StoredPlot[]>;
  /** The plots one actor entered, newest first — for the reason `listRunsByActor` gives. */
  listPlotsByActor(actorId: string, limit?: number): Promise<readonly StoredPlot[]>;
  countPlots(): Promise<number>;

  close(): Promise<void>;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  run_id                TEXT PRIMARY KEY,
  tenant_id             TEXT NOT NULL,
  plot_id               TEXT NOT NULL,
  parent_run_id         TEXT,
  created_at            TEXT NOT NULL,
  created_by_actor_id   TEXT NOT NULL,
  created_by_actor_name TEXT NOT NULL,
  engine_version        TEXT NOT NULL,
  annex_version         TEXT NOT NULL,
  rule_set_hash         TEXT NOT NULL,
  input                 TEXT NOT NULL,
  output                TEXT NOT NULL,
  report                TEXT NOT NULL,
  fingerprint           TEXT NOT NULL,
  draft_rules           INTEGER NOT NULL,
  gates                 TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS runs_by_plot ON runs (plot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS runs_by_fingerprint ON runs (fingerprint);
CREATE INDEX IF NOT EXISTS runs_by_created ON runs (created_at DESC);
CREATE INDEX IF NOT EXISTS runs_by_actor ON runs (created_by_actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS plots (
  plot_id               TEXT PRIMARY KEY,
  tenant_id             TEXT NOT NULL,
  plot_number           TEXT NOT NULL,
  community             TEXT NOT NULL,
  land_use              TEXT NOT NULL,
  created_at            TEXT NOT NULL,
  created_by_actor_id   TEXT NOT NULL,
  created_by_actor_name TEXT NOT NULL,
  computed_area_m2      TEXT NOT NULL,
  area_mismatch         INTEGER NOT NULL,
  frontage_count        INTEGER NOT NULL,
  shape_class           TEXT NOT NULL,
  plot                  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS plots_by_created ON plots (created_at DESC);
CREATE INDEX IF NOT EXISTS plots_by_community ON plots (community);
CREATE INDEX IF NOT EXISTS plots_by_actor ON plots (created_by_actor_id, created_at DESC);
`;

export class SqliteRunRepository implements RunRepository {
  readonly #db: DatabaseSync;

  constructor(location = ':memory:') {
    this.#db = new DatabaseSync(location);
    // WAL keeps a long-running read of a provenance graph from blocking a write.
    if (location !== ':memory:') this.#db.exec('PRAGMA journal_mode = WAL');
    this.#db.exec('PRAGMA foreign_keys = ON');
    this.#db.exec(SCHEMA);
  }

  async insert(run: StoredRun): Promise<void> {
    this.#db
      .prepare(
        `INSERT INTO runs (
           run_id, tenant_id, plot_id, parent_run_id, created_at,
           created_by_actor_id, created_by_actor_name, engine_version,
           annex_version, rule_set_hash, input, output, report, fingerprint,
           draft_rules, gates
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        run.runId,
        run.tenantId,
        run.plotId,
        run.parentRunId,
        run.createdAt,
        run.createdByActorId,
        run.createdByActorName,
        run.engineVersion,
        run.annexVersion,
        run.ruleSetHash,
        run.input,
        run.output,
        run.report,
        run.fingerprint,
        run.draftRules ? 1 : 0,
        run.gates,
      );
  }

  async get(runId: string): Promise<StoredRun | undefined> {
    const row = this.#db.prepare('SELECT * FROM runs WHERE run_id = ?').get(runId);
    return row ? toRun(row as Record<string, unknown>) : undefined;
  }

  async listByPlot(plotId: string): Promise<readonly StoredRun[]> {
    const rows = this.#db
      .prepare('SELECT * FROM runs WHERE plot_id = ? ORDER BY created_at DESC')
      .all(plotId);
    return (rows as Record<string, unknown>[]).map(toRun);
  }

  async listRunsByActor(actorId: string, limit = 100): Promise<readonly StoredRun[]> {
    const rows = this.#db
      .prepare('SELECT * FROM runs WHERE created_by_actor_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(actorId, limit);
    return (rows as Record<string, unknown>[]).map(toRun);
  }

  async getMany(runIds: readonly string[]): Promise<readonly StoredRun[]> {
    if (runIds.length === 0) return [];
    /* The placeholders are generated from the LENGTH of the list and never from
       its contents. The ids themselves are still bound; only the comma count is
       interpolated, and a count is not user input. */
    const marks = runIds.map(() => '?').join(', ');
    const rows = this.#db
      .prepare(`SELECT * FROM runs WHERE run_id IN (${marks}) ORDER BY created_at DESC`)
      .all(...runIds);
    return (rows as Record<string, unknown>[]).map(toRun);
  }

  async listRuns(limit = 100): Promise<readonly StoredRun[]> {
    const rows = this.#db
      .prepare('SELECT * FROM runs ORDER BY created_at DESC LIMIT ?')
      .all(limit);
    return (rows as Record<string, unknown>[]).map(toRun);
  }

  async countRuns(): Promise<number> {
    const row = this.#db.prepare('SELECT COUNT(*) AS n FROM runs').get() as { n: number };
    return Number(row.n);
  }

  async insertPlot(plot: StoredPlot): Promise<void> {
    this.#db
      .prepare(
        `INSERT INTO plots (
           plot_id, tenant_id, plot_number, community, land_use, created_at,
           created_by_actor_id, created_by_actor_name, computed_area_m2,
           area_mismatch, frontage_count, shape_class, plot
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        plot.plotId,
        plot.tenantId,
        plot.plotNumber,
        plot.community,
        plot.landUse,
        plot.createdAt,
        plot.createdByActorId,
        plot.createdByActorName,
        plot.computedAreaM2,
        plot.areaMismatch ? 1 : 0,
        plot.frontageCount,
        plot.shapeClass,
        plot.plot,
      );
  }

  async getPlot(plotId: string): Promise<StoredPlot | undefined> {
    const row = this.#db.prepare('SELECT * FROM plots WHERE plot_id = ?').get(plotId);
    return row ? toPlot(row as Record<string, unknown>) : undefined;
  }

  async listPlots(limit = 100): Promise<readonly StoredPlot[]> {
    const rows = this.#db
      .prepare('SELECT * FROM plots ORDER BY created_at DESC LIMIT ?')
      .all(limit);
    return (rows as Record<string, unknown>[]).map(toPlot);
  }

  async listPlotsByActor(actorId: string, limit = 100): Promise<readonly StoredPlot[]> {
    const rows = this.#db
      .prepare('SELECT * FROM plots WHERE created_by_actor_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(actorId, limit);
    return (rows as Record<string, unknown>[]).map(toPlot);
  }

  async countPlots(): Promise<number> {
    const row = this.#db.prepare('SELECT COUNT(*) AS n FROM plots').get() as { n: number };
    return Number(row.n);
  }

  async recordGate(runId: string, gates: string): Promise<void> {
    // Gates are the one thing that changes after a run exists — a user
    // acknowledges the assumption register, then later a reviewer signs the
    // export. Neither touches a computed value, which is what §13.4 protects.
    this.#db.prepare('UPDATE runs SET gates = ? WHERE run_id = ?').run(gates, runId);
  }

  async close(): Promise<void> {
    this.#db.close();
  }
}

function toPlot(row: Record<string, unknown>): StoredPlot {
  return {
    plotId: String(row['plot_id']),
    tenantId: String(row['tenant_id']),
    plotNumber: String(row['plot_number']),
    community: String(row['community']),
    landUse: String(row['land_use']),
    createdAt: String(row['created_at']),
    createdByActorId: String(row['created_by_actor_id']),
    createdByActorName: String(row['created_by_actor_name']),
    computedAreaM2: String(row['computed_area_m2']),
    areaMismatch: Number(row['area_mismatch']) === 1,
    frontageCount: Number(row['frontage_count']),
    shapeClass: String(row['shape_class']),
    plot: String(row['plot']),
  };
}

function toRun(row: Record<string, unknown>): StoredRun {
  return {
    runId: String(row['run_id']),
    tenantId: String(row['tenant_id']),
    plotId: String(row['plot_id']),
    parentRunId: row['parent_run_id'] === null ? null : String(row['parent_run_id']),
    createdAt: String(row['created_at']),
    createdByActorId: String(row['created_by_actor_id']),
    createdByActorName: String(row['created_by_actor_name']),
    engineVersion: String(row['engine_version']),
    annexVersion: String(row['annex_version']),
    ruleSetHash: String(row['rule_set_hash']),
    input: String(row['input']),
    output: String(row['output']),
    report: String(row['report']),
    fingerprint: String(row['fingerprint']),
    draftRules: Number(row['draft_rules']) === 1,
    gates: String(row['gates']),
  };
}
