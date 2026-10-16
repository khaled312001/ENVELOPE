/**
 * Claude's proposed edits to the reader's inputs (16 Oct 2026: «وامكانيه كلود
 * التعديل على المدخلات كتحسين»). What is held here is the edge of it: only the
 * fields offered, only values those fields could hold, a changed boundary class
 * clears a road rank that no longer applies, and no limit an instrument states
 * is on the list at all.
 */
import { describe, expect, it } from 'vitest';

import type { AdvisorEdit } from '@web/api/client.js';

import { acceptable, applyEdits, editableFields, refilesPlot } from '../src/studio/advisor-edits.js';
import { EMPTY_RULES, type DraftPlot } from '../src/studio/model.js';

const PLOT: DraftPlot = {
  plotNumber: 'T',
  community: 'C',
  vertices: [
    { x: '0', y: '0' },
    { x: '40', y: '0' },
    { x: '40', y: '30' },
  ],
  edges: [
    { classification: 'ROAD', roadHierarchy: 'LOCAL' },
    { classification: 'ADJACENT_PLOT', roadHierarchy: '' },
    { classification: '', roadHierarchy: '' },
  ],
};
const edit = (field: string, value: string): AdvisorEdit => ({ field, value, clause: 'B.7.2.1', why: 'test' });

describe('the fields Claude may propose for', () => {
  const fields = editableFields(PLOT, EMPTY_RULES);

  it('are the level schedule, the core, and each boundary’s kind, road and tower setback — numbered from 1', () => {
    expect(Object.keys(fields)).toEqual([
      'rules.basements',
      'rules.groundIsParking',
      'rules.podiumAboveGround',
      'rules.podiumParkingLevels',
      'rules.coreArea',
      'boundary.1.class',
      'boundary.1.road',
      'boundary.1.towerSetback',
      'boundary.2.class',
      'boundary.2.road',
      'boundary.2.towerSetback',
      'boundary.3.class',
      'boundary.3.road',
      'boundary.3.towerSetback',
    ]);
  });

  it('never include a limit an instrument states: FAR, GFA, height, coverage, or the mix', () => {
    expect(Object.keys(fields).join(' ')).not.toMatch(/far|gfa|height|coverage|mix/i);
  });

  it('accept only what the field could hold, and not the value it already has', () => {
    expect(acceptable(edit('rules.basements', '2'), fields)).toBe(true);
    expect(acceptable(edit('rules.basements', '0'), fields)).toBe(false);
    expect(acceptable(edit('rules.basements', 'two'), fields)).toBe(false);
    expect(acceptable(edit('rules.groundIsParking', 'maybe'), fields)).toBe(false);
    expect(acceptable(edit('boundary.3.class', 'ROAD'), fields)).toBe(true);
    expect(acceptable(edit('boundary.3.class', 'MOTORWAY'), fields)).toBe(false);
    expect(acceptable(edit('boundary.9.class', 'ROAD'), fields)).toBe(false);
    expect(acceptable(edit('rules.far', '5'), fields)).toBe(false);
  });
});

describe('applying them', () => {
  it('writes them into the inputs as if typed, and leaves out any that does not fit', () => {
    const { draft, rules } = applyEdits(PLOT, EMPTY_RULES, [
      edit('rules.basements', '2'),
      edit('boundary.3.class', 'ROAD'),
      edit('boundary.3.road', 'COLLECTOR'),
      edit('boundary.2.towerSetback', '3'),
      edit('rules.podiumParkingLevels', '-1'),
    ]);
    expect(rules.basements).toBe('2');
    expect(rules.podiumParkingLevels).toBe(EMPTY_RULES.podiumParkingLevels);
    expect(draft.edges[2]).toEqual({ classification: 'ROAD', roadHierarchy: 'COLLECTOR' });
    expect(draft.edges[1]!.towerSetback).toBe('3');
    expect(PLOT.edges[2]!.classification).toBe('');
  });

  it('clears a road rank when a boundary stops being a road, and says the plot must be filed again', () => {
    const { draft } = applyEdits(PLOT, EMPTY_RULES, [edit('boundary.1.class', 'ADJACENT_PLOT')]);
    expect(draft.edges[0]).toEqual({ classification: 'ADJACENT_PLOT', roadHierarchy: '' });
    expect(refilesPlot(edit('boundary.1.class', 'ADJACENT_PLOT'))).toBe(true);
    expect(refilesPlot(edit('boundary.1.towerSetback', '3'))).toBe(false);
    expect(refilesPlot(edit('rules.basements', '1'))).toBe(false);
  });
});
