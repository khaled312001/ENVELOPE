/**
 * Excel export.
 *
 * The client asked for Excel alongside CAD, and the reason is worth stating
 * because it shapes what this writes: a capacity study leaves the architect and
 * goes to whoever is building the pro forma. That reader will sort, filter and
 * paste the numbers into a model. So the workbook is not a picture of the
 * screen — it is the numbers *with the thing that makes them trustworthy still
 * attached*.
 *
 * Which means the amber survives. PRD §13.1 calls the ASSUMED treatment "the
 * most important UI decision in the product"; an export that drops it hands the
 * reader a spreadsheet where a cited FAR and a guessed bay-area factor look
 * identical. Every value row here carries its provenance class, its citation or
 * its basis, and assumed rows are filled amber with a dotted border — the same
 * distinction the screen makes, in the medium the number will actually be used
 * in.
 *
 * This package may not import the engine (Principle 4), so it works on
 * `TracedWire` — the serialised form every layer already speaks.
 */

import { ProvenanceClass, type TracedWire } from '@envelope/core';
import ExcelJS from 'exceljs';

/** A value plus the human context a spreadsheet reader needs. */
export interface ValueRow {
  readonly label: string;
  readonly traced: TracedWire;
  /** Citation text for DERIVED, basis text for ASSUMED. */
  readonly source?: string;
}

export interface SheetSpec {
  readonly name: string;
  /** Shown above the table. Say what the sheet is for, not what it contains. */
  readonly note?: string;
  readonly rows: readonly ValueRow[];
  /**
   * Statements that belong to the sheet and have no value — a floor the schedule
   * names and does not count, an allowance nobody stated, what the model does not
   * model.
   *
   * SEPARATE FROM `rows` BECAUSE EVERY ROW HAS A TRACED VALUE, and that is this
   * module's whole discipline: a row carries a figure, its provenance class and
   * its basis, and the fill and the dashed border are read off that class. A
   * label-only row would need a `traced` of `null`, and the first thing anyone
   * would do is give it an empty one — a value with a provenance class and no
   * provenance, in the export a reader sums by hand.
   *
   * Printed BELOW the table, so the column a reader totals holds only figures.
   * That is the trade and it is deliberate: a NOT ASSESSED floor inside the
   * column is a cell somebody drags over, and `=SUM()` over a blank is 0, which
   * is the one answer this product may not give about a floor nobody measured.
   */
  readonly notes?: readonly string[];
}

export interface WorkbookSpec {
  readonly runId: string;
  readonly plotLabel: string;
  readonly generatedAt: string;
  readonly sheets: readonly SheetSpec[];
  /** Assumptions ranked by sensitivity, for the register sheet. */
  readonly assumptions?: readonly {
    readonly parameterId: string;
    readonly value: string;
    readonly basis: string;
    readonly sensitivity?: string;
  }[];
}

/** Fills mirroring the screen's provenance palette. */
const FILL: Partial<Record<ProvenanceClass, string>> = {
  [ProvenanceClass.ASSUMED]: 'FFFDF0D5',
  [ProvenanceClass.USER_SET]: 'FFE8EEF7',
  [ProvenanceClass.VARIANCE]: 'FFFBE4E4',
};

const DISCLAIMER =
  'REGULATORY VALIDITY: NOT ASSESSED. This workbook is a generated capacity study. ' +
  'It is not a compliance assessment and must not be submitted as one.';

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E4744' } };
  row.alignment = { vertical: 'middle' };
  row.height = 20;
}

/**
 * The first sheet of every workbook.
 *
 * Deliberately the first thing opened, and deliberately not a summary of
 * results: a reader who opens the file and starts pasting should have crossed
 * the disclaimer to get there.
 */
function addCoverSheet(wb: ExcelJS.Workbook, spec: WorkbookSpec): void {
  const ws = wb.addWorksheet('About this file', {
    properties: { defaultColWidth: 22 },
  });
  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 96;

  ws.addRow(['ENVELOPE — capacity study']).font = { bold: true, size: 16 };
  ws.addRow([]);
  ws.addRow(['Plot', spec.plotLabel]);
  ws.addRow(['Run', spec.runId]);
  ws.addRow(['Generated', spec.generatedAt]);
  ws.addRow([]);

  const warn = ws.addRow(['Status', DISCLAIMER]);
  warn.font = { bold: true, color: { argb: 'FF9C3D24' } };
  warn.alignment = { wrapText: true, vertical: 'top' };
  warn.height = 32;

  ws.addRow([]);
  ws.addRow(['Reading the colours']).font = { bold: true };
  const legend: readonly [string, ProvenanceClass, string][] = [
    ['Derived', ProvenanceClass.DERIVED, 'Computed from a cited rule. The citation is on the row.'],
    [
      'Assumed',
      ProvenanceClass.ASSUMED,
      'No rule governs this. The basis is on the row, and the value is editable — ' +
        'it is the engine declaring a gap, not filling one silently.',
    ],
    ['User set', ProvenanceClass.USER_SET, 'Entered or overridden by a named user.'],
    ['Variance', ProvenanceClass.VARIANCE, 'Governed by a documented exemption.'],
  ];
  for (const [label, cls, meaning] of legend) {
    const row = ws.addRow([label, meaning]);
    row.alignment = { wrapText: true, vertical: 'top' };
    const fill = FILL[cls];
    if (fill) {
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    }
  }
}

function addValueSheet(wb: ExcelJS.Workbook, sheet: SheetSpec): void {
  const ws = wb.addWorksheet(sheet.name.slice(0, 31));
  ws.getColumn(1).width = 40;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 72;

  if (sheet.note) {
    const note = ws.addRow([sheet.note]);
    note.font = { italic: true, color: { argb: 'FF55565F' } };
    ws.mergeCells(note.number, 1, note.number, 5);
    note.alignment = { wrapText: true, vertical: 'top' };
    ws.addRow([]);
  }

  styleHeader(ws.addRow(['Parameter', 'Value', 'Unit', 'Provenance', 'Source / basis']));

  for (const row of sheet.rows) {
    const numeric = Number(row.traced.value);
    const added = ws.addRow([
      row.label,
      Number.isFinite(numeric) && row.traced.value.trim() !== '' ? numeric : row.traced.value,
      row.traced.unit ?? '',
      row.traced.provenanceClass,
      row.source ?? '',
    ]);
    added.alignment = { vertical: 'top' };
    added.getCell(5).alignment = { wrapText: true, vertical: 'top' };

    const fill = FILL[row.traced.provenanceClass];
    if (fill) {
      for (let c = 1; c <= 5; c += 1) {
        added.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      }
    }
    if (row.traced.provenanceClass === ProvenanceClass.ASSUMED) {
      // The dotted edge is the screen's ASSUMED affordance. Excel's nearest
      // equivalent is a dashed border; keeping it means the cell still reads as
      // provisional after the fill is lost to a paste-as-values.
      added.getCell(2).border = {
        top: { style: 'dashed' },
        bottom: { style: 'dashed' },
        left: { style: 'dashed' },
        right: { style: 'dashed' },
      };
    }
  }

  /*
    THE VALUELESS STATEMENTS, UNDER THE TABLE AND INSIDE THE AUTOFILTER'S REACH.

    Placed after the rows rather than before them, because a reader scrolls to the
    bottom of a schedule to find its total and these qualify that total. The blank
    row keeps them out of a drag-selection of the figures above.
  */
  const notes = sheet.notes ?? [];
  if (notes.length > 0) {
    ws.addRow([]);
    for (const text of notes) {
      const added = ws.addRow([text]);
      added.font = { italic: true, color: { argb: 'FF55565F' } };
      ws.mergeCells(added.number, 1, added.number, 5);
      added.alignment = { wrapText: true, vertical: 'top' };
    }
  }

  ws.views = [{ state: 'frozen', ySplit: sheet.note ? 3 : 1 }];
  ws.autoFilter = {
    from: { row: sheet.note ? 3 : 1, column: 1 },
    to: { row: sheet.note ? 3 : 1, column: 5 },
  };
}

function addAssumptionRegister(wb: ExcelJS.Workbook, spec: WorkbookSpec): void {
  const assumptions = spec.assumptions ?? [];
  const ws = wb.addWorksheet('Assumption register');
  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 76;
  ws.getColumn(4).width = 22;

  const note = ws.addRow([
    assumptions.length === 0
      ? 'This run declared no assumptions. Every emitted value reaches a cited rule or a named user.'
      : 'Every gap the engine filled, why it filled it that way, and what the answer ' +
        'does if the assumption is wrong. Ranked by effect.',
  ]);
  note.font = { italic: true, color: { argb: 'FF55565F' } };
  ws.mergeCells(note.number, 1, note.number, 4);
  note.alignment = { wrapText: true, vertical: 'top' };
  ws.addRow([]);

  styleHeader(ws.addRow(['Parameter', 'Assumed value', 'Basis', 'Sensitivity']));
  for (const a of assumptions) {
    const row = ws.addRow([a.parameterId, a.value, a.basis, a.sensitivity ?? 'not computed']);
    row.alignment = { vertical: 'top' };
    row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
    for (let c = 1; c <= 4; c += 1) {
      row.getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: FILL[ProvenanceClass.ASSUMED] ?? 'FFFDF0D5' },
      };
    }
  }
}

/** Build the workbook and return it as bytes. */
export async function writeWorkbook(spec: WorkbookSpec): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ENVELOPE';
  wb.created = new Date(spec.generatedAt);

  addCoverSheet(wb, spec);
  for (const sheet of spec.sheets) addValueSheet(wb, sheet);
  addAssumptionRegister(wb, spec);

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

export { DISCLAIMER as WORKBOOK_DISCLAIMER };
