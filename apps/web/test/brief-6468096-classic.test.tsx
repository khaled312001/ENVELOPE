/**
 * The classic rules step's brief callout, for a brief that brings no scenarios.
 *
 * It said "Its scenarios replace the general standard's" under every brief. Plot
 * 6468096's brief (17 Oct 2026) has no scenarios of its own — its shares are the
 * general standard's worst case, which stays offered — so on that plot the line
 * was false. Rendered against the real API's `/api/standards`.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import { build } from '../../api/src/server.js';
import type { StandardsView } from '../src/api/client.js';
import { StaticLocale } from '../src/i18n/locale.js';
import { EN } from '../src/i18n/rules.en.js';
import { DeveloperStandardPanel } from '../src/screens/RulesStep.js';

process.env['LOG_LEVEL'] = 'silent';

const HEADERS = { 'x-actor-id': 'u-classic-brief', 'x-actor-name': 'Classic Brief Tester' };
const served: Record<string, StandardsView> = {};

beforeAll(async () => {
  const app = await build();
  try {
    for (const plotNumber of ['6468096', '5180178']) {
      served[plotNumber] = (
        await app.inject({ method: 'GET', url: `/api/standards?plotNumber=${plotNumber}`, headers: HEADERS })
      ).json() as StandardsView;
    }
  } finally {
    await app.close();
  }
}, 60_000);

const render = (standards: StandardsView): string =>
  renderToStaticMarkup(
    <StaticLocale locale="en">
      <DeveloperStandardPanel standards={standards} scenarioId="" onChoose={() => undefined} />
    </StaticLocale>,
  );

describe('the classic brief callout', () => {
  const replaces = EN.standard.brief.replaces;

  it('does not say a brief with no scenarios of its own replaces the standard’s', () => {
    const html = render(served['6468096']!);
    expect(html).toContain('It prints no FAR, and states');
    expect(html).not.toContain(replaces.slice(0, 30));
  });

  it('still says it where the brief brings its own scenarios', () => {
    expect(render(served['5180178']!)).toContain(replaces.slice(0, 30));
  });
});
