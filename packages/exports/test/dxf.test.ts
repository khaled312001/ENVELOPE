/**
 * DXF output, checked as a format and then read back by a DXF parser.
 *
 * Two different failures, two different checks. DXF is a flat sequence of
 * (group code, value) pairs, so one stray line shifts every code after it and the
 * file opens as an empty drawing while still looking plausible in a text editor —
 * the pairing check catches that. And a file can pair perfectly and still hold
 * the wrong drawing — so each file is also parsed by `dxf-parser`, an
 * independent reader, and what it finds is counted against the engine.
 */

import { runPipeline } from '@envelope/capacity';
import { initGeometry } from '@envelope/geometry';
import { composeSheets } from '@envelope/sheets';
import type { IDxf, IInsertEntity, ITextEntity } from 'dxf-parser';
import { beforeAll, describe, expect, it } from 'vitest';

import { parseDxf as parse } from '../../../test-support/dxf.js';
import { META, RECT_80x40, runInput, SKEWED } from '../../../test-support/pipeline.js';
import { buildingDxf, dxfText, layerName, sheetDxf, writeDxf } from '../src/index.js';

function pairs(dxf: string): readonly (readonly [string, string])[] {
  const lines = dxf.split('\r\n');
  // trailing newline leaves one empty element
  if (lines.at(-1) === '') lines.pop();
  expect(lines.length % 2, 'group codes and values must pair exactly').toBe(0);
  const out: (readonly [string, string])[] = [];
  for (let i = 0; i < lines.length; i += 2) out.push([lines[i]!.trim(), lines[i + 1]!]);
  return out;
}

const inserts = (dxf: IDxf, block: string): IInsertEntity[] =>
  dxf.entities.filter((e): e is IInsertEntity => e.type === 'INSERT' && (e as IInsertEntity).name === block);

beforeAll(async () => {
  await initGeometry();
});

describe('writeDxf', () => {
  const doc = writeDxf({
    layers: [{ name: 'A', color: 7 }],
    blocks: [{ name: 'B', polylines: [{ points: [[0, 0], [1, 0]], closed: false }] }],
    entities: [
      { kind: 'polyline', layer: 'A', points: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }], closed: true, z: 0 },
      { kind: 'text', layer: 'A', at: { x: 0, y: 0 }, z: 0, heightM: 1, rotationDeg: 0, align: 'middle', value: 'x' },
    ],
  });

  it('emits paired group codes and terminates with EOF', () => {
    const p = pairs(doc);
    expect(p.at(-1)).toEqual(['0', 'EOF']);
  });

  it('opens and closes every section', () => {
    const p = pairs(doc);
    const opens = p.filter(([c, v]) => c === '0' && v === 'SECTION').length;
    const closes = p.filter(([c, v]) => c === '0' && v === 'ENDSEC').length;
    expect(opens).toBe(4); // HEADER, TABLES, BLOCKS, ENTITIES
    expect(closes).toBe(opens);
  });

  it('declares R12 in metres, so every CAD tool reads it and scales it on insert', () => {
    expect(doc).toContain('$ACADVER\r\n1\r\nAC1009');
    expect(doc).toContain('$INSUNITS\r\n70\r\n6');
  });

  it('converts kernel millimetres to metres exactly once', () => {
    const vertexX = pairs(doc).filter(([c]) => c === '10').map(([, v]) => v);
    expect(vertexX).toContain('1.0000');
    expect(vertexX).not.toContain('1000.0000');
  });

  it('writes ± and ° as their CAD codes and nothing else outside ASCII', () => {
    expect(dxfText('L00  ±0.00')).toBe('L00  %%p0.00');
    expect(dxfText('45°')).toBe('45%%d');
    expect(dxfText('مخطط')).toBe('????');
  });
});

describe('a parking level, read back', () => {
  it('holds one CAR insert per bay the engine laid out, on that level\'s layers', () => {
    for (const ring of [RECT_80x40, SKEWED]) {
      const out = runPipeline(runInput(ring));
      for (const sheet of composeSheets(out.building, META).filter((s) => s.kind === 'PARKING')) {
        const level = out.building.levels.find((l) => l.id === sheet.levelId)!;
        const dxf = parse(sheetDxf(sheet, META));
        const cars = inserts(dxf, 'CAR');
        expect(cars).toHaveLength(Number(level.parking!.bayCount.value));
        for (const car of cars) expect(car.layer).toBe(layerName(level.id, 'car'));
        // Counted as parsed entities on the bay layer, not as string occurrences:
        // R12 repeats the layer on every VERTEX and SEQEND.
        const bays = dxf.entities.filter(
          (e) => e.type === 'POLYLINE' && (e.layer === layerName(level.id, 'bay') || e.layer === layerName(level.id, 'bay-accessible')),
        );
        expect(bays).toHaveLength(cars.length);
      }
    }
  });

  it('defines the CAR block it inserts, and declares every layer it draws on', () => {
    const out = runPipeline(runInput(RECT_80x40));
    const sheet = composeSheets(out.building, META).find((s) => s.kind === 'PARKING')!;
    const dxf = parse(sheetDxf(sheet, META));
    expect(Object.keys(dxf.blocks)).toEqual(expect.arrayContaining(['CAR', 'ARROW', 'ARROW2']));
    expect(dxf.blocks['CAR']!.entities.length).toBeGreaterThan(0);
    const declared = new Set(Object.keys(dxf.tables.layer.layers));
    for (const e of dxf.entities) expect(declared.has(e.layer), e.layer).toBe(true);
  });

  it('keeps the engine\'s words, and carries the disclaimer inside the file', () => {
    const out = runPipeline(runInput(RECT_80x40));
    const sheet = composeSheets(out.building, META).find((s) => s.kind === 'PARKING')!;
    const texts = parse(sheetDxf(sheet, META)).entities
      .filter((e): e is ITextEntity => e.type === 'TEXT')
      .map((t) => t.text);
    expect(texts).toContain('6.00M WIDE 2 WAY DRIVEWAY');
    expect(texts.join(' ')).toMatch(/REGULATORY VALIDITY: NOT ASSESSED/);
    for (const t of texts) expect(t).toMatch(/^[\x20-\x7E]*$/);
  });
});

describe('the building, in three dimensions', () => {
  it('puts every parking level at its own elevation, with every car the model draws', () => {
    const out = runPipeline(runInput(RECT_80x40, { podiumLevels: 2 }));
    const sheets = composeSheets(out.building, META);
    const dxf = parse(buildingDxf(out.building, sheets, META));
    expect(inserts(dxf, 'CAR')).toHaveLength(Number(out.building.drawnBays.value));
    for (const level of out.building.levels.filter((l) => l.parking)) {
      const cars = inserts(dxf, 'CAR').filter((c) => c.layer === layerName(level.id, 'car'));
      expect(cars.length).toBeGreaterThan(0);
      for (const c of cars) expect(c.position.z).toBeCloseTo(level.elevationMm / 1000, 4);
    }
  });

  it('stands the massing up as faces, and the ramp as a slope between two levels', () => {
    const out = runPipeline(runInput(RECT_80x40, { podiumLevels: 2 }));
    const dxf = parse(buildingDxf(out.building, composeSheets(out.building, META), META));
    const faces = dxf.entities.filter((e) => e.type === '3DFACE') as unknown as { layer: string; vertices: { z: number }[] }[];
    // Mass up to the answer's top level, and none above it: a level the answer does
    // not place is an outline on a context layer, never a face.
    const placed = out.building.levels.filter((l) => l.placed);
    const unplaced = out.building.levels.filter((l) => !l.placed);
    expect(unplaced.length).toBeGreaterThan(0);
    expect(faces.some((f) => f.layer === layerName(placed.at(-1)!.id, 'MASS'))).toBe(true);
    for (const level of unplaced) {
      expect(faces.some((f) => f.layer.startsWith(`ENV-${level.id}-`)), level.id).toBe(false);
      expect(dxf.entities.some((e) => e.layer === layerName(level.id, 'context')), level.id).toBe(true);
    }
    const ramp = faces.find((f) => f.layer === layerName('R1', 'ramp'))!;
    // dxf-parser 1.1.2 loops `i <= 4` and appends an empty fifth vertex to every
    // 3DFACE; a face has four corners, so the fifth is the reader's, not the file's.
    const zs = ramp.vertices.slice(0, 4).map((v) => v.z);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(out.envelope.floorToFloorM.value.toNumber(), 4);
  });
});

describe('the title block, in the file an architect x-refs', () => {
  const sheetOf = (meta: Parameters<typeof sheetDxf>[1]): string => {
    const out = runPipeline(runInput(RECT_80x40, {}));
    const sheet = composeSheets(out.building, META).find((s) => s.kind === 'SITE')!;
    return sheetDxf(sheet, meta);
  };

  it('dates the drawing by the run and never by the export', () => {
    /*
      The two agree on the day a run is exported, which is why a drift here would
      never be noticed: it surfaces months later, on a download of a drawing
      nobody has changed, in the file most likely to be x-reffed into a
      submission set by somebody who never saw the run.
    */
    const dxf = sheetOf({ ...META, issuedAt: '2019-03-04T09:12:00.000Z' });
    expect(dxf).toContain('Issued 2019-03-04');
    expect(dxf).not.toContain(new Date().toISOString().slice(0, 10));
  });

  it('says NOT CHECKED in words, and names the reviewer once there is one', () => {
    expect(sheetOf(META)).toContain('Checked by: NOT CHECKED');
    expect(sheetOf({ ...META, checkedBy: 'R. HABIB' })).toContain('Checked by: R. HABIB');
  });

  it('states the one revision there is, and that no history is kept', () => {
    expect(sheetOf(META)).toContain('Revision 0 - first issue');
    expect(sheetOf(META)).toContain('a recomputation is a new run');
  });

  it('folds a name R12 cannot hold, visibly, rather than writing a file that will not open', () => {
    /*
      R12 is not Unicode: `$DWGCODEPAGE` names a single-byte page. A reviewer
      whose name is written in Arabic \u2014 which on this product is the likely
      case, not the exotic one \u2014 would otherwise put a text entity outside
      printable ASCII into the file, and `scripts/verify-dxf.mjs` would fail it.
      That is the right verdict on the file and the wrong place to learn it: the
      gate runs over our fixtures and the name arrives from a customer.
    */
    const dxf = sheetOf({ ...META, checkedBy: '\u0645\u062d\u0645\u062f \u0633\u0627\u0644\u0645' });
    expect(dxf).toMatch(/Checked by: \?+ \?+\./);
    // Line endings are ASCII too, so the whole file may be held to it.
    expect(/^[\u0000-\u007f]*$/.test(dxf), 'the whole file stays printable ASCII').toBe(true);
  });
});
