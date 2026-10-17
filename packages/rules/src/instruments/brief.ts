/**
 * A PROJECT BRIEF, AS THE SECOND INSTRUMENT FOR A LIMIT THE AFFECTION PLAN OMITS.
 *
 * `DJAZ1MED12RES011` (plot 5180178) prints `G+11` and no FAR and no GFA, so
 * `blockingGaps()` stops the run — correctly. Its brief prints FAR 5 and a total
 * GFA of 11,829.35 m², and 5 × 2,365.87 reconciles exactly. CLAUDE.md: "A project
 * brief may unblock a plot the affection plan could not."
 *
 * WHAT THIS DOES NOT DO, ON PURPOSE:
 *
 * - **It never competes with the sheet.** A brief binds only a parameter the
 *   plot's own sheet left unbound (`omitted`). Two plot-specific rules for one
 *   parameter would be a conflict §11.5 cannot order, and where the sheet speaks
 *   the authority's document governs, whatever the developer's consultant wrote.
 * - **It is never applied by default.** The run names the brief it wants
 *   (`projectBriefId`), as it names a recorded statement: offered, never
 *   pre-selected. Whether a brief's FAR may stand for the study is the client's
 *   question (open-questions), and a brief silently filling the gap would answer
 *   it for him.
 * - **It never dresses itself as the authority.** The citation is the brief's
 *   own page and box, its instrument id the brief's reference, and the clause
 *   says in words that it is a developer brief, not an authority document.
 *
 * The GFA governs and the FAR is its cross-check, exactly as on a sheet printing
 * both (see `sheet.ts`): the ratio applied is the brief's GFA ÷ the brief's plot
 * area, rounded down at six places.
 */

import { Decimal } from '@envelope/core';

import {
  ApprovalStatus,
  EvaluatorName,
  Mechanization,
  Operator,
  RuleClass,
  type RuleRecord,
} from '../record.js';
import type { ProjectBrief } from '../standards/types.js';
import { INSTRUMENT_APPROVER } from './sheet.js';

/** The clause every value a brief supplies carries, so no reader takes it for the authority's. */
export const BRIEF_NOT_AUTHORITY =
  'Developer brief, not an authority document: issued by the developer’s consultant and applied ' +
  'only where the plot’s own affection plan states nothing.';

export interface BriefBinding {
  /** `Plot.plotNumber`; must be the brief's. */
  readonly plotNumber: string;
  /** Who asked for the brief to be applied. A name, never a system default. */
  readonly authoredBy: string;
  /** Parameters the plot's own sheet binds. The brief binds none of these. */
  readonly sheetBinds: ReadonlySet<string>;
}

/**
 * The rules a brief supplies for one plot, where its sheet is silent.
 *
 * Total: a brief for another plot, or one whose figures cannot be divided,
 * yields no rule — and the caller refuses the run in a sentence, because the
 * gap it was asked to fill is still open.
 */
export function rulesFromBrief(brief: ProjectBrief, binding: BriefBinding): readonly RuleRecord[] {
  if (brief.plotNumber !== binding.plotNumber.trim()) return [];
  if (binding.sheetBinds.has('far.max')) return [];
  const gfa = new Decimal(brief.gfaM2.value);
  const area = new Decimal(brief.plotAreaM2.value);
  if (!area.gt(0) || !gfa.gt(0)) return [];
  const ratio = gfa.div(area).toDecimalPlaces(6, Decimal.ROUND_DOWN);
  const thisPlot = { 'plot.plot_number': { eq: binding.plotNumber } } as const;
  return [
    {
      ruleId: `BRIEF.${brief.briefId}.far.max`,
      parameterId: 'far.max',
      ruleClass: RuleClass.GENERATIVE,
      operator: Operator.MAX,
      evaluator: EvaluatorName.SCALAR_MAX,
      evaluatorArgs: { value: ratio.toString() },
      unit: 'ratio',
      applicability: { all: [thisPlot] },
      citation: {
        ...brief.gfaM2.citation,
        clauseReference: `${brief.gfaM2.citation.clauseReference} ÷ ${brief.plotAreaM2.citation.clauseReference}`,
        sourceTextVerbatim:
          `${BRIEF_NOT_AUTHORITY} GFA ${gfa.toString()} m² ÷ plot area ${area.toString()} m² ` +
          `(rounded down at 6 places); the brief's FAR ${brief.far.value} is the cross-check. ` +
          `As printed: "${brief.citation.sourceTextVerbatim}"`,
      },
      /*
        PLOT-SPECIFIC, because it is about this parcel and nothing else, so it
        wins over the seed's placeholder FAR under §11.5 step 1. The jurisdiction
        string is the resolver's; the citation is what says whose document it is.
      */
      jurisdiction: `PLOT:${binding.plotNumber}`,
      isLifeSafety: false,
      mechanization: Mechanization.MECHANIZED,
      validFrom: '1970-01-01',
      validTo: null,
      recordedAt: '1970-01-01',
      version: 1,
      supersedes: null,
      status: ApprovalStatus.APPROVED,
      authoredBy: binding.authoredBy,
      approvedBy: INSTRUMENT_APPROVER,
      approvedAt: '1970-01-01',
      tests: [
        { kind: 'POSITIVE', context: { plot: { plot_number: binding.plotNumber } }, expected: ratio.toNumber() },
        {
          kind: 'BOUNDARY',
          context: { plot: { plot_number: binding.plotNumber, area_m2: 1 } },
          expected: ratio.toNumber(),
          note: 'A ratio is plot-area independent.',
        },
        { kind: 'NEGATIVE', context: { plot: { plot_number: `${binding.plotNumber}-other` } }, expected: 'NOT_APPLICABLE' },
      ],
      note:
        `${BRIEF_NOT_AUTHORITY} Applied because the run named brief ${brief.briefId}. Its period of ` +
        'validity is not modelled; validFrom is the epoch because the brief states none this encodes.',
    },
  ];
}
