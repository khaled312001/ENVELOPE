/**
 * The engine's run times, read out of the API's own log.
 *
 *   node scripts/run-times.mjs < api.log
 *   ssh … 'cat <passenger log>' | node scripts/run-times.mjs
 *
 * Every computed run logs one `run.computed` line (`apps/api/src/server.ts`).
 * This prints how many there were and the 50th, 95th and slowest of them, by
 * plot shape. It is the measurement plan Phase 6 waits on: the geometry moves
 * to Rust/WASM only if real runs on the real host come near the 10-second
 * budget §19 sets, and not because a rewrite would be interesting.
 *
 * Lines that are not JSON, or not that event, are skipped — a Passenger log
 * interleaves the app's output with its own.
 */

import { createInterface } from 'node:readline';

const byShape = new Map();
for await (const line of createInterface({ input: process.stdin })) {
  const start = line.indexOf('{');
  if (start < 0) continue;
  let entry;
  try {
    entry = JSON.parse(line.slice(start));
  } catch {
    continue;
  }
  if (entry?.event !== 'run.computed' || typeof entry.elapsedMs !== 'number') continue;
  for (const key of ['ALL', entry.shape ?? 'UNKNOWN']) {
    if (!byShape.has(key)) byShape.set(key, []);
    byShape.get(key).push(entry.elapsedMs);
  }
}

if (byShape.size === 0) {
  console.log('No run.computed lines found. Is this the API log, from a release that logs them?');
  process.exit(1);
}

const at = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
console.log('shape'.padEnd(16), 'runs'.padStart(6), 'p50 ms'.padStart(8), 'p95 ms'.padStart(8), 'max ms'.padStart(8));
for (const [shape, times] of [...byShape].sort(([a], [b]) => (a === 'ALL' ? -1 : b === 'ALL' ? 1 : a.localeCompare(b)))) {
  const s = [...times].sort((a, b) => a - b);
  console.log(
    shape.padEnd(16),
    String(s.length).padStart(6),
    String(at(s, 0.5)).padStart(8),
    String(at(s, 0.95)).padStart(8),
    String(s.at(-1)).padStart(8),
  );
}
