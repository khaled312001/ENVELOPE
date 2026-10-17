/**
 * How a figure is printed: a measure to two decimals, a count whole, and never a
 * changed digit anywhere but the page.
 */

import { describe, expect, it } from 'vitest';

import { forDisplay } from '../src/precision.js';

describe('forDisplay', () => {
  it('prints areas, lengths and FAR to two decimals, half up', () => {
    expect(forDisplay('6774.194', 'm²')).toBe('6774.19');
    expect(forDisplay('6774.195', 'm²')).toBe('6774.20');
    expect(forDisplay('7.5', 'm')).toBe('7.50');
    expect(forDisplay('4.2339', 'ratio')).toBe('4.23');
    expect(forDisplay('1200', 'm²')).toBe('1200.00');
    expect(forDisplay('72916.80', 'ft²')).toBe('72916.80');
  });

  it('prints a whole count whole, and a count that is not whole at two decimals rather than rounding it', () => {
    expect(forDisplay('64', 'bays')).toBe('64');
    expect(forDisplay('64.000', 'bays')).toBe('64');
    expect(forDisplay('9.85', 'levels')).toBe('9.85');
    expect(forDisplay('9.8571', 'levels')).toBe('9.86');
  });

  it('leaves what is not a plain decimal alone', () => {
    expect(forDisplay('EXCLUDED_FROM_FAR', 'enum')).toBe('EXCLUDED_FROM_FAR');
    expect(forDisplay('3–5', 'm')).toBe('3–5');
    expect(forDisplay('', 'm')).toBe('');
  });

  it('never prints a sign on a zero', () => {
    expect(forDisplay('-0.001', 'm²')).toBe('0.00');
    expect(forDisplay('-1.006', 'm')).toBe('-1.01');
  });
});
