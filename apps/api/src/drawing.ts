/**
 * The run, as CAD drawings.
 *
 * A composition-root adapter, and it is under the same two rules as
 * `checks.ts` and `report.ts`:
 *
 * 1. **Nothing here computes a number a user will see.** It used to: the API
 *    handed `@envelope/exports` metre strings and this file rebuilt rings from
 *    them, chose layers, and wrote its own annotation lines. The drawing is now
 *    composed once from the engine's `BuildingModel` by `@envelope/sheets`, and
 *    this file only picks which drawing was asked for.
 * 2. **Nothing is supplied that the engine did not produce.** A run stored before
 *    the model existed has no model, and it gets a 409 that says so — not a
 *    drawing reassembled from its area figures, which is the defect the model was
 *    built to end.
 */

import type { BuildingModel } from '@envelope/core';
import { buildingDxf, sheetDxf } from '@envelope/exports';
import { buildingGlb } from '@envelope/massing';
import { drawingSetHtml } from '@envelope/report';
import { composeSheets, type Sheet, type SheetMeta } from '@envelope/sheets';

/** The slice of a presented run this drawing reads. Deliberately narrow. */
export interface DrawableRun {
  readonly runId: string;
  readonly plot: { readonly plotNumber: string; readonly community: string };
  readonly building?: BuildingModel;
  /**
   * When the run was computed, ISO 8601 — the date the title block prints.
   *
   * It comes off the stored row, not off the clock. A sheet exported six months
   * after its run must still say when the figures were produced; `new Date()`
   * here would re-date every download of an unchanged drawing, which is the one
   * thing a dated title block is relied on not to do.
   */
  readonly issuedAt: string;
  /** The G4 reviewer's name, once somebody has signed. Absent prints NOT CHECKED. */
  readonly checkedBy?: string;
}

/**
 * What the title strip is told, in one place.
 *
 * Four exports used to build this literal four times, which is four chances for
 * the PDF and the DXF to disagree about which run they are drawing.
 */
function metaOf(run: DrawableRun): SheetMeta {
  return {
    plotNumber: run.plot.plotNumber,
    community: run.plot.community,
    runId: run.runId,
    issuedAt: run.issuedAt,
    ...(run.checkedBy ? { checkedBy: run.checkedBy } : {}),
  };
}

export class DrawingUnavailableError extends Error {
  override readonly name = 'DrawingUnavailableError';
  readonly statusCode = 409;
}

export class UnknownSheetError extends Error {
  override readonly name = 'UnknownSheetError';
  readonly statusCode = 404;
}

/**
 * The run's drawing set, for the report to print. Empty for a run stored before
 * the model existed: the report says so rather than drawing from area figures.
 */
export function runSheets(run: DrawableRun): readonly Sheet[] {
  const model = run.building;
  if (!model) return [];
  return composeSheets(model, metaOf(run));
}

/** The run's drawing set as one printable A3 document, or a 409 saying why there is none. */
export function runDrawingSet(run: DrawableRun): string {
  const sheets = runSheets(run);
  if (sheets.length === 0) {
    throw new DrawingUnavailableError(
      'this run was computed before drawings were built from the building model, so it has no ' +
        'drawing set. Compute the run again and export the new one.',
    );
  }
  return drawingSetHtml(sheets, metaOf(run));
}

/**
 * Draw a run: the whole building in 3D, or one sheet of the set.
 *
 * `sheetId` is a sheet's stable id — `site`, `level-B1`, `typical`, `section-a`.
 * An id the set does not contain is a 404 naming the ones it does, rather than a
 * silent fallback to the whole building.
 */
export function runDrawing(run: DrawableRun, sheetId?: string): { readonly dxf: string; readonly name: string } {
  const model = run.building;
  if (!model) {
    throw new DrawingUnavailableError(
      'this run was computed before drawings were built from the building model, so it has no ' +
        'drawing to export. Compute the run again and export the new one.',
    );
  }
  const meta = metaOf(run);
  const sheets = composeSheets(model, meta);
  if (!sheetId) return { dxf: buildingDxf(model, sheets, meta), name: `envelope-${run.runId}` };

  const sheet = sheets.find((s) => s.id === sheetId);
  if (!sheet) {
    throw new UnknownSheetError(
      `this run has no sheet "${sheetId}". Its sheets are: ${sheets.map((s) => s.id).join(', ')}.`,
    );
  }
  return { dxf: sheetDxf(sheet, meta), name: `envelope-${run.runId}-${sheet.number}` };
}

/**
 * The building as a .glb: the massing view, as a file.
 *
 * Written here rather than in the browser, which already holds the same model and
 * could write the same bytes. The difference is the gates. This route is reached
 * only past G3 and G4, checked against the stored content, and a file the browser
 * wrote for itself would have passed them only if the browser said so.
 */
export async function runGlb(run: DrawableRun): Promise<{ readonly bytes: Buffer; readonly name: string }> {
  const model = run.building;
  if (!model) {
    throw new DrawingUnavailableError(
      'this run was computed before drawings were built from the building model, so it has no ' +
        '3D model to export. Compute the run again and export the new one.',
    );
  }
  const bytes = await buildingGlb(model, metaOf(run));
  return { bytes: Buffer.from(bytes), name: `envelope-${run.runId}` };
}
