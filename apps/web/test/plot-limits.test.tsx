/**
 * The plot-limits panel, held to what it must never stop saying.
 *
 * These are PROHIBITIONS as much as assertions, for the reason
 * `landing.test.tsx` gives: a test that only checked the honest text was present
 * would pass on a panel that had added "meets the sheet" underneath it.
 *
 * The three that matter:
 *
 *  1. every limit the sheet states and the engine did not apply is ON THE PAGE,
 *     with its reason — this panel exists because a document was once read,
 *     displayed and dropped in silence, and showing only the applied half would
 *     be that same silence one screen later;
 *  2. NO AMBER anywhere on it — nothing here is `ASSUMED`, and §13.1 reserves the
 *     colour exclusively for uncertainty;
 *  3. it never says the design complies, in either language.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { SheetReport } from '../src/api/client.js';
import { PlotLimits } from '../src/components/PlotLimits.js';
import { StaticLocale, type Locale } from '../src/i18n/locale.js';
import { expectNoComplianceClaim, stripTags } from './prohibitions.js';

const BOUND: SheetReport = {
  attached: true,
  documentUri: 'IC1-CTYL-16_011.pdf',
  issuedOn: '22-12-2025',
  refused: null,
  bound: [
    { parameterId: 'far.max', value: '3.5', unit: 'ratio', clause: 'F.A.R. = 3.5' },
    { parameterId: 'coverage.max', value: '100', unit: '%', clause: 'GF & Podium: 100%' },
  ],
  notBound: [
    {
      field: 'height',
      stated: 'G+2P+8',
      reason:
        'height.max is a ceiling in metres and the sheet states a level count. Converting ' +
        'one to the other needs a floor-to-floor, which is itself a resolved parameter.',
    },
    {
      field: 'setbacks.tower',
      stated: 'Tower: Front = 0m, Sides & Rear = 3m',
      reason:
        'The engine holds one setback per edge class and the podium row binds it. The ' +
        'tower is capped by tower_plate.max, which is an area.',
    },
  ],
};

const paint = (sheet: SheetReport, locale: Locale = 'en'): string =>
  renderToStaticMarkup(
    <StaticLocale locale={locale}>
      <PlotLimits sheet={sheet} />
    </StaticLocale>,
  );

/** What a reader sees: tags gone, entities read, whitespace as a browser lays it. */
const visible = (markup: string): string =>
  stripTags(markup).replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ');

describe('what the sheet bound', () => {
  it('names the document and the date it was issued', () => {
    const text = visible(paint(BOUND));
    expect(text).toContain('IC1-CTYL-16_011.pdf');
    expect(text).toContain('22-12-2025');
  });

  it('lists every applied limit with the sheet’s own words beside it', () => {
    const text = visible(paint(BOUND));
    for (const b of BOUND.bound) {
      expect(text, `${b.parameterId} should be named`).toContain(b.parameterId);
      expect(text).toContain(`${b.value} ${b.unit}`);
      expect(text).toContain(b.clause);
    }
  });
});

describe('what the sheet states and the run does not use', () => {
  it('is on the page, not behind a disclosure and not reduced to a count', () => {
    const markup = paint(BOUND);
    const text = visible(markup);

    for (const n of BOUND.notBound) {
      expect(text, `${n.field} should be named`).toContain(n.field);
      expect(text).toContain(n.stated);
      expect(text).toContain(n.reason);
    }

    // Not inside a <details>. A closed disclosure is how the last version of
    // this information disappeared.
    expect(markup).not.toContain('<details');
  });

  it('gives a reason for every one of them, not a shrug', () => {
    for (const n of BOUND.notBound) {
      expect(n.reason.length, `${n.field} needs a real reason`).toBeGreaterThan(40);
      expect(visible(paint(BOUND))).toContain(n.reason);
    }
  });

  it('would notice a panel that dropped one', () => {
    // The defect this whole path closes was a limit that was read and then not
    // mentioned. Rendering a sheet with an extra unbound limit must show it.
    const extra: SheetReport = {
      ...BOUND,
      notBound: [
        ...BOUND.notBound,
        {
          field: 'gfaSqm',
          stated: '4778.31 m²',
          reason: 'GFA is derived from FAR and plot area; there is no gfa.max to bind to.',
        },
      ],
    };
    expect(visible(paint(extra))).toContain('4778.31');
  });
});

describe('the three states are all said out loud', () => {
  it('says plainly when no sheet is attached, and does not call it a problem', () => {
    const none: SheetReport = {
      attached: false,
      documentUri: null,
      issuedOn: null,
      refused: null,
      bound: [],
      notBound: [],
    };
    const markup = paint(none);
    expect(visible(markup)).toContain('No affection plan is attached');
    expect(markup).not.toContain('role="alert"');
    expect(markup).not.toContain('banner--danger');
  });

  it('says which parcel a refused sheet belongs to, and still is not an alert', () => {
    const refused: SheetReport = {
      attached: true,
      documentUri: 'other-plot.pdf',
      issuedOn: null,
      refused: 'the sheet is issued for parcel 6211383 and this plot is 345-1234.',
      bound: [],
      notBound: [],
    };
    const markup = paint(refused);
    expect(visible(markup)).toContain('6211383');
    // The run completed on the general rules. An alert would report it broken.
    expect(markup).not.toContain('role="alert"');
  });
});

describe('prohibitions', () => {
  it('paints no amber — nothing on this panel is assumed', () => {
    for (const locale of ['en', 'ar'] as const) {
      const markup = paint(BOUND, locale);
      expect(markup, locale).not.toContain('traced--assumed');
      expect(markup, locale).not.toContain('--uncertain');
      expect(markup, locale).not.toContain('ASSUMED');
    }
  });

  it('never claims the design meets the sheet, in either language', () => {
    for (const locale of ['en', 'ar'] as const) {
      expectNoComplianceClaim(paint(BOUND, locale), `plot limits (${locale})`);
    }
  });

  it('carries the refusal sentence under the tables, both languages', () => {
    expect(visible(paint(BOUND))).toContain('never assessed and never claimed');
    expect(visible(paint(BOUND, 'ar'))).toContain('الصلاحية التنظيمية لا تخضع للتقييم إطلاقا');
  });
});
