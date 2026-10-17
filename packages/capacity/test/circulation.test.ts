/**
 * Circulation — *"ممر الي ماشي فيه السيارات مظبوط"*.
 *
 * Two kinds of assertion here and the second is the one that matters.
 *
 * The first is that every bay the layout reports can be reached. That is easy
 * to satisfy and easy to satisfy vacuously, which is the trap: a checker that
 * passes because it never measured anything is the failure this codebase refuses
 * everywhere else, and it is exactly what a reachability test would be if the
 * cross aisle guaranteed the answer and nothing ever proved the check could say
 * no.
 *
 * So the second kind **doctors the layout**: it takes a real, passing level,
 * deletes the cross aisle from the network, and asserts that the bays past the
 * first module go unreachable. That is the defect as it stood before this
 * module existed — counted, drawn, exported, and unreachable — and the check is
 * only worth having because it fails on it.
 */

import { Decimal, ProvenanceGraph, Tracer } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import {
  bayIsServed,
  oneWayServes,
  openingM,
  servingNode,
  traceCirculation,
  traceOneWay,
  type CircRect,
  type OneWayRect,
} from '../src/circulation.js';
import {
  CROSS_AISLE_ROW,
  ENTRY_DRIVE_ROW,
  layoutParkingLevel,
  RectKind,
  RING_AISLE_ROW,
  type ParkingLayoutResult,
  type PlacedRect,
} from '../src/layout.js';

const d = (v: string | number): Decimal => new Decimal(v);
const r = (x: number, y: number, width: number, height: number): CircRect => ({
  x: d(x),
  y: d(y),
  width: d(width),
  height: d(height),
});

function run(
  widthM: string,
  depthM: string,
  extra: Partial<Parameters<typeof layoutParkingLevel>[0]> = {},
): ParkingLayoutResult {
  return layoutParkingLevel({
    tracer: new Tracer(new ProvenanceGraph()),
    footprint: { widthM: d(widthM), depthM: d(depthM) },
    deductions: {
      areaM2: d(0),
      source: 'ASSUMED',
      basis: 'test fixture takes no deduction so the packing itself is what is measured',
    },
    ...extra,
  });
}

const WIDTH = { arrangement: { id: 'WIDTH' } } as const;

const drivableOf = (result: ParkingLayoutResult): PlacedRect[] =>
  result.rects.filter((x) => x.kind === RectKind.AISLE || x.kind === RectKind.RAMP);

const baysOf = (result: ParkingLayoutResult): PlacedRect[] =>
  result.rects.filter((x) => x.kind === RectKind.BAY);

describe('the opening between two rectangles', () => {
  it('is the length of the edge they share', () => {
    expect(openingM(r(0, 0, 10, 6), r(0, 6, 4, 6)).toString()).toBe('4');
  });

  it('is nothing when they only meet at a corner, because a corner is not a doorway', () => {
    expect(openingM(r(0, 0, 10, 6), r(10, 6, 4, 6)).toString()).toBe('0');
  });

  it('is nothing when they are apart', () => {
    expect(openingM(r(0, 0, 10, 6), r(0, 11, 10, 6)).toString()).toBe('0');
  });

  it('does not care which way round it is asked', () => {
    const a = r(0, 0, 10, 6);
    const b = r(10, 0, 6, 40);
    expect(openingM(a, b).toString()).toBe(openingM(b, a).toString());
  });
});

describe('the aisle network', () => {
  const spine = r(0, 0, 6, 40);
  const lower = r(6, 5.5, 30, 6);
  const upper = r(6, 22.5, 30, 6);
  /** Far enough up that the 40 m spine never reaches it. */
  const stranded = r(6, 60, 30, 6);

  it('reaches an aisle through the cross aisle that joins it', () => {
    const { reachable } = traceCirculation({
      drivable: [spine, lower, upper],
      entries: [0],
      minOpeningM: d(6),
    });
    expect(reachable.has(1)).toBe(true);
    expect(reachable.has(2)).toBe(true);
  });

  it('does not reach one that touches nothing', () => {
    const { reachable } = traceCirculation({
      drivable: [spine, lower, stranded],
      entries: [0],
      minOpeningM: d(6),
    });
    expect(reachable.has(2)).toBe(false);
  });

  it('refuses an opening narrower than the driveway it serves', () => {
    // A 6 m aisle meeting a spine over 400 mm of its length is a drafting
    // artifact, not a way through. A graph that accepted it would pass a level
    // no car can circulate on.
    const pinched = r(6, 5.5, 30, 0.4);
    const { reachable } = traceCirculation({
      drivable: [spine, pinched],
      entries: [0],
      minOpeningM: d(6),
    });
    expect(reachable.has(1)).toBe(false);
  });
});

describe('which aisle serves a bay', () => {
  const aisle = r(0, 5.5, 30, 6);

  it('is the one its open end lies against', () => {
    expect(servingNode(r(0, 0, 2.5, 5.5), [aisle])).toBe(0);
  });

  it('is nothing when only part of the mouth is on the aisle', () => {
    // A bay overlapping the aisle by 1.2 m of its 2.5 m width has something
    // parked across the other half.
    expect(servingNode(r(28.8, 0, 2.5, 5.5), [aisle])).toBeNull();
  });

  it('is nothing when the aisle runs past the bonnet rather than the mouth', () => {
    const alongside = r(2.5, 0, 6, 5.5);
    expect(servingNode(r(0, 0, 2.5, 5.5), [alongside])).toBeNull();
  });

  it('reads a bay laid the other way round off its own short side', () => {
    // The orientation sweep lays bays 5.5 wide and 2.5 deep; the mouth is then
    // the vertical edge.
    const across = r(5.5, 0, 6, 30);
    expect(servingNode(r(0, 0, 5.5, 2.5), [across])).toBe(0);
  });

  it('will not use an aisle that is not reachable', () => {
    expect(bayIsServed(r(0, 0, 2.5, 5.5), [aisle], new Set())).toBe(false);
    expect(bayIsServed(r(0, 0, 2.5, 5.5), [aisle], new Set([0]))).toBe(true);
  });
});

describe('a laid-out level', () => {
  it('reserves a cross aisle as soon as there is more than one module to join', () => {
    // Module tests pin the module packer: since the dead-end rule ranks the
    // default, these levels may lay out another arrangement by default.
    const one = run('40', '17', WIDTH);
    const three = run('40', '51', WIDTH);
    expect(one.rects.some((x) => x.row === CROSS_AISLE_ROW)).toBe(false);
    expect(three.rects.some((x) => x.row === CROSS_AISLE_ROW)).toBe(true);
  });

  it('places every bay it reports against an aisle a car can reach', () => {
    for (const [w, h] of [
      ['40', '51'],
      ['60', '52'],
      ['80', '40'],
      ['40', '63'],
    ] as const) {
      const level = run(w, h, WIDTH);
      const drivable = drivableOf(level);
      const entries = drivable
        .map((x, i) => (x.x.isZero() ? i : -1))
        .filter((i) => i >= 0);
      const { reachable } = traceCirculation({
        drivable,
        entries,
        minOpeningM: d(6),
      });
      for (const bay of baysOf(level)) {
        expect(bayIsServed(bay, drivable, reachable), `${w} x ${h} m level`).toBe(true);
      }
    }
  });

  it('strands the far modules the moment the cross aisle is taken away', () => {
    /*
      THE DOCTORED LAYOUT. This is the level as it stood before this module
      existed: three module aisles stacked eleven metres apart with nothing
      joining them, every bay counted. If deleting the cross aisle does not
      strand anything, the check is not measuring what it claims to.
    */
    const level = run('40', '51', WIDTH);
    const honest = drivableOf(level);
    const doctored = honest.filter((x) => x.row !== CROSS_AISLE_ROW);
    const entries = doctored.map((x, i) => (x.x.isZero() ? i : -1)).filter((i) => i >= 0);
    const { reachable } = traceCirculation({
      drivable: doctored,
      entries,
      minOpeningM: d(6),
    });
    const stranded = baysOf(level).filter((b) => !bayIsServed(b, doctored, reachable));
    // Two of the three modules — every bay past the one the driveway lands on.
    expect(stranded.length).toBeGreaterThan(baysOf(level).length / 2);
  });

  it('reaches every aisle from the ramp when there is one', () => {
    // 32 × 40 m: too small round for the ring to be the ramp, so a strip is placed.
    const level = run('32', '40', { includeRamp: true });
    const drivable = drivableOf(level);
    const rampIdx = drivable.findIndex((x) => x.kind === RectKind.RAMP);
    expect(rampIdx).toBeGreaterThanOrEqual(0);
    const { reachable } = traceCirculation({
      drivable,
      entries: [rampIdx],
      minOpeningM: d(6),
    });
    expect(reachable.size).toBe(drivable.length);
  });

  it('charges the cross aisle in bays rather than absorbing it', () => {
    const level = run('40', '51', WIDTH);
    expect(level.losses.circulation.bays).toBeGreaterThan(0);
    expect(level.losses.circulation.areaM2.toNumber()).toBeGreaterThan(0);
    expect(level.notes.join(' ')).toMatch(/cross aisle costs \d+ bays/);
  });

  it('reports the reserved zone and the cross aisle as two different losses', () => {
    const level = layoutParkingLevel({
      tracer: new Tracer(new ProvenanceGraph()),
      footprint: { widthM: d('60'), depthM: d('51') },
      deductions: {
        areaM2: d('300'),
        source: 'ASSUMED',
        basis: 'a fixture deduction, so the two losses can be told apart',
      },
    });
    expect(level.losses.reserved.areaM2.toString()).toBe('300');
    expect(level.losses.reserved.bays).toBeGreaterThan(0);
    expect(level.losses.circulation.bays).toBeGreaterThan(0);
    expect(level.losses.reserved.bays).not.toBe(level.losses.circulation.bays);
  });

  it('never reports a bay it then dropped', () => {
    const level = run('40', '51', WIDTH);
    expect(baysOf(level)).toHaveLength(level.bayCount.value);
    expect(level.losses.circulation.strandedBays).toBe(0);
  });
});

describe('the orientation sweep', () => {
  it('takes the better of the two and records both counts in the formula', () => {
    const graph = new ProvenanceGraph();
    const level = layoutParkingLevel({
      tracer: new Tracer(graph),
      footprint: { widthM: d('80'), depthM: d('40') },
      deductions: {
        areaM2: d(0),
        source: 'ASSUMED',
        basis: 'test fixture takes no deduction so the packing itself is what is measured',
      },
    });
    expect(level.orientation.value).toMatch(
      /^(modules along the (width|depth)|bays to the walls, one ring aisle|bays to the walls and on islands, one-way aisles round them)$/,
    );
    expect(level.orientation.provenanceClass).toBe('DERIVED');

    // The formula names what the other orientation came to. A sweep that only
    // reported its winner would be indistinguishable from one that never tried.
    const formulas = graph.nodes
      .filter((n) => n.formula !== undefined)
      .map((n) => n.formula as string);
    const sweep = formulas.find((f) => f.includes('modules along the width') && f.includes('one ring aisle'));
    expect(sweep).toBeDefined();
    // Every arrangement, each with what it came to, and any dead end over the
    // eight bays B.7.2.3.3 ¶8 asks beside its count.
    expect(sweep).toMatch(
      /\d+ modules along the width( \(a dead end serving \d+ bays\))?, \d+ modules along the depth( \(a dead end serving \d+ bays\))?, \d+ bays to the walls, one ring aisle, \d+ bays to the walls and on islands, one-way aisles round them$/,
    );
  });

  it('gives the same answer for a rectangle and its transpose', () => {
    // Both runs see the same pair of candidates, so they must land on the same
    // count — the sweep is a property of the rectangle, not of how it was typed.
    expect(run('80', '40').bayCount.value).toBe(run('40', '80').bayCount.value);
  });

  it('keeps every rectangle inside the level when the runs are laid the other way', () => {
    // A transpose that forgot to map back would put bays 80 m up a 40 m level.
    const level = run('40', '80');
    for (const rect of level.rects) {
      expect(rect.x.gte(0)).toBe(true);
      expect(rect.y.gte(0)).toBe(true);
      expect(rect.x.plus(rect.width).lte(d('40'))).toBe(true);
      expect(rect.y.plus(rect.height).lte(d('80'))).toBe(true);
    }
  });
});

/*
  ONE WAY. Touching is not the question on a one-way loop: a car that came on an
  aisle at one end cannot drive back to a bay behind it, and an aisle whose only
  way out is upstream of its way in is a trap. These hold `traceOneWay` to that,
  and — because a check that cannot fail is worth nothing — cut the loop once and
  require the level to fall apart where the two-way flood would still say "reached".
*/
describe('one-way circulation', () => {
  const ow = (x: number, y: number, width: number, height: number, travel?: 1 | -1): OneWayRect => ({
    ...r(x, y, width, height),
    ...(travel ? { travel } : {}),
  });
  // A 40 × 30 m ring of 5.5 m one-way aisles, anticlockwise, and a 6 m two-way drive in at x 10–16.
  const bottom = ow(0, 0, 40, 5.5, 1);
  const right = ow(34.5, 5.5, 5.5, 19, 1);
  const top = ow(0, 24.5, 40, 5.5, -1);
  const left = ow(0, 5.5, 5.5, 19, -1);
  const drive = ow(10, -6, 6, 6);
  /** A bay below the bottom aisle, its mouth on it, centred at x + 1.25. */
  const bayAt = (x: number): CircRect => r(x, -5.5, 2.5, 5.5);
  const behind = bayAt(2); // upstream of the way in
  const beyond = bayAt(20); // downstream of it
  const atTheDoor = bayAt(11);

  it('serves a bay behind the way in once the loop brings a car back round to it', () => {
    const drivable = [drive, bottom, right, top, left];
    const circ = traceOneWay({ drivable, entries: [0], minOpeningM: d('5.5') });
    expect(circ.forward.size).toBe(5);
    expect(circ.back.size).toBe(5);
    for (const bay of [behind, beyond, atTheDoor]) expect(oneWayServes(bay, drivable, circ)).toBe(true);
  });

  it('strands everything but the stretch at the door when one side of the loop is taken away', () => {
    const drivable = [drive, bottom, right, top]; // the left side, deleted
    const circ = traceOneWay({ drivable, entries: [0], minOpeningM: d('5.5') });
    // Behind the door: no car reaches it without driving against the arrows.
    expect(oneWayServes(behind, drivable, circ)).toBe(false);
    // Past the door: a car reaches it and can never get back out.
    expect(oneWayServes(beyond, drivable, circ)).toBe(false);
    expect(oneWayServes(atTheDoor, drivable, circ)).toBe(true);
    // The two-way flood says all four aisles are reached — exactly the answer that is wrong here.
    const { reachable } = traceCirculation({ drivable, entries: [0], minOpeningM: d('5.5') });
    expect(bayIsServed(behind, drivable, reachable)).toBe(true);
    expect(bayIsServed(beyond, drivable, reachable)).toBe(true);
  });

  const loopLevel = (): ParkingLayoutResult => run('80', '60', { arrangement: { id: 'ONE_WAY_LOOP' } });

  it('lays the loop on Table B.11’s 5.5 m one-way aisles, each with its direction', () => {
    const level = loopLevel();
    expect(level.arrangement).toBe('ONE_WAY_LOOP');
    const aisles = level.rects.filter((x) => x.kind === RectKind.AISLE && x.row !== ENTRY_DRIVE_ROW);
    expect(aisles.length).toBeGreaterThan(4);
    for (const a of aisles) {
      expect(Decimal.min(a.width, a.height).toString()).toBe('5.5');
      expect(a.travel === 1 || a.travel === -1).toBe(true);
    }
    // The drive in is two-way and keeps Table B.11's 6 m.
    const drive = level.rects.find((x) => x.row === ENTRY_DRIVE_ROW);
    expect(drive?.width.toString()).toBe('6');
    expect(drive?.travel).toBeUndefined();
    expect(level.notes.join(' ')).toMatch(/5\.5 m aisles \(DBC Table B\.11, 90° parking, one way\)/);
  });

  it('places every bay it reports where a car driving with the traffic passes it and gets out', () => {
    const level = loopLevel();
    const drivable = drivableOf(level);
    const entries = drivable.map((x, i) => (x.row === ENTRY_DRIVE_ROW ? i : -1)).filter((i) => i >= 0);
    expect(entries).toHaveLength(1);
    const circ = traceOneWay({ drivable, entries, minOpeningM: d('5.5') });
    const bays = baysOf(level);
    expect(bays).toHaveLength(level.bayCount.value);
    for (const bay of bays) expect(oneWayServes(bay, drivable, circ)).toBe(true);
  });

  it('falls apart the moment one side of the ring is deleted', () => {
    const level = loopLevel();
    const honest = drivableOf(level);
    // The near short side of the ring, the one that brings a car back to the start.
    const side = honest.find((x) => x.row === RING_AISLE_ROW && x.travel === -1 && x.height.gt(x.width));
    expect(side).toBeDefined();
    const doctored = honest.filter((x) => x !== side);
    const entries = doctored.map((x, i) => (x.row === ENTRY_DRIVE_ROW ? i : -1)).filter((i) => i >= 0);
    const circ = traceOneWay({ drivable: doctored, entries, minOpeningM: d('5.5') });
    const stranded = baysOf(level).filter((b) => !oneWayServes(b, doctored, circ));
    expect(stranded.length).toBeGreaterThan(baysOf(level).length / 2);
  });

  it('has no dead end: every aisle is on the loop', () => {
    const level = run('80', '60');
    const loop = level.arrangements.find((a) => a.id === 'ONE_WAY_LOOP');
    expect(loop?.deadEnds).toEqual([]);
  });
});
