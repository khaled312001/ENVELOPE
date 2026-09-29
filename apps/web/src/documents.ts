/**
 * Handing over a document the server produced: to read, or to print.
 *
 * ## Why the browser writes the PDF
 *
 * The report is **print-first HTML** — `@page` A4 for the report and A3 for the
 * drawing set, with the margins, the page breaks and the running footer already
 * in it (`packages/report/src/html.ts`). The browser is therefore this product's
 * PDF writer, and that is a decision rather than a shortfall.
 *
 * A server-side writer would lay the same report out a SECOND time, from the
 * same data, in a different engine. The two would agree on the day it was
 * written and drift afterwards, and the copy somebody filed would be the one
 * nobody had read — the same defect `pnpm parity` exists to catch between the
 * screen, the paper and the DXF. One layout, several renderers, holds here too.
 *
 * ## Why a hidden frame and not a popup
 *
 * A blocked popup is a button that does nothing. And printing a frame raises the
 * dialog on the FRAME's document, so it is that document's `@page` rules that
 * decide the paper size; asking the opener to print would print this page.
 */

/** Long enough that a dialog is certainly up before the object URL is released. */
const HOLD_MS = 60_000;

/**
 * Open a document in a new tab.
 *
 * A tab rather than a download, because a report is meant to be READ before it
 * is filed, and a file that lands in Downloads unopened is how a claim statement
 * goes unread.
 */
export function openObject(url: string): void {
  window.open(url, '_blank', 'noopener');
  window.setTimeout(() => URL.revokeObjectURL(url), HOLD_MS);
}

export const openDocument = (text: string, type: string): void =>
  openObject(URL.createObjectURL(new Blob([text], { type })));

/** Raise the browser's print dialog on a document the server produced. */
export function printObject(url: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.title = '';
  // Off the bottom-right corner at one pixel: a zero-sized frame is treated as
  // unrendered by some engines and never fires `load`.
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;inline-size:1px;block-size:1px;border:0;opacity:0';
  frame.onload = (): void => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  };
  frame.src = url;
  document.body.appendChild(frame);
  // Removing the frame while the dialog is open cancels the print in Chrome, so
  // it is left in place and taken away later.
  window.setTimeout(() => {
    frame.remove();
    URL.revokeObjectURL(url);
  }, HOLD_MS);
}

export const printDocument = (text: string, type: string): void =>
  printObject(URL.createObjectURL(new Blob([text], { type })));

/** Save a document under a name, for the formats nobody reads in a browser. */
export function downloadObject(url: string, name: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), HOLD_MS);
}
