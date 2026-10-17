/**
 * The bays a car park sets aside: for people of determination (DBC C.6.4), and
 * for hybrid, electric and carpool vehicles (DBC B.7.2.6.2).
 *
 * The renderers drew an accessible bay from the start — a role on the sheets, a
 * layer in the DXF, a mesh in 3D — and the engine never designated one, so every
 * drawing of every run showed a car park without them. C.6.4.1 ¶1 is a "shall"
 * for any car park associated with a building.
 *
 * WHAT A DESIGNATION COSTS, AND WHY IT IS COUNTED. An accessible bay is not a
 * label on a bay: C.6.4.2 f) gives it an access aisle at least 1.2 m wide, and
 * g) lets two bays share one if it is central to both. So three bays side by
 * side become two accessible bays with the middle one as their shared aisle,
 * and a lone accessible bay takes its neighbour as its aisle. Either way one bay
 * is given up per group, and it is counted: a bay count that includes a hatched
 * aisle is a bay count nobody can park in.
 *
 * WHERE THEY GO, BY A STATED RULE. On the parking level the street reaches — the
 * ground floor where it parks, which C.6.4.2 e) asks for, else the first
 * basement — at the groups nearest the core, because C.6.4.2 a) puts them "as
 * close as possible" to the building and the core is where the lifts are.
 * Searching positions for the fewest bays lost would be the optimiser
 * `PHASE_0_CLASSES` refuses; the nearest group is a rule a reader can check.
 *
 * WHAT IS NOT DONE, AND SAID: the accessible route from each aisle to the core
 * (C.6.4.2 f) — no pedestrian route is modelled — the sign at 2,100 mm (h), and
 * walking distance (b): only the straight line to the core is measured, and a
 * straight line is a floor on any walk, never a proof of one.
 */

import { Decimal, type Citation, type Traced, type TracedDecimal, type Tracer } from '@envelope/core';
import type { Pt } from '@envelope/geometry';

import { RectKind } from './layout.js';
import type { WorldRect } from './level-plan.js';

const DBC_PDF = 'docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf';

export const TABLE_C17: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'C.6.4.1 Table C.17 — Minimum number of accessible parking spaces',
  documentUri: DBC_PDF,
  sourcePage: 194,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim: 'The number of accessible parking spaces shall be obtained from Table C.17.',
};

export const CLAUSE_C_6_4_1_4: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'C.6.4.1 ¶4 and Table C.18 — Accessible van parking',
  documentUri: DBC_PDF,
  sourcePage: 194,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'Accessible van parking should be provided at a rate of 10% of overall accessible parking ' +
    'count. At least one accessible van parking space should be provided for each building or facility.',
};

export const CLAUSE_B_7_2_6_2: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.6.2 — Preferred parking',
  documentUri: DBC_PDF,
  sourcePage: 90,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim: 'The percentage required for preferred parking is 5%.',
};

export const ACCESSIBLE_SLOPE_B7231: Citation = {
  instrumentId: 'DUBAI_BUILDING_CODE',
  instrumentVersion: '2021',
  clauseReference: 'B.7.2.3.1 — Parking at slope, accessible parking',
  documentUri: DBC_PDF,
  sourcePage: 83,
  sourceBbox: [0, 0, 842, 595],
  sourceTextVerbatim:
    'The slope in areas where vehicles are parked shall be not more than 4% (as shown in ' +
    'Figure B.55). Accessible parking slopes shall be limited to a maximum of 2%.',
};

/** B.7.2.3.1: the steepest an accessible bay's floor may fall, percent. */
export const MAX_ACCESSIBLE_SLOPE_PCT = '2';

/**
 * The parking level a car reaches first from the street: the ground floor where
 * it parks, which C.6.4.2 e) asks for, else the first basement, else the first
 * podium parking level. The accessible bays stand on it.
 */
export const EntryLevel = {
  GROUND: 'GROUND',
  FIRST_BASEMENT: 'FIRST_BASEMENT',
  FIRST_PODIUM: 'FIRST_PODIUM',
} as const;
export type EntryLevel = (typeof EntryLevel)[keyof typeof EntryLevel];

/** How a sentence names that level. `packages/report/src/words` reads these. */
export const ENTRY_LEVEL_WORDS: Readonly<Record<EntryLevel, string>> = {
  GROUND: 'the ground floor',
  FIRST_BASEMENT: 'the first basement',
  FIRST_PODIUM: 'the first podium parking level',
};

/** Table C.18: an accessible van bay is 3.35 m wide. */
export const VAN_BAY_WIDTH_M = new Decimal('3.35');
/** C.6.4.2 f): the access aisle beside an accessible bay. */
export const ACCESS_AISLE_MIN_M = new Decimal('1.2');
/** C.6.4.2 b): the farthest an accessible bay may be from the building entrance. */
export const ACCESSIBLE_REACH_M = 50;

const ACCESSIBLE_READING_BASIS =
  'DBC Table C.17 gives 2% of a car park of 25 to 500 spaces, at least one, and 1% of ' +
  'the spaces over 500. It states no rounding, no count for the first 500 of a larger ' +
  'car park, and no row under 25. Each is read on the side that provides more: a ' +
  'fraction is rounded up, the first 500 count at the 2% row (10), and a car park under ' +
  '25 gets the one bay C.6.4.1 ¶1 requires every car park associated with a building to have. ' +
  'The van share of C.6.4.1 ¶4 is rounded up the same way.';

const PREFERRED_READING_BASIS =
  'DBC B.7.2.6.2 gives 5% of the bays the building requires (B.7.2.6.1) where it has ' +
  'more than 20, and states no rounding. A fraction is rounded up, the side that provides more.';

/** The count Table C.17 asks of a car park of `total` spaces, under the reading above. */
export function accessibleRequired(total: number, roundUp = true): number {
  const r = (x: Decimal): number => (roundUp ? x.ceil() : x.floor()).toNumber();
  if (total <= 0) return 0;
  if (total < 25) return 1;
  if (total <= 500) return Math.max(1, r(new Decimal(total).times('0.02')));
  return 10 + r(new Decimal(total - 500).times('0.01'));
}

export interface AccessiblePlan {
  /** Whether the level that holds them is the ground floor. Kept for readers of `level`'s older form. */
  readonly onGrade: boolean;
  /** Which parking level holds them. */
  readonly level: EntryLevel;
  /**
   * Where the level's parked floor is the sloped ring: its gradient against
   * B.7.2.3.1's 2%, and whether that kept the bays off it. Absent on a flat level.
   */
  readonly slope?: {
    readonly gradientPct: TracedDecimal;
    readonly limitPct: TracedDecimal;
    readonly blocked: boolean;
    /** The ring's level landing the bays were placed on, where it has one. */
    readonly landingPct?: TracedDecimal;
  };
  /** That level's rectangles, with the accessible bays, their aisles and the preferred bays marked. */
  readonly rects: readonly WorldRect[];
  /** That level's bays once the aisles are taken from it. */
  readonly bayCount: Traced<number>;
  readonly required: Traced<number>;
  readonly placed: Traced<number>;
  readonly vans: number;
  /** Bays given up to access aisles. */
  readonly lost: number;
  /** Straight line from the farthest accessible bay to the core, metres; null where no core stands. */
  readonly farthestM: Traced<Decimal> | null;
  readonly preferred?: { readonly required: Traced<number>; readonly placed: number };
  /** Said, never omitted. */
  readonly notes: readonly string[];
}

export interface AccessibleInput {
  readonly tracer: Tracer;
  /** The level the street reaches, by `entryLevelOf` in `building.ts`. */
  readonly level: EntryLevel;
  /**
   * The gradient of the level's parked floor, where the arrangement is the
   * sloped ring. Absent on a flat level. Every parking level shares one layout,
   * so a sloped ring here is a sloped ring on every level the bays could go to.
   */
  readonly floorGradientPct?: TracedDecimal;
  /**
   * Where that sloped ring keeps a stretch level (`levelLanding` in `layout.ts`):
   * its outline in plot millimetres and its traced gradient. The accessible bays
   * are placed on it and nowhere else on the ring.
   */
  readonly landing?: { readonly world: readonly Pt[]; readonly gradientPct: TracedDecimal };
  /** The level's rectangles before any designation: the grade plan's, or the shared layout's. */
  readonly rects: readonly WorldRect[];
  readonly levelBays: Traced<number>;
  /** Every other parking level, which keeps the shared layout. */
  readonly others: { readonly perLevel: Traced<number>; readonly levels: number };
  readonly bayWidthM: Decimal;
  /** The core's footprint on the parking level, plot millimetres. */
  readonly core?: readonly Pt[];
}

const isBay = (r: WorldRect): boolean => r.kind === RectKind.BAY;

const centroid = (ring: readonly Pt[]): { x: number; y: number } => ({
  x: ring.reduce((s, p) => s + p.x, 0) / ring.length,
  y: ring.reduce((s, p) => s + p.y, 0) / ring.length,
});

/** Shortest distance from a point to a ring's boundary, mm; 0 inside it is not needed here. */
function toRingMm(p: { x: number; y: number }, ring: readonly Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

/** Whether a point lies inside a ring, by the crossings of a ray to its right. */
function inside(p: { x: number; y: number }, ring: readonly Pt[]): boolean {
  let within = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) within = !within;
  }
  return within;
}

/** `b` stands immediately after `a` along the same run, their long sides touching. */
function follows(a: WorldRect, b: WorldRect): boolean {
  if (a.row !== b.row) return false;
  const alongX = a.yM.eq(b.yM) && a.heightM.eq(b.heightM) && a.xM.plus(a.widthM).eq(b.xM);
  const alongY = a.xM.eq(b.xM) && a.widthM.eq(b.widthM) && a.yM.plus(a.heightM).eq(b.yM);
  return alongX || alongY;
}

/**
 * Widen `a` into `b` by `extraM`: the van bay takes what Table C.18 asks for out
 * of the aisle beside it. Local and world coordinates move together.
 */
function widenInto(a: WorldRect, b: WorldRect, extraM: Decimal): [WorldRect, WorldRect] {
  const ca = centroid(a.world);
  const cb = centroid(b.world);
  const len = Math.hypot(cb.x - ca.x, cb.y - ca.y) || 1;
  const u = { x: (cb.x - ca.x) / len, y: (cb.y - ca.y) / len };
  const mm = extraM.times(1000).toNumber();
  const shift = (p: Pt): Pt => ({ x: Math.round(p.x + u.x * mm), y: Math.round(p.y + u.y * mm) }) as Pt;
  const aWorld = a.world.map((p) => ((p.x - ca.x) * u.x + (p.y - ca.y) * u.y > 0 ? shift(p) : p));
  const bWorld = b.world.map((p) => ((p.x - cb.x) * u.x + (p.y - cb.y) * u.y < 0 ? shift(p) : p));
  const alongX = a.yM.eq(b.yM);
  const aFirst = alongX ? a.xM.lt(b.xM) : a.yM.lt(b.yM);
  const wa: WorldRect = alongX
    ? { ...a, ...(aFirst ? {} : { xM: a.xM.minus(extraM) }), widthM: a.widthM.plus(extraM), world: aWorld }
    : { ...a, ...(aFirst ? {} : { yM: a.yM.minus(extraM) }), heightM: a.heightM.plus(extraM), world: aWorld };
  const wb: WorldRect = alongX
    ? { ...b, ...(aFirst ? { xM: b.xM.plus(extraM) } : {}), widthM: b.widthM.minus(extraM), world: bWorld }
    : { ...b, ...(aFirst ? { yM: b.yM.plus(extraM) } : {}), heightM: b.heightM.minus(extraM), world: bWorld };
  return [wa, wb];
}

export function designateAccessible(input: AccessibleInput): AccessiblePlan {
  const { tracer } = input;
  const notes: string[] = [];
  const level = ENTRY_LEVEL_WORDS[input.level];

  // --- how many ----------------------------------------------------------------
  const otherBays = input.others.perLevel.value * input.others.levels;
  const totalValue = input.levelBays.value + otherBays;
  const total = tracer.computed('parking.accessible_basis_total', totalValue, {
    formula:
      `${input.levelBays.value} bays on ${level} + ${input.others.perLevel.value} bays laid out per level × ` +
      `${input.others.levels} other parking level(s), before any is set aside`,
    uses: { level: input.levelBays, perLevel: input.others.perLevel },
    unit: 'bays',
  });
  const ratio = tracer.derived('parking.accessible_ratio', '2% of 25 to 500 spaces, at least one; 1% of the spaces over 500', {
    rule: { ruleId: 'DBC.C.6.4.1.TABLE_C17', citation: TABLE_C17 },
    formula: 'Table C.17, all buildings except private housing',
  });
  const reading = tracer.assumed('parking.accessible_reading', 'rounded up; 10 for the first 500; one under 25', {
    basis: ACCESSIBLE_READING_BASIS,
    label: 'how Table C.17 is read where it is silent',
  });
  const requiredValue = accessibleRequired(totalValue);
  const required = tracer.computed('parking.accessible_required', requiredValue, {
    formula:
      totalValue > 500
        ? `10 for the first 500 + ceil(1% × ${totalValue - 500} spaces over 500)`
        : totalValue < 25
          ? `one: ${totalValue} spaces is under the 25 Table C.17 starts at`
          : `max(1, ceil(2% × ${totalValue} spaces))`,
    uses: { total, ratio, reading },
    unit: 'bays',
  });
  const lower = accessibleRequired(totalValue, false);
  tracer.sensitiveTo(required, reading, {
    relativeEffect: requiredValue === 0 ? '0' : new Decimal(requiredValue - lower).div(requiredValue).toFixed(4),
    perturbation: 'every fraction rounded down instead of up',
  });

  // --- the groups, nearest the core first ------------------------------------------
  const rects = [...input.rects];
  const coreAt = input.core && input.core.length > 0 ? centroid(input.core) : undefined;
  const distance = (r: WorldRect): number => {
    const c = centroid(r.world);
    return coreAt ? Math.hypot(c.x - coreAt.x, c.y - coreAt.y) : c.x + c.y;
  };
  const taken = new Set<number>();
  const bayIdx = rects.map((r, i) => (isBay(r) ? i : -1)).filter((i) => i >= 0);
  const next = new Map<number, number>();
  for (const i of bayIdx) {
    const j = bayIdx.find((k) => follows(rects[i]!, rects[k]!));
    if (j !== undefined) next.set(i, j);
  }
  /** Runs of `n` bays side by side, untaken, nearest first by their middle. */
  const groups = (n: 2 | 3): number[][] =>
    bayIdx
      .map((i) => {
        const g = [i];
        while (g.length < n) {
          const j = next.get(g[g.length - 1]!);
          if (j === undefined) return null;
          g.push(j);
        }
        return g;
      })
      .filter((g): g is number[] => g !== null && g.every((k) => !taken.has(k) && onLanding(rects[k]!)))
      .sort((p, q) => distance(rects[p[Math.floor(n / 2)]!]!) - distance(rects[q[Math.floor(n / 2)]!]!) || p[0]! - q[0]!);

  const vanRatio = tracer.derived('parking.accessible_van_ratio', '10% of the accessible bays, at least one per building', {
    rule: { ruleId: 'DBC.C.6.4.1.4', citation: CLAUSE_C_6_4_1_4 },
    formula: 'C.6.4.1 ¶4, with the 3.35 m van bay of Table C.18',
  });
  const vansWanted = requiredValue === 0 ? 0 : Math.max(1, Math.ceil(requiredValue / 10));
  const extra = Decimal.max(new Decimal(0), VAN_BAY_WIDTH_M.minus(input.bayWidthM));
  const vanFits = input.bayWidthM.minus(extra).gte(ACCESS_AISLE_MIN_M);

  /*
    B.7.2.3.1: "Accessible parking slopes shall be limited to a maximum of 2%."
    The sloped ring falls at up to the 4% a parked floor may, so on that
    arrangement every bay — against the walls and on the island, which faces the
    ring — stands on a floor the engine itself reports above 2%. Every parking
    level shares the layout, so there is no flatter level to move them to by the
    rule above. Where the layout keeps a stretch of the ring level for them
    (`levelLanding` in `layout.ts`, 17 Oct 2026), they are placed on it, drawn and
    paid for like any other; where it could not, none is designated, and the
    shortfall is said with both figures. The arrangement is NOT changed to make
    room: choosing a layout to pass a check is the search `PHASE_0_CLASSES`
    refuses, and the reader may pick another arrangement themselves.
  */
  let slope: AccessiblePlan['slope'];
  if (input.floorGradientPct) {
    const limitPct = tracer.derived('parking.accessible_max_slope_pct', new Decimal(MAX_ACCESSIBLE_SLOPE_PCT), {
      rule: { ruleId: 'DBC.B.7.2.3.1.ACCESSIBLE', citation: ACCESSIBLE_SLOPE_B7231 },
      formula: 'accessible parking falls at no more than 2%',
      unit: '%',
    });
    /*
      THE LEVEL LANDING. Where the ring keeps a stretch level for them, the bays
      go there — and only there: every other bay on the ring stands on the
      climbing floor, and the check above still holds for it.
    */
    const landingFlat = input.landing !== undefined && input.landing.gradientPct.value.lte(limitPct.value);
    slope = {
      gradientPct: input.floorGradientPct,
      limitPct,
      blocked: input.floorGradientPct.value.gt(limitPct.value) && !landingFlat,
      ...(landingFlat && input.landing ? { landingPct: input.landing.gradientPct } : {}),
    };
  }
  const onLanding = (r: WorldRect): boolean =>
    slope?.landingPct === undefined || !input.landing ? true : inside(centroid(r.world), input.landing.world);

  let placedValue = 0;
  let vans = 0;
  let lost = 0;
  const accessibleIdx: number[] = [];
  const mark = (accessible: number, aisle: number): void => {
    let a = rects[accessible]!;
    let b = rects[aisle]!;
    if (vans < vansWanted && vanFits) {
      [a, b] = extra.isZero() ? [a, b] : widenInto(a, b, extra);
      a = { ...a, use: 'VAN' };
      vans += 1;
    }
    rects[accessible] = { ...a, kind: RectKind.ACCESSIBLE_BAY };
    rects[aisle] = { ...b, kind: RectKind.ACCESS_AISLE };
    accessibleIdx.push(accessible);
  };
  while (!slope?.blocked && placedValue < requiredValue) {
    if (requiredValue - placedValue >= 2) {
      const g = groups(3)[0];
      if (g) {
        const [a, m, c] = g as [number, number, number];
        g.forEach((k) => taken.add(k));
        mark(a, m);
        rects[c] = { ...rects[c]!, kind: RectKind.ACCESSIBLE_BAY };
        accessibleIdx.push(c);
        placedValue += 2;
        lost += 1;
        continue;
      }
    }
    const g = groups(2)[0];
    if (!g) break;
    const [a, b] = g as [number, number];
    g.forEach((k) => taken.add(k));
    mark(a, b);
    placedValue += 1;
    lost += 1;
  }

  const placed = tracer.computed('parking.accessible_bays', placedValue, {
    formula: slope?.blocked
      ? `0 of ${requiredValue} placed: ${level} is the sloped ring at ${slope.gradientPct.value.toFixed(2)}%, ` +
        `above the ${slope.limitPct.value.toString()}% B.7.2.3.1 allows accessible parking`
      : `${placedValue} of ${requiredValue} placed on ${level}` +
        (slope?.landingPct ? `, on the sloped ring's level landing (${slope.landingPct.value.toString()}%)` : '') +
        ', at the bays nearest the core, ' +
        `${lost} bay(s) given up to the access aisle(s) of C.6.4.2 f)` +
        (vans > 0 ? `; ${vans} of them ${VAN_BAY_WIDTH_M.toString()} m wide for a van` : ''),
    uses: slope
      ? {
          required,
          vanRatio,
          gradient: slope.gradientPct,
          limit: slope.limitPct,
          ...(slope.landingPct ? { landing: slope.landingPct } : {}),
        }
      : { required, vanRatio },
    unit: 'bays',
  });
  if (slope?.blocked && requiredValue > 0) {
    notes.push(
      `None of the ${requiredValue} accessible bays Table C.17 asks for is placed: ${level} is the sloped ring, ` +
        `whose floor falls ${slope.gradientPct.value.toFixed(2)}%, and DBC B.7.2.3.1 limits accessible parking to ` +
        `${slope.limitPct.value.toString()}%. Every parking level shares that layout, so no level is flatter. ` +
        // "May", not "would": no flat arrangement was tried for them, and one with too
        // few runs side by side would place fewer than C.17 asks for too.
        'The arrangement was not changed to make room for them; the reader may pick one with a flat floor.',
    );
  } else if (placedValue < requiredValue && slope?.landingPct) {
    notes.push(
      `${requiredValue - placedValue} of the ${requiredValue} accessible bays Table C.17 asks for could not be ` +
        `placed on ${level}: the sloped ring's level landing holds no further run of bays side by side, and the ` +
        `rest of the ring climbs ${slope.gradientPct.value.toFixed(2)}%, above the ${slope.limitPct.value.toString()}% ` +
        'DBC B.7.2.3.1 allows accessible parking.',
    );
  } else if (placedValue < requiredValue) {
    notes.push(
      `${requiredValue - placedValue} of the ${requiredValue} accessible bays Table C.17 asks for could not be ` +
        `placed on ${level}: it has no further run of bays side by side to take one with its access aisle.`,
    );
  }
  if (vansWanted > 0 && !vanFits) {
    notes.push(
      `No van bay was placed: a ${input.bayWidthM.toString()} m bay leaves less than the ` +
        `${ACCESS_AISLE_MIN_M.toString()} m access aisle once widened to ${VAN_BAY_WIDTH_M.toString()} m.`,
    );
  }

  const bayCount = tracer.computed('parking.entry_level_bays', input.levelBays.value - lost, {
    formula: `${input.levelBays.value} bays − ${lost} given up to the access aisles of the accessible bays`,
    uses: { level: input.levelBays, accessible: placed },
    unit: 'bays',
    detail: {
      note:
        `${level[0]!.toUpperCase()}${level.slice(1)} only: it is the level the street reaches, so the ` +
        'accessible bays stand on it, and the other parking levels keep the shared layout.',
    },
  });

  // --- how far, in a straight line --------------------------------------------------
  let farthestM: Traced<Decimal> | null = null;
  if (input.core && input.core.length > 2 && accessibleIdx.length > 0) {
    const far = Math.max(...accessibleIdx.map((i) => toRingMm(centroid(rects[i]!.world), input.core!)));
    farthestM = tracer.computed('parking.accessible_farthest_m', new Decimal(far).div(1000).toDecimalPlaces(1), {
      formula: 'the straight line from the centre of the farthest accessible bay to the core',
      uses: { placed },
      unit: 'm',
    });
    if (far / 1000 > ACCESSIBLE_REACH_M) {
      notes.push(
        `The farthest accessible bay is ${farthestM.value.toFixed(1)} m from the core in a straight line, beyond ` +
          `the ${ACCESSIBLE_REACH_M} m C.6.4.2 b) allows from the building entrance.`,
      );
    }
  }
  if (accessibleIdx.length > 0) {
    notes.push(
      'The accessible route from each access aisle to the core (C.6.4.2 f) and the sign at 2,100 mm ' +
        '(C.6.4.2 h) are not drawn, and walking distance is NOT ASSESSED: only the straight line to the core is measured.',
    );
  }

  return {
    onGrade: input.level === EntryLevel.GROUND,
    level: input.level,
    ...(slope ? { slope } : {}),
    rects,
    bayCount,
    required,
    placed,
    vans,
    lost,
    farthestM,
    notes,
  };
}

/**
 * The preferred bays, once the building's own requirement is known: B.7.2.6.1
 * counts them from the bays the building REQUIRES, which is settled after the
 * supply. Marking a bay changes no count, so it can wait for it.
 */
export function designatePreferred(
  tracer: Tracer,
  plan: AccessiblePlan,
  input: { readonly requiredBays: Traced<number>; readonly providedBays: number; readonly core?: readonly Pt[] },
): AccessiblePlan {
  const ratio = tracer.derived('parking.preferred_ratio', '5% of the bays required, where the building has more than 20', {
    rule: { ruleId: 'DBC.B.7.2.6.2', citation: CLAUSE_B_7_2_6_2 },
    formula: 'B.7.2.6.2 ¶3; bays for people of determination are not part of it',
  });
  const reading = tracer.assumed('parking.preferred_reading', 'rounded up', {
    basis: PREFERRED_READING_BASIS,
    label: 'how B.7.2.6.2 is rounded',
  });
  const applies = input.providedBays > 20;
  const wanted = applies ? new Decimal(input.requiredBays.value).times('0.05').ceil().toNumber() : 0;
  const required = tracer.computed('parking.preferred_required', wanted, {
    formula: applies
      ? `ceil(5% × ${input.requiredBays.value} bays required)`
      : `none: the building has ${input.providedBays} bays, and B.7.2.6.2 starts above 20`,
    uses: { required: input.requiredBays, ratio, reading },
    unit: 'bays',
  });
  const floor = applies ? new Decimal(input.requiredBays.value).times('0.05').floor().toNumber() : 0;
  tracer.sensitiveTo(required, reading, {
    relativeEffect: wanted === 0 ? '0' : new Decimal(wanted - floor).div(wanted).toFixed(4),
    perturbation: 'rounded down instead of up',
  });

  const rects = [...plan.rects];
  const coreAt = input.core && input.core.length > 0 ? centroid(input.core) : undefined;
  const order = rects
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => isBay(r))
    .sort((p, q) => {
      const a = centroid(p.r.world);
      const b = centroid(q.r.world);
      const da = coreAt ? Math.hypot(a.x - coreAt.x, a.y - coreAt.y) : a.x + a.y;
      const db = coreAt ? Math.hypot(b.x - coreAt.x, b.y - coreAt.y) : b.x + b.y;
      return da - db || p.i - q.i;
    });
  const chosen = order.slice(0, wanted);
  for (const { r, i } of chosen) rects[i] = { ...r, use: 'PREFERRED' };
  const notes = [...plan.notes];
  if (chosen.length < wanted) {
    notes.push(
      `${wanted - chosen.length} of the ${wanted} preferred bays B.7.2.6.2 asks for could not be marked: ` +
        'the level the street reaches has no further bay.',
    );
  }
  return { ...plan, rects, preferred: { required, placed: chosen.length }, notes };
}
