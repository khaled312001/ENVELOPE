/**
 * The workbook a reader opens is headed with the product's public name, read
 * back out of the bytes by ExcelJS rather than asserted on a constant.
 */

import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { writeWorkbook } from '../src/index.js';

describe('the workbook', () => {
  it('is titled and authored Plotlogic, and nowhere ENVELOPE', async () => {
    const bytes = await writeWorkbook({
      runId: 'run-1',
      plotLabel: '345-1234 — TEST — 3200 m²',
      generatedAt: '2026-10-02T00:00:00.000Z',
      sheets: [],
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    expect(wb.creator).toBe('Plotlogic');
    const cover = wb.worksheets[0]!;
    expect(cover.getCell('A1').value).toBe('Plotlogic — capacity study');
    const text: string[] = [];
    for (const ws of wb.worksheets) ws.eachRow((row) => row.eachCell((c) => text.push(String(c.value))));
    expect(text.join(' ')).not.toMatch(/ENVELOPE/);
  });
});
