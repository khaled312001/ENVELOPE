/**
 * THE PROCESS — configuration in, one listening socket out.
 *
 * `server.ts` builds an application and knows nothing about where it runs. This
 * file is the only place that reads the deployment's environment, and it asks for
 * every difference from the test suite by name (see `BuildOptions`), so a setting
 * nobody chose cannot leak into production by default.
 *
 * WHAT A PRODUCTION DEPLOYMENT CHANGES, AND WHY EACH ONE:
 *
 *   GUESTS=keyed            a guest is a random key, not a typed name (`access.ts`)
 *   DEVELOPER_STANDARDS=off a developer's brief is confidential until the operator says
 *   COMPUTATIONS_PER_MINUTE the account's CPU is shared with its other sites
 *   TRUST_PROXY=<hops>      behind a CDN and LiteSpeed the peer is the proxy, not the visitor
 *
 * `NODE_ENV=production` selects the first three as defaults; each can still be set.
 * TRUST_PROXY has no production default at all — see `proxyHops`.
 *
 * NO TOP-LEVEL AWAIT. On the shared host this deploys to, LiteSpeed's `lsnode` loads
 * the startup file with `require()`, and `require()` refuses an ES module graph that
 * contains top-level await (ERR_REQUIRE_ASYNC_MODULE). The deployed startup file is
 * a CommonJS shim that imports this module and calls `start()`; everything
 * asynchronous is inside that call.
 */

import { fileURLToPath } from 'node:url';

import type { FastifyInstance } from 'fastify';

import { MysqlAccountRepository } from './account-store-mysql.js';
import { SqliteAccountRepository, type AccountRepository } from './account-store.js';
import type { GuestPolicy } from './auth-routes.js';
import { build, type BuildOptions } from './server.js';
import { createMysqlPool, MysqlRunRepository, mysqlOptionsFromEnv } from './store-mysql.js';
import { SqliteRunRepository, type RunRepository } from './store.js';

type Env = NodeJS.ProcessEnv;

const flag = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  const v = value.trim().toLowerCase();
  if (['1', 'on', 'true', 'yes'].includes(v)) return true;
  if (['0', 'off', 'false', 'no'].includes(v)) return false;
  throw new Error(`"${value}" is not on or off. Refusing to guess a security setting.`);
};

/**
 * `off`, or HOW MANY proxies stand in front of this process. Never `on`.
 *
 * `on` was the first setting, and it was measured wrong on the deployed host.
 * Trusting every hop makes `request.ip` the LEFT-most `X-Forwarded-For` entry — the
 * one the visitor writes, since each proxy appends and none strips. A loop sending a
 * fresh forged address per request got a fresh throttle bucket per request: 30
 * requests exhausted one, and the 31st, with another forged address, was served.
 * `off` fails the other way: behind LiteSpeed the socket peer is the web server, so
 * every visitor shared one bucket, and a second machine was refused because the first
 * had spent it. The only correct value is the number of proxies that append, counted
 * from this process outward — and that is a fact about one deployment, which is why
 * production gets no default and a guess is refused.
 *
 * A count is only safe where nothing can reach this process except through those
 * proxies. Under Passenger that holds by construction: `listen()` is bound to the web
 * server's socket and there is no public port. On a host where port 4000 is open to
 * the world, a direct caller could write every entry — set `off` there.
 */
function proxyHops(value: string | undefined, production: boolean): number | false {
  const v = value?.trim().toLowerCase() ?? '';
  if (v === '') {
    if (!production) return false;
    throw new Error(
      'TRUST_PROXY must be set in production: off, or the number of proxies in front of ' +
        'this process. Refusing to guess a security setting.',
    );
  }
  if (['0', 'off', 'false', 'no'].includes(v)) return false;
  if (/^[1-9]$/.test(v)) return Number(v);
  if (['on', 'true', 'yes'].includes(v)) {
    throw new Error(
      'TRUST_PROXY=on would believe every X-Forwarded-For entry, including the ones a visitor ' +
        'writes. Give the number of proxies in front of this process instead.',
    );
  }
  throw new Error(`"${value}" is not off or a number of proxies. Refusing to guess a security setting.`);
}

/** The four deployment differences, read from the environment. */
export function optionsFromEnv(env: Env = process.env): BuildOptions {
  const production = env['NODE_ENV'] === 'production';

  const guests = (env['GUESTS'] ?? (production ? 'keyed' : 'open')) as GuestPolicy;
  if (!['open', 'keyed', 'off'].includes(guests)) {
    throw new Error(`GUESTS must be open, keyed or off — not "${guests}".`);
  }

  const perMinute = env['COMPUTATIONS_PER_MINUTE'];
  const computationsPerMinute =
    perMinute !== undefined && perMinute.trim() !== ''
      ? Number(perMinute)
      : production
        ? 30
        : null;
  if (computationsPerMinute !== null && !(computationsPerMinute > 0)) {
    throw new Error(`COMPUTATIONS_PER_MINUTE must be a positive number — not "${perMinute}".`);
  }

  const mountedAt = env['MOUNTED_AT'];
  if (mountedAt !== undefined && !/^\/[a-z0-9/_-]*[a-z0-9_-]$/i.test(mountedAt)) {
    throw new Error(`MOUNTED_AT must be a path like /api — not "${mountedAt}".`);
  }

  return {
    guests,
    developerStandards: flag(env['DEVELOPER_STANDARDS'], !production),
    computationsPerMinute,
    trustProxy: proxyHops(env['TRUST_PROXY'], production),
    ...(mountedAt ? { mountedAt } : {}),
  };
}

/** Storage, from the environment: MySQL when `MYSQL_HOST` is set, SQLite otherwise. */
export async function storesFromEnv(
  env: Env = process.env,
): Promise<{ readonly runs: RunRepository; readonly accounts: AccountRepository }> {
  const mysql = mysqlOptionsFromEnv(env);
  if (mysql) {
    // One small pool for both stores. A shared host caps connections per database
    // user, and this process serves one request at a time for most of its life.
    const pool = await createMysqlPool({
      ...mysql,
      connectionLimit: Number(env['MYSQL_CONNECTIONS'] ?? 4),
    });
    return {
      runs: await MysqlRunRepository.open(pool),
      accounts: await MysqlAccountRepository.open(pool),
    };
  }
  return {
    runs: new SqliteRunRepository(env['DB_PATH'] ?? ':memory:'),
    accounts: new SqliteAccountRepository(env['ACCOUNTS_DB_PATH'] ?? ':memory:'),
  };
}

/**
 * A DROPPED CONNECTION MUST NOT TAKE THE SITE DOWN.
 *
 * Learned on this host by the account's other applications, and recorded in their
 * startup files: a visitor closing a tab mid-response can surface as an uncaught
 * `ECONNRESET`, Node's default is to exit, and the app server respawns the process.
 * The account is capped at a fixed number of processes shared by every site on it;
 * a few resets in a row took it to the ceiling and the other sites answered 503.
 *
 * Socket-level errors are logged and survived. Anything else still exits: a process
 * in an unknown state should not keep serving numbers.
 */
const RECOVERABLE = new Set(['ECONNRESET', 'EPIPE', 'ECONNABORTED', 'ERR_STREAM_PREMATURE_CLOSE']);

function survivePeerHangups(): void {
  process.on('uncaughtException', (error: Error & { code?: string }) => {
    if (error.code && RECOVERABLE.has(error.code)) {
      console.error(`[top.ai] client connection dropped (${error.code}); still serving`);
      return;
    }
    console.error('[top.ai] fatal:', error.stack ?? error);
    process.exit(1);
  });
}

export async function start(env: Env = process.env): Promise<FastifyInstance> {
  survivePeerHangups();
  const { runs, accounts } = await storesFromEnv(env);
  const app = await build(runs, accounts, optionsFromEnv(env));

  const close = (): void => {
    void app.close().finally(() => process.exit(0));
  };
  process.once('SIGTERM', close);
  process.once('SIGINT', close);

  // One socket. Under lsnode the listen() hook binds it to the web server's own
  // socket, and the port is ignored; everywhere else it is this port. A second
  // listen anywhere in the process would take the site's traffic from this one.
  await app.listen({ port: Number(env['PORT'] ?? 4000), host: env['HOST'] ?? '0.0.0.0' });
  return app;
}

const entry = process.argv[1] ?? '';
if (entry === fileURLToPath(import.meta.url) || /main\.(js|ts)$/.test(entry)) {
  start().catch((error: unknown) => {
    console.error('[top.ai] failed to start:', error instanceof Error ? error.stack : error);
    process.exit(1);
  });
}
