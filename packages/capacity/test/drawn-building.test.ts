/**
 * THE REPORTED BUILDING IS THE DRAWN BUILDING. 17 Oct 2026.
 *
 * Band B was `tower plate × every storey under the height ceiling`, the ground
 * floor and the podium parking among them, and the governing GFA kept the part
 * floor above the last whole level. So on 3B+G+5P the run reported 17,920 m²
 * and 185 units while the levels the sheets, the DXF and the 3D view drew held
 * 11,520 m²; 6,400 m² stood on no drawn level and the units were sold out of it.
 * The cover said 25.6 m high over a section that topped out at 38.4 m.
 *
 * Every assertion here is on the real pipeline, and most are the same identity
 * asked of many runs: the levels the model places, counted at what the run says
 * one level holds, sum to the capacity the run reports.
 */

import { Decimal, type StatedLimits, type Citation } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { rulesFromInstrument } from '@envelope/rules';
import { beforeAll, describe, expect, it } from 'vitest';

import { RECT_80x40, RECT_120x80, SKEWED, runInput } from '../../../test-support/pipeline.js';
import {
  apportionUnits,
  buildAssumptionRegister,
  GfaRowKind,
  ParkingArrangement,
  RunBlockedError,
  runPipeline,
  SLOPED_RING_STOPS_AT_GROUND,
  type RunInput,
  type RunOutput,
} from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

const A_104 = { basements: 3, groundIsParking: false, podiumAboveGround: 5, podiumParkingLevels: 5 } as const;
const PARKED_G_5P = { basements: 3, groundIsParking: true, podiumAboveGround: 5, podiumParkingLevels: 5 } as const;

function citation(clause: string, verbatim: string): Citation {
  return {
    instrumentId: 'AFFECTION_PLAN',
    instrumentVersion: '01-01-2026',
    clauseReference: clause,
    documentUri: 'test-sheet.pdf',
    sourcePage: 1,
    sourceBbox: [10, 20, 90, 30],
    sourceTextVerbatim: verbatim,
  };
}

/** A sheet that prints a FAR and a height code, bound to the shared fixture's plot. */
function sheet(far: string, height: { typicalFloors: number; podiumLevels: number; raw: string }): RunInput['rules'] {
  const limits: StatedLimits = {
    far: { value: new Decimal(far), citation: citation('far', `FAR = ${far}`) },
    height: {
      value: { ...height, totalLevels: 1 + height.podiumLevels + height.typicalFloors },
      citation: citation('height', height.raw),
    },
  };
  const binding = { plotNumber: '345-1234', instrumentId: 'TEST@01-01-2026', issuedOn: '2026-01-01', authoredBy: 'test' };
  return [...runInput(RECT_80x40).rules, ...rulesFromInstrument(limits, binding).rules];
}

const isParking = (use: string): boolean => use === 'BASEMENT_PARKING' || use === 'PODIUM_PARKING';

/**
 * The levels the model places as floor area, each at its own plate — the tower
 * plate, or the part floor's area on the one level that carries it. What the
 * drawings hold, read off the model rather than off the capacity.
 */
const drawnGfa = (out: RunOutput): Decimal =>
  out.building.levels
    .filter((l) => l.placed && !isParking(l.use))
    .reduce(
      (s, l) => s.plus(l.partFloor ? new Decimal(l.partFloor.areaM2.value) : out.envelope.towerPlateCap.value),
      new Decimal(0),
    );

/** The top of the highest placed level, from grade, in metres — the section's top datum. */
const drawnTopM = (out: RunOutput): Decimal =>
  new Decimal(
    out.building.levels
      .filter((l) => l.placed && l.elevationMm >= 0)
      .reduce((t, l) => Math.max(t, l.elevationMm + l.heightMm), 0),
  ).div(1000);

const gfaPerUnit = (out: RunOutput): Decimal =>
  new Decimal(out.graph.toJSON().nodes.find((n) => n.parameterId === 'capacity.gfa_per_unit_m2')!.value!);

describe('band B counts the storeys that hold floor area', () => {
  it('on G+1P+16 with the ground floor and P1 parking, band B is sixteen plates', () => {
    const out = runPipeline(
      runInput(RECT_80x40, {
        rules: sheet('6', { typicalFloors: 16, podiumLevels: 1, raw: 'G+1P+16' }),
        levelSchedule: { basements: 2, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 1 },
      }),
    );
    expect(out.envelope.maxLevelsByHeight.value).toBe(18);
    expect(out.floorAreaLevels.value).toBe(16);
    expect(out.capacity.geometryLimitedGfa.value.toString()).toBe(
      out.envelope.towerPlateCap.value.times(16).toString(),
    );
  });

  it('says counting podium parking against the plan’s count is a reading still open, and stays amber for it', () => {
    const out = runPipeline(
      runInput(RECT_80x40, {
        rules: sheet('6', { typicalFloors: 16, podiumLevels: 1, raw: 'G+1P+16' }),
        levelSchedule: { basements: 2, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 1 },
      }),
    );
    expect(out.capacity.geometryLimitedGfa.provenanceClass).toBe('ASSUMED');
    const register = buildAssumptionRegister(
      runInput(RECT_80x40, {
        rules: sheet('6', { typicalFloors: 16, podiumLevels: 1, raw: 'G+1P+16' }),
        levelSchedule: { basements: 2, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 1 },
      }),
      out,
    );
    const row = register.find((r) => r.parameterId === 'capacity.parking_in_stated_level_count');
    expect(row).toBeDefined();
    expect(row!.basis).toContain('Q27');
  });

  it('on 3B + parked G + 5P under a 14-storey ceiling, eight storeys hold floor area, not fourteen', () => {
    const out = runPipeline(runInput(RECT_80x40, { levelSchedule: PARKED_G_5P }));
    expect(out.floorAreaLevels.value).toBe(14 - 6);
    expect(out.capacity.geometryLimitedGfa.value.toString()).toBe(
      out.envelope.towerPlateCap.value.times(8).toString(),
    );
  });

  /*
    Review leftover (a): with no floor count stated, the 45 m ceiling is a
    placeholder, ASSUMED. Band B used to say DERIVED anyway, citing it.
  */
  it('takes the class of an assumed height ceiling rather than claiming DERIVED', () => {
    const out = runPipeline(runInput(RECT_80x40));
    expect(out.envelope.heightCeilingM.provenanceClass).toBe('ASSUMED');
    expect(out.capacity.geometryLimitedGfa.provenanceClass).toBe('ASSUMED');
    expect(out.graph.hasKindBelow(out.capacity.geometryLimitedGfa.node, 'ASSUMPTION')).toBe(true);
  });
});

describe('the capacity is the levels the drawings place', () => {
  const RUNS: readonly [string, () => RunInput][] = [
    ['80 × 40, no schedule', () => runInput(RECT_80x40)],
    ['120 × 80, no schedule', () => runInput(RECT_120x80)],
    ['skewed, no schedule', () => runInput(SKEWED)],
    ['A-104: 3B, shops on G, 5P parking', () => runInput(RECT_80x40, { levelSchedule: A_104 })],
    ['3B + parked G + 5P', () => runInput(RECT_80x40, { levelSchedule: PARKED_G_5P })],
    ['parking counts toward FAR', () => runInput(RECT_80x40, { parkingInFar: 'COUNTS_TOWARD_FAR' })],
    [
      'G+1P+16, sheet-bound',
      () =>
        runInput(RECT_80x40, {
          rules: sheet('6', { typicalFloors: 16, podiumLevels: 1, raw: 'G+1P+16' }),
          levelSchedule: { basements: 2, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 1 },
        }),
    ],
  ];

  for (const [name, make] of RUNS) {
    describe(name, () => {
      let out: RunOutput;
      beforeAll(() => {
        out = runPipeline(make());
      });

      it('governing GFA = the placed levels of floor area, each at its own plate', () => {
        expect(out.capacity.governingGfa.value.toString()).toBe(drawnGfa(out).toString());
      });

      it('governing GFA = min(A, B, C) exactly, unless a part floor was dropped and said', () => {
        const min = Decimal.min(
          out.capacity.regulationLimitedGfa.value,
          out.capacity.geometryLimitedGfa.value,
          out.capacity.parkingLimitedGfa.value,
        );
        if (out.partFloor?.kind === 'DROPPED') {
          expect(out.building.notModelled).toContain(out.partFloor.reason);
          expect(out.capacity.governingGfa.value.plus(out.partFloor.remainderM2).toString()).toBe(min.toString());
        } else {
          expect(out.capacity.governingGfa.value.toString()).toBe(min.toString());
        }
      });

      it('the level schedule the engine emits sums to the GFA the area table states', () => {
        const counted = out.levelAreas
          .filter((l) => l.countedInGfa)
          .reduce((s, l) => s.plus(l.gfaM2!.value), new Decimal(0));
        expect(counted.minus(out.gfaStatement.proposedGfaM2.value).abs().lte('0.01')).toBe(true);
      });

      it('sells no unit out of GFA that stands on no drawn level', () => {
        expect(gfaPerUnit(out).times(out.governingUnitCount.value).lte(drawnGfa(out))).toBe(true);
        expect(out.gfaStatement.rows.some((r) => r.kind === GfaRowKind.UNPLACED)).toBe(false);
        const answer = out.building.placements.find((p) => p.subject === 'answer')!;
        expect(answer.statement).not.toContain('not fit under the height ceiling');
      });

      it('reports the height of the top of the highest placed level, the parking under it included', () => {
        expect(out.capacity.achievedHeightM.value.toString()).toBe(drawnTopM(out).toString());
        expect(out.capacity.achievedHeightM.value.lte(out.envelope.heightCeilingM.value)).toBe(true);
        expect(out.levelsAboveGround.value.times(out.envelope.floorToFloorM.value).toString()).toBe(
          out.capacity.achievedHeightM.value.toString(),
        );
      });

      it('loses no part floor it draws, and reports one it drops, never more than a plate', () => {
        expect(out.capacity.integerGranularityLossM2.lt(out.envelope.towerPlateCap.value)).toBe(true);
        expect(out.gfaStatement.partFloorNotPlacedM2.toString()).toBe(
          out.capacity.integerGranularityLossM2.toString(),
        );
        if (out.partFloor?.kind !== 'DROPPED') expect(out.capacity.integerGranularityLossM2.isZero()).toBe(true);
      });
    });
  }

  it('on G+3P+8 with every podium level parked and eight placed, the height is the top of L11: 38.4 m', () => {
    const out = runPipeline(
      runInput(RECT_80x40, {
        rules: sheet('6', { typicalFloors: 8, podiumLevels: 3, raw: 'G+3P+8' }),
        levelSchedule: { basements: 1, groundIsParking: true, podiumAboveGround: 3, podiumParkingLevels: 3 },
      }),
    );
    expect(out.capacity.levels.value).toBe(8);
    const top = out.building.levels.filter((l) => l.placed).at(-1)!;
    expect(top.id).toBe('L11');
    expect(out.capacity.achievedHeightM.value.toFixed(1)).toBe('38.4');
    // The massing's figure is the envelope the ceiling permits, and says so.
    const massingNote = out.graph.toJSON().nodes.find(
      (n) => n.kind === 'COMPUTATION' && n.detail?.['note'] && String(n.detail['note']).startsWith('The height of the envelope'),
    );
    expect(massingNote).toBeDefined();
  });
});

describe('a podium taller than the ceiling', () => {
  it('is refused in a sentence naming both figures, not clamped', () => {
    let error: unknown;
    try {
      runPipeline(
        runInput(RECT_80x40, {
          levelSchedule: { basements: 1, groundIsParking: true, podiumAboveGround: 15, podiumParkingLevels: 15 },
        }),
      );
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(RunBlockedError);
    expect((error as RunBlockedError).gate).toBe('G2:level-schedule');
    expect((error as Error).message).toContain('stands 16 level(s) on the podium footprint');
    expect((error as Error).message).toContain('allows 14 level(s) above ground');
  });
});

describe('demand at the governing capacity, by type', () => {
  it('apportions units by the largest remainder, summing to the total', () => {
    const shares = ['0.5', '0.375', '0.125'].map((s) => ({ share: new Decimal(s) }));
    const counts = apportionUnits(shares, 87);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(87);
    expect(counts).toEqual([43, 33, 11]);
  });

  it('reads Table B.13 on the whole-unit schedule: one bay a unit for a one- and two-bedroom mix', () => {
    const out = runPipeline(runInput(RECT_80x40));
    expect(out.parking.baysPerUnit.value.toString()).toBe('1');
    const schedule = out.unitSchedule.value;
    expect(schedule.reduce((s, e) => s + e.count, 0)).toBe(out.governingUnitCount.value);
    expect(out.demandAtGoverningBays.value).toBe(out.governingUnitCount.value);
  });

  it('is Σ ratio × count where the types carry different ratios', () => {
    const MIX = [
      { typeId: '1BED', label: '1 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('70') },
      { typeId: '2BED', label: '2 bedroom', share: new Decimal('0.375'), nsaM2: new Decimal('110') },
      { typeId: '3BED', label: '3 bedroom', share: new Decimal('0.125'), nsaM2: new Decimal('150') },
    ];
    const out = runPipeline(runInput(RECT_80x40, { unitMix: { source: 'USER_SET', entries: MIX } }));
    const byType = out.unitSchedule.value;
    expect(byType.reduce((s, e) => s + e.count, 0)).toBe(out.governingUnitCount.value);
    const expected = byType.reduce((s, e) => s + (e.typeId === '3BED' ? 2 : 1) * e.count, 0);
    expect(out.demandAtGoverningBays.value).toBe(expected);
  });
});

describe('an assumed zero for visitors stays amber at the governing count', () => {
  /*
    Review fix. With no visitor rule the probe records zero visitor bays as
    ASSUMED; the demand at the governing count was computed off the resident
    bays alone and forced DERIVED, so the same zero arrived at the figure set
    against the supply as a cited value.
  */
  it('is ASSUMED where no visitor rule applies, DERIVED where one does', () => {
    const base = runInput(RECT_80x40);
    const ruled = runPipeline(base);
    expect(ruled.demandAtGoverningBays.provenanceClass).toBe('DERIVED');

    const out = runPipeline({
      ...base,
      rules: base.rules.filter((r) => r.parameterId !== 'parking.visitor_fraction'),
    });
    expect(out.parking.visitorBays.provenanceClass).toBe('ASSUMED');
    expect(out.demandAtGoverningBays.provenanceClass).toBe('ASSUMED');
    expect(out.graph.hasKindBelow(out.demandAtGoverningBays.node, 'ASSUMPTION')).toBe(true);
  });
});

describe('what the ground floor is, in the GFA statement and the notes', () => {
  it('says a stated shop floor does not park, and never calls it a parking level', () => {
    const out = runPipeline(runInput(RECT_80x40, { levelSchedule: A_104 }));
    const said = out.gfaStatement.reconciliation.join(' ');
    expect(said).toContain('The level schedule states the ground floor does not park.');
    expect(said).not.toContain('The ground floor is a parking level');
  });

  it('says a parked ground floor is a parking level', () => {
    const out = runPipeline(runInput(RECT_80x40, { levelSchedule: PARKED_G_5P }));
    expect(out.gfaStatement.reconciliation.join(' ')).toContain('The ground floor is a parking level');
  });

  it('says the sloped ring does not cross a ground floor that does not park', () => {
    const out = runPipeline(
      runInput(RECT_80x40, { levelSchedule: A_104, levelPlan: { arrangement: ParkingArrangement.SLOPED } }),
    );
    expect(out.levelPlan?.slopedFloor).toBeDefined();
    expect(out.building.notModelled).toContain(SLOPED_RING_STOPS_AT_GROUND);
    const parked = runPipeline(
      runInput(RECT_80x40, { levelSchedule: PARKED_G_5P, levelPlan: { arrangement: ParkingArrangement.SLOPED } }),
    );
    expect(parked.building.notModelled).not.toContain(SLOPED_RING_STOPS_AT_GROUND);
  });
});

describe('what else the run says about its own levels', () => {
  it('names the level count a Table B.1 row was read at', () => {
    const out = runPipeline(runInput(RECT_80x40));
    const neighbour = out.envelope.appliedSetbacks.find((s) => s.parameterId === 'setback.adjacent_plot')!;
    const formula = out.graph
      .outgoing(neighbour.traced.node)
      .map((e) => out.graph.node(e.to))
      .find((n) => n.kind === 'COMPUTATION')?.formula;
    expect(formula).toMatch(/read at \d+ level\(s\) above ground — the levels the permitted GFA needs/);
  });

  /*
    massing.tower_levels is USER_SET on a sheet-bound run, which the audit read
    as mislabelled ("it comes from the sheet"). It is not: it is the sheet's
    count less the podium the READER's schedule stands, and the weaker of the
    two is the reader's. Checked, and pinned, rather than changed.
  */
  it('gives the tower’s level count the class of what it is made of: the reader’s podium, or an assumed one', () => {
    const stated = runPipeline(
      runInput(RECT_80x40, {
        rules: sheet('6', { typicalFloors: 16, podiumLevels: 1, raw: 'G+1P+16' }),
        levelSchedule: { basements: 2, groundIsParking: true, podiumAboveGround: 1, podiumParkingLevels: 1 },
      }),
    );
    expect(stated.envelope.maxLevelsByHeight.provenanceClass).toBe('DERIVED');
    expect(stated.massing.towerLevels.provenanceClass).toBe('USER_SET');
    const unstated = runPipeline(runInput(RECT_80x40));
    expect(unstated.massing.towerLevels.provenanceClass).toBe('ASSUMED');
  });
});
