/**
 * The dependency boundaries, checked.
 *
 * PRD Principle 4 and §12.3 require the invariant layer to be independent of
 * what it checks, and §16.3 requires the same of the validator: "separate
 * module. No imports from the generator or capacity engine. Enforced by an
 * import linter in CI."
 *
 * This repository goes further than an import linter. The forbidden packages
 * are absent from those packages' `package.json` and `tsconfig.json`, so an
 * import of one does not fail a rule — it fails to resolve. A lint rule can be
 * silenced with a comment on the offending line; a missing dependency cannot.
 *
 * So what is there left for this script to check? **That the absence is still
 * there.** Adding `"@envelope/capacity": "workspace:*"` to a manifest is one
 * line, it looks like plumbing in a diff, and it silently converts the
 * strongest guarantee in the architecture into an ordinary convention. This
 * script is the thing that notices.
 *
 * Run: `pnpm boundaries`
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/**
 * Who may not depend on whom, and why it matters in one sentence.
 *
 * The reason is carried with the rule because a boundary nobody can explain is
 * a boundary somebody will eventually delete.
 */
const FORBIDDEN = [
  {
    pkg: 'invariants',
    forbids: ['@envelope/capacity', '@envelope/geometry', '@envelope/rules'],
    why:
      'PRD §12.3 — the conservation layer must not be able to see what it checks. ' +
      'An invariant that imports the generator is an invariant that agrees with it.',
  },
  {
    pkg: 'validation',
    forbids: ['@envelope/capacity', '@envelope/geometry'],
    why:
      'PRD §16.3 — the validator may read the materialised constraint set (that is ' +
      'what it validates against, §16.4) but never the thing that produced the answer. ' +
      'Re-running the generator and then agreeing with it is a tautology dressed as a check.',
  },
  {
    pkg: 'report',
    forbids: ['@envelope/capacity', '@envelope/geometry', '@envelope/rules'],
    why:
      'A report that can reach the capacity engine is a report that can disagree with ' +
      'it — two numbers for one run, and no way to tell which was printed.',
  },
  {
    pkg: 'intake',
    forbids: [
      '@envelope/capacity',
      '@envelope/geometry',
      '@envelope/rules',
      '@envelope/invariants',
      '@envelope/validation',
    ],
    why:
      'Intake reads what a document says. The moment it can reach the engine it can ' +
      'start filling a gap the document left — and a fabricated FAR that arrives ' +
      'wearing a citation is worse than no FAR at all.',
  },
  {
    pkg: 'exports',
    forbids: [
      '@envelope/capacity',
      '@envelope/geometry',
      '@envelope/rules',
      '@envelope/invariants',
      '@envelope/validation',
    ],
    why:
      'The DXF and the workbook must carry the run that was computed, not recompute ' +
      'it. An exporter that can reach the engine can emit a drawing that disagrees ' +
      'with the report of the same run, and nothing would catch it.',
  },
  {
    pkg: 'core',
    forbids: [
      '@envelope/capacity',
      '@envelope/geometry',
      '@envelope/rules',
      '@envelope/invariants',
      '@envelope/validation',
      '@envelope/report',
      '@envelope/intake',
      '@envelope/exports',
    ],
    why: 'core is the bottom of the graph. Anything it depends on is a cycle.',
  },
];

const failures = [];

for (const rule of FORBIDDEN) {
  const dir = join(ROOT, 'packages', rule.pkg);

  // 1. The manifest — what pnpm will link.
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const declared = Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  });
  for (const banned of rule.forbids) {
    if (declared.includes(banned)) {
      failures.push(
        `packages/${rule.pkg}/package.json declares ${banned}. ${rule.why}`,
      );
    }
  }

  // 2. The project references — what tsc will resolve.
  const tsconfig = JSON.parse(
    readFileSync(join(dir, 'tsconfig.json'), 'utf8').replace(/^\s*\/\/.*$/gm, ''),
  );
  for (const ref of tsconfig.references ?? []) {
    const target = `@envelope/${ref.path.split('/').pop()}`;
    if (rule.forbids.includes(target)) {
      failures.push(
        `packages/${rule.pkg}/tsconfig.json references ${target}. ${rule.why}`,
      );
    }
  }

  // 3. The source — belt and braces. A relative import (`../../capacity/src`)
  //    sidesteps both files above and would resolve on disk.
  for (const file of walk(join(dir, 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const banned of rule.forbids) {
      const bare = new RegExp(`from\s+['"]${banned}`, 'g');
      const slug = banned.split('/')[1];
      const relative = new RegExp(`from\s+['"][./]+${slug}/`, 'g');
      if (bare.test(text) || relative.test(text)) {
        failures.push(
          `${file.slice(ROOT.length)} imports ${banned}. ${rule.why}`,
        );
      }
    }
  }
}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) yield full;
  }
}

if (failures.length > 0) {
  console.error(
    `\nPrinciple 4 / §16.3 boundary violated — ${failures.length} finding(s):\n`,
  );
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  console.error(
    'These boundaries are structural on purpose: the forbidden package is absent from\n' +
      'the manifest, so the import fails to resolve rather than failing a rule. Restoring\n' +
      'the absence is the fix; suppressing this script is not.\n',
  );
  process.exit(1);
}

console.log(
  `Boundaries hold. ${FORBIDDEN.length} package(s) checked against ` +
    `${FORBIDDEN.reduce((n, r) => n + r.forbids.length, 0)} forbidden edge(s), ` +
    `across manifests, project references and source imports.`,
);
