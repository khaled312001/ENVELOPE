/**
 * The strips no module reached, filled by Table B.11's own bays (17 Oct 2026).
 *
 * The defects, as a reader met them: a strip past the last module too shallow
 * for a 5.5 m row plus its aisle was "reported rather than quietly filled" even
 * where a 5.0 m bay under Table B.11 note * or a 6 × 2.5 m parallel bay stood in
 * it; and the note itself — every perpendicular bay 5 × 2.5 m on a plot under
 * 30 m long, up to 10% of them on a longer one — was not applied anywhere,
 * although the client's own drawings for plot 6468096 use it on 56 of 630 bays.
 */
import { asMm, Decimal, ProvenanceGraph, Tracer } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { pt, RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import {
  countBays,
  isParallelRow,
  isReducedRow,
  layoutParkingLevel,
  RectKind,
  REDUCED_BAY_SHARE,
  reducedBayAllowance,
  ReducedBayMode,
  residualBayServedBy,
  runPipeline,
  type ParkingLayoutResult,
  type ReducedBayAllowance,
} from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

const side = (m: number) => ({ lengthMm: asMm(Math.round(m * 1000)) });

function level(widthM: number, depthM: number, allowance?: (t: Tracer) => ReducedBayAllowance | undefined): ParkingLayoutResult {
  const tracer = new Tracer(new ProvenanceGraph());
  const reducedBays = allowance?.(tracer);
  return layoutParkingLevel({
    tracer,
    footprint: { widthM: new Decimal(widthM), depthM: new Decimal(depthM) },
    deductions: { areaM2: new Decimal(0), source: 'ASSUMED', basis: 'a test level with nothing reserved on it' },
    includeRamp: false,
    // The modules, stated: the ring packs more here and would leave no strip past a last row.
    arrangement: { id: 'WIDTH' },
    ...(reducedBays ? { reducedBays } : {}),
  });
}

/** Every bay the fill added is open, on its open side, onto an aisle the layout drew. */
function everyResidualBayServed(r: ParkingLayoutResult): void {
  const aisles = r.rects.filter((x) => x.kind === RectKind.AISLE);
  for (const bay of r.rects.filter((x) => x.kind === RectKind.BAY && (isReducedRow(x.row) || isParallelRow(x.row) || x.row === -31))) {
    expect(aisles.some((a) => residualBayServedBy(bay, a)), `bay at ${bay.x.toString()}, ${bay.y.toString()}`).toBe(true);
  }
}

/*
  40 × 45.2 m: two 17 m modules leave 11.2 m. Too shallow for a 5.5 m row and
  its 6 m aisle (11.5 m), deep enough for a 5.0 m one (11 m).
*/
const W = 40;
const D = 45.2;

describe('a strip 5.0–5.49 m deep past an aisle', () => {
  it('takes 5 × 2.5 m bays under note * b), at most one for every nine full-size bays', () => {
    const without = level(W, D);
    const withNote = level(W, D, (t) => reducedBayAllowance(t, [side(40), side(45.2), side(40), side(45.2)], {}));
    const { fullSize, reduced } = countBays(withNote.rects);
    expect(withNote.residual.allowance?.mode).toBe(ReducedBayMode.TEN_PERCENT);
    expect(reduced).toBeGreaterThan(0);
    expect(reduced).toBe(withNote.residual.reducedBays.value);
    // 10% of the perpendicular bays, short ones included: r ≤ (f + r) / 10 ⇔ r ≤ f / 9.
    expect(reduced).toBeLessThanOrEqual(Math.floor(fullSize / 9));
    expect(withNote.residual.reducedCap).toBe(Math.floor(fullSize / 9));
    expect(withNote.bayCount.value).toBeGreaterThan(without.bayCount.value);
    // Each is 5 m long, never 5.5.
    for (const b of withNote.rects.filter((x) => x.kind === RectKind.BAY && isReducedRow(x.row))) {
      expect(Decimal.max(b.width, b.height).toString()).toBe('5');
    }
    everyResidualBayServed(withNote);
    expect(withNote.notes.join('\n')).toMatch(/bay\(s\) are 5 × 2\.5 m under Table B\.11 note \*, where a 5\.5 m bay does not fit: at most \d+ on this level, 10% of its perpendicular bays\./);
  });

  it('takes none where no plot reached the layout: no length, no note', () => {
    const r = level(W, D);
    expect(r.residual.reducedBays.value).toBe(0);
    expect(r.residual.allowance).toBeUndefined();
    expect(countBays(r.rects).reduced).toBe(0);
  });

  it('is uncapped under note * a), on a plot under 30 m long, and says the 16 m module is not tried', () => {
    const r = level(W, D, (t) => reducedBayAllowance(t, [side(29), side(29), side(29), side(29)], {}));
    expect(r.residual.allowance?.mode).toBe(ReducedBayMode.ALL);
    expect(r.residual.reducedCap).toBeNull();
    expect(r.residual.reducedBays.value).toBeGreaterThan(0);
    expect(r.notes.join('\n')).toContain('Under Table B.11 note * a) every perpendicular bay on this plot may be 5 × 2.5 m.');
  });

  it('lays an aisle along the last row to reach it, and says so', () => {
    const r = level(W, D, (t) => reducedBayAllowance(t, [side(40), side(45.2)], {}));
    expect(r.notes.join('\n')).toMatch(/^The 11\.20 m strip past the last bay row is too shallow for a single-loaded row, so a 6 m aisle runs along that row to reach it\.$/m);
    expect(r.rects.some((x) => x.kind === RectKind.AISLE && x.row === -30)).toBe(true);
  });
});

describe('plot length, as note * is read', () => {
  it('is the longest side, ASSUMED, with the bounding rectangle’s depth as the other reading', () => {
    const tracer = new Tracer(new ProvenanceGraph());
    // Warsan 6211383: 50.85 m along its road, 26.85 m deep.
    const a = reducedBayAllowance(tracer, [side(50.85), side(26.85), side(50.85), side(26.85)], {
      mbrWidthMm: asMm(50_850),
      mbrDepthMm: asMm(26_850),
    })!;
    expect(a.plotLengthM.value.toString()).toBe('50.85');
    expect(a.plotLengthM.provenanceClass).toBe('ASSUMED');
    // Computed from the cited note and the assumed length: amber until answered.
    expect(a.allowance.provenanceClass).toBe('ASSUMED');
    expect(a.mode).toBe(ReducedBayMode.TEN_PERCENT);
    expect(a.alternative).toEqual({ lengthM: new Decimal('26.85'), mode: ReducedBayMode.ALL });
  });

  it('is not read at all off a plot with no sides: a length of zero would allow every bay', () => {
    expect(reducedBayAllowance(new Tracer(new ProvenanceGraph()), [], {})).toBeUndefined();
  });
});

describe('the residual strips on whole runs', () => {
  const PODIUM = {
    statementId: 'STMT-PODIUM-SETBACK-2026-10-16',
    statedBy: 'Eng. Mohamed',
    statedOn: '2026-10-16',
    verbatim: 'the podium stands on the boundary',
  };
  // Plot 6468096's survey ring, with its 5 m chamfer, and the reference drawings' 3B + 5P parking.
  const R6468096 = runInput([pt(3.6, 0), pt(83.45, 0), pt(87.25, 4.49), pt(87.25, 50.98), pt(0, 50.98), pt(0, 3.6)], {
    podiumAtBoundaryStatement: PODIUM,
    levelSchedule: { basements: 3, groundIsParking: false, podiumAboveGround: 5, podiumParkingLevels: 5 },
  });

  it('keeps the building’s 5 m bays within note *’s 10%, and counts them as the drawings draw them', () => {
    const out = runPipeline(R6468096);
    const totals = out.parkingResidual!;
    expect(totals.reducedShare.value.lte(REDUCED_BAY_SHARE)).toBe(true);
    const drawn = out.building.levels
      .filter((l) => l.parking)
      .reduce((n, l) => n + Number(l.parking!.bayCount.value), 0);
    expect(drawn).toBe(out.parking.providedBays.value);
    expect(out.levelPlan!.layout.residual.allowance?.plotLengthM.value.toString()).toBe('87.25');
  });

  it('holds the 5 m bays off the level the street reaches, whose count changes after the layout', () => {
    // 53.2 m deep: the 15% the run reserves at the edge leaves 45.22 m to pack, and 11.22 m past two modules.
    const deep = 53.2;
    const out = runPipeline(
      runInput([pt(0, 0), pt(W, 0), pt(W, deep), pt(0, deep)], {
        podiumAtBoundaryStatement: PODIUM,
        levelSchedule: { basements: 2, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 0 },
        levelPlan: { arrangement: 'WIDTH', avoidCore: false, includeRamp: false },
      }),
    );
    const plan = out.levelPlan!;
    const shared = countBays(plan.layout.rects);
    expect(shared.reduced).toBeGreaterThan(0);
    const street = plan.accessible?.rects ?? plan.grade?.rects;
    expect(street).toBeDefined();
    expect(countBays(street!).reduced).toBe(0);
    expect(plan.notAssessed).toContain(
      `${shared.reduced} bay(s) of 5 m are not used on the level the street reaches: its drive, plant band and ` +
        'accessible bays change its count after the layout, and keeping the short bays off it holds the ' +
        'building within the 10% of Table B.11 note *.',
    );
    const levels = out.parking.levelsAvailable.value;
    expect(out.parkingResidual!.reducedBays.value).toBe(shared.reduced * (levels - 1));
    expect(out.parkingResidual!.reducedShare.value.lte(REDUCED_BAY_SHARE)).toBe(true);
  });

  it('places parallel bays on the worked rectangle’s ring, each with its long side on an aisle', () => {
    const out = runPipeline(
      runInput(RECT_80x40, { levelSchedule: { basements: 1, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 0 } }),
    );
    const plan = out.levelPlan!;
    expect(plan.layout.residual.parallelBays.value).toBeGreaterThan(0);
    const parallel = plan.layout.rects.filter((r) => r.kind === RectKind.BAY && isParallelRow(r.row));
    expect(parallel).toHaveLength(plan.layout.residual.parallelBays.value);
    for (const b of parallel) {
      expect(Decimal.max(b.width, b.height).toString()).toBe('6');
      expect(Decimal.min(b.width, b.height).toString()).toBe('2.5');
    }
    everyResidualBayServed(plan.layout);
    // Both levels draw them, the street level among them.
    expect(out.parkingResidual!.parallelBays.value).toBe(2 * plan.layout.residual.parallelBays.value);
    // And the model says which they are, so a sheet numbers them inside the bay rather than guessing from a length.
    const flagged = out.building.levels.flatMap((l) => l.parking?.bays ?? []).filter((b) => b.parallel);
    expect(flagged).toHaveLength(out.parkingResidual!.parallelBays.value);
  });
});

describe('the car park’s gross area per bay', () => {
  const INPUT = runInput(RECT_80x40, {
    levelSchedule: { basements: 1, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 0 },
  });

  it('is every parking level’s whole footprint over the bays provided, beside the one-level figure', () => {
    const out = runPipeline(INPUT);
    const eff = out.parkingEfficiency!;
    const levels = out.parking.levelsAvailable.value;
    const gross = out.envelope.podiumFootprint.value.times(levels);
    expect(eff.grossAreaM2.value.toString()).toBe(gross.toDecimalPlaces(2).toString());
    expect(eff.grossAreaPerBayM2!.value.toString()).toBe(gross.div(out.parking.providedBays.value).toDecimalPlaces(2).toString());
    // Not the one-level figure, which divides only the packed region of one level.
    expect(eff.grossAreaPerBayM2!.value.eq(out.levelPlan!.areaPerBayM2.value)).toBe(false);
    expect(eff.target).toBeUndefined();
    expect(eff.notes).toContain('No car park efficiency target is stated for this run, and none is assumed.');
  });

  it('is compared with a target only when the run attaches one, entered under its actor', () => {
    const out = runPipeline({
      ...INPUT,
      parkingEfficiencyTarget: { m2PerBay: new Decimal('37.5'), clauseReference: 'item 5', verbatim: 'a target' },
    });
    const eff = out.parkingEfficiency!;
    expect(eff.target!.m2PerBay.provenanceClass).toBe('USER_SET');
    expect(eff.target!.gapM2.value.toString()).toBe(eff.grossAreaPerBayM2!.value.minus('37.5').toDecimalPlaces(2).toString());
    expect(eff.notes.join(' ')).toMatch(/^Car park: [\d.]+ m² over 2 parking level\(s\).* Against the attached standard's target of 37\.5 m² per bay/);
  });
});
