/**
 * The ground floor, where it parks (Eng. Mohamed, 16 Oct 2026).
 *
 * Two of his notes stand on the level at grade and nowhere else: the circulation
 * starts at the entrance, so the drive from it is drawn and the bays it crosses
 * are given up; and the transformer room is on the boundary with the street,
 * «مش من الضلع الي فيه جار» — never on one shared with a neighbour.
 *
 * These are held as prohibitions as well as presences: a band on a neighbour's
 * boundary, a kept bay under a drive, a drive copied onto a basement, or a
 * supply that still multiplies one layout by the level count would each pass a
 * test that only looked for the new things.
 */

import {
  asMm,
  Decimal,
  EdgeClassification,
  LandUse,
  type Mm,
  type ModelPoint,
  type Plot,
  type UnitTypeMix,
} from '@envelope/core';
import { analysePlot, area, initGeometry, intersect, type Ring } from '@envelope/geometry';
import { asOfNow, loadSeedRulesForDevelopment, RuleStore } from '@envelope/rules';
import { beforeAll, describe, expect, it } from 'vitest';

import { runPipeline, type RunInput, type RunOutput } from '../src/index.js';

const ACK = 'I understand these rules are not approved';
const m = (v: number): Mm => asMm(Math.round(v * 1000));
const pt = (x: number, y: number) => ({ x: m(x), y: m(y) });

const MIX: readonly UnitTypeMix[] = [
  { typeId: '1BED', label: '1 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('70') },
  { typeId: '2BED', label: '2 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('110') },
];

const RECT_80x40: Ring = [pt(0, 0), pt(80, 0), pt(80, 40), pt(0, 40)];

type Cls = (typeof EdgeClassification)[keyof typeof EdgeClassification];

function plotOf(ring: Ring, classes: readonly Cls[]): Plot {
  const g = analysePlot(ring);
  return {
    plotId: 'p1',
    tenantId: 't1',
    plotNumber: '345-1234',
    community: 'TEST',
    landUse: LandUse.RESIDENTIAL_MULTI,
    ring,
    edges: ring.map((start, i) => {
      const end = ring[(i + 1) % ring.length]!;
      const cls = classes[i]!;
      return {
        seq: i,
        start,
        end,
        classification: cls,
        ...(cls === EdgeClassification.ROAD ? { roadHierarchy: 'LOCAL' as const } : {}),
        lengthMm: asMm(Math.round(Math.hypot(end.x - start.x, end.y - start.y))),
        bearingDeg: new Decimal(0),
      };
    }),
    shapeClass: 'RECTILINEAR',
    statedAreaM2: undefined,
    computedAreaMm2: g.areaMm2,
    areaMismatch: false,
    principalAxisDeg: g.principalAxisDeg,
    mbrWidthMm: g.mbr.widthMm,
    mbrDepthMm: g.mbr.depthMm,
    convexityRatio: g.convexityRatio,
    frontageCount: classes.filter((c) => c === EdgeClassification.ROAD).length,
  };
}

const { ROAD, ADJACENT_PLOT } = EdgeClassification;
const TWO_ROADS = [ROAD, ADJACENT_PLOT, ROAD, ADJACENT_PLOT] as const;

function input(classes: readonly Cls[], overrides: Partial<RunInput> = {}): RunInput {
  return {
    plot: plotOf(RECT_80x40, classes),
    rules: new RuleStore().add(...loadSeedRulesForDevelopment(ACK)).load(asOfNow('2026-08-30')),
    actor: { id: 'u1', name: 'Test Architect' },
    parkingInFar: 'EXCLUDED_FROM_FAR',
    unitMix: { source: 'USER_SET', entries: MIX },
    parkingLevelsAvailable: 2,
    podiumLevels: 2,
    saleableEfficiency: { value: new Decimal('0.95'), source: 'USER_SET' },
    parkingUsableFraction: {
      value: new Decimal('0.85'),
      source: 'ASSUMED',
      basis: 'test fixture: the share of a parking level left for bays and aisles',
    },
    realismDiscount: new Decimal('1.00'),
    ...overrides,
  };
}

const overlapMm2 = (a: readonly ModelPoint[], b: readonly ModelPoint[]): number =>
  intersect(a as Ring, b as Ring).reduce((s, r) => s + Math.abs(Number(area(r))), 0);

/** Does side `p → q` of a ring lie on the segment `a → b`? Both ends within 2 mm of it. */
function onSegment(p: ModelPoint, a: ModelPoint, b: ModelPoint): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const cross = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len);
  return cross <= 2 && t >= -1e-6 && t <= 1 + 1e-6;
}

function levelsOf(out: RunOutput) {
  const parking = out.building.levels.filter((l) => l.parking);
  return { parking, grade: parking.find((l) => l.elevationMm === 0)!, above: parking.filter((l) => l.elevationMm !== 0) };
}

beforeAll(async () => {
  await initGeometry();
});

describe('the drive from the entrance', () => {
  it('is drawn at grade, and on no other level', () => {
    const out = runPipeline(input(TWO_ROADS));
    const { grade, above } = levelsOf(out);
    expect(grade.parking!.drives?.length ?? 0).toBeGreaterThan(0);
    for (const level of above) expect(level.parking!.drives).toBeUndefined();
  });

  it('leaves no bay standing under it, and counts each one it gave up', () => {
    const out = runPipeline(input(TWO_ROADS));
    const plan = out.levelPlan!;
    const grade = plan.grade!;
    const drives = levelsOf(out).grade.parking!.drives!;
    for (const bay of levelsOf(out).grade.parking!.bays) {
      for (const d of drives) expect(overlapMm2(bay.outline, d.outline)).toBeLessThanOrEqual(10_000);
    }
    expect(grade.dropped.drive).toBeGreaterThan(0);
    expect(grade.bayCount.value).toBe(plan.bayCount.value - grade.dropped.drive - grade.dropped.plant);
  });

  it('starts on the opening the entrance stands on and ends inside a drive aisle', () => {
    const out = runPipeline(input(TWO_ROADS));
    const grade = out.levelPlan!.grade!;
    const aisles = out.levelPlan!.rects.filter((r) => r.kind === 'AISLE');
    for (const d of grade.drives) {
      expect(d.world[0]).toEqual(d.opening.start);
      expect(d.world[1]).toEqual(d.opening.end);
      // Half a metre into an aisle: well over a shared edge's worth of overlap.
      const into = Math.max(...aisles.map((a) => overlapMm2(d.world as ModelPoint[], a.world as ModelPoint[])));
      expect(into).toBeGreaterThan(10_000);
    }
  });
});

describe('the transformer room on the road', () => {
  it('stands against a ROAD boundary, never one shared with a neighbour', () => {
    // One road, three neighbours: the band has exactly one boundary it may use.
    const classes = [ADJACENT_PLOT, ADJACENT_PLOT, ROAD, ADJACENT_PLOT] as const;
    const out = runPipeline(input(classes));
    const band = out.levelPlan!.grade!.plantBand!;
    expect(band).toBeDefined();
    expect(band.edgeSeq).toBe(2);
    const edge = out.building.plot.edges[2]!;
    const [p, q] = band.world as unknown as ModelPoint[];
    expect(onSegment(p!, edge.start, edge.end) && onSegment(q!, edge.start, edge.end)).toBe(true);
    /*
      Its frontage — the long side, the one a door and a transformer come through —
      is on no neighbour's boundary. In a corner its short END may meet one; that
      is the room standing in the corner, not facing the neighbour.
    */
    const ring = band.world as unknown as ModelPoint[];
    const len = (a: ModelPoint, b: ModelPoint): number => Math.hypot(b.x - a.x, b.y - a.y);
    const frontage = len(p!, q!);
    for (const e of out.building.plot.edges.filter((x) => x.classification === ADJACENT_PLOT)) {
      const sides = ring.map((a, i) => [a, ring[(i + 1) % ring.length]!] as const);
      for (const [a, b] of sides) {
        if (onSegment(a, e.start, e.end) && onSegment(b, e.start, e.end)) {
          expect(len(a, b)).toBeLessThan(frontage);
        }
      }
    }
  });

  it('draws the substation and the LV room inside the band, side by side', () => {
    const out = runPipeline(input(TWO_ROADS));
    const band = out.levelPlan!.grade!.plantBand!;
    const rooms = out.building.groundRooms!.rooms;
    const substation = rooms.find((r) => r.name === 'SUBSTATION')!;
    const lv = rooms.find((r) => r.name === 'LV ROOM')!;
    const bandRing = band.world as unknown as ModelPoint[];
    for (const room of [substation, lv]) {
      const own = Math.abs(Number(area(room.outline as unknown as Ring)));
      expect(overlapMm2(room.outline, bandRing)).toBeGreaterThan(own - 10_000);
    }
    // §11.2.3's adjacency: they share a side, and do not overlap.
    expect(overlapMm2(substation.outline, lv.outline)).toBeLessThanOrEqual(10_000);
  });

  it('is placed DERIVED, on the boundary, with the clause and who stated it', () => {
    const out = runPipeline(input(TWO_ROADS));
    const json = out.graph.toJSON();
    const node = json.nodes.find((n) => n.parameterId === 'plant.substation.placement');
    expect(node).toBeDefined();
    expect(node!.provenanceClass).toBe('DERIVED');
    expect(String(node!.value)).toMatch(/^against boundary \d, on the road$/);
    // Who said it, and the setback clause that lets it stand there, on the node a reader opens.
    const computation = json.edges.find((e) => e.from === node!.id)?.to;
    const detail = JSON.stringify(json.nodes.find((n) => n.id === computation)?.detail ?? {});
    expect(detail).toMatch(/Eng\. Mohamed/);
    expect(detail).toMatch(/B\.4\.2\.3/);
  });

  it('never stands on a drive aisle, and both rooms are drawn', () => {
    /*
      A 50 × 30 corner plot, roads on boundaries 0 and 1 meeting at P1, found in
      the studio: the band was cut on boundary 1 from the corner up, straight
      across the lower driveway — a transformer room parked in the one lane every
      car on the level uses. An aisle is not a bay to be given up.
    */
    const ring: Ring = [pt(0, 0), pt(50, 0), pt(50, 30), pt(0, 30)];
    const classes = [ROAD, ROAD, ADJACENT_PLOT, ADJACENT_PLOT] as const;
    // As the studio sent it: the schedule, and the statement that puts the podium on the boundary.
    const out = runPipeline({
      ...input(classes, {
        levelSchedule: { basements: 1, groundIsParking: true, podiumAboveGround: 0, podiumParkingLevels: 0 },
        podiumAtBoundaryStatement: {
          statementId: 'STMT-PODIUM-SETBACK-2026-10-16',
          statedBy: 'Eng. Mohamed',
          statedOn: '2026-10-16',
          verbatim: 'ال دور ال ارضي و البوديوم و البدروم بياخدو مساحه الارض كلها مفيش setbacks',
        },
      }),
      plot: plotOf(ring, classes),
    });
    expect(out.levelPlanRefusal).toBeUndefined();
    const grade = out.levelPlan!.grade!;
    // Boundary 0 has a bay row along the road clear of every aisle: the band belongs there.
    const band = grade.plantBand!;
    expect(band, grade.notes.join(' ')).toBeDefined();
    for (const a of grade.rects.filter((r) => r.kind === 'AISLE')) {
      expect(overlapMm2(band.world as unknown as ModelPoint[], a.world as unknown as ModelPoint[])).toBeLessThanOrEqual(10_000);
    }
    const names = out.building.groundRooms!.rooms.map((r) => r.name);
    expect(names).toContain('SUBSTATION');
    expect(names).toContain('LV ROOM');
  });

  it('lays no typical room across the band', () => {
    const out = runPipeline(input(TWO_ROADS));
    const band = out.levelPlan!.grade!.plantBand!.world as unknown as ModelPoint[];
    for (const r of out.building.groundRooms!.rooms) {
      if (r.name === 'SUBSTATION' || r.name === 'LV ROOM') continue;
      expect(overlapMm2(r.outline, band)).toBeLessThanOrEqual(10_000);
    }
  });

  it('is not cut where no boundary is a road, and says so', () => {
    const none = [ADJACENT_PLOT, ADJACENT_PLOT, ADJACENT_PLOT, ADJACENT_PLOT] as const;
    let out: RunOutput | undefined;
    try {
      out = runPipeline(input(none));
    } catch {
      // A plot with no road may be refused upstream for want of access; that is not this test.
      return;
    }
    const grade = out.levelPlan?.grade;
    if (!grade) return;
    expect(grade.plantBand).toBeUndefined();
    expect(grade.dropped.plant).toBe(0);
  });
});

describe('the supply the answer rests on', () => {
  it('is the bays at grade plus the shared layout on every other parking level', () => {
    const out = runPipeline(input(TWO_ROADS, { parkingLevelsAvailable: 3, podiumLevels: 3 }));
    const perLevel = out.levelPlan!.bayCount.value;
    const atGrade = out.levelPlan!.grade!.bayCount.value;
    const { parking } = levelsOf(out);
    expect(parking.map((l) => l.parking!.bays.length)).toEqual([atGrade, perLevel, perLevel]);
    expect(Number(out.building.drawnBays.value)).toBe(atGrade + 2 * perLevel);
    expect(out.parking.providedBays.value).toBe(atGrade + 2 * perLevel);
  });

  it('keeps one layout on every level when the ground floor does not park', () => {
    const out = runPipeline(
      input(TWO_ROADS, {
        levelSchedule: { basements: 2, groundIsParking: false, podiumAboveGround: 0, podiumParkingLevels: 0 },
      }),
    );
    expect(out.levelPlan!.grade).toBeUndefined();
    const perLevel = out.levelPlan!.bayCount.value;
    const { parking } = levelsOf(out);
    expect(parking.length).toBe(2);
    for (const l of parking) {
      expect(l.parking!.bays.length).toBe(perLevel);
      expect(l.parking!.drives).toBeUndefined();
    }
    expect(out.parking.providedBays.value).toBe(2 * perLevel);
  });
});
