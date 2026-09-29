/**
 * The metric definitions annex — `FR-DEF-001`.
 *
 * PRD §32.3: "The metric definitions annex is the root. Nothing computes an area
 * term until it is signed. This is a one-week, four-person-hour document that
 * gates the entire project — and skipping it is precisely how V1's example ended
 * up wrong by 3×."
 *
 * `AC5` is the teeth: "No code merges that computes an area term absent from the
 * annex." That is enforced here by {@link metric}, which every area computation
 * must call to obtain the term it is about to compute, and by `INV-15`, which
 * re-checks the emitted set independently.
 *
 * ---
 *
 * **This annex is UNSIGNED.** The content below is a structurally complete
 * placeholder authored by the engineering side so that the pipeline can be built
 * and tested. Every definition is marked `APPROVAL_PENDING`. Per `AC4` and
 * Principle 9, a licensed architect must review, amend and sign it, and the
 * signed version id must appear in every report. Until then
 * {@link assertAnnexSigned} fails any export path.
 */

/** Whether a definition has been approved by a named, qualified human. */
export const ApprovalStatus = {
  APPROVED: 'APPROVED',
  APPROVAL_PENDING: 'APPROVAL_PENDING',
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const UnitType = {
  AREA_M2: 'm²',
  LENGTH_M: 'm',
  RATIO: 'ratio',
  COUNT: 'count',
} as const;
export type UnitType = (typeof UnitType)[keyof typeof UnitType];

export interface MetricDefinition {
  readonly metricId: string;
  readonly name: string;
  readonly unit: UnitType;
  /** How the term is computed, stated in words a reviewing architect can check. */
  readonly formulaStatement: string;
  /** `AC2` — explicit. A term with an empty inclusion list is not a definition. */
  readonly inclusions: readonly string[];
  readonly exclusions: readonly string[];
  readonly version: string;
  readonly approvalStatus: ApprovalStatus;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  /** Why this reading was chosen where the source admits more than one. */
  readonly note?: string;
}

/** Version of the annex as a whole. Cited in every report (`AC4`). */
export const ANNEX_VERSION = '0.1.0-UNSIGNED' as const;

const PENDING = ApprovalStatus.APPROVAL_PENDING;

const DEFINITIONS: readonly MetricDefinition[] = [
  {
    metricId: 'GFA',
    name: 'Gross Floor Area',
    unit: UnitType.AREA_M2,
    formulaStatement:
      'Sum, over every level above and below ground, of the area measured to the ' +
      'outside face of the external wall.',
    inclusions: [
      'Internal circulation (corridors, lobbies)',
      'Vertical cores (stairs, lifts, shafts) measured once per level',
      'Internal walls and columns',
      'Enclosed plant and service rooms',
      'Enclosed balconies (fully glazed and conditioned)',
    ],
    exclusions: [
      'Open, unenclosed balconies and terraces',
      'Open roof plant areas',
      'Uncovered podium landscape',
    ],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note:
      'Whether parking area is included is NOT settled here — it is a separate, ' +
      'blocking determination. See PARKING_IN_FAR and FR-DEF-002.',
  },
  {
    metricId: 'BUA',
    name: 'Built-Up Area',
    unit: UnitType.AREA_M2,
    formulaStatement: 'GFA plus all covered but unenclosed areas.',
    inclusions: ['GFA in full', 'Open balconies', 'Covered terraces', 'Covered parking decks'],
    exclusions: ['Uncovered surface parking', 'Uncovered landscape'],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note: 'BUA ≥ GFA always. INV-17 does not use BUA; it is reported for comparison only.',
  },
  {
    metricId: 'NSA',
    name: 'Net Saleable Area',
    unit: UnitType.AREA_M2,
    formulaStatement:
      'Sum of the areas of saleable units, measured to the mid-point of party ' +
      'walls and the inside face of external walls.',
    inclusions: ['Unit internal area', 'Half of party-wall thickness', 'Enclosed unit balconies'],
    exclusions: [
      'Shared corridors and lobbies',
      'Vertical cores',
      'Plant and service rooms',
      'Parking',
      'Open balconies (unless a declared balcony factor applies)',
    ],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note:
      'The single most commercially load-bearing definition in the annex and the ' +
      'one on which two architects are most likely to differ. The balcony ' +
      'treatment alone moves efficiency by several points.',
  },
  {
    metricId: 'SELLABLE_AREA',
    name: 'Sellable Area',
    unit: UnitType.AREA_M2,
    formulaStatement: 'NSA adjusted by any declared balcony or terrace weighting factor.',
    inclusions: ['NSA in full', 'Weighted balcony area, where a factor is declared'],
    exclusions: ['Any area not attributable to a specific unit'],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note: 'Equals NSA exactly when no balcony factor is declared, which is the Phase 0 default.',
  },
  {
    metricId: 'GROSS_EFFICIENCY',
    name: 'Gross Efficiency',
    unit: UnitType.RATIO,
    formulaStatement: 'NSA ÷ GFA, taken over the whole building including podium and basements.',
    inclusions: ['All levels contributing to GFA'],
    exclusions: [],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note:
      'INV-07 checks this at the definition scope stated. Reporting an efficiency ' +
      'without naming its scope is the error that makes two feasibility studies ' +
      'incomparable.',
  },
  {
    metricId: 'TOWER_EFFICIENCY',
    name: 'Tower Efficiency',
    unit: UnitType.RATIO,
    formulaStatement: 'NSA ÷ GFA, taken over typical tower levels only.',
    inclusions: ['Typical residential levels above the podium'],
    exclusions: ['Podium levels', 'Basement levels', 'Amenity and plant levels'],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note: 'Always higher than gross efficiency. Quoting one for the other overstates value.',
  },
  {
    metricId: 'PARKING_AREA',
    name: 'Parking Area',
    unit: UnitType.AREA_M2,
    formulaStatement:
      'Total floor area given over to parking, measured to the structural ' +
      'perimeter of the parking level.',
    inclusions: ['Bays', 'Aisles', 'Ramps', 'Parking-level circulation cores'],
    exclusions: ['Residential lobbies within a parking level', 'Plant serving the tower above'],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
  },
  {
    metricId: 'BAY_AREA_FACTOR',
    name: 'Bay Area Factor',
    unit: UnitType.AREA_M2,
    formulaStatement:
      'Gross parking area consumed per bay, including the bay itself and its ' +
      'share of aisle, ramp and circulation.',
    inclusions: ['Bay footprint', 'Pro-rata aisle', 'Pro-rata ramp and circulation'],
    exclusions: ['Structural cores serving the tower'],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note:
      'Typically 28–35 m²/bay for a structured basement. The value used is a rule ' +
      'if one is cited, otherwise an ASSUMED entry with a sensitivity — never a ' +
      'silent default.',
  },
  {
    metricId: 'FAR',
    name: 'Floor Area Ratio',
    unit: UnitType.RATIO,
    formulaStatement: 'GFA ÷ plot area, with GFA taken at the declared parking-in-FAR treatment.',
    inclusions: ['GFA as defined above'],
    exclusions: [],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note:
      'INV-18 checks that the GFA composition used here matches the declared ' +
      'parking-in-FAR treatment. Mixing the two treatments in one report is the ' +
      'error that moves capacity 15–35%.',
  },
  {
    metricId: 'PLOT_COVERAGE',
    name: 'Plot Coverage',
    unit: UnitType.RATIO,
    formulaStatement: 'Podium footprint ÷ plot area.',
    inclusions: ['Footprint of all enclosed and covered structure at ground level'],
    exclusions: ['Uncovered basement extents', 'Uncovered landscape and hardstanding'],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
  },
  {
    metricId: 'PARKING_IN_FAR',
    name: 'Parking-in-FAR Treatment',
    unit: UnitType.RATIO,
    formulaStatement:
      'Declared per project: whether parking area is counted within GFA for the ' +
      'purposes of the FAR ceiling.',
    inclusions: [],
    exclusions: [],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note:
      '`AC3` requires this be recorded or explicitly marked OPEN REGULATORY ' +
      'QUESTION. It is currently OPEN — see open-questions.md Q2. FR-DEF-002 ' +
      'forbids a default and blocks capacity computation until a treatment is ' +
      'DERIVED from a citation or USER_SET by a named user.',
  },
  {
    metricId: 'SETBACK_PERMITTED_FOOTPRINT',
    name: 'Setback-Permitted Footprint',
    unit: UnitType.AREA_M2,
    formulaStatement:
      'Area of the polygon obtained by offsetting every plot edge inward by its ' +
      'own applicable setback and intersecting the results with the plot.',
    inclusions: ['Area enclosed by the offset boundary'],
    exclusions: ['Any area outside the plot boundary'],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note:
      'Not a regulatory term — an engine term, defined here because INV-15 ' +
      'requires every area term the engine emits to appear in the annex.',
  },
  {
    metricId: 'PODIUM_FOOTPRINT',
    name: 'Podium Footprint',
    unit: UnitType.AREA_M2,
    formulaStatement: 'min(setback-permitted footprint, coverage cap).',
    inclusions: ['Enclosed and covered structure at podium level'],
    exclusions: [],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
  },
  {
    metricId: 'TOWER_PLATE',
    name: 'Tower Plate',
    unit: UnitType.AREA_M2,
    formulaStatement: 'Gross area of a typical tower level, measured as for GFA.',
    inclusions: ['Units', 'Corridors', 'Core', 'External wall thickness'],
    exclusions: ['Open balconies'],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note:
      'INV-10 requires tower plate ≤ podium footprint AND ≤ tower plate cap. ' +
      'PRD Appendix A selects 1,060 m² with no stated derivation while its own ' +
      'printed computation gives 1,280 — see open-questions.md.',
  },
  {
    metricId: 'CORE_AREA',
    name: 'Core Area',
    unit: UnitType.AREA_M2,
    formulaStatement:
      'Gross plan area of the vertical circulation and services core on a typical ' +
      'tower level, measured to the outside face of the core walls.',
    inclusions: [
      'Lift shafts and lift lobby',
      'Escape stairs and their lobbies',
      'Riser ducts and service shafts',
      'Core walls, to their outside face',
    ],
    exclusions: [
      'Corridors outside the core enclosure',
      'Plant rooms not inside the core',
      'The ramp and its landing, which are parking circulation',
    ],
    version: ANNEX_VERSION,
    approvalStatus: PENDING,
    note:
      'A core is INSIDE GFA and OUTSIDE saleable area, so this term is already ' +
      'inside the saleable efficiency the run is given. The engine reports the ' +
      'core against that efficiency and against the parking usable fraction; it ' +
      'does not subtract it a second time. Double-deducting a term two inputs ' +
      'already carry is the failure this note exists to prevent.',
  },
];

const BY_ID: ReadonlyMap<string, MetricDefinition> = new Map(
  DEFINITIONS.map((d) => [d.metricId, d]),
);

/** Every metric id the annex defines. `INV-15` checks emitted terms against this. */
export const DEFINED_METRIC_IDS: ReadonlySet<string> = new Set(BY_ID.keys());

export const ALL_DEFINITIONS: readonly MetricDefinition[] = DEFINITIONS;

/** Raised when code attempts to compute an area term the annex does not define. */
export class UndefinedMetricError extends Error {
  override readonly name = 'UndefinedMetricError';
  constructor(readonly metricId: string) {
    super(
      `metric "${metricId}" is not in the definitions annex (version ${ANNEX_VERSION}). ` +
        `FR-DEF-001 AC5: no code may compute an area term absent from the annex. ` +
        `Add and sign the definition before computing it.`,
    );
  }
}

/**
 * Look up a metric definition. **Every area computation must call this** — it is
 * the mechanical form of `AC5`.
 */
export function metric(metricId: string): MetricDefinition {
  const d = BY_ID.get(metricId);
  if (!d) throw new UndefinedMetricError(metricId);
  return d;
}

export function isDefined(metricId: string): boolean {
  return BY_ID.has(metricId);
}

/** Definitions still awaiting a named approver. */
export function pendingApproval(): readonly MetricDefinition[] {
  return DEFINITIONS.filter((d) => d.approvalStatus !== ApprovalStatus.APPROVED);
}

/**
 * Gate on export. PRD `G4` requires a named reviewer, and `FR-DEF-001 AC4`
 * requires the report to cite a signed annex version.
 *
 * Deliberately not bypassable by a flag: Principle 9's enforcement note is that
 * unapproved shared assets "cannot be loaded — there is no override flag".
 */
export function assertAnnexSigned(): void {
  const pending = pendingApproval();
  if (pending.length > 0) {
    throw new Error(
      `metric definitions annex ${ANNEX_VERSION} is not signed: ` +
        `${pending.length} of ${DEFINITIONS.length} definitions await a named approver ` +
        `(${pending.map((d) => d.metricId).join(', ')}). ` +
        `FR-DEF-001 AC4 — a report may not cite an unsigned annex.`,
    );
  }
}
