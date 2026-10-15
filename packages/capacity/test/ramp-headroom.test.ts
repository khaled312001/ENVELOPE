/**
 * Table B.9's 2.4 m clear height, as the structural budget it leaves.
 *
 * The ramps stand stacked one storey apart, so the clear height over one is the
 * storey less the slab of the next. Nothing is assumed about that slab: the
 * figure is the deepest it may be, derived, and a storey with no room for any
 * slab at all says so rather than drawing a ramp nobody can drive under.
 */

import { Decimal, ProvenanceGraph, Tracer, type TracedDecimal } from '@envelope/core';
import { describe, expect, it } from 'vitest';

import { rampHeadroom } from '../src/ramp-rules.js';

function storey(m: string): { tracer: Tracer; storey: TracedDecimal } {
  const tracer = new Tracer(new ProvenanceGraph());
  return {
    tracer,
    storey: tracer.assumed('envelope.floor_to_floor_m', new Decimal(m), {
      basis: 'test fixture; a storey height',
      unit: 'm',
    }),
  };
}

describe('ramp headroom', () => {
  it('leaves 0.80 m of structure under a 3.2 m storey', () => {
    const { tracer, storey: s } = storey('3.2');
    const h = rampHeadroom(tracer, s);
    expect(h.clearHeightM.value.toString()).toBe('2.4');
    expect(h.clearHeightM.provenanceClass).toBe('DERIVED');
    expect(h.structuralBudgetM.value.toFixed(2)).toBe('0.80');
    expect(h.feasible).toBe(true);
  });

  it('inherits the storey height as its weakest operand', () => {
    // The 2.4 m is cited; the storey here is assumed, so the budget is too.
    const { tracer, storey: s } = storey('3.2');
    expect(rampHeadroom(tracer, s).structuralBudgetM.provenanceClass).toBe('ASSUMED');
  });

  it('is infeasible where the storey is no taller than the clear height', () => {
    const { tracer, storey: s } = storey('2.4');
    expect(rampHeadroom(tracer, s).feasible).toBe(false);
  });
});
