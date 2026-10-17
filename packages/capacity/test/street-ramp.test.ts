/**
 * The ramps from the street, where the ground floor does not park.
 *
 * A schedule like the reference scheme's — shops on G, parking B3–B1 and P1–P5 —
 * used to be laid out as if every level reached the street on its own. Nothing
 * placed the ramp down to B1 or the ramp up to P1, so neither was drawn and the
 * bays they stand on were counted. These tests hold four things:
 *
 *   1. both ramps are placed from the reader's entrance, sized by Tables B.9 and
 *      B.10 off the storey, and stand in the model as ramps from G;
 *   2. the bays they stand on — and the bays their cut strands — are given up on
 *      B1 and P1, and the supply says so, figure for figure with the drawing;
 *   3. without the entrance nothing is placed and the bays come back, which is
 *      the doctored run that proves (2) is the ramp's doing;
 *   4. where they do not fit, the run says why, in figures.
 */
import { Decimal, EdgeClassification, ProvenanceGraph, Tracer } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { plotOf, pt, RECT_80x40, RECT_120x80, runInput } from '../../../test-support/pipeline.js';
import { AccessChoiceRefusedError, placeVehicleAccess } from '../src/access.js';
import { planGrade } from '../src/grade.js';
import { ParkingArrangement, runPipeline } from '../src/index.js';
import { RectKind } from '../src/layout.js';
import { straightRampRequirement } from '../src/ramp-rules.js';
import { StreetRampDirection, StreetRampPlacement } from '../src/street-ramp.js';

beforeAll(async () => {
  await initGeometry();
});

const A_104 = { basements: 3, groundIsParking: false, podiumAboveGround: 5, podiumParkingLevels: 5 } as const;
const ON_BOUNDARY = {
  statementId: 'STMT-PODIUM-SETBACK-2026-10-16',
  statedBy: 'Eng. Mohamed',
  statedOn: '2026-10-16',
  verbatim: 'ال دور ال ارضي و البوديوم و البدروم بياخدو مساحه الارض كلها مفيش setbacks',
};

type Pt = { readonly x: number; readonly y: number };
const box = (ring: readonly Pt[]) => ({
  minX: Math.min(...ring.map((p) => p.x)),
  maxX: Math.max(...ring.map((p) => p.x)),
  minY: Math.min(...ring.map((p) => p.y)),
  maxY: Math.max(...ring.map((p) => p.y)),
});
/** Overlap area of two rings' boxes, mm². The rings here are axis-aligned rectangles. */
const overlap = (a: readonly Pt[], b: readonly Pt[]): number => {
  const p = box(a);
  const q = box(b);
  const w = Math.min(p.maxX, q.maxX) - Math.max(p.minX, q.minX);
  const h = Math.min(p.maxY, q.maxY) - Math.max(p.minY, q.minY);
  return w > 0 && h > 0 ? w * h : 0;
};
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

/** The formula of the computation a traced value came from, read off the graph. */
const formulaOf = (out: ReturnType<typeof run>, value: { readonly node: string }): string =>
  out.graph
    .outgoing(value.node as Parameters<typeof out.graph.outgoing>[0])
    .map((e) => out.graph.node(e.to).formula ?? '')
    .join(' ');

/** Bays the accessible designation turned into access aisles, on the level it designates. */
const accessibleLoss = (out: ReturnType<typeof run>, levelId: string): number =>
  levelId === 'B1' ? (out.levelPlan!.accessible?.lost ?? 0) : 0;

const run = (entryAtM: string | null, ring = RECT_120x80) =>
  runPipeline(
    runInput(ring, {
      levelSchedule: A_104,
      podiumAtBoundaryStatement: ON_BOUNDARY,
      levelPlan: {
        arrangement: ParkingArrangement.WIDTH,
        ...(entryAtM ? { vehicleAccess: { entry: { edgeSeq: 0, centreOffsetM: new Decimal(entryAtM) } } } : {}),
      },
    }),
  );

describe('the ramps from the street, placed', () => {
  let out: ReturnType<typeof run>;
  let plan: NonNullable<ReturnType<typeof run>['levelPlan']>;
  let street: NonNullable<typeof plan.streetRamps>;
  beforeAll(() => {
    out = run('25');
    plan = out.levelPlan!;
    street = plan.streetRamps!;
  });

  it('places a ramp down to B1 and a ramp up to P1 from the entrance', () => {
    expect(out.levelPlanRefusal).toBeUndefined();
    expect(street.needed).toEqual([StreetRampDirection.DOWN, StreetRampDirection.UP]);
    expect(street.placement?.value).toBe(StreetRampPlacement.STRAIGHT_IN);
    expect(street.ramps.map((r) => r.levelId)).toEqual(['B1', 'P1']);
    // Both placements were tried and both are reported.
    expect(street.candidates.map((c) => c.placement).sort()).toEqual(
      [StreetRampPlacement.ALONG_FRONTAGE, StreetRampPlacement.STRAIGHT_IN].sort(),
    );
    expect(formulaOf(out, street.placement!)).toMatch(/along the frontage/);
  });

  it('stands both in the building model as ramps from G, below and above it', () => {
    const ramps = out.building.ramps.filter((r) => r.street);
    expect(ramps.map((r) => [r.fromLevelId, r.toLevelId])).toEqual([
      ['B1', 'G'],
      ['G', 'P1'],
    ]);
    const [down, up] = ramps as [(typeof ramps)[number], (typeof ramps)[number]];
    expect(down.fromElevationMm).toBeLessThan(0);
    expect(down.toElevationMm).toBe(0);
    expect(up.fromElevationMm).toBe(0);
    expect(up.toElevationMm).toBeGreaterThan(0);
    expect(down.label).toMatch(/^RAMP FROM STREET DOWN TO B1 /);
    expect(up.label).toMatch(/^RAMP FROM STREET UP TO P1 /);
    // The landing B.7.2.3.3 ¶4 asks for before the barrier is part of it.
    expect(down.street!.landing.length).toBe(4);
  });

  it('is as long as Tables B.9 and B.10 make one storey, and the formula says so', () => {
    const runM = street.requirement.runM;
    expect(formulaOf(out, runM)).toMatch(/transitions at 6%.*÷ 12%/);
    for (const ramp of street.ramps) {
      const length = dist(mid(ramp.foot[0], ramp.foot[1]), mid(ramp.head[0], ramp.head[1]));
      expect(Math.abs(length - runM.value.toNumber() * 1000)).toBeLessThan(2);
    }
  });

  it('gives up the bays the ramps stand on, on B1 and on P1, and only there', () => {
    const perLevel = plan.bayCount.value;
    for (const level of street.levels) {
      expect(level.givenUp.value, level.levelId).toBeGreaterThan(0);
      expect(level.bayCount.value, level.levelId).toBe(perLevel - level.givenUp.value);
      const drawn = out.building.levels.find((l) => l.id === level.levelId)!.parking!;
      expect(drawn.bays.length, level.levelId).toBe(level.bayCount.value - accessibleLoss(out, level.levelId));
      const ramp = street.ramps.find((r) => r.levelId === level.levelId)!;
      for (const bay of drawn.bays) expect(overlap(bay.outline, ramp.world), `bay ${bay.number}`).toBeLessThan(10_000);
      if (level.drive) {
        for (const bay of drawn.bays) expect(overlap(bay.outline, level.drive), `bay ${bay.number}`).toBeLessThan(10_000);
      }
    }
    // A level the street ramps do not reach keeps the shared layout whole.
    expect(out.building.levels.find((l) => l.id === 'B2')!.parking!.bays.length).toBe(perLevel);
  });

  it('counts in the supply exactly the bays that are drawn', () => {
    const drawn = out.building.levels.reduce((n, l) => n + (l.parking?.bays.length ?? 0), 0);
    expect(Number(out.building.drawnBays.value)).toBe(drawn);
    expect(out.parking.providedBays.value).toBe(drawn);
    const formula = formulaOf(out, out.parking.providedBays);
    // B1 is the level the street reaches, so its own figure — ramp and accessible
    // aisles already taken off — is the term; P1's loss is named beside the rest.
    const b1 = out.building.levels.find((l) => l.id === 'B1')!.parking!.bays.length;
    expect(formula).toContain(`${b1} bays on the first basement`);
    expect(formula).toMatch(/− \d+ given up on P1 to the ramp from the street/);
  });

  it('says what the ramps take of the ground floor, and that its effect on GFA is not assessed', () => {
    expect(street.groundAreaM2!.value.toNumber()).toBeGreaterThan(0);
    expect(out.building.notModelled.join(' ')).toMatch(
      /The ramps from the street stand on the ground floor, straight in from the entrance, and take [\d.]+ m² of it; how that bears on the ground floor's floor area is NOT ASSESSED\./,
    );
    expect(out.building.notModelled.join(' ')).not.toMatch(/ramp from the street .* not modelled/i);
  });
});

describe('only where the ground floor does not park', () => {
  it('places no ramp from the street when G parks, and the B1 bays are all kept', () => {
    const parks = runPipeline(
      runInput(RECT_120x80, {
        levelSchedule: { ...A_104, groundIsParking: true },
        podiumAtBoundaryStatement: ON_BOUNDARY,
        levelPlan: {
          arrangement: ParkingArrangement.WIDTH,
          vehicleAccess: { entry: { edgeSeq: 0, centreOffsetM: new Decimal('25') } },
        },
      }),
    );
    expect(parks.levelPlan!.streetRamps).toBeUndefined();
    expect(parks.building.ramps.some((r) => r.street)).toBe(false);
    expect(parks.building.levels.find((l) => l.id === 'B1')!.parking!.bays.length).toBe(parks.levelPlan!.bayCount.value);
    // And where G does not park, the same entrance costs B1 bays the level below keeps.
    const shops = run('25');
    const count = (id: string) => shops.building.levels.find((l) => l.id === id)!.parking!.bays.length;
    expect(count('B1') + accessibleLoss(shops, 'B1')).toBeLessThan(count('B2'));
  });

  it('starts from the recommended entrance when the reader has placed none, and says how', () => {
    const bare = run(null);
    const street = bare.levelPlan!.streetRamps!;
    expect(street.ramps.map((r) => r.levelId)).toEqual(['B1', 'P1']);
    expect(street.notes.join(' ')).toMatch(
      /The ramps from the street stand on the ground floor, (straight in|along the frontage) from the entrance/,
    );
  });
});

describe('where they do not fit, the run says why in figures', () => {
  it('refuses both placements on an 80 × 40 plot, naming the dimension that does not suffice', () => {
    const out = run('20', RECT_80x40);
    const street = out.levelPlan!.streetRamps!;
    expect(street.ramps).toEqual([]);
    expect(street.placement).toBeUndefined();
    for (const c of street.candidates) expect(c.refusal, c.placement).toMatch(/\d+(\.\d+)? m/);
    expect(street.notes.join(' ')).toMatch(/The ramps from the street are not placed: neither placement fits\./);
    // The bays the ramps would take are not handed back as if they were free.
    expect(out.building.ramps.some((r) => r.street)).toBe(false);
  });
});

/*
  THE DRIVE INTO THE CORE. A centred entrance on plot 6468096 was refused for
  running into a core whose position nobody chose. It is still refused — routing
  a drive round the core is a design — but the sentence now names the element,
  says its position is assumed, and gives where on the same boundary an opening
  of the same width would clear it.
*/
describe('the drive from the entrance into the core', () => {
  const actor = { id: 'u-1', name: 'Eng. Mohamed' };
  const grade = (centreM: string) => {
    const tracer = new Tracer(new ProvenanceGraph());
    const plot = plotOf(RECT_80x40);
    const access = placeVehicleAccess({
      tracer,
      plot,
      edges: plot.edges,
      chosen: { entry: { edgeSeq: 0, centreOffsetM: new Decimal(centreM) }, actor },
    });
    const ring = (x0: number, y0: number, x1: number, y1: number) => [pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1)];
    return planGrade({
      tracer,
      plot,
      rects: [
        {
          kind: RectKind.AISLE,
          row: 0,
          xM: new Decimal(0),
          yM: new Decimal(20),
          widthM: new Decimal(80),
          heightM: new Decimal(6),
          world: ring(0, 20, 80, 26),
        },
      ],
      perLevel: tracer.assumed('test.per_level', 0, { basis: 'a test level with no bays' }),
      access,
      bayLengthM: new Decimal('5.5'),
      obstacles: [{ ring: ring(35, 8, 45, 16), what: 'core' }],
      coreAssumedAt: "centred on the tower plate, in the plate's own proportions",
    });
  };

  it('names the core, says where it stands is assumed, and where an opening would clear it', () => {
    expect(() => grade('40')).toThrow(AccessChoiceRefusedError);
    expect(() => grade('40')).toThrow(
      "The drive from the entrance on boundary 0 runs through the core before it reaches a drive aisle. Where the core stands is assumed: centred on the tower plate, in the plate's own proportions. An opening on boundary 0 centred between 3.00 m and 32.00 m from P0, or between 48.00 m and 77.00 m from P0 would clear it. Place the entrance elsewhere on the boundary.",
    );
  });

  it('takes an entrance placed in the range it named', () => {
    expect(grade('32').drives).toHaveLength(1);
  });
});

/*
  THE CORNER BETWEEN TWO ROADS. Whether a corner where two roads meet with no
  chamfer is a junction under B.7.2.1 is the client's to say. The reading stays
  — it is a junction — and the refusal it causes says it is a reading.
*/
describe('an entrance near a corner between two roads', () => {
  it('is refused under the junction reading, and the refusal says the reading is a question', () => {
    const base = plotOf(RECT_80x40);
    const edges = base.edges.map((e) => (e.seq === 1 ? { ...e, classification: EdgeClassification.ROAD } : e));
    const place = () =>
      placeVehicleAccess({
        tracer: new Tracer(new ProvenanceGraph()),
        plot: { ...base, edges },
        edges,
        chosen: { entry: { edgeSeq: 0, centreOffsetM: new Decimal('70') }, actor: { id: 'u-1', name: 'Eng. Mohamed' } },
      });
    expect(place).toThrow(/B\.7\.2\.1 keeps it 15 m clear of the junction at P1, measured from the plot corner\./);
    expect(place).toThrow(
      /P1 is read as a junction because boundary 1 beyond it is a road too\. Whether a corner where two roads meet with no chamfer is a junction under B\.7\.2\.1 is a question put to the client; until it is answered, this reading stands\.$/,
    );
  });
});

describe('the length of a ramp follows the floor-to-floor', () => {
  it('climbs 3.60 m in 33.60 m and 3.20 m in 30.27 m', () => {
    const tracer = new Tracer(new ProvenanceGraph());
    const at = (h: string) =>
      straightRampRequirement(
        tracer,
        tracer.assumed(`storey_${h}`, new Decimal(h), { basis: 'test storey', unit: 'm' }),
      ).runM.value.toFixed(2);
    expect(at('3.6')).toBe('33.60');
    expect(at('3.2')).toBe('30.27');
  });
});
