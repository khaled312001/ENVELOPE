/**
 * The GFA statement — the area table a submission drawing carries.
 *
 * What is at risk is not the arithmetic, which is one product and one sum. It is
 * the statement drifting from the run it summarises: a residential row that is not
 * the plate the run used, a proposal that exceeds what FAR allows, a parking row
 * printed where parking was never GFA. So the assertions hold every figure to the
 * engine's own node for it.
 */

import { Decimal, NodeKind, ProvenanceClass } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { RECT_80x40, RECT_120x80, runInput } from '../../../test-support/pipeline.js';
import { GfaRowKind, runPipeline, toFt2, type RunOutput } from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

const farOf = (out: RunOutput): Decimal => out.capacity.permittedFar.value;

/** The rule id one computation away from a value: value → computation → rule. */
function ruleOf(out: RunOutput, node: string): string | undefined {
  const graph = out.graph.toJSON();
  const computation = graph.edges.find((e) => e.from === node)?.to;
  return graph.edges
    .filter((e) => e.from === computation)
    .map((e) => graph.nodes.find((n) => n.id === e.to))
    .find((n) => n?.kind === NodeKind.RULE)?.ruleId;
}
const plotAreaOf = (ring: typeof RECT_80x40): Decimal => {
  const xs = ring.map((p) => p.x);
  const ys = ring.map((p) => p.y);
  return new Decimal(Math.max(...xs) - Math.min(...xs))
    .times(Math.max(...ys) - Math.min(...ys))
    .div(1_000_000);
};

describe('with parking excluded from FAR', () => {
  let out: RunOutput;
  beforeAll(() => {
    out = runPipeline(runInput(RECT_120x80));
  });

  it('allows FAR × plot area, derived from the FAR rule', () => {
    const s = out.gfaStatement;
    expect(s.allowedGfaM2.value.toString()).toBe(
      farOf(out).times(plotAreaOf(RECT_120x80)).toString(),
    );
    expect(s.allowedGfaM2.provenanceClass).toBe(ProvenanceClass.DERIVED);
    // DERIVED means a cited rule is reachable — and it is the rule band A cites.
    expect(ruleOf(out, s.allowedGfaM2.node)).toBeDefined();
    expect(ruleOf(out, s.allowedGfaM2.node)).toBe(
      ruleOf(out, out.capacity.regulationLimitedGfa.node),
    );
  });

  it('proposes the run’s own plate, times the run’s own whole levels', () => {
    const [row, ...rest] = out.gfaStatement.rows;
    expect(rest).toEqual([]);
    expect(row!.kind).toBe(GfaRowKind.RESIDENTIAL);
    expect(row!.perLevelM2).toBe(out.envelope.towerPlateCap);
    expect(row!.count).toBe(out.capacity.levels.value);
    expect(row!.areaM2.value.toString()).toBe(
      out.envelope.towerPlateCap.value.times(out.capacity.levels.value).toString(),
    );
  });

  it('labels the residential row only with levels that count the same as the row', () => {
    /*
      The answer counts whole levels of tower plate; the model places levels on
      a height schedule where the ground floor may be parking. On this plot they
      differ — 14 levels of plate in the answer, L01–L13 above a parking ground
      floor in the model — and a label list that disagreed with the count would
      name floors the row is not. So the ids are given when they agree, and
      withheld when they do not.
    */
    const [row] = out.gfaStatement.rows;
    const placed = out.building.levels
      .filter((l) => l.placed && (l.use === 'TYPICAL' || l.use === 'PODIUM'))
      .map((l) => l.id);
    if (placed.length === row!.count) expect(row!.levelIds).toEqual(placed);
    else expect(row!.levelIds).toEqual([]);
  });

  it('prints no parking row: excluded parking is not GFA, and a zero would say it is', () => {
    expect(out.gfaStatement.rows.some((r) => r.kind === GfaRowKind.PARKING)).toBe(false);
  });

  it('never proposes more than FAR allows, and says what is left', () => {
    const s = out.gfaStatement;
    expect(s.proposedGfaM2.value.lte(s.allowedGfaM2.value)).toBe(true);
    expect(s.remainingGfaM2.value.toString()).toBe(
      s.allowedGfaM2.value.minus(s.proposedGfaM2.value).toString(),
    );
  });

  it('names the part floor the governing capacity holds above the last whole floor', () => {
    const s = out.gfaStatement;
    expect(s.partFloorNotPlacedM2.toString()).toBe(
      out.capacity.governingGfa.value.minus(s.rows[0]!.areaM2.value).toString(),
    );
    expect(s.partFloorNotPlacedM2.lt(out.envelope.towerPlateCap.value)).toBe(true);
  });
});

describe('with parking counted toward FAR', () => {
  let out: RunOutput;
  beforeAll(() => {
    out = runPipeline(runInput(RECT_120x80, { parkingInFar: 'COUNTS_TOWARD_FAR' }));
  });

  it('adds the parking band A deducted, as its own row', () => {
    const parking = out.gfaStatement.rows.find((r) => r.kind === GfaRowKind.PARKING);
    expect(parking).toBeDefined();
    expect(parking!.areaM2).toBe(out.parking.requiredAreaM2);
    expect(parking!.perLevelM2).toBeNull();
  });

  it('proposes residential plus parking, still within the gross allowance', () => {
    const s = out.gfaStatement;
    const sum = s.rows.reduce((a, r) => a.plus(r.areaM2.value), new Decimal(0));
    expect(s.proposedGfaM2.value.toString()).toBe(sum.toString());
    expect(s.proposedGfaM2.value.lte(s.allowedGfaM2.value)).toBe(true);
  });
});

describe('square feet', () => {
  it('converts at exactly 0.3048 m to the foot', () => {
    expect(toFt2(new Decimal(1)).toFixed(6)).toBe('10.763910');
    expect(toFt2(new Decimal('0.09290304')).toString()).toBe('1');
    // The typical floor on the client's own table, 625.55 m², at the exact factor.
    expect(toFt2(new Decimal('625.55')).toFixed(2)).toBe('6733.36');
  });
});

describe('a small plot', () => {
  it('still states a whole table, whatever governs', () => {
    const s = runPipeline(runInput(RECT_80x40)).gfaStatement;
    expect(s.rows.length).toBeGreaterThan(0);
    expect(s.proposedGfaM2.value.gte(0)).toBe(true);
    expect(s.remainingGfaM2.value.gte(0)).toBe(true);
  });
});
