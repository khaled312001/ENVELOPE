/**
 * A number as a person types it — and the Compute button that waited on one.
 *
 * ---------------------------------------------------------------------------
 * THE DEFECT THESE PIN.
 *
 * Step 3's saleable share was tested with `Number()`. A reader on the Arabic page
 * typed ٠٫٩٣, a reader following the screen's own "93% to 97% of GFA" typed 93%,
 * and each was told the share "has to sit above 0 and at most 1" while Compute
 * capacity stayed disabled — every step after it locked behind "Complete the
 * earlier steps first". Nothing on the screen said the answer had been refused
 * for how it was written rather than what it was.
 *
 * So the assertions are of two kinds: that each way of writing a right answer
 * reaches the API in its one accepted form, and that nothing is read that has two
 * readings. A bare 93 typed as a share is refused, not divided.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { readDecimal } from '../src/decimalInput.js';
import { WORKED_EXAMPLE } from '../src/demo.js';
import { StaticLocale, type Locale } from '../src/i18n/locale.js';
import type { PlotView } from '../src/api/client.js';
import { CoreArea, RulesStep, SaleableEfficiency } from '../src/screens/RulesStep.js';

/** The API's `decimalString`. Every value read must pass it. */
const WIRE = /^-?\d+(\.\d+)?$/;

describe('readDecimal', () => {
  it('returns a figure already in the API form unchanged, character for character', () => {
    for (const typed of ['0.93', '0.930', '6000', '180', '1', '-1']) {
      expect(readDecimal(typed)).toEqual({ value: typed, rewritten: false, percent: false });
    }
  });

  it('reads Arabic-Indic and extended Arabic-Indic digits and the Arabic decimal separator', () => {
    expect(readDecimal('٠٫٩٣')?.value).toBe('0.93');
    expect(readDecimal('٦٠٠٠')?.value).toBe('6000');
    expect(readDecimal('۰٫۹۵')?.value).toBe('0.95');
    expect(readDecimal('٦٬٠٠٠')?.value).toBe('6000');
    expect(readDecimal('٠٫٩٣')?.rewritten).toBe(true);
  });

  it('reads the comma an Arabic keyboard types exactly as a comma', () => {
    expect(readDecimal('0،93')?.value).toBe('0.93');
    expect(readDecimal('٠،٩٣')?.value).toBe('0.93');
    expect(readDecimal('6،000')?.value).toBe('6000');
    expect(readDecimal('0،93')?.rewritten).toBe(true);
  });

  it('drops commas that group thousands, and reads a lone comma as the decimal point', () => {
    expect(readDecimal('6,000')?.value).toBe('6000');
    expect(readDecimal('12,500.5')?.value).toBe('12500.5');
    expect(readDecimal('1,234,567')?.value).toBe('1234567');
    expect(readDecimal('0,93')?.value).toBe('0.93');
    expect(readDecimal('12,5')?.value).toBe('12.5');
  });

  it('completes a number a reader thinks of as complete', () => {
    expect(readDecimal('.93')?.value).toBe('0.93');
    expect(readDecimal('93.')?.value).toBe('93');
    expect(readDecimal('  0.93  ')).toEqual({ value: '0.93', rewritten: false, percent: false });
  });

  it('divides by a hundred only where a percent sign was typed and a share was asked for', () => {
    expect(readDecimal('93%', { percent: true })).toEqual({
      value: '0.93',
      rewritten: true,
      percent: true,
    });
    expect(readDecimal('٩٣٪', { percent: true })?.value).toBe('0.93');
    expect(readDecimal('97.5 %', { percent: true })?.value).toBe('0.975');
    // An area has no percentage; the sign is refused, not ignored.
    expect(readDecimal('93%')).toBeNull();
    // A bare 93 is read as 93. Whether that is a share is the screen's question.
    expect(readDecimal('93', { percent: true })?.value).toBe('93');
  });

  it('refuses whatever has more than one reading, or none', () => {
    for (const typed of ['', '   ', 'abc', '0.9.3', '1,2,3', '6 000', '1e3', '0x1', '%', '9%3']) {
      expect(readDecimal(typed, { percent: true }), typed).toBeNull();
    }
  });

  it('only ever returns the form the API accepts', () => {
    for (const typed of ['٠٫٩٣', '93%', '6,000', '.5', '0,93', '٩٣٪', '1,234.50']) {
      const read = readDecimal(typed, { percent: true });
      expect(read, typed).not.toBeNull();
      expect(read!.value).toMatch(WIRE);
    }
  });
});

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

const ACTOR = { id: 'a', name: 'A Person' };
const PLOT = {
  plotId: 'p-1',
  plotNumber: '1',
  community: 'Test',
  landUse: 'RESIDENTIAL',
  shapeClass: 'RECTANGLE',
  computedAreaM2: '3200.00',
  areaMismatch: false,
  vertices: [],
  edges: [],
} as unknown as PlotView;
const noop = (): void => undefined;

const render = (node: JSX.Element, locale: Locale = 'en'): string =>
  renderToStaticMarkup(<StaticLocale locale={locale}>{node}</StaticLocale>);

/** The Compute button's opening tag. */
function computeButton(markup: string): string {
  const at = markup.indexOf('button button--primary');
  expect(at, 'the Compute button is on the page').toBeGreaterThan(-1);
  return markup.slice(markup.lastIndexOf('<button', at), markup.indexOf('>', at) + 1);
}

function rulesStep(saleableEfficiency: string, locale: Locale = 'en'): string {
  return render(
    <RulesStep
      actor={ACTOR}
      plot={PLOT}
      sheetPodiumLevels={null}
      demo={{ ...WORKED_EXAMPLE.run, saleableEfficiency }}
      busy={false}
      onRun={noop}
      onError={noop}
    />,
    locale,
  );
}

describe('Compute capacity, with the share typed the way a reader types it', () => {
  it('stays enabled for the worked example, which says nothing about a reading', () => {
    const markup = rulesStep(WORKED_EXAMPLE.run.saleableEfficiency);
    expect(computeButton(markup)).not.toContain('disabled');
    expect(markup).not.toContain('The engine reads this as');
  });

  for (const [typed, read] of [
    ['٠٫٩٣', '0.93'],
    ['93%', '0.93'],
    ['0,93', '0.93'],
  ] as const) {
    it(`is enabled for ${typed}, and says the engine reads it as ${read}`, () => {
      const markup = rulesStep(typed);
      expect(computeButton(markup)).not.toContain('disabled');
      expect(markup).toContain('The engine reads this as ');
      expect(markup).toContain(read);
    });
  }

  it('is enabled for Arabic digits on the Arabic page, too', () => {
    const markup = rulesStep('٠٫٩٣', 'ar');
    expect(computeButton(markup)).not.toContain('disabled');
    expect(markup).toContain('يقرؤه المحرك على أنه');
  });

  it('refuses a bare 93 and names both ways of writing it', () => {
    const markup = rulesStep('93');
    expect(computeButton(markup)).toContain('disabled');
    expect(markup).toContain('looks like a percentage');
    expect(markup).toContain('0.93');
    expect(markup).toContain('93%');
  });

  /*
    A DISABLED BUTTON NEEDS A WAY TO WHAT DISABLES IT — reported from the live site.
    Beside Compute: the reason, a button to the field, and for a bare percentage the
    one-click fix that puts the reader's own figure in the box as a share.
  */
  it('offers, beside a disabled Compute, a way to the field and the fix for a bare 93', () => {
    const markup = rulesStep('93');
    expect(markup).toMatch(/<button[^>]*>Use <span[^>]*>0\.93<\/span> \(your figure as a share\)<\/button>/);
    expect(markup).toMatch(/<button[^>]*>Go to the saleable figure<\/button>/);
  });

  it('offers the way to the field when the share is empty, and no fix it would have to invent', () => {
    const markup = rulesStep('');
    expect(computeButton(markup)).toContain('disabled');
    expect(markup).toMatch(/<button[^>]*>Go to the saleable figure<\/button>/);
    expect(markup).not.toContain('your figure as a share');
  });
});

describe('the fields, rendered alone', () => {
  it('prints the figure the run will post when it is not what was typed', () => {
    const markup = render(
      <SaleableEfficiency
        standard={undefined}
        efficiency="6,000"
        unit="AREA"
        valid={true}
        reading="6000"
        onChange={noop}
        onUnitChange={noop}
      />,
    );
    expect(markup).toContain('The engine reads this as ');
    expect(markup).toContain('6000');
  });

  it('prints the core area as read', () => {
    const markup = render(<CoreArea area="١٨٠" valid={true} reading="180" onChange={noop} edges={[]} position="" onPosition={noop} />);
    expect(markup).toContain('The engine reads this as ');
    expect(markup).toContain('180');
  });

  it('says nothing about a reading when none was supplied', () => {
    const markup = render(<CoreArea area="180" valid={true} onChange={noop} edges={[]} position="" onPosition={noop} />);
    expect(markup).not.toContain('The engine reads this as');
  });
});
