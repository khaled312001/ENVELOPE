/**
 * THE PLOT STEP NEVER CALLS THE PODIUM'S FIGURE THE TOWER'S (17 Oct 2026).
 *
 * It read `setback.<class>` off the sheet's bound list, which was the sheet's
 * PODIUM row: Warsan 6211383 showed "Tower setback, as the affection plan
 * states: 0 m" on every boundary, over a sheet whose tower row prints 3 m from
 * the neighbours. It now reads `sheet.setbacks`, the two rows apart, and lists
 * what the sheet states that the run does not apply.
 */

import type { PlotCreated, SheetSetbacks } from '@web/api/client.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { LocaleProvider } from '../src/lib/locale.js';
import { NotBoundList, TowerSetbackField } from '../src/studio/sheet-setbacks.js';

const sheet = (setbacks: SheetSetbacks | undefined, notBound: PlotCreated['sheet']['notBound'] = []): PlotCreated['sheet'] => ({
  attached: true,
  documentUri: 'IC1-CTYL-16_011-warsan1-621.pdf',
  issuedOn: '2025-12-22',
  refused: null,
  bound: [
    // What the old screen read: the podium row's 0 m, under the parameter it used to bind.
    { parameterId: 'setback.podium.adjacent_plot', value: '0', unit: 'm', clause: 'GF & Podium: 0m from all sides' },
  ],
  notBound,
  ...(setbacks ? { setbacks } : {}),
});

const created = (s: PlotCreated['sheet']): PlotCreated =>
  ({ plotId: 'p1', sheet: s, frontageCount: 1 }) as unknown as PlotCreated;

function render(node: JSX.Element, at = '/studio'): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[at]}>
      <LocaleProvider>{node}</LocaleProvider>
    </MemoryRouter>,
  );
}

const field = (c: PlotCreated, cls: 'ROAD' | 'ADJACENT_PLOT', at?: string): string =>
  render(<TowerSetbackField created={c} cls={cls} seq={1} value="" onChange={() => undefined} inline />, at);

const WARSAN: SheetSetbacks = {
  tower: {
    ROAD: { kind: 'FIXED', metres: '0', clause: 'Tower: Front = 0m, Sides & Rear = 3m' },
    ADJACENT_PLOT: { kind: 'FIXED', metres: '3', clause: 'Tower: Front = 0m, Sides & Rear = 3m' },
  },
  podium: {
    ROAD: { kind: 'FIXED', metres: '0', clause: 'GF & Podium: 0m from all sides' },
    ADJACENT_PLOT: { kind: 'FIXED', metres: '0', clause: 'GF & Podium: 0m from all sides' },
  },
};

describe('the tower setback on the plot step', () => {
  it('states the tower row’s 3 m as the tower’s, and the podium’s 0 m as the podium’s', () => {
    const html = field(created(sheet(WARSAN)), 'ADJACENT_PLOT');
    expect(html).toMatch(/data-sheet-row="tower">Tower setback, as the affection plan states:.*3 m/);
    expect(html).toMatch(/data-sheet-row="podium">Podium setback, as the affection plan states:.*0 m/);
    expect(html).not.toMatch(/Tower setback, as the affection plan states:[^<]*<span[^>]*>0 m/);
    // The sheet governs here, so nothing is typed.
    expect(html).not.toContain('<input');
  });

  it('never calls a podium-only figure the tower’s: the reader types the tower’s', () => {
    const podiumOnly: SheetSetbacks = {
      tower: {},
      podium: { ADJACENT_PLOT: { kind: 'FIXED', metres: '2', clause: 'GF & Podium: 2m from all sides' } },
    };
    const html = field(created(sheet(podiumOnly)), 'ADJACENT_PLOT');
    expect(html).not.toContain('Tower setback, as the affection plan states');
    expect(html).toMatch(/Podium setback, as the affection plan states:.*2 m/);
    expect(html).toContain('<input');
    // The sheet sets the podium back 2 m: "the podium reaches this boundary" would contradict it.
    expect(html).not.toContain('The podium and basements reach this boundary');
    // Where the sheet's podium is on the boundary, the label says so.
    const atBoundary: SheetSetbacks = { tower: {}, podium: WARSAN.podium };
    expect(field(created(sheet(atBoundary)), 'ADJACENT_PLOT')).toContain('The podium and basements reach this boundary');
  });

  it('shows the typed field and no sheet figure for a response without the two rows', () => {
    const html = field(created(sheet(undefined)), 'ADJACENT_PLOT');
    expect(html).not.toContain('as the affection plan states');
    expect(html).toContain('<input');
  });

  it('asks which face a road is when the sheet states the tower by face, in both languages', () => {
    const byFace: SheetSetbacks = {
      tower: {
        ROAD: {
          kind: 'BY_FACE',
          faces: [
            { face: 'front', metres: '0' },
            { face: 'side', metres: '3' },
            { face: 'rear', metres: '3' },
          ],
          clause: 'Tower: Front = 0m, Sides & Rear = 3m',
        },
      },
      podium: {},
    };
    const en = field(created(sheet(byFace)), 'ROAD');
    expect(en).toContain('<input');
    expect(en).toContain('by face (front 0 m; side 3 m; rear 3 m)');
    const ar = field(created(sheet(byFace)), 'ROAD', '/ar/studio');
    expect(ar).toContain('الأمامي 0 m; الجانبي 3 m; الخلفي 3 m');
  });
});

describe('what the sheet states and the run does not apply', () => {
  const notBound = [
    {
      field: 'setbacks.tower.front',
      stated: 'Tower: Front = 0m, Sides & Rear = 3m',
      reason:
        'The sheet states the tower setback by face, and a plot with more than one road boundary ' +
        'does not say which road is the front. The run asks for the face of each road boundary ' +
        'rather than choosing one.',
    },
  ];

  it('lists each entry with the sheet’s words and the reason, in Arabic on the Arabic page', () => {
    const en = render(<NotBoundList sheet={sheet(WARSAN, notBound)} />);
    expect(en).toContain('What the affection plan states that this run does not apply');
    expect(en).toContain('Tower setback, front');
    expect(en).toContain('Tower: Front = 0m, Sides &amp; Rear = 3m');
    const ar = render(<NotBoundList sheet={sheet(WARSAN, notBound)} />, '/ar/studio');
    expect(ar).toContain('ارتداد البرج، الحد الأمامي');
    expect(ar).not.toContain('does not say which road is the front');
  });

  it('shows nothing when the sheet left nothing out', () => {
    expect(render(<NotBoundList sheet={sheet(WARSAN, [])} />)).toBe('');
  });
});
