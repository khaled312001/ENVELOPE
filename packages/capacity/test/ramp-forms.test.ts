/**
 * The forms of the ramp — straight, U-turn, sloped loop.
 *
 * What is at risk: a form chosen by the engine rather than stated; a U-turn
 * whose legs do not climb one storey between them; a loop that is not a loop —
 * one aisle, or cross aisles that do not close it — or that climbs the wrong way
 * round its own arrows; and a gradient worked out over a distance nobody drives.
 */

import { Decimal, ProvenanceClass, ProvenanceGraph, Tracer } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { pt, RECT_120x80, RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import { CROSS_AISLE_ROW, layoutParkingLevel, runPipeline } from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

/** The ramp form's value node: the one that carries a class. */
const formNode = (out: ReturnType<typeof runPipeline>) =>
  out.graph.nodes.find((n) => n.parameterId === 'parking.ramp_form' && n.provenanceClass !== undefined)!;

const level = (form: 'STRAIGHT' | 'U_TURN' | 'LOOP', widthM: string, depthM: string) =>
  layoutParkingLevel({
    tracer: new Tracer(new ProvenanceGraph()),
    footprint: { widthM: new Decimal(widthM), depthM: new Decimal(depthM) },
    deductions: { areaM2: new Decimal(0), source: 'ASSUMED', basis: 'test: nothing deducted' },
    includeRamp: true,
    rampForm: form,
  });

describe('a straight strip, when nobody says otherwise', () => {
  it('is what a run with no stated form lays out, and the form is declared as an assumption', () => {
    const out = runPipeline(runInput(RECT_80x40));
    expect(out.levelPlan!.rampForm).toBe('STRAIGHT');
    expect(out.building.ramps[0]!.form).toBeUndefined();
    expect(formNode(out).provenanceClass).toBe(ProvenanceClass.ASSUMED);
  });

  it('is the person’s once they state it, and the gradient names the statement', () => {
    const out = runPipeline(runInput(RECT_80x40, { levelPlan: { rampForm: 'U_TURN' } }));
    const node = formNode(out);
    expect(node.provenanceClass).toBe(ProvenanceClass.USER_SET);
    expect(out.graph.reachableFrom(out.building.ramps[0]!.gradientPct.node).has(node.id)).toBe(true);
  });
});

describe('a U-turn ramp', () => {
  const out = level('U_TURN', '74', '34');

  it('reserves a strip two legs and a wall wide, and two-thirds the straight run', () => {
    const ramp = out.rects.find((r) => r.kind === 'RAMP')!;
    expect(ramp.width.toString()).toBe('12.3');
    expect(ramp.height.toString()).toBe('21');
  });

  it('climbs half a storey up each leg, with a level landing between them', () => {
    expect(out.flights.map((f) => [f.footRise, f.headRise])).toEqual([
      [0, 0.5],
      [0.5, 0.5],
      [0.5, 1],
    ]);
    // Both legs end at the strip's open end: one leaves this level, one reaches the next.
    const [a, , b] = out.flights;
    expect(a!.footAtMin).toBe(true);
    expect(b!.footAtMin).toBe(false);
  });

  it('works its gradient over both legs, which is the slope a car drives', () => {
    // 21 m strip less a 6 m landing: two 15 m legs.
    expect(out.travelM!.value.toString()).toBe('30');
  });
});

describe('a sloped loop', () => {
  it('has no ramp strip, and both cross aisles, which are the ends it turns at', () => {
    const out = level('LOOP', '74', '40');
    expect(out.rects.some((r) => r.kind === 'RAMP')).toBe(false);
    expect(out.rects.filter((r) => r.kind === 'AISLE' && r.row === CROSS_AISLE_ROW)).toHaveLength(2);
  });

  it('climbs half a storey along one side to a level landing and the other half back', () => {
    const out = level('LOOP', '74', '40');
    const sloped = out.flights.filter((f) => f.footRise !== f.headRise);
    const landings = out.flights.filter((f) => f.footRise === f.headRise);
    expect(landings).toHaveLength(1);
    expect(landings[0]!.footRise).toBe(0.5);
    expect(Math.min(...sloped.map((f) => f.footRise))).toBe(0);
    expect(Math.max(...sloped.map((f) => f.headRise))).toBe(1);
    // Two sloped sides of one module aisle's length each.
    const aisle = out.rects.find((r) => r.kind === 'AISLE' && r.row === 0)!;
    expect(out.travelM!.value.eq(aisle.width.times(2))).toBe(true);
  });

  it('is refused, in words, on a level one aisle deep', () => {
    // 20 × 17 m holds one module whichever way round it is packed.
    expect(() => level('LOOP', '20', '17')).toThrow(/sloped loop needs two drive aisles/);
  });

  it('labels its aisles with the slope, and its landing as level', () => {
    const out = runPipeline(runInput(RECT_120x80, { levelPlan: { rampForm: 'LOOP' } }));
    const labels = out.building.levels.find((l) => l.parking)!.parking!.aisles.map((a) => a.label);
    expect(labels.filter((l) => /SLOPED \d+\.\d\d%, NOT ASSESSED$/.test(l)).length).toBeGreaterThan(1);
    expect(labels.filter((l) => /LEVEL LANDING$/.test(l))).toHaveLength(1);
    const ramp = out.building.ramps[0]!;
    expect(ramp.form).toBe('LOOP');
    expect(ramp.label).toMatch(/^SLOPED LOOP .*GRADIENT NOT ASSESSED \(DBC B\.7\.2\.2\)$/);
  });

  /*
    THE PATH RUNS THE WAY IT CLIMBS. Its arrows are drawn along it, so a path laid
    out the wrong way round would put every arrow against the slope — which is what
    a transposed packing, a reflection, did before the path was oriented.
  */
  it('emits a closed path that runs the way the loop climbs, packed either way round', () => {
    for (const ring of [RECT_120x80, [pt(0, 0), pt(80, 0), pt(80, 120), pt(0, 120)]]) {
      const out = runPipeline(runInput(ring, { levelPlan: { rampForm: 'LOOP' } }));
      const ramp = out.building.ramps[0]!;
      const path = ramp.path!;
      expect(path.length).toBeGreaterThan(20);
      const leaving = ramp.flights!.find((f) => f.footRise === 0 && f.headRise > 0)!;
      const mid = (p: readonly { x: number; y: number }[]) => ({
        x: (p[0]!.x + p[1]!.x) / 2,
        y: (p[0]!.y + p[1]!.y) / 2,
      });
      const foot = mid(leaving.foot);
      const head = mid(leaving.head);
      const dir = { x: head.x - foot.x, y: head.y - foot.y };
      // The path's segment nearest the leaving aisle's middle runs the same way.
      const centre = { x: (foot.x + head.x) / 2, y: (foot.y + head.y) / 2 };
      let best = 0;
      let bestD = Infinity;
      // Closed: the last point joins the first, and that segment is one of the sides.
      const next = (i: number) => path[(i + 1) % path.length]!;
      for (let i = 0; i < path.length; i += 1) {
        const m = { x: (path[i]!.x + next(i).x) / 2, y: (path[i]!.y + next(i).y) / 2 };
        const d = Math.hypot(m.x - centre.x, m.y - centre.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      const seg = { x: next(best).x - path[best]!.x, y: next(best).y - path[best]!.y };
      expect(seg.x * dir.x + seg.y * dir.y).toBeGreaterThan(0);
    }
  });
});
