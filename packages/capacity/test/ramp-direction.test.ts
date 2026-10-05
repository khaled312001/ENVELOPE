/**
 * Which way the ramp runs.
 *
 * Eng. Mohamed found this by driving the 3D view, 4 Oct 2026, 40:11–40:20:
 *
 *   *"العربية لو دخلت من هنا هتمشي وبعد كده الرامب هنا — شايفه؟ طلع لفوق. فهي غلط."*
 *
 * **These tests assert the SIGN, never its magnitude.** A test written as
 * `expect(Math.abs(delta)).toBe(1)` passes on the defect, and so does one that
 * only checks a basement ramp descends while saying nothing about a podium one —
 * a later change that flips both signs together would keep it green. So the
 * governing test here holds a basement-served ramp and a podium-served ramp in
 * **one** schedule and requires their deltas to be opposite: `−1 + 1 === 0`. That
 * cannot pass on a constant, whatever the constant is.
 *
 * The repo's own rule is the reason for the shape: *"a reachability check that
 * cannot fail is worth nothing"*. The same applies to a direction check.
 *
 * **These were made to fail before they were trusted.** `storeyDelta` was doctored
 * to return a constant `+1` — the defect exactly as it shipped — and six tests
 * failed, the opposite-signs one among them. It was then doctored to a constant
 * `−1`, the mirror-image defect somebody might introduce while "fixing" this, and
 * six failed again. Both polarities fail; only the derivation passes.
 */

import { Decimal, type LevelSchedule, ProvenanceGraph, Tracer } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import {
  ASSUMED_BASEMENTS,
  ASSUMED_BASEMENTS_BASIS,
  layoutParkingLevel,
  ParkingLayoutError,
  RAMP_TYPES,
  RampDirection,
  RampType,
  rampDirectionToStorey,
  rampTypeSpec,
  resolveRampRuns,
  storeyDelta,
  type ParkingLayoutResult,
  type RampRun,
} from '../src/layout.js';

const d = (v: string | number): Decimal => new Decimal(v);
const ACTOR = { id: 'u1', name: 'Mohamed Amin' } as const;

const schedule = (s: Partial<LevelSchedule> = {}): LevelSchedule => ({
  basements: 0,
  groundIsParking: true,
  podiumAboveGround: 0,
  podiumParkingLevels: 0,
  ...s,
});

function resolve(
  s: LevelSchedule,
  opts: { readonly actor?: typeof ACTOR; readonly graph?: ProvenanceGraph } = {},
): { readonly runs: readonly RampRun[]; readonly graph: ProvenanceGraph } {
  const graph = opts.graph ?? new ProvenanceGraph();
  const runs = resolveRampRuns({
    tracer: new Tracer(graph),
    schedule: s,
    ...(opts.actor ? { actor: opts.actor } : {}),
  });
  return { runs, graph };
}

function layout(
  extra: Partial<Parameters<typeof layoutParkingLevel>[0]> = {},
): ParkingLayoutResult {
  return layoutParkingLevel({
    tracer: new Tracer(new ProvenanceGraph()),
    footprint: { widthM: d('40'), depthM: d('51') },
    deductions: {
      areaM2: d(0),
      source: 'ASSUMED',
      basis: 'test fixture takes no deduction so the ramp itself is what is measured',
    },
    includeRamp: true,
    ...extra,
  });
}

const served = (runs: readonly RampRun[], storey: number): RampRun => {
  const found = runs.find((r) => r.servedStorey === storey);
  if (!found) throw new Error(`no ramp serves storey ${storey}; got ${runs.map((r) => r.servedStorey).join(', ')}`);
  return found;
};

// ---------------------------------------------------------------------------

describe('the sign', () => {
  /*
    THE TEST THAT FAILS ON THE DEFECT. Before this fix the engine emitted +1
    storey on every ramp in every scheme — `building.ts` took the lower of two
    consecutive parking levels as `from` and the upper as `to`, so the delta could
    not be negative, and nothing anywhere carried a direction at all.
  */
  it('descends to a basement', () => {
    const { runs } = resolve(schedule({ basements: 1 }), { actor: ACTOR });
    expect(runs).toHaveLength(1);
    expect(served(runs, -1).direction.value).toBe(RampDirection.DESCENDS);
    expect(served(runs, -1).storeyDelta).toBe(-1);
  });

  it('climbs to a podium parking level', () => {
    const { runs } = resolve(
      schedule({ groundIsParking: false, podiumAboveGround: 1, podiumParkingLevels: 1 }),
      { actor: ACTOR },
    );
    expect(runs).toHaveLength(1);
    expect(served(runs, 1).direction.value).toBe(RampDirection.CLIMBS);
    expect(served(runs, 1).storeyDelta).toBe(1);
  });

  /*
    THE GOVERNING ASSERTION. Both answers in one schedule, and required to be
    opposite rather than merely present. A future change that flips one sign and
    not the other fails here; a change that flips both — back to a constant of
    either polarity — also fails here, because the sum stops being zero.
  */
  it('gives a basement and a podium level OPPOSITE signs in the same scheme', () => {
    const { runs } = resolve(
      schedule({
        basements: 2,
        groundIsParking: false,
        podiumAboveGround: 3,
        podiumParkingLevels: 2,
      }),
      { actor: ACTOR },
    );
    expect(runs.map((r) => r.servedStorey)).toEqual([-2, -1, 1, 2]);

    const down = runs.filter((r) => r.direction.value === RampDirection.DESCENDS);
    const up = runs.filter((r) => r.direction.value === RampDirection.CLIMBS);
    expect(down.map((r) => r.servedStorey)).toEqual([-2, -1]);
    expect(up.map((r) => r.servedStorey)).toEqual([1, 2]);

    for (const r of down) expect(r.storeyDelta).toBe(-1);
    for (const r of up) expect(r.storeyDelta).toBe(1);

    // The one assertion a constant cannot satisfy, whichever constant it is.
    expect(down[0]!.storeyDelta + up[0]!.storeyDelta).toBe(0);
    expect(new Set(runs.map((r) => r.storeyDelta)).size).toBe(2);
  });

  it('is not satisfied by the magnitude, which the defect also satisfied', () => {
    // Stated as a test so the shape of the trap is on the record: every delta in
    // the scheme above has magnitude 1, and so did every delta before the fix.
    const { runs } = resolve(
      schedule({ basements: 1, groundIsParking: false, podiumAboveGround: 1, podiumParkingLevels: 1 }),
      { actor: ACTOR },
    );
    expect(runs.every((r) => Math.abs(r.storeyDelta) === 1)).toBe(true);
    expect(runs.map((r) => r.storeyDelta)).toEqual([-1, 1]);
  });

  it('reads the sign off the level, not off a constant', () => {
    for (const n of [-4, -3, -2, -1]) expect(rampDirectionToStorey(n)).toBe(RampDirection.DESCENDS);
    for (const n of [1, 2, 3, 4]) expect(rampDirectionToStorey(n)).toBe(RampDirection.CLIMBS);
    expect(storeyDelta(RampDirection.DESCENDS)).toBe(-1);
    expect(storeyDelta(RampDirection.CLIMBS)).toBe(1);
  });
});

describe('what a ramp serves', () => {
  it('reaches every parking level except the ground floor', () => {
    const { runs } = resolve(
      schedule({ basements: 3, groundIsParking: true, podiumAboveGround: 2, podiumParkingLevels: 2 }),
      { actor: ACTOR },
    );
    // 3 basements + ground + 2 podium = 6 parking levels; the ground floor is
    // reached by the driveway, so five ramps.
    expect(runs).toHaveLength(5);
    expect(runs.some((r) => r.servedStorey === 0)).toBe(false);
  });

  /*
    THE ENTRY RAMP EXISTS. `buildBuildingModel` makes one ramp per consecutive
    PAIR of parking levels, which leaves the ramp from the street to the first
    basement unmodelled — and says so in `notModelled`. That is the ramp he was
    looking at. Keyed on the level served, it is a ramp like any other and its
    `fromStorey` is grade.
  */
  it('starts the first ramp at grade, in both directions', () => {
    const below = resolve(schedule({ basements: 2 }), { actor: ACTOR }).runs;
    expect(served(below, -1).fromStorey).toBe(0);
    expect(served(below, -2).fromStorey).toBe(-1);

    const above = resolve(
      schedule({ groundIsParking: false, podiumAboveGround: 2, podiumParkingLevels: 2 }),
      { actor: ACTOR },
    ).runs;
    expect(served(above, 1).fromStorey).toBe(0);
    expect(served(above, 2).fromStorey).toBe(1);
  });

  it('puts no ramp on the level that carries the vehicle entrance', () => {
    expect(rampDirectionToStorey(0)).toBeNull();
    const { runs } = resolve(schedule({ groundIsParking: true }), { actor: ACTOR });
    expect(runs).toEqual([]);
  });
});

describe('where the sign comes from', () => {
  it('is USER_SET when a named person stated the schedule', () => {
    const { runs, graph } = resolve(schedule({ basements: 1 }), { actor: ACTOR });
    const dir = served(runs, -1).direction;
    expect(dir.provenanceClass).toBe('USER_SET');
    expect(graph.hasKindBelow(dir.node, 'USER')).toBe(true);
    expect(graph.hasKindBelow(dir.node, 'INPUT')).toBe(true);
  });

  it('is ASSUMED, with a basis, when nobody stated one', () => {
    const { runs, graph } = resolve(schedule({ basements: 1 }));
    const dir = served(runs, -1).direction;
    expect(dir.provenanceClass).toBe('ASSUMED');
    expect(graph.hasKindBelow(dir.node, 'ASSUMPTION')).toBe(true);
    expect(graph.hasKindBelow(dir.node, 'BASIS')).toBe(true);
  });

  /*
    NEVER `DERIVED`. No instrument states which way a ramp runs — B.7.2.2 governs
    gradient, transitions and headroom and is not encoded at all. Declaring this
    DERIVED would be the laundering CLAUDE.md names as the most consequential
    available here: a named person's answer dressed as a cited regulation.
  */
  it('never claims a citation it cannot reach', () => {
    for (const actor of [ACTOR, undefined]) {
      const { runs, graph } = resolve(schedule({ basements: 1, podiumAboveGround: 1, podiumParkingLevels: 1 }), {
        ...(actor ? { actor } : {}),
      });
      for (const r of runs) {
        expect(r.direction.provenanceClass).not.toBe('DERIVED');
        expect(graph.hasKindBelow(r.direction.node, 'RULE')).toBe(false);
        expect(graph.hasKindBelow(r.direction.node, 'SOURCE_CLAUSE')).toBe(false);
      }
    }
  });

  it('gives a stated podium count and an unstated basement count their own classes', () => {
    // One node per fact: a descending ramp exists because somebody said how many
    // basements there are, a climbing one because somebody said how many podium
    // levels hold parking. They are separate nodes so a run can carry both.
    const { runs, graph } = resolve(
      schedule({ basements: 1, groundIsParking: false, podiumAboveGround: 1, podiumParkingLevels: 1 }),
      { actor: ACTOR },
    );
    const ids = graph.nodes.filter((n) => n.kind === 'INPUT').map((n) => n.parameterId);
    expect(ids).toContain('parking.basement_levels');
    expect(ids).toContain('parking.podium_parking_levels');
    expect(new Set(runs.map((r) => r.direction.node)).size).toBe(2);
  });
});

describe('the basement default', () => {
  it('is zero, and it is an assumption with a basis rather than a silent number', () => {
    expect(ASSUMED_BASEMENTS).toBe(0);
    expect(ASSUMED_BASEMENTS_BASIS.length).toBeGreaterThan(80);
    // A practice statement names the practitioner and the date, or it is an
    // anonymous preference being reported as a fact.
    expect(ASSUMED_BASEMENTS_BASIS).toMatch(/Mohamed Amin/);
    expect(ASSUMED_BASEMENTS_BASIS).toMatch(/4 Oct 2026/);
    // And it says what it is not. `DERIVED` means a cited instrument; no
    // instrument says Dubai plots rarely have basements.
    expect(ASSUMED_BASEMENTS_BASIS).toMatch(/never becomes DERIVED/);
  });

  it('produces no descending ramp, which is the whole consequence of the zero', () => {
    const { runs } = resolve(
      schedule({ basements: ASSUMED_BASEMENTS, podiumAboveGround: 1, podiumParkingLevels: 1 }),
      { actor: ACTOR },
    );
    expect(runs.filter((r) => r.direction.value === RampDirection.DESCENDS)).toEqual([]);
    expect(runs.map((r) => r.storeyDelta)).toEqual([1]);
  });

  it('carries the basis into the graph when the count is the engine\'s and not a person\'s', () => {
    const { runs, graph } = resolve(schedule({ basements: 1 }));
    const tree = JSON.stringify(graph.derivationOf(served(runs, -1).direction.node));
    expect(tree).toContain('Mohamed Amin');
    expect(tree).toContain('"ASSUMPTION"');
  });
});

describe('refusals', () => {
  it('refuses a schedule that does not describe a building rather than rounding it', () => {
    expect(() => resolve(schedule({ basements: 1.5 }))).toThrow(ParkingLayoutError);
    expect(() => resolve(schedule({ basements: -1 }))).toThrow(/whole, non-negative/);
    expect(() => resolve(schedule({ podiumParkingLevels: 2.5, podiumAboveGround: 3 }))).toThrow(
      ParkingLayoutError,
    );
  });

  it('refuses a fractional storey index', () => {
    expect(() => rampDirectionToStorey(1.5)).toThrow(/whole number/);
    expect(() => rampDirectionToStorey(Number.NaN)).toThrow(ParkingLayoutError);
  });
});

// ---------------------------------------------------------------------------

describe('the layout carries the direction, or says it has none', () => {
  /*
    THE NEW TRUTH, ASSERTED BY NAME. The old behaviour was not a default anybody
    chose — it was the absence of a decision, and an absence renders no amber. A
    run that hands no schedule to the layout now gets `undefined` and a sentence,
    never the `+1` that used to stand in for the answer.
  */
  it('reports NOT ESTABLISHED when no schedule reached it, instead of assuming a sign', () => {
    const r = layout();
    expect(r.ramp).toBeDefined();
    expect(r.ramp!.runs).toBeUndefined();
    expect(r.notes.join(' ')).toMatch(/WHICH WAY THE RAMP RUNS IS NOT ESTABLISHED/);
  });

  it('resolves every ramp in the scheme when a schedule does reach it', () => {
    const r = layout({
      rampPlan: {
        schedule: schedule({ basements: 2, groundIsParking: true }),
        actor: ACTOR,
      },
    });
    expect(r.ramp!.runs?.map((x) => x.storeyDelta)).toEqual([-1, -1]);
    expect(r.notes.join(' ')).toMatch(/2 descending/);
  });

  it('distinguishes an empty answer from an unestablished one', () => {
    // Ground-floor-only parking: the strip is reserved, and no ramp runs up it
    // because the driveway reaches the only parking level there is. `[]` is an
    // answer; `undefined` is the absence of one, and they must not read alike.
    const r = layout({ rampPlan: { schedule: schedule({ groundIsParking: true }), actor: ACTOR } });
    expect(r.ramp!.runs).toEqual([]);
    expect(r.notes.join(' ')).toMatch(/no ramp runs up it/);
    expect(r.notes.join(' ')).not.toMatch(/NOT ESTABLISHED/);
  });

  it('records a MEASURED zero for the effect on the bay count, not an unmeasured null', () => {
    // The explanation of how a wrong sign shipped: the direction is an operand of
    // no bay-count and no capacity formula, so every gate that compares a
    // renderer against the engine agreed with the engine about the wrong sign.
    // Measured here by packing the same rectangle both ways round.
    const down = layout({
      rampPlan: { schedule: schedule({ basements: 1, groundIsParking: true }), actor: ACTOR },
    });
    const up = layout({
      rampPlan: {
        schedule: schedule({
          groundIsParking: true,
          podiumAboveGround: 1,
          podiumParkingLevels: 1,
        }),
        actor: ACTOR,
      },
    });
    expect(down.ramp!.runs?.[0]!.storeyDelta).toBe(-1);
    expect(up.ramp!.runs?.[0]!.storeyDelta).toBe(1);
    expect(down.bayCount.value).toBe(up.bayCount.value);
    expect(down.rects.length).toBe(up.rects.length);
  });
});

describe('ramp types', () => {
  it('enumerates the three the client named, including the one it refuses', () => {
    expect(RAMP_TYPES.map((t) => t.type)).toEqual([
      RampType.STRAIGHT,
      RampType.SPLIT,
      RampType.TURNING,
    ]);
    expect(rampTypeSpec(RampType.STRAIGHT).totalWidthM).toBe('6');
    // "هنا مدخل وهنا مخرج، فبيكون 3 متر و 3" — 25:57–27:23.
    expect(rampTypeSpec(RampType.SPLIT).laneCount).toBe(2);
    expect(rampTypeSpec(RampType.SPLIT).laneWidthM).toBe('3');
  });

  it('occupies the same width split as straight, so it places the same bays', () => {
    // §3.2 of the meeting note claims the split "frees a bay run the first
    // blocks". Nothing cited supports that and the two arrangements are the same
    // 6.00 m of width, so the engine reports the same count and says the
    // difference is turning and headroom — B.7.2.2, NOT ASSESSED.
    expect(rampTypeSpec(RampType.SPLIT).totalWidthM).toBe(
      rampTypeSpec(RampType.STRAIGHT).totalWidthM,
    );
    const plan = { schedule: schedule({ basements: 1 }), actor: ACTOR } as const;
    const straight = layout({ rampPlan: { ...plan, type: RampType.STRAIGHT } });
    const split = layout({ rampPlan: { ...plan, type: RampType.SPLIT } });
    expect(split.bayCount.value).toBe(straight.bayCount.value);
    expect(split.notes.join(' ')).toMatch(/NOT ASSESSED/);
  });

  it('refuses the turning ramp by name rather than approximating it', () => {
    // The client's own podium drawing is a sloped floor at 4% as a closed oval,
    // with bays on the slope. A flat rectangle with a ramp on it cannot be that
    // by changing a parameter, so it is enumerated and refused, never drawn.
    expect(rampTypeSpec(RampType.TURNING).placed).toBe(false);
    expect(() =>
      layout({ rampPlan: { schedule: schedule({ basements: 1 }), actor: ACTOR, type: RampType.TURNING } }),
    ).toThrow(ParkingLayoutError);
    expect(() =>
      layout({ rampPlan: { schedule: schedule({ basements: 1 }), actor: ACTOR, type: RampType.TURNING } }),
    ).toThrow(/4%/);
  });

  it('reports every candidate whether or not it was chosen', () => {
    const r = layout({ rampPlan: { schedule: schedule({ basements: 1 }), actor: ACTOR } });
    expect(r.ramp!.candidates.map((c) => c.type)).toEqual(RAMP_TYPES.map((c) => c.type));
  });

  it('assumes straight where nobody chose, and is USER_SET where somebody did', () => {
    const assumed = layout({ rampPlan: { schedule: schedule({ basements: 1 }), actor: ACTOR } });
    expect(assumed.ramp!.type.value).toBe(RampType.STRAIGHT);
    expect(assumed.ramp!.type.provenanceClass).toBe('ASSUMED');

    const stated = layout({
      rampPlan: { schedule: schedule({ basements: 1 }), actor: ACTOR, type: RampType.SPLIT },
    });
    expect(stated.ramp!.type.value).toBe(RampType.SPLIT);
    expect(stated.ramp!.type.provenanceClass).toBe('USER_SET');
  });

  it('does not attribute a type to a person nobody named', () => {
    const r = layout({
      rampPlan: { schedule: schedule({ basements: 1 }), type: RampType.SPLIT },
    });
    expect(r.ramp!.type.provenanceClass).toBe('ASSUMED');
  });

  it('refuses a type it does not enumerate', () => {
    expect(() => rampTypeSpec('HELICAL_DOUBLE' as RampType)).toThrow(ParkingLayoutError);
  });
});
