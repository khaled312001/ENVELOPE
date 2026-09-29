/**
 * DXF writer — the drawing an architect can open.
 *
 * In the 30 Aug 2026 walkthrough the client's test of any tool was the same
 * gesture: generate something, export it, open it in AutoCAD. A capacity number
 * that cannot leave the browser is a number he has to retype, and a tool he has
 * to retype out of is one he will stop opening.
 *
 * Written by hand rather than through a library, for three reasons that matter
 * more here than the convenience would:
 *
 * 1. **R12 is the format everything reads.** It predates the object model that
 *    later versions layer on, so AutoCAD, BricsCAD, Revit's DWG import,
 *    LibreCAD and every online viewer accept it without negotiation.
 * 2. **Layers carry the provenance.** Every level is on its own layers and every
 *    element keeps the colour of the value that placed it, so the amber/neutral
 *    distinction the screen makes survives into the CAD file rather than being
 *    flattened into anonymous geometry.
 * 3. **Millimetres in, metres out, once.** The kernel holds integer millimetres
 *    (PRD §14.3); CAD files for Dubai plots are drawn in metres. Converting in
 *    exactly one place means the factor cannot drift between entity types.
 *
 * WHAT IT DRAWS IS THE SHEET, NOT A SECOND DRAWING OF THE SAME THING.
 *
 * Until the building model, this file was handed rectangles by the API and laid
 * them out itself — which made the DXF a second assembly of the scheme, able to
 * disagree with the screen. Now the sheet is composed once (`@envelope/sheets`)
 * and this file writes its display list: a bay on screen is a POLYLINE here, a
 * car on screen is an INSERT of the CAR block here, and `pnpm parity` counts
 * both.
 */

import type { BuildingModel, Mm, ModelPoint, ProvenanceClass } from '@envelope/core';
import {
  inkClass,
  issueDate,
  type ModelItem,
  NOT_CHECKED,
  type Role,
  type Sheet,
  SheetKind,
  type SymbolName,
  SYMBOLS,
} from '@envelope/sheets';

// ---------------------------------------------------------------------------
// The format
// ---------------------------------------------------------------------------

/** AutoCAD Colour Index values this writer uses. */
export const Aci = {
  RED: 1,
  YELLOW: 2,
  GREEN: 3,
  CYAN: 4,
  BLUE: 5,
  WHITE: 7,
  GREY: 8,
  LIGHT_GREY: 9,
  /** Orange — the nearest ACI has to the amber of §13.1. */
  AMBER: 30,
} as const;
export type Aci = (typeof Aci)[keyof typeof Aci];

export interface DxfLayer {
  readonly name: string;
  readonly color: Aci;
}

/** A point in millimetres with an elevation, for 3D entities. */
export interface DxfPoint3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type DxfEntity =
  | {
      readonly kind: 'polyline';
      readonly layer: string;
      /** Millimetres. */
      readonly points: readonly { readonly x: number; readonly y: number }[];
      readonly closed: boolean;
      /** Elevation of the whole polyline, millimetres. */
      readonly z: number;
      readonly color?: Aci;
    }
  | {
      readonly kind: 'text';
      readonly layer: string;
      readonly at: { readonly x: number; readonly y: number };
      readonly z: number;
      /** Text height in metres — DXF has no notion of "points". */
      readonly heightM: number;
      readonly rotationDeg: number;
      readonly align: 'start' | 'middle' | 'end';
      readonly value: string;
      readonly color?: Aci;
    }
  | {
      readonly kind: 'insert';
      readonly layer: string;
      readonly block: string;
      readonly at: { readonly x: number; readonly y: number };
      readonly z: number;
      readonly rotationDeg: number;
      /** Drawing units (metres) per block unit. */
      readonly scale: number;
    }
  | {
      readonly kind: '3dface';
      readonly layer: string;
      /** Three or four corners, millimetres. A triangle repeats its last corner. */
      readonly corners: readonly DxfPoint3[];
      readonly color?: Aci;
    };

/** A block, in metres about its insertion point. */
export interface DxfBlock {
  readonly name: string;
  readonly polylines: readonly { readonly points: readonly (readonly [number, number])[]; readonly closed: boolean }[];
}

export interface DxfDocument {
  readonly layers: readonly DxfLayer[];
  readonly blocks: readonly DxfBlock[];
  readonly entities: readonly DxfEntity[];
}

/**
 * A DXF group code / value pair.
 *
 * DXF is a flat sequence of these: an integer code on one line, its value on the
 * next. Modelling it as pairs rather than string concatenation is what keeps the
 * pairing correct — a single stray newline in a hand-built string shifts every
 * subsequent code by one and produces a file that opens as garbage.
 */
type Pair = readonly [number, string | number];

function fmt(pairs: readonly Pair[]): string {
  // DXF is conventionally CRLF. AutoCAD tolerates LF; some older importers and
  // several web viewers do not, and the failure mode is a silent empty drawing.
  return pairs.map(([code, value]) => `${code}\r\n${value}`).join('\r\n') + '\r\n';
}

/** Millimetres to metres, at the precision this drawing needs. */
function m(v: number): string {
  return (Math.round(v) / 1000).toFixed(4);
}

const deg = (v: number): string => (Math.round(v * 1000) / 1000).toFixed(3);

/**
 * Text for an R12 file, which is not Unicode.
 *
 * `±` and `°` have control codes every CAD reader knows (`%%p`, `%%d`) and are
 * written as those; anything else outside ASCII would be mojibake in the
 * drawing, so it becomes a visible `?` rather than being written blind.
 */
export function dxfText(value: string): string {
  return value.replace(/±/g, '%%p').replace(/°/g, '%%d').replace(/[^\x20-\x7E]/g, '?');
}

function header(extents: { min: DxfPoint3; max: DxfPoint3 } | undefined): Pair[] {
  const pairs: Pair[] = [
    [0, 'SECTION'],
    [2, 'HEADER'],
    [9, '$ACADVER'],
    [1, 'AC1009'], // R12
    [9, '$INSUNITS'],
    [70, 6], // metres — so a receiving CAD system scales correctly on insert
  ];
  if (extents) {
    pairs.push(
      [9, '$EXTMIN'],
      [10, m(extents.min.x)],
      [20, m(extents.min.y)],
      [30, m(extents.min.z)],
      [9, '$EXTMAX'],
      [10, m(extents.max.x)],
      [20, m(extents.max.y)],
      [30, m(extents.max.z)],
    );
  }
  pairs.push([0, 'ENDSEC']);
  return pairs;
}

function tables(layers: readonly DxfLayer[]): Pair[] {
  // Layer 0 is where block contents live, so an inserted car takes the layer and
  // colour of its INSERT. It exists in every drawing; declaring it is belt and
  // braces for importers that do not assume it.
  const all = [{ name: '0', color: Aci.WHITE }, ...layers.filter((l) => l.name !== '0')];
  const pairs: Pair[] = [
    [0, 'SECTION'],
    [2, 'TABLES'],
    [0, 'TABLE'],
    [2, 'LAYER'],
    [70, all.length],
  ];
  for (const layer of all) {
    pairs.push([0, 'LAYER'], [2, layer.name], [70, 0], [62, layer.color], [6, 'CONTINUOUS']);
  }
  pairs.push([0, 'ENDTAB'], [0, 'ENDSEC']);
  return pairs;
}

function blocks(list: readonly DxfBlock[]): Pair[] {
  const pairs: Pair[] = [
    [0, 'SECTION'],
    [2, 'BLOCKS'],
  ];
  for (const block of list) {
    pairs.push([0, 'BLOCK'], [8, '0'], [2, block.name], [70, 0], [10, '0.0'], [20, '0.0'], [30, '0.0'], [3, block.name]);
    for (const line of block.polylines) {
      pairs.push([0, 'POLYLINE'], [8, '0'], [66, 1], [70, line.closed ? 1 : 0], [10, '0.0'], [20, '0.0'], [30, '0.0']);
      for (const [x, y] of line.points) {
        pairs.push([0, 'VERTEX'], [8, '0'], [10, x.toFixed(4)], [20, y.toFixed(4)], [30, '0.0']);
      }
      pairs.push([0, 'SEQEND'], [8, '0']);
    }
    pairs.push([0, 'ENDBLK'], [8, '0']);
  }
  pairs.push([0, 'ENDSEC']);
  return pairs;
}

function entity(e: DxfEntity): Pair[] {
  const color: Pair[] = 'color' in e && e.color !== undefined ? [[62, e.color]] : [];
  switch (e.kind) {
    case 'polyline': {
      // R12 has no LWPOLYLINE. POLYLINE/VERTEX/SEQEND is the portable spelling;
      // the header point's z is the elevation of the whole polyline.
      const pairs: Pair[] = [
        [0, 'POLYLINE'],
        [8, e.layer],
        ...color,
        [66, 1],
        [70, e.closed ? 1 : 0],
        [10, '0.0'],
        [20, '0.0'],
        [30, m(e.z)],
      ];
      for (const p of e.points) {
        pairs.push([0, 'VERTEX'], [8, e.layer], [10, m(p.x)], [20, m(p.y)], [30, m(e.z)]);
      }
      pairs.push([0, 'SEQEND'], [8, e.layer]);
      return pairs;
    }
    case 'text': {
      const h = e.align === 'start' ? 0 : e.align === 'middle' ? 1 : 2;
      return [
        [0, 'TEXT'],
        [8, e.layer],
        ...color,
        [10, m(e.at.x)],
        [20, m(e.at.y)],
        [30, m(e.z)],
        [40, e.heightM.toFixed(4)],
        [1, dxfText(e.value)],
        [50, deg(e.rotationDeg)],
        // Horizontal justification, and middle vertically, about the second
        // alignment point — which is the same point, so the text sits where the
        // screen puts it.
        [72, h],
        [11, m(e.at.x)],
        [21, m(e.at.y)],
        [31, m(e.z)],
        [73, 2],
      ];
    }
    case 'insert':
      return [
        [0, 'INSERT'],
        [8, e.layer],
        [2, e.block],
        [10, m(e.at.x)],
        [20, m(e.at.y)],
        [30, m(e.z)],
        [41, e.scale.toFixed(6)],
        [42, e.scale.toFixed(6)],
        [43, e.scale.toFixed(6)],
        [50, deg(e.rotationDeg)],
      ];
    case '3dface': {
      const c = [...e.corners];
      while (c.length < 4) c.push(c[c.length - 1]!);
      const pairs: Pair[] = [[0, '3DFACE'], [8, e.layer], ...color];
      c.slice(0, 4).forEach((p, i) => pairs.push([10 + i, m(p.x)], [20 + i, m(p.y)], [30 + i, m(p.z)]));
      return pairs;
    }
  }
}

function extentsOf(doc: DxfDocument): { min: DxfPoint3; max: DxfPoint3 } | undefined {
  const pts: DxfPoint3[] = [];
  for (const e of doc.entities) {
    if (e.kind === 'polyline') pts.push(...e.points.map((p) => ({ ...p, z: e.z })));
    else if (e.kind === '3dface') pts.push(...e.corners);
    else pts.push({ ...e.at, z: e.z });
  }
  if (pts.length === 0) return undefined;
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of pts) {
    min.x = Math.min(min.x, p.x);
    min.y = Math.min(min.y, p.y);
    min.z = Math.min(min.z, p.z);
    max.x = Math.max(max.x, p.x);
    max.y = Math.max(max.y, p.y);
    max.z = Math.max(max.z, p.z);
  }
  return { min, max };
}

/** Serialise a document to DXF R12 text. */
export function writeDxf(doc: DxfDocument): string {
  return (
    fmt(header(extentsOf(doc))) +
    fmt(tables(doc.layers)) +
    fmt(blocks(doc.blocks)) +
    fmt([
      [0, 'SECTION'],
      [2, 'ENTITIES'],
    ]) +
    doc.entities.map((e) => fmt(entity(e))).join('') +
    fmt([
      [0, 'ENDSEC'],
      [0, 'EOF'],
    ])
  );
}

// ---------------------------------------------------------------------------
// The drawing standard: layers, colours, blocks
// ---------------------------------------------------------------------------

/**
 * One layer per level per role: `ENV-B1-BAY`, `ENV-L00-AISLE`, `ENV-SITE-SETBACK`.
 *
 * A reviewer's first move on receiving this file is to switch things off — bays
 * off to check the aisle runs, the ramp off to see what it costs, every level but
 * one off to read it alone. One layer per role per level is what makes each of
 * those one click, and the names are fixed so an office CAD standard can map them
 * once.
 */
export function layerName(prefix: string, role: Role | 'MASS' | 'TEXT'): string {
  return `ENV-${prefix}-${role}`.toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 31);
}

/** The colour of a role, when its ink is not its provenance class. */
const ROLE_ACI: Readonly<Partial<Record<Role, Aci>>> = {
  plot: Aci.WHITE,
  'edge-label': Aci.GREY,
  dimension: Aci.GREY,
  bay: Aci.CYAN,
  'bay-accessible': Aci.GREEN,
  'bay-number': Aci.GREY,
  car: Aci.GREY,
  aisle: Aci.LIGHT_GREY,
  'aisle-arrow': Aci.GREY,
  // The ramp is NOT ASSESSED, and its ink says so here as on screen: the deferred
  // grey, never the amber of an assumption and never the green of a citation.
  ramp: Aci.GREY,
  'ramp-arrow': Aci.GREY,
  access: Aci.RED,
  'access-arrow': Aci.RED,
  'cut-line': Aci.BLUE,
  'level-mark': Aci.GREY,
};

/** Provenance class to ACI — the screen's palette, as near as 256 colours get. */
export const CLASS_ACI: Readonly<Record<ProvenanceClass, Aci>> = {
  DERIVED: Aci.GREEN,
  ASSUMED: Aci.AMBER,
  USER_SET: Aci.BLUE,
  OBSERVED: Aci.CYAN,
  TRADEOFF: Aci.WHITE,
  VARIANCE: Aci.WHITE,
};

/** The sheets' symbols as blocks, in metres. The same geometry the screen draws. */
export function symbolBlocks(): DxfBlock[] {
  return (Object.keys(SYMBOLS) as SymbolName[]).map((name) => {
    // The car is defined in millimetres; the arrows in units of their own length.
    const unit = name === 'CAR' ? 1 / 1000 : 1;
    return {
      name,
      polylines: SYMBOLS[name].polylines.map((line) => ({
        closed: line.closed,
        points: line.points.map(([u, v]) => [u * unit, v * unit] as const),
      })),
    };
  });
}

function prefixOf(sheet: Sheet): string {
  if (sheet.kind === SheetKind.PARKING && sheet.levelId) return sheet.levelId;
  if (sheet.kind === SheetKind.SITE) return 'SITE';
  if (sheet.kind === SheetKind.TYPICAL) return 'TYPICAL';
  return sheet.id.toUpperCase();
}

/** A sheet's model items as DXF entities, at an elevation, on the sheet's layers. */
function itemsToEntities(
  sheet: Sheet,
  items: readonly ModelItem[],
  prefix: string,
  z: number,
  layers: Map<string, Aci>,
): DxfEntity[] {
  const out: DxfEntity[] = [];
  const use = (role: Role): string => {
    const name = layerName(prefix, role);
    if (!layers.has(name)) layers.set(name, ROLE_ACI[role] ?? Aci.WHITE);
    return name;
  };
  for (const item of items) {
    const ink = inkClass(item);
    const color = ink ? { color: CLASS_ACI[ink] } : {};
    if (item.kind === 'shape') {
      out.push({ kind: 'polyline', layer: use(item.role), points: item.points, closed: item.closed, z, ...color });
    } else if (item.kind === 'text') {
      out.push({
        kind: 'text',
        layer: use(item.role),
        at: item.at,
        z,
        // Paper millimetres × the sheet's scale = model millimetres; ÷ 1000 = metres.
        heightM: (item.sizeMm * sheet.view.scale) / 1000,
        rotationDeg: item.rotationDeg,
        align: item.anchor,
        value: item.value,
        ...color,
      });
    } else {
      out.push({
        kind: 'insert',
        layer: use(item.role),
        block: item.symbol,
        at: item.at,
        z,
        rotationDeg: item.rotationDeg,
        scale: item.symbol === 'CAR' ? item.scale : item.scale / 1000,
      });
    }
  }
  return out;
}

/**
 * What every drawing says about itself, above the geometry.
 *
 * The same facts the A3 title strip prints, because the DXF is the copy most
 * likely to be x-reffed into somebody else's sheet and read by a person who
 * never saw the strip. The issue date is the run's, never the export's — see
 * `SheetMeta.issuedAt`.
 */
function titleLines(sheetTitle: string, meta: DxfMeta): string[] {
  return [
    `${sheetTitle} - plot ${meta.plotNumber}, ${meta.community} - run ${meta.runId}`,
    `Issued ${issueDate(meta.issuedAt)}. Drawn by the TOP.ai engine. ` +
      `Checked by: ${meta.checkedBy ?? NOT_CHECKED}.`,
    'Revision 0 - first issue. No revision history is kept: a recomputation is a new run.',
    'NOT FOR CONSTRUCTION. REGULATORY VALIDITY: NOT ASSESSED.',
    'Generated capacity study, not a submission drawing. Layers: ENV-<level>-<element>.',
  ];
}

export interface DxfMeta {
  readonly plotNumber: string;
  readonly community: string;
  readonly runId: string;
  /** When the figures were computed, ISO 8601. Never when the file was written. */
  readonly issuedAt: string;
  /** Who signed G4, when somebody has. Absent is printed NOT CHECKED, in words. */
  readonly checkedBy?: string;
}

/**
 * R12 is not Unicode.
 *
 * `$DWGCODEPAGE` names a single-byte page, so a community or a reviewer whose
 * name carries an Arabic or an accented letter lands in a file that renders as
 * mojibake — and `scripts/verify-dxf.mjs` fails a drawing whose text leaves
 * printable ASCII, which is the right answer and would fail the download rather
 * than the test. Diacritics fold; anything else becomes a visible '?' rather
 * than being dropped, because a name silently shortened still reads as a name.
 */
const ascii = (s: string): string =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\u0020-\u007e]/g, '?');

function titleBlock(lines: readonly string[], anchor: ModelPoint, scale: number, layers: Map<string, Aci>): DxfEntity[] {
  const layer = layerName('ANNOTATION', 'TEXT');
  layers.set(layer, Aci.WHITE);
  const h = (3 * scale) / 1000;
  return lines.map((value, i) => ({
    kind: 'text' as const,
    layer,
    at: { x: anchor.x, y: anchor.y + (lines.length - i) * h * 1000 * 1.7 },
    z: 0,
    heightM: h,
    rotationDeg: 0,
    align: 'start' as const,
    value: ascii(value),
  }));
}

function topLeft(items: readonly ModelItem[]): ModelPoint {
  let minX = Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    const pts = item.kind === 'shape' ? item.points : [item.at];
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  return { x: (Number.isFinite(minX) ? minX : 0) as Mm, y: (Number.isFinite(maxY) ? maxY : 0) as Mm };
}

// ---------------------------------------------------------------------------
// The drawings
// ---------------------------------------------------------------------------

/**
 * One sheet as its own DXF: a parking level, the site plan, a section.
 *
 * Flat, at elevation zero, at true size in metres — the file an architect x-refs
 * into his own sheet. A section is drawn in its own plane, distance along the cut
 * against elevation, which is how a section is drawn in CAD.
 */
export function sheetDxf(sheet: Sheet, meta: DxfMeta): string {
  const layers = new Map<string, Aci>();
  const entities = itemsToEntities(sheet, sheet.items, prefixOf(sheet), 0, layers);
  entities.push(...titleBlock(titleLines(`${sheet.number} ${sheet.title}`, meta), topLeft(sheet.items), sheet.view.scale, layers));
  return writeDxf({
    layers: [...layers].map(([name, color]) => ({ name, color })),
    blocks: symbolBlocks(),
    entities,
  });
}

/** Roles that belong to the site and are drawn once, at grade — not on every level. */
/**
 * Roles the 3D file draws ONCE, at grade, on the site layer.
 *
 * Every plan sheet carries the plot context for reference, which is right on
 * paper — a parking plan with no boundary on it is a plan of nothing. Stacked
 * into one 3D file it is wrong: a boundary, a setback line and a road band
 * repeated at every parking level's floor put five copies of the street through
 * the car park.
 *
 * The bands joined this list the day they were added, for exactly that reason.
 */
const SITE_ROLES: ReadonlySet<Role> = new Set<Role>([
  'plot',
  'edge-label',
  'setback',
  'dimension',
  'band-arterial',
  'band-collector',
  'band-local',
  'band-access',
  'band-neighbour',
  'band-open-space',
]);

/**
 * The whole building in one DXF, in three dimensions.
 *
 * The site plan at grade; every parking level's plan at its own floor level, on
 * its own layers; every slab outline at its level; the massing as 3DFACE walls,
 * so the file orbits in AutoCAD as the screen's massing does; each ramp as the
 * sloped face it is. Sections are left to their own files: a section is a view,
 * and drawn into a 3D model it would stand in the car park.
 */
export function buildingDxf(model: BuildingModel, sheets: readonly Sheet[], meta: DxfMeta): string {
  const layers = new Map<string, Aci>();
  const entities: DxfEntity[] = [];
  const site = sheets.find((s) => s.kind === SheetKind.SITE);
  if (site) entities.push(...itemsToEntities(site, site.items, 'SITE', 0, layers));

  for (const sheet of sheets.filter((s) => s.kind === SheetKind.PARKING)) {
    const level = model.levels.find((l) => l.id === sheet.levelId);
    if (!level) continue;
    const own = sheet.items.filter((i) => !SITE_ROLES.has(i.role));
    entities.push(...itemsToEntities(sheet, own, level.id, level.elevationMm, layers));
  }

  for (const level of model.levels) {
    if (level.placed === false) {
      // Permitted and not placed: the outline alone, on a context layer in grey, and
      // no mass. Stacked solid, the file held a building the answer does not contain.
      const context = layerName(level.id, 'context');
      layers.set(context, Aci.GREY);
      entities.push({ kind: 'polyline', layer: context, points: level.outline, closed: true, z: level.elevationMm });
      continue;
    }
    const slab = layerName(level.id, 'slab');
    const mass = layerName(level.id, 'MASS');
    const color = CLASS_ACI[level.outlineSource.provenanceClass];
    layers.set(slab, color);
    layers.set(mass, color);
    if (!level.parking) {
      entities.push({ kind: 'polyline', layer: slab, points: level.outline, closed: true, z: level.elevationMm });
    }
    const z0 = level.elevationMm;
    const z1 = level.elevationMm + level.heightMm;
    const ring = level.outline;
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length]!;
      entities.push({
        kind: '3dface',
        layer: mass,
        corners: [
          { x: p.x, y: p.y, z: z0 },
          { x: q.x, y: q.y, z: z0 },
          { x: q.x, y: q.y, z: z1 },
          { x: p.x, y: p.y, z: z1 },
        ],
      });
    });
    // The floor, when the ring is convex: a fan of triangles from its first
    // vertex is then exact. A concave floor is left as its outline rather than
    // triangulated by a routine nobody has checked against it.
    if (isConvex(ring)) {
      for (let i = 1; i + 1 < ring.length; i += 1) {
        entities.push({
          kind: '3dface',
          layer: mass,
          corners: [ring[0]!, ring[i]!, ring[i + 1]!].map((p) => ({ x: p.x, y: p.y, z: z0 })),
        });
      }
    }

    /*
      THE CORE AS A SHAFT, on the same layer its plan outline is on.

      The parking sheets already put the core's outline in this file, because the
      DXF walks their display list — but a plan outline at one elevation is not a
      shaft, and above the parking there is no sheet to walk at all. So the walls
      are written here, level by level, exactly as the 3D view builds them. A
      file that orbits in AutoCAD showing a tower with nothing running up it is
      the drawing this work exists to stop.
    */
    if (model.core && model.core.levelIds.includes(level.id)) {
      const coreLayer = layerName(level.id, 'core');
      layers.set(coreLayer, CLASS_ACI[model.core.source.provenanceClass]);
      const shaft = model.core.outline;
      shaft.forEach((p, i) => {
        const q = shaft[(i + 1) % shaft.length]!;
        entities.push({
          kind: '3dface',
          layer: coreLayer,
          corners: [
            { x: p.x, y: p.y, z: z0 },
            { x: q.x, y: q.y, z: z0 },
            { x: q.x, y: q.y, z: z1 },
            { x: p.x, y: p.y, z: z1 },
          ],
        });
      });
      // Above the parking there is no sheet to draw the plan outline, so it is
      // written here too. On a parking level it is the same ring the sheet drew.
      if (!level.parking) {
        entities.push({ kind: 'polyline', layer: coreLayer, points: shaft, closed: true, z: z0 });
      }
    }
  }

  for (const ramp of model.ramps) {
    const layer = layerName(ramp.id, 'ramp');
    layers.set(layer, Aci.GREY);
    const [f0, f1] = ramp.foot;
    const [h0, h1] = ramp.head;
    entities.push({
      kind: '3dface',
      layer,
      corners: [
        { x: f0.x, y: f0.y, z: ramp.fromElevationMm },
        { x: f1.x, y: f1.y, z: ramp.fromElevationMm },
        { x: h1.x, y: h1.y, z: ramp.toElevationMm },
        { x: h0.x, y: h0.y, z: ramp.toElevationMm },
      ],
    });
  }

  const scale = site?.view.scale ?? 500;
  entities.push(
    ...titleBlock(
      [...titleLines('Building model, all levels', meta), 'Sections are exported as their own drawings.'],
      topLeft(site?.items ?? []),
      scale,
      layers,
    ),
  );
  return writeDxf({
    layers: [...layers].map(([name, color]) => ({ name, color })),
    blocks: symbolBlocks(),
    entities,
  });
}

function isConvex(ring: readonly ModelPoint[]): boolean {
  let sign = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const c = ring[(i + 2) % ring.length]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cross === 0) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}
