/**
 * The GFA statement — the area table a submission drawing carries.
 *
 * What is at risk is not the arithmetic, which is one product and one sum. It is
 * the statement drifting from the run it summarises: a residential row that is not
 * the plate the run used, a proposal that exceeds what FAR allows, a parking row
 * printed where parking was never GFA. So the assertions hold every figure to the
 * engine's own node for it.
 *
 * Since the client sent his own worked scheme (5 Oct 2026) there are four more
 * properties, and each one is a thing he asked for by name:
 *
 *   - the schedule is PER LEVEL, grouped, and the grouping is printed as a count
 *     and a per-level area — never pre-multiplied, because the reader multiplies;
 *   - the two allowances stay separate and are summed at the end;
 *   - a row whose plate is assumed is itself assumed, all the way to the screen;
 *   - the rows sum to the total, which is the one line read with a calculator.
 *
 * And two refusals, asserted BY NAME so that removing either leaves a failing
 * test rather than a quiet absence: the roof is named and not counted, and the
 * ground floor's uniform plate is reconciled in words and not re-apportioned.
 */

import {
  Decimal,
  NodeKind,
  ProvenanceClass,
  ProvenanceGraph,
  Tracer,
  type Citation,
  type Traced,
  type TracedDecimal,
} from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { beforeAll, describe, expect, it } from 'vitest';

import { RECT_80x40, RECT_120x80, runInput } from '../../../test-support/pipeline.js';
import {
  buildGfaStatement,
  classifyLevelId,
  GfaCapKind,
  GfaRowKind,
  GfaStatementRefusedError,
  groundFloorFullPlateNote,
  groundFloorIsParkingNote,
  LevelIdKind,
  NO_COMMERCIAL_AREA_PLACED_NOTE,
  ONE_ALLOWANCE_NOTE,
  PODIUM_AT_TOWER_PLATE_NOTE,
  ROOF_NOT_ASSESSED,
  runPipeline,
  toFt2,
  type GfaStatement,
  type GfaStatementInput,
  type RunOutput,
} from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

const farOf = (out: RunOutput): Decimal => out.capacity.permittedFar.value;

/** The rule id one computation away from a value: value → computation → rule. */
function ruleOf(out: RunOutput, node: string): string | undefined {
  const graph = out.graph.toJSON();
  const computation = graph.edges.find((e) => e.from === node)?.to;
  return graph.edges
    .filter((e) => e.from === computation)
    .map((e) => graph.nodes.find((n) => n.id === e.to))
    .find((n) => n?.kind === NodeKind.RULE)?.ruleId;
}
const plotAreaOf = (ring: typeof RECT_80x40): Decimal => {
  const xs = ring.map((p) => p.x);
  const ys = ring.map((p) => p.y);
  return new Decimal(Math.max(...xs) - Math.min(...xs))
    .times(Math.max(...ys) - Math.min(...ys))
    .div(1_000_000);
};

const sumOf = (s: GfaStatement): Decimal =>
  s.rows.reduce((a, r) => a.plus(r.areaM2.value), new Decimal(0));

/* -------------------------------------------------------------------------
 * A statement built by hand, so the grouping can be driven.
 *
 * The pipeline cannot produce every shape this table has to print: on the
 * fixture plots the ground floor is always parking, and `building.ts` places
 * podium parking from the ground up whatever the schedule says. A direct call is
 * also the only way to hand it an ASSUMED plate and watch the class propagate.
 * ---------------------------------------------------------------------- */

const CITATION: Citation = {
  instrumentId: 'TEST-INSTRUMENT',
  instrumentVersion: '1.0',
  clauseReference: '§1.1',
  documentUri: 'test://instrument',
  sourcePage: 1,
  sourceBbox: [0, 0, 1, 1],
  sourceTextVerbatim: 'FAR shall not exceed 3.50',
};

interface HandBuilt {
  readonly statement: GfaStatement;
  readonly graph: ProvenanceGraph;
  readonly plate: TracedDecimal;
}

function handBuilt(
  levelIds: readonly string[],
  opts: {
    readonly plateClass?: 'DERIVED' | 'ASSUMED';
    readonly levels?: number;
    readonly parkingLevelIds?: readonly string[];
    readonly commercialAllowanceM2?: string;
    readonly parkingInFar?: 'COUNTS_TOWARD_FAR' | 'EXCLUDED_FROM_FAR';
    readonly groundNonParkingM2?: string;
  } = {},
): HandBuilt {
  const graph = new ProvenanceGraph();
  const tracer = new Tracer(graph);
  const rule = { ruleId: 'TEST.FAR', citation: CITATION };
  const plate: TracedDecimal =
    opts.plateClass === 'ASSUMED'
      ? tracer.assumed('envelope.tower_plate_cap', new Decimal('625.55'), {
          basis: 'test fixture: no plate cap rule applies, so the plate is assumed',
          unit: 'm²',
        })
      : tracer.derived('envelope.tower_plate_cap', new Decimal('625.55'), {
          rule,
          formula: 'test fixture plate',
          unit: 'm²',
        });
  const count = opts.levels ?? levelIds.length;
  const levels: Traced<number> = tracer.computed('capacity.levels', count, {
    formula: `${count} whole level(s)`,
    uses: { plate },
    unit: 'levels',
  });
  const parkingArea = tracer.derived('parking.required_area_m2', new Decimal('1000'), {
    rule,
    formula: 'test fixture parking area',
    unit: 'm²',
  });
  const governing = tracer.computed(
    'capacity.governing_gfa',
    plate.value.times(count),
    { formula: 'test fixture governing capacity', uses: { plate, levels }, unit: 'm²' },
  );
  const input: GfaStatementInput = {
    tracer,
    farMax: new Decimal('3.50'),
    plotAreaM2: new Decimal('1365.23'),
    farRule: rule,
    towerPlate: plate,
    levels,
    residentialLevelIds: levelIds,
    parkingInFar: opts.parkingInFar ?? 'EXCLUDED_FROM_FAR',
    parkingArea,
    parkingLevelIds: opts.parkingLevelIds ?? [],
    governingGfa: governing,
    ...(opts.commercialAllowanceM2 === undefined
      ? {}
      : {
          commercialAllowance: tracer.derived(
            'gfa_statement.commercial_allowance_m2',
            new Decimal(opts.commercialAllowanceM2),
            { rule, formula: 'test fixture commercial allowance', unit: 'm²' },
          ),
        }),
    ...(opts.groundNonParkingM2 === undefined
      ? {}
      : {
          groundFloorNonParkingAreaM2: tracer.computed(
            'parking.non_parking_floor_area_m2',
            new Decimal(opts.groundNonParkingM2),
            { formula: 'test fixture non-parking floor area', uses: { plate }, unit: 'm²' },
          ),
        }),
  };
  return { statement: buildGfaStatement(input), graph, plate };
}

/* -------------------------------------------------------------------------
 * THE GROUPING — his «Typical floor 02/04/06  625.55 × 3» made general.
 * ---------------------------------------------------------------------- */

describe('the per-level schedule', () => {
  it('reads the model’s own level ids, in one place', () => {
    expect(classifyLevelId('G')).toBe(LevelIdKind.GROUND);
    expect(classifyLevelId('P1')).toBe(LevelIdKind.PODIUM);
    expect(classifyLevelId('P12')).toBe(LevelIdKind.PODIUM);
    expect(classifyLevelId('B2')).toBe(LevelIdKind.BASEMENT);
    expect(classifyLevelId('L03')).toBe(LevelIdKind.TYPICAL);
    // Unrecognised reads as typical rather than raising: the partition it feeds
    // must be total, or a level falls out of the schedule and the rows stop
    // summing to the total.
    expect(classifyLevelId('MEZZ')).toBe(LevelIdKind.TYPICAL);
  });

  it('groups the ground floor, the podium and the typical floors as separate rows', () => {
    const { statement } = handBuilt(['G', 'P1', 'P2', 'L03', 'L04', 'L05']);
    expect(statement.rows.map((r) => r.kind)).toEqual([
      GfaRowKind.GROUND,
      GfaRowKind.PODIUM,
      GfaRowKind.TYPICAL,
    ]);
    expect(statement.rows[0]!.levelIds).toEqual(['G']);
    expect(statement.rows[1]!.levelIds).toEqual(['P1', 'P2']);
    expect(statement.rows[2]!.levelIds).toEqual(['L03', 'L04', 'L05']);
    expect(statement.rows.map((r) => r.count)).toEqual([1, 2, 3]);
  });

  /*
    THE ROW IS A COUNT AND A PER-LEVEL AREA, NOT A PRE-MULTIPLIED FIGURE.

    This is the assertion his table forces. "625.55 × 3 = 1,876.66" is printed as
    three figures because the reader multiplies the first two and checks the
    third; a row carrying only 1,876.66 cannot be checked at all. So the row must
    carry both operands, and the product must be reachable FROM them in the
    graph — not merely equal to them.
  */
  it('prints the count and the per-level area, and the product is a product in the graph', () => {
    const { statement, graph, plate } = handBuilt(['L03', 'L04', 'L05']);
    const [row] = statement.rows;
    expect(row!.count).toBe(3);
    expect(row!.perLevelM2).toBe(plate);
    expect(row!.levelCount).not.toBeNull();
    expect(row!.levelCount!.value).toBe(3);
    expect(row!.areaM2.value.toString()).toBe(plate.value.times(3).toString());

    // value → computation → { per-level area, level count }. Both operands, by
    // name, so a reader who opens the row's total is shown the multiplication.
    const json = graph.toJSON();
    const computation = json.edges.find((e) => e.from === row!.areaM2.node)?.to;
    const operands = json.edges
      .filter((e) => e.from === computation)
      .map((e) => e.to);
    expect(operands).toContain(plate.node);
    expect(operands).toContain(row!.levelCount!.node);
    // And the formula a reader is shown says the same thing in words.
    const formula = json.nodes.find((n) => n.id === computation)?.formula ?? '';
    expect(formula).toContain('625.55 m² per level × 3 level(s)');
    expect(formula).toContain('L03, L04, L05');
  });

  it('sums to the total, which is the line a reader checks with a calculator', () => {
    for (const ids of [['G', 'P1', 'L02'], ['L01', 'L02', 'L03', 'L04'], []]) {
      const { statement } = handBuilt(ids, { levels: Math.max(ids.length, 1) });
      expect(sumOf(statement).toString()).toBe(statement.proposedGfaM2.value.toString());
    }
  });

  /*
    A LEVEL THE ANSWER COUNTS AND THE MODEL COULD NOT PLACE IS STILL IN THE SUM.

    `building.ts` stops stacking at the height ceiling and says so in a placement
    sentence nobody reads. If those levels were dropped from the schedule the
    rows would no longer sum to the capacity figure every other output quotes,
    and a reader would find the discrepancy with a calculator and no explanation.
  */
  it('gives the levels the model could not place a row of their own', () => {
    const { statement } = handBuilt(['L01', 'L02'], { levels: 5 });
    const unplaced = statement.rows.find((r) => r.kind === GfaRowKind.UNPLACED);
    expect(unplaced).toBeDefined();
    expect(unplaced!.count).toBe(3);
    expect(unplaced!.levelIds).toEqual([]);
    expect(sumOf(statement).toString()).toBe(statement.proposedGfaM2.value.toString());
  });

  it('withholds the ids when they outnumber the levels the answer counts', () => {
    // A list longer than the count would label floors the row is not.
    const { statement } = handBuilt(['L01', 'L02', 'L03'], { levels: 2 });
    expect(statement.rows.map((r) => r.kind)).toEqual([GfaRowKind.TYPICAL]);
    expect(statement.rows[0]!.levelIds).toEqual([]);
    expect(statement.rows[0]!.count).toBe(2);
  });
});

/* -------------------------------------------------------------------------
 * AN ASSUMED PLATE MAKES AN ASSUMED ROW, which is what paints it amber.
 * ---------------------------------------------------------------------- */

describe('a row whose area rests on an assumption', () => {
  it('is itself ASSUMED, and reaches an assumption in the graph', () => {
    const { statement, graph } = handBuilt(['L01', 'L02'], { plateClass: 'ASSUMED' });
    const [row] = statement.rows;
    // §13.1: the class is the engine's, and the render hint follows it. A row
    // computed from an assumed plate that reported DERIVED would be painted as a
    // cited figure — the one softening §13.1 exists to prevent.
    expect(row!.areaM2.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    expect(row!.levelCount!.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    expect(statement.proposedGfaM2.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    expect(graph.hasKindBelow(row!.areaM2.node, 'ASSUMPTION')).toBe(true);
  });

  it('stays DERIVED where the plate is derived, so the ink means something', () => {
    const { statement } = handBuilt(['L01', 'L02']);
    expect(statement.rows[0]!.areaM2.provenanceClass).toBe(ProvenanceClass.DERIVED);
  });
});

/* -------------------------------------------------------------------------
 * TWO CAPS, NEVER MERGED.
 * ---------------------------------------------------------------------- */

describe('the two allowances', () => {
  it('states one cap, and says so, where the instrument states one', () => {
    const { statement } = handBuilt(['L01', 'L02']);
    expect(statement.caps.map((c) => c.kind)).toEqual([GfaCapKind.RESIDENTIAL]);
    expect(statement.caps[0]!.notes).toContain(ONE_ALLOWANCE_NOTE);
    expect(statement.caps[0]!.allowedM2).toBe(statement.allowedGfaM2);
    // No commercial cap is invented, and no commercial row either.
    expect(statement.rows.some((r) => r.cap === GfaCapKind.COMMERCIAL)).toBe(false);
  });

  /*
    His own table: commercial 60.00, residential 4,718.305, total 4,778.305. The
    two allowances add to the total exactly, which is the relationship modelled —
    and the subtraction is the engine's, in the graph, not the screen's.
  */
  it('splits the allowance where a commercial one is stated, and keeps the two apart', () => {
    const { statement } = handBuilt(['L01', 'L02'], { commercialAllowanceM2: '60.00' });
    const [residential, commercial] = statement.caps;
    expect(statement.caps).toHaveLength(2);
    expect(residential!.kind).toBe(GfaCapKind.RESIDENTIAL);
    expect(commercial!.kind).toBe(GfaCapKind.COMMERCIAL);
    // 3.50 × 1,365.23 = 4,778.305; less 60.00 = 4,718.305. His figures exactly.
    expect(statement.allowedGfaM2.value.toFixed(3)).toBe('4778.305');
    expect(residential!.allowedM2!.value.toFixed(3)).toBe('4718.305');
    expect(commercial!.allowedM2!.value.toFixed(2)).toBe('60.00');
    // Summed at the end, never merged along the way.
    expect(
      residential!.allowedM2!.value.plus(commercial!.allowedM2!.value).toFixed(3),
    ).toBe(statement.allowedGfaM2.value.toFixed(3));
  });

  it('proposes nothing commercial, as nothing commercial is placed — null, never zero', () => {
    const { statement } = handBuilt(['L01'], { commercialAllowanceM2: '60.00' });
    const commercial = statement.caps.find((c) => c.kind === GfaCapKind.COMMERCIAL)!;
    expect(commercial.proposedM2).toBeNull();
    expect(commercial.remainingM2).toBeNull();
    expect(commercial.notes).toContain(NO_COMMERCIAL_AREA_PLACED_NOTE);
    expect(statement.omissions.some((o) => o.kind === GfaRowKind.COMMERCIAL)).toBe(true);
  });

  it('measures what is left against the residential allowance, not the total', () => {
    const { statement } = handBuilt(['L01', 'L02'], { commercialAllowanceM2: '60.00' });
    const residential = statement.caps[0]!;
    expect(residential.remainingM2!.value.toString()).toBe(
      residential.allowedM2!.value.minus(statement.proposedGfaM2.value).toString(),
    );
    // And the whole-plot figure still measures against the whole allowance.
    expect(statement.remainingGfaM2.value.toString()).toBe(
      statement.allowedGfaM2.value.minus(statement.proposedGfaM2.value).toString(),
    );
  });

  it('refuses a commercial allowance larger than the whole allowance, rather than clamping', () => {
    expect(() => handBuilt(['L01'], { commercialAllowanceM2: '9999' })).toThrow(
      GfaStatementRefusedError,
    );
    try {
      handBuilt(['L01'], { commercialAllowanceM2: '9999' });
    } catch (e) {
      // Both figures in the sentence: the refusal has to be actionable by
      // somebody holding the instrument.
      expect((e as Error).message).toContain('9999.00');
      // 4,778.305 at the engine's own rounding policy, which is half-even.
      expect((e as Error).message).toContain('4778.30');
    }
  });
});

/* -------------------------------------------------------------------------
 * THE ROOF, AND THE GROUND FLOOR. The two levels that are not plates.
 * ---------------------------------------------------------------------- */

describe('the roof level', () => {
  it('is named on every statement, and counted on none', () => {
    const { statement } = handBuilt(['L01', 'L02']);
    const roof = statement.omissions.find((o) => o.kind === GfaRowKind.ROOF);
    expect(roof).toBeDefined();
    expect(roof!.cap).toBe(GfaCapKind.RESIDENTIAL);
    expect(roof!.reason).toBe(ROOF_NOT_ASSESSED);
    // NOT ASSESSED, and never a zero row: a zero would say the roof is empty.
    expect(statement.rows.some((r) => r.kind === GfaRowKind.ROOF)).toBe(false);
    expect(sumOf(statement).toString()).toBe(statement.proposedGfaM2.value.toString());
  });

  it('says what stands there, that no area is stated, and whose figure the gap is', () => {
    expect(ROOF_NOT_ASSESSED).toContain('stair head');
    expect(ROOF_NOT_ASSESSED).toContain('lift motor room');
    expect(ROOF_NOT_ASSESSED).toContain('NOT ASSESSED');
    expect(ROOF_NOT_ASSESSED).toContain('92.90 m²');
  });
});

describe('the ground floor', () => {
  /*
    THE DEFECT HIS TABLE EXPOSED, REPORTED AND NOT REPAIRED.

    Band B is tower plate × levels, so a ground floor the answer places is
    counted at a full plate. His is 118.00 m² inside a 1,355 m² footprint. The
    statement says so in words and leaves the total alone, because the total is
    the capacity every other output of the run quotes.
  */
  it('reconciles a full-plate ground floor in words, and changes no figure', () => {
    const { statement } = handBuilt(['G', 'L01', 'L02']);
    expect(statement.reconciliation).toContain(
      groundFloorFullPlateNote(new Decimal('625.55')),
    );
    expect(statement.reconciliation[0]).toContain('118.00 m²');
    // The row is still the plate, and the rows still sum to the total.
    expect(statement.rows[0]!.areaM2.value.toString()).toBe('625.55');
    expect(sumOf(statement).toString()).toBe(statement.proposedGfaM2.value.toString());
  });

  it('says what a parking ground floor contributes and does not count, and bounds it', () => {
    const { statement } = handBuilt(['L01', 'L02'], {
      parkingLevelIds: ['B1', 'G'],
      groundNonParkingM2: '212.40',
    });
    expect(statement.reconciliation).toContain(groundFloorIsParkingNote(new Decimal('212.40')));
    const note = statement.reconciliation[0]!;
    expect(note).toContain('NOT ASSESSED');
    expect(note).toContain('212.40 m²');
    expect(note).toContain('118.00 m²');
    expect(statement.rows.some((r) => r.kind === GfaRowKind.GROUND)).toBe(false);
  });

  it('still says it without the bound, because the sentence is the point', () => {
    const { statement } = handBuilt(['L01'], { parkingLevelIds: ['G'] });
    expect(statement.reconciliation).toContain(groundFloorIsParkingNote(null));
    expect(statement.reconciliation[0]).not.toContain('bounds it from above');
  });

  it('reconciles podium levels counted at the tower plate', () => {
    const { statement } = handBuilt(['P1', 'P2', 'L03']);
    expect(statement.reconciliation).toContain(PODIUM_AT_TOWER_PLATE_NOTE);
    expect(PODIUM_AT_TOWER_PLATE_NOTE).toContain('50.54 m²');
  });
});

/* -------------------------------------------------------------------------
 * AND THE SAME TABLE OUT OF A REAL RUN.
 * ---------------------------------------------------------------------- */

describe('with parking excluded from FAR', () => {
  let out: RunOutput;
  beforeAll(() => {
    out = runPipeline(runInput(RECT_120x80));
  });

  it('allows FAR × plot area, derived from the FAR rule', () => {
    const s = out.gfaStatement;
    expect(s.allowedGfaM2.value.toString()).toBe(
      farOf(out).times(plotAreaOf(RECT_120x80)).toString(),
    );
    expect(s.allowedGfaM2.provenanceClass).toBe(ProvenanceClass.DERIVED);
    // DERIVED means a cited rule is reachable — and it is the rule band A cites.
    expect(ruleOf(out, s.allowedGfaM2.node)).toBeDefined();
    expect(ruleOf(out, s.allowedGfaM2.node)).toBe(
      ruleOf(out, out.capacity.regulationLimitedGfa.node),
    );
  });

  it('proposes the run’s own plate, times the run’s own whole levels', () => {
    const s = out.gfaStatement;
    const floors = s.rows.filter((r) => r.kind !== GfaRowKind.PARKING);
    // Every floor row is one plate repeated; together they are the answer.
    for (const row of floors) expect(row.perLevelM2).toBe(out.envelope.towerPlateCap);
    expect(floors.reduce((n, r) => n + r.count, 0)).toBe(out.capacity.levels.value);
    expect(sumOf(s).toString()).toBe(
      out.envelope.towerPlateCap.value.times(out.capacity.levels.value).toString(),
    );
  });

  it('labels each row with the model’s own ids, bottom to top', () => {
    /*
      The answer counts whole levels of tower plate; the model places levels on a
      height schedule where the ground floor may be parking. On this plot they
      differ — the answer counts more levels of plate than the model can stack
      under the height ceiling — and the difference is the UNPLACED row rather
      than a list of ids that names floors the row is not.
    */
    const s = out.gfaStatement;
    const placed = out.building.levels
      .filter((l) => l.placed && (l.use === 'TYPICAL' || l.use === 'PODIUM'))
      .map((l) => l.id);
    const labelled = s.rows
      .filter((r) => r.kind !== GfaRowKind.PARKING && r.kind !== GfaRowKind.UNPLACED)
      .flatMap((r) => r.levelIds);
    expect(labelled).toEqual(placed);
    const unplaced = s.rows.find((r) => r.kind === GfaRowKind.UNPLACED);
    expect((unplaced?.count ?? 0) + labelled.length).toBe(out.capacity.levels.value);
  });

  it('prints no parking row: excluded parking is not GFA, and a zero would say it is', () => {
    expect(out.gfaStatement.rows.some((r) => r.kind === GfaRowKind.PARKING)).toBe(false);
  });

  it('never proposes more than FAR allows, and says what is left', () => {
    const s = out.gfaStatement;
    expect(s.proposedGfaM2.value.lte(s.allowedGfaM2.value)).toBe(true);
    expect(s.remainingGfaM2.value.toString()).toBe(
      s.allowedGfaM2.value.minus(s.proposedGfaM2.value).toString(),
    );
  });

  it('names the part floor the governing capacity holds above the last whole floor', () => {
    const s = out.gfaStatement;
    const floors = out.envelope.towerPlateCap.value.times(out.capacity.levels.value);
    expect(s.partFloorNotPlacedM2.toString()).toBe(
      out.capacity.governingGfa.value.minus(floors).toString(),
    );
    expect(s.partFloorNotPlacedM2.lt(out.envelope.towerPlateCap.value)).toBe(true);
  });

  it('reports the ground floor this run gave to parking, rather than reporting nothing', () => {
    // The fixture's ground floor is a parking level, so the schedule counts no
    // floor area on it. That is a statement about the model, and it is made.
    const ground = out.building.levels.find((l) => l.id === 'G');
    expect(ground?.parking).not.toBeNull();
    expect(out.gfaStatement.reconciliation.some((n) => n.includes('118.00 m²'))).toBe(true);
  });

  it('names the roof it does not model, on a real run too', () => {
    expect(out.gfaStatement.omissions.map((o) => o.kind)).toContain(GfaRowKind.ROOF);
  });
});

describe('with parking counted toward FAR', () => {
  let out: RunOutput;
  beforeAll(() => {
    out = runPipeline(runInput(RECT_120x80, { parkingInFar: 'COUNTS_TOWARD_FAR' }));
  });

  it('adds the parking band A deducted, as its own row', () => {
    const parking = out.gfaStatement.rows.find((r) => r.kind === GfaRowKind.PARKING);
    expect(parking).toBeDefined();
    expect(parking!.areaM2).toBe(out.parking.requiredAreaM2);
    expect(parking!.perLevelM2).toBeNull();
    expect(parking!.levelCount).toBeNull();
    // It draws on the same allowance the floors do: band A took it out of that
    // allowance, so it is measured against what is left of the same one.
    expect(parking!.cap).toBe(GfaCapKind.RESIDENTIAL);
  });

  it('proposes residential plus parking, still within the gross allowance', () => {
    const s = out.gfaStatement;
    expect(s.proposedGfaM2.value.toString()).toBe(sumOf(s).toString());
    expect(s.proposedGfaM2.value.lte(s.allowedGfaM2.value)).toBe(true);
  });
});

describe('square feet', () => {
  it('converts at exactly 0.3048 m to the foot', () => {
    expect(toFt2(new Decimal(1)).toFixed(6)).toBe('10.763910');
    expect(toFt2(new Decimal('0.09290304')).toString()).toBe('1');
    // The typical floor on the client's own table, 625.55 m², at the exact factor.
    expect(toFt2(new Decimal('625.55')).toFixed(2)).toBe('6733.36');
  });

  it('converts every figure the table prints, so no reader converts one', () => {
    const { statement } = handBuilt(['L01', 'L02'], { commercialAllowanceM2: '60.00' });
    for (const row of statement.rows) {
      expect(row.areaFt2.toString()).toBe(toFt2(row.areaM2.value).toString());
    }
    for (const cap of statement.caps) {
      if (cap.allowedM2) expect(cap.allowedFt2!.toString()).toBe(toFt2(cap.allowedM2.value).toString());
      expect(cap.proposedM2 === null).toBe(cap.proposedFt2 === null);
    }
  });
});

describe('a small plot', () => {
  it('still states a whole table, whatever governs', () => {
    const s = runPipeline(runInput(RECT_80x40)).gfaStatement;
    expect(s.rows.length).toBeGreaterThan(0);
    expect(s.proposedGfaM2.value.gte(0)).toBe(true);
    expect(s.remainingGfaM2.value.gte(0)).toBe(true);
    expect(sumOf(s).toString()).toBe(s.proposedGfaM2.value.toString());
  });
});

/*
  A RUN WITH A STATED SCHEDULE, which is the only way a real run reaches a
  podium row at all: without one the massing's podium is one level and the
  parking fills it.

  What this plot produces today, for the record, is a podium row of one level, a
  typical row of eleven and an unplaced row of two, summing to 14 × the plate —
  the answer's own level count. Only the structure is asserted, not the counts:
  the counts are the envelope solver's and would move for a legitimate reason,
  and a test that pinned them would fail for a reason it is not about.
*/
describe('a run with a stated level schedule', () => {
  it('groups the podium apart from the typical floors, and still sums to the answer', () => {
    const out = runPipeline(
      runInput(RECT_120x80, {
        levelSchedule: {
          basements: 1,
          groundIsParking: false,
          podiumAboveGround: 2,
          podiumParkingLevels: 2,
        },
      }),
    );
    const s = out.gfaStatement;
    const kinds = s.rows.map((r) => r.kind);
    expect(kinds).toContain(GfaRowKind.PODIUM);
    expect(kinds).toContain(GfaRowKind.TYPICAL);
    expect(sumOf(s).toString()).toBe(
      out.envelope.towerPlateCap.value.times(out.capacity.levels.value).toString(),
    );
    /*
      And the podium row is reconciled, because a podium level is DRAWN at the
      podium footprint and COUNTED at the tower plate. On this plot the two
      differ, and his own scheme counts neither — 50.54 m² of lift lobby on each
      of his two podium levels. The sentence is the only place that is said.
    */
    expect(s.reconciliation).toContain(PODIUM_AT_TOWER_PLATE_NOTE);
  });
});
