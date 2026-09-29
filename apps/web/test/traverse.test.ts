/**
 * The traverse: a plot entered edge by edge, the way the document states it.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS ACTUALLY AT RISK HERE.
 *
 * Not the arithmetic — a shoelace and a sine are not where this goes wrong. What
 * goes wrong is the temptation every survey package gives in to: a traverse that
 * does not close is *adjusted* until it does, and the numbers a person typed are
 * quietly replaced by numbers that look tidier. So the assertions below are
 * mostly about what the walk REFUSES to do, and about the one consequence it
 * must state out loud: when the traverse does not close, the last boundary is
 * drawn at a length that is not the one entered for it.
 *
 * The second risk is a boundary that quietly disappears. A leg that does not
 * parse must make the whole traverse unusable, because a plot missing one of its
 * edges is a different plot and it draws perfectly.
 */

import { describe, expect, it } from 'vitest';

import { rectangleLegs, walkTraverse, type TraverseLeg } from '../src/traverse.js';

/** 80 × 40, walked anticlockwise from the south-west corner. */
const RECTANGLE = rectangleLegs('80', '40');

describe('a traverse that closes', () => {
  it('returns to the corner it started from', () => {
    const walk = walkTraverse(RECTANGLE);
    expect(walk.usable).toBe(true);
    expect(walk.miscloseM).toBe('0.000');
    expect(walk.closureRatio).toBeNull();
  });

  it('puts a corner at each turn and does not repeat the first', () => {
    const walk = walkTraverse(RECTANGLE);
    expect(walk.corners).toEqual([
      { x: '0.000', y: '0.000' },
      { x: '80.000', y: '0.000' },
      { x: '80.000', y: '40.000' },
      { x: '0.000', y: '40.000' },
    ]);
  });

  it('computes the area the rectangle form would have computed', () => {
    expect(walkTraverse(RECTANGLE).areaM2).toBe('3200.00');
  });

  it('draws the last boundary at the length that was entered for it', () => {
    expect(walkTraverse(RECTANGLE).lastLegM).toBe('40.000');
    expect(walkTraverse(RECTANGLE).perimeterM).toBe('240.000');
  });

  /*
    THE BEARING IS THE DIRECTION OF TRAVEL, clockwise from north. 90 runs due
    east and 0 runs due north; getting this backwards produces a plot that is
    the right shape, mirrored, with every road on the wrong side.
  */
  it('reads a bearing as clockwise from north', () => {
    const east = walkTraverse([
      { lengthM: '10', bearingDeg: '90' },
      { lengthM: '10', bearingDeg: '180' },
      { lengthM: '10', bearingDeg: '270' },
      { lengthM: '10', bearingDeg: '0' },
    ]);
    expect(east.corners[1]).toEqual({ x: '10.000', y: '0.000' });
    expect(east.corners[2]).toEqual({ x: '10.000', y: '-10.000' });
    expect(east.miscloseM).toBe('0.000');
  });
});

describe('a traverse that does not close', () => {
  /** Four boundaries whose last leg is a metre short of returning home. */
  const SHORT: readonly TraverseLeg[] = [
    { lengthM: '80', bearingDeg: '90' },
    { lengthM: '40', bearingDeg: '0' },
    { lengthM: '80', bearingDeg: '270' },
    { lengthM: '39', bearingDeg: '180' },
  ];

  it('reports the misclose rather than removing it', () => {
    const walk = walkTraverse(SHORT);
    expect(walk.usable).toBe(true);
    expect(walk.miscloseM).toBe('1.000');
  });

  it('reports the closure as the surveyor writes it', () => {
    // 239 m of perimeter over 1 m of misclose.
    expect(walkTraverse(SHORT).closureRatio).toBe('239');
  });

  /*
    THE SENTENCE THE SCREEN HAS TO BE ABLE TO SAY. The ring closes by returning
    the last corner to the first, so the last boundary is 40 m on the drawing
    and 39 m in the box that was typed. A form that showed only the misclose
    would be stating the residue and hiding what was done with it.
  */
  it('says what the last boundary actually measures once the ring is closed', () => {
    const walk = walkTraverse(SHORT);
    expect(walk.lastLegM).toBe('40.000');
    expect(walk.lastLegM).not.toBe(SHORT[3]!.lengthM);
  });

  it('adjusts no other leg to absorb it', () => {
    const walk = walkTraverse(SHORT);
    expect(walk.corners[1]).toEqual({ x: '80.000', y: '0.000' });
    expect(walk.corners[2]).toEqual({ x: '80.000', y: '40.000' });
    expect(walk.corners[3]).toEqual({ x: '0.000', y: '40.000' });
  });
});

describe('a traverse that cannot be walked', () => {
  const unusable = (legs: readonly TraverseLeg[]): boolean => !walkTraverse(legs).usable;

  it('refuses fewer than three boundaries', () => {
    expect(unusable([RECTANGLE[0]!, RECTANGLE[1]!])).toBe(true);
  });

  /*
    A BLANK LEG MAKES THE WHOLE TRAVERSE UNUSABLE rather than being skipped. A
    plot with one boundary silently dropped is a different plot, and it draws
    perfectly - which is the failure mode this product is built around.
  */
  it('refuses a blank length, and does not walk the rest without it', () => {
    const blank = RECTANGLE.map((l, i) => (i === 2 ? { ...l, lengthM: '' } : l));
    expect(unusable(blank)).toBe(true);
    expect(walkTraverse(blank).corners).toHaveLength(4);
  });

  it('refuses a length of zero and a negative length', () => {
    expect(unusable(RECTANGLE.map((l, i) => (i === 1 ? { ...l, lengthM: '0' } : l)))).toBe(true);
    expect(unusable(RECTANGLE.map((l, i) => (i === 1 ? { ...l, lengthM: '-40' } : l)))).toBe(true);
  });

  it('refuses a bearing outside the circle', () => {
    expect(unusable(RECTANGLE.map((l, i) => (i === 0 ? { ...l, bearingDeg: '400' } : l)))).toBe(
      true,
    );
    expect(unusable(RECTANGLE.map((l, i) => (i === 0 ? { ...l, bearingDeg: '-1' } : l)))).toBe(true);
  });

  it('refuses text where a number goes', () => {
    expect(unusable(RECTANGLE.map((l, i) => (i === 0 ? { ...l, lengthM: 'eighty' } : l)))).toBe(
      true,
    );
  });
});

describe('the corners the API is given', () => {
  /*
    MEASURED OFF THE ROUNDED CORNERS, not off the walk. Those strings are what
    the request carries and what the kernel puts on its 1 mm grid; a misclose
    computed before the rounding would print a closure the stored plot does not
    have.
  */
  it('are on the millimetre, and everything is measured off them', () => {
    const walk = walkTraverse([
      { lengthM: '37.3333333', bearingDeg: '17.77' },
      { lengthM: '52.1', bearingDeg: '104.2' },
      { lengthM: '41.9', bearingDeg: '213.5' },
      { lengthM: '48.4', bearingDeg: '299.9' },
    ]);
    for (const corner of walk.corners) {
      expect(corner.x).toMatch(/^-?\d+\.\d{3}$/);
      expect(corner.y).toMatch(/^-?\d+\.\d{3}$/);
    }
    expect(walk.miscloseM).toMatch(/^\d+\.\d{3}$/);
    expect(walk.areaM2).toMatch(/^\d+\.\d{2}$/);
  });

  it('gives an irregular five-sided plot five corners', () => {
    const walk = walkTraverse([
      { lengthM: '42', bearingDeg: '90' },
      { lengthM: '31', bearingDeg: '30' },
      { lengthM: '38', bearingDeg: '320' },
      { lengthM: '55', bearingDeg: '250' },
      { lengthM: '29', bearingDeg: '160' },
    ]);
    expect(walk.corners).toHaveLength(5);
    expect(walk.usable).toBe(true);
    expect(Number(walk.areaM2)).toBeGreaterThan(0);
  });
});
