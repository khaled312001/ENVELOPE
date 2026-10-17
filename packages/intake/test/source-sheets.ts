/**
 * Where the client's real sheets are, when they are on this machine at all.
 *
 * Three samples are in git (`docs/00-source/samples`). The rest are kept out of
 * it on purpose — the developer-standards folder is ignored, and the plot sheets
 * the client sent loose sit at the repository root untracked — so a fresh
 * checkout, and every worktree, has none of them. A test that read them by path
 * failed there with ENOENT, which says nothing about the code and teaches
 * people to ignore a red suite.
 *
 * So a test asks for a sheet here and SKIPS, with the path it looked for in its
 * name, when the sheet is absent. `ENVELOPE_SOURCE_ROOT` names a second
 * checkout to look in (the main one, from a worktree). Nothing is copied into
 * the repository to make a test run: the sheets are the client's and stay where
 * he put them.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));

/** The absolute path of a sheet, relative to a checkout's root; `undefined` when no checkout has it. */
export function sourceSheet(relative: string): string | undefined {
  const roots = [REPO, process.env['ENVELOPE_SOURCE_ROOT']].filter((r): r is string => r !== undefined && r !== '');
  for (const root of roots) {
    const path = join(root, relative);
    if (existsSync(path)) return path;
  }
  return undefined;
}

/** The reason a suite is skipped, written into its name so a skip is never silent. */
export function absentNote(relative: string): string {
  return `(skipped: ${relative} is not on this machine — set ENVELOPE_SOURCE_ROOT to a checkout that has it)`;
}
