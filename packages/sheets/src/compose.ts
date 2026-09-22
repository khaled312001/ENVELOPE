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

import type {
  BuildingModel,
  ElementSource,
  ModelLevel,
  ModelPoint,
  ModelRing,
  ModelSection,
  TracedWire,
} from '@envelope/core';

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
import { type LegendEntry, PAPER, paperFurniture, VIEWPORT } from './strip.js';
import {
  type ModelItem,
  Role,
  type Sheet,
  SheetKind,
  type SheetMeta,
  type StripFact,
  SymbolName,
  type TextItem,
} from './types.js';

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
  return sheets;
}

// ---------------------------------------------------------------------------
// The plot, drawn the same way on every plan
// ---------------------------------------------------------------------------

/** Boundary, edge words, setback line — the context every plan sheet stands on. */
function plotContext(model: BuildingModel, s: number, withDimensions: boolean): ModelItem[] {
  const ring = model.plot.outline;
  const items: ModelItem[] = [shape(Role.PLOT, ring, true, { name: 'Plot boundary' })];
  for (const edge of model.plot.edges) {
    const n = inwardNormal(edge.start, edge.end, ring);
    const mid = midpointOf(edge.start, edge.end);
    const along = angleOf(edge.start, edge.end);
    // Outside the boundary, one and a half text heights clear of it.
    items.push(label(Role.EDGE_LABEL, offsetPoint(mid, n, -2.6 * 2.4 * s), edge.label, 2.4, along));

    if (withDimensions && edge.setbackM !== null) {
      const depth = Number(edge.setbackM) * 1000;
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
        const tick = 1.2 * s;
        items.push(shape(Role.DIMENSION, [foot, head], false));
        for (const p of [foot, head]) {
          items.push(shape(Role.DIMENSION, [offsetPoint(p, t, -tick), offsetPoint(p, t, tick)], false));
        }
        items.push(
          label(
            Role.DIMENSION,
            offsetPoint(midpointOf(foot, head), t, 2.2 * s),
            `${edge.setbackM} M`,
            2,
            angleOf(foot, head),
          ),
        );
      }
    }
  }
  items.push(shape(Role.SETBACK, model.setbackLine, true, { source: model.setbackSource, name: 'Setback line' }));
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
  const f = frame(box);
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
    // Past the edge words (which sit 6.2 mm of paper outside the boundary), so a
    // section letter never lands on ROAD SIDE or NEIGHBOUR.
    const ends = [offsetPoint(a, t, -11 * s), offsetPoint(b, t, 11 * s)] as const;
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
    { role: Role.SETBACK, provenanceClass: model.setbackSource.provenanceClass, label: 'Setback line, from each cited setback' },
    ...(ground ? [{ role: Role.PODIUM, provenanceClass: ground.outlineSource.provenanceClass, label: 'Podium footprint' }] : []),
    ...(tower ? [{ role: Role.TOWER, provenanceClass: tower.outlineSource.provenanceClass, label: 'Tower plate' }] : []),
    ...(model.access ? [{ role: Role.ACCESS, label: 'Vehicle entry / exit' }] : []),
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
    items,
    paperItems: paperFurniture({ title: 'Site plan', number: 'A-001', scale: s, meta, facts, legend, north: true }),
    facts,
    notes: [
      ...model.placements.map((p) => p.statement),
      ...model.sections.map((x) => `Section ${x.id}-${x.id}: ${x.taken}`),
    ],
  };
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

  if (parking.reserved) {
    const r = parking.reserved;
    items.push(shape(Role.RESERVED, r.outline, true, { source: sourceOf(r.areaM2), name: r.label }));
    const rb = boxOf(r.outline);
    const wide = rb.maxX - rb.minX >= rb.maxY - rb.minY;
    items.push(label(Role.RESERVED, centroidOf(r.outline), r.label, 1.8, wide ? 0 : 90, 'middle', sourceOf(r.areaM2)));
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
  ];
  const legend: LegendEntry[] = [
    { role: Role.SLAB, provenanceClass: level.outlineSource.provenanceClass, label: 'Slab edge' },
    { role: Role.BAY, label: 'Parking bay, Table B.11' },
    ...(parking.bays.some((b) => b.accessible) ? [{ role: Role.BAY_ACCESSIBLE, label: 'Accessible bay' }] : []),
    { role: Role.AISLE, label: 'Drive aisle' },
    ...(parking.rampStrip ? [{ role: Role.RAMP, label: 'Ramp - gradient NOT ASSESSED' }] : []),
    ...(parking.reserved ? [{ role: Role.RESERVED, label: 'Reserved: cores, plant, circulation' }] : []),
  ];
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
    items,
    paperItems: paperFurniture({ title, number, scale: s, meta, facts, legend, north: true }),
    facts,
    notes: model.notModelled.slice(0, 2),
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
  items.push(
    label(Role.ANNOTATION, centroidOf(first.outline), 'UNITS, CORES AND FACADES NOT MODELLED', 2, 0),
  );

  const last = typical[typical.length - 1]!;
  const range = first === last ? first.id : `${first.id} - ${last.id}`;
  const facts: StripFact[] = [
    { label: 'Levels', value: range },
    fact('First typical floor level', first.elevationM, `${signedLevel(first.elevationM.value)} M`),
  ];
  const legend: LegendEntry[] = [
    { role: Role.SLAB, provenanceClass: first.outlineSource.provenanceClass, label: 'Typical floor plate' },
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
    items,
    paperItems: paperFurniture({ title: 'Typical floor', number: 'A-201', scale: s, meta, facts, legend, north: true }),
    facts,
    notes: [
      ...model.placements.filter((p) => p.subject === 'tower').map((p) => p.statement),
      ...model.notModelled.filter((n) => /Cores|Façades/.test(n)),
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
    items.push(shape(Role.LEVEL_MARK, [P(-1200, e0), P(0, e0)], false));
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
    items,
    paperItems: paperFurniture({ title, number, scale: s, meta, facts, legend, north: false }),
    facts,
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

