/**
 * Every note at every step in the page's language (Eng. Mohamed, 16 Oct 2026),
 * refusals included — and the fix a refusal's own sentence names, offered as a
 * button. The sentences below are the engine's own wording, copied from the
 * Mamzar run that was refused, so a change to that wording fails here first.
 */
import { describe, expect, it } from 'vitest';

import type { RunRequestBody } from '@web/api/client.js';

import { engineNote } from '../src/lib/engine-notes.js';
import { autoFixFor } from '../src/studio/auto-fix.js';

const MAMZAR =
  'this run may not be emitted: 2 finding(s) block it. INV-14 FAILED — Level count × level height budget is ' +
  'integer-consistent. Observed 57.6, expected ≤ 45. 18 level(s) × 3.2 m = 57.6 m against 45 m available; 14 ' +
  'level(s) would fit. Maximality is deliberately not asserted — see the comment on this check. | 1 hard ' +
  'constraint(s) violated (R-HEIGHT-MAX-RES). §16.1: a hard constraint is a feasibility filter — a violating ' +
  'configuration is never emitted. PRD §12.3 and §16.1 — a failed check blocks emission, never a warning and never ' +
  'a configurable severity.';

const THROTTLED =
  'this address has started 30 computations in the last minute, which is the limit here. Wait 43 seconds and try ' +
  'again — nothing you entered is lost.';

describe('the refusal, in the page’s language', () => {
  it('says the Mamzar refusal in Arabic, figure for figure', () => {
    const ar = engineNote(MAMZAR, 'ar');
    expect(ar).toContain('لا يمكن إصدار هذه الدراسة');
    expect(ar).toContain('INV-14');
    expect(ar).toContain('57.6');
    expect(ar).toContain('≤ 45');
    expect(ar).toContain('R-HEIGHT-MAX-RES');
    expect(ar).not.toMatch(/[A-Za-z]{4,} [A-Za-z]{4,} [A-Za-z]{4,}/);
  });

  it('says it briefly in English too', () => {
    expect(engineNote(MAMZAR, 'en')).toMatch(/^This study cannot be issued: 2 check\(s\) stop it\./);
  });

  it('says the rate limit in Arabic, with the wait the server named', () => {
    expect(engineNote(THROTTLED, 'ar')).toContain('43 ثانية');
  });

  it('leaves a sentence it does not know to the caller', () => {
    expect(engineNote('Something the engine has never said before.', 'ar')).toBeNull();
  });
});

describe('the notes, in the page’s language', () => {
  it('says each invariant by its statement', () => {
    expect(engineNote('Level count × level height budget is integer-consistent', 'ar')).toBe('الأدوار تتسع ضمن الارتفاع المتاح');
  });

  it('says the core reconciliation with its figures', () => {
    const t =
      'The core is 18.0% of the tower plate, and the saleable figure this run was given leaves 5.0% of the gross for ' +
      'everything that does not sell — the core, the corridors, the structure, the plant and the amenity. The core ' +
      'alone exceeds it, so the two figures cannot both be right. The engine has changed neither of them.';
    expect(engineNote(t, 'ar')).toBe('النواة 18.0% من المسطح، أكبر من 5.0% التي تتركها نسبة البيع لكل ما لا يباع. أحد الرقمين يحتاج مراجعة.');
  });

  it('says a frontage too short between junctions, at the corners the engine named', () => {
    const t = 'road frontage is 17.22 m. After 15 m of junction clearance at P3 and at P0 (B.7.2.1) only 0.00 m remains, which cannot hold a 6 m opening.';
    expect(engineNote(t, 'ar')).toContain('P3 وP0');
  });

  it('names nobody: the column gap is said without its source', () => {
    const t = '0.50 m is left clear after every 3 bays along a run, for the columns: 3 × 2.50 m + 0.50 m = 8.00 m to a group.';
    expect(engineNote(t, 'ar')).toBe('تترك 0.50 م بعد كل 3 مواقف لمواضع الأعمدة، فطول المجموعة 8.00 م.');
  });
});

const BODY = {
  plotId: 'p',
  vehicleAccess: { arrangement: 'TWO_WAY', entry: { edgeSeq: 2, centreOffsetM: '4.00' } },
} as unknown as RunRequestBody;

describe('the automatic fix, read off the refusal', () => {
  it('waits the seconds the server named and resends the same request', () => {
    expect(autoFixFor(THROTTLED, BODY)).toEqual({ kind: 'retry', waitS: 43, body: BODY });
  });

  it('moves an entrance to the nearest end of the range the refusal states', () => {
    const t =
      'The vehicle entrance on boundary 3 is centred 4.00 m from P2. A 6 m opening on this boundary must be centred ' +
      'between 18.00 m and 40.00 m from P2: B.7.2.1 keeps it 15 m clear of the junction at P2, measured from the plot corner.';
    const fix = autoFixFor(t, BODY);
    expect(fix?.kind).toBe('move-entrance');
    expect(fix?.body.vehicleAccess?.entry.centreOffsetM).toBe('18.00');
    expect(fix?.body.vehicleAccess?.entry.edgeSeq).toBe(2);
  });

  it('hands an entrance on a boundary that cannot take one back to the engine’s recommendation', () => {
    const fix = autoFixFor('The vehicle entrance was placed on boundary 2, which cannot take one: it shares a boundary with a neighbouring plot.', BODY);
    expect(fix?.kind).toBe('engine-entrance');
    expect(fix?.body.vehicleAccess).toBeUndefined();
  });

  it('offers nothing for a run its checks refused: no sentence there names a value that would pass', () => {
    expect(autoFixFor(MAMZAR, BODY)).toBeNull();
  });
});

/*
  The sentences a level schedule with a ground floor that does not park writes,
  and the accessible bays the 2% of B.7.2.3.1 keeps off the sloped ring. Copied
  from the engine's own output (packages/capacity/test/level-schedule-parking
  and accessible tests pin the English), so a change to either wording fails here.
*/
describe('which levels park, and accessible bays on a slope', () => {
  const said = (t: string): string => engineNote(t, 'ar') ?? '';
  const noEnglish = /[A-Za-z]{4,} [A-Za-z]{4,}/;

  it('says the parking placement above a ground floor that does not park', () => {
    const ar = said('Parking levels: 5 in the podium above a ground floor that does not park, 3 below grade.');
    expect(ar).toContain('فوق دور أرضي بلا مواقف');
    expect(ar).toContain('5');
    expect(ar).toContain('3');
  });

  it('says both street ramps are not modelled', () => {
    expect(said('The ramp from the street down to the first basement. Only ramps between two parking levels are modelled.')).toContain('البدروم الأول');
    const up = said(
      'The ramp from the street up to the first podium parking level (P1). The ground floor does not park, and only ramps between two parking levels are modelled.',
    );
    expect(up).toContain('P1');
    expect(up).not.toMatch(noEnglish);
  });

  it('says the substation is not placed on a ground floor that does not park', () => {
    const ar = said(
      'The substation and the LV room. The ground floor does not park, and the band against the road is cut only ' +
        'from a ground floor that does; where they stand on this one is NOT ASSESSED.',
    );
    expect(ar).toContain('غرفة المحول');
    expect(ar).not.toMatch(noEnglish);
  });

  it('says the answer drawn on the ground floor first', () => {
    const ar = said(
      'The answer places 9 levels of floor area, drawn as the ground floor and the lowest 8 above the podium parking. ' +
        'The 4 above them are what the height ceiling permits and this answer does not use.',
    );
    expect(ar).toContain('الدور الأرضي و8');
    expect(ar).toContain('و4 أخرى');
  });

  it('says the accessible bays the slope kept off, with both figures', () => {
    const ar = said(
      'None of the 2 accessible bays Table C.17 asks for is placed: the ground floor is the sloped ring, whose floor ' +
        'falls 2.68%, and DBC B.7.2.3.1 limits accessible parking to 2%. Every parking level shares that layout, so no ' +
        'level is flatter. The arrangement was not changed to make room for them; an arrangement with a flat floor would.',
    );
    expect(ar).toContain('2.68%');
    expect(ar).toContain('2%');
    expect(ar).toContain('الدور الأرضي');
    expect(ar).not.toMatch(noEnglish);
  });

  it('says a shortfall on the first podium parking level', () => {
    const ar = said(
      '1 of the 3 accessible bays Table C.17 asks for could not be placed on the first podium parking level: it has no ' +
        'further run of bays side by side to take one with its access aisle.',
    );
    expect(ar).toContain('أول دور مواقف في البوديوم');
  });
});

describe('a parking option the level cannot lay out', () => {
  const REFUSED =
    'the parking arrangement SLOPED is not one this level can be packed in: the ring may be the ramp only where there ' +
    'are two parking levels or more and no ramp strip was stated. This level offers WIDTH (40 bays), DEPTH (44 bays), PERIMETER (38 bays).';

  it('is said in Arabic with every option still on offer and its count', () => {
    const ar = engineNote(REFUSED, 'ar') ?? '';
    expect(ar).toContain('غير متاح في هذا الدور');
    expect(ar).toContain('44 موقفا');
    expect(ar).not.toMatch(/[A-Za-z]{3,}/);
  });

  it('offers to go back to the most bays, withdrawing the pick and nothing else', () => {
    const body = { ...BODY, parkingArrangement: 'SLOPED' } as RunRequestBody;
    const fix = autoFixFor(REFUSED, body);
    expect(fix?.kind).toBe('most-bays');
    expect(fix?.body.parkingArrangement).toBeUndefined();
    expect(fix?.body.vehicleAccess).toEqual(BODY.vehicleAccess);
  });
});
