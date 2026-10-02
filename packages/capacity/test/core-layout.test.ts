/**
 * The indicative core layout — stair, lift, lift, stair, and the lobby in front.
 *
 * What is at risk is a layout that claims more than it is: rooms that fall
 * outside the core, a program squeezed into a core it does not fit, or a stair
 * drawn without the assumption it rests on. The assertions are about those.
 */

import { asMm, ProvenanceClass, ProvenanceGraph, Tracer } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { RECT_120x80, runInput } from '../../../test-support/pipeline.js';
import { CORE_LAYOUT_BASIS, layoutCore, runPipeline } from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

const tracer = (): Tracer => new Tracer(new ProvenanceGraph());
const rect = (x0: number, y0: number, w: number, d: number) =>
  [
    { x: asMm(x0), y: asMm(y0) },
    { x: asMm(x0 + w), y: asMm(y0) },
    { x: asMm(x0 + w), y: asMm(y0 + d) },
    { x: asMm(x0), y: asMm(y0 + d) },
  ] as const;

const inside = (p: { x: number; y: number }, x0: number, y0: number, w: number, d: number) =>
  p.x >= x0 - 1 && p.x <= x0 + w + 1 && p.y >= y0 - 1 && p.y <= y0 + d + 1;

describe('a core large enough for the full program', () => {
  const layout = layoutCore({ tracer: tracer(), ring: rect(10_000, 20_000, 18_000, 7_000) });

  it('draws two stairs, two lifts and a lobby', () => {
    expect(layout.kind).toBe('LAID_OUT');
    if (layout.kind !== 'LAID_OUT') return;
    expect(layout.rooms.map((r) => r.kind)).toEqual(['STAIR', 'LIFT', 'LIFT', 'STAIR', 'LOBBY']);
  });

  it('keeps every room inside the core', () => {
    if (layout.kind !== 'LAID_OUT') throw new Error('not laid out');
    for (const room of layout.rooms) {
      for (const p of room.outline) expect(inside(p, 10_000, 20_000, 18_000, 7_000)).toBe(true);
    }
  });

  it('rests on one assumption, stated with its basis and that egress is not assessed', () => {
    if (layout.kind !== 'LAID_OUT') throw new Error('not laid out');
    expect(layout.program.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    expect(CORE_LAYOUT_BASIS).toMatch(/NOT\s+ASSESSED/);
    expect(CORE_LAYOUT_BASIS).toMatch(/not an egress design/);
  });
});

describe('a core with room for one lift only', () => {
  it('draws one lift rather than squeezing in two', () => {
    const layout = layoutCore({ tracer: tracer(), ring: rect(0, 0, 14_000, 6_000) });
    expect(layout.kind).toBe('LAID_OUT');
    if (layout.kind !== 'LAID_OUT') return;
    expect(layout.rooms.filter((r) => r.kind === 'LIFT')).toHaveLength(1);
  });
});

describe('a core too small for the program', () => {
  it('draws nothing inside it, and says why', () => {
    const narrow = layoutCore({ tracer: tracer(), ring: rect(0, 0, 12_000, 8_000) });
    const shallow = layoutCore({ tracer: tracer(), ring: rect(0, 0, 20_000, 4_000) });
    for (const layout of [narrow, shallow]) {
      expect(layout.kind).toBe('NOT_LAID_OUT');
      if (layout.kind === 'NOT_LAID_OUT') expect(layout.reason).toMatch(/Nothing is drawn/);
    }
  });
});

describe('a core that is not a rectangle', () => {
  it('draws nothing inside it', () => {
    const skew = [
      { x: asMm(0), y: asMm(0) },
      { x: asMm(20_000), y: asMm(0) },
      { x: asMm(24_000), y: asMm(8_000) },
      { x: asMm(0), y: asMm(8_000) },
    ];
    expect(layoutCore({ tracer: tracer(), ring: skew }).kind).toBe('NOT_LAID_OUT');
  });
});

describe('a rotated core', () => {
  it('lays the rooms along its own long side, not the plot axes', () => {
    // A 18 × 7 m rectangle turned 30°.
    const c = Math.cos(Math.PI / 6);
    const s = Math.sin(Math.PI / 6);
    const turn = (x: number, y: number) => ({ x: asMm(Math.round(x * c - y * s)), y: asMm(Math.round(x * s + y * c)) });
    const layout = layoutCore({
      tracer: tracer(),
      ring: [turn(0, 0), turn(18_000, 0), turn(18_000, 7_000), turn(0, 7_000)],
    });
    expect(layout.kind).toBe('LAID_OUT');
    if (layout.kind !== 'LAID_OUT') return;
    const [o, a] = layout.rooms[0]!.outline;
    expect(Math.atan2(a!.y - o!.y, a!.x - o!.x)).toBeCloseTo(Math.PI / 6, 2);
  });
});

describe('in a run', () => {
  it('puts the rooms on the model’s core, sourced from the assumed program', () => {
    const out = runPipeline(runInput(RECT_120x80));
    const core = out.building.core!;
    expect(core.rooms?.length).toBeGreaterThan(0);
    expect(core.roomsSource?.provenanceClass).toBe(ProvenanceClass.ASSUMED);
  });
});
