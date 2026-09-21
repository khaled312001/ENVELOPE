/**
 * MySQL persistence.
 *
 * The client's deployment target is MySQL, which is the ordinary answer for the
 * shared hosting an architectural practice in Dubai already pays for. This is a
 * second implementation of {@link RunRepository}, not a replacement: SQLite
 * stays the zero-setup default so the engine can be demonstrated on a laptop
 * with no server running, and the test suite keeps running against it.
 *
 * ---
 *
 * **What changes between the two, and what must not.**
 *
 * `runs` and `plots` are append-only (§13.4): a stored run's outputs, inputs,
 * versions and provenance graph must be retrievable *unchanged*, because a
 * report someone took to an investment committee has to still say what it said.
 * MySQL makes that easier to state than SQLite did — the DDL below revokes
 * nothing, but the absence of any `UPDATE` outside `recordGate` is the actual
 * guarantee, and it is enforced the same way in both.
 *
 * **Column types are chosen against the data, not by habit.**
 *
 * - Payloads (`input`, `output`, `report`) are `LONGTEXT`. A provenance graph
 *   for a real plot runs to hundreds of kilobytes; `TEXT` caps at 64 KB and
 *   would truncate silently under a non-strict SQL mode, producing a run that
 *   loads as corrupt JSON weeks later.
 * - Identifiers are `VARCHAR(64)` with `utf8mb4_bin` collation. Run and plot ids
 *   are case-sensitive tokens, and MySQL's default case-insensitive collation
 *   would let `RUN-a1` and `RUN-A1` collide on the primary key.
 * - `computed_area_m2` is `VARCHAR`, not `DECIMAL`. Every non-geometric number
 *   in this engine is a `Decimal` at 28 significant digits (PRD §14.3); handing
 *   it to the database as a float-backed type to be handed back rounded would
 *   discard exactly the precision the numeric policy exists to preserve.
 */

import type { RunRepository, StoredPlot, StoredRun } from './store.js';

/** The subset of `mysql2/promise` this module uses. */
interface MysqlRow {
  readonly [column: string]: unknown;
}
interface MysqlPool {
  query(sql: string, values?: readonly unknown[]): Promise<[MysqlRow[], unknown]>;
  execute(sql: string, values?: readonly unknown[]): Promise<[MysqlRow[], unknown]>;
  end(): Promise<void>;
}

export interface MysqlConnectionOptions {
  readonly host: string;
  readonly port?: number;
  readonly user: string;
  readonly password: string;
  readonly database: string;
  readonly connectionLimit?: number;
}

/**
 * DDL, idempotent.
 *
 * Applied on connect rather than through a migration tool. There is exactly one
 * version of this schema and it has never shipped, so a migration framework
 * would be ceremony around a single `CREATE TABLE`. The moment a second version
 * exists this must become a numbered migration, and that is a real obligation,
 * not a nicety: `IF NOT EXISTS` silently does nothing to a table whose columns
 * have changed.
 */
export const MYSQL_SCHEMA: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS plots (
     plot_id               VARCHAR(64)  NOT NULL,
     tenant_id             VARCHAR(64)  NOT NULL,
     plot_number           VARCHAR(128) NOT NULL,
     community             VARCHAR(128) NOT NULL,
     land_use              VARCHAR(32)  NOT NULL,
     created_at            VARCHAR(32)  NOT NULL,
     created_by_actor_id   VARCHAR(64)  NOT NULL,
     created_by_actor_name VARCHAR(128) NOT NULL,
     computed_area_m2      VARCHAR(64)  NOT NULL,
     area_mismatch         TINYINT(1)   NOT NULL,
     frontage_count        INT          NOT NULL,
     shape_class           VARCHAR(32)  NOT NULL,
     plot                  LONGTEXT     NOT NULL,
     PRIMARY KEY (plot_id),
     KEY plots_by_created (created_at DESC),
     KEY plots_by_community (community)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,

  `CREATE TABLE IF NOT EXISTS runs (
     run_id                VARCHAR(64)  NOT NULL,
     tenant_id             VARCHAR(64)  NOT NULL,
     plot_id               VARCHAR(64)  NOT NULL,
     parent_run_id         VARCHAR(64)  NULL,
     created_at            VARCHAR(32)  NOT NULL,
     created_by_actor_id   VARCHAR(64)  NOT NULL,
     created_by_actor_name VARCHAR(128) NOT NULL,
     engine_version        VARCHAR(64)  NOT NULL,
     annex_version         VARCHAR(64)  NOT NULL,
     rule_set_hash         VARCHAR(128) NOT NULL,
     input                 LONGTEXT     NOT NULL,
     output                LONGTEXT     NOT NULL,
     report                LONGTEXT     NOT NULL,
     fingerprint           VARCHAR(128) NOT NULL,
     draft_rules           TINYINT(1)   NOT NULL,
     gates                 LONGTEXT     NOT NULL,
     PRIMARY KEY (run_id),
     KEY runs_by_plot (plot_id, created_at DESC),
     KEY runs_by_fingerprint (fingerprint),
     KEY runs_by_created (created_at DESC),
     CONSTRAINT runs_plot_fk FOREIGN KEY (plot_id) REFERENCES plots (plot_id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
];

const RUN_COLUMNS =
  'run_id, tenant_id, plot_id, parent_run_id, created_at, created_by_actor_id, ' +
  'created_by_actor_name, engine_version, annex_version, rule_set_hash, input, ' +
  'output, report, fingerprint, draft_rules, gates';

const PLOT_COLUMNS =
  'plot_id, tenant_id, plot_number, community, land_use, created_at, ' +
  'created_by_actor_id, created_by_actor_name, computed_area_m2, area_mismatch, ' +
  'frontage_count, shape_class, plot';

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

function toRun(row: MysqlRow): StoredRun {
  const parent = row['parent_run_id'];
  return {
    runId: str(row['run_id']),
    tenantId: str(row['tenant_id']),
    plotId: str(row['plot_id']),
    // `null`, not absent: a root run has no parent, and the column is nullable
    // rather than optional so "never had one" and "not loaded" cannot be confused.
    parentRunId: parent === null || parent === undefined ? null : str(parent),
    createdAt: str(row['created_at']),
    createdByActorId: str(row['created_by_actor_id']),
    createdByActorName: str(row['created_by_actor_name']),
    engineVersion: str(row['engine_version']),
    annexVersion: str(row['annex_version']),
    ruleSetHash: str(row['rule_set_hash']),
    input: str(row['input']),
    output: str(row['output']),
    report: str(row['report']),
    fingerprint: str(row['fingerprint']),
    draftRules: Number(row['draft_rules']) === 1,
    gates: str(row['gates']),
  };
}

function toPlot(row: MysqlRow): StoredPlot {
  return {
    plotId: str(row['plot_id']),
    tenantId: str(row['tenant_id']),
    plotNumber: str(row['plot_number']),
    community: str(row['community']),
    landUse: str(row['land_use']),
    createdAt: str(row['created_at']),
    createdByActorId: str(row['created_by_actor_id']),
    createdByActorName: str(row['created_by_actor_name']),
    computedAreaM2: str(row['computed_area_m2']),
    areaMismatch: Number(row['area_mismatch']) === 1,
    frontageCount: Number(row['frontage_count']),
    shapeClass: str(row['shape_class']),
    plot: str(row['plot']),
  };
}

export class MysqlRunRepository implements RunRepository {
  readonly #pool: MysqlPool;

  private constructor(pool: MysqlPool) {
    this.#pool = pool;
  }

  /**
   * Connect, apply the schema and hand back a repository.
   *
   * Asynchronous by necessity, which is why it is a factory rather than a
   * constructor: a constructor that kicked off a floating promise would let the
   * first query race the `CREATE TABLE`.
   */
  static async connect(options: MysqlConnectionOptions): Promise<MysqlRunRepository> {
    const mysql = (await import('mysql2/promise')) as unknown as {
      createPool(o: Record<string, unknown>): MysqlPool;
    };
    const pool = mysql.createPool({
      host: options.host,
      port: options.port ?? 3306,
      user: options.user,
      password: options.password,
      database: options.database,
      connectionLimit: options.connectionLimit ?? 8,
      waitForConnections: true,
      // Payloads are JSON strings the engine already serialised. Letting the
      // driver parse and re-serialise them would not round-trip byte-identically,
      // and §13.4 requires exactly that.
      typeCast: true,
      dateStrings: true,
      // Defence in depth against a query built by concatenation ever reaching
      // the server: without this, one statement per call is a protocol rule.
      multipleStatements: false,
    });
    for (const ddl of MYSQL_SCHEMA) await pool.query(ddl);
    return new MysqlRunRepository(pool);
  }

  /** For tests and for callers that own their own pool. */
  static fromPool(pool: MysqlPool): MysqlRunRepository {
    return new MysqlRunRepository(pool);
  }

  async insert(run: StoredRun): Promise<void> {
    await this.#pool.execute(
      `INSERT INTO runs (${RUN_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        run.runId,
        run.tenantId,
        run.plotId,
        run.parentRunId ?? null,
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
      ],
    );
  }

  async get(runId: string): Promise<StoredRun | undefined> {
    const [rows] = await this.#pool.execute(
      `SELECT ${RUN_COLUMNS} FROM runs WHERE run_id = ?`,
      [runId],
    );
    const row = rows[0];
    return row === undefined ? undefined : toRun(row);
  }

  async listByPlot(plotId: string): Promise<readonly StoredRun[]> {
    const [rows] = await this.#pool.execute(
      `SELECT ${RUN_COLUMNS} FROM runs WHERE plot_id = ? ORDER BY created_at DESC`,
      [plotId],
    );
    return rows.map(toRun);
  }

  async listRunsByActor(actorId: string, limit = 100): Promise<readonly StoredRun[]> {
    // LIMIT interpolated for the reason `listRuns` gives below; the actor id is bound.
    const n = Math.max(1, Math.min(1000, Math.trunc(limit) || 100));
    const [rows] = await this.#pool.query(
      `SELECT ${RUN_COLUMNS} FROM runs WHERE created_by_actor_id = ? ORDER BY created_at DESC LIMIT ${n}`,
      [actorId],
    );
    return rows.map(toRun);
  }

  async getMany(runIds: readonly string[]): Promise<readonly StoredRun[]> {
    if (runIds.length === 0) return [];
    const marks = runIds.map(() => '?').join(', ');
    const [rows] = await this.#pool.query(
      `SELECT ${RUN_COLUMNS} FROM runs WHERE run_id IN (${marks}) ORDER BY created_at DESC`,
      [...runIds],
    );
    return rows.map(toRun);
  }

  async listRuns(limit = 100): Promise<readonly StoredRun[]> {
    // LIMIT is interpolated, not bound: MySQL's prepared-statement protocol
    // rejects a placeholder there. It is coerced to a bounded integer first, so
    // nothing a caller supplies can reach the statement as text.
    const n = Math.max(1, Math.min(1000, Math.trunc(limit) || 100));
    const [rows] = await this.#pool.query(
      `SELECT ${RUN_COLUMNS} FROM runs ORDER BY created_at DESC LIMIT ${n}`,
    );
    return rows.map(toRun);
  }

  async countRuns(): Promise<number> {
    const [rows] = await this.#pool.query('SELECT COUNT(*) AS n FROM runs');
    return Number(rows[0]?.['n'] ?? 0);
  }

  async recordGate(runId: string, gates: string): Promise<void> {
    await this.#pool.execute('UPDATE runs SET gates = ? WHERE run_id = ?', [gates, runId]);
  }

  async insertPlot(plot: StoredPlot): Promise<void> {
    await this.#pool.execute(
      `INSERT INTO plots (${PLOT_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
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
      ],
    );
  }

  async getPlot(plotId: string): Promise<StoredPlot | undefined> {
    const [rows] = await this.#pool.execute(
      `SELECT ${PLOT_COLUMNS} FROM plots WHERE plot_id = ?`,
      [plotId],
    );
    const row = rows[0];
    return row === undefined ? undefined : toPlot(row);
  }

  async listPlots(limit = 100): Promise<readonly StoredPlot[]> {
    const n = Math.max(1, Math.min(1000, Math.trunc(limit) || 100));
    const [rows] = await this.#pool.query(
      `SELECT ${PLOT_COLUMNS} FROM plots ORDER BY created_at DESC LIMIT ${n}`,
    );
    return rows.map(toPlot);
  }

  async countPlots(): Promise<number> {
    const [rows] = await this.#pool.query('SELECT COUNT(*) AS n FROM plots');
    return Number(rows[0]?.['n'] ?? 0);
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }
}

/**
 * Read connection settings from the environment.
 *
 * Returns `undefined` when `MYSQL_HOST` is unset, which is how the server falls
 * back to SQLite. Deliberately not a thrown error: a laptop demo with no
 * database configured should start, not fail.
 */
export function mysqlOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): MysqlConnectionOptions | undefined {
  const host = env['MYSQL_HOST'];
  if (host === undefined || host.trim() === '') return undefined;
  const database = env['MYSQL_DATABASE'];
  const user = env['MYSQL_USER'];
  if (database === undefined || user === undefined) {
    throw new Error(
      'MYSQL_HOST is set but MYSQL_DATABASE or MYSQL_USER is not. Refusing to guess ' +
        'a database name — a run written to the wrong schema is worse than a run ' +
        'that failed to start.',
    );
  }
  const port = env['MYSQL_PORT'];
  return {
    host,
    ...(port === undefined ? {} : { port: Number(port) }),
    user,
    password: env['MYSQL_PASSWORD'] ?? '',
    database,
  };
}
