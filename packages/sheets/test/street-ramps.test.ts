/**
 * The ramps from the street, on paper.
 *
 * Where the ground floor does not park, the engine places a ramp down to B1 and
 * a ramp up to P1 from the entrance (`packages/capacity/src/street-ramp.ts`).
 * They are drawn where they stand: on the site plan, which is the ground floor,
 * and on the sheet of the level each one reaches. And they are not the strip's
 * ramp — before `ModelRamp.street` the strip on B1 would have found the ramp
 * from the street as its own and printed UP TO G across it.
 */
import { Decimal } from '@envelope/core';
import { runPipeline, ParkingArrangement } from '@envelope/capacity';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { META, RECT_120x80, runInput } from '../../../test-support/pipeline.js';
import { composeSheets } from '../src/compose.js';
import { Role, SymbolName, type ShapeItem, type Sheet, type TextItem } from '../src/types.js';

beforeAll(async () => {
  await initGeometry();
});

const ON_BOUNDARY = {
  statementId: 'STMT-PODIUM-SETBACK-2026-10-16',
  statedBy: 'Eng. Mohamed',
  statedOn: '2026-10-16',
  verbatim: 'ال دور ال ارضي و البوديوم و البدروم بياخدو مساحه الارض كلها مفيش setbacks',
};

let sheets: readonly Sheet[];
let model: ReturnType<typeof runPipeline>['building'];
beforeAll(() => {
  model = runPipeline(
    runInput(RECT_120x80, {
      levelSchedule: { basements: 3, groundIsParking: false, podiumAboveGround: 5, podiumParkingLevels: 5 },
      podiumAtBoundaryStatement: ON_BOUNDARY,
      levelPlan: {
        arrangement: ParkingArrangement.WIDTH,
        vehicleAccess: { entry: { edgeSeq: 0, centreOffsetM: new Decimal('25') } },
      },
    }),
  ).building;
  sheets = composeSheets(model, META);
});

const streetShapes = (sheet: Sheet): ShapeItem[] =>
  sheet.items.filter(
    (i): i is ShapeItem => i.kind === 'shape' && i.role === Role.RAMP && /^RAMP FROM STREET/.test(i.name ?? ''),
  );
const texts = (sheet: Sheet): string[] =>
  sheet.items.filter((i): i is TextItem => i.kind === 'text').map((i) => i.value);

describe('the ramps from the street, drawn', () => {
  it('stands both on the site plan, with the landing before them, and keys their arrow', () => {
    expect(model.ramps.filter((r) => r.street)).toHaveLength(2);
    const site = sheets.find((s) => s.kind === 'SITE')!;
    expect(streetShapes(site).map((s) => s.name)).toEqual([
      expect.stringMatching(/^RAMP FROM STREET DOWN TO B1 /),
      expect.stringMatching(/^RAMP FROM STREET UP TO P1 /),
    ]);
    expect(site.items.some((i) => i.kind === 'shape' && /^Level landing before/.test(i.name ?? ''))).toBe(true);
    expect(site.legend.some((e) => e.role === Role.RAMP_ARROW && e.symbol === SymbolName.ARROW)).toBe(true);
  });

  it('draws each on the sheet of the level it reaches, and on no other parking sheet', () => {
    const level = (id: string) => sheets.find((s) => s.levelId === id)!;
    expect(streetShapes(level('B1')).map((s) => s.name)).toEqual([expect.stringMatching(/DOWN TO B1/)]);
    expect(streetShapes(level('P1')).map((s) => s.name)).toEqual([expect.stringMatching(/UP TO P1/)]);
    expect(streetShapes(level('B2'))).toEqual([]);
    expect(streetShapes(level('P2'))).toEqual([]);
  });

  it('never takes a ramp from the street for the strip’s ramp between parking levels', () => {
    for (const sheet of sheets.filter((s) => s.levelId !== null)) {
      for (const t of texts(sheet)) expect(t, sheet.number).not.toMatch(/UP TO G\b|DOWN TO G\b/);
    }
  });
});
