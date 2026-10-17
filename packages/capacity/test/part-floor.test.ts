/**
 * THE PART FLOOR STANDS. 17 Oct 2026, wave 3.
 *
 * The governing capacity is min(A, B, C) and it is almost never a whole number
 * of tower plates. For a day it was held to whole plates and the remainder was
 * dropped — 9,677.42 m² reported as 8,960 on the worked example — which made the
 * drawing true by cutting the answer. Now the remainder stands on the drawn
 * building as a smaller top floor, ASSUMED; a remainder too small to be a floor
 * is dropped and said. Every assertion is on the real pipeline.
 */

import { asMm, Decimal, type Mm } from '@envelope/core';
import { area, initGeometry, intersect, type Ring, scaleToArea } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { RECT_80x40, runInput } from '../../../test-support/pipeline.js';
import { buildAssumptionRegister, partFloorRing, type RunOutput, runPipeline } from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

const minOf = (out: RunOutput): Decimal =>
  Decimal.min(
    out.capacity.regulationLimitedGfa.value,
    out.capacity.geometryLimitedGfa.value,
    out.capacity.parkingLimitedGfa.value,
  );

const ringM2 = (ring: readonly { x: number; y: number }[]): number => Math.abs(area(ring as Ring)) / 1e6;

/** Every corner of `inner` inside `outer`, measured by the kernel's own intersection. */
const holds = (outer: readonly { x: number; y: number }[], inner: readonly { x: number; y: number }[]): boolean =>
  intersect(inner as Ring, outer as Ring).reduce((s, r) => s + Math.abs(area(r)), 0) >= Math.abs(area(inner as Ring)) * 0.9999;

describe('the governing capacity is min(A, B, C), and the part floor stands', () => {
  let out: RunOutput;
  beforeAll(() => {
    out = runPipeline(runInput(RECT_80x40));
  });

  it('reports min(A, B, C) to the square metre, not the whole plates under it', () => {
    const plate = out.envelope.towerPlateCap.value;
    const whole = plate.times(out.capacity.levels.value);
    expect(minOf(out).gt(whole)).toBe(true); // the case this exists for: a remainder
    expect(out.capacity.governingGfa.value.toString()).toBe(minOf(out).toString());
    expect(out.capacity.integerGranularityLossM2.isZero()).toBe(true);
  });

  it('draws the remainder as one top floor at its own area, above the whole levels, holding the core', () => {
    expect(out.partFloor?.kind).toBe('DRAWN');
    if (out.partFloor?.kind !== 'DRAWN') return;
    const remainder = minOf(out).minus(out.envelope.towerPlateCap.value.times(out.capacity.levels.value));
    expect(out.partFloor.areaM2.value.toString()).toBe(remainder.toString());

    const parts = out.building.levels.filter((l) => l.partFloor);
    expect(parts).toHaveLength(1);
    const level = parts[0]!;
    expect(level.placed).toBe(true);
    expect(level.parking).toBeNull();
    // The topmost placed level: a smaller floor under a larger one would hang the plate above it in the air.
    expect(out.building.levels.filter((l) => l.placed).at(-1)!.id).toBe(level.id);
    // Drawn at the engine's area, to the rounding of a millimetre ring.
    expect(Math.abs(ringM2(level.outline) - remainder.toNumber())).toBeLessThan(0.5);
    // Inside the tower plate, and the core inside it.
    expect(holds(out.envelope.plateRing, level.outline)).toBe(true);
    expect(holds(level.outline, out.building.core!.outline)).toBe(true);
    expect(out.building.core!.levelIds).toContain(level.id);
  });

  it('is amber: the rule is ASSUMED, the part floor takes its class, and so does the governing figure', () => {
    if (out.partFloor?.kind !== 'DRAWN') throw new Error('no part floor drawn');
    expect(out.partFloor.rule.provenanceClass).toBe('ASSUMED');
    expect(out.partFloor.areaM2.provenanceClass).toBe('ASSUMED');
    expect(out.capacity.governingGfa.provenanceClass).toBe('ASSUMED');
    const level = out.building.levels.find((l) => l.partFloor)!;
    expect(level.outlineSource.provenanceClass).toBe('ASSUMED');
    expect(level.outlineSource.node).toBe(out.partFloor.areaM2.node);
    expect(out.graph.hasKindBelow(out.capacity.governingGfa.node, 'ASSUMPTION')).toBe(true);
  });

  it('names the open question in its basis, with what leaving it out would report', () => {
    const register = buildAssumptionRegister(runInput(RECT_80x40), out);
    const rule = register.find((r) => r.parameterId === 'building.part_floor_rule')!;
    expect(rule).toBeDefined();
    expect(rule.basis).toContain('question still open with the client');
    expect(rule.basis).toContain(
      out.envelope.towerPlateCap.value.times(out.capacity.levels.value).toFixed(2),
    );
    // The smallest top floor is an assumption too, and it is measured, not left null.
    const minimum = register.find((r) => r.parameterId === 'capacity.part_floor_minimum_m2')!;
    expect(minimum).toBeDefined();
    expect(minimum.basis).toContain('core');
    expect(minimum.sensitivity).not.toBeNull();
  });

  it('counts one height: the part floor is a storey on the cover, in the sections and in the schedule', () => {
    const top = out.building.levels
      .filter((l) => l.placed && l.elevationMm >= 0)
      .reduce((t, l) => Math.max(t, l.elevationMm + l.heightMm), 0);
    expect(out.capacity.achievedHeightM.value.toString()).toBe(new Decimal(top).div(1000).toString());
    const level = out.building.levels.find((l) => l.partFloor)!;
    const row = out.levelAreas.find((l) => l.levelId === level.id)!;
    expect(row.standsInHeight).toBe(true);
    expect(row.countedInGfa).toBe(true);
    expect(row.gfaM2!.node).toBe(level.partFloor!.areaM2.node);
    const counted = out.levelAreas
      .filter((l) => l.countedInGfa)
      .reduce((s, l) => s.plus(l.gfaM2!.value), new Decimal(0));
    expect(counted.toString()).toBe(out.gfaStatement.proposedGfaM2.value.toString());
    expect(out.gfaStatement.proposedGfaM2.value.toString()).toBe(out.capacity.governingGfa.value.toString());
    expect(out.gfaStatement.rows.find((r) => r.kind === 'PART_FLOOR')?.levelIds).toEqual([level.id]);
  });

  it('places it in words, under the assumption it rests on', () => {
    const said = out.building.placements.find((p) => p.subject === 'part floor')!;
    expect(said.source.provenanceClass).toBe('ASSUMED');
    const level = out.building.levels.find((l) => l.partFloor)!;
    expect(said.statement).toContain(`${level.id} is a smaller top floor`);
    expect(level.name).toMatch(/ · part floor$/);
  });
});

describe('a part floor too small to be a floor', () => {
  it('is dropped, said with both figures, and the governing capacity is the whole levels', () => {
    const base = runPipeline(runInput(RECT_80x40));
    if (base.partFloor?.kind !== 'DRAWN') throw new Error('the fixture has no part floor to drop');
    // A stated smallest top floor a square metre above the part floor.
    const stated = base.partFloor.areaM2.value.plus(1);
    const out = runPipeline(runInput(RECT_80x40, { partFloorMinimumM2: stated }));
    expect(out.partFloor?.kind).toBe('DROPPED');
    if (out.partFloor?.kind !== 'DROPPED') return;
    const whole = out.envelope.towerPlateCap.value.times(out.capacity.levels.value);
    expect(out.capacity.governingGfa.value.toString()).toBe(whole.toString());
    expect(out.capacity.integerGranularityLossM2.toString()).toBe(base.partFloor.areaM2.value.toString());
    expect(out.partFloor.minimum?.provenanceClass).toBe('USER_SET');
    expect(out.partFloor.reason).toContain(base.partFloor.areaM2.value.toFixed(2));
    expect(out.partFloor.reason).toContain(stated.toFixed(2));
    expect(out.partFloor.reason).toContain(whole.toFixed(2));
    // A stated minimum is a person's figure: the sentence may not call it the engine's "core and one unit".
    expect(out.partFloor.reason).toContain('stated as the smallest top floor');
    expect(out.partFloor.reason).not.toContain('core and one unit');
    // Said under every drawing, and nothing drawn. (Its Arabic: `apps/api/test/part-floor.test.ts`.)
    expect(out.building.notModelled).toContain(out.partFloor.reason);
    expect(out.building.levels.some((l) => l.partFloor)).toBe(false);
    // One height: one storey fewer than with the part floor.
    expect(out.levelsAboveGround.value.toNumber()).toBe(base.levelsAboveGround.value.toNumber() - 1);
    expect(out.gfaStatement.partFloorNotPlacedM2.toString()).toBe(base.partFloor.areaM2.value.toString());
    expect(out.gfaStatement.rows.some((r) => r.kind === 'PART_FLOOR')).toBe(false);
  });
});

describe('the ring rule', () => {
  const mm = (x: number, y: number): { x: Mm; y: Mm } => ({ x: asMm(x * 1000), y: asMm(y * 1000) });
  const plate: Ring = [mm(0, 0), mm(40, 0), mm(40, 20), mm(0, 20)];

  it('is the plate scaled about its centre where the core stands there', () => {
    const core = scaleToArea(plate, 144e6);
    const r = partFloorRing({ plateRing: plate, coreRing: core, coreAreaM2: new Decimal(144), areaM2: new Decimal(400) });
    expect(r.kind).toBe('PLACED');
    if (r.kind !== 'PLACED') return;
    expect(r.aboutCore).toBe(false);
    expect(r.ring).toEqual(scaleToArea(plate, 400e6));
  });

  it('is scaled about the point the core is scaled about where the core was moved, and holds it', () => {
    // The core scaled about the plate's centre, then moved whole 8 m east, as `solveCore` moves it toward the island.
    const core = scaleToArea(plate, 144e6).map((p) => ({ x: asMm(p.x + 8000), y: p.y }));
    expect(holds(plate, core)).toBe(true);
    // Scaled about the plate's centre instead, the part floor would leave the core sticking out of it.
    expect(holds(scaleToArea(plate, 300e6), core)).toBe(false);
    const r = partFloorRing({ plateRing: plate, coreRing: core, coreAreaM2: new Decimal(144), areaM2: new Decimal(300) });
    expect(r.kind).toBe('PLACED');
    if (r.kind !== 'PLACED') return;
    expect(r.aboutCore).toBe(true);
    expect(holds(plate, r.ring)).toBe(true);
    expect(holds(r.ring, core)).toBe(true);
    // To the rounding of a millimetre ring: 0.015 m² on 300.
    expect(Math.abs(ringM2(r.ring) - 300)).toBeLessThan(0.05);
  });
});
