import { describe, expect, it } from 'vitest';

import { engineNote } from '../src/lib/engine-notes.js';

/*
  The sentences a plot that is NOT a rectangle brings: rows laid across the whole
  footprint, connectors between them, the deduction counted bay by bay, and the
  ramp's headroom as a structural budget. The worked example is a rectangle and
  writes none of them, so they are held here, verbatim from the engine's run on
  the Al Mamzar plan (15 Oct 2026). A re-worded engine sentence fails here
  rather than reaching /ar/parking in English.
*/
const FIELD = [
  'A 6.30 × 30.27 m straight ramp continues the longest drive aisle from its end: 12% with a 3.6 m transition at 6% at each end (DBC Tables B.9 and B.10). It is wider than the aisle, so the bays beside it are not placed.',
  'Bays are laid in rows across the whole footprint, not inside the largest rectangle in it: 4 row(s) of 5.5 m bays either side of a 6 m aisle, each aisle as long as the footprint allows at its depth, joined by 5 connector(s) through the bay rows. A bay is placed only where the whole of it is inside the setback-permitted footprint.',
  'Of the 665 m² deducted for cores, plant and the ramp landing, 53 m² is the core, standing where it is drawn (6 bay(s) were not placed there); 241 m² stands in the stretches of the bay rows that no aisle serves, where it costs no bay; and 370 m² takes 27 bay(s) in the rows farthest from the base. Counted, not estimated.',
  'The connectors between the rows cost 30 bays across 330 m². That is the price of every bay on the level being reachable, and it is stated rather than folded into a ratio.',
  'Headroom (Table B.9, 2.4 m clear above any point of a ramp): the ramps stand in one strip on every level, so over each is the next, one 3.20 m storey up. The slab, its beams and anything hung below them over the ramp may be at most 0.80 m deep. No structure is drawn: this is the budget a design must fit in, not a statement that one does.',
  'The setback-permitted footprint is not a rectangle, so the rows were laid across the whole of it rather than inside the largest rectangle in it (65.73 × 32.58 m, 48.3% of the footprint). 1,028 m² along its edges holds no whole bay or aisle, about 48 bays. The bay count is therefore a floor: a bespoke layout on the true boundary could use some of it, and this engine does not attempt one.',
  'Laid out as rows across the whole footprint, along the width: 84 bays, against 0 modules along the width (a straight ramp climbing a 3.2 m storey needs 6.30 × 30.27 m (DBC Tables B.9 and B.10) and this packing has 65.73 × 28.51 m); 26 modules along the depth; 70 rows across the whole footprint, along the depth, on the same level. All 4 were packed.',
];

describe('the sentences of a footprint laid out whole', () => {
  it.each(FIELD)('are said in both languages: %s', (s) => {
    expect(engineNote(s, 'ar')).toMatch(/[؀-ۿ]/);
    expect(engineNote(s, 'en')).not.toBeNull();
  });

  it('keep the figures a reader would check', () => {
    expect(engineNote(FIELD[2]!, 'ar')).toContain('27');
    expect(engineNote(FIELD[4]!, 'ar')).toContain('0.80');
    expect(engineNote(FIELD[5]!, 'ar')).toContain('1,028');
    expect(engineNote(FIELD[6]!, 'ar')).toContain('صفوف على كامل المسقط بموازاة العمق');
  });

  it('no longer say headroom is not assessed', () => {
    for (const s of FIELD) expect(engineNote(s, 'en') ?? '').not.toMatch(/[Hh]eadroom[^.]*not assessed/);
  });
});
