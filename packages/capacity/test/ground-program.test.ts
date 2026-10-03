/**
 * The indicative ground-floor program in the reserved strip.
 *
 * At risk: rooms outside the strip, rooms squeezed into a strip too short for
 * them, and a program drawn without the assumption it rests on.
 */

import { asMm, ProvenanceClass, ProvenanceGraph, Tracer } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { RECT_120x80, runInput } from '../../../test-support/pipeline.js';
import { GROUND_PROGRAM_BASIS, layoutGroundProgram, runPipeline } from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

const tracer = (): Tracer => new Tracer(new ProvenanceGraph());
const rect = (x0: number, y0: number, w: number, d: number) => [
  { x: asMm(x0), y: asMm(y0) },
  { x: asMm(x0 + w), y: asMm(y0) },
  { x: asMm(x0 + w), y: asMm(y0 + d) },
  { x: asMm(x0), y: asMm(y0 + d) },
];

describe('a strip long enough for the whole program', () => {
  const program = layoutGroundProgram({ tracer: tracer(), zone: rect(0, 0, 50_000, 6_000) });

  it('lays every room, entrance first, inside the strip', () => {
    expect(program.kind).toBe('LAID_OUT');
    if (program.kind !== 'LAID_OUT') return;
    expect(program.rooms[0]!.name).toBe('ENTRANCE LOBBY');
    expect(program.notPlaced).toEqual([]);
    for (const room of program.rooms) {
      for (const p of room.outline) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(50_000);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(6_000);
      }
    }
  });

  it('rests on one assumption that says no room is sized against a requirement', () => {
    if (program.kind !== 'LAID_OUT') throw new Error('not laid out');
    expect(program.program.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    expect(GROUND_PROGRAM_BASIS).toMatch(/not figures from a DEWA/);
  });
});

describe('a short strip', () => {
  it('lays what fits and names the rest, rather than squeezing it', () => {
    const program = layoutGroundProgram({ tracer: tracer(), zone: rect(0, 0, 20_000, 6_000) });
    expect(program.kind).toBe('LAID_OUT');
    if (program.kind !== 'LAID_OUT') return;
    expect(program.notPlaced.length).toBeGreaterThan(0);
    const width = program.rooms.reduce(
      (t, r) => t + Math.abs(r.outline[1]!.x - r.outline[0]!.x),
      0,
    );
    expect(width).toBeLessThanOrEqual(20_000);
  });
});

describe('a deep strip', () => {
  it('keeps rooms no deeper than 7 m, on the side away from the core', () => {
    const program = layoutGroundProgram({
      tracer: tracer(),
      zone: rect(0, 0, 50_000, 16_000),
      towards: { x: 25_000, y: 40_000 },
    });
    if (program.kind !== 'LAID_OUT') throw new Error('not laid out');
    for (const room of program.rooms) {
      const ys = room.outline.map((p) => p.y);
      expect(Math.max(...ys) - Math.min(...ys)).toBe(7_000);
      expect(Math.max(...ys)).toBeLessThanOrEqual(7_000);
    }
  });
});

describe('a strip too shallow', () => {
  it('holds no room, and says why', () => {
    const program = layoutGroundProgram({ tracer: tracer(), zone: rect(0, 0, 50_000, 2_000) });
    expect(program.kind).toBe('NOT_LAID_OUT');
  });
});

describe('in a run', () => {
  it('draws the rooms on the parking level at grade only', () => {
    const out = runPipeline(runInput(RECT_120x80));
    const ground = out.building.levels.find((l) => l.parking && l.elevationMm === 0);
    expect(out.building.groundRooms?.levelId).toBe(ground?.id);
    expect(out.building.groundRooms?.source.provenanceClass).toBe(ProvenanceClass.ASSUMED);
  });
});
