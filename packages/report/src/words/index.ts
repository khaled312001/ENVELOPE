/**
 * What the engine says, in the reader's language — one copy, read by the site
 * and by the report alike.
 *
 * It lived in `apps/web-next` while only the screen spoke Arabic. The report is
 * now issued in the language the reader works in (16 Oct 2026), and a second copy
 * of these tables in the report would be a second place for a sentence to be
 * translated differently. Pure string work: no engine, no geometry, no DOM.
 */
export { ARRANGEMENT_NAME, engineNote, type Reader, type Said } from './engine-notes.js';
export { INVARIANT } from './engine-run-notes.js';
export type { Locale } from './locale.js';
