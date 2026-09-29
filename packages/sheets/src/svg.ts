/**
 * A sheet as SVG — for the report, for print, and for the parity gate.
 *
 * The screen renders the same sheet with React (`apps/web`), and it does so by
 * calling the functions exported here for every coordinate and every class name,
 * so the only thing the two renderers can differ in is the element that wraps a
 * path. Everything is expanded into paper millimetres: no `<use>`, no scaled
 * groups, because a stroke inside a scaled group is scaled with it and a 0.18 mm
 * bay line would print at whatever the group's scale made it.
 *
 * Colours are classes, and the classes read the web's own tokens with the light
 * theme's values behind them. The screen follows the theme; a PDF, which has no
 * tokens, falls back to the light values.
 */

import type { ProvenanceClass } from '@envelope/core';

import { toPaper } from './plane.js';
import { placeSymbol } from './symbols.js';
import type { ModelItem, PaperItem, Role, Sheet, SheetView, SymbolItem } from './types.js';

export interface RoleStyle {
  /** Stroke width on paper, in millimetres. */
  readonly strokeMm: number;
  /** Dash pattern on paper, in millimetres. */
  readonly dash?: string;
  readonly fill: 'none' | 'tint' | 'hatch';
}

/**
 * Line weights and dashes, by role.
 *
 * The drafting hierarchy: the boundary and the slab edge are the heaviest lines
 * on a plan, the bays are the lightest, and anything seen beyond or below is
 * dashed. The driveway opening is heavier than the boundary it breaks, because
 * it is the thing on the sheet a reader is most likely to argue with.
 */
export const ROLE_STYLE: Readonly<Record<Role, RoleStyle>> = {
  plot: { strokeMm: 0.5, fill: 'none' },
  'edge-label': { strokeMm: 0, fill: 'none' },
  /*
    THE FOUR ROAD BANDS, WEIGHTED AS THEY ARE RANKED. The pen is the ranking, so
    a reader who cannot separate the inks still reads the hierarchy off the
    drawing — the same 1.4.1 ruling that gave each edge class its own dash.
  */
  'band-arterial': { strokeMm: 0.6, fill: 'tint' },
  'band-collector': { strokeMm: 0.45, fill: 'tint' },
  'band-local': { strokeMm: 0.3, fill: 'tint' },
  'band-access': { strokeMm: 0.18, fill: 'none' },
  'band-neighbour': { strokeMm: 0.18, fill: 'hatch' },
  'band-open-space': { strokeMm: 0.18, dash: '1 2', fill: 'none' },
  setback: { strokeMm: 0.35, dash: '3 1.2', fill: 'none' },
  dimension: { strokeMm: 0.18, fill: 'none' },
  podium: { strokeMm: 0.35, fill: 'tint' },
  tower: { strokeMm: 0.35, dash: '2 1', fill: 'none' },
  slab: { strokeMm: 0.5, fill: 'none' },
  context: { strokeMm: 0.2, dash: '1.5 1', fill: 'none' },
  bay: { strokeMm: 0.18, fill: 'tint' },
  'bay-accessible': { strokeMm: 0.25, fill: 'tint' },
  'bay-number': { strokeMm: 0, fill: 'none' },
  car: { strokeMm: 0.13, fill: 'none' },
  aisle: { strokeMm: 0.13, fill: 'tint' },
  'aisle-arrow': { strokeMm: 0.25, fill: 'none' },
  ramp: { strokeMm: 0.3, fill: 'hatch' },
  'ramp-arrow': { strokeMm: 0.3, fill: 'none' },
  reserved: { strokeMm: 0.25, dash: '2 1', fill: 'hatch' },
  // A solid, heavy outline: the core is a cut element on every plan it appears
  // on, and the four-pen hierarchy puts a cut wall at the slab's weight.
  core: { strokeMm: 0.5, fill: 'tint' },
  access: { strokeMm: 1, fill: 'none' },
  'access-arrow': { strokeMm: 0.35, fill: 'none' },
  'cut-line': { strokeMm: 0.35, dash: '6 1.5 1 1.5', fill: 'none' },
  ground: { strokeMm: 0.6, fill: 'none' },
  'section-cut': { strokeMm: 0.5, fill: 'tint' },
  'section-beyond': { strokeMm: 0.18, dash: '1.5 1', fill: 'none' },
  'section-opening': { strokeMm: 0.35, dash: '0.8 0.8', fill: 'none' },
  ceiling: { strokeMm: 0.35, dash: '4 1.5', fill: 'none' },
  'level-mark': { strokeMm: 0.25, fill: 'none' },
  annotation: { strokeMm: 0, fill: 'none' },
};

/**
 * Roles whose ink is the provenance class of the value that placed them.
 *
 * Not every role. A bay's count may rest on an assumption, but painting every
 * bay amber would spend §13.1's colour on a hundred rectangles and teach a reader
 * it means "parking"; the assumption is stated, in amber and in words, in the
 * title strip where the count is. The ramp is always the deferred ink: its
 * gradient is NOT ASSESSED whatever the class of the figure.
 */
const CLASS_INKED: ReadonlySet<Role> = new Set<Role>([
  'setback',
  'podium',
  'tower',
  'slab',
  'section-cut',
  'ceiling',
  'reserved',
  'core',
  'level-mark',
  'context',
]);

/**
 * The provenance class an item is inked in, or `null` when its role's own ink
 * applies. Shared by the SVG and the DXF, so an amber line on screen is an amber
 * line in AutoCAD.
 */
export function inkClass(item: ModelItem): ProvenanceClass | null {
  return item.kind !== 'symbol' && item.source && CLASS_INKED.has(item.role)
    ? item.source.provenanceClass
    : null;
}

/** The CSS class of a model item: its role, and — where its ink is its class — its class. */
export function itemClass(item: ModelItem): string {
  const ink = inkClass(item);
  return `sh sh-${item.kind} sh-${item.role}${ink ? ` sh-c-${ink.toLowerCase()}` : ''}`;
}

export function paperClass(item: PaperItem): string {
  const cls =
    item.kind === 'text' && item.provenanceClass
      ? ` sh-c-${item.provenanceClass.toLowerCase()}`
      : item.kind === 'poly' && item.swatch?.provenanceClass && CLASS_INKED.has(item.swatch.role)
        ? ` sh-c-${item.swatch.provenanceClass.toLowerCase()}`
        : '';
  const swatch = item.kind === 'poly' && item.swatch ? ` sh-${item.swatch.role}` : '';
  return `shp shp-${item.kind} shp-${item.role}${swatch}${cls}`;
}

const n2 = (v: number): string => (Math.round(v * 100) / 100).toString();

/** A polyline in paper millimetres, as SVG path data. */
export function pathData(
  points: readonly { readonly x: number; readonly y: number }[],
  closed: boolean,
  view: SheetView | null,
): string {
  const ps = view ? points.map((p) => toPaper(view, p)) : points;
  return ps.map((p, i) => `${i === 0 ? 'M' : 'L'}${n2(p.x)} ${n2(p.y)}`).join(' ') + (closed ? ' Z' : '');
}

/** A symbol expanded to one path, in paper millimetres. */
export function symbolPathData(item: SymbolItem, view: SheetView): string {
  return placeSymbol(item)
    .map((line) => pathData(line.points, line.closed, view))
    .join(' ');
}

/** Where a model text item sits on paper, and its rotation as SVG measures it. */
export function textPlacement(
  at: { readonly x: number; readonly y: number },
  rotationDeg: number,
  view: SheetView,
): { x: number; y: number; transform: string | undefined } {
  const p = toPaper(view, at);
  // SVG rotates clockwise with y down; the model is anticlockwise with y up.
  const r = -rotationDeg;
  return { x: p.x, y: p.y, transform: r === 0 ? undefined : `rotate(${n2(r)} ${n2(p.x)} ${n2(p.y)})` };
}

export function fillFor(role: Role, hatchId: string): string | undefined {
  const fill = ROLE_STYLE[role].fill;
  return fill === 'hatch' ? `url(#${hatchId})` : undefined;
}

/** Stroke and fill by role, as token references. Shapes and legend swatches share them. */
const INK: Readonly<Partial<Record<Role, { stroke: string; fill?: string }>>> = {
  plot: { stroke: 'var(--text-primary, #14161c)' },
  'band-arterial': { stroke: 'var(--accent, #2b5cd9)', fill: 'var(--accent-subtle, #eaf0fd)' },
  'band-collector': { stroke: 'var(--accent, #2b5cd9)', fill: 'var(--accent-subtle, #eaf0fd)' },
  'band-local': { stroke: 'var(--accent, #2b5cd9)', fill: 'var(--accent-subtle, #eaf0fd)' },
  'band-access': { stroke: 'var(--accent, #2b5cd9)' },
  'band-neighbour': { stroke: 'var(--text-secondary, #55555f)' },
  'band-open-space': { stroke: 'var(--derived, #1f6b45)' },
  setback: { stroke: 'var(--text-secondary, #55555f)' },
  dimension: { stroke: 'var(--text-tertiary, #656571)' },
  podium: { stroke: 'var(--text-primary, #14161c)', fill: 'var(--surface-sunken, #eef1f8)' },
  tower: { stroke: 'var(--text-primary, #14161c)' },
  slab: { stroke: 'var(--text-primary, #14161c)' },
  context: { stroke: 'var(--text-tertiary, #656571)' },
  bay: { stroke: 'var(--text-secondary, #55555f)', fill: 'var(--accent-subtle, #eaf0fd)' },
  'bay-accessible': { stroke: 'var(--derived, #1f6b45)', fill: 'var(--derived-surface, #e9f5ee)' },
  car: { stroke: 'var(--text-secondary, #55555f)' },
  aisle: { stroke: 'var(--border-default, #c8cbd3)', fill: 'var(--surface-sunken, #eef1f8)' },
  'aisle-arrow': { stroke: 'var(--text-secondary, #55555f)' },
  ramp: { stroke: 'var(--deferred, #656971)' },
  'ramp-arrow': { stroke: 'var(--deferred, #656971)' },
  reserved: { stroke: 'var(--text-tertiary, #656571)' },
  core: { stroke: 'var(--text-primary, #14161c)', fill: 'var(--surface-sunken, #eef1f8)' },
  access: { stroke: 'var(--text-primary, #14161c)' },
  'access-arrow': { stroke: 'var(--text-secondary, #55555f)' },
  'cut-line': { stroke: 'var(--accent, #2b5cd9)' },
  ground: { stroke: 'var(--text-primary, #14161c)' },
  'section-cut': { stroke: 'var(--text-primary, #14161c)', fill: 'var(--surface-sunken, #eef1f8)' },
  'section-beyond': { stroke: 'var(--text-tertiary, #656571)' },
  'section-opening': { stroke: 'var(--deferred, #656971)' },
  ceiling: { stroke: 'var(--text-primary, #14161c)' },
  'level-mark': { stroke: 'var(--text-tertiary, #656571)' },
};

/** Text ink by role, where it is not the default. */
const TEXT_INK: Readonly<Partial<Record<Role, string>>> = {
  'edge-label': 'var(--text-secondary, #55555f)',
  dimension: 'var(--text-secondary, #55555f)',
  'bay-number': 'var(--text-secondary, #55555f)',
  'level-mark': 'var(--text-secondary, #55555f)',
  ramp: 'var(--deferred, #656971)',
  'cut-line': 'var(--accent, #2b5cd9)',
  reserved: 'var(--text-secondary, #55555f)',
  core: 'var(--text-secondary, #55555f)',
};

const MONO = 'var(--font-mono, "IBM Plex Mono", ui-monospace, monospace)';
const SANS = 'var(--font-sans, "IBM Plex Sans", system-ui, sans-serif)';

/**
 * The sheet stylesheet.
 *
 * Token names are the web's (`apps/web/src/styles/tokens.css`), so on screen the
 * sheet follows the theme. The values after each comma are the light theme's, for
 * the drawing set, which prints without tokens. `pnpm contrast` reads this file
 * (its assertion 8): every fallback must equal the light palette's value for its
 * token, every token must be measured in some declared pair, and amber may appear
 * only on `.sh-c-assumed`. What it does not do is measure a sheet ink against the
 * sheet's own ground, so no contrast figure is claimed for the drawing itself.
 *
 * Every rule names the element type as well as the role. A role rule that also
 * matched text painted the aisle's own label in the aisle's fill — white on grey —
 * and a frame stroke that reached the title strip outlined every letter in it.
 */
export const SHEET_CSS: string = [
  '.sh-shape, .sh-symbol, .shp-poly { fill: none; stroke-linejoin: round; stroke-linecap: round; }',
  ...Object.entries(INK).map(
    ([role, ink]) =>
      `.sh-shape.sh-${role}, .sh-symbol.sh-${role}, .shp-swatch.sh-${role} { stroke: ${ink.stroke};${ink.fill ? ` fill: ${ink.fill};` : ''} }`,
  ),
  `.sh-text, .shp-text { stroke: none; fill: var(--text-primary, #14161c); font-family: ${SANS}; }`,
  ...Object.entries(TEXT_INK).map(([role, ink]) => `.sh-text.sh-${role} { fill: ${ink}; }`),
  `.sh-text.sh-dimension, .sh-text.sh-bay-number, .sh-text.sh-level-mark, .shp-value { font-family: ${MONO}; }`,
  '.sh-text.sh-edge-label, .shp-label { letter-spacing: 0.05em; }',
  '.sh-text.sh-access, .sh-text.sh-cut-line { font-weight: 600; }',
  // A halo, so a label crossing a line stays legible. Paper millimetres.
  '.sh-text { paint-order: stroke; stroke: var(--surface-raised, #ffffff); stroke-width: 0.35; stroke-linejoin: round; }',
  // Provenance ink, for the roles whose ink is their class (CLASS_INKED).
  '.sh-c-derived.sh-shape, .shp-swatch.sh-c-derived { stroke: var(--derived, #1f6b45); }',
  '.sh-c-assumed.sh-shape, .shp-swatch.sh-c-assumed { stroke: var(--uncertain, #854b00); }',
  '.sh-c-assumed.sh-podium, .sh-c-assumed.sh-section-cut { fill: var(--uncertain-surface, #fdf3e0); }',
  '.sh-c-user_set.sh-shape, .shp-swatch.sh-c-user_set { stroke: var(--accent, #2b5cd9); }',
  '.sh-text.sh-c-assumed, .shp-text.sh-c-assumed { fill: var(--uncertain, #854b00); font-weight: 600; }',
  '.sh-hatch-line { stroke: var(--deferred-hatch, #7c7f85); stroke-width: 0.15; }',
  '.shp-poly { stroke: var(--text-primary, #14161c); }',
  '.shp-frame { stroke-width: 0.5; }',
  '.shp-rule { stroke: var(--border-default, #c8cbd3); stroke-width: 0.25; }',
  '.shp-label { fill: var(--text-tertiary, #656571); }',
  '.shp-scale-bar { stroke-width: 0.2; }',
  '.shp-scale-bar-fill { stroke-width: 0.2; fill: var(--text-primary, #14161c); }',
  '.shp-north { stroke-width: 0.25; fill: var(--text-primary, #14161c); }',
].join('\n');

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The viewport as a clip path: model ink stops at the edge of its window on the sheet. */
export function viewportClip(sheet: Sheet, id: string): string {
  const v = sheet.viewport;
  return `<clipPath id="${id}"><rect x="${v.x}" y="${v.y}" width="${v.width}" height="${v.height}"/></clipPath>`;
}

/** The hatch pattern the ramp and the reserved zone are filled with. */
export function hatchPattern(id: string): string {
  return (
    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="1.4" height="1.4" patternTransform="rotate(45)">` +
    `<line class="sh-hatch-line" x1="0" y1="0" x2="0" y2="1.4"/></pattern>`
  );
}

function modelItemSvg(item: ModelItem, view: SheetView, hatchId: string): string {
  const cls = itemClass(item);
  if (item.kind === 'shape') {
    const style = ROLE_STYLE[item.role];
    const fill = fillFor(item.role, hatchId);
    const attrs = [
      `class="${cls}"`,
      `d="${pathData(item.points, item.closed, view)}"`,
      `stroke-width="${style.strokeMm}"`,
      style.dash ? `stroke-dasharray="${style.dash}"` : '',
      fill ? `fill="${fill}"` : '',
      item.bay !== undefined ? `data-bay="${item.bay}"` : '',
      item.source ? `data-node="${esc(item.source.node)}"` : '',
    ].filter(Boolean);
    const title = item.name ? `<title>${esc(item.name)}</title>` : '';
    return title ? `<path ${attrs.join(' ')}>${title}</path>` : `<path ${attrs.join(' ')}/>`;
  }
  if (item.kind === 'symbol') {
    const style = ROLE_STYLE[item.role];
    return (
      `<path class="${cls}" d="${symbolPathData(item, view)}" stroke-width="${style.strokeMm}"` +
      ` data-symbol="${item.symbol}"${item.bay !== undefined ? ` data-car="${item.bay}"` : ''}/>`
    );
  }
  const t = textPlacement(item.at, item.rotationDeg, view);
  return (
    `<text class="${cls}" x="${n2(t.x)}" y="${n2(t.y)}" font-size="${item.sizeMm}"` +
    ` text-anchor="${item.anchor}" dominant-baseline="central"${t.transform ? ` transform="${t.transform}"` : ''}>` +
    `${esc(item.value)}</text>`
  );
}

function paperItemSvg(item: PaperItem, hatchId: string): string {
  const cls = paperClass(item);
  if (item.kind === 'poly') {
    const fill = item.swatch ? fillFor(item.swatch.role, hatchId) : undefined;
    // A swatch carries its role's dash, so a dashed line in the drawing is a dashed
    // line in the legend and the two can be matched without colour.
    const dash = item.swatch ? ROLE_STYLE[item.swatch.role].dash : undefined;
    return (
      `<path class="${cls}" d="${pathData(item.points, item.closed, null)}"` +
      `${fill ? ` fill="${fill}"` : ''}${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
    );
  }
  // `data-field` carries the title-block key into the markup, so a reader — a
  // test, a script, a person with dev tools — finds the date by asking for the
  // date rather than by matching text that is also a sheet title.
  return (
    `<text class="${cls}" x="${n2(item.at.x)}" y="${n2(item.at.y)}" font-size="${item.sizeMm}"` +
    ` text-anchor="${item.anchor}"${item.bold ? ' font-weight="700"' : ''}` +
    `${item.field ? ` data-field="${item.field}"` : ''}>${esc(item.value)}</text>`
  );
}

/**
 * The whole sheet as a standalone SVG document, A3 at true paper size.
 *
 * `idPrefix` keeps the hatch pattern's id unique when several sheets share one
 * HTML document, as they do in the report.
 */
export function sheetSvg(sheet: Sheet, idPrefix = sheet.id): string {
  const hatchId = `${idPrefix}-hatch`;
  const { widthMm: w, heightMm: h } = sheet.paper;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm"` +
    ` role="img" aria-label="${esc(`${sheet.number} ${sheet.title}`)}">` +
    `<style>${SHEET_CSS}</style><defs>${hatchPattern(hatchId)}${viewportClip(sheet, `${idPrefix}-clip`)}</defs>` +
    `<g class="sh-model" clip-path="url(#${idPrefix}-clip)">${sheet.items.map((i) => modelItemSvg(i, sheet.view, hatchId)).join('')}</g>` +
    `<g class="sh-paper">${sheet.paperItems.map((i) => paperItemSvg(i, hatchId)).join('')}</g>` +
    `</svg>`
  );
}

