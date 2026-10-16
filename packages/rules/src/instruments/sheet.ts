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
 * - **Tower coverage binds nothing.** `coverage.max` governs the podium footprint;
 *   the tower is capped by `tower_plate.max`, which is an area in m² and not a
 *   percentage, so the two are not interchangeable.
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
      notBound.push({
        field: 'coverage.tower',
        stated: `${tower.times(100).toString()}% of plot area`,
        reason:
          'coverage.max governs the podium footprint. The tower is capped by ' +
          'tower_plate.max, which is an area in m² and not a percentage of the plot.',
      });
    }
  }

  // --- Setbacks ------------------------------------------------------------
  if (limits.setbacks) {
    const { podium, tower, raw } = limits.setbacks.value;

    /*
      THE TOWER SCHEDULE BINDS NOTHING, AND SAYING SO IS NOT OPTIONAL.

      A real sheet states both: the Warsan plan prints "GF & Podium: 0m from all
      sides | Tower: Front = 0m, Sides & Rear = 3m". The engine has ONE
      `setback.road` and ONE `setback.adjacent_plot`, which together cut the
      footprint the podium occupies; the tower above it is governed by
      `tower_plate.max`, an area. So the podium row binds and the tower row
      cannot — and a builder that read the podium and stayed quiet about the
      tower would be dropping half of what the document says while returning a
      complete-looking answer. That was the shape of the defect this whole module
      exists to close, and repeating it one level down would be worse, not better.
    */
    const towerStates = [tower.front, tower.side, tower.rear].filter((v) => v !== undefined);
    if (towerStates.length > 0) {
      notBound.push({
        field: 'setbacks.tower',
        stated: raw,
        reason:
          'setback.road and setback.adjacent_plot cut the podium footprint, and the engine ' +
          'holds one of each. The tower’s own setbacks are a second schedule this phase ' +
          'does not model; the tower is capped by tower_plate.max, which is an area.',
      });
    }

    const setbackRule = (
      parameterId: string,
      suffix: string,
      metres: Decimal,
      edgeClass: string,
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
        applicability: { all: [thisPlot, { 'edge.classification': { eq: edgeClass } }] },
        citation: limits.setbacks!.citation,
        tests: [
          {
            kind: 'POSITIVE',
            context: {
              plot: { plot_number: binding.plotNumber },
              edge: { classification: edgeClass },
            },
            expected: metres.toNumber(),
          },
          {
            kind: 'BOUNDARY',
            context: {
              plot: { plot_number: binding.plotNumber },
              edge: { classification: edgeClass },
              levels: { above_ground: 12 },
            },
            expected: metres.toNumber(),
            note: 'The sheet states one distance, not the seed table’s tier by level count.',
          },
          {
            kind: 'NEGATIVE',
            context: {
              plot: { plot_number: binding.plotNumber },
              edge: { classification: 'OPEN_SPACE' },
            },
            expected: 'NOT_APPLICABLE',
          },
        ],
      });

    if (isFixed(podium.front)) {
      rules.push(setbackRule('setback.road', 'setback.road', podium.front.metres, 'ROAD'));
    } else if (podium.front) {
      notBound.push(conditional('setbacks.front', podium.front, raw));
    }

    /*
      SIDE AND REAR SHARE ONE PARAMETER, SO THEY MUST AGREE TO BIND IT.
      `setback.adjacent_plot` is a single parameter over every non-road boundary.
      A sheet that states a different distance for the side and for the rear is
      stating something this parameter cannot express, and emitting two rules for
      it would put two plot-specific candidates in front of `resolveParameter` —
      which would then fall through to `byPartialOrder` and pick the larger as
      "most restrictive", silently applying the rear setback to the side.
    */
    const side = podium.side;
    const rear = podium.rear;
    if (isFixed(side) && isFixed(rear) && !side.metres.eq(rear.metres)) {
      notBound.push({
        field: 'setbacks.side_and_rear',
        stated: `side ${side.metres.toString()} m, rear ${rear.metres.toString()} m`,
        reason:
          'setback.adjacent_plot is one parameter over every non-road boundary and the ' +
          'sheet states two different distances. Binding either would apply it to both.',
      });
    } else {
      const shared = isFixed(side) ? side : isFixed(rear) ? rear : undefined;
      if (shared) {
        rules.push(
          setbackRule(
            'setback.adjacent_plot',
            'setback.adjacent_plot',
            shared.metres,
            'ADJACENT_PLOT',
          ),
        );
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
