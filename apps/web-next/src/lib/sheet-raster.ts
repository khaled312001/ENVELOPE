import PDF_WORKER_URL from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

import type { BoxPt } from '../components/sheet-underlay.js';

/*
  THE SHEET'S FIRST PAGE, DRAWN BY PDF.JS IN THIS BROWSER — the one renderer
  for both places the studio shows the issued PDF: the sheet step, and the
  underlay on the plot step's map. Two renderers would draw one document two
  ways, and the reader would trace off the one he had not checked.

  The legacy build, because the modern one calls `Map.getOrInsertComputed` with
  no fallback and a browser a year old does not have it. WebAssembly stays off:
  the site's policy grants no `wasm-unsafe-eval`, and pdf.js's own JavaScript
  decoders draw a sheet like these without it. pdf.js paints the page white by
  default, so a sheet with a transparent ground is on paper, as printed.
*/

/**
 * Page 1 of `base64` drawn onto `canvas` (or a new one), its longer side
 * `longSidePx`, cropped to `region` when one is given — the whole page otherwise.
 */
export async function rasterSheet(
  base64: string,
  region: BoxPt | null,
  longSidePx: number,
  canvas: HTMLCanvasElement = document.createElement('canvas'),
  signal?: { readonly cancelled: boolean },
): Promise<HTMLCanvasElement> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const task = pdfjs.getDocument({ data: bytes, useWasm: false });
  try {
    const doc = await task.promise;
    const page = await doc.getPage(1);
    if (signal?.cancelled) return canvas;
    const unit = page.getViewport({ scale: 1 });
    const box = region ?? ([...unit.viewBox] as unknown as BoxPt);
    const [ax, ay, bx, by] = unit.convertToViewportRectangle([...box]) as [number, number, number, number];
    const viewport = page.getViewport({ scale: longSidePx / Math.max(Math.abs(bx - ax), Math.abs(by - ay)) });
    const [x0, y0, x1, y1] = viewport.convertToViewportRectangle([...box]) as [number, number, number, number];
    canvas.width = Math.max(1, Math.round(Math.abs(x1 - x0)));
    canvas.height = Math.max(1, Math.round(Math.abs(y1 - y0)));
    // The crop: the page's pixels shifted so the region's top-left corner is the canvas's.
    await page.render({ canvas, viewport, transform: [1, 0, 0, 1, -Math.min(x0, x1), -Math.min(y0, y1)] }).promise;
    return canvas;
  } finally {
    void task.destroy();
  }
}
