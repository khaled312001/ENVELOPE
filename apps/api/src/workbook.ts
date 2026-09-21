/**
 * The run, as a spreadsheet.
 *
 * The same composition-root discipline as `drawing.ts`: every value here
 * arrives already traced, and this file chooses which sheet it lands on and
 * what sentence sits beside it. It computes nothing.
 *
 * What it does decide is **what a row's "source" column says**, and that is the
 * whole point of the export. A workbook that carried the numbers and dropped
 * their provenance would hand a pro-forma modeller a column where a FAR read off
 * a cited clause and a bay-area factor nobody has approved look identical. §13.1
 * calls the assumed treatment "the most important UI decision in the product";
 * it does not stop being important because the reader opened Excel.
 */

import {
  EdgeKind,
  NodeKind,
  ProvenanceClass,
  type ProvenanceEdge,
  type ProvenanceNode,
  type TracedWire,
} from '@envelope/core';
import type { SheetSpec, ValueRow, WorkbookSpec } from '@envelope/exports';

interface Assumption {
  readonly parameterId: string;
  readonly label: string;
  readonly value: string;
  readonly basis: string;
  readonly sensitivity: { readonly relativeEffect: string; readonly perturbation: string } | null;
}

/** The slice of a presented run the workbook reads. */
export interface ExportableRun {
  readonly runId: string;
  readonly plot: { readonly plotNumber: string; readonly community: string; readonly areaM2: string };
  readonly envelope: Record<string, unknown>;
  readonly parking: Record<string, unknown>;
  readonly capacity: Record<string, unknown>;
  readonly levelPlan: Record<string, unknown> | null;
  readonly assumptions: readonly Assumption[];
  readonly provenance?: Provenance;
}

const isTraced = (v: unknown): v is TracedWire =>
  typeof v === 'object' && v !== null && 'value' in v && 'provenanceClass' in v;

/**
 * The provenance graph, indexed for lookup.
 *
 * `TracedWire` carries a node id and a class, not a citation — deliberately, so
 * that one fact is stored in one place. The consequence is that anything wanting
 * to *print* the citation has to walk the graph, which is what this does. It
 * reads; it does not compute.
 */
export interface Provenance {
  readonly nodes: readonly ProvenanceNode[];
  readonly edges: readonly ProvenanceEdge[];
}

class GraphIndex {
  readonly #byId = new Map<string, ProvenanceNode>();
  readonly #out = new Map<string, ProvenanceEdge[]>();

  constructor(graph: Provenance | undefined) {
    for (const n of graph?.nodes ?? []) this.#byId.set(n.id, n);
    for (const e of graph?.edges ?? []) {
      const list = this.#out.get(e.from);
      if (list) list.push(e);
      else this.#out.set(e.from, [e]);
    }
  }

  /**
   * The first node of `kind` reachable from `id`, breadth first.
   *
   * Bounded by the visited set rather than by a depth limit: a run's graph is a
   * DAG of a few hundred nodes, and a depth cap would silently stop reporting a
   * citation on the one value with a long derivation — exactly the value most
   * worth citing.
   */
  find(id: string, kind: string, via: readonly string[]): ProvenanceNode | undefined {
    const seen = new Set<string>([id]);
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const e of this.#out.get(current) ?? []) {
        if (!via.includes(e.kind)) continue;
        const next = this.#byId.get(e.to);
        if (!next || seen.has(e.to)) continue;
        if (next.kind === kind) return next;
        seen.add(e.to);
        queue.push(e.to);
      }
    }
    return undefined;
  }
}

const CITATION_PATH = [EdgeKind.DERIVED_FROM, EdgeKind.USES, EdgeKind.CITED_IN];
const BASIS_PATH = [EdgeKind.DERIVED_FROM, EdgeKind.JUSTIFIED_BY];
const USER_PATH = [EdgeKind.DERIVED_FROM, EdgeKind.ENTERED_BY];

/**
 * The sentence in the "source / basis" column.
 *
 * A `DERIVED` row whose citation cannot be reached would be the worst row in the
 * file — a number claiming an authority it cannot name — so the fallback says
 * exactly that rather than leaving the cell blank. A blank cell reads as
 * "nothing to say"; this reads as "look at this".
 */
function sourceText(t: TracedWire, index: GraphIndex): string {
  switch (t.provenanceClass) {
    case ProvenanceClass.DERIVED: {
      const clause = index.find(t.node, NodeKind.SOURCE_CLAUSE, CITATION_PATH);
      const c = clause?.citation;
      return c
        ? `${c.instrumentId} ${c.clauseReference} (p. ${c.sourcePage}) — "${c.sourceTextVerbatim}"`
        : 'DERIVED, but no citation is reachable from this value. Do not rely on it.';
    }
    case ProvenanceClass.ASSUMED: {
      const basis = index.find(t.node, NodeKind.BASIS, BASIS_PATH);
      return basis?.label ?? 'assumed with no basis recorded — treat as unverified';
    }
    case ProvenanceClass.USER_SET: {
      const user = index.find(t.node, NodeKind.USER, USER_PATH);
      return user ? `entered by ${user.label}` : 'entered by a user';
    }
    default:
      return `${t.provenanceClass} — see the run report`;
  }
}

function rows(
  source: Record<string, unknown>,
  labels: Record<string, string>,
  index: GraphIndex,
): readonly ValueRow[] {
  const out: ValueRow[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const v = source[key];
    if (!isTraced(v)) continue;
    out.push({ label, traced: v, source: sourceText(v, index) });
  }
  return out;
}

const ENVELOPE_LABELS = {
  setbackPermittedFootprint: 'Footprint after setbacks (m²)',
  coverageCap: 'Coverage cap (m²)',
  podiumFootprint: 'Podium footprint (m²)',
  towerPlateCap: 'Tower plate cap (m²)',
  heightCeilingM: 'Height ceiling (m)',
  floorToFloorM: 'Floor to floor (m)',
  maxLevelsByHeight: 'Levels by height',
};

const PARKING_LABELS = {
  residentBays: 'Resident bays required',
  visitorBays: 'Visitor bays required',
  totalBays: 'Total bays required',
  bayAreaFactorM2: 'Area per bay factor (m²)',
  requiredAreaM2: 'Parking area required (m²)',
  levelsRequired: 'Parking levels required',
  levelsAvailable: 'Parking levels available',
  supportableUnitCeiling: 'Units the parking can carry',
};

const LEVEL_LABELS = {
  bayCount: 'Bays actually laid out',
  areaPerBayM2: 'Area per bay achieved (m²)',
  deductionsM2: 'Cores, plant and ramp landing (m²)',
  moduleDepthM: 'Double-loaded module depth (m)',
  usableAreaM2: 'Level area available to pack (m²)',
};

const CAPACITY_LABELS = {
  bandA: 'Band A — regulation limited (m²)',
  bandB: 'Band B — geometry limited (m²)',
  bandC: 'Band C — parking limited (m²)',
  governingGfa: 'Governing GFA (m²)',
  levels: 'Levels',
  userRealismDiscount: 'User realism discount',
};

export function runWorkbookSpec(run: ExportableRun, generatedAt: string): WorkbookSpec {
  const index = new GraphIndex(run.provenance);
  const sheets: SheetSpec[] = [
    {
      name: 'Capacity',
      note:
        'Three bands, never merged and never averaged. There is no "realistic" or ' +
        '"expected" figure in this file because the engine does not produce one — ' +
        'the honest substitute is the user realism discount, which defaults to 1.00.',
      rows: rows(run.capacity, CAPACITY_LABELS, index),
    },
    { name: 'Envelope', rows: rows(run.envelope, ENVELOPE_LABELS, index) },
    {
      name: 'Parking demand',
      note:
        'Demand at the probe target. Compare against the "Parking level" sheet: ' +
        'a level that packs fewer bays than this sheet requires is a real and ' +
        'reportable state, not an error in either number.',
      rows: rows(run.parking, PARKING_LABELS, index),
    },
  ];

  if (run.levelPlan) {
    sheets.push({
      name: 'Parking level',
      note:
        'Bays placed as rectangles to Dubai Building Code Table B.11, not an area ' +
        'divided by a factor. A bay count that cannot be laid out is not a bay count.',
      rows: rows(run.levelPlan, LEVEL_LABELS, index),
    });
  }

  return {
    runId: run.runId,
    plotLabel: `${run.plot.plotNumber} — ${run.plot.community} — ${run.plot.areaM2} m²`,
    generatedAt,
    sheets,
    assumptions: run.assumptions.map((a) => ({
      parameterId: a.parameterId,
      value: a.value,
      basis: a.basis,
      ...(a.sensitivity
        ? { sensitivity: `${a.sensitivity.relativeEffect} at ${a.sensitivity.perturbation}` }
        : {}),
    })),
  };
}
