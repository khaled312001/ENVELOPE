/**
 * The run, assembled into one building — `BuildingModel` (see `@envelope/core`).
 *
 * Nothing here decides anything about the scheme. The envelope decided the rings,
 * the parking solver decided how many levels of parking, the layout decided where
 * each bay goes, and the massing decided how many levels are podium. This module
 * stacks those decisions into levels at their elevations and says, for every
 * element, which traced value put it there.
 *
 * Three things the stack needs that no rule states, and each is a declared
 * assumption with a basis rather than a quiet default:
 *
 * 1. **Which levels hold the parking.** The run knows how many parking levels it
 *    has and how many levels are podium. The client's description of his own
 *    schemes — "the podium is all garage and core" (30 Aug, 55:05) — puts them in
 *    the podium from the ground up; any the podium cannot hold go below grade.
 * 2. **Where the tower stands on the podium**, when the plate cap makes it smaller.
 *    The cap fixes an area. The massing has always said the position is not
 *    decided; now the model carries that as an assumption a caption can quote.
 * 3. **Which way a ramp climbs.** Part of the ramp-run assumption in `layout.ts`.
 *
 * The 30 Aug 2026 meeting is why the parking levels are the centre of this:
 *
 *   "لو عارف يفهم إزاي يحط الباركينج صح، وتوزيعته صح، والرامب بتاعي ماشي صح —
 *    أنا كده حلّصت 3-4 شهور."                                           — 09:13
 */

import {
  type BuildingModel,
  Decimal,
  EDGE_LABEL,
  type ElementSource,
  LevelUse,
  type ModelAisle,
  type ModelBay,
  type ModelLevel,
  type ModelPoint,
  type ModelRamp,
  type ModelSection,
  type ModelSpan,
  type Mm,
  type Plot,
  toMm,
  toWire,
  type Traced,
  type TracedDecimal,
  type Tracer,
} from '@envelope/core';
import {
  distanceAlong,
  lengthSquared,
  lineSpans,
  pointAlong,
  type Pt,
  subtractSpans,
} from '@envelope/geometry';

import type { EnvelopeSolution } from './envelope.js';
import type { LevelPlan, WorldRect } from './level-plan.js';
import type { MassingResult } from './massing.js';

export interface BuildingModelInput {
  readonly tracer: Tracer;
  readonly plot: Plot;
  readonly envelope: EnvelopeSolution;
  readonly massing: MassingResult;
  /** The parking solver's level count — the levels the capacity was computed on. */
  readonly parkingLevels: Traced<number>;
  readonly levelPlan: LevelPlan | undefined;
  readonly levelPlanRefusal: string | undefined;
  /**
   * The answer's own level count — `capacity.levels`. The stack stands to the height
   * ceiling; this says how much of it the answer places.
   */
  readonly answerLevels: Traced<number>;
}

const source = (t: Traced<unknown>): ElementSource => ({
  node: t.node,
  provenanceClass: t.provenanceClass,
});

const pt = (p: Pt): ModelPoint => ({ x: p.x, y: p.y });

const midpoint = (a: Pt, b: Pt): ModelPoint => ({
  x: Math.round((a.x + b.x) / 2) as Mm,
  y: Math.round((a.y + b.y) / 2) as Mm,
});

const PARKING_PLACEMENT_BASIS =
  'The run states how many parking levels it has and how many levels are podium, ' +
  'not which levels the parking occupies. They are placed in the podium from the ' +
  'ground up — the client\'s own description of a Dubai podium is "all garage and ' +
  'core" — and any the podium cannot hold go below grade. It moves the picture and ' +
  'the section; it moves no capacity figure.';

const TOWER_PLACEMENT_BASIS =
  'The tower plate cap fixes the plate\'s area, not where it stands on the podium ' +
  'roof. It is drawn as the podium outline scaled about its centre to the capped ' +
  'area. Where the tower actually sits is a design decision this engine does not ' +
  'make, and the massing has always said so.';

/** Always true of this model, whatever the run. Said with every drawing of it. */
const NOT_MODELLED: readonly string[] = [
  'Columns. With a structural grid the layout charges Table B.11\'s 300 mm clearance ' +
    'per bay, but it places no column, and drawing one would be drawing structure ' +
    'nobody checked against the bays.',
  'Cores, stairs and lifts as rooms. The run declares how much of each parking level ' +
    'they take — drawn as the reserved zone — not where each one goes; on the tower ' +
    'floors their position is not determined at all.',
  'Slab thickness. Levels are planes at their floor level. The engine computes no ' +
    'slab depth, and a drawn thickness would be an invented one.',
  'Façades, windows, balconies and units. The engine computes none of them.',
  // Said because a 3D view invites the assumption that it shows the street. The run
  // knows which way each edge faces and nothing about what stands beyond it.
  'Neighbouring buildings and the road. The run knows which edges of the plot face a ' +
    'road and which face a neighbour — the site plan writes that on the boundary — but ' +
    'not what stands beyond them, so neither is drawn.',
  'Pedestrian entrance, refuse room and escape distances — NOT ASSESSED until their ' +
    'rules are encoded.',
];

/**
 * Stack the run into a building.
 *
 * Pure: the same run yields the same model, byte for byte, which is what lets
 * `pnpm parity` compare three drawings of it.
 */
export function buildBuildingModel(input: BuildingModelInput): BuildingModel {
  const { tracer, envelope, massing, levelPlan } = input;
  const f2f = envelope.floorToFloorM;
  const f2fMm = toMm(f2f.value);

  const podiumMass = massing.masses.find((m) => m.id === 'podium');
  if (!podiumMass) throw new Error('the massing has no podium; the model has nothing to stand on');
  const podiumLevels = podiumMass.levels;
  const totalAbove = envelope.maxLevelsByHeight.value;
  const parkingCount = Math.max(0, input.parkingLevels.value);
  const parkingInPodium = Math.min(parkingCount, podiumLevels.value);
  const parkingBelow = parkingCount - parkingInPodium;
  // The answer's levels stand on the parking. Where the podium parking and the
  // answer together need more levels than the ceiling permits, the shortfall is said
  // in words below rather than drawn above the ceiling.
  const answerCount = Math.max(0, input.answerLevels.value);
  const placedAboveParking = Math.min(answerCount, Math.max(0, totalAbove - parkingInPodium));
  const unplacedAnswer = answerCount - placedAboveParking;

  const placements: BuildingModel['placements'][number][] = [];
  const notModelled: string[] = [...NOT_MODELLED];

  // --- where the parking goes ------------------------------------------------
  const parkingPlacement =
    parkingCount > 0
      ? tracer.assumed(
          'building.parking_levels_placement',
          `${parkingInPodium} in the podium from the ground up` +
            (parkingBelow > 0 ? `, ${parkingBelow} below grade` : ''),
          { basis: PARKING_PLACEMENT_BASIS, label: 'which levels hold the parking' },
        )
      : undefined;
  if (parkingPlacement) {
    placements.push({
      subject: 'parking levels',
      source: source(parkingPlacement),
      statement: `Parking levels: ${parkingPlacement.value}.`,
    });
  }

  // --- the slabs ---------------------------------------------------------------
  const podiumSource = source(envelope.podiumPlacement ?? envelope.podiumFootprint);
  if (envelope.podiumPlacement) {
    placements.push({
      subject: 'podium',
      source: source(envelope.podiumPlacement),
      statement: 'Podium: area from the coverage cap; drawn centred in the setback line.',
    });
  }

  const towerIsPodium =
    envelope.plateRing.length === envelope.podiumRing.length &&
    envelope.plateRing.every(
      (p, i) => p.x === envelope.podiumRing[i]!.x && p.y === envelope.podiumRing[i]!.y,
    );
  const towerPlacement = towerIsPodium
    ? undefined
    : tracer.assumed('building.tower_placement', 'centred on the podium', {
        basis: TOWER_PLACEMENT_BASIS,
        label: 'where the tower stands',
      });
  const towerSource = source(towerPlacement ?? envelope.towerPlateCap);
  if (towerPlacement) {
    placements.push({
      subject: 'tower',
      source: source(towerPlacement),
      statement: 'Tower: area from the plate cap; drawn centred on the podium.',
    });
  }

  // --- the parking content, identical on every parking level -------------------
  const parkingContent: ModelLevel['parking'] = levelPlan ? parkingOf(levelPlan) : null;
  if (parkingCount > 0 && !levelPlan) {
    notModelled.push(
      `Parking bays. The level could not be laid out: ${input.levelPlanRefusal ?? 'no reason was recorded'}`,
    );
  }

  // --- the stack ------------------------------------------------------------------
  const levels: ModelLevel[] = [];
  const elevationOf = (index: number, uses: Record<string, Traced<unknown>>): TracedDecimal =>
    tracer.computed('building.level_elevation_m', f2f.value.times(index), {
      formula: `${index} × ${f2f.value.toString()} m floor to floor`,
      uses,
      unit: 'm',
    });

  for (let k = parkingBelow; k >= 1; k -= 1) {
    const elevation = elevationOf(-k, { f2f, placement: parkingPlacement! });
    levels.push({
      id: `B${k}`,
      name: `Basement ${k} · parking`,
      use: LevelUse.BASEMENT_PARKING,
      elevationMm: (-k * f2fMm) as Mm,
      heightMm: f2fMm,
      elevationM: toWire(elevation),
      outline: envelope.podiumRing.map(pt),
      outlineSource: podiumSource,
      placed: true,
      parking: parkingContent,
    });
  }

  for (let i = 0; i < totalAbove; i += 1) {
    const inPodium = i < podiumLevels.value;
    const isParking = inPodium && i < parkingInPodium;
    const use = isParking ? LevelUse.PODIUM_PARKING : inPodium ? LevelUse.PODIUM : LevelUse.TYPICAL;
    const elevation = elevationOf(i, {
      f2f,
      podium: podiumLevels,
      ...(isParking ? { placement: parkingPlacement! } : {}),
    });
    const id = `L${String(i).padStart(2, '0')}`;
    levels.push({
      id,
      name:
        `Level ${i}` +
        (use === LevelUse.PODIUM_PARKING
          ? ' · podium parking'
          : use === LevelUse.PODIUM
            ? ' · podium'
            : ' · typical floor'),
      use,
      elevationMm: (i * f2fMm) as Mm,
      heightMm: f2fMm,
      elevationM: toWire(elevation),
      outline: (inPodium ? envelope.podiumRing : envelope.plateRing).map(pt),
      outlineSource: inPodium ? podiumSource : towerSource,
      placed: isParking || i - parkingInPodium < placedAboveParking,
      parking: isParking ? parkingContent : null,
    });
  }

  // --- how much of the stack the answer uses -----------------------------------------
  const permittedAbove = totalAbove - parkingInPodium - placedAboveParking;
  placements.push({
    subject: 'answer',
    source: source(input.answerLevels),
    statement:
      `The answer places ${answerCount} level${answerCount === 1 ? '' : 's'} of floor area` +
      (placedAboveParking > 0
        ? `, drawn as the lowest ${placedAboveParking} above ` +
          (parkingInPodium > 0 ? 'the podium parking' : 'the ground')
        : '') +
      '.' +
      (permittedAbove > 0
        ? ` The ${permittedAbove} above ${permittedAbove === 1 ? 'it is' : 'them are'} ` +
          'what the height ceiling permits and this answer does not use.'
        : '') +
      (unplacedAnswer > 0
        ? ` ${unplacedAnswer} of the answer's levels ` +
          (unplacedAnswer === 1 ? 'does' : 'do') +
          ' not fit under the height ceiling ' +
          `above ${parkingInPodium} level${parkingInPodium === 1 ? '' : 's'} of podium ` +
          `parking, and ${unplacedAnswer === 1 ? 'is' : 'are'} not drawn. The capacity figure does not count parking ` +
          'levels against the height ceiling, so with the parking placed in the podium ' +
          'the answer and its parking do not both fit under it.'
        : ''),
  });

  // --- ramps between consecutive parking levels ------------------------------------
  const parkingStack = levels.filter((l) => l.parking !== null);
  const ramps: ModelRamp[] = [];
  const strip = levelPlan?.rampStrip;
  if (strip && parkingStack.length >= 2) {
    const gradient = tracer.computed(
      'building.ramp_gradient_pct',
      f2f.value.div(strip.runM.value).times(100).toDecimalPlaces(2),
      {
        formula:
          `${f2f.value.toString()} m rise ÷ ${strip.runM.value.toString()} m run × 100`,
        uses: { rise: f2f, run: strip.runM },
        unit: '%',
        detail: {
          note:
            'The gradient a ramp in the reserved strip needs to climb one level. ' +
            'Whether it is permitted is NOT ASSESSED — DBC B.7.2.2 is not encoded.',
        },
      },
    );
    const label =
      `SLOPED RAMP ${gradient.value.toFixed(2)}% - GRADIENT NOT ASSESSED (DBC B.7.2.2)`;
    for (let i = 0; i + 1 < parkingStack.length; i += 1) {
      const low = parkingStack[i]!;
      const high = parkingStack[i + 1]!;
      ramps.push({
        id: `R${i + 1}`,
        fromLevelId: low.id,
        toLevelId: high.id,
        outline: strip.world.map(pt),
        foot: [pt(strip.foot[0]), pt(strip.foot[1])],
        head: [pt(strip.head[0]), pt(strip.head[1])],
        fromElevationMm: low.elevationMm,
        toElevationMm: high.elevationMm,
        gradientPct: toWire(gradient),
        label,
      });
    }
    notModelled.push(
      'Ramp transitions, headroom and the approach from the street — NOT ASSESSED ' +
        '(DBC B.7.2.2). Only the gradient over the reserved run is computed.',
    );
  } else if (strip && parkingStack.length === 1) {
    notModelled.push(
      'A ramp. The strip is reserved on the one parking level, but there is no second ' +
        'parking level for a ramp to reach, so no gradient is computed.',
    );
  }
  if (parkingBelow > 0 && parkingInPodium === 0) {
    notModelled.push(
      'The ramp from the street down to the first basement. Only ramps between two ' +
        'parking levels are modelled.',
    );
  }

  // --- what is drawn, counted once -------------------------------------------------
  const perLevel = levelPlan?.bayCount;
  const drawnBays = perLevel
    ? tracer.computed('building.drawn_bays', perLevel.value * parkingCount, {
        formula: `${perLevel.value} bays laid out per level × ${parkingCount} parking level(s)`,
        uses: { perLevel, levels: input.parkingLevels },
        unit: 'bays',
        detail: {
          note:
            'Every bay the sheets, the massing and the DXF draw. The same layout on ' +
            'each parking level, because the parking solver sized every level alike.',
        },
      })
    : tracer.computed('building.drawn_bays', 0, {
        formula: 'no parking level could be laid out, so no bay is drawn',
        uses: { levels: input.parkingLevels },
        unit: 'bays',
      });

  // --- sections -----------------------------------------------------------------------
  const sections = sectionsOf(input.plot, envelope.setbackRing, envelope.podiumRing, levels, ramps, strip);
  if (sections.length === 0) {
    notModelled.push(
      'Sections. No line through the scheme crossed the plot boundary, so no section was cut.',
    );
  }

  // --- access and the boundary -------------------------------------------------------
  const recommended = levelPlan?.access.recommended;
  const setbackBySeq = new Map(envelope.appliedSetbacks.map((s) => [s.seq, s.valueM]));

  return {
    schema: 'envelope.building/1',
    plot: {
      outline: input.plot.ring.map(pt),
      edges: input.plot.edges.map((e) => ({
        seq: e.seq,
        start: pt(e.start),
        end: pt(e.end),
        label: EDGE_LABEL[e.classification],
        setbackM: setbackBySeq.get(e.seq)?.toFixed(2) ?? null,
      })),
    },
    setbackLine: envelope.setbackRing.map(pt),
    setbackSource: source(envelope.setbackPermittedFootprint),
    heightCeilingM: toWire(envelope.heightCeilingM),
    levels,
    placedLevels: toWire(input.answerLevels),
    ramps,
    access: recommended
      ? {
          edgeSeq: recommended.value.edgeSeq,
          opening: [pt(recommended.value.opening.start), pt(recommended.value.opening.end)],
          source: source(recommended),
          label: `VEHICLE ENTRY / EXIT - ${recommended.value.widthM.toFixed(2)}M`,
        }
      : null,
    drawnBays: toWire(drawnBays),
    placements,
    sections,
    notModelled,
  };
}

/**
 * Cut the sections.
 *
 * Where a cut goes is a view, not a quantity — no figure depends on it — so it is
 * chosen by a stated rule rather than traced as an assumption:
 *
 * - **A–A runs along the ramp**, when there is one, because the ramp is the one
 *   element a plan cannot show and the client's sentence names it.
 * - **The long section** runs through the middle of the podium, parallel to the
 *   longest boundary. It is B–B when A–A is the ramp, and A–A when there is no
 *   ramp. It is the one that cuts the tower: a ramp near the podium edge often
 *   misses the plate entirely, and a section whose tower is all dashed outline is
 *   a section of the car park.
 *
 * Every span comes from `lineSpans`, on the millimetre grid. The drawing only
 * reads them.
 */
function sectionsOf(
  plot: Plot,
  setbackRing: readonly Pt[],
  podiumRing: readonly Pt[],
  levels: readonly ModelLevel[],
  ramps: readonly ModelRamp[],
  strip: LevelPlan['rampStrip'],
): ModelSection[] {
  let longest = plot.edges[0]!;
  for (const e of plot.edges) {
    if (lengthSquared(e.start, e.end) > lengthSquared(longest.start, longest.end)) longest = e;
  }
  const xs = podiumRing.map((p) => p.x);
  const ys = podiumRing.map((p) => p.y);
  const centre: Pt = {
    x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2) as Mm,
    y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2) as Mm,
  };
  const along: Pt = {
    x: (centre.x + longest.end.x - longest.start.x) as Mm,
    y: (centre.y + longest.end.y - longest.start.y) as Mm,
  };
  const longTaken =
    `Through the middle of the podium, parallel to boundary ${longest.seq}, ` +
    'the longest side of the plot.';

  const context = { plot, setbackRing, levels, ramps, strip };
  const sections: (ModelSection | null)[] =
    strip && ramps.length > 0
      ? [
          cut('A', midpoint(strip.foot[0], strip.foot[1]) as Pt, midpoint(strip.head[0], strip.head[1]) as Pt,
            'Along the ramp, up its run, through the middle of the ramp strip.', true, context),
          cut('B', centre, along, longTaken, false, context),
        ]
      : [cut('A', centre, along, longTaken, false, context)];
  return sections.filter((x): x is ModelSection => x !== null);
}

function cut(
  id: ModelSection['id'],
  a: Pt,
  b: Pt,
  taken: string,
  alongRamp: boolean,
  context: {
    readonly plot: Plot;
    readonly setbackRing: readonly Pt[];
    readonly levels: readonly ModelLevel[];
    readonly ramps: readonly ModelRamp[];
    readonly strip: LevelPlan['rampStrip'];
  },
): ModelSection | null {
  const { plot, setbackRing, levels, ramps, strip } = context;
  const plotSpans = lineSpans(plot.ring, a, b);
  if (plotSpans.length === 0) return null;
  const origin = plotSpans[0]![0];
  const end = plotSpans[plotSpans.length - 1]![1];
  // Re-based on where the cut enters the plot. Integer shifts: nothing re-rounds.
  const rebase = (spans: readonly (readonly [number, number])[]): ModelSpan[] =>
    spans.map(([s, e]) => [(s - origin) as Mm, (e - origin) as Mm] as const);

  // Where the line crosses the ramp strip, the slabs a ramp joins are open.
  const holes = strip && ramps.length > 0 ? lineSpans(strip.world, a, b) : [];
  const rampLevels = new Set(ramps.flatMap((r) => [r.fromLevelId, r.toLevelId]));
  const extent = (ring: readonly ModelPoint[]): ModelSpan => {
    const d = ring.map((p) => distanceAlong(p as Pt, a, b) - origin);
    return [Math.min(...d) as Mm, Math.max(...d) as Mm];
  };

  return {
    id,
    line: [pt(pointAlong(a, b, origin)), pt(pointAlong(a, b, end))],
    taken,
    lengthMm: (end - origin) as Mm,
    plot: rebase(plotSpans),
    setbackLine: rebase(lineSpans(setbackRing, a, b)),
    levels: levels.map((level) => {
      const full = lineSpans(level.outline as readonly Pt[], a, b);
      const openings = rampLevels.has(level.id) ? holes : [];
      return {
        levelId: level.id,
        cut: rebase(subtractSpans(full, openings)),
        openings: rebase(openings.length > 0 ? subtractSpans(full, subtractSpans(full, openings)) : []),
        beyond: extent(level.outline),
      };
    }),
    // A ramp is drawn as a slope only on the section that runs along it; any other
    // cut crosses it, and shows it as the opening it leaves in the slab.
    ramps: alongRamp
      ? ramps.map((r) => ({
          rampId: r.id,
          foot: {
            alongMm: (distanceAlong(midpoint(r.foot[0], r.foot[1]) as Pt, a, b) - origin) as Mm,
            elevationMm: r.fromElevationMm,
          },
          head: {
            alongMm: (distanceAlong(midpoint(r.head[0], r.head[1]) as Pt, a, b) - origin) as Mm,
            elevationMm: r.toElevationMm,
          },
        }))
      : [],
  };
}

/** One parking level's content, from the level plan. Numbered as a reader scans. */
function parkingOf(plan: LevelPlan): NonNullable<ModelLevel['parking']> {
  const byScan = (a: WorldRect, b: WorldRect): number =>
    a.yM.comparedTo(b.yM) || a.xM.comparedTo(b.xM);

  const bays: ModelBay[] = plan.rects
    .filter((r) => r.kind === 'BAY' || r.kind === 'ACCESSIBLE_BAY')
    .slice()
    .sort(byScan)
    .map((r, i) => ({
      number: i + 1,
      outline: r.world.map(pt),
      accessible: r.kind === 'ACCESSIBLE_BAY',
    }));

  const standard = plan.layout.standard;
  const twoWay = standard.driveway === 'TWO_WAY';
  const label = `${new Decimal(standard.drivewayWidthM).toFixed(2)}M WIDE ${twoWay ? '2 WAY' : '1 WAY'} DRIVEWAY`;
  const aisles: ModelAisle[] = plan.rects
    .filter((r) => r.kind === 'AISLE')
    .slice()
    .sort(byScan)
    .map((r) => {
      const [a, b, c, d] = r.world as readonly [Pt, Pt, Pt, Pt];
      return {
        outline: r.world.map(pt),
        // The aisle runs along the packing rectangle's local x: its short sides are
        // corners 0–3 and 1–2, and the centre line joins their midpoints.
        centreLine: [midpoint(a, d), midpoint(b, c)] as const,
        twoWay,
        label,
      };
    });

  return {
    bays,
    aisles,
    reserved: plan.reservedZone
      ? {
          outline: plan.reservedZone.map(pt),
          areaM2: toWire(plan.deductionsM2),
          label: `CORES, PLANT & CIRCULATION - ${plan.deductionsM2.value.toFixed(0)} SQ.M RESERVED, NOT LAID OUT`,
        }
      : null,
    rampStrip: plan.rampStrip ? plan.rampStrip.world.map(pt) : null,
    baysSource: source(plan.bayCount),
    bayCount: toWire(plan.bayCount),
  };
}
