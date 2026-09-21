/**
 * The drawing set, composed from real engine output.
 *
 * Not from a fixture: a fixture model is a building somebody typed, and the
 * point of a sheet is that it draws the building the engine computed. So each
 * case runs the pipeline and composes what it returns.
 *
 * Set SHEETS_OUT to a directory to have every sheet written there as SVG — the
 * sheets are reviewed by looking at them, as the screens are (`pnpm shots`).
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { runPipeline } from '@envelope/capacity';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { META, RECT_120x80, RECT_80x40, runInput as input, SKEWED } from '../../../test-support/pipeline.js';
import { composeSheets, type Sheet, sheetSvg, signedLevel, SymbolName } from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

function write(name: string, sheets: readonly Sheet[]): void {
  const out = process.env['SHEETS_OUT'];
  if (!out) return;
  mkdirSync(out, { recursive: true });
  for (const s of sheets) writeFileSync(join(out, `${name}-${s.number}.svg`), sheetSvg(s));
}

const count = (svg: string, needle: RegExp): number => (svg.match(needle) ?? []).length;

describe('the set', () => {
  it('has a site plan, a sheet per parking level, a typical floor and a section, in binding order', () => {
    const out = runPipeline(input(RECT_80x40, { podiumLevels: 2, parkingLevelsAvailable: 2 }));
    const sheets = composeSheets(out.building, META);
    write('80x40', sheets);
    expect(sheets.map((s) => s.number)).toEqual(['A-001', 'A-101', 'A-102', 'A-201', 'A-301', 'A-302']);
    expect(sheets.filter((s) => s.kind === 'PARKING').map((s) => s.levelId)).toEqual(['L00', 'L01']);
  });

  it('carries the two sentences on every sheet', () => {
    const out = runPipeline(input(RECT_80x40));
    for (const sheet of composeSheets(out.building, META)) {
      const svg = sheetSvg(sheet);
      expect(svg).toContain('REGULATORY VALIDITY: NOT ASSESSED');
      expect(svg).toContain('NOT FOR CONSTRUCTION');
    }
  });

  it('is the same set, byte for byte, for the same run', () => {
    const a = composeSheets(runPipeline(input(SKEWED)).building, META).map((s) => sheetSvg(s));
    const b = composeSheets(runPipeline(input(SKEWED)).building, META).map((s) => sheetSvg(s));
    expect(a).toEqual(b);
  });
});

describe('a parking level sheet', () => {
  it('draws every bay the engine laid out, with one car in each, and prints the engine count', () => {
    for (const ring of [RECT_80x40, RECT_120x80, SKEWED]) {
      const out = runPipeline(input(ring));
      const sheets = composeSheets(out.building, META);
      write(ring === SKEWED ? 'skewed' : ring === RECT_120x80 ? '120x80' : '80x40-2', sheets);
      for (const sheet of sheets.filter((s) => s.kind === 'PARKING')) {
        const level = out.building.levels.find((l) => l.id === sheet.levelId)!;
        const engine = Number(level.parking!.bayCount.value);
        const svg = sheetSvg(sheet);
        expect(count(svg, /data-bay="/g)).toBe(engine);
        expect(count(svg, /data-symbol="CAR"/g)).toBe(engine);
        expect(sheet.items.filter((i) => i.kind === 'symbol' && i.symbol === SymbolName.CAR)).toHaveLength(engine);
        // The strip quotes the engine's figure, not the drawing's.
        expect(svg).toContain(`>${level.parking!.bayCount.value}`);
      }
    }
  });

  it('labels each aisle with the engine words and draws its direction', () => {
    const out = runPipeline(input(RECT_80x40));
    const sheet = composeSheets(out.building, META).find((s) => s.kind === 'PARKING')!;
    const svg = sheetSvg(sheet);
    expect(svg).toMatch(/6\.00M WIDE 2 WAY DRIVEWAY/);
    expect(count(svg, /data-symbol="ARROW2"/g)).toBeGreaterThanOrEqual(2);
  });

  it('says which way the ramp goes from this level, and that its gradient is not assessed', () => {
    const out = runPipeline(input(RECT_80x40, { podiumLevels: 2 }));
    const [low, high] = composeSheets(out.building, META).filter((s) => s.kind === 'PARKING');
    expect(sheetSvg(low!)).toContain('UP TO L01');
    expect(sheetSvg(high!)).toContain('DOWN TO L00');
    expect(sheetSvg(low!)).toMatch(/GRADIENT NOT ASSESSED/);
  });

  it('inks an assumed figure amber and says ASSUMED beside it', () => {
    const out = runPipeline(input(RECT_80x40, { podiumLevels: 2 }));
    const sheet = composeSheets(out.building, META).find((s) => s.kind === 'PARKING')!;
    const svg = sheetSvg(sheet);
    // The ramp gradient rests on the assumed run.
    expect(svg).toMatch(/class="shp shp-text shp-value sh-c-assumed"[^>]*>[^<]*% · ASSUMED/);
  });

  it('keeps every word within what an R12 file can carry: ASCII, and ± as its %%p code', () => {
    const out = runPipeline(input(SKEWED));
    for (const sheet of composeSheets(out.building, META)) {
      for (const item of sheet.items) {
        if (item.kind === 'text') expect(item.value).toMatch(/^[\x20-\x7E±]*$/);
      }
    }
  });
});

describe('the section', () => {
  it('marks every level at the elevation the engine traced', () => {
    const out = runPipeline(input(RECT_80x40, { podiumLevels: 2 }));
    const sheet = composeSheets(out.building, META).find((s) => s.kind === 'SECTION')!;
    const svg = sheetSvg(sheet);
    for (const level of out.building.levels) {
      expect(svg).toContain(`${level.id}  ${signedLevel(level.elevationM.value)}`);
    }
    expect(svg).toContain(`HEIGHT CEILING +${out.building.heightCeilingM.value} M`);
  });
});

describe('signedLevel', () => {
  it('writes a level as a drafter does, without doing arithmetic on it', () => {
    expect(signedLevel('0')).toBe('±0.00');
    expect(signedLevel('3.2')).toBe('+3.20');
    expect(signedLevel('-6.4')).toBe('-6.40');
    expect(signedLevel('12.345')).toBe('+12.34');
  });
});
