/**
 * DXF output, checked as a format rather than as a string.
 *
 * The failure mode this guards against is specific: DXF is a flat sequence of
 * (group code, value) pairs, so one stray or missing line shifts every
 * subsequent code by one. The file still looks plausible in a text editor and
 * opens as an empty drawing. Asserting that codes and values stay paired, and
 * that the section markers nest, catches that where an eyeball does not.
 */

import { describe, expect, it } from 'vitest';

import {
  disclaimerText,
  LAYER,
  pointFromMetres,
  siteDrawing,
  writeDxf,
  type DxfPoint,
} from '../src/index.js';

const square = (side: number): readonly DxfPoint[] => [
  pointFromMetres(0, 0),
  pointFromMetres(side, 0),
  pointFromMetres(side, side),
  pointFromMetres(0, side),
];

function pairs(dxf: string): readonly (readonly [string, string])[] {
  const lines = dxf.split('\r\n');
  // trailing newline leaves one empty element
  if (lines.at(-1) === '') lines.pop();
  expect(lines.length % 2, 'group codes and values must pair exactly').toBe(0);
  const out: (readonly [string, string])[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    out.push([lines[i]!.trim(), lines[i + 1]!]);
  }
  return out;
}

describe('writeDxf', () => {
  it('emits paired group codes and terminates with EOF', () => {
    const dxf = writeDxf(siteDrawing({ plot: square(40) }));
    const p = pairs(dxf);
    expect(p.at(-1)).toEqual(['0', 'EOF']);
    for (const [code] of p) expect(code).toMatch(/^\d+$/);
  });

  it('opens and closes every section', () => {
    const p = pairs(writeDxf(siteDrawing({ plot: square(40) })));
    const starts = p.filter(([c, v]) => c === '0' && v === 'SECTION').length;
    const ends = p.filter(([c, v]) => c === '0' && v === 'ENDSEC').length;
    expect(starts).toBe(3); // HEADER, TABLES, ENTITIES
    expect(ends).toBe(starts);
  });

  it('declares R12 so every CAD tool reads it without negotiation', () => {
    expect(writeDxf(siteDrawing({ plot: square(40) }))).toContain('AC1009');
  });

  it('converts kernel millimetres to metres exactly once', () => {
    const dxf = writeDxf(siteDrawing({ plot: square(40) }));
    // a 40 m square must appear as 40.0000, never 40000 or 0.0400
    expect(dxf).toContain('40.0000');
    expect(dxf).not.toContain('40000.0000');
  });

  it('closes the plot boundary polyline', () => {
    const p = pairs(writeDxf(siteDrawing({ plot: square(40) })));
    const polyIdx = p.findIndex(([c, v]) => c === '0' && v === 'POLYLINE');
    const closedFlag = p.slice(polyIdx, polyIdx + 8).find(([c]) => c === '70');
    expect(closedFlag?.[1]).toBe('1');
  });

  it('emits one VERTEX per point plus a SEQEND', () => {
    const p = pairs(writeDxf(siteDrawing({ plot: square(40) })));
    expect(p.filter(([c, v]) => c === '0' && v === 'VERTEX')).toHaveLength(4);
    expect(p.filter(([c, v]) => c === '0' && v === 'SEQEND')).toHaveLength(1);
  });

  it('separates derived setbacks from assumed geometry by layer', () => {
    const dxf = writeDxf(
      siteDrawing({
        plot: square(40),
        setbackLine: square(34),
        assumedRings: [square(20)],
      }),
    );
    expect(dxf).toContain(LAYER.SETBACK);
    expect(dxf).toContain(LAYER.ASSUMED);
  });

  it('carries the not-assessed disclaimer into the drawing', () => {
    const doc = siteDrawing({ plot: square(40) });
    const withNote = { ...doc, texts: [...doc.texts, disclaimerText(pointFromMetres(0, -4))] };
    expect(writeDxf(withNote)).toContain('REGULATORY VALIDITY: NOT ASSESSED');
  });

  it('does not emit non-ASCII into an R12 file', () => {
    const doc = siteDrawing({
      plot: square(40),
      annotations: [{ at: pointFromMetres(1, 1), value: 'مساحة 1,365.23 m²' }],
    });
    const dxf = writeDxf(doc);
    // eslint-disable-next-line no-control-regex
    expect(/[^\x00-\x7F]/.test(dxf)).toBe(false);
  });
});
