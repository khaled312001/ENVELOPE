/**
 * Every ground-floor room is named on its sheet — inside it, or beside it on a leader.
 *
 * Raising the lettering to 2.5 mm made some names too long for their rooms, and
 * the placement pass withheld them. For a lift or a stair that is honest: the
 * cross and the treads say what it is. A ground-floor room is a box like its
 * neighbours, and the display list is the one the screen, the A3 sheet and the
 * DXF all walk, so a withheld name was gone from all three. On the worked
 * example's ground floor that was the GENERATOR ROOM; on a 120 × 80 m plot at
 * 1:500 it was the SUBSTATION, the room the street rule places.
 */

import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { Role, type ModelItem, type TextItem } from '../src/types.js';
import { PLOTS, setOf } from './plots.js';

beforeAll(async () => {
  await initGeometry();
});

const SUFFIX = ' - indicative';

describe('every ground-floor room is named', () => {
  for (const plot of PLOTS) {
    it(`on every sheet of ${plot.name}`, () => {
      const unnamed: string[] = [];
      for (const sheet of setOf(plot.input())) {
        const rooms = sheet.items.filter(
          (i): i is Extract<ModelItem, { kind: 'shape' }> =>
            i.kind === 'shape' && i.role === Role.GROUND_ROOM && i.closed && (i.name ?? '').endsWith(SUFFIX),
        );
        const names = sheet.items
          .filter((i): i is TextItem => i.kind === 'text' && i.role === Role.GROUND_ROOM)
          .map((t) => t.value);
        for (const room of rooms) {
          const name = room.name!.slice(0, -SUFFIX.length);
          const at = names.indexOf(name);
          if (at < 0) unnamed.push(`${sheet.number} ${name}`);
          else names.splice(at, 1);
        }
      }
      expect(unnamed).toEqual([]);
    });
  }
});
