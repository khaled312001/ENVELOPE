/**
 * The drawing set, composed from a `BuildingModel`.
 *
 * - **A-001 Site plan** — the boundary with the client's own words on it (ROAD
 *   SIDE, NEIGHBOUR), each applied setback dimensioned, the podium and the tower
 *   on the setback line, the driveway, and where section A–A is cut.
 * - **A-1xx Parking levels** — one per level, bottom to top, each with its bays
 *   numbered and a car in every one, the aisles with their direction and width,
 *   the ramp and which way it climbs, and the reserved zone at its declared size.
 * - **A-201 Typical floor** — the tower plate on the podium it stands on.
 * - **A-301 Section A–A** — the stack, cut where the engine cut it.
 *
 * The composition decides where ink goes and nothing else. Every word inside the
 * model is the engine's (`label` fields), every figure in a title strip is a
 * traced value printed as it arrived, and anything the model does not contain is
 * not drawn — a sheet with no columns says "columns are not modelled" rather than
 * growing a plausible grid.
 */

import {
  accessOpenings,
  asMm,
  type BuildingModel,
  type ElementSource,
  type ModelEdge,
  type ModelLevel,
  type ModelCoreRoom,
  type ModelGroundRoom,
  type ModelPoint,
  type ModelRing,
  type ModelSection,
  type TracedWire,
} from '@envelope/core';

import { dimensionChain, DIM, metres } from './dimensions.js';
import { BAND_NOTE, bandWidthM, edgeBand } from './edges.js';
import {
  angleOf,
  boxOf,
  centroidOf,
  fitScale,
  inwardNormal,
  lengthOf,
  midpointOf,
  mm,
  offsetPoint,
  readable,
  round2,
  type Box,
} from './plane.js';
import { placeCars } from './cars.js';
import { settleLabels, withRule, type LabelRule } from './placement.js';
import { textLengthMm } from './text-box.js';
import { LETTERING } from './lettering.js';
import { drawingArea, PAPER, paperFurniture } from './strip.js';
import {
  type LegendEntry,
  type ModelItem,
  Role,
  type Sheet,
  SheetKind,
  type SheetMeta,
  type StripFact,
  SymbolName,
  type TextItem,
  TitleField,
} from './types.js';


/**
 * The scheme behind the bay numbers — §4.9 item 8 asks for it, not just the key.
 *
 * A number on a drawing is read as a reference to something. These refer to
 * nothing outside this sheet, and a reader who assumed otherwise would be
 * quoting a bay number into a lease.
 */
const BAY_NUMBERING =
  'Bays are numbered from 1 on each level, row by row in the order it was laid out. A number ' +
  'is a position on this sheet and nothing else: not a title, not an allocation.';

/**
 * Why there are no grid bubbles — §4.9 item 7, half of it refused.
 *
 * A bubble means a structural gridline to everyone who reads a drawing. The
 * layout charges Table B.11's clearance per bay but places no column, so
 * bubbling the drive aisles would put a grid nobody computed on the sheet an
 * architect is most likely to trace over. What the sheet gives instead is
 * derivable and stated: a bay number, and the module dimensioned across.
 */
const NO_GRID =
  'No structural grid is drawn: the engine places no column, and a bubble reads as a column ' +
  'line. Position is given by bay number and by the dimensioned module.';

/** For the reader who opens the same sheet in CAD and looks for the layer table. */
const CAD_LAYERS = 'In the DXF of this sheet, layers are named ENV-<level>-<element>.';

/** Paper millimetres of margin kept round the geometry for the labels outside it. */
const MARGIN = 14;

/**
 * Every label on the drawing is set at the note height (`lettering.ts`): 2.5 mm
 * on A3. Room names were 1.2 mm, bay numbers 1.6 mm and the caveats 1.2 mm, which
 * printed below ISO 3098's smallest height. A label that does not fit at this
 * height is moved or left to the key — it is not shrunk.
 */
const NOTE = LETTERING.noteMm;

/**
 * How far a label may move to clear another (`placement.ts`), in paper
 * millimetres. NEAR keeps a label beside what it names; ALONG lets the words of
 * a long, narrow thing — an aisle, a ramp — slide down its length and no further
 * off it.
 */
const NEAR: LabelRule = { alongMm: 10, acrossMm: 10 };
const ALONG: LabelRule = { alongMm: 30, acrossMm: 0 };
/**
 * A ramp's words: a little down its run, inside its strip, either side of the
 * arrow. Not far: where the module dimension's witness lines cross the strip,
 * the line is broken under the words rather than the words sent away from the
 * arrow they describe (`placement.ts`).
 */
const RAMP_WORDS: LabelRule = { alongMm: 12, acrossMm: 4 };

const shape = (
  role: Role,
  points: readonly ModelPoint[],
  closed: boolean,
  extra: { source?: ElementSource; bay?: number; name?: string } = {},
): ModelItem => ({ kind: 'shape', role, points, closed, ...extra });

const label = (
  role: Role,
  at: ModelPoint,
  value: string,
  sizeMm: number,
  rotationDeg = 0,
  anchor: TextItem['anchor'] = 'middle',
  source?: ElementSource,
): ModelItem => ({
  kind: 'text',
  role,
  at,
  value,
  sizeMm,
  rotationDeg: readable(rotationDeg),
  anchor,
  ...(source ? { source } : {}),
});

const sourceOf = (w: TracedWire): ElementSource => ({ node: w.node, provenanceClass: w.provenanceClass });

/** A strip fact read from a traced value: its words, its ink, and the node it opens. */
const fact = (text: string, w: TracedWire, value: string = w.value): StripFact => ({
  label: text,
  value,
  provenanceClass: w.provenanceClass,
  node: w.node,
});

/** "3.2" → "+3.20", "-3.2" → "-3.20". Text only: the figure is the engine's. */
export function signedLevel(value: string): string {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  const [whole = '0', frac = ''] = digits.split('.');
  const two = (frac + '00').slice(0, 2);
  const zero = /^0*$/.test(whole) && /^0*$/.test(frac);
  return `${zero ? '±' : negative ? '-' : '+'}${whole}.${two}`;
}

/**
 * The general notes each kind of sheet prints under its drawing — the same list
 * the drawing is fitted around (`frame`) and the band prints, so the two cannot
 * disagree about how much paper the notes take. SITE_NOTES serves every sheet
 * that is not a parking level.
 */
const SITE_NOTES: readonly string[] = [CAD_LAYERS];
const PARKING_NOTES: readonly string[] = [BAY_NUMBERING, NO_GRID, CAD_LAYERS];

/**
 * Scale and centre a sheet on the box its model items occupy, in the paper its
 * notes leave for the drawing (`drawingArea`).
 */
function frame(
  box: Box,
  notes: readonly string[],
  margin = MARGIN,
): Pick<Sheet, 'view' | 'viewport'> & { scale: number } {
  const area = drawingArea(notes);
  const scale = fitScale(box, area, margin);
  return {
    scale,
    view: {
      scale,
      centreModel: { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 },
      centrePaper: { x: area.x + area.width / 2, y: area.y + area.height / 2 },
    },
    viewport: area,
  };
}

export function composeSheets(model: BuildingModel, meta: SheetMeta): Sheet[] {
  const sheets: Sheet[] = [sitePlan(model, meta)];
  let n = 1;
  for (const level of model.levels) {
    if (level.parking) sheets.push(parkingSheet(model, level, meta, `A-1${String(n++).padStart(2, '0')}`));
  }
  const typical = typicalSheet(model, meta);
  if (typical) sheets.push(typical);
  const partFloor = partFloorSheet(model, meta);
  if (partFloor) sheets.push(partFloor);
  model.sections.forEach((section, i) => sheets.push(sectionSheet(model, section, meta, `A-30${i + 1}`)));

  /*
    SHEET n OF m, FILLED BY KEY.

    A strip is laid out one sheet at a time and only the set knows its size, so
    the field is emitted as a placeholder and addressed here. This is what
    §4.9's addressable fields buy on their first day: the alternative is a
    renderer looking for the word "SHEET", which also matches the title of every
    parking sheet in the set.
  */
  return sheets.map((sheet, i) => ({
    ...sheet,
    /*
      LABELS SETTLED LAST, on the finished sheet: only once every figure, number
      and paper item is down can a label be moved clear of them (`placement.ts`).
    */
    items: settleLabels(sheet.items, sheet.view, sheet.viewport, sheet.paperItems),
    paperItems: sheet.paperItems.map((item) =>
      item.kind === 'text' && item.field === TitleField.SHEET_OF
        ? { ...item, value: `${i + 1} OF ${sheets.length}` }
        : item,
    ),
  }));
}

// ---------------------------------------------------------------------------
// The plot, drawn the same way on every plan
// ---------------------------------------------------------------------------

/**
 * The role a boundary's band is drawn in — Eng. Mohamed's *"لازم رمز ليهم"*.
 *
 * Null where no band is drawn: an unclassified edge, and a road nobody has
 * ranked. An unclassified edge is a question, and a band for it would answer the
 * question in ink.
 */
export function bandRole(edge: ModelEdge): Role | null {
  if (edge.classification === 'ROAD') {
    switch (edge.roadHierarchy) {
      case 'ARTERIAL':
        return Role.BAND_ARTERIAL;
      case 'COLLECTOR':
        return Role.BAND_COLLECTOR;
      case 'LOCAL':
        return Role.BAND_LOCAL;
      case 'ACCESS':
        return Role.BAND_ACCESS;
      default:
        return null;
    }
  }
  if (edge.classification === 'ADJACENT_PLOT') return Role.BAND_NEIGHBOUR;
  if (edge.classification === 'OPEN_SPACE') return Role.BAND_OPEN_SPACE;
  return null;
}

/** What a band's legend row is called. The words on the plot form, ranked. */
export const BAND_LEGEND: Readonly<Partial<Record<Role, string>>> = {
  [Role.BAND_ARTERIAL]: 'Arterial road',
  [Role.BAND_COLLECTOR]: 'Collector road',
  [Role.BAND_LOCAL]: 'Local road',
  [Role.BAND_ACCESS]: 'Access road',
  [Role.BAND_NEIGHBOUR]: 'Neighbouring plot',
  [Role.BAND_OPEN_SPACE]: 'Open space',
};

/** Every band on this plot, deduplicated, in hierarchy order — for a legend. */
export function bandLegend(model: BuildingModel): LegendEntry[] {
  const order: readonly Role[] = [
    Role.BAND_ARTERIAL,
    Role.BAND_COLLECTOR,
    Role.BAND_LOCAL,
    Role.BAND_ACCESS,
    Role.BAND_NEIGHBOUR,
    Role.BAND_OPEN_SPACE,
  ];
  const present = new Set(model.plot.edges.map(bandRole).filter((r): r is Role => r !== null));
  return order.filter((r) => present.has(r)).map((role) => ({ role, label: BAND_LEGEND[role]! }));
}

/** Boundary, edge words, setback line — the context every plan sheet stands on. */
function plotContext(model: BuildingModel, s: number, withDimensions: boolean): ModelItem[] {
  const ring = model.plot.outline;
  const items: ModelItem[] = [shape(Role.PLOT, ring, true, { name: 'Plot boundary' })];
  /*
    THE BANDS FIRST, so the boundary and its dimensions sit over them. They are
    drawn on the OUTSIDE of the plot, where the road is: inward they would lie on
    the setback strip and read as another limit.
  */
  for (const edge of model.plot.edges) {
    const role = bandRole(edge);
    if (!role) continue;
    const box = boxOf(ring);
    const spanM = Math.max(box.maxX - box.minX, box.maxY - box.minY) / 1000;
    const band = edgeBand(
      ring,
      edge.start,
      edge.end,
      bandWidthM(edge.classification, edge.roadHierarchy, spanM),
    );
    if (band) {
      items.push(shape(role, band, true, { name: `${BAND_LEGEND[role]!}, edge ${edge.seq + 1}` }));
    }
  }
  for (const edge of model.plot.edges) {
    const n = inwardNormal(edge.start, edge.end, ring);
    const mid = midpointOf(edge.start, edge.end);
    const along = angleOf(edge.start, edge.end);
    // Outside the boundary, one and a half text heights clear of it.
    items.push(label(Role.EDGE_LABEL, offsetPoint(mid, n, -2.6 * NOTE * s), edge.label, NOTE, along));

    if (withDimensions) {
      /*
        THE OVERALL CHAIN: every boundary measured, outside the plot and outside
        its band, with the length the ENGINE holds rather than one the composer
        measured off its own drawing. The two agree on a correct model, which is
        precisely why a disagreement would go unseen — the drawing would win,
        silently, in a file somebody x-refs into a submission set.
      */
      items.push(
        ...dimensionChain([edge.start, edge.end], [metres(edge.lengthMm)], {
          scale: s,
          out: { x: -n.x, y: -n.y },
          offsetMm: outwardDimensionMm(model, s),
        }),
      );

      /*
        THE INTERMEDIATE CHAIN: the setback, perpendicular to the same boundary
        and inside the plot, so the two read together — how long the edge is and
        how far the building stands off it. Drawn as a chain rather than as a bare
        line and two ticks, because a witness line is what tells a reader WHICH
        two points the figure spans.
      */
      const depth = edge.setbackM === null ? 0 : Number(edge.setbackM) * 1000;
      if (depth > 0) {
        // A quarter of the way along the edge, clear of the midpoint where the
        // driveway most often lands.
        const foot = mm(
          edge.start.x + (edge.end.x - edge.start.x) * 0.25,
          edge.start.y + (edge.end.y - edge.start.y) * 0.25,
        );
        const head = offsetPoint(foot, n, depth);
        const len = lengthOf(edge.start, edge.end) || 1;
        const t = { x: (edge.end.x - edge.start.x) / len, y: (edge.end.y - edge.start.y) / len };
        items.push(
          ...dimensionChain([foot, head], [`${edge.setbackM} M`], {
            scale: s,
            out: t,
            offsetMm: 0,
          }),
        );
      }
    }
  }
  items.push(shape(Role.SETBACK, model.setbackLine, true, { source: model.setbackSource, name: 'Setback line' }));
  return items;
}


/**
 * How far outside the boundary a dimension chain sits, in paper millimetres.
 *
 * Past the widest band on the plot, because a figure printed on top of the road
 * symbol is a figure nobody reads. The band is measured in metres and the clear
 * gap in paper millimetres, so the scale has to come in — which is also why the
 * site plan fits itself twice: see `sitePlan`.
 */
export function outwardDimensionMm(model: BuildingModel, s: number): number {
  const box = boxOf(model.plot.outline);
  const spanM = Math.max(box.maxX - box.minX, box.maxY - box.minY) / 1000;
  let widestM = 0;
  for (const edge of model.plot.edges) {
    const w = bandWidthM(edge.classification, edge.roadHierarchy, spanM);
    if (w > widestM) widestM = w;
  }
  return (widestM * 1000) / s + DIM_CLEAR_MM;
}

/** Paper millimetres of clear air between the widest band and the chain. */
const DIM_CLEAR_MM = 7;

/** The paper the chain and its figure take, beyond the boundary. */
export const dimensionReachMm = (model: BuildingModel, s: number): number =>
  outwardDimensionMm(model, s) + DIM.overMm + DIM.liftMm + DIM.textMm;


/**
 * Dimensions last, so they are drawn over everything they measure.
 *
 * Annotation belongs on top: a section line crossing a boundary is a drawing, a
 * section line crossing the figure that measures it is a figure nobody can read.
 * The text halo only masks ink laid down before it, so the order is the fix and a
 * thicker halo is not. One list for every renderer, so the screen, the sheet and
 * the DXF all take the same order — which is what `pnpm parity` compares.
 */
function annotationLast(items: readonly ModelItem[]): ModelItem[] {
  const under: ModelItem[] = [];
  const over: ModelItem[] = [];
  for (const item of items) (item.role === Role.DIMENSION ? over : under).push(item);
  return [...under, ...over];
}

/**
 * The core, on a level it passes through.
 *
 * One helper for every sheet, because the core is the same footprint on all of
 * them — that is what makes it a core. A sheet that drew its own would be a
 * second placement of one thing, which is the defect `BuildingModel` exists to
 * end.
 *
 * Empty for a level the core does not reach, and empty on a run stored before
 * the engine sized one. Neither case draws a substitute.
 */
function coreItems(model: BuildingModel, levelId: string, s: number): ModelItem[] {
  const core = model.core;
  if (!core || !core.levelIds.includes(levelId)) return [];
  const onParking = model.levels.some((l) => l.id === levelId && l.parking);
  if (onParking && core.shaft) return [...shaftItems(core, core.shaft, s), ...coreEntranceItems(core, levelId, s)];
  const box = boxOf(core.outline);
  const wide = box.maxX - box.minX >= box.maxY - box.minY;
  const rooms = core.rooms ?? [];
  const lobby = rooms.find((r) => r.kind === 'LOBBY');
  const at = coreLabelAt(core.outline, lobby);
  const items: ModelItem[] = [
    shape(Role.CORE, core.outline, true, { source: core.source, name: core.label }),
    withRule(label(Role.CORE, at, core.label, NOTE, wide ? 0 : 90, 'middle', core.source), NEAR),
  ];
  if (rooms.length > 0) {
    for (const room of rooms) items.push(...coreRoomItems(room, core.roomsSource));
    /*
      THE CAVEAT ON THE DRAWING, under the core's own label, in the program's
      ink. A stair drawn without it reads as an egress design; a sentence in the
      title strip is a sentence a reader of a cropped plan never sees.
    */
    const below = wide ? { x: at.x, y: at.y - 3 * s } : { x: at.x + 3 * s, y: at.y };
    items.push(
      withRule(label(Role.CORE_ROOM, mm(below.x, below.y), CORE_CAVEAT, NOTE, wide ? 0 : 90, 'middle', core.roomsSource), NEAR),
    );
  }
  items.push(...coreEntranceItems(core, levelId, s));
  return items;
}

/** The words beside the door. "Indicative" travels with them onto a cropped plan. */
const CORE_ENTRANCE_LABEL = 'CORE ENTRANCE - INDICATIVE';

/** Segments in a drawn door swing: enough to read as an arc at any sheet scale. */
const SWING_STEPS = 8;

/**
 * The way into the core, on the level at grade only: a pair of doors in the lift
 * lobby's open side, drawn the way every architect draws one — each leaf open
 * into the lobby and the arc it swings through — with its words outside. A door
 * swing is drafting, like a stair's treads, so it is not a symbol to key. In the
 * indicative program's ink, because the door is part of that assumption: he said
 * the core needs one and gave no width and no side.
 *
 * Nothing leads to it. The building's own entrance and the route from the street
 * are not placed, and a path drawn up to this door would be a route nobody chose.
 */
function coreEntranceItems(
  core: NonNullable<BuildingModel['core']>,
  levelId: string,
  s: number,
): ModelItem[] {
  const entrance = core.entrance;
  const lobby = core.rooms?.find((r) => r.kind === 'LOBBY');
  if (!entrance || entrance.levelId !== levelId || !lobby) return [];
  const [a, b] = entrance.opening;
  const mid = midpointOf(a, b);
  const half = lengthOf(a, mid);
  if (half === 0) return [];
  // Inward: square to the opening, on the lobby's side of it. The door is not
  // opposite the lobby's centre, so the direction to that centre is the side only.
  const c = centroidOf(lobby.outline);
  const normal = { x: -(b.y - a.y) / (2 * half), y: (b.x - a.x) / (2 * half) };
  const side = (c.x - mid.x) * normal.x + (c.y - mid.y) * normal.y;
  if (side === 0) return [];
  const inward = side > 0 ? normal : { x: -normal.x, y: -normal.y };
  const opts = { ...(core.roomsSource ? { source: core.roomsSource } : {}), name: 'Core entrance - indicative' };
  const items: ModelItem[] = [];
  for (const hinge of [a, b]) {
    const shut = { x: (mid.x - hinge.x) / half, y: (mid.y - hinge.y) / half };
    const swing: ModelPoint[] = [];
    for (let i = 0; i <= SWING_STEPS; i++) {
      const t = (Math.PI / 2) * (i / SWING_STEPS);
      swing.push(
        mm(
          hinge.x + half * (Math.cos(t) * inward.x + Math.sin(t) * shut.x),
          hinge.y + half * (Math.cos(t) * inward.y + Math.sin(t) * shut.y),
        ),
      );
    }
    items.push(shape(Role.CORE_ROOM, [hinge, swing[0]!], false, opts));
    items.push(shape(Role.CORE_ROOM, swing, false, opts));
  }
  items.push(
    withRule(
      label(Role.CORE_ROOM, offsetPoint(mid, inward, -2.4 * s), CORE_ENTRANCE_LABEL, NOTE, angleOf(a, b), 'middle', core.roomsSource),
      NEAR,
    ),
  );
  return items;
}

/**
 * The core on a parking level: its shafts — stairs, lifts and the lift lobby —
 * and not the whole residential core, whose corridors and floor lobby are not on
 * a car park. The parking layout placed no bay inside this box. The box is full
 * of rooms, so its label and the caveat go just outside it, on the lobby side.
 */
function shaftItems(
  core: NonNullable<BuildingModel['core']>,
  shaft: NonNullable<NonNullable<BuildingModel['core']>['shaft']>,
  s: number,
): ModelItem[] {
  const source = sourceOf(shaft.areaM2);
  const [o, a, far, back] = shaft.outline as [ModelPoint, ModelPoint, ModelPoint, ModelPoint];
  const across = lengthOf(o, back);
  const v = across === 0 ? { x: 0, y: 1 } : { x: (back.x - o.x) / across, y: (back.y - o.y) / across };
  const farMid = midpointOf(far, back);
  const along = angleOf(o, a);
  const items: ModelItem[] = [shape(Role.CORE, shaft.outline, true, { source, name: shaft.label })];
  for (const room of core.rooms ?? []) items.push(...coreRoomItems(room, core.roomsSource));
  items.push(
    withRule(label(Role.CORE, mm(farMid.x + v.x * 2.6 * s, farMid.y + v.y * 2.6 * s), shaft.label, NOTE, along, 'middle', source), NEAR),
    withRule(
      label(Role.CORE_ROOM, mm(farMid.x + v.x * 6 * s, farMid.y + v.y * 6 * s), CORE_CAVEAT, NOTE, along, 'middle', core.roomsSource),
      NEAR,
    ),
  );
  return items;
}

/**
 * Where the core's own label goes: its centre, or — when the rooms fill the
 * centre — the middle of the strip beyond the lift lobby, if there is room to
 * read it there. A label on top of "LIFT LOBBY" is two labels nobody can read.
 */
function coreLabelAt(outline: readonly ModelPoint[], lobby: ModelCoreRoom | undefined): ModelPoint {
  const centre = centroidOf(outline);
  if (!lobby) return centre;
  const [o, , far, back] = lobby.outline as [ModelPoint, ModelPoint, ModelPoint, ModelPoint];
  const across = lengthOf(o, back);
  if (across === 0) return centre;
  const v = { x: (back.x - o.x) / across, y: (back.y - o.y) / across };
  const farMid = midpointOf(far, back);
  const beyond = Math.max(...outline.map((p) => (p.x - farMid.x) * v.x + (p.y - farMid.y) * v.y));
  return beyond >= 1500 ? mm(farMid.x + (v.x * beyond) / 2, farMid.y + (v.y * beyond) / 2) : centre;
}

/**
 * One room of the indicative ground-floor program: its outline and its name, in
 * the program's ink, the name read along the room's longer side.
 */
function groundRoomItems(room: ModelGroundRoom, source: ElementSource): ModelItem[] {
  const [o, a, , b] = room.outline as [ModelPoint, ModelPoint, ModelPoint, ModelPoint];
  const rotation = lengthOf(o, a) >= lengthOf(o, b) ? angleOf(o, a) : angleOf(o, b);
  return [
    shape(Role.GROUND_ROOM, room.outline, true, { source, name: `${room.name} - indicative` }),
    // Nothing but its name tells the substation from the water tank: if the name
    // will not fit inside, it stands beside the room on a leader (`placement.ts`).
    withRule(label(Role.GROUND_ROOM, centroidOf(room.outline), room.name, NOTE, rotation, 'middle', source), {
      within: room.outline,
      leaderMm: 30,
    }),
  ];
}

/** Under the core label wherever an indicative layout is drawn. */
const CORE_CAVEAT = 'INDICATIVE LAYOUT - EGRESS NOT ASSESSED';

const ROOM_LABEL: Readonly<Record<ModelCoreRoom['kind'], string>> = {
  STAIR: 'STAIR',
  LIFT: 'LIFT',
  LOBBY: 'LIFT LOBBY',
};

/** Tread spacing on a drawn stair: a going of 280 mm, the drafting convention. */
const TREAD_MM = 280;
/** The landing kept clear of treads at each end of a stair. */
const LANDING_MM = 1200;

/**
 * One room of the indicative core layout. The outline and label carry the
 * program's class — assumed, so amber — and the drafting inside it does not: a
 * stair's treads and a lift's cross are symbols of what the room is, not more
 * claims to paint.
 */
function coreRoomItems(room: ModelCoreRoom, source: ElementSource | undefined): ModelItem[] {
  const [o, a, , b] = room.outline as [ModelPoint, ModelPoint, ModelPoint, ModelPoint];
  const along = lengthOf(o, a);
  const across = lengthOf(o, b);
  if (along === 0 || across === 0) return [];
  const u = { x: (a.x - o.x) / along, y: (a.y - o.y) / along };
  const v = { x: (b.x - o.x) / across, y: (b.y - o.y) / across };
  const at = (s: number, t: number): ModelPoint =>
    mm(o.x + s * u.x + t * v.x, o.y + s * u.y + t * v.y);
  const items: ModelItem[] = [
    shape(Role.CORE_ROOM, room.outline, true, {
      ...(source ? { source } : {}),
      name: `${ROOM_LABEL[room.kind]} - indicative`,
    }),
  ];
  if (room.kind === 'STAIR' && along > 2 * LANDING_MM) {
    // The wall between the two flights, then the treads across both.
    items.push(shape(Role.CORE_ROOM, [at(LANDING_MM, across / 2), at(along - LANDING_MM, across / 2)], false));
    for (let s = LANDING_MM; s <= along - LANDING_MM + 1; s += TREAD_MM) {
      items.push(shape(Role.CORE_ROOM, [at(s, 0), at(s, across)], false));
    }
  }
  if (room.kind === 'LIFT') {
    items.push(shape(Role.CORE_ROOM, [at(0, 0), at(along, across)], false));
    items.push(shape(Role.CORE_ROOM, [at(along, 0), at(0, across)], false));
  }
  // A stair's label sits on its landing, clear of the treads, read along the landing.
  const labelAt = room.kind === 'STAIR' ? at(LANDING_MM / 2, across / 2) : centroidOf(room.outline);
  const rotation = room.kind === 'STAIR' ? angleOf(o, b) : angleOf(o, a);
  items.push(
    withRule(label(Role.CORE_ROOM, labelAt, ROOM_LABEL[room.kind], NOTE, rotation, 'middle', source), {
      within: room.outline,
    }),
  );
  return items;
}

/*
  EVERY OPENING, SIGNED. One two-way gap carries the two-headed arrow; an entry
  and an exit carry one head each, pointing in and pointing out (16 Oct 2026).
  Two lanes side by side are 3 m apart, closer than a label is long, so the
  second label on a boundary steps further out instead of printing over the first.
*/
/*
  THE LABEL OUTSIDE THE DIMENSION. On the site plan the boundary is measured by
  a chain outside it, and the entrance's words were set 15.6 mm out — the same
  band as that chain's figure. On the worked example VEHICLE ENTRY / EXIT - 6.00M
  covered 96% of the 80.00 M measuring the frontage, the one length the access
  rule is read off. So on a sheet with the chain the label stands a text height
  beyond the chain's reach (`labelOutMm`); a parking sheet draws no chain and
  keeps the old offset.
*/
function accessItems(model: BuildingModel, s: number, labelOutMm = 6.5 * 2.4): ModelItem[] {
  const access = model.access;
  if (!access) return [];
  const arrowLength = Math.max(4000, 10 * s);
  const items: ModelItem[] = [];
  const onEdge = new Map<number, number>();
  for (const o of accessOpenings(access)) {
    const [a, b] = o.opening;
    const n = inwardNormal(a, b, model.plot.outline);
    const mid = midpointOf(a, b);
    const outward = o.role === 'EXIT';
    const step = onEdge.get(o.edgeSeq) ?? 0;
    onEdge.set(o.edgeSeq, step + 1);
    items.push(
      shape(Role.ACCESS, [a, b], false, { source: access.source, name: o.label }),
      {
        kind: 'symbol',
        role: Role.ACCESS_ARROW,
        symbol: o.role === 'ENTRY_EXIT' ? SymbolName.ARROW_2WAY : SymbolName.ARROW,
        at: offsetPoint(mid, n, arrowLength / 2),
        rotationDeg: round2(angleOf(mid, offsetPoint(mid, n, outward ? -1000 : 1000))),
        scale: arrowLength,
      },
      withRule(
        label(Role.ACCESS, offsetPoint(mid, n, -(labelOutMm + step * 1.4 * NOTE) * s), o.label, NOTE, angleOf(a, b), 'middle', access.source),
        { alongMm: 20, acrossMm: 2.5 },
      ),
    );
  }
  return items;
}

/** The key to the entrance this model draws: the arrows it actually used, and no others. */
function accessLegend(model: BuildingModel): LegendEntry[] {
  if (!model.access) return [];
  const roles = new Set(accessOpenings(model.access).map((o) => o.role));
  const oneWay = roles.has('ENTRY') || roles.has('EXIT');
  return [
    { role: Role.ACCESS, label: oneWay ? 'Vehicle entry and exit, one way each' : 'Vehicle entry / exit' },
    ...(roles.has('ENTRY_EXIT')
      ? [{ role: Role.ACCESS_ARROW, symbol: SymbolName.ARROW_2WAY, label: 'Direction of travel, in and out' }]
      : []),
    ...(oneWay
      ? [{ role: Role.ACCESS_ARROW, symbol: SymbolName.ARROW, label: 'Direction of travel: in at the entry, out at the exit' }]
      : []),
  ];
}

/*
  THE RAMPS FROM THE STREET, where the ground floor does not park. Each is drawn
  where it stands — on the site plan, which is the ground floor, and on the sheet
  of the parking level it reaches, whose slab it is cut through — with the level
  landing before it (DBC B.7.2.3.3 ¶4) and an arrow the way a car arriving from
  the street drives. They are not the strip's ramp, and the strip's words never
  name them: `ModelRamp.street` is what tells them apart.
*/
function streetRampItems(model: BuildingModel, s: number, levelId: string | null): ModelItem[] {
  const items: ModelItem[] = [];
  const landings = new Set<string>();
  for (const ramp of model.ramps) {
    if (!ramp.street) continue;
    if (levelId !== null && ramp.fromLevelId !== levelId && ramp.toLevelId !== levelId) continue;
    const source = sourceOf(ramp.gradientPct);
    /*
      THE LANDING IS AT GRADE, SO ONLY THE SITE PLAN DRAWS IT. It is the level
      approach on the ground floor before the barrier; on B1 or P1 the same
      outline lies over bays the layout rightly kept there, and drawn in aisle ink
      it read as a drive across them — the one thing a parking sheet may never
      draw on a bay. Both ramps share it, so it is drawn once.
    */
    const key = ramp.street.landing.map((p) => `${p.x},${p.y}`).join(' ');
    if (levelId === null && !landings.has(key)) {
      landings.add(key);
      items.push(shape(Role.AISLE, ramp.street.landing, true, { name: `Level landing before the ramps from the street, DBC B.7.2.3.3` }));
    }
    items.push(shape(Role.RAMP, ramp.outline, true, { source, name: ramp.label }));
    const footMid = midpointOf(ramp.foot[0], ramp.foot[1]);
    const headMid = midpointOf(ramp.head[0], ramp.head[1]);
    // A car from the street starts at grade: down a ramp to a basement it drives
    // from the head to the foot, up one to the podium from the foot to the head.
    const down = ramp.fromElevationMm < 0;
    const along = down ? angleOf(headMid, footMid) : angleOf(footMid, headMid);
    const run = lengthOf(footMid, headMid);
    const c = centroidOf(ramp.outline);
    items.push({
      kind: 'symbol',
      role: Role.RAMP_ARROW,
      symbol: SymbolName.ARROW,
      at: c,
      rotationDeg: round2(along),
      scale: Math.round(run * 0.5),
    });
    const across = { x: -Math.sin((along * Math.PI) / 180), y: Math.cos((along * Math.PI) / 180) };
    const head = 0.09 * Math.round(run * 0.5);
    /*
      TWO LINES, AS THE STRIP'S RAMP IS LABELLED: where it goes on one side of the
      arrow, its gradient on the other. Printed as one line — "RAMP FROM STREET
      DOWN TO B1 12% - 6% TRANSITIONS (DBC TABLES B.9, B.10)" — it was longer than
      the ramp at every scale the sheets use, so it could fit nowhere inside it and
      stayed across the entrance's words, a dimension and a bay number. The model's
      label is cut, not re-typed: the gradient line is the label less the words,
      and less the tables it cites in brackets — a 30.27 m ramp at 1:500 holds
      "RAMP 12% - 6% TRANSITIONS" and not the 64 mm of paper the bracket adds.
      The citation is not lost: the ramp's outline carries the whole label as its
      name, and a click on it opens the derivation that cites Tables B.9 and B.10.
    */
    const words = `FROM STREET ${down ? `DOWN TO ${ramp.fromLevelId}` : `UP TO ${ramp.toLevelId}`}`;
    const prefix = `RAMP ${words} `;
    const rest = ramp.label.startsWith(prefix) ? `RAMP ${ramp.label.slice(prefix.length)}` : ramp.label;
    const gradient = rest.split(' (')[0] ?? rest;
    const rule: LabelRule = { ...RAMP_WORDS, within: ramp.outline, withhold: false };
    items.push(withRule(label(Role.RAMP, offsetPoint(c, across, Math.max(2.6 * s, head + 1.9 * s)), words, NOTE, along), rule));
    items.push(
      withRule(
        label(Role.RAMP, offsetPoint(c, across, -Math.max(3 * s, head + 1.9 * s)), gradient, NOTE, along, 'middle', source),
        rule,
      ),
    );
  }
  return items;
}

/** The key row for a ramp from the street, on a sheet that draws one and keys its arrow nowhere else. */
function streetRampLegend(items: readonly ModelItem[], legend: readonly LegendEntry[]): LegendEntry[] {
  const drawn = items.some((i) => i.kind === 'symbol' && i.role === Role.RAMP_ARROW);
  if (!drawn || legend.some((e) => e.role === Role.RAMP_ARROW && e.symbol === SymbolName.ARROW)) return [];
  return [{ role: Role.RAMP_ARROW, symbol: SymbolName.ARROW, label: 'Ramp from the street, direction of travel' }];
}

// ---------------------------------------------------------------------------
// A-001 Site plan
// ---------------------------------------------------------------------------

function sitePlan(model: BuildingModel, meta: SheetMeta): Sheet {
  const box = boxOf(model.plot.outline);
  /*
    FITTED TWICE. The dimension chains sit outside the boundary, and the room they
    need is part paper (the clear gap, the text) and part model (the band they
    clear). So the sheet is fitted once to learn its scale, the reach is worked out
    at that scale, and it is fitted again with room for it. `fitScale` chooses off
    a ladder of standard scales, so the second pass either keeps the scale or steps
    down one rung — it cannot oscillate, and 1:237 is not on the ladder to land on.
  */
  const f = frame(box, SITE_NOTES, MARGIN + dimensionReachMm(model, frame(box, SITE_NOTES).scale));
  const s = f.scale;
  const items: ModelItem[] = [...plotContext(model, s, true)];

  const ground = model.levels.find((l) => l.elevationMm === 0) ?? model.levels[0];
  const tower = model.levels.find((l) => l.use === 'TYPICAL');
  if (ground) {
    items.push(shape(Role.PODIUM, ground.outline, true, { source: ground.outlineSource, name: 'Podium footprint' }));
  }
  if (tower && !sameRing(tower.outline, ground?.outline ?? [])) {
    items.push(shape(Role.TOWER, tower.outline, true, { source: tower.outlineSource, name: 'Tower plate' }));
  }
  items.push(...accessItems(model, s, dimensionReachMm(model, s) + NOTE));
  items.push(...streetRampItems(model, s, null));

  for (const section of model.sections) {
    const [a, b] = section.line;
    const len = lengthOf(a, b) || 1;
    const t = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    // Past the edge words (which sit 6.2 mm of paper outside the boundary) AND
    // past the dimension chains, so a section letter never lands on ROAD SIDE, on
    // NEIGHBOUR, or on the figure measuring the edge it crosses.
    const reach = Math.max(11, dimensionReachMm(model, s) + 3);
    const ends = [offsetPoint(a, t, -reach * s), offsetPoint(b, t, reach * s)] as const;
    items.push(shape(Role.CUT_LINE, ends, false, { name: `Section ${section.id}-${section.id} cut line` }));
    items.push(label(Role.CUT_LINE, offsetPoint(ends[0], t, -2.4 * s), section.id, 3.4));
    items.push(label(Role.CUT_LINE, offsetPoint(ends[1], t, 2.4 * s), section.id, 3.4));
  }

  const facts: StripFact[] = [
    fact('Height ceiling', model.heightCeilingM, `${model.heightCeilingM.value} M`),
    { label: 'Levels drawn', value: levelRange(model.levels) },
  ];
  const legend: LegendEntry[] = [
    { role: Role.PLOT, label: 'Plot boundary' },
    { role: Role.DIMENSION, label: 'Dimension, in metres, from the engine' },
    // Every boundary kind this plot actually has, ranked. A legend listing the
    // four road classes on a plot with one road is a key to a drawing nobody made.
    ...bandLegend(model),
    { role: Role.SETBACK, provenanceClass: model.setbackSource.provenanceClass, label: 'Setback line, from each cited setback' },
    ...(ground ? [{ role: Role.PODIUM, provenanceClass: ground.outlineSource.provenanceClass, label: 'Podium footprint' }] : []),
    ...(tower ? [{ role: Role.TOWER, provenanceClass: tower.outlineSource.provenanceClass, label: 'Tower plate' }] : []),
    ...accessLegend(model),
    ...(model.sections.length > 0 ? [{ role: Role.CUT_LINE, label: 'Section cut line' }] : []),
  ];
  legend.push(...streetRampLegend(items, legend));

  return {
    id: 'site',
    kind: SheetKind.SITE,
    levelId: null,
    number: 'A-001',
    title: 'Site plan',
    paper: PAPER,
    view: f.view,
    viewport: f.viewport,
    items: annotationLast(items),
    paperItems: paperFurniture({
      title: 'Site plan',
      number: 'A-001',
      scale: s,
      meta,
      facts,
      legend,
      legendNotes: SITE_NOTES,
      north: true,
    }),
    facts,
    legend,
    notes: [
      // Said wherever a band is drawn: the band ranks, it does not measure.
      ...(bandLegend(model).length > 0 ? [BAND_NOTE] : []),
      ...model.placements.map((p) => p.statement),
      ...model.sections.map((x) => `Section ${x.id}-${x.id}: ${x.taken}`),
    ],
  };
}


/**
 * A module dimensioned across one aisle: bay, aisle, bay.
 *
 * The figure an architect checks first, and the one the client's own drawings
 * carry — "6.00M WIDE 2 WAY DRIVEWAY". All three come from Table B.11 as the
 * engine cited them; none is a distance read back off a rectangle drawn above.
 *
 * It is placed **outside the slab edge**, clear of the level along the aisle's
 * own direction. Set beside the aisle it would land on the cross aisle at one end
 * or the ramp at the other, and a dimension printed over the thing it measures is
 * a dimension nobody reads.
 */
function moduleChain(
  parking: NonNullable<ModelLevel['parking']>,
  outline: readonly ModelPoint[],
  s: number,
): ModelItem[] {
  /*
    A module aisle, never the cross aisle: the cross aisle has no bay run on
    either side, so a module measured across it is a module nobody laid out.

    And the LONGEST of them. The first in the list was taken, and on a ring
    layout that is a 6 × 5.5 m piece at a corner of the ring: its longer side runs
    ACROSS the driveway, so the chain was measured along the driveway and printed
    a bay above the slab edge, where there is only setback.
  */
  const longest = (o: readonly ModelPoint[]): number =>
    Math.max(...o.map((p, i) => lengthOf(p, o[(i + 1) % o.length]!)));
  const ring = parking.aisles
    .filter((a) => !a.crossing)
    .slice()
    .sort((a, b) => longest(b.outline) - longest(a.outline))[0]?.outline;
  const p0 = ring?.[0];
  const p1 = ring?.[1];
  const p2 = ring?.[2];
  if (!ring || !p0 || !p1 || !p2) return [];

  const e1 = { x: p1.x - p0.x, y: p1.y - p0.y };
  const e2 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const l1 = Math.hypot(e1.x, e1.y) || 1;
  const l2 = Math.hypot(e2.x, e2.y) || 1;
  // The long edge runs along the aisle; the short one runs across it, which is
  // the direction a module is measured in.
  const longFirst = l1 >= l2;
  const u = longFirst ? { x: e1.x / l1, y: e1.y / l1 } : { x: e2.x / l2, y: e2.y / l2 };
  const w = longFirst ? { x: e2.x / l2, y: e2.y / l2 } : { x: e1.x / l1, y: e1.y / l1 };

  // u and w are orthonormal, so the aisle's near corner is (min along u, min
  // across w) put back together. Taken off the corner list it would be ambiguous:
  // two corners share the minimum along u.
  const dot = (p: ModelPoint, v: { x: number; y: number }): number => p.x * v.x + p.y * v.y;
  let minU = Infinity;
  let minW = Infinity;
  for (const p of ring) {
    minU = Math.min(minU, dot(p, u));
    minW = Math.min(minW, dot(p, w));
  }
  let slabMinU = Infinity;
  for (const p of outline) slabMinU = Math.min(slabMinU, dot(p, u));

  const corner = mm(u.x * minU + w.x * minW, u.y * minU + w.y * minW);
  const bayMm = Number(parking.module.bayLengthM) * 1000;
  const aisleMm = Number(parking.module.aisleWidthM) * 1000;
  const two = (value: string): string => `${Number(value).toFixed(2)} M`;

  /*
    A BAY IS DIMENSIONED ONLY ON A SIDE THAT HAS BAYS. A ring's driveway has a
    bay run on its outer side and the core or the reserved zone on its inner one,
    and "5.50 M" printed across the core is a bay nobody drew. A side has bays when
    a bay's open end lies on that edge of the aisle and overlaps it along its run.
  */
  let maxW = -Infinity;
  let maxU = -Infinity;
  for (const p of ring) {
    maxW = Math.max(maxW, dot(p, w));
    maxU = Math.max(maxU, dot(p, u));
  }
  const hasBays = (edge: number, side: -1 | 1): boolean =>
    parking.bays.some((b) => {
      const ws = b.outline.map((p) => dot(p, w));
      const us = b.outline.map((p) => dot(p, u));
      const near = side < 0 ? Math.max(...ws) : Math.min(...ws);
      // Its length across the aisle: a bay turned along it at a ring's corner is not "5.50 M" deep here.
      const deep = Math.abs(Math.max(...ws) - Math.min(...ws) - bayMm) <= 50;
      return deep && Math.abs(near - edge) <= 50 && Math.min(...us) < maxU && Math.max(...us) > minU;
    });
  const before = hasBays(minW, -1);
  const after = hasBays(maxW, 1);

  const start = offsetPoint(corner, w, before ? -bayMm : 0);
  const marks = [start];
  const words: string[] = [];
  let run = 0;
  for (const [present, width, value] of [
    [before, bayMm, parking.module.bayLengthM],
    [true, aisleMm, parking.module.aisleWidthM],
    [after, bayMm, parking.module.bayLengthM],
  ] as const) {
    if (!present) continue;
    run += width;
    marks.push(offsetPoint(start, w, run));
    words.push(two(value));
  }
  return dimensionChain(
    marks,
    words,
    {
      scale: s,
      out: { x: -u.x, y: -u.y },
      // Past the slab edge, then six paper millimetres of clear air.
      offsetMm: (minU - slabMinU) / s + 6,
    },
  );
}

// ---------------------------------------------------------------------------
// A-1xx Parking levels
// ---------------------------------------------------------------------------

function parkingSheet(model: BuildingModel, level: ModelLevel, meta: SheetMeta, number: string): Sheet {
  const parking = level.parking!;
  // Framed on the slab, not the plot: the bays are what this sheet is for, and on an
  // 80 m plot framing the boundary puts them at 1:500, where a bay number is 0.8 mm
  // of ink. The boundary beyond the frame is clipped on paper and whole in the DXF.
  // At grade the frame also takes in what stands outside the slab — the substation
  // on the road may stand in the setback (B.4.2.3 ¶12), up to the plot limit — or
  // the one room a clause put on the boundary is the one the paper cuts in half.
  const outside = [
    ...(model.groundRooms?.levelId === level.id ? model.groundRooms.rooms.flatMap((r) => r.outline) : []),
    ...(level.parking?.drives ?? []).flatMap((d) => d.outline),
  ];
  // Not grown: it reaches the plot limit, and the margin is for labels round the slab.
  const slabBox = grow(boxOf(level.outline), 2000);
  const box = outside.length > 0 ? boxOf([...boxCorners(slabBox), ...outside]) : slabBox;
  /*
    Its labels sit inside the slab, so it needs little paper round it — and with
    rooms outside the slab, less: the 2 m round the slab is already the label
    room, and those rooms carry their names inside them. Four millimetres on top
    took the worked example's ground floor from 1:250 to 1:500 for 1.5 m of
    substation, which is the scale the comment above exists to avoid.
  */
  const f = frame(box, PARKING_NOTES, outside.length > 0 ? 1 : 4);
  const s = f.scale;
  const items: ModelItem[] = [...plotContext(model, s, false)];

  items.push(shape(Role.SLAB, level.outline, true, { source: level.outlineSource, name: `${level.id} slab edge` }));

  const groundRooms = model.groundRooms?.levelId === level.id ? model.groundRooms : undefined;
  if (parking.reserved) {
    const r = parking.reserved;
    items.push(shape(Role.RESERVED, r.outline, true, { source: sourceOf(r.areaM2), name: r.label }));
    const rb = boxOf(r.outline);
    const wide = rb.maxX - rb.minX >= rb.maxY - rb.minY;
    // On the ground floor the rooms carry the labels; the strip's own would sit across them.
    if (!groundRooms) {
      items.push(
        withRule(label(Role.RESERVED, centroidOf(r.outline), r.label, NOTE, wide ? 0 : 90, 'middle', sourceOf(r.areaM2)), {
          alongMm: 20,
          acrossMm: 10,
        }),
      );
    }
    // The other pieces of the same area: hatched alike, labelled once, on the largest.
    (r.pieces ?? []).forEach((piece, i) => {
      items.push(shape(Role.RESERVED, piece, true, { source: sourceOf(r.areaM2), name: `${r.label} (${i + 2})` }));
    });
  }
  if (groundRooms) {
    for (const room of groundRooms.rooms) items.push(...groundRoomItems(room, groundRooms.source));
  }

  // --- the ramp, and which way it goes from here -------------------------------------
  const up = model.ramps.find((r) => !r.street && r.fromLevelId === level.id);
  const down = model.ramps.find((r) => !r.street && r.toLevelId === level.id);
  /*
    A ramp from the street cuts the aisles it crosses, so a dead end usually
    closes against it and that label is fixed at the closed end. The ramp's words
    may slide inside the ramp; set after the dead ends, they give way to them
    rather than pin the dead end's words over their own.
  */
  const streetItems = streetRampItems(model, s, level.id);
  items.push(...streetItems.filter((i) => i.kind !== 'text'));
  if (parking.rampStrip) {
    const ramp = up ?? down;
    items.push(
      shape(Role.RAMP, parking.rampStrip, true, {
        ...(ramp ? { source: sourceOf(ramp.gradientPct) } : {}),
        name: ramp ? ramp.label : 'Ramp strip, reserved',
      }),
    );
    const c = centroidOf(parking.rampStrip);
    if (ramp) {
      const footMid = midpointOf(ramp.foot[0], ramp.foot[1]);
      const headMid = midpointOf(ramp.head[0], ramp.head[1]);
      const along = angleOf(footMid, headMid);
      const run = lengthOf(footMid, headMid);
      items.push({
        kind: 'symbol',
        role: Role.RAMP_ARROW,
        symbol: SymbolName.ARROW,
        at: c,
        rotationDeg: round2(up ? along : along + 180),
        scale: Math.round(run * 0.5),
      });
      const words = [up ? `UP TO ${up.toLevelId}` : null, down ? `DOWN TO ${down.fromLevelId}` : null]
        .filter(Boolean)
        .join(' · ');
      const across = { x: -Math.sin((along * Math.PI) / 180), y: Math.cos((along * Math.PI) / 180) };
      // Clear of the arrowhead, whose half-width grows with the ramp's run: on a
      // long ramp a fixed offset put the label's first word through the head.
      const head = 0.09 * Math.round(run * 0.5);
      const rampWords: LabelRule = { ...RAMP_WORDS, within: parking.rampStrip, withhold: false };
      items.push(withRule(label(Role.RAMP, offsetPoint(c, across, Math.max(2.6 * s, head + 1.9 * s)), words, NOTE, along), rampWords));
      items.push(
        withRule(
          label(
            Role.RAMP,
            offsetPoint(c, across, -Math.max(3 * s, head + 1.9 * s)),
            ramp.label,
            NOTE,
            along,
            'middle',
            sourceOf(ramp.gradientPct),
          ),
          rampWords,
        ),
      );
    } else {
      items.push(withRule(label(Role.RAMP, c, 'RAMP STRIP RESERVED - NO SECOND PARKING LEVEL TO REACH', NOTE, 0), NEAR));
    }
  }

  // --- aisles: extent, direction, width --------------------------------------------------
  for (const aisle of parking.aisles) {
    items.push(shape(Role.AISLE, aisle.outline, true, { name: aisle.label }));
    const [a, b] = aisle.centreLine;
    const len = lengthOf(a, b);
    const along = angleOf(a, b);
    const arrow = Math.round(Math.min(5000, len / 5));
    /*
      THE ARROWS CLEAR THE LABEL. At a fifth of the way in from each end they
      sat on the words of an aisle the core had cut short. Where they would, they
      move to the ends; where even that is too tight they are left out — the
      label already says which way the aisle runs. The label's length is
      estimated from its characters at the 2 mm text height.
    */
    const labelHalf = (textLengthMm(aisle.label, NOTE) * s) / 2;
    const clear = (at: number): boolean => Math.abs(0.5 - at) * len - arrow / 2 > labelHalf + 500;
    const ends = (arrow / 2 + 500) / len;
    const spots = clear(0.2) ? [0.2, 0.8] : clear(ends) ? [ends, 1 - ends] : [];
    for (const at of spots) {
      items.push({
        kind: 'symbol',
        role: Role.AISLE_ARROW,
        symbol: aisle.twoWay ? SymbolName.ARROW_2WAY : SymbolName.ARROW,
        at: mm(a.x + (b.x - a.x) * at, a.y + (b.y - a.y) * at),
        rotationDeg: round2(along),
        scale: arrow,
      });
    }
    /*
      On the aisle and no further: a label longer than its piece of aisle ran
      across the bays at its ends (Warsan, between bays 3 and 4). Such a label is
      left off; the aisle's other pieces, the module dimension and the key all
      say what it is.
    */
    items.push(withRule(label(Role.AISLE, midpointOf(a, b), aisle.label, NOTE, along), { ...ALONG, within: aisle.outline }));
  }

  /*
    THE TURNS, as the client draws them: at every corner where a car turns from
    one aisle into another, both edges of the lane it sweeps, dashed. Inked by
    the radius's class — assumed from Table B.9 — and a turn that leaves the
    aisles at that radius says so in words beside it, not only in a count.
  */
  if (parking.turning) {
    const turnSource = sourceOf(parking.turning.fitting);
    for (const turn of parking.turns ?? []) {
      items.push(shape(Role.TURN, turn.inner, false, { source: turnSource }));
      items.push(shape(Role.TURN, turn.outer, false, { source: turnSource }));
      if (!turn.fits) {
        const mid = turn.outer[Math.floor(turn.outer.length / 2)]!;
        items.push(withRule(label(Role.TURN, mid, 'TURN LEAVES THE AISLE AT THIS RADIUS', NOTE, 0, 'middle', turnSource), NEAR));
      }
    }
  }

  /*
    THE DRIVE FROM THE ENTRANCE, at grade only: the opening carried onto the plot
    to the aisle it lands on. Drawn as an aisle, because it is one — the bays it
    crosses were given up for it, and that count is on this sheet.
  */
  for (const drive of parking.drives ?? []) {
    items.push(shape(Role.AISLE, drive.outline, true, { name: drive.label }));
    const [p0, p1, p2, p3] = drive.outline as readonly [ModelPoint, ModelPoint, ModelPoint, ModelPoint];
    const from = midpointOf(p0, p1);
    const to = midpointOf(p3, p2);
    // A quarter of the way across, not on the centre line: the entrance's arrow runs there.
    const wide = lengthOf(p0, p1) || 1;
    const across = { x: (p1.x - p0.x) / wide, y: (p1.y - p0.y) / wide };
    items.push(
      withRule(label(Role.AISLE, offsetPoint(midpointOf(from, to), across, wide / 4), drive.label, NOTE, angleOf(from, to)), {
        alongMm: 12,
        acrossMm: 2,
      }),
    );
  }

  /*
    THE RING THAT IS THE RAMP. Where the ring aisle itself climbs — the client's
    sloped podium — there is no ramp strip to draw an arrow on, and an aisle
    marked only "2 WAY DRIVEWAY" reads as level. So each corner of the lap gets
    an arrow pointing the way the floor rises and the gradient beside it. The
    corners because they are the one place on the ring no aisle label or aisle
    arrow sits; the gradient because it is the figure DBC B.7.2.3.1 caps at 4%.
  */
  const rampedFloor = parking.rampedFloor;
  if (rampedFloor) {
    const lap = rampedFloor.centreLine;
    const words = `${rampedFloor.gradientPct.value}%`;
    for (let i = 0; i < lap.length; i++) {
      const at = lap[i]!;
      const next = lap[(i + 1) % lap.length]!;
      const along = angleOf(at, next);
      items.push({
        kind: 'symbol',
        role: Role.RAMP_ARROW,
        symbol: SymbolName.ARROW,
        at,
        rotationDeg: round2(along),
        scale: 4000,
      });
      const across = { x: -Math.sin((along * Math.PI) / 180), y: Math.cos((along * Math.PI) / 180) };
      items.push(
        withRule(label(Role.RAMP, offsetPoint(at, across, 1.8 * s), words, NOTE, along, 'middle', sourceOf(rampedFloor.gradientPct)), {
          alongMm: 6,
          acrossMm: 4,
        }),
      );
    }
  }

  // --- bays: outline, car, number -----------------------------------------------------------
  /*
    THE ACCESS AISLES, where the level holds the accessible bays: hatched, because
    nobody parks there, and named in words along their length (C.6.4.2 f).
  */
  for (const aisle of parking.accessAisles ?? []) {
    items.push(shape(Role.ACCESS_AISLE, aisle, true, { name: 'Access aisle beside an accessible bay, DBC C.6.4.2 f)' }));
    const [p0, p1, p2] = aisle as readonly [ModelPoint, ModelPoint, ModelPoint];
    const long = lengthOf(p1, p2) >= lengthOf(p0, p1);
    const centre = midpointOf(p0, p2);
    items.push(
      withRule(label(Role.ACCESS_AISLE, centre, 'ACCESS AISLE', NOTE, long ? angleOf(p1, p2) : angleOf(p0, p1)), { within: aisle }),
    );
  }

  // --- bays: outline, car, number -----------------------------------------------------------
  for (const { bay, at: c, rotationDeg: axis, tail, bayLengthMm } of placeCars(parking)) {
    const role = bay.accessible ? Role.BAY_ACCESSIBLE : bay.use === 'PREFERRED' ? Role.BAY_PREFERRED : Role.BAY;
    items.push(
      shape(role, bay.outline, true, {
        source: parking.baysSource,
        bay: bay.number,
        name:
          `Bay ${bay.number}` +
          (bay.accessible ? (bay.use === 'VAN' ? ', accessible, van' : ', accessible') : '') +
          (bay.use === 'PREFERRED' ? ', preferred: hybrid, electric, carpool' : ''),
      }),
    );
    items.push({ kind: 'symbol', role: Role.CAR, symbol: SymbolName.CAR, at: c, rotationDeg: axis, scale: 1, bay: bay.number });
    /*
      A PARALLEL BAY'S NUMBER STAYS INSIDE ITS BAY. Its short end is not an aisle
      end: it is the next bay, often a perpendicular row's, whose own number
      stands at its mouth there. At the 260 mm inset a perpendicular bay uses,
      half the number's height crossed that end and printed over the neighbour's
      (the 120 × 80 m level, bays 118 and 133). So it is inset by its own half
      height as well, and a tag on the bay moves toward the other end.
    */
    const rad = (axis * Math.PI) / 180;
    const halfText = (NOTE / 2) * s;
    const numberAt = bay.parallel
      ? mm(c.x - Math.cos(rad) * (bayLengthMm / 2 - 260 - 1.2 * halfText), c.y - Math.sin(rad) * (bayLengthMm / 2 - 260 - 1.2 * halfText))
      : tail;
    items.push(label(Role.BAY_NUMBER, numberAt, String(bay.number), NOTE, axis + 90));
    /*
      In words as well as in ink (1.4.1): the van bay and the preferred bays say
      what they are. Down the bay's length, on the car: across it, at the note
      height, PREF is 6.6 mm and a bay at 1:500 is 5 mm, so every tag ran into
      the next bay's. Along it the bay is 11 mm, and the number stays clear at the
      aisle end.
    */
    const tag = bay.accessible ? (bay.use === 'VAN' ? 'VAN' : null) : bay.use === 'PREFERRED' ? 'PREF' : null;
    if (tag) {
      const tagAt = bay.parallel ? mm(c.x + Math.cos(rad) * halfText, c.y + Math.sin(rad) * halfText) : c;
      items.push(label(role, tagAt, tag, NOTE, axis));
    }
  }

  /*
    THE DEAD ENDS, B.7.2.3.3 ¶8: a "should", so it is said at the closed end in
    words and changes no count. Only where the stretch serves more than the eight
    the clause advises; a shorter one is what the clause allows.
  */
  for (const end of parking.deadEnds ?? []) {
    if (end.bays <= 8) continue;
    // Down the aisle from its closed end, a metre in: across the end it ran over whatever stands beyond.
    const run = lengthOf(end.at, end.along) || 1;
    const dir = { x: (end.along.x - end.at.x) / run, y: (end.along.y - end.at.y) / run };
    const angle = angleOf(end.at, end.along);
    const upright = Math.cos((angle * Math.PI) / 180) >= 0;
    items.push(
      withRule(
        label(
          Role.DEAD_END,
          // Off the centre line, where the aisle's own label and arrow run.
          offsetPoint(offsetPoint(end.at, dir, 1000), { x: -dir.y, y: dir.x }, 1800),
          `DEAD END - ${end.bays} BAYS, 8 ADVISED`,
          NOTE,
          upright ? angle : angle + 180,
          upright ? 'start' : 'end',
        ),
        { alongMm: 12, acrossMm: 3 },
      ),
    );
  }
  items.push(...streetItems.filter((i) => i.kind === 'text'));

  /*
    THE CORE OVER THE BAYS, not under them. It passes through this level whatever
    the layout put there, and a core drawn beneath the bays would read as a bay
    that happens to sit on a shaft. Whether the layout accounted for it is the
    reconciliation in the notes, not something the draw order may imply.
  */
  items.push(...coreItems(model, level.id, s));

  if (level.elevationMm === 0) items.push(...accessItems(model, s));

  const ramp = up ?? down;
  const facts: StripFact[] = [
    { label: 'Level', value: `${level.id} · ${level.name}` },
    fact('Floor level', level.elevationM, `${signedLevel(level.elevationM.value)} M`),
    fact('Bays on this level', parking.bayCount),
    fact('Bays, every parking level', model.drawnBays),
    ...(ramp && parking.rampStrip
      ? [fact('Ramp gradient; Table B.9 allows 12%', ramp.gradientPct, `${ramp.gradientPct.value}%`)]
      : []),
    ...(rampedFloor
      ? [
          fact(
            'Ramped floor; B.7.2.3.1 allows 4%',
            rampedFloor.gradientPct,
            `${rampedFloor.gradientPct.value}% OVER ${rampedFloor.lapM} M`,
          ),
        ]
      : []),
    ...(parking.reserved
      ? [fact('Reserved, not laid out', parking.reserved.areaM2, `${parking.reserved.areaM2.value} SQ.M`)]
      : []),
    ...(model.core && model.core.levelIds.includes(level.id)
      ? [
          model.core.shaft
            ? fact('Core shafts', model.core.shaft.areaM2, `${model.core.shaft.areaM2.value} SQ.M`)
            : fact('Core', model.core.areaM2, `${model.core.areaM2.value} SQ.M`),
        ]
      : []),
  ];
  const legend: LegendEntry[] = [
    { role: Role.SLAB, provenanceClass: level.outlineSource.provenanceClass, label: 'Slab edge' },
    { role: Role.BAY, label: 'Parking bay, Table B.11' },
    ...(parking.bays.some((b) => b.accessible)
      ? [{ role: Role.BAY_ACCESSIBLE, label: 'Accessible bay, C.6.4; aisle hatched' }]
      : []),
    ...(parking.bays.some((b) => b.use === 'PREFERRED')
      ? [{ role: Role.BAY_PREFERRED, label: 'Preferred bay (PREF), B.7.2.6.2' }]
      : []),
    { role: Role.AISLE, label: 'Drive aisle' },
    ...(parking.turning && (parking.turns ?? []).length > 0
      ? [
          {
            role: Role.TURN,
            provenanceClass: parking.turning.fitting.provenanceClass,
            // One line: the key on a parking sheet is full, and the strip refuses rather than overprints.
            label: `Car turn, R ${parking.turning.innerRadiusM.value} m assumed`,
          },
        ]
      : []),
    ...(parking.rampStrip
      ? [
          {
            role: Role.RAMP,
            // The budget Table B.9's clear height leaves the slab over it; a run
            // stored before the budget existed still says it was not assessed.
            label: parking.rampHeadroom
              ? `Ramp; slab over it ≤ ${parking.rampHeadroom.structuralBudgetM.value} m deep`
              : 'Ramp; headroom NOT ASSESSED',
          },
        ]
      : []),
    ...(parking.reserved
      ? [
          {
            role: Role.RESERVED,
            label:
              model.groundRooms?.levelId === level.id
                ? 'Reserved; entrance + plant assumed'
                : 'Reserved: cores, plant, circulation',
          },
        ]
      : []),
    ...(model.core && model.core.levelIds.includes(level.id)
      ? [
          {
            role: Role.CORE,
            provenanceClass: (model.core.shaft ? model.core.shaft.areaM2 : model.core.areaM2).provenanceClass,
            label: model.core.shaft
              ? 'Core shafts; stairs + lifts assumed'
              : model.core.rooms?.length
                ? 'Core; stairs + lifts assumed'
                : 'Core - area only, no layout',
          },
        ]
      : []),
    /*
      THE SYMBOL KEY — §4.9 item 8. Drawn from the same `SYMBOLS` geometry the
      sheet inserts and the DXF blocks, so the car in the key is the car in the
      bay. The car's caption is the one that matters: 4.6 x 1.8 m is a drafting
      convention and nothing on this sheet was computed from it.
    */
    {
      role: Role.CAR,
      symbol: SymbolName.CAR,
      label: 'Car - a 4.6 x 1.8 m drafting symbol, not a vehicle the engine sized',
    },
    ...(parking.aisles.some((a) => a.twoWay)
      ? [{ role: Role.AISLE_ARROW, symbol: SymbolName.ARROW_2WAY, label: 'Drive aisle, two-way' }]
      : []),
    ...(parking.aisles.some((a) => !a.twoWay)
      ? [{ role: Role.AISLE_ARROW, symbol: SymbolName.ARROW, label: 'Drive aisle, one-way' }]
      : []),
    ...(parking.rampStrip
      ? [{ role: Role.RAMP_ARROW, symbol: SymbolName.ARROW, label: 'Ramp, direction of travel' }]
      : []),
    ...(rampedFloor
      ? [{ role: Role.RAMP_ARROW, symbol: SymbolName.ARROW, label: 'Ramped floor rises this way, one level a lap' }]
      : []),
  ];
  /*
    The ground level draws the entrance, and its words are printed beside it on
    the drawing (VEHICLE ENTRY - ONE WAY). The key on this sheet is already full,
    so it gains one row only when an arrow the entrance draws is keyed nowhere
    else here — a one-way head on a level with no ramp and no one-way aisle.
  */
  if (level.elevationMm === 0) {
    const keyed = new Set(legend.map((e) => e.symbol).filter(Boolean));
    for (const entry of accessLegend(model)) {
      if (entry.symbol !== undefined && !keyed.has(entry.symbol)) legend.push(entry);
    }
  }
  legend.push(...streetRampLegend(items, legend));
  /*
    THE MODULE, DIMENSIONED ACROSS ONE AISLE: bay, aisle, bay. It is the figure
    an architect checks first and the one the client's own drawings carry
    ("6.00M WIDE 2 WAY DRIVEWAY"), and all three figures are Table B.11's as the
    engine cited them — never distances read back off the rectangles drawn above.
  */
  items.push(...moduleChain(parking, level.outline, s));

  const title = `Parking level ${level.id}`;
  return {
    id: `level-${level.id}`,
    kind: SheetKind.PARKING,
    levelId: level.id,
    number,
    title,
    paper: PAPER,
    view: f.view,
    viewport: f.viewport,
    items: annotationLast(items),
    paperItems: paperFurniture({
      title,
      number,
      scale: s,
      meta,
      // Not the level's own row: the title under the key names it, and the strip
      // needed the room for the accessible and preferred bays' rows of the key.
      facts: facts.filter((f) => f.label !== 'Level'),
      legend,
      legendNotes: PARKING_NOTES,
      north: true,
    }),
    facts,
    legend,
    // The core's reconciliation against the deduction belongs on the sheet the
    // deduction was taken on, where a reader can see both numbers at once.
    notes: [...(model.core ? model.core.reconciliation.slice(1) : []), ...model.notModelled.slice(0, 2)],
  };
}

// ---------------------------------------------------------------------------
// A-201 Typical floor
// ---------------------------------------------------------------------------

function typicalSheet(model: BuildingModel, meta: SheetMeta): Sheet | null {
  // The whole plates. The part floor is a plate of its own and gets a plan of its own.
  const typical = model.levels.filter((l) => l.use === 'TYPICAL' && l.partFloor === undefined);
  const first = typical[0];
  if (!first) return null;
  return floorPlanSheet(model, meta, first, typical[typical.length - 1]!, {
    id: 'typical',
    number: 'A-201',
    title: 'Typical floor',
    slab: 'Typical floor plate',
  });
}

/*
  A-202 PART FLOOR — THE ONE LEVEL WHOSE PLATE IS NOT THE TOWER PLATE.

  The governing capacity above the last whole level is drawn as a smaller top
  floor (`part-floor.ts` in `@envelope/capacity`), and a plan of the typical
  floor is not a plan of it. Its slab is inked in its own source's class —
  ASSUMED, amber — because whether the architect draws a smaller top floor or
  shrinks every plate is an open question, and its area is printed from the
  engine's figure, never measured off the ring.
*/
function partFloorSheet(model: BuildingModel, meta: SheetMeta): Sheet | null {
  const level = model.levels.find((l) => l.partFloor !== undefined && l.placed);
  if (!level?.partFloor) return null;
  return floorPlanSheet(model, meta, level, level, {
    id: 'part-floor',
    number: 'A-202',
    title: 'Part floor',
    slab: 'Part floor plate - assumed',
  });
}

function floorPlanSheet(
  model: BuildingModel,
  meta: SheetMeta,
  first: ModelLevel,
  last: ModelLevel,
  as: { readonly id: string; readonly number: string; readonly title: string; readonly slab: string },
): Sheet {
  const podiumBelow = [...model.levels].reverse().find((l) => l.use !== 'TYPICAL' && l.elevationMm >= 0);
  const box = grow(boxOf((podiumBelow ?? first).outline), 2000);
  const f = frame(box, SITE_NOTES, 4);
  const s = f.scale;
  const podium = podiumBelow;
  const part = first.partFloor;
  const items: ModelItem[] = [...plotContext(model, s, false)];
  if (podium) {
    items.push(shape(Role.CONTEXT, podium.outline, true, { source: podium.outlineSource, name: 'Podium roof, below' }));
  }
  items.push(shape(Role.SLAB, first.outline, true, { source: first.outlineSource, name: as.slab }));
  items.push(...coreItems(model, first.id, s));
  /*
    THE CORE IS NOW MODELLED AND THIS LABEL SAID IT WAS NOT. It sat in the middle
    of the plate, which is exactly where the core now sits, so leaving it would
    have printed "CORES NOT MODELLED" across the core. What is still true — units
    and façades — is still said, and it is moved off the centre.

    INSIDE THE PLATE, a third of the way from its southern edge to its centre. It
    was set ON that edge, and the plate's 0.5 mm line ran through every letter of
    it — a note struck through reads as a note withdrawn.
  */
  const plateCentre = centroidOf(first.outline);
  const plateFoot = boxOf(first.outline).minY;
  items.push(
    withRule(
      label(
        Role.ANNOTATION,
        { x: plateCentre.x, y: asMm(Math.round(plateFoot + (plateCentre.y - plateFoot) / 3)) },
        'UNITS AND FACADES NOT MODELLED',
        NOTE,
        0,
      ),
      NEAR,
    ),
  );
  if (part) {
    // The engine's words and figure, in the slab's own (assumed) ink, a third of
    // the way from the plate's northern edge to its centre — clear of the note above.
    const plateHead = boxOf(first.outline).maxY;
    items.push(
      withRule(
        label(
          Role.SLAB,
          { x: plateCentre.x, y: asMm(Math.round(plateHead - (plateHead - plateCentre.y) / 3)) },
          part.label,
          NOTE,
          0,
          'middle',
          first.outlineSource,
        ),
        NEAR,
      ),
    );
  }

  const range = first === last ? first.id : `${first.id} - ${last.id}`;
  const facts: StripFact[] = [
    { label: 'Levels', value: range },
    part
      ? fact('Part floor level', first.elevationM, `${signedLevel(first.elevationM.value)} M`)
      : fact('First typical floor level', first.elevationM, `${signedLevel(first.elevationM.value)} M`),
    // Printed to two decimals, as every measure on paper is; the exact figure stays on the fact's node.
    ...(part ? [fact('Part floor plate', part.areaM2, `${Number(part.areaM2.value).toFixed(2)} SQ.M`)] : []),
    ...(model.core
      ? [
          fact('Core', model.core.areaM2, `${model.core.areaM2.value} SQ.M`),
          fact('Core, share of plate', model.core.plateShare, `${model.core.plateShare.value}`),
        ]
      : []),
  ];
  const legend: LegendEntry[] = [
    { role: Role.SLAB, provenanceClass: first.outlineSource.provenanceClass, label: as.slab },
    ...(model.core
      ? [
          {
            role: Role.CORE,
            provenanceClass: model.core.source.provenanceClass,
            label: model.core.rooms?.length ? 'Core; stairs + lifts assumed' : 'Core - area only, no layout',
          },
        ]
      : []),
    ...(podium ? [{ role: Role.CONTEXT, label: 'Podium roof, below' }] : []),
    { role: Role.SETBACK, provenanceClass: model.setbackSource.provenanceClass, label: 'Setback line' },
  ];
  return {
    id: as.id,
    kind: SheetKind.TYPICAL,
    levelId: first.id,
    number: as.number,
    title: as.title,
    paper: PAPER,
    view: f.view,
    viewport: f.viewport,
    items: annotationLast(items),
    paperItems: paperFurniture({
      title: as.title,
      number: as.number,
      scale: s,
      meta,
      facts,
      legend,
      legendNotes: SITE_NOTES,
      north: true,
    }),
    facts,
    legend,
    notes: [
      ...model.placements
        .filter((p) => p.subject === 'tower' || p.subject === 'core' || (part !== undefined && p.subject === 'part floor'))
        .map((p) => p.statement),
      // The saleable reconciliation, on the sheet the saleable area is of.
      ...(model.core ? model.core.reconciliation.slice(0, 1) : []),
      ...model.notModelled.filter((n) => /core|Façades/i.test(n)),
    ],
  };
}

// ---------------------------------------------------------------------------
// A-301 Section A–A
// ---------------------------------------------------------------------------

function sectionSheet(model: BuildingModel, section: ModelSection, meta: SheetMeta, number: string): Sheet {
  const P = (along: number, elevation: number): ModelPoint => mm(along, elevation);
  const levels = new Map(model.levels.map((l) => [l.id, l]));
  const bottom = Math.min(0, ...model.levels.map((l) => l.elevationMm));
  const top = Math.max(...model.levels.map((l) => l.elevationMm + l.heightMm));
  const ceiling = Math.round(Number(model.heightCeilingM.value) * 1000);

  const box: Box = {
    minX: -9000,
    minY: bottom - 3000,
    maxX: section.lengthMm + 3000,
    maxY: Math.max(top, ceiling) + 3000,
  };
  const f = frame(box, SITE_NOTES);
  const s = f.scale;
  const items: ModelItem[] = [];

  // Ground and boundary.
  for (const [a, b] of section.plot) {
    items.push(shape(Role.GROUND, [P(a - 4000, 0), P(b + 4000, 0)], false, { name: 'Ground' }));
    for (const x of [a, b]) {
      items.push(shape(Role.PLOT, [P(x, bottom - 1500), P(x, 0)], false));
      items.push(withRule(label(Role.PLOT, P(x, bottom - 1500 - 2.8 * s), 'BOUNDARY', NOTE), { alongMm: 8, acrossMm: 3 }));
    }
  }
  // Setback line, where the cut crosses it.
  for (const [a, b] of section.setbackLine) {
    for (const x of [a, b]) {
      items.push(shape(Role.SETBACK, [P(x, 0), P(x, Math.max(top, ceiling))], false, { source: model.setbackSource }));
    }
    items.push(withRule(label(Role.SETBACK, P(a, Math.max(top, ceiling) + 1.8 * s), 'SETBACK', NOTE, 0, 'start'), NEAR));
  }

  // Each level: beyond, then cut, then openings.
  for (const cut of section.levels) {
    const level = levels.get(cut.levelId);
    if (!level) continue;
    const e0 = level.elevationMm;
    const e1 = level.elevationMm + level.heightMm;
    const [b0, b1] = cut.beyond;
    if (level.placed === false) {
      // Permitted and not placed: dashed context, in no class's ink — the same reading
      // the 3D view gives it. Cut solid, it drew a building the answer does not contain.
      for (const [a, b] of cut.cut) {
        items.push(shape(Role.CONTEXT, [P(a, e0), P(b, e0), P(b, e1), P(a, e1)], true, { name: `${level.id}, permitted, not placed` }));
      }
    } else {
      items.push(shape(Role.SECTION_BEYOND, [P(b0, e0), P(b1, e0), P(b1, e1), P(b0, e1)], true));
    }
    for (const [a, b] of level.placed === false ? [] : cut.cut) {
      items.push(
        shape(Role.SECTION_CUT, [P(a, e0), P(b, e0), P(b, e1), P(a, e1)], true, {
          source: level.outlineSource,
          name: `${level.id}, cut`,
        }),
      );
    }
    for (const [a, b] of cut.openings) {
      items.push(shape(Role.SECTION_OPENING, [P(a, e0), P(b, e0)], false, { name: `${level.id}, ramp opening` }));
    }
    items.push(
      label(
        Role.LEVEL_MARK,
        P(-1500, e0 + 1.4 * s),
        `${level.id}  ${signedLevel(level.elevationM.value)}`,
        NOTE,
        0,
        'end',
        sourceOf(level.elevationM),
      ),
    );
    /*
      THE LEVEL DATUM — §4.9 item 7. The line was already here; the triangle is
      what makes it a datum rather than a stray tick, and it points AT the slab
      whose floor level the figure beside it states.
    */
    const tri = 2 * s;
    items.push(shape(Role.LEVEL_MARK, [P(-1200, e0), P(0, e0)], false));
    items.push(
      shape(Role.LEVEL_MARK, [P(-700, e0), P(-700 - tri / 2, e0 - tri), P(-700 + tri / 2, e0 - tri)], true, {
        source: sourceOf(level.elevationM),
        name: `${level.id} level datum`,
      }),
    );
  }

  for (const ramp of section.ramps) {
    const r = model.ramps.find((x) => x.id === ramp.rampId);
    items.push(
      shape(Role.RAMP, [P(ramp.foot.alongMm, ramp.foot.elevationMm), P(ramp.head.alongMm, ramp.head.elevationMm)], false, {
        ...(r ? { source: sourceOf(r.gradientPct) } : {}),
        name: r?.label ?? 'Ramp',
      }),
    );
  }
  const firstRamp = section.ramps[0] ? model.ramps.find((x) => x.id === section.ramps[0]!.rampId) : undefined;
  if (firstRamp && section.ramps[0]) {
    const r = section.ramps[0];
    items.push(
      withRule(
        label(
          Role.RAMP,
          P((r.foot.alongMm + r.head.alongMm) / 2, Math.max(r.foot.elevationMm, r.head.elevationMm) + 1.8 * s),
          firstRamp.label,
          NOTE,
          0,
          'middle',
          sourceOf(firstRamp.gradientPct),
        ),
        NEAR,
      ),
    );
  }

  // The height the governing rule allows.
  const [first] = section.plot;
  const last = section.plot[section.plot.length - 1];
  if (first && last && Number.isFinite(ceiling)) {
    items.push(
      shape(Role.CEILING, [P(first[0] - 2000, ceiling), P(last[1] + 2000, ceiling)], false, {
        source: sourceOf(model.heightCeilingM),
        name: 'Height ceiling',
      }),
    );
    items.push(
      withRule(
        label(Role.CEILING, P(last[1], ceiling + 1.4 * s), `HEIGHT CEILING +${model.heightCeilingM.value} M`, NOTE, 0, 'end', sourceOf(model.heightCeilingM)),
        { alongMm: 20, acrossMm: 0 },
      ),
    );
  }

  const unplaced = model.levels.filter((l) => l.placed === false);
  const facts: StripFact[] = [
    fact('Height ceiling', model.heightCeilingM, `${model.heightCeilingM.value} M`),
    { label: 'Levels', value: levelRange(model.levels) },
    ...(unplaced.length > 0 && model.placedLevels
      ? [fact('Levels the answer places', model.placedLevels, model.placedLevels.value)]
      : []),
    ...(firstRamp ? [fact('Ramp gradient (not assessed)', firstRamp.gradientPct, `${firstRamp.gradientPct.value}%`)] : []),
  ];
  const legend: LegendEntry[] = [
    { role: Role.SECTION_CUT, label: 'Level, cut' },
    { role: Role.SECTION_BEYOND, label: 'Level, seen beyond the cut' },
    ...(unplaced.length > 0 ? [{ role: Role.CONTEXT, label: 'Level permitted, not placed by the answer' }] : []),
    { role: Role.SETBACK, provenanceClass: model.setbackSource.provenanceClass, label: 'Setback line' },
    { role: Role.CEILING, provenanceClass: model.heightCeilingM.provenanceClass, label: 'Height ceiling' },
    ...(section.ramps.length > 0 ? [{ role: Role.RAMP, label: 'Ramp - gradient NOT ASSESSED' }] : []),
    { role: Role.LEVEL_MARK, label: 'Level datum - floor level from the ground datum' },
  ];
  const title = `Section ${section.id}-${section.id}`;
  return {
    id: `section-${section.id.toLowerCase()}`,
    kind: SheetKind.SECTION,
    levelId: null,
    number,
    title,
    paper: PAPER,
    view: f.view,
    viewport: f.viewport,
    items: annotationLast(items),
    paperItems: paperFurniture({
      title,
      number,
      scale: s,
      meta,
      facts,
      legend,
      legendNotes: SITE_NOTES,
      north: false,
    }),
    facts,
    legend,
    notes: [
      `${title}: ${section.taken}`,
      ...model.placements.filter((p) => p.subject === 'answer').map((p) => p.statement),
      ...model.notModelled.filter((n) => /Slab thickness|Ramp transitions/.test(n)),
    ],
  };
}

// ---------------------------------------------------------------------------

function grow(box: Box, by: number): Box {
  return { minX: box.minX - by, minY: box.minY - by, maxX: box.maxX + by, maxY: box.maxY + by };
}

function boxCorners(box: Box): ModelPoint[] {
  return [mm(box.minX, box.minY), mm(box.maxX, box.maxY)];
}

function levelRange(levels: readonly ModelLevel[]): string {
  const first = levels[0];
  const last = levels[levels.length - 1];
  if (!first || !last) return 'none';
  return first === last ? first.id : `${first.id} - ${last.id}`;
}

function sameRing(a: ModelRing, b: ModelRing): boolean {
  return a.length === b.length && a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y);
}

