/**
 * WHAT THE READER READ, SHOWN (17 Oct 2026).
 *
 * The intake route had sent the per-side setback table, the land-use split, the
 * expiry date, the developer's plot number and the roads no side claims since
 * that morning, and step 0 showed none of them: a DDA sheet with eight setback
 * figures on it read "Setbacks — Not printed".
 */

import type { AffectionPlanRead } from '@web/api/client.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { LocaleProvider } from '../src/lib/locale.js';
import { SheetPanel } from '../src/studio/SheetStep.js';

const text = (value: string) => ({ value, node: 'n1', parameterId: 'x', provenanceClass: 'DERIVED', renderHint: 'NEUTRAL_WITH_CITATION' });

const READ = {
  filename: '6457790.pdf',
  disclaimer: 'Read from the sheet.',
  facts: {
    parcelId: text('6457790'),
    community: null,
    developer: null,
    landUse: text('COMMERCIAL : RETAIL + RESIDENTIAL : APARTMENT'),
    issueDate: text('18/11/2025'),
    drawingRef: null,
    parkingDeferredTo: null,
    totalAreaSqm: null,
    far: null,
    gfaSqm: null,
    height: null,
    setbacks: null,
    coverage: null,
    developerPlotNo: text('WS-12'),
    expiryDate: text('17/11/2026'),
    landUseSplit: { value: [{ use: 'COMMERCIAL : RETAIL', areaM2: '1680.00' }, { use: 'RESIDENTIAL : APARTMENT', areaM2: '12255.45' }] },
    sideSetbacks: {
      value: {
        raw: 'SETBACK (M) BUILDING / PODIUM — SIDE ( 1 ): 5 / 4; SIDE ( 2 ): 7 / 6',
        placement: 'No surveyed ring was read from this sheet, so no side of the setback table is placed on a boundary; the reader says which boundary each side is.',
      },
    },
    unplacedRoads: {
      value: ['ROAD 8.60M'],
      note: 'The drawing prints these roads, and no numbered side is nearest each in turn, so none is placed on a side. Its width is information, never a road’s rank; which boundary it runs along is for the reader to say on the plot step.',
    },
    missing: [],
    crossChecks: [],
    crossChecksPassed: true,
    blocking: [],
  },
} as unknown as AffectionPlanRead;

function render(at = '/studio'): string {
  const noop = (): void => undefined;
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[at]}>
      <LocaleProvider>
        <SheetPanel
          sheet={{ read: READ, attachment: { content: '', filename: '6457790.pdf' } }}
          using={false}
          busy={false}
          error={null}
          onFile={noop}
          onUse={noop}
          onClear={noop}
          onSkip={noop}
          onNext={noop}
        />
      </LocaleProvider>
    </MemoryRouter>,
  );
}

describe('step 0 shows what the reader read', () => {
  it('shows the per-side table and where its sides are, instead of "not printed"', () => {
    const html = render();
    expect(html).toContain('data-sheet-fact="side-setbacks"');
    expect(html).toContain('SIDE ( 1 ): 5 / 4; SIDE ( 2 ): 7 / 6');
    expect(html).toContain('No surveyed ring was read from this sheet');
    expect(html).not.toMatch(/Setbacks<\/dt><dd[^>]*><span class="text-tertiary">Not printed/);
  });

  it('shows the developer’s plot number, the land-use split, the expiry and the roads on no side', () => {
    const html = render();
    expect(html).toContain('Developer’s plot number');
    expect(html).toContain('WS-12');
    expect(html).toContain('COMMERCIAL : RETAIL: 1,680.00 m²');
    expect(html).toContain('Valid until');
    expect(html).toContain('17/11/2026');
    expect(html).toContain('ROAD 8.60M');
    expect(html).toContain('never a road’s rank');
  });

  it('says the placement and the roads note in Arabic on the Arabic page', () => {
    const html = render('/ar/studio');
    expect(html).toContain('صالح حتى');
    expect(html).toContain('لم تقرأ حدود مساحية من هذا المخطط');
    expect(html).toContain('العرض معلومة لا رتبة للطريق');
  });
});
