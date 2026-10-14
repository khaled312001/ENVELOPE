/**
 * BUILD A RELEASE HERE, SO THE SERVER ONLY UNPACKS ONE.
 *
 * The target is shared hosting: one account's CPU, memory and process count are
 * shared with every other site on it, and a `pnpm install` or a `vite build` run
 * there would spend minutes of that allowance compiling what a laptop compiles in
 * seconds. So nothing is installed or compiled on the server. This writes two
 * archives, and a deployment is: copy them, unpack them, touch one file.
 *
 *   out/deploy/app.tar.gz   the API — one bundled module, a CommonJS startup shim
 *                           and the two libraries that load files beside themselves
 *   out/deploy/web.tar.gz   the site — Vite's output and the web server's rules
 *
 * WHAT IS NOT BUNDLED, AND WHY. esbuild inlines everything it can see. Two
 * libraries find a sibling file at run time by path, so they ship as packages:
 *
 *   js-angusj-clipper   loads its WebAssembly from beside its own script
 *   pdfjs-dist          starts its parser from `pdf.worker.mjs` beside `pdf.mjs`
 *
 * Only the files those need are copied — pdfjs is 35 MB on disk and uses two.
 *
 * NO CREDENTIAL IS READ OR WRITTEN HERE. The server's `.env` is created on the
 * server, mode 600, outside the web root, and never leaves it.
 *
 * Run: `node scripts/deploy/build.mjs` (add `--https` once the certificate exists).
 */

import { execFileSync, execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'out', 'deploy');
const APP = join(OUT, 'app');
const WEB = join(OUT, 'web');

/** Where the release lives on the host. Paths, not secrets. */
const HOST = {
  appRoot: '/home/u405809647/domains/khaledahmed.net/tob-app',
  node: '/opt/alt/alt-nodejs24/root/bin/node',
};

const forceHttps = process.argv.includes('--https');

const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });

/* ── 1. Compile, exactly as the gates do ─────────────────────────────── */

run('pnpm build');
/* The figures the site prints, re-derived from the engine and the files it writes,
   before anything is packed. `/dashboard` says a build whose files draw different
   cars is not published; this line is what makes that sentence true rather than a
   habit of whoever ran the deploy. */
run('pnpm example');
run('pnpm --filter @envelope/web build');
/* The studio preview — a second front end on the same API, served at /next. It
   has no inline script, so the policy below needs no hash for it. */
run('pnpm --filter @envelope/web-next build');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(APP, 'api'), { recursive: true });
mkdirSync(join(APP, 'tmp'), { recursive: true });

/* ── 2. The API, as one module ───────────────────────────────────────── */

// esbuild is the workspace's own devDependency. It used to be borrowed from
// Vite, which bundled one; Vite 8 builds with Rolldown and carries esbuild only
// as an optional peer, so borrowing it would now find nothing.
const esbuild = createRequire(join(ROOT, 'package.json'))('esbuild');

const EXTERNAL = ['js-angusj-clipper', 'pdfjs-dist', '@napi-rs/canvas'];

await esbuild.build({
  entryPoints: [join(ROOT, 'apps', 'api', 'dist', 'main.js')],
  outfile: join(APP, 'api', 'main.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: EXTERNAL,
  // Fastify and mysql2 are CommonJS and call `require` for Node's own modules.
  // An ES module has no `require`, so the bundle is given one.
  banner: {
    js: "import { createRequire as __topaiRequire } from 'node:module'; const require = __topaiRequire(import.meta.url);",
  },
  legalComments: 'none',
  logLevel: 'warning',
});

/* ── 3. The two libraries that cannot be bundled ─────────────────────── */

const packageDir = (name) => {
  // Resolved from the package that depends on it, as Node would at run time.
  const from = name === 'pdfjs-dist' ? 'packages/intake' : 'packages/geometry';
  const req = createRequire(join(ROOT, from, 'package.json'));
  let dir = dirname(req.resolve(name === 'pdfjs-dist' ? 'pdfjs-dist/legacy/build/pdf.mjs' : name));
  while (!existsSync(join(dir, 'package.json'))) dir = dirname(dir);
  return dir;
};

const ship = (name, files) => {
  const src = packageDir(name);
  const dst = join(APP, 'node_modules', name);
  for (const f of ['package.json', 'LICENSE', ...files]) {
    if (!existsSync(join(src, f))) continue;
    mkdirSync(dirname(join(dst, f)), { recursive: true });
    cpSync(join(src, f), join(dst, f), { recursive: true });
  }
};

ship('js-angusj-clipper', ['universal']);
ship('pdfjs-dist', ['legacy/build/pdf.mjs', 'legacy/build/pdf.worker.mjs']);

/* ── 4. The startup file the app server loads ────────────────────────── */

writeFileSync(
  join(APP, 'server.cjs'),
  `'use strict';
/*
 * Startup file for LiteSpeed's lsnode, configured from .htaccess.
 *
 * CommonJS because lsnode loads it with require(), and require() refuses an ES
 * module graph with top-level await. The application is an ES module; it is
 * imported here and started explicitly. lsnode's listen() hook is installed on
 * net.Server before this runs, so the application's one listen() binds to the web
 * server's socket rather than to a port.
 *
 * The environment is read from .env beside this file — outside the web root, so a
 * web-server misconfiguration cannot serve it. Generated by scripts/deploy/build.mjs.
 */
const path = require('node:path');
const { pathToFileURL } = require('node:url');

try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

import(pathToFileURL(path.join(__dirname, 'api', 'main.mjs')).href)
  .then((m) => m.start())
  .catch((error) => {
    console.error('[top.ai] failed to start:', (error && error.stack) || error);
    process.exit(1);
  });
`,
);

writeFileSync(
  join(APP, 'package.json'),
  JSON.stringify({ name: 'top-ai-api', private: true, type: 'commonjs' }, null, 2) + '\n',
);

const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT }).toString().trim() !== '';
const release = `${commit}${dirty ? '+local' : ''} built ${new Date().toISOString()}`;
writeFileSync(join(APP, 'release.txt'), release + '\n');
writeFileSync(join(APP, 'tmp', 'restart.txt'), release + '\n');

/* ── 5. The site, and the web server's rules for it ──────────────────── */

/*
  TWO FRONT ENDS, ONE ROOT.

  Since 14 Oct 2026 the site IS the new front end (apps/web-next): the home
  page, the public pages, /ar, and the studio. The previous front end still
  serves the paths only it has — /app, /work, sign-in and sign-up, settings,
  the workspace, invitations, readiness — from its shell, renamed
  `classic.html` so the new home page can be `index.html`.

  Both write hashed files into `assets/`. A name both builds wrote would be one
  application silently loading the other's file, so a collision stops the
  build — except `og-cover.png`, where the new site's card is meant to win.
*/
cpSync(join(ROOT, 'apps', 'web', 'dist'), WEB, { recursive: true });
renameSync(join(WEB, 'index.html'), join(WEB, 'classic.html'));
{
  const NEXT = join(ROOT, 'apps', 'web-next', 'dist');
  const MAY_REPLACE = new Set(['og-cover.png']);
  const walk = (dir, rel = '') =>
    readdirSync(join(dir, rel), { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(dir, join(rel, e.name)) : [join(rel, e.name)],
    );
  const clashes = walk(NEXT).filter((f) => existsSync(join(WEB, f)) && !MAY_REPLACE.has(f));
  if (clashes.length) throw new Error(`both front ends wrote: ${clashes.join(', ')}`);
  cpSync(NEXT, WEB, { recursive: true });
}

/* The paths the new site owns. The classic shell answers every other route in routes.json. */
const NEW_OWNS = new Set(['/', '/parking', '/exports', '/refusals']);

/*
  THE ENTRY CHUNK HAS A BUDGET, AND A BUILD OVER IT IS NOT PACKED.

  It was 1,049 KB: every screen and both languages of all of them, downloaded to
  read the front page. `lazy-page.tsx` split it to 345 KB. A split erodes one
  innocent import at a time — the next screen that reaches into `App.tsx` for a
  hook pulls the whole engine back in — so the number is checked here, where a
  regression stops a release instead of being found in a waterfall chart.
*/
const ENTRY_BUDGET = 400 * 1024;
for (const shell of ['index.html', 'classic.html']) {
  const entry = /<script[^>]*type="module"[^>]*src="\/?(assets\/index-[^"]+\.js)"/.exec(
    readFileSync(join(WEB, shell), 'utf8'),
  );
  if (!entry) throw new Error(`${shell} names no entry chunk; the budget cannot be measured`);
  const bytes = statSync(join(WEB, entry[1])).size;
  console.log(`${shell} entry chunk ${entry[1]}: ${(bytes / 1024).toFixed(0)} KB (budget ${ENTRY_BUDGET / 1024} KB)`);
  if (bytes > ENTRY_BUDGET) {
    console.error(
      `The entry chunk is ${(bytes / 1024).toFixed(0)} KB, over its ${ENTRY_BUDGET / 1024} KB budget. ` +
        'Something the front page loads now imports a screen; find it before shipping.',
    );
    process.exit(1);
  }
}

const routes =JSON.parse(readFileSync(join(ROOT, 'apps', 'web', 'src', 'routes.json'), 'utf8'));

/*
  MOVED PATHS, AS REAL 301s.

  Read from the same `redirects.json` the router reads, so the server and the
  application cannot disagree about where a moved path went. The router's copy is
  the fallback for development and for a host whose rewrite rules are wrong; this
  is the one a reader on the live site actually meets, and it is the one that
  tells a search engine and a link checker that the move is permanent.

  Emitted BEFORE the page rules below, because those rewrite every known path to
  `index.html` with `[L]` and a redirect placed after them would never be reached.
*/
const redirects = JSON.parse(
  readFileSync(join(ROOT, 'apps', 'web', 'src', 'redirects.json'), 'utf8'),
);
// The classic site's "what it refuses" is this site's "what it does not do".
redirects['/refusals'] = '/limits';
const redirectRules = Object.entries(redirects)
  .map(([from, to]) => `  RewriteRule ^${from.replace(/^\//, '')}/?$ ${to} [R=301,L]`)
  .join('\n');
const pages = routes
  .map((r) => r.path)
  .filter((p) => !NEW_OWNS.has(p))
  .map((p) => p.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

/*
  THE CONTENT-SECURITY-POLICY, BUILT FROM WHAT THE PAGE ACTUALLY LOADS.

  The site had none, and HSTS neither. Every origin below is one the code names:
  Google Fonts in index.html; Esri imagery, OSM tiles, Nominatim and Overpass in
  PlotMap.tsx. `blob:` is for the frame documents.ts prints from, the sheet a
  reader drops onto the map, and maplibre's decoded tiles.

  The one inline script — the theme set before first paint, so a dark reader never
  sees a white flash — is allowed by its HASH, read out of the built page rather
  than typed here: a hash typed by hand is right the day it is typed and wrong the
  first time someone edits a line of that script, and the failure is a page whose
  theme silently stops working.

  `style-src 'unsafe-inline'` is the one concession, and it is a real one: React's
  `style={}` and maplibre both write style attributes, and no hash covers those.
  Style injection without script cannot run code.

  ENFORCED, AFTER IT WAS WATCHED. It went live report-only first, which is how a
  policy is introduced: it reports what it would block and blocks nothing. On
  14 Oct 2026 a walk of the live site — every public route, the 404, sign-in and
  sign-up, and the engine from the plot's map through the 3D view, the drawing
  set and the export step, then /work — logged no CSP message of any level, with
  the report-only header confirmed on the responses. So it is enforced by
  default now, because a default of report-only is a build that quietly stops
  protecting anyone the day somebody forgets the variable. `CSP_MODE=report-only`
  takes it back to reporting, for the next time a new origin is added and has to
  be watched before it is trusted.
*/
const cspReportOnly = process.env.CSP_MODE === 'report-only';
// Both shells: the classic one carries the theme script; the new one carries none, and a hash list built from it stays empty.
const builtIndex = ['classic.html', 'index.html'].map((f) => readFileSync(join(WEB, f), 'utf8')).join('\n');
const inlineHashes = [...builtIndex.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1])
  .filter((body) => body.trim().length > 0)
  .map((body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
const TILE_ORIGINS = [
  'https://services.arcgisonline.com',
  'https://tile.openstreetmap.org',
  'https://*.tile.openstreetmap.org',
];
const csp = [
  "default-src 'self'",
  `script-src 'self' ${inlineHashes.join(' ')}`.trim(),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  `img-src 'self' data: blob: ${TILE_ORIGINS.join(' ')}`,
  `connect-src 'self' ${TILE_ORIGINS.join(' ')} https://nominatim.openstreetmap.org https://overpass-api.de`,
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'self' blob:",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  /* ONLY WHEN ENFORCED. A browser ignores `upgrade-insecure-requests` in a
     report-only policy and says so on the console of every page — 74 lines on
     one live walk, burying the one real finding under them. The host already
     sends it enforced, as a `Content-Security-Policy` header of its own (seen
     on the live responses, 14 Oct 2026), so nothing is lost meanwhile. */
  ...(forceHttps && !cspReportOnly ? ['upgrade-insecure-requests'] : []),
].join('; ');
const cspHeader = cspReportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

writeFileSync(
  join(WEB, '.htaccess'),
  `# TOP.ai — the site. Generated by scripts/deploy/build.mjs; edit it there.
Options -Indexes
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  # Turning the engine on here is also what stops the parent site's rules — which
  # send every other host name to khaledahmed.net — from applying to this one.
  RewriteEngine On
${
  forceHttps
    ? `
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP:X-Forwarded-Proto} !=https
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
`
    : ''
}
  # The engine is its own application, configured in api/.htaccess.
  RewriteRule ^api(/.*)?$ - [L]

  # Paths that moved. Permanent, and before the page rules, which end in [L].
${redirectRules}

  # A file that exists is served as it is.
  RewriteCond %{REQUEST_FILENAME} -f
  RewriteRule ^ - [L]

  # The site was previewed at /next. Every address from then lands on its page now.
  RewriteRule ^next/?$ / [R=301,L]
  RewriteRule ^next/(.*)$ /$1 [R=301,L]

  # A public page has its own prerendered index.html, head and all.
  RewriteCond %{REQUEST_FILENAME}/index.html -f
  RewriteRule ^(.+?)/?$ $1/index.html [L]

  # The working screens — the studio, the studies, sign-in — share one noindex shell.
  RewriteRule ^(ar/)?(studio|studies|enter)(/.*)?$ app.html [L]

  # The paths only the classic front end has — from its routes.json — are its shell, 200.
  RewriteRule ^(${pages.join('|')})/?$ classic.html [L]
</IfModule>

# Anything else is not a page. The shell renders "not here", and the status says so
# too — a 200 on a page that does not exist is the defect the 404 page describes.
ErrorDocument 404 /app.html

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
  Header always set ${cspHeader} "${csp}"
${
  forceHttps
    ? `  # A year, this host only: the parent domain is somebody else's decision.
  Header always set Strict-Transport-Security "max-age=31536000"
`
    : ''
}
  # The shell is asked for again every time, so a release reaches a reader at once.
  <FilesMatch "\\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  # Vite names every asset by its content, so an asset never changes under its name.
  <FilesMatch "-[A-Za-z0-9_-]{8,}\\.(js|css|woff2?|svg|png|webp|glb)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
`,
);

mkdirSync(join(WEB, 'api'), { recursive: true });
writeFileSync(
  join(WEB, 'api', '.htaccess'),
  `# TOP.ai — the engine. Generated by scripts/deploy/build.mjs; edit it there.
#
# Passenger configured from .htaccess, the arrangement this host supports for Node.
# The application root is outside the web root, so its .env cannot be served.
PassengerAppRoot ${HOST.appRoot}
PassengerAppType node
PassengerNodejs ${HOST.node}
PassengerStartupFile server.cjs
PassengerBaseURI /api
PassengerRestartDir ${HOST.appRoot}/tmp
PassengerFriendlyErrorPages off

# The account's process limit counts threads. V8 and libuv size their pools from
# the host's core count, not from this account's share of it, so both are capped.
SetEnv NODE_OPTIONS "--v8-pool-size=2 --max-old-space-size=384"
SetEnv UV_THREADPOOL_SIZE 2

<IfModule mod_mime.c>
  RemoveHandler .php
</IfModule>
`,
);

/* ── 6. Two archives ─────────────────────────────────────────────────── */

// Relative paths and forward slashes: Git's tar on Windows reads "C:" as a host.
const tarball = (dir, name) => {
  execFileSync('tar', ['-czf', name, '-C', relative(OUT, dir).replace(/\\/g, '/'), '.'], { cwd: OUT });
  return statSync(join(OUT, name)).size;
};
const appBytes = tarball(APP, 'app.tar.gz');
const webBytes = tarball(WEB, 'web.tar.gz');

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`\nrelease ${release}`);
console.log(`  app.tar.gz  ${kb(appBytes)}   (${HOST.appRoot})`);
console.log(`  web.tar.gz  ${kb(webBytes)}   https ${forceHttps ? 'forced' : 'not forced — pass --https once the certificate exists'}`);
