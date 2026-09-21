/**
 * The setback↔floor-count fixpoint.
 *
 * This is the test that proves the finding in `CLAUDE.md`: the deck's headline
 * example is circular, `FR-PLT-002` specifies a one-directional pipeline, and a
 * one-directional pipeline cannot compute it. Everything here exercises the
 * §11.7 machinery applied beyond its stated scope.
 */

import {
  asMm,
  EdgeClassification,
  LandUse,
  type Mm,
  type Plot,
  ProvenanceGraph,
  ShapeClass,
  Tracer,
} from '@envelope/core';
import { analysePlot, initGeometry, type Ring } from '@envelope/geometry';
import { loadSeedRulesForDevelopment, RuleStore, asOfNow } from '@envelope/rules';
import { Decimal } from 'decimal.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { EnvelopeHaltedError, FixpointStatus, MAX_ITERATIONS, runFixpoint, solveEnvelope } from '../src/index.js';

const ACK = 'I understand these rules are not approved';
const m = (v: number): Mm => asMm(Math.round(v * 1000));
const pt = (x: number, y: number) => ({ x: m(x), y: m(y) });

/** The deck's plot: 80 × 40 m. Two road frontages, two party boundaries. */
function makePlot(ring: Ring, classifications: readonly EdgeClassification[]): Plot {
  const g = analysePlot(ring);
  const edges = ring.map((start, i) => {
    const end = ring[(i + 1) % ring.length]!;
    const cls = classifications[i]!;
    return {
      seq: i,
      start,
      end,
      classification: cls,
      ...(cls === EdgeClassification.ROAD ? { roadHierarchy: 'LOCAL' as const } : {}),
      lengthMm: asMm(Math.round(Math.hypot(end.x - start.x, end.y - start.y))),
      bearingDeg: new Decimal(0),
    };
  });
  return {
    plotId: 'test-plot',
    tenantId: 't',
    plotNumber: '000-000',
    community: 'TEST',
    landUse: LandUse.RESIDENTIAL_MULTI,
    ring,
    edges,
    shapeClass: g.shapeClass as ShapeClass,
    statedAreaM2: undefined,
    computedAreaMm2: g.areaMm2,
    areaMismatch: false,
    principalAxisDeg: g.principalAxisDeg,
    mbrWidthMm: g.mbr.widthMm,
    mbrDepthMm: g.mbr.depthMm,
    convexityRatio: g.convexityRatio,
    frontageCount: edges.filter((e) => e.classification === EdgeClassification.ROAD).length,
  };
}

const PLOT_80x40: Ring = [pt(0, 0), pt(80, 0), pt(80, 40), pt(0, 40)];

const solve = (plot: Plot) => {
  const graph = new ProvenanceGraph();
  const tracer = new Tracer(graph);
  const rules = loadSeedRulesForDevelopment(ACK);
  const store = new RuleStore().add(...rules);
  const loaded = store.load(asOfNow('2026-08-30'));
  return { result: solveEnvelope({ plot, rules: loaded, tracer, context: {} }), graph };
};

beforeAll(async () => {
  await initGeometry();
});

describe('the fixpoint machinery — PRD §11.7', () => {
  it('converges as soon as the rule set stops changing, not when the value settles', () => {
    // seed 10 → 8. Both select the HIGH tier, so the applicable rule set is
    // identical across the two and the fixpoint is done — even though the value
    // would keep moving if it were iterated further. That is §11.7 step 3
    // working as specified, and it is the whole reason convergence is tested on
    // the rule set: the answer does not depend on where inside a tier you land.
    const out = runFixpoint<number>({
      seed: 10,
      step: (s) => ({ next: Math.max(4, s - 2), note: `${s} → ${Math.max(4, s - 2)}` }),
      ruleSetKey: (s) => (s >= 8 ? 'HIGH' : s >= 5 ? 'MID' : 'LOW'),
    });
    expect(out.status).toBe(FixpointStatus.CONVERGED);
    expect(out.state).toBe(8);
    expect(out.iterations).toBe(1);
  });

  it('keeps iterating while the tier keeps changing', () => {
    const out = runFixpoint<number>({
      seed: 12,
      step: (s) => ({ next: Math.max(3, s - 3), note: '' }),
      ruleSetKey: (s) => (s >= 10 ? 'A' : s >= 7 ? 'B' : s >= 4 ? 'C' : 'D'),
    });
    expect(out.status).toBe(FixpointStatus.CONVERGED);
    expect(out.state).toBe(3);
    expect(out.iterations).toBe(4);
  });

  it('converges on the RULE SET, not the value — §11.7 step 3', () => {
    // The value never settles, but the rule set does immediately. §11.7 is
    // explicit: "load can oscillate within a band while the rule set is stable."
    let n = 0;
    const out = runFixpoint<number>({
      seed: 100,
      step: (s) => ({ next: s + (n++ % 2 === 0 ? 1 : -1), note: 'jitter' }),
      ruleSetKey: () => 'STABLE',
    });
    expect(out.status).toBe(FixpointStatus.CONVERGED);
    expect(out.iterations).toBe(1);
  });

  it('is bounded at five iterations — §11.7 step 4', () => {
    const out = runFixpoint<number>({
      seed: 0,
      step: (s) => ({ next: s + 1, note: '' }),
      ruleSetKey: (s) => `K${s}`,
    });
    expect(out.iterations).toBe(MAX_ITERATIONS);
    expect(out.status).toBe(FixpointStatus.NON_CONVERGENT_APPLICABILITY);
  });

  it('names the oscillating rules rather than choosing — §11.7 step 5', () => {
    const out = runFixpoint<number>({
      seed: 0,
      // Alternates between two rule sets that differ by exactly one rule.
      step: (s) => ({ next: s + 1, note: '' }),
      ruleSetKey: (s) => (s % 2 === 0 ? 'R-STABLE|R-EVEN' : 'R-STABLE|R-ODD'),
      describeThreshold: (a, b) => `between ${a} and ${b}`,
    });
    expect(out.status).toBe(FixpointStatus.NON_CONVERGENT_APPLICABILITY);
    // R-STABLE appears in every iteration and must not be blamed.
    expect(out.oscillating).toEqual(['R-EVEN', 'R-ODD']);
    expect(out.straddledThreshold).toContain('between');
  });

  it('records the full iteration history — §11.7 step 6', () => {
    const out = runFixpoint<number>({
      seed: 12,
      step: (s) => ({ next: Math.max(6, s - 3), note: `assumed ${s}` }),
      ruleSetKey: (s) => (s >= 10 ? 'A' : s >= 7 ? 'B' : 'C'),
    });
    expect(out.history.length).toBeGreaterThan(0);
    expect(out.history[0]!.note).toBe('assumed 12');
    expect(out.history.every((h) => typeof h.ruleSetKey === 'string')).toBe(true);
  });
});

describe('envelope solver — the circular setback case', () => {
  it('converges in one pass when the seed and the answer share a setback tier', () => {
    // 80 × 40 m at FAR 5.0. The height ceiling seeds 14 levels; the plate cap
    // settles the answer at 13. Both are at or above the G+9 threshold, so the
    // 7.50 m tier fires either way and the rule set never changes. One iteration
    // is the correct and complete answer here — and it is why a one-pass solver
    // looks fine on this particular plot.
    const plot = makePlot(PLOT_80x40, [
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
    ]);
    const { result } = solve(plot);

    expect(result.fixpointConverged).toBe(true);
    expect(result.fixpointIterations).toBe(1);

    const boundary = result.appliedSetbacks.filter(
      (s) => s.ruleId === 'R-SETBACK-BOUNDARY-RES',
    );
    expect(boundary.length).toBe(2);
    expect(boundary.every((b) => b.valueM.toString() === '7.5')).toBe(true);
  });

  /**
   * The case that settles the argument.
   *
   * At a lower FAR the plot needs far fewer levels, so the settled level count
   * lands in a *different* setback tier from the conservative seed. A solver
   * that made one pass — which is exactly what `FR-PLT-002` specifies — would
   * apply the seed's 7.50 m setback and report a footprint that is wrong by the
   * area of a 3 m strip around two sides of the plot.
   */
  it('iterates to a different tier than the seed, where a one-pass solver would be wrong', () => {
    const plot = makePlot(PLOT_80x40, [
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
    ]);
    const rules = loadSeedRulesForDevelopment(ACK).map((r) =>
      r.ruleId === 'R-FAR-MAX-RES' ? { ...r, evaluatorArgs: { value: '2.00' } } : r,
    );
    const graph = new ProvenanceGraph();
    const result = solveEnvelope({ plot, rules, tracer: new Tracer(graph), context: {} });

    expect(result.fixpointConverged).toBe(true);
    // Strictly more than one iteration: the tier moved, so the rule set the
    // solver resolved against changed and had to be recomputed.
    expect(result.fixpointIterations).toBeGreaterThan(1);

    const boundary = result.appliedSetbacks.filter(
      (s) => s.ruleId === 'R-SETBACK-BOUNDARY-RES',
    );
    // The seed (14 levels) selects 7.50 m. The settled answer selects a lower
    // tier — proof the iteration changed the geometry, not just the bookkeeping.
    expect(boundary.every((b) => b.valueM.lt('7.5'))).toBe(true);

    // And the first iteration's note records what the seed would have produced,
    // so the difference is visible in the provenance rather than only in a test.
    expect(result.fixpoint.history[0]!.note).toMatch(/assumed 14 level/);
  });

  it('names the binding constraint for every dimension it reports', () => {
    const plot = makePlot(PLOT_80x40, [
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
    ]);
    const { result } = solve(plot);
    const dims = result.bindingConstraints.map((b) => b.dimension);
    expect(dims).toContain('podium_footprint');
    expect(dims).toContain('levels');
    for (const b of result.bindingConstraints) {
      expect(b.ruleId).toBeTruthy();
      expect(b.label).toBeTruthy();
    }
  });

  it('every emitted value carries a provenance class — M-PRV', () => {
    const plot = makePlot(PLOT_80x40, [
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
    ]);
    const { result, graph } = solve(plot);

    for (const t of [
      result.setbackPermittedFootprint,
      result.coverageCap,
      result.podiumFootprint,
      result.towerPlateCap,
      result.heightCeilingM,
      result.maxLevelsByHeight,
    ]) {
      expect(t.provenanceClass).toBeTruthy();
      expect(t.node).toBeTruthy();
    }

    // Every VALUE node in the graph, not only the ones we happened to check.
    const values = graph.nodes.filter((n) => n.kind === 'VALUE');
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((n) => n.provenanceClass !== undefined)).toBe(true);
  });

  it('a DERIVED value reaches a cited rule in its derivation path — §13.3', () => {
    const plot = makePlot(PLOT_80x40, [
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
    ]);
    const { result, graph } = solve(plot);
    expect(result.heightCeilingM.provenanceClass).toBe('DERIVED');
    expect(graph.hasKindBelow(result.heightCeilingM.node, 'RULE')).toBe(true);
    expect(graph.hasKindBelow(result.heightCeilingM.node, 'SOURCE_CLAUSE')).toBe(true);
  });

  it('refuses to substitute a default when no rule governs a setback', () => {
    // An OPEN_SPACE edge with the open-space rule withheld.
    const plot = makePlot(PLOT_80x40, [
      EdgeClassification.ROAD,
      EdgeClassification.OPEN_SPACE,
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
    ]);
    const graph = new ProvenanceGraph();
    const rules = loadSeedRulesForDevelopment(ACK).filter(
      (r) => r.ruleId !== 'R-SETBACK-OPEN-SPACE-RES',
    );
    expect(() =>
      solveEnvelope({ plot, rules, tracer: new Tracer(graph), context: {} }),
    ).toThrow(/forbids a default setback/);
  });

  it('refuses to run at all when a generative rule is missing', () => {
    const plot = makePlot(PLOT_80x40, [
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
      EdgeClassification.ROAD,
      EdgeClassification.ADJACENT_PLOT,
    ]);
    const graph = new ProvenanceGraph();
    const rules = loadSeedRulesForDevelopment(ACK).filter((r) => r.ruleId !== 'R-FAR-MAX-RES');
    expect(() => solveEnvelope({ plot, rules, tracer: new Tracer(graph), context: {} })).toThrow(
      EnvelopeHaltedError,
    );
  });
});

describe('seed rules are not usable by accident', () => {
  it('refuses to load without the acknowledgement', () => {
    expect(() => loadSeedRulesForDevelopment('sure')).toThrow(/DRAFT/);
  });

  it('the store refuses DRAFT rules through the normal path — Principle 9', async () => {
    const { SEED_RULES } = await import('@envelope/rules');
    const store = new RuleStore().add(...SEED_RULES);
    expect(() => store.load(asOfNow('2026-08-30'))).toThrow(/no override flag/);
  });
});
