/**
 * THE PLOT'S OWN INSTRUMENT, AS RULES THE ENGINE CAN BE BOUND BY.
 *
 * ---------------------------------------------------------------------------
 * THE DEFECT THIS CLOSES.
 *
 * The affection plan's limits were read at intake and then dropped. A run of the
 * Warsan plot used the draft seed rule's FAR of 5.00 while the sheet in the same
 * session printed 3.5 and a GFA of 4,778.31 m². On that plot the parking band
 * governs, so the published answer was unaffected — which is exactly what made it
 * survive: on a plot where the regulatory band governs, the engine would have
 * reported a capacity **larger than the sheet permits**, with a full derivation
 * under it, and nothing in the product would have said so.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A `RuleRecord` AND A DEVELOPER STANDARD IS NOT.
 *
 * `DeveloperStandard` is deliberately not a `RuleRecord`, because a client's 340 ft²
 * studio cap is a commercial preference and a plot whose envelope was cut by one
 * would be reporting a brief as a legal limit. An affection plan is the opposite
 * case: it is the instrument that applies the general framework to *this* parcel,
 * which is precisely what §11.5 step 1 gives precedence to. The seed FAR rule says
 * so itself — "the real rule is plot-specific and will win overlap resolution under
 * §11.5". This module is that sentence, built.
 *
 * So the jurisdiction is `PLOT:<plot number>`, `isPlotSpecific` returns true, and
 * `resolveParameter` hands it the parameter and records the seed rule as
 * `superseded` — visible, named, and beaten, rather than absent.
 *
 * ---------------------------------------------------------------------------
 * THESE RECORDS ARE NEVER ADDED TO A `RuleStore`, AND THAT IS NOT AN OVERSIGHT.
 *
 * A `RuleStore` holds the rule *library*: records that are authored, versioned,
 * approved by a named architect and counted on the readiness page. An affection
 * plan is none of those things. It is one document about one parcel, and it is
 * built per run and handed to the resolver directly.
 *
 * Which is also why `approvedBy` reads `NOT-A-REVIEWED-ENCODING`. The instrument
 * is issued and stamped; our *transcription* of it has been reviewed by nobody, and
 * a string that could be mistaken for a human sign-off on this record would be the
 * same lie `DEVELOPMENT-ONLY-NOT-A-REAL-APPROVER` was written to refuse.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT REFUSES TO BIND, AND WHY THAT IS RETURNED RATHER THAN DROPPED.
 *
 * `notBound` is half the return value. Every limit the sheet states and this module
 * will not convert comes back with the reason, because a builder that silently
 * emitted four rules from a sheet that states six would be understating the
 * instrument while looking complete. The refusals:
 *
 * - **A `CONDITIONAL` setback stays unbound.** "0 m to solid wall and 4.0 m to
 *   window wall" is a design decision, not a datum; picking one would choose the
 *   applicant's façade for them.
 * - **A height in levels is not a height in metres** — so it binds
 *   `levels.max_above_ground`, a count, and is never converted into `height.max`.
 *   It used to bind nothing at all, which is how `G+4` reported thirteen levels;
 *   see the height block below.
 * - **A stated GFA beside a stated FAR binds nothing more**, because there is no
 *   `gfa.max` parameter: the FAR binds and the GFA is a cross-check against it.
 *   A GFA printed with NO FAR (every DDA sheet) binds `far.max` as the sheet's own
 *   GFA ÷ its own printed plot area — see the FAR block below.
 * - **A face the sheet names and the plot cannot tell apart is a question, not a
 *   number.** "Front = 0m, Sides & Rear = 3m" on a plot with two roads does not
 *   say which road is the front; a sheet stating a side and a rear figure does not
 *   say which neighbour is the rear. Those come back as a DECISION rule (see
 *   {@link TOWER_FACE_OPTIONS}) that the envelope refuses to compute past until the
 *   reader says which face the boundary is.
 *
 * ---------------------------------------------------------------------------
 * TWO SCHEDULES, TWO SETS OF PARAMETERS (17 Oct 2026).
 *
 * A Trakhees sheet prints "GF & Podium: 0m from all sides | Tower: Front = 0m,
 * Sides & Rear = 3m" and "GF & Podium: 100% | Tower: Maximum 60%". This module
 * used to bind the PODIUM row into `setback.road` / `setback.adjacent_plot` —
 * the parameters the envelope cuts the TOWER line with — and drop the tower row
 * into `notBound`. On Warsan (6211383) the tower then stood on all four
 * boundaries at 100% of the plot, three levels were proposed where Eng. Mohamed
 * draws seven, and a reader who typed the sheet's own 3 m was refused because
 * "the affection plan states 0 m" — the podium's figure, quoted as the tower's.
 *
 * Under his statement of 16 Oct 2026 (`STMT-PODIUM-SETBACK-2026-10-16`) the
 * setback parameters ARE the tower's, so the tower row now binds them, and the
 * podium row binds `setback.podium.<class>` ({@link podiumSetbackParameter}),
 * which only the podium line reads. Tower coverage binds `tower_coverage.max`, a
 * percentage of the plot like `coverage.max`, and is never converted into metres
 * or into a fixed area here: the envelope multiplies it by the plot area it
 * measured, and says so in the formula.
 *
 * ---------------------------------------------------------------------------
 * THE SHEET'S OWN EXPIRY IS NOT MODELLED. An affection plan is valid for a period
 * and these records carry `validTo: null`, which says "no end recorded", not "never
 * expires". Encoding two years here would be encoding a policy this module cannot
 * cite. The note on every record says so, and it travels into the provenance tree
 * where a reader meets it next to the number it produced.
 */

import { Decimal, type StatedLimits, type SetbackValue } from '@envelope/core';

import {
  ApprovalStatus,
  EvaluatorName,
  Mechanization,
  Operator,
  RuleClass,
  type RuleRecord,
  type Term,
} from '../record.js';

/**
 * The `approvedBy` every instrument record carries.
 *
 * Read by the readiness page's `approvedByAHuman`, which must reject it: these
 * records are not part of the rule library and may never be counted as a rule a
 * qualified human approved.
 */
export const INSTRUMENT_APPROVER = 'NOT-A-REVIEWED-ENCODING-OF-AN-ISSUED-INSTRUMENT';

/** What this instrument is, and which plot it was issued for. */
export interface InstrumentBinding {
  /**
   * The plot, as the engine names it (`Plot.plotNumber`).
   *
   * It is in the jurisdiction AND in every rule's applicability. The jurisdiction
   * is what wins resolution; the applicability is what stops the win happening on
   * the wrong plot. A rule built from one parcel's sheet that matched `always`
   * would govern any plot it was handed to, which on a product whose entire claim
   * is traceability is the worst available failure.
   */
  readonly plotNumber: string;
  /** Short id for the instrument, used to build rule ids. */
  readonly instrumentId: string;
  /** The sheet's issue date. `validFrom` and `recordedAt`. */
  readonly issuedOn: string;
  /** Who ran the transcription. A name, never a system default. */
  readonly authoredBy: string;
  /**
   * How many of the plot's boundaries are classified ROAD, where the caller knows.
   *
   * It decides nothing about which rules are emitted — the rules carry
   * `plot.frontage_count` in their own applicability, so they are right whichever
   * plot they meet. It only decides whether "which road is the front?" is said in
   * `notBound`: on a plot with one road there is no question to report, and
   * reporting one anyway would teach a reader to ignore the list.
   */
  readonly roadBoundaries?: number;
}

/**
 * The options a DECISION rule offers: one per face the sheet names, with the
 * figure it states for that face (`null` where it names the face and states no
 * figure). Carried in `evaluatorArgs[TOWER_FACE_OPTIONS]` beside the enum the
 * evaluator returns, so the sentence that asks the reader can name the faces.
 */
export interface FaceOption {
  /** The face as the sheet names it: "front", "sides and rear", "rear". */
  readonly face: string;
  /** Metres as a decimal string, or null where the sheet states no figure. */
  readonly metres: string | null;
}

/** The `evaluatorArgs` key a decision rule keeps its {@link FaceOption}s under. */
export const TOWER_FACE_OPTIONS = 'faceOptions';

/** The parameter the PODIUM's setback on a boundary of this class is bound under. */
export function podiumSetbackParameter(edgeClass: string): string {
  return `setback.podium.${edgeClass.toLowerCase()}`;
}

/** The face options a decision rule carries, or undefined for any other rule. */
export function faceOptionsOf(rule: RuleRecord): readonly FaceOption[] | undefined {
  const v = rule.evaluatorArgs[TOWER_FACE_OPTIONS];
  return Array.isArray(v) ? (v as readonly FaceOption[]) : undefined;
}

/**
 * What a decision rule is waiting on.
 *
 * - `FACE`: which face of the plot this boundary is — front, side or rear. A fact
 *   about the plot the reader knows and the sheet does not print.
 * - `FACADE`: what the façade on this boundary will be — "0m to solid wall and
 *   4.0m to window wall". A design decision.
 */
export const DecisionKind = {
  FACE: 'FACE',
  FACADE: 'FACADE',
} as const;
export type DecisionKind = (typeof DecisionKind)[keyof typeof DecisionKind];

/** The `evaluatorArgs` key a decision rule keeps its {@link DecisionKind} under. */
export const DECISION_KIND = 'decisionKind';

/** The decision a rule is waiting on, or undefined for a rule that states a number. */
export function decisionKindOf(rule: RuleRecord): DecisionKind | undefined {
  const v = rule.evaluatorArgs[DECISION_KIND];
  return v === DecisionKind.FACE || v === DecisionKind.FACADE ? v : undefined;
}

/** The reasons `notBound` gives for a tower face the plot cannot name. Read by `report/words`. */
export const TOWER_FRONT_REASON =
  'The sheet states the tower setback by face, and a plot with more than one road boundary ' +
  'does not say which road is the front. The run asks for the face of each road boundary ' +
  'rather than choosing one.';
export const TOWER_SIDE_REAR_REASON =
  'The sheet states a different tower setback for the side and for the rear, and which ' +
  'neighbour is the rear is not on the sheet. The run asks for the face of each neighbouring ' +
  'boundary rather than applying either figure to both.';
export const PODIUM_SIDE_REAR_REASON =
  'The sheet states a different podium setback for the side and for the rear, and which ' +
  'neighbour is the rear is not on the sheet. Applying either figure to both would choose for ' +
  'the reader.';

/** One face's offer: its figure, each condition's figure, or a face the sheet names with none. */
function faceOptionsFor(face: string, v: SetbackValue | undefined): readonly FaceOption[] {
  if (v === undefined) return [{ face, metres: null }];
  if (v.kind === 'FIXED') return [{ face, metres: v.metres.toString() }];
  return v.options.map((o) => ({ face: `${face} ${o.condition}`, metres: o.metres.toString() }));
}

/**
 * The sheet's citation, narrowed to one of the lines it read.
 *
 * Intake locates the setback (or coverage) panel once and quotes its first line,
 * which on a Trakhees sheet is the podium's. A rule built from the TOWER line
 * quoting the podium line would cite the wrong sentence beside the right number.
 * So the verbatim text is the line this rule was built from, as intake joined it
 * into `raw`; the page and box stay the panel's, which holds both lines. Where the
 * line cannot be found in `raw` the citation is returned unchanged.
 */
function partCitation(
  citation: RuleRecord['citation'],
  raw: string,
  line: RegExp,
  label: string,
): RuleRecord['citation'] {
  const part = raw
    .split(' | ')
    .map((s) => s.trim())
    .find((s) => line.test(s));
  if (part === undefined) return citation;
  return { ...citation, clauseReference: `${citation.clauseReference} (${label})`, sourceTextVerbatim: part };
}

/** A limit the sheet states that this module would not convert into a rule. */
export interface UnboundLimit {
  readonly field: string;
  readonly stated: string;
  readonly reason: string;
}

export interface InstrumentRules {
  readonly rules: readonly RuleRecord[];
  /** Stated limits that bind nothing, each with the reason. Never empty silently. */
  readonly notBound: readonly UnboundLimit[];
}

const EXPIRY_NOTE =
  'Read from the plot’s own affection plan and applied under §11.5 step 1, which gives a ' +
  'plot-specific instrument precedence over a general rule. The sheet’s own period of ' +
  'validity is NOT modelled: validTo is null because none was encoded, not because none ' +
  'exists. Check the issue date on the sheet.';

export function isFixed(
  v: SetbackValue | undefined,
): v is { readonly kind: 'FIXED'; readonly metres: Decimal } {
  return v !== undefined && v.kind === 'FIXED';
}

/**
 * Build the rules one instrument implies for one plot.
 *
 * Total, and never throws on a limit it cannot use: an unconvertible field comes
 * back in `notBound`. An absent field produces neither a rule nor an entry —
 * a sheet that does not print a FAR has no opinion about FAR, which is different
 * from stating one this module declined to encode.
 */
export function rulesFromInstrument(
  limits: StatedLimits,
  binding: InstrumentBinding,
): InstrumentRules {
  const rules: RuleRecord[] = [];
  const notBound: UnboundLimit[] = [];

  const jurisdiction = `PLOT:${binding.plotNumber}`;
  /** Every rule is fenced to its own plot. See `InstrumentBinding.plotNumber`. */
  const thisPlot = { 'plot.plot_number': { eq: binding.plotNumber } } as const;
  const otherPlot = { plot: { plot_number: `${binding.plotNumber} (a different plot)` } };

  const record = (
    r: Pick<
      RuleRecord,
      'ruleId' | 'parameterId' | 'operator' | 'evaluator' | 'evaluatorArgs' | 'unit' | 'citation'
    > & {
      readonly applicability: RuleRecord['applicability'];
      readonly tests: RuleRecord['tests'];
    },
  ): RuleRecord => ({
    ...r,
    ruleClass: RuleClass.GENERATIVE,
    jurisdiction,
    isLifeSafety: false,
    /*
      MECHANIZED is the honest word here and it is worth being exact about what it
      claims. It says the CONVERSION from the stated limit to a bound parameter is
      mechanical — a number in a box becomes a ceiling on one parameter, with no
      judgement in between. It says nothing about whether the parser read the right
      box, which is what the extraction review screen is for.
    */
    mechanization: Mechanization.MECHANIZED,
    validFrom: binding.issuedOn,
    validTo: null,
    recordedAt: binding.issuedOn,
    version: 1,
    supersedes: null,
    status: ApprovalStatus.APPROVED,
    authoredBy: binding.authoredBy,
    approvedBy: INSTRUMENT_APPROVER,
    approvedAt: binding.issuedOn,
    note: EXPIRY_NOTE,
  });

  /*
    A SHEET THAT PRINTS A MAXIMUM GFA AND NO FAR STILL STATES ITS RATIO.

    Every DDA sheet does this: `MAX. GFA 2,288.08 m²` beside `PLOT AREA 1,040.04 m²`
    and no ratio. The ratio is then the sheet's own two figures divided — not a
    figure borrowed from a neighbour, not a default, and nothing a reader could
    argue with that they could not argue with on the sheet itself. Refusing it
    (as this module once did) blocked every DDA plot over arithmetic Eng. Mohamed
    does in his head, and the refusal protected nothing: the printed GFA IS the
    limit, and a FAR is only the form the engine carries it in.

    Rounded DOWN at six places, so the ratio times the printed area never exceeds
    the printed GFA. The citation is the GFA's box, and the clause says in words
    that the ratio was divided out of two printed figures, so the provenance tree
    shows a reader the arithmetic rather than a FAR the sheet never printed.
  */
  const farFromGfa =
    !limits.far && limits.gfaM2 && limits.plotAreaM2 && limits.plotAreaM2.value.gt(0)
      ? {
          value: limits.gfaM2.value
            .div(limits.plotAreaM2.value)
            .toDecimalPlaces(6, Decimal.ROUND_DOWN),
          citation: {
            ...limits.gfaM2.citation,
            clauseReference:
              `${limits.gfaM2.citation.clauseReference} ÷ ${limits.plotAreaM2.citation.clauseReference}`,
            sourceTextVerbatim:
              `FAR not printed; taken from the sheet's own figures: max GFA ` +
              `${limits.gfaM2.value.toString()} m² ÷ plot area ` +
              `${limits.plotAreaM2.value.toString()} m² (rounded down at 6 places). ` +
              `GFA as printed: "${limits.gfaM2.citation.sourceTextVerbatim}"`,
          },
        }
      : undefined;
  const farStated = limits.far ?? farFromGfa;

  // --- FAR -----------------------------------------------------------------
  if (farStated) {
    const value = farStated.value;
    rules.push(
      record({
        ruleId: `INSTRUMENT.${binding.instrumentId}.far.max`,
        parameterId: 'far.max',
        operator: Operator.MAX,
        evaluator: EvaluatorName.SCALAR_MAX,
        evaluatorArgs: { value: value.toString() },
        unit: 'ratio',
        applicability: { all: [thisPlot] },
        citation: farStated.citation,
        tests: [
          {
            kind: 'POSITIVE',
            context: { plot: { plot_number: binding.plotNumber } },
            expected: value.toNumber(),
          },
          {
            kind: 'BOUNDARY',
            context: { plot: { plot_number: binding.plotNumber, area_m2: 1 } },
            expected: value.toNumber(),
            note: 'A stated FAR is plot-area independent, as the seed rule is.',
          },
          { kind: 'NEGATIVE', context: otherPlot, expected: 'NOT_APPLICABLE' },
        ],
      }),
    );
  }

  if (limits.gfaM2 && !farFromGfa) {
    notBound.push({
      field: 'gfaSqm',
      stated: `${limits.gfaM2.value.toString()} m²`,
      reason: limits.far
        ? 'The sheet prints a FAR, which binds; its GFA is checked against FAR × plot area ' +
          'instead of being a second ceiling.'
        : 'The sheet prints a GFA and no plot area to divide it by, so no ratio could be ' +
          'taken from it. Enter the FAR under a named user.',
    });
  }

  // --- Coverage ------------------------------------------------------------
  if (limits.coverage) {
    const { podium, tower } = limits.coverage.value;
    if (podium) {
      /* The sheet writes coverage as a fraction of plot area ("100% of plot area"
         → 1.00); `coverage.max` is declared in per cent, as the seed rule is. This
         is the same quantity in the unit the parameter is declared in, which is why
         it is done here and the FAR, which needs no conversion, is not touched. */
      const pct = podium.times(100);
      rules.push(
        record({
          ruleId: `INSTRUMENT.${binding.instrumentId}.coverage.max`,
          parameterId: 'coverage.max',
          operator: Operator.MAX,
          evaluator: EvaluatorName.SCALAR_MAX,
          evaluatorArgs: { value: pct.toString() },
          unit: '%',
          applicability: { all: [thisPlot] },
          citation: limits.coverage.citation,
          tests: [
            {
              kind: 'POSITIVE',
              context: { plot: { plot_number: binding.plotNumber } },
              expected: pct.toNumber(),
            },
            {
              kind: 'BOUNDARY',
              context: { plot: { plot_number: binding.plotNumber }, levels: { above_ground: 1 } },
              expected: pct.toNumber(),
              note: 'The sheet states one coverage, not a tier by level count.',
            },
            { kind: 'NEGATIVE', context: otherPlot, expected: 'NOT_APPLICABLE' },
          ],
        }),
      );
    }
    if (tower) {
      /*
        THE TOWER'S OWN COVERAGE, AS A PERCENTAGE OF THE PLOT. It used to go to
        `notBound` on the argument that `tower_plate.max` is an area — true, and
        beside the point: the sheet does not state an area, it states a share,
        and a share has a parameter of its own. Converting 60% into m² here would
        need a plot area, and the printed one and the measured one differ (1,365.23
        against the boundary's own figure on Warsan); the envelope multiplies by
        the area every other coverage in the run is measured against, and the
        formula says which.
      */
      const pct = tower.times(100);
      rules.push(
        record({
          ruleId: `INSTRUMENT.${binding.instrumentId}.tower_coverage.max`,
          parameterId: 'tower_coverage.max',
          operator: Operator.MAX,
          evaluator: EvaluatorName.SCALAR_MAX,
          evaluatorArgs: { value: pct.toString() },
          unit: '%',
          applicability: { all: [thisPlot] },
          citation: partCitation(limits.coverage.citation, limits.coverage.value.raw, /^\s*Tower\b/i, 'tower'),
          tests: [
            {
              kind: 'POSITIVE',
              context: { plot: { plot_number: binding.plotNumber } },
              expected: pct.toNumber(),
            },
            {
              kind: 'BOUNDARY',
              context: { plot: { plot_number: binding.plotNumber }, levels: { above_ground: 1 } },
              expected: pct.toNumber(),
              note: 'The sheet states one tower coverage, not a tier by level count.',
            },
            { kind: 'NEGATIVE', context: otherPlot, expected: 'NOT_APPLICABLE' },
          ],
        }),
      );
    }
  }

  // --- Setbacks ------------------------------------------------------------
  if (limits.setbacks) {
    const { podium, tower, raw } = limits.setbacks.value;
    const towerCitation = partCitation(limits.setbacks.citation, raw, /^\s*Tower\b/i, 'tower');
    const podiumCitation = partCitation(limits.setbacks.citation, raw, /^\s*G\.?\s*F\b/i, 'GF & podium');

    /** A plot context a rule's own test can be evaluated in. */
    const testPlot = (frontages: number | undefined): Record<string, unknown> =>
      frontages === undefined
        ? { plot_number: binding.plotNumber }
        : { plot_number: binding.plotNumber, frontage_count: frontages };

    const setbackRule = (
      parameterId: string,
      suffix: string,
      metres: Decimal,
      edgeClass: string,
      citation: RuleRecord['citation'],
      onlyWhen: readonly Term[] = [],
      frontages?: number,
    ): RuleRecord =>
      record({
        ruleId: `INSTRUMENT.${binding.instrumentId}.${suffix}`,
        parameterId,
        operator: Operator.MIN,
        /* The same evaluator the seed rule for this parameter uses. Without a
           `table` argument it returns the scalar it is given, so the two candidates
           are the same value kind — which keeps `byPartialOrder` able to order them
           if a future rule set ever reaches it. */
        evaluator: EvaluatorName.POLYGON_OFFSET_INWARD,
        evaluatorArgs: { value: metres.toString() },
        unit: 'm',
        applicability: { all: [thisPlot, { 'edge.classification': { eq: edgeClass } }, ...onlyWhen] },
        citation,
        tests: [
          {
            kind: 'POSITIVE',
            context: { plot: testPlot(frontages), edge: { classification: edgeClass } },
            expected: metres.toNumber(),
          },
          {
            kind: 'BOUNDARY',
            context: {
              plot: testPlot(frontages),
              edge: { classification: edgeClass },
              levels: { above_ground: 12 },
            },
            expected: metres.toNumber(),
            note: 'The sheet states one distance, not the seed table’s tier by level count.',
          },
          {
            kind: 'NEGATIVE',
            context: { plot: testPlot(frontages), edge: { classification: 'OPEN_SPACE' } },
            expected: 'NOT_APPLICABLE',
          },
        ],
      });

    /*
      A DECISION RULE: the sheet states a figure for each of several faces, and
      nothing on the sheet or in the plot says which face this boundary is. It
      evaluates to the set of figures the sheet allows, and the envelope refuses
      to compute past it until the reader names the face (a tower boundary) or —
      for the podium's façade, under the podium statement — assumes the
      solid-wall answer in amber with its alternative measured.
    */
    const decisionRule = (
      parameterId: string,
      suffix: string,
      options: readonly FaceOption[],
      edgeClass: string,
      citation: RuleRecord['citation'],
      kind: DecisionKind,
      onlyWhen: readonly Term[] = [],
      frontages?: number,
    ): RuleRecord => {
      const permitted = [...new Set(options.flatMap((o) => (o.metres === null ? [] : [o.metres])))];
      return record({
        ruleId: `INSTRUMENT.${binding.instrumentId}.${suffix}`,
        parameterId,
        operator: Operator.ENUM,
        evaluator: EvaluatorName.ENUM_PERMITTED_SET,
        evaluatorArgs: { permitted, [TOWER_FACE_OPTIONS]: options, [DECISION_KIND]: kind },
        unit: 'm',
        applicability: { all: [thisPlot, { 'edge.classification': { eq: edgeClass } }, ...onlyWhen] },
        citation,
        tests: [
          {
            kind: 'POSITIVE',
            context: { plot: testPlot(frontages), edge: { classification: edgeClass } },
            expected: permitted,
          },
          {
            kind: 'BOUNDARY',
            context: {
              plot: testPlot(frontages),
              edge: { classification: edgeClass },
              levels: { above_ground: 12 },
            },
            expected: permitted,
            note: 'Which face a boundary is does not change with the level count.',
          },
          {
            kind: 'NEGATIVE',
            context: { plot: testPlot(frontages), edge: { classification: 'OPEN_SPACE' } },
            expected: 'NOT_APPLICABLE',
          },
        ],
      });
    };

    // --- The TOWER row: `setback.road` and `setback.adjacent_plot` ---------
    /*
      SIDE AND REAR SHARE ONE BOUNDARY CLASS, SO THEY MUST AGREE TO BIND IT AS A
      NUMBER. Every neighbour is ADJACENT_PLOT. A sheet that states a different
      distance for the side and for the rear needs to know which neighbour is the
      rear — "opposite the front" on a rectangle, and nothing at all on an
      irregular plot — so it is a decision per boundary, never the larger figure
      applied to both (which is what two scalar rules would have produced, through
      `byPartialOrder`, silently).
    */
    const tSide = tower.side;
    const tRear = tower.rear;
    if (isFixed(tSide) && isFixed(tRear) && !tSide.metres.eq(tRear.metres)) {
      rules.push(
        decisionRule(
          'setback.adjacent_plot',
          'tower.setback.adjacent_plot.which_face',
          [
            { face: 'side', metres: tSide.metres.toString() },
            { face: 'rear', metres: tRear.metres.toString() },
          ],
          'ADJACENT_PLOT',
          towerCitation,
          DecisionKind.FACE,
        ),
      );
      notBound.push({
        field: 'setbacks.tower.side_and_rear',
        stated: `side ${tSide.metres.toString()} m, rear ${tRear.metres.toString()} m`,
        reason: TOWER_SIDE_REAR_REASON,
      });
    } else {
      const shared = isFixed(tSide) ? tSide : isFixed(tRear) ? tRear : undefined;
      if (shared) {
        rules.push(
          setbackRule(
            'setback.adjacent_plot',
            'tower.setback.adjacent_plot',
            shared.metres,
            'ADJACENT_PLOT',
            towerCitation,
          ),
        );
      }
      for (const [name, v] of [
        ['setbacks.tower.side', tSide],
        ['setbacks.tower.rear', tRear],
      ] as const) {
        if (v && v.kind === 'CONDITIONAL') notBound.push(conditional(name, v, raw));
      }
    }

    /*
      THE FRONT IS THE ROAD — WHEN THERE IS ONE ROAD. On a plot with two road
      boundaries the sheet's "Front" names one of them and says nothing about
      which; the other is a side (a corner plot) or a rear (a plot between two
      streets). Where every face the sheet states carries the same figure the
      question does not matter and the figure binds every road. Otherwise the
      front figure binds only on a plot with exactly one road
      (`plot.frontage_count`, read from the plot the rule meets), and every road
      of any other plot gets the decision — the reader says which face it is.
    */
    const tFront = tower.front;
    if (isFixed(tFront)) {
      const options = [
        { face: 'front', metres: tFront.metres.toString() },
        ...faceOptionsFor('side', tSide),
        ...faceOptionsFor('rear', tRear),
      ];
      const unambiguous = options.every((o) => o.metres !== null && tFront.metres.eq(o.metres));
      if (unambiguous) {
        rules.push(setbackRule('setback.road', 'tower.setback.road', tFront.metres, 'ROAD', towerCitation));
      } else {
        rules.push(
          setbackRule(
            'setback.road',
            'tower.setback.road',
            tFront.metres,
            'ROAD',
            towerCitation,
            [{ 'plot.frontage_count': { eq: 1 } }],
            1,
          ),
        );
        rules.push(
          decisionRule(
            'setback.road',
            'tower.setback.road.which_face',
            options,
            'ROAD',
            towerCitation,
            DecisionKind.FACE,
            [{ 'plot.frontage_count': { ne: 1 } }],
            2,
          ),
        );
        if (binding.roadBoundaries === undefined || binding.roadBoundaries > 1) {
          notBound.push({
            field: 'setbacks.tower.front',
            stated: towerCitation.sourceTextVerbatim,
            reason: TOWER_FRONT_REASON,
          });
        }
      }
    } else if (tFront) {
      notBound.push(conditional('setbacks.tower.front', tFront, raw));
    }

    // --- The PODIUM row: `setback.podium.<class>`, read by the podium line only ---
    /*
      A conditional podium setback ("0m to solid wall and 4.0m to window wall")
      is a façade decision. It is bound as a decision AND reported in `notBound`:
      the envelope, under the podium statement, assumes the solid-wall answer in
      amber and measures the window-wall one, and the reader still sees that the
      sheet did not give one number.
    */
    const pFront = podium.front;
    if (isFixed(pFront)) {
      rules.push(
        setbackRule(podiumSetbackParameter('ROAD'), 'podium.setback.road', pFront.metres, 'ROAD', podiumCitation),
      );
    } else if (pFront) {
      rules.push(
        decisionRule(
          podiumSetbackParameter('ROAD'),
          'podium.setback.road.which_facade',
          faceOptionsFor('front', pFront),
          'ROAD',
          podiumCitation,
          DecisionKind.FACADE,
        ),
      );
      notBound.push(conditional('setbacks.front', pFront, raw));
    }

    const side = podium.side;
    const rear = podium.rear;
    if (isFixed(side) && isFixed(rear) && !side.metres.eq(rear.metres)) {
      rules.push(
        decisionRule(
          podiumSetbackParameter('ADJACENT_PLOT'),
          'podium.setback.adjacent_plot.which_face',
          [
            { face: 'side', metres: side.metres.toString() },
            { face: 'rear', metres: rear.metres.toString() },
          ],
          'ADJACENT_PLOT',
          podiumCitation,
          DecisionKind.FACE,
        ),
      );
      notBound.push({
        field: 'setbacks.side_and_rear',
        stated: `side ${side.metres.toString()} m, rear ${rear.metres.toString()} m`,
        reason: PODIUM_SIDE_REAR_REASON,
      });
    } else {
      const shared = isFixed(side) ? side : isFixed(rear) ? rear : undefined;
      if (shared) {
        rules.push(
          setbackRule(
            podiumSetbackParameter('ADJACENT_PLOT'),
            'podium.setback.adjacent_plot',
            shared.metres,
            'ADJACENT_PLOT',
            podiumCitation,
          ),
        );
      } else {
        const conditionalFace = [side, rear].find((v) => v?.kind === 'CONDITIONAL');
        if (conditionalFace) {
          rules.push(
            decisionRule(
              podiumSetbackParameter('ADJACENT_PLOT'),
              'podium.setback.adjacent_plot.which_facade',
              faceOptionsFor('side', conditionalFace),
              'ADJACENT_PLOT',
              podiumCitation,
              DecisionKind.FACADE,
            ),
          );
        }
      }
      for (const [name, v] of [
        ['setbacks.side', side],
        ['setbacks.rear', rear],
      ] as const) {
        if (v && v.kind === 'CONDITIONAL') notBound.push(conditional(name, v, raw));
      }
    }
  }

  // --- Height --------------------------------------------------------------
  /*
    THE LEVEL COUNT BINDS AS A LEVEL COUNT. This block used to send `G+N` to
    `notBound`, on the true argument that `height.max` is metres and converting a
    count to metres needs a floor-to-floor nobody stated. The conclusion did not
    follow from it. With the sheet's count unbound, the solver's only ceiling was
    the generic placeholder `R-HEIGHT-MAX-RES` (45 m ÷ 3.2 m = 14), and a plot whose
    plan prints `G+4` reported thirteen levels — on the screen the product is sold
    on, wrong by a factor of three (meeting 03, 41:11).

    So the count binds a parameter that IS a count, `levels.max_above_ground`, and
    nothing is converted: no metres are manufactured, and the envelope takes the
    lower of the two ceilings and says which one governed. `totalLevels` is
    `1 + podium + typical` — the ground floor is a level above grade, and
    `podiumFootprintLevels` in `@envelope/core` counts it the same way.
  */
  if (limits.height) {
    const h = limits.height.value;
    rules.push(
      record({
        ruleId: `INSTRUMENT.${binding.instrumentId}.levels.max_above_ground`,
        parameterId: 'levels.max_above_ground',
        operator: Operator.MAX,
        evaluator: EvaluatorName.SCALAR_MAX,
        evaluatorArgs: { value: String(h.totalLevels) },
        unit: 'levels',
        applicability: { all: [thisPlot] },
        citation: limits.height.citation,
        tests: [
          {
            kind: 'POSITIVE',
            context: { plot: { plot_number: binding.plotNumber } },
            expected: h.totalLevels,
          },
          {
            kind: 'BOUNDARY',
            context: { plot: { plot_number: binding.plotNumber }, levels: { above_ground: 1 } },
            expected: h.totalLevels,
            note: `${h.raw} is one allowance, not a tier by level count.`,
          },
          { kind: 'NEGATIVE', context: otherPlot, expected: 'NOT_APPLICABLE' },
        ],
      }),
    );
  }

  return { rules, notBound };
}

function conditional(field: string, v: SetbackValue, raw: string): UnboundLimit {
  const options =
    v.kind === 'CONDITIONAL'
      ? v.options.map((o) => `${o.metres.toString()} m ${o.condition}`).join('; ')
      : raw;
  return {
    field,
    stated: options,
    reason:
      'The sheet makes this setback depend on the façade, which is a design decision and ' +
      'not a datum. Collapsing it to one distance would choose the applicant’s façade for ' +
      'them, so it stays a decision and binds nothing until it is made.',
  };
}
