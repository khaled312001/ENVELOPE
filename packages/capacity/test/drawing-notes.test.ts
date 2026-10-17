/**
 * The sentences under every drawing, held to what the run actually did.
 *
 * Four of them were false on some run:
 *
 * - "The layout charges Table B.11's 300 mm clearance per bay" was printed on
 *   every run; `layout.ts` charges it only on a stated structural grid. On the
 *   studio's runs — the column-gap statement — the layout's own note said the
 *   300 mm is NOT added, beside it on the same sheet.
 * - "refuse room … NOT ASSESSED until their rules are encoded" was printed on
 *   runs that draw a GARBAGE ROOM.
 * - Bicycle parking was listed as encoded (INVENTORY.md) and computed nowhere.
 * - Table B.4's 2.3 m parking clear height was encoded nowhere and said nowhere.
 *
 * Every assertion runs the real pipeline.
 */

import { Decimal } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { RECT_120x80, RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import { runPipeline, type RunInput } from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

const notes = (overrides: Partial<RunInput> = {}, ring = RECT_80x40): readonly string[] =>
  runPipeline(runInput(ring, overrides)).building.notModelled;

const GAP: RunInput['columnGapStatement'] = {
  statementId: 'STMT-TEST-COLUMN-GAP',
  statedBy: 'a named practitioner',
  statedOn: '2026-10-16',
  verbatim: 'half a metre after every three bays',
  gapM: new Decimal('0.5'),
};

/** The old sentence, word for word: no run may print it now. */
const FALSE_CHARGE = /charges Table B\.11's 300 mm clearance per bay/;

describe('the columns note follows the run', () => {
  it('on a plain run, says the 300 mm is charged nowhere, and never that it is charged', () => {
    const [columns] = notes();
    expect(columns).not.toMatch(FALSE_CHARGE);
    expect(columns).toMatch(/^No column is drawn, and so no grid bubbles/);
    expect(columns).toMatch(/packed side by side at Table B\.11's 2\.50 m/);
    expect(columns).toMatch(/additional 300 mm .* is not charged anywhere/);
  });

  it('on the studio’s column-gap run, says the gap and that the 300 mm is not added — as the layout does', () => {
    const out = runPipeline(runInput(RECT_80x40, { columnGapStatement: GAP }));
    const [columns] = out.building.notModelled;
    expect(columns).not.toMatch(FALSE_CHARGE);
    expect(columns).toMatch(/0\.50 m is left clear after every 3 bays/);
    expect(columns).toMatch(/is not charged/);
    expect(columns).toMatch(/whether the 0\.50 m already includes it is NOT ASSESSED/);
    // The layout's own note on the same run says the same thing; the two no longer disagree.
    expect(out.levelPlan!.notAssessed.join(' ')).toMatch(/which is not added/);
  });

  it('on a stated structural grid, says every bay is charged the 300 mm, because it is', () => {
    const [columns] = notes({ levelPlan: { structuralGridM: new Decimal('8') } });
    expect(columns).toMatch(/On the stated 8\.00 m structural grid every bay is charged/);
    expect(columns).toMatch(/2\.80 m rather than 2\.50 m/);
  });
});

describe('the refuse room is either drawn or said not to be, never both', () => {
  it('on a run that draws a GARBAGE ROOM, does not also call the refuse room unassessed by rule', () => {
    const out = runPipeline(runInput(RECT_120x80));
    expect(out.building.groundRooms?.rooms.map((r) => r.name)).toContain('GARBAGE ROOM');
    const text = out.building.notModelled.join(' | ');
    expect(text).not.toMatch(/refuse room and escape distances/);
    expect(text).not.toMatch(/refuse room is not drawn/);
    // What it does say: drawn at a typical width, sized by the code, size not assessed.
    expect(text).toMatch(/garbage room and the water tank are sized by the Dubai Building Code/);
    expect(text).toMatch(/B\.8\.5\.2\.3/);
  });

  it('on a run whose ground floor does not park, says the refuse room is not drawn', () => {
    const out = runPipeline(
      runInput(RECT_80x40, {
        levelSchedule: { basements: 2, groundIsParking: false, podiumAboveGround: 0, podiumParkingLevels: 0 },
        parkingLevelsAvailable: 2,
      }),
    );
    expect(out.building.groundRooms).toBeUndefined();
    expect(out.building.notModelled.join(' | ')).toMatch(
      /The refuse room is not drawn on this run, and its size against DBC B\.8\.5\.2\.3 and Table B\.29 is NOT ASSESSED/,
    );
  });

  it('says the escape distances are declared, not that their rules await encoding', () => {
    const text = notes().join(' | ');
    expect(text).toMatch(/Escape distances and the pedestrian route .* NOT ASSESSED/);
    expect(text).toMatch(/Table 3\.6A\) are declared in the deferred-check list/);
    expect(text).not.toMatch(/until their rules are encoded/);
  });
});

describe('what was claimed and never computed', () => {
  it('says bicycle parking is not assessed, with the clause that asks for it', () => {
    expect(notes().join(' | ')).toMatch(
      /Bicycle parking — NOT ASSESSED\. DBC B\.7\.2\.7 asks for bicycle parking equal to a twentieth of the car parking requirement/,
    );
  });

  it('states Table B.4’s parking clear height against the storey, as a budget and not a pass', () => {
    const text = notes().join(' | ');
    expect(text).toMatch(/Each is drawn 3\.20 m floor to floor, a placeholder storey height that no instrument prints/);
    expect(text).toMatch(/DBC Table B\.4 asks 2\.30 m clear for light-vehicle parking/);
    expect(text).toMatch(/leaves 0\.90 m for the slab, beams and services, .* NOT ASSESSED/);
  });
});
