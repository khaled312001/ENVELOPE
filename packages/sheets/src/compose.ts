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
import { PAPER, paperFurniture, VIEWPORT } from './strip.js';
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

/** Scale and centre a sheet on the box its model items occupy. */
function frame(box: Box, margin = MARGIN): Pick<Sheet, 'view' | 'viewport'> & { scale: number } {
  const scale = fitScale(box, VIEWPORT, margin);
  return {
    scale,
    view: {
      scale,
      centreModel: { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 },
      centrePaper: { x: VIEWPORT.x + VIEWPORT.width / 2, y: VIEWPORT.y + VIEWPORT.height / 2 },
    },
    viewport: VIEWPORT,
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
    items.push(label(Role.EDGE_LABEL, offsetPoint(mid, n, -2.6 * 2.4 * s), edge.label, 2.4, along));

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
  const box = boxOf(core.outline);
  const wide = box.maxX - box.minX >= box.maxY - box.minY;
  const rooms = core.rooms ?? [];
  const lobby = rooms.find((r) => r.kind === 'LOBBY');
  const at = coreLabelAt(core.outline, lobby);
  const items: ModelItem[] = [
    shape(Role.CORE, core.outline, true, { source: core.source, name: core.label }),
    label(Role.CORE, at, core.label, 1.8, wide ? 0 : 90, 'middle', core.source),
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
      label(Role.CORE_ROOM, mm(below.x, below.y), CORE_CAVEAT, 1.2, wide ? 0 : 90, 'middle', core.roomsSource),
    );
  }
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
    label(Role.GROUND_ROOM, centroidOf(room.outline), room.name, 1.2, rotation, 'middle', source),
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
  items.push(label(Role.CORE_ROOM, labelAt, ROOM_LABEL[room.kind], 1.2, rotation, 'middle', source));
  return items;
}

function accessItems(model: BuildingModel, s: number): ModelItem[] {
  const access = model.access;
  if (!access) return [];
  const [a, b] = access.opening;
  const n = inwardNormal(a, b, model.plot.outline);
  const mid = midpointOf(a, b);
  const arrowLength = Math.max(4000, 10 * s);
  return [
    shape(Role.ACCESS, [a, b], false, { source: access.source, name: access.label }),
    {
      kind: 'symbol',
      role: Role.ACCESS_ARROW,
      symbol: SymbolName.ARROW_2WAY,
      at: offsetPoint(mid, n, arrowLength / 2),
      rotationDeg: round2(angleOf(mid, offsetPoint(mid, n, 1000))),
      scale: arrowLength,
    },
    label(Role.ACCESS, offsetPoint(mid, n, -6.5 * 2.4 * s), access.label, 2.2, angleOf(a, b), 'middle', access.source),
  ];
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
  const f = frame(box, MARGIN + dimensionReachMm(model, frame(box).scale));
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
  items.push(...accessItems(model, s));

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
    ...(model.access
      ? [
          { role: Role.ACCESS, label: 'Vehicle entry / exit' },
          {
            role: Role.ACCESS_ARROW,
            symbol: SymbolName.ARROW_2WAY,
            label: 'Direction of travel, in and out',
          },
        ]
      : []),
    ...(model.sections.length > 0 ? [{ role: Role.CUT_LINE, label: 'Section cut line' }] : []),
  ];

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
      legendNotes: [CAD_LAYERS],
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
  // A module aisle, never the cross aisle: the cross aisle has no bay run on
  // either side, so a module measured across it is a module nobody laid out.
  const ring = parking.aisles.find((a) => !a.crossing)?.outline;
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
  const start = offsetPoint(corner, w, -bayMm);
  const two = (value: string): string => `${Number(value).toFixed(2)} M`;
  return dimensionChain(
    [
      start,
      offsetPoint(start, w, bayMm),
      offsetPoint(start, w, bayMm + aisleMm),
      offsetPoint(start, w, bayMm + aisleMm * 1 + bayMm),
    ],
    [two(parking.module.bayLengthM), two(parking.module.aisleWidthM), two(parking.module.bayLengthM)],
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
  const box = grow(boxOf(level.outline), 2000);
  // Its labels sit inside the slab, so it needs little paper round it.
  const f = frame(box, 4);
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
      items.push(label(Role.RESERVED, centroidOf(r.outline), r.label, 1.8, wide ? 0 : 90, 'middle', sourceOf(r.areaM2)));
    }
  }
  if (groundRooms) {
    for (const room of groundRooms.rooms) items.push(...groundRoomItems(room, groundRooms.source));
  }

  // --- the ramp, and which way it goes from here -------------------------------------
  const up = model.ramps.find((r) => r.fromLevelId === level.id);
  const down = model.ramps.find((r) => r.toLevelId === level.id);
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
      items.push(label(Role.RAMP, offsetPoint(c, across, Math.max(2.2 * s, head + 1.6 * s)), words, 2, along));
      items.push(
        label(
          Role.RAMP,
          offsetPoint(c, across, -Math.max(2.6 * s, head + 1.5 * s)),
          ramp.label,
          1.8,
          along,
          'middle',
          sourceOf(ramp.gradientPct),
        ),
      );
    } else {
      items.push(label(Role.RAMP, c, 'RAMP STRIP RESERVED - NO SECOND PARKING LEVEL TO REACH', 1.8, 0));
    }
  }

  // --- aisles: extent, direction, width --------------------------------------------------
  for (const aisle of parking.aisles) {
    items.push(shape(Role.AISLE, aisle.outline, true, { name: aisle.label }));
    const [a, b] = aisle.centreLine;
    const len = lengthOf(a, b);
    const along = angleOf(a, b);
    const arrow = Math.round(Math.min(5000, len / 5));
    for (const at of [0.2, 0.8]) {
      items.push({
        kind: 'symbol',
        role: Role.AISLE_ARROW,
        symbol: aisle.twoWay ? SymbolName.ARROW_2WAY : SymbolName.ARROW,
        at: mm(a.x + (b.x - a.x) * at, a.y + (b.y - a.y) * at),
        rotationDeg: round2(along),
        scale: arrow,
      });
    }
    items.push(label(Role.AISLE, midpointOf(a, b), aisle.label, 2, along));
  }

  // --- bays: outline, car, number -----------------------------------------------------------
  for (const { bay, at: c, rotationDeg: axis, tail } of placeCars(parking)) {
    items.push(
      shape(bay.accessible ? Role.BAY_ACCESSIBLE : Role.BAY, bay.outline, true, {
        source: parking.baysSource,
        bay: bay.number,
        name: `Bay ${bay.number}${bay.accessible ? ', accessible' : ''}`,
      }),
    );
    items.push({ kind: 'symbol', role: Role.CAR, symbol: SymbolName.CAR, at: c, rotationDeg: axis, scale: 1, bay: bay.number });
    items.push(label(Role.BAY_NUMBER, tail, String(bay.number), 1.6, axis + 90));
  }

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
    ...(ramp
      ? [fact('Ramp gradient (not assessed)', ramp.gradientPct, `${ramp.gradientPct.value}%`)]
      : []),
    ...(parking.reserved
      ? [fact('Reserved, not laid out', parking.reserved.areaM2, `${parking.reserved.areaM2.value} SQ.M`)]
      : []),
    ...(model.core && model.core.levelIds.includes(level.id)
      ? [fact('Core', model.core.areaM2, `${model.core.areaM2.value} SQ.M`)]
      : []),
  ];
  const legend: LegendEntry[] = [
    { role: Role.SLAB, provenanceClass: level.outlineSource.provenanceClass, label: 'Slab edge' },
    { role: Role.BAY, label: 'Parking bay, Table B.11' },
    ...(parking.bays.some((b) => b.accessible) ? [{ role: Role.BAY_ACCESSIBLE, label: 'Accessible bay' }] : []),
    { role: Role.AISLE, label: 'Drive aisle' },
    ...(parking.rampStrip ? [{ role: Role.RAMP, label: 'Ramp - gradient NOT ASSESSED' }] : []),
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
            provenanceClass: model.core.source.provenanceClass,
            label: model.core.rooms?.length ? 'Core; stairs + lifts assumed' : 'Core - area only, no layout',
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
  ];
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
      facts,
      legend,
      legendNotes: [BAY_NUMBERING, NO_GRID, CAD_LAYERS],
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
  const typical = model.levels.filter((l) => l.use === 'TYPICAL');
  const first = typical[0];
  if (!first) return null;
  const podiumBelow = [...model.levels].reverse().find((l) => l.use !== 'TYPICAL' && l.elevationMm >= 0);
  const box = grow(boxOf((podiumBelow ?? first).outline), 2000);
  const f = frame(box, 4);
  const s = f.scale;
  const podium = podiumBelow;
  const items: ModelItem[] = [...plotContext(model, s, false)];
  if (podium) {
    items.push(shape(Role.CONTEXT, podium.outline, true, { source: podium.outlineSource, name: 'Podium roof, below' }));
  }
  items.push(shape(Role.SLAB, first.outline, true, { source: first.outlineSource, name: 'Typical floor plate' }));
  items.push(...coreItems(model, first.id, s));
  /*
    THE CORE IS NOW MODELLED AND THIS LABEL SAID IT WAS NOT. It sat in the middle
    of the plate, which is exactly where the core now sits, so leaving it would
    have printed "CORES NOT MODELLED" across the core. What is still true — units
    and façades — is still said, and it is moved off the centre.
  */
  items.push(
    label(
      Role.ANNOTATION,
      { x: centroidOf(first.outline).x, y: asMm(boxOf(first.outline).minY) },
      'UNITS AND FACADES NOT MODELLED',
      2,
      0,
    ),
  );

  const last = typical[typical.length - 1]!;
  const range = first === last ? first.id : `${first.id} - ${last.id}`;
  const facts: StripFact[] = [
    { label: 'Levels', value: range },
    fact('First typical floor level', first.elevationM, `${signedLevel(first.elevationM.value)} M`),
    ...(model.core
      ? [
          fact('Core', model.core.areaM2, `${model.core.areaM2.value} SQ.M`),
          fact('Core, share of plate', model.core.plateShare, `${model.core.plateShare.value}`),
        ]
      : []),
  ];
  const legend: LegendEntry[] = [
    { role: Role.SLAB, provenanceClass: first.outlineSource.provenanceClass, label: 'Typical floor plate' },
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
    id: 'typical',
    kind: SheetKind.TYPICAL,
    levelId: first.id,
    number: 'A-201',
    title: 'Typical floor',
    paper: PAPER,
    view: f.view,
    viewport: f.viewport,
    items: annotationLast(items),
    paperItems: paperFurniture({
      title: 'Typical floor',
      number: 'A-201',
      scale: s,
      meta,
      facts,
      legend,
      legendNotes: [CAD_LAYERS],
      north: true,
    }),
    facts,
    legend,
    notes: [
      ...model.placements
        .filter((p) => p.subject === 'tower' || p.subject === 'core')
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
  const f = frame(box);
  const s = f.scale;
  const items: ModelItem[] = [];

  // Ground and boundary.
  for (const [a, b] of section.plot) {
    items.push(shape(Role.GROUND, [P(a - 4000, 0), P(b + 4000, 0)], false, { name: 'Ground' }));
    for (const x of [a, b]) {
      items.push(shape(Role.PLOT, [P(x, bottom - 1500), P(x, 0)], false));
      items.push(label(Role.PLOT, P(x, bottom - 1500 - 2.8 * s), 'BOUNDARY', 1.8));
    }
  }
  // Setback line, where the cut crosses it.
  for (const [a, b] of section.setbackLine) {
    for (const x of [a, b]) {
      items.push(shape(Role.SETBACK, [P(x, 0), P(x, Math.max(top, ceiling))], false, { source: model.setbackSource }));
    }
    items.push(label(Role.SETBACK, P(a, Math.max(top, ceiling) + 1.6 * s), 'SETBACK', 1.8, 0, 'start'));
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
        P(-1500, e0 + 1.2 * s),
        `${level.id}  ${signedLevel(level.elevationM.value)}`,
        2,
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
      label(
        Role.RAMP,
        P((r.foot.alongMm + r.head.alongMm) / 2, Math.max(r.foot.elevationMm, r.head.elevationMm) + 1.8 * s),
        firstRamp.label,
        1.8,
        0,
        'middle',
        sourceOf(firstRamp.gradientPct),
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
      label(Role.CEILING, P(last[1], ceiling + 1.2 * s), `HEIGHT CEILING +${model.heightCeilingM.value} M`, 2, 0, 'end', sourceOf(model.heightCeilingM)),
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
      legendNotes: [CAD_LAYERS],
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

function levelRange(levels: readonly ModelLevel[]): string {
  const first = levels[0];
  const last = levels[levels.length - 1];
  if (!first || !last) return 'none';
  return first === last ? first.id : `${first.id} - ${last.id}`;
}

function sameRing(a: ModelRing, b: ModelRing): boolean {
  return a.length === b.length && a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y);
}

