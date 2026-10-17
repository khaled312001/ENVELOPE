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

  it('says a one-level answer drawn as the ground floor alone', () => {
    const ar = said(
      'The answer places 1 level of floor area, drawn as the ground floor. ' +
        'The 12 above them are what the height ceiling permits and this answer does not use.',
    );
    expect(ar).toContain('يرسم منها الدور الأرضي.');
    expect(ar).toContain('و12 أخرى');
    expect(ar).not.toMatch(noEnglish);
  });

  it('says the accessible bays the slope kept off, with both figures', () => {
    const ar = said(
      'None of the 2 accessible bays Table C.17 asks for is placed: the ground floor is the sloped ring, whose floor ' +
        'falls 2.68%, and DBC B.7.2.3.1 limits accessible parking to 2%. Every parking level shares that layout, so no ' +
        'level is flatter. The arrangement was not changed to make room for them; the reader may pick one with a flat floor.',
    );
    expect(ar).toContain('2.68%');
    expect(ar).toContain('ويمكنك اختيار توزيع بأرضية مستوية');
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

/*
  DBC B.4.2.2 (17 Oct 2026): the height ceiling is the stated floors × 6 m. With
  no floor count the 45 m placeholder is ASSUMED and says why; with no
  placeholder either, the run is refused. Each sentence is the engine's own.
*/
describe('the height, when no floor count is stated', () => {
  const REFUSED =
    'no floor count is stated for this plot, so no height can be computed. DBC B.4.2.2 ¶1: building heights follow ' +
    'the affection plan or DCR, and ¶6 sets the ceiling at the floors they allow × 6 m. The engine does not substitute ' +
    'a height. Add the plot’s affection plan, or a floor count from its DCR.';
  const BASIS =
    'no floor count is stated for this plot, and DBC B.4.2.2 ¶1 leaves height to the affection plan or DCR. 45 m is a ' +
    'placeholder (R-HEIGHT-MAX-RES) so a study can run before the sheet is to hand; no instrument prints it. With the ' +
    'sheet’s floor count, the ceiling is that count × 6 m (B.4.2.2 ¶6).';
  const FORMULA = 'stated floor count 11 × 6 m per floor (DBC B.4.2.2 ¶6, ground floor counted)';

  it('says the refusal in Arabic, naming what is needed', () => {
    const ar = engineNote(REFUSED, 'ar') ?? '';
    expect(ar).toContain('مخطط أفكشن');
    expect(ar).toContain('B.4.2.2');
    expect(ar).not.toMatch(/[A-Za-z]{4,} [A-Za-z]{4,}/);
  });

  it('says the placeholder’s basis in Arabic, with its figure', () => {
    const ar = engineNote(BASIS, 'ar') ?? '';
    expect(ar).toContain('45 م قيمة مؤقتة');
    expect(engineNote(BASIS, 'en')).toMatch(/^No floor count is stated/);
  });

  it('says the B.4.2.2 ¶6 derivation with both figures', () => {
    expect(engineNote(FORMULA, 'ar')).toBe('11 دور محدد × 6 م للدور (كود دبي B.4.2.2، مع احتساب الدور الأرضي)');
  });
});

/*
  The ramps from the street (17 Oct 2026). Every sentence below is the engine's
  own, copied from a run; the Arabic must keep the figures that make a refusal
  arguable, and no English clause may survive into it.
*/
describe('the ramps from the street, and the entrance near a corner', () => {
  const english = /[A-Za-z]{4,} [A-Za-z]{4,} [A-Za-z]{4,}/;
  const NOT_PLACED =
    'The ramps from the street are not placed: neither placement fits. Straight in from the entrance on boundary 0, ' +
    'the ramp down to B1 ends where no drive aisle on B1 lies straight ahead of it 6.00 m wide, so a car leaving it ' +
    'has nowhere to go. Along boundary 0 from the entrance, the ramp down to B1 ends where no drive aisle on B1 lies ' +
    'straight ahead of it 6.00 m wide, so a car leaving it has nowhere to go. The bays they would take on the levels ' +
    'they reach are still counted.';
  const PLACED =
    "The ramps from the street stand on the ground floor, straight in from the entrance, and take 437.65 m² of it; how that bears on the ground floor's floor area is NOT ASSESSED. They are straight: a curved ramp from the street is not placed, and the gate level above the road (B.4.2.1) is not added to their climb.";
  const SHORT =
    'Straight in from the entrance on boundary 0, the two ramps, down to B1 and up to P1 side by side, need 6.00 m of ' +
    'straight approach (B.7.2.3.3 ¶4) and 30.27 m of ramp (Tables B.9 and B.10), 36.27 m in from the boundary, and the ' +
    'ground floor is 34.40 m deep there.';
  const CORE =
    "The drive from the entrance on boundary 0 runs through the core before it reaches a drive aisle. Where the core stands is assumed: centred on the tower plate, in the plate's own proportions. An opening on boundary 0 centred between 3.00 m and 32.00 m from P0, or between 48.00 m and 77.00 m from P0 would clear it. Place the entrance elsewhere on the boundary.";
  const JUNCTION =
    'The vehicle entrance on boundary 0 (P0 → P1) is centred 70.00 m from P0. A 6 m opening on this boundary must be ' +
    'centred between 3.00 m and 62.00 m from P0: B.7.2.1 keeps it 15 m clear of the junction at P1, measured from the ' +
    'plot corner. P1 is read as a junction because boundary 1 beyond it is a road too. Whether a corner where two ' +
    'roads meet with no chamfer is a junction under B.7.2.1 is a question put to the client; until it is answered, ' +
    'this reading stands.';

  it('says why neither placement fits, each with its figure', () => {
    const ar = engineNote(NOT_PLACED, 'ar') ?? '';
    expect(ar).toContain('لم توضع منحدرات الشارع');
    expect(ar.match(/6\.00 m/g)).toHaveLength(2);
    expect(ar).not.toMatch(english);
  });

  it('says where they stand and what of the ground floor they take', () => {
    const ar = engineNote(PLACED, 'ar') ?? '';
    expect(ar).toContain('437.65 m²');
    expect(ar).toContain('مستقيمة من المدخل');
    expect(ar).not.toMatch(english);
  });

  it('keeps every figure of a placement too long for the ground floor', () => {
    const ar = engineNote(SHORT, 'ar') ?? '';
    for (const f of ['6.00 m', '30.27 m', '36.27 m', '34.40 m']) expect(ar).toContain(f);
    expect(ar).not.toMatch(english);
  });

  it('names the core, its assumed position and the clear range when a drive runs into it', () => {
    const ar = engineNote(CORE, 'ar') ?? '';
    expect(ar).toContain('النواة');
    expect(ar).toContain('في وسط مسطح البرج');
    expect(ar).toContain('بين 3.00 m و32.00 m من P0');
    expect(ar).not.toMatch(english);
  });

  it('carries the junction reading, and that it is the client’s question, into both languages', () => {
    expect(engineNote(JUNCTION, 'en')).toMatch(/question for the client/);
    const ar = engineNote(JUNCTION, 'ar') ?? '';
    expect(ar).toContain('سؤال موجه للعميل');
    expect(ar).toContain('P1');
  });
});
