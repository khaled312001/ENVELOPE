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
import { NotBoundList, SheetBlockingList, TowerSetbackField } from '../src/studio/sheet-setbacks.js';

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

  /*
    17 Oct 2026: "None of them limits the envelope until it is decided" was false
    once a printed FAR became the GFA's cross-check — the limit it states binds.
  */
  it('no longer says that nothing listed limits the envelope', () => {
    const far = [
      {
        field: 'far',
        stated: 'FAR 3.5; GFA 4778.31 m² ÷ plot area 1365.23 m² = 3.500003',
        reason:
          'The sheet prints both its maximum GFA and its FAR, and the GFA governs: the FAR is that GFA divided by the plot area and rounded, so multiplying it back under-reports. The study applies the printed GFA ÷ the printed plot area; the printed FAR agrees with it to its own rounding.',
      },
    ];
    const en = render(<NotBoundList sheet={sheet(WARSAN, far)} />);
    expect(en).not.toContain('None of them limits the envelope');
    expect(en).toContain('is not applied as printed');
    expect(en).toContain('Floor area ratio, as printed');
    const ar = render(<NotBoundList sheet={sheet(WARSAN, far)} />, '/ar/studio');
    expect(ar).not.toContain('ولا يحد أي منها الغلاف');
    expect(ar).toContain('معامل البناء كما طبع');
    expect(ar).not.toContain('the GFA governs');
  });
});

describe('a per-side table on the plot step', () => {
  /* 6457790: two neighbours, side 1 at 5 / 4 m and side 2 at 7 / 6 m. By class, both read whichever resolved. */
  const perSide: SheetSetbacks = {
    tower: {},
    podium: {},
    bySeq: {
      tower: {
        '0': { kind: 'FIXED', metres: '5', clause: 'SIDE ( 1 ): BUILDING 5 m' },
        '1': { kind: 'FIXED', metres: '7', clause: 'SIDE ( 2 ): BUILDING 7 m' },
      },
      podium: {
        '0': { kind: 'FIXED', metres: '4', clause: 'SIDE ( 1 ): PODIUM 4 m' },
        '1': { kind: 'FIXED', metres: '6', clause: 'SIDE ( 2 ): PODIUM 6 m' },
      },
    },
  };
  const at = (seq: number): string =>
    render(<TowerSetbackField created={created(sheet(perSide))} cls="ADJACENT_PLOT" seq={seq} value="" onChange={() => undefined} inline />);

  it('shows each boundary its own side’s figures, not its class’s', () => {
    expect(at(0)).toMatch(/data-sheet-row="tower">Tower setback, as the affection plan states:.*5 m/);
    expect(at(0)).toMatch(/data-sheet-row="podium">Podium setback, as the affection plan states:.*4 m/);
    expect(at(1)).toMatch(/data-sheet-row="tower">Tower setback, as the affection plan states:.*7 m/);
    // A boundary no side names is typed, as before any sheet.
    expect(at(3)).toContain('<input');
  });
});

describe('what the sheet leaves open that stops the run', () => {
  const blocking = {
    blocking: [
      { field: 'far', label: 'FAR', consequence: 'Floor area ratio is not printed on this sheet. Required before any capacity figure may be produced.' },
    ],
  };

  it('is said on the plot step, before the run is refused', () => {
    const en = render(<SheetBlockingList sheet={{ ...sheet(WARSAN), ...blocking }} />);
    expect(en).toContain('Limits the affection plan leaves open, which stop the study');
    expect(en).toContain('does not borrow one from a neighbouring plot');
    const ar = render(<SheetBlockingList sheet={{ ...sheet(WARSAN), ...blocking }} />, '/ar/studio');
    expect(ar).toContain('حدود يتركها مخطط الأفكشن مفتوحة وتوقف الدراسة');
  });

  it('shows nothing for a sheet that leaves nothing open, or a response older than the field', () => {
    expect(render(<SheetBlockingList sheet={{ ...sheet(WARSAN), blocking: [] }} />)).toBe('');
    expect(render(<SheetBlockingList sheet={sheet(WARSAN)} />)).toBe('');
  });
});
