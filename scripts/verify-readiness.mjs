/**
 * `/dashboard`'s signed-out snapshot, generated from the engine.
 *
 * `/dashboard` is public: a reader can see how much of this deployment is not ready
 * without being asked for a name first. Two of the landing page's calls to action
 * used to land a visitor on "Who is running this?", which is a funnel that asks for
 * identity before it has given anything.
 *
 * It does NOT fabricate an actor to reach the API at runtime. `/api/dashboard`
 * resolves an actor from the request, and putting an invented name into the identity
 * chain of a product whose identity badge is load-bearing is the one failure this
 * site cannot survive. So the snapshot is written HERE, at build time, by the same
 * in-process injection the worked-example verifier already uses — a script with a
 * build-time header is not a runtime identity.
 *
 *   node scripts/verify-readiness.mjs          # check
 *   node scripts/verify-readiness.mjs --write  # accept the engine's answer
 *
 * IT IS NOT A DUMP OF `GET /api/dashboard`, and that distinction is the whole file.
 * That payload carries `recentRuns`, and its summariser emits `plotNumber`,
 * `community`, `createdBy` — a real person's name — and `reviewer`. A JSON fixture in
 * the public bundle is ON the site whether or not a component renders it: it ships,
 * it is fetchable, and no prohibitions test can see inside it, because prohibitions
 * run over rendered markup. `volume.plots` and `.runs` are the same problem one step
 * removed — they count whatever database the build machine happened to hold.
 *
 * Three constraints, all of them this script's job rather than the page's:
 *
 *   1. IT SEEDS ITS OWN STORE. A fresh in-memory repository holding the synthetic
 *      worked-example plot and run and nothing else, so every count in the snapshot
 *      describes the demonstration the page claims it describes.
 *   2. IT PROJECTS. `recentRuns` is written as `[]` rather than omitted, because the
 *      view type requires the key and the recent-runs table stays behind the actor
 *      anyway.
 *   3. IT ASSERTS, AND FAILS THE BUILD. After serialising it scans its own output
 *      for the deletion list — a corpus plot number, a community name, an actor name
 *      that is not this script's own header — and exits non-zero on a hit. A
 *      constraint that is only a sentence in a design document is a constraint
 *      nobody runs.
 *
 * The file keeps the API's own `DashboardView` shape. A second shape would mean a
 * second implementation of the panels, and two implementations of a page of numbers
 * is two places for a number to be wrong.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { build } from '../apps/api/dist/server.js';
import { SqliteRunRepository } from '../apps/api/dist/store.js';

const FIXTURE = new URL('../apps/web/src/screens/readiness.json', import.meta.url);
const WORKED = new URL('../apps/web/src/screens/worked-example.json', import.meta.url);
const WRITE = process.argv.includes('--write');

/**
 * The build-time header, and the only name permitted to appear in the output.
 *
 * It says what it is in the name itself, so a reader who finds it in the shipped
 * JSON learns that a script wrote this rather than wondering who ran it.
 */
const ACTOR_NAME = 'Readiness snapshot (build)';
const ACTOR = { 'x-actor-id': 'readiness-snapshot', 'x-actor-name': ACTOR_NAME };

const worked = JSON.parse(readFileSync(WORKED, 'utf8'));

// Constraint 1: a fresh store, seeded with the synthetic worked example and nothing
// else.
const repo = new SqliteRunRepository(':memory:');
const app = await build(repo);
app.log.level = 'silent';

const plot = (
  await app.inject({
    method: 'POST',
    url: '/api/plots',
    headers: ACTOR,
    payload: worked.input.plot,
  })
).json();
if (!plot.plotId) {
  console.error('the synthetic plot was rejected:', JSON.stringify(plot));
  process.exit(1);
}

const runRes = await app.inject({
  method: 'POST',
  url: '/api/runs',
  headers: ACTOR,
  payload: { ...worked.input.run, plotId: plot.plotId },
});
if (runRes.statusCode >= 300) {
  console.error(
    'the synthetic run was rejected:',
    runRes.statusCode,
    JSON.stringify(runRes.json()).slice(0, 600),
  );
  process.exit(1);
}

const res = await app.inject({ method: 'GET', url: '/api/dashboard', headers: ACTOR });
if (res.statusCode >= 300) {
  console.error('the dashboard was rejected:', res.statusCode, res.body.slice(0, 600));
  process.exit(1);
}
const live = res.json();

await app.close();
repo.close();

// Constraint 2: project. `recentRuns` is the key that carries reviewer and author
// names, and it is written empty rather than dropped — the view type requires it,
// and an absent key would be a second shape.
const snapshot = {
  generatedAt: live.generatedAt,
  engineVersion: live.engineVersion,
  readiness: live.readiness,
  volume: live.volume,
  governingBands: live.governingBands,
  assumptionExposure: live.assumptionExposure,
  deferred: live.deferred,
  recentRuns: [],
};

/*
  Constraint 3: scan the output, and fail the build on a hit.

  The patterns are the site's own deletion list, narrowed to what a static scan can
  actually see. A plot number in the corpus format, any of the community names the
  corpus holds, and any actor name that is not this script's own header. Anything
  matched here would be shipped in the public bundle regardless of whether a
  component renders it.
*/
const serialised = JSON.stringify(snapshot);
const FORBIDDEN = [
  // A corpus plot number: three-or-more digits, a hyphen, four-or-more digits.
  [/\b\d{3,}-\d{4,}\b/g, 'a plot number in the corpus format'],
  [/\b(Business Bay|Jumeirah|Al Barsha|Dubai Marina|Palm Jumeirah|Meydan|Za'?abeel)\b/gi,
    'a community name'],
  [/"(createdBy|reviewer)"\s*:\s*"(?!Readiness snapshot \(build\))[^"]+"/g,
    'an actor name that is not the build-time header'],
];
const hits = [];
for (const [re, what] of FORBIDDEN) {
  for (const m of serialised.matchAll(re)) hits.push(`${what}: ${JSON.stringify(m[0])}`);
}
if (hits.length > 0) {
  console.error(
    'readiness.json would have shipped material the site deletes by rule:\n',
  );
  for (const h of hits) console.error(`  ${h}`);
  console.error(
    '\nA JSON fixture in the public bundle is ON the site whether or not a component ' +
      'renders it, and no prohibitions test can see inside it.',
  );
  process.exit(1);
}

/*
  ONE RESIDUE, NAMED RATHER THAN STYLED AROUND. `invariantsTotal` falls back to a
  typed constant when there is no run to read it from, which is a figure reaching a
  public page through the API rather than through a measurement. Constraint 1 closes
  it — the seeded store always has a run — but if `invariantsRan` is null anyway the
  tile has a count with no numerator, and the page must render nothing rather than a
  total against a missing count. That is the page's job; this is the check that the
  case did not arise.
*/
if (snapshot.readiness.invariantsRan === null) {
  console.warn(
    'readiness.invariantsRan is null: the invariants tile must not render a total ' +
      'against a missing count.',
  );
}

if (WRITE) {
  writeFileSync(FIXTURE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log('readiness.json rewritten from the engine.');
  process.exit(0);
}

let published;
try {
  published = JSON.parse(readFileSync(FIXTURE, 'utf8'));
} catch {
  console.error(
    'readiness.json is missing. Run `node scripts/verify-readiness.mjs --write`.\n' +
      'It is a build-time import, so a missing file fails the build — which is ' +
      'correct: a readiness page that renders without its figures is a readiness ' +
      'page with typed figures waiting to happen.',
  );
  process.exit(1);
}

/*
  `generatedAt` is the one key that legitimately moves on every run, and the page
  prints it as the date of the snapshot. Diffing it would make this gate fail every
  time and teach everyone to ignore it, which is worse than not having it.
*/
const problems = [];
(function walk(a, b, path) {
  if (path === 'generatedAt') return;
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      walk(a[k], b[k], path ? `${path}.${k}` : k);
    }
    return;
  }
  problems.push(`${path}: page says ${JSON.stringify(a)}, engine says ${JSON.stringify(b)}`);
})(published, snapshot, '');

if (problems.length > 0) {
  console.error('The readiness page quotes figures the engine no longer returns:\n');
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    '\nThe page follows the engine, never the reverse. Re-run with --write once you ' +
      'have read what changed and why.',
  );
  process.exit(1);
}

const r = snapshot.readiness;
console.log(
  `Readiness snapshot verified: ${r.rulesApproved} of ${r.rulesTotal} rules approved, ` +
    `${r.definitionsSigned} of ${r.definitionsTotal} definitions signed, annex ` +
    `${r.annexVersion}.`,
);
