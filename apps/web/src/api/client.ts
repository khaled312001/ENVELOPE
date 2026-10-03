/**
 * Typed API client.
 *
 * Numbers cross the wire as strings and stay strings here. The frontend never
 * parses a figure into a JS `number` before displaying it: `0.1 + 0.2` is not
 * `0.3`, and a product whose premise is that a number can be defended cannot
 * afford to lose a digit on the last hop. Where a number is needed for a bar
 * width or a sort, it is converted at that point and only for that purpose.
 *
 * The actor travels on every request. There is no anonymous mode — every
 * `USER_SET` value carries the identity of whoever entered it, and a client that
 * could omit it would make the badge a lie.
 */

import type { BuildingModel } from '@envelope/core';

import type { TracedWire } from '../components/TracedValue.js';
import type { ProvTree } from '../components/ProvenanceTree.js';
import type { AssumptionEntry } from '../components/AssumptionRegister.js';
import type { CapacityView } from '../components/CapacityBands.js';
import type { PlotEdgeView, PlotVertex } from '../components/PlotCanvas.js';

export interface Actor {
  readonly id: string;
  readonly name: string;
  readonly licence?: string;
  /**
   * WHICH WORKSPACE THIS REQUEST IS BEING MADE INSIDE — not part of the identity.
   *
   * It sits on `Actor` because every call in this module already takes one, and a
   * second parameter threaded through forty signatures would be forgotten on the
   * one call that files a run. It is NOT who the reader is: `workspace.tsx` owns
   * it, `Root` merges it in at the point of use, and it is stripped before the
   * actor is written to storage, because an identity remembered with a workspace
   * inside it would survive being removed from that workspace.
   *
   * The server checks membership on every request and treats a workspace the
   * actor does not belong to as absent, so this can only ever narrow where work
   * is filed — it cannot reach somebody else's.
   */
  readonly workspaceId?: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly kind: string,
    message: string,
    readonly detail?: unknown,
    readonly gate?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Identity on every request, and `content-type` only when there is a body.
 *
 * Fastify rejects `content-type: application/json` with an empty body — "Body
 * cannot be empty" — with a 400. Two endpoints here are bodyless POSTs (export,
 * and the HTML render of it), so sending the header unconditionally made the
 * export button fail every time it was pressed.
 *
 * It survived the API tests because `app.inject` sets no content-type unless
 * asked, so the same call succeeded there and failed in a browser. That gap is
 * why `pnpm smoke` exists.
 */
function headers(actor: Actor, hasBody: boolean): Record<string, string> {
  return {
    ...(hasBody ? { 'content-type': 'application/json' } : {}),
    'x-actor-id': actor.id,
    'x-actor-name': actor.name,
    ...(actor.licence ? { 'x-actor-licence': actor.licence } : {}),
    ...(actor.workspaceId ? { 'x-workspace-id': actor.workspaceId } : {}),
  };
}

async function call<T>(
  path: string,
  init: RequestInit & { actor: Actor },
): Promise<T> {
  const { actor, ...rest } = init;
  const res = await fetch(path, { ...rest, headers: headers(actor, rest.body !== undefined) });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    throw new ApiError(
      res.status,
      String(body['error'] ?? 'Error'),
      // The server's messages are written to be read by a person — they name the
      // rule, the gate or the missing declaration. Passing them through beats
      // any generic string this layer could substitute.
      // Some routes put the sentence in `detail` instead — the intake's "not a
      // PDF" and "could not be read" among them — and the reader was shown
      // "Request failed with 422" with the reason one field away.
      String(
        body['message'] ??
          (typeof body['detail'] === 'string' ? body['detail'] : undefined) ??
          `Request failed with ${res.status}`,
      ),
      body['detail'],
      body['gate'] as string | undefined,
    );
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// Shapes returned by the API
// ---------------------------------------------------------------------------

/**
 * WHAT THE PLOT'S OWN AFFECTION PLAN DID, AS BOTH ENDPOINTS REPORT IT.
 *
 * Three states, and all three are said out loud rather than shown as an absence.
 * The half that matters most is `notBound`: a response listing four limits from a
 * sheet that states six would understate the document while looking complete, and
 * "read, shown, and quietly dropped" is the exact defect this whole path closes.
 */
export interface SheetReport {
  readonly attached: boolean;
  readonly documentUri: string | null;
  readonly issuedOn: string | null;
  /** Why the sheet was set aside — a different parcel. The run still ran. */
  readonly refused: string | null;
  readonly bound: readonly {
    readonly parameterId: string;
    readonly value: string;
    readonly unit: string;
    /** The sheet's own words, as the parser located them. */
    readonly clause: string;
  }[];
  readonly notBound: readonly {
    readonly field: string;
    readonly stated: string;
    readonly reason: string;
  }[];
}

export interface PlotCreated {
  readonly plotId: string;
  readonly sheet: SheetReport;
  readonly shapeClass: string;
  readonly computedAreaM2: string;
  readonly statedAreaM2: string | null;
  readonly areaMismatch: boolean;
  readonly areaMismatchMessage: string | null;
  readonly principalAxisDeg: string;
  readonly convexityRatio: string;
  readonly mbr: { readonly widthM: string; readonly depthM: string };
  readonly frontageCount: number;
  readonly gateSubjectHash: string;
}

export interface PlotView {
  readonly plotId: string;
  readonly plotNumber: string;
  readonly community: string;
  readonly landUse: string;
  readonly shapeClass: string;
  readonly vertices: readonly PlotVertex[];
  readonly edges: readonly PlotEdgeView[];
  readonly computedAreaM2: string;
  readonly areaMismatch: boolean;
}

export interface RunView {
  readonly runId: string;
  /**
   * When the run was computed, ISO 8601.
   *
   * Put on by the API from the stored row, not by the engine, which does not
   * know when its output was written. The title block on screen prints it and
   * so does the one on paper — from this one field, so they cannot drift.
   */
  readonly issuedAt: string;
  readonly engineVersion: string;
  readonly annexVersion: string;
  readonly elapsedMs: number;
  readonly withinRuntimeBudget: boolean;
  readonly draftRules: boolean;
  readonly warning?: string;
  readonly plot: {
    readonly plotId: string;
    readonly plotNumber: string;
    readonly community: string;
    readonly areaM2: string;
    readonly shapeClass: string;
  };
  readonly envelope: {
    readonly setbackPermittedFootprint: TracedWire;
    readonly coverageCap: TracedWire;
    readonly podiumFootprint: TracedWire;
    readonly towerPlateCap: TracedWire;
    readonly heightCeilingM: TracedWire;
    readonly floorToFloorM: TracedWire;
    readonly maxLevelsByHeight: TracedWire;
    readonly appliedSetbacks: readonly {
      readonly seq: number;
      readonly setbackM: string;
      readonly ruleId: string;
    }[];
    readonly bindingConstraints: readonly {
      readonly dimension: string;
      readonly ruleId: string;
      readonly label: string;
      readonly value: string;
      readonly runnerUp: {
        readonly ruleId: string;
        readonly label: string;
        readonly value: string;
        readonly withinOnePercent: boolean;
      } | null;
    }[];
    /** The envelope as polygons, so the massing view draws what was computed. */
    readonly podiumOutline: readonly WirePoint[];
    readonly towerOutline: readonly WirePoint[];
    readonly fixpoint: {
      readonly converged: boolean;
      readonly iterations: number;
      readonly history: readonly { readonly index: number; readonly note: string }[];
    };
  };
  readonly parking: {
    readonly residentBays: TracedWire;
    readonly visitorBays: TracedWire;
    readonly totalBays: TracedWire;
    readonly bayAreaFactorM2: TracedWire;
    readonly requiredAreaM2: TracedWire;
    readonly levelsRequired: TracedWire;
    readonly levelsAvailable: TracedWire;
    readonly headroomBays: string;
    readonly supportableUnitCeiling: TracedWire;
    readonly podiumImplication: string;
  };
  readonly massing: MassingView;
  /**
   * The run as one building — what the sheets, the massing and the DXF all draw.
   * A type import only: the web never runs engine code, it reads the engine's JSON.
   *
   * Optional because a run is stored as it was presented, and a run computed
   * before the model existed was presented without one. Such a run has no
   * drawing — the screen says so rather than assembling one from area figures.
   */
  readonly building?: BuildingModel;
  readonly levelPlan: LevelPlanView | null;
  /** Why no level was laid out. Present only when `levelPlan` is null. */
  readonly levelPlanRefusal: string | null;
  readonly capacity: CapacityView;
  /**
   * The core — its area, its share of the plate, and what that share says about
   * the two inputs that already carry it.
   *
   * Beside the capacity rather than inside it, because nothing above is
   * subtracted for it: a core is inside GFA and inside the saleable efficiency,
   * and on a parking level it is inside what the usable fraction deducts. The
   * reconciliation is the point of the block.
   *
   * Optional for the same reason `building` is: a run stored before the engine
   * sized a core has none, and one inferred now from its stored numbers would be
   * a core nobody entered.
   */
  readonly core?: {
    readonly areaM2: TracedWire;
    readonly plateShare: TracedWire;
    readonly placement: TracedWire;
    readonly reconciliation: readonly string[];
  };
  /**
   * The area table a submission drawing carries. Absent on a run stored before
   * the statement existed; such a run shows no table rather than one rebuilt
   * from its numbers.
   */
  readonly gfaStatement?: GfaStatementView;
  readonly assumptions: readonly AssumptionEntry[];
  readonly checks: ChecksView;
  readonly gates?: Record<string, { readonly actorName: string; readonly at: string }>;
}

/** A plot-space point: metres, three decimals, as strings. */
export interface WirePoint {
  readonly x: string;
  readonly y: string;
}

/**
 * The envelope as volumes.
 *
 * Footprints and traced heights, not a mesh. The viewer extrudes and orbits; it
 * does not decide how tall anything is.
 */
export interface MassingView {
  readonly totalHeightM: TracedWire;
  readonly masses: readonly {
    readonly id: string;
    readonly label: string;
    readonly footprint: readonly WirePoint[];
    readonly baseM: TracedWire;
    readonly heightM: TracedWire;
    readonly levels: TracedWire;
    readonly note: string;
  }[];
}

/**
 * One vehicle-access option.
 *
 * Every viable frontage comes back, not only the winner. The client's ask was
 * "tell me the entrance is better from here" — a recommendation he can disagree
 * with — and a screen showing one answer with no alternatives cannot be
 * disagreed with, only obeyed.
 */
export interface AccessCandidateView {
  readonly edgeSeq: number;
  readonly hierarchy: string | null;
  readonly usableWindowM: string;
  readonly centreOffsetM: string;
  readonly widthM: string;
  readonly opening: { readonly start: WirePoint; readonly end: WirePoint };
  readonly rank: number;
  readonly rationale: string;
}

/**
 * The parking level, as rectangles.
 *
 * This is the screen the 30 Aug 2026 meeting was about. Every rectangle here was
 * placed by the engine; the drawing code below adds a colour and nothing else.
 */
export interface LevelPlanView {
  readonly bayCount: TracedWire;
  readonly areaPerBayM2: TracedWire;
  readonly deductionsM2: TracedWire;
  readonly moduleDepthM: TracedWire;
  readonly usableAreaM2: TracedWire;
  /** Which way round the runs were laid, of the two the engine packed. */
  readonly orientation: TracedWire;
  /** Three separate losses, in bays and in square metres. Never one efficiency. */
  readonly losses: {
    readonly reserved: { readonly areaM2: string; readonly bays: number };
    readonly circulation: {
      readonly areaM2: string;
      readonly bays: number;
      readonly strandedBays: number;
    };
    readonly footprint: { readonly areaM2: string; readonly bays: number };
  };
  readonly standard: {
    readonly angle: string;
    readonly driveway: string;
    readonly bayWidthM: string;
    readonly bayLengthM: string;
    readonly drivewayWidthM: string;
  };
  readonly podiumRing: readonly WirePoint[];
  readonly packingRect: {
    readonly widthM: string;
    readonly depthM: string;
    /** True when the podium *is* the rectangle, so nothing was given up. */
    readonly exact: boolean;
    readonly coveragePct: string;
    readonly outline: readonly WirePoint[];
  };
  readonly rects: readonly {
    readonly kind: 'BAY' | 'ACCESSIBLE_BAY' | 'AISLE' | 'RAMP' | 'OBSTRUCTION';
    readonly row: number;
    readonly widthM: string;
    readonly heightM: string;
    readonly outline: readonly WirePoint[];
  }[];
  readonly access: {
    readonly recommended: (AccessCandidateView & { readonly node: string }) | null;
    readonly candidates: readonly AccessCandidateView[];
    readonly rejected: readonly {
      readonly edgeSeq: number;
      readonly classification: string;
      readonly reason: string;
    }[];
  };
  readonly notAssessed: readonly string[];
}

/**
 * One setback value as the sheet states it.
 *
 * `CONDITIONAL` is not a parse failure — it is the sheet being precise. "0m to
 * solid wall and 4.0m to window wall" depends on a façade the applicant has not
 * chosen yet, and collapsing it to one number would choose for them.
 */
export type SetbackValueView =
  | { readonly kind: 'FIXED'; readonly metres: string }
  | {
      readonly kind: 'CONDITIONAL';
      readonly options: readonly { readonly condition: string; readonly metres: string }[];
    }
  /** "A quarter of the height from neighbouring plots, 3 m to 7.5 m" — DDA and Municipality sheets. */
  | {
      readonly kind: 'HEIGHT_SHARE';
      readonly share: string;
      readonly minMetres?: string;
      readonly maxMetres?: string;
      readonly from: string;
    };

export interface SetbackFaceView {
  readonly front?: SetbackValueView;
  readonly side?: SetbackValueView;
  readonly rear?: SetbackValueView;
}

/** What an affection plan says, and — as importantly — what it does not. */
/**
 * A file on its way to the server, encoded once.
 *
 * SEPARATE FROM THE READ BECAUSE THE SAME BYTES ARE SENT TWICE. Step 0 asks the
 * server what the sheet says; step 1 attaches the sheet to the plot so the server
 * can read its limits into rules. Encoding on each call would do the 1.5 MB twice
 * and, worse, would leave the screen holding a `File` whose contents it has to
 * re-read at a point where the user may already have navigated away from it.
 */
export interface Attachment {
  /** Base64. Not a data URI — the server expects the payload alone. */
  readonly content: string;
  readonly filename: string;
}

export async function encodeAttachment(file: File): Promise<Attachment> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  // Chunked: `String.fromCharCode(...bytes)` on a 1.5 MB file overflows the
  // argument list and throws `RangeError: Maximum call stack size exceeded`.
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return { content: btoa(binary), filename: file.name };
}

export interface AffectionPlanRead {
  readonly filename: string;
  readonly disclaimer: string;
  readonly facts: {
    readonly parcelId: TracedWire | null;
    readonly community: TracedWire | null;
    readonly developer: TracedWire | null;
    readonly landUse: TracedWire | null;
    readonly issueDate: TracedWire | null;
    readonly drawingRef: TracedWire | null;
    readonly parkingDeferredTo: TracedWire | null;
    readonly totalAreaSqm: TracedWire | null;
    readonly far: TracedWire | null;
    readonly gfaSqm: TracedWire | null;
    readonly height: {
      readonly value: {
        readonly raw: string;
        readonly groundFloors: number;
        readonly podiumLevels: number;
        readonly typicalFloors: number;
      };
      readonly provenanceClass: string;
    } | null;
    readonly setbacks: {
      /**
       * Podium and tower, kept apart.
       *
       * Trakhees sheets set them separately — "GF & Podium: 0m from all sides |
       * Tower: Front = 0m, Sides & Rear = 3m" — and collapsing the two into one
       * schedule would put the tower on the boundary.
       */
      readonly value: {
        readonly podium: SetbackFaceView;
        readonly tower: SetbackFaceView;
        readonly raw: string;
        /** True when a face came back conditional and a person must choose. */
        readonly requiresDecision: boolean;
        /** A DDA sheet's setbacks per numbered side, as its table prints them. */
        readonly bySide?: readonly {
          readonly side: string;
          readonly building?: SetbackValueView;
          readonly podium?: SetbackValueView;
        }[];
      };
      readonly provenanceClass: string;
    } | null;
    readonly coverage: {
      readonly value: {
        readonly podium?: string;
        readonly tower?: string;
        readonly raw: string;
      };
      readonly provenanceClass: string;
    } | null;
    readonly missing: readonly {
      readonly field: string;
      readonly label: string;
      readonly consequence: string;
    }[];
    readonly crossChecks: readonly {
      readonly name: string;
      readonly passed: boolean;
      readonly detail: string;
    }[];
    readonly crossChecksPassed: boolean;
    readonly blocking: readonly {
      readonly field: string;
      readonly label: string;
      readonly consequence: string;
    }[];
  };
}

/**
 * The two independent layers, as the API returns them.
 *
 * Not optional. §3.4 makes the invariant results, the deferred-check list and
 * the five-way claim statement required parts of every artifact, so a screen
 * that can render a run without them is a screen that will eventually ship
 * without them.
 */
export interface ChecksView {
  readonly invariants: {
    /** Nothing failed. **Not** "everything was checked" — read `dormant`. */
    readonly passed: boolean;
    /** Checks that actually ran. The denominator that means something. */
    readonly ran: number;
    readonly total: number;
    readonly dormant: readonly string[];
    readonly dormantNote: string;
    readonly results: readonly {
      readonly id: string;
      readonly statement: string;
      readonly status: 'PASS' | 'FAIL' | 'DORMANT';
      readonly tolerance: string;
      readonly observed: string | null;
      readonly expected: string | null;
      readonly detail: string;
    }[];
    readonly summaryLine: string;
  };
  readonly validation: {
    readonly summary: {
      readonly hardChecked: number;
      readonly hardSatisfied: number;
      readonly hardViolated: number;
      readonly hardNotEvaluable: number;
      readonly deferredDeclared: number;
      readonly lifeSafetyDeferred: number;
      readonly resolutionsBlocked: number;
      readonly feasible: boolean;
      readonly violatedRuleIds: readonly string[];
    };
    readonly outcomes: readonly {
      readonly category: 'HARD' | 'SOFT' | 'DEFERRED';
      readonly statement: string;
      readonly ruleId?: string;
      readonly parameterId?: string;
      readonly status?: string;
      readonly reason?: string;
      readonly isLifeSafety?: boolean;
    }[];
    readonly claims: Record<
      | 'selfConsistency'
      | 'ruleCoverage'
      | 'geometricValidity'
      | 'professionalAgreement'
      | 'regulatoryValidity',
      { readonly status: string; readonly detail: string }
    >;
    readonly claimLines: readonly string[];
    readonly independenceLimit: string;
    readonly selfConsistencyNotice: string;
    readonly emissionBlocked: readonly string[];
  };
}

export interface ParkingComparison {
  readonly countsTowardFar: { readonly governingGfaM2?: string; readonly error?: string };
  readonly excludedFromFar: { readonly governingGfaM2?: string; readonly error?: string };
  readonly regulatorySpreadM2: string | null;
  readonly governingSpreadM2: string | null;
  readonly verdict: string;
}

export interface RuleSummary {
  readonly ruleId: string;
  readonly parameterId: string;
  readonly ruleClass: string;
  readonly status: string;
  readonly mechanization: string;
  readonly isLifeSafety: boolean;
  readonly citation: { readonly instrumentId: string; readonly clauseReference: string };
  readonly note?: string;
}

/**
 * A citation, as the API sends it.
 *
 * Carried to the screen rather than summarised into a label, because a
 * transcription from a developer's PDF is exactly the kind of number a reviewer
 * should be able to check by opening the document at that page.
 */
export interface CitationView {
  readonly instrumentId: string;
  readonly instrumentVersion: string;
  readonly clauseReference: string;
  readonly documentUri: string;
  readonly sourcePage: number;
  readonly sourceTextVerbatim: string;
}

export interface StandardTarget {
  readonly value: string;
  readonly citation: CitationView;
  readonly note?: string;
}

/**
 * A developer standard — what this client will pay for, never what is permitted.
 *
 * Kept in its own type and served from its own endpoint so the distinction from
 * a `RuleSummary` survives the wire. The two must never be shown in one list.
 */
export interface DeveloperStandardView {
  readonly standardId: string;
  readonly developer: string;
  readonly title: string;
  readonly citation: CitationView;
  readonly notMechanized: readonly string[];
  readonly targets: {
    readonly saleableEfficiencyMin: StandardTarget;
    readonly saleableEfficiencyMax: StandardTarget;
    readonly parkingAreaPerBayM2: StandardTarget;
    readonly parkingOverage: StandardTarget;
    readonly amenityShareMin: StandardTarget;
    readonly amenityShareMax: StandardTarget;
  };
  readonly scenarios: readonly {
    readonly scenarioId: string;
    readonly label: string;
    /** True when this plot's own brief supersedes the general standard. */
    readonly fromBrief: boolean;
    readonly citation: CitationView;
    readonly rangeNote?: string;
    readonly basis: string;
    readonly entries: readonly {
      readonly typeId: string;
      readonly label: string;
      readonly share: string;
      readonly nsaM2: string;
      readonly derivation: string;
    }[];
  }[];
}

/**
 * A practice statement — what a named practitioner says the practice is.
 *
 * The third kind of instrument, and the weakest. A regulation says what may be
 * built; a developer's brief says what a client will pay for; this says what one
 * architect has seen done. It travels on its own endpoint so the three can never
 * be shown in the same ink by accident.
 */
export interface PracticeStatementView {
  readonly statementId: string;
  readonly subject: string;
  readonly value: string;
  readonly statedBy: { readonly name: string; readonly role: string };
  readonly statedOn: string;
  readonly source: string;
  /** Their own words, in their own language. Rendered verbatim, never translated away. */
  readonly verbatim: string;
  readonly translation: string;
  /** Where the claim stops. The field a reader needs and a practitioner offers last. */
  readonly limits: string;
}

export interface StatementsView {
  readonly statements: readonly PracticeStatementView[];
  /** The id of the parking-in-FAR statement, or null if the file holds none. */
  readonly parkingInFar: string | null;
  readonly disclaimer: string;
}

export interface StandardsView {
  readonly standards: readonly DeveloperStandardView[];
  /** The brief for this plot, when the file holds one. */
  readonly brief: {
    readonly briefId: string;
    readonly plotNumber: string;
    readonly citation: CitationView;
    readonly plotAreaM2: StandardTarget;
    readonly gfaM2: StandardTarget;
    readonly far: StandardTarget;
    readonly heightCode: StandardTarget;
    readonly landUse: StandardTarget;
    readonly notMechanized: readonly string[];
  } | null;
  readonly disclaimer: string;
  /**
   * Present when the deployment does not offer developer standards, with the
   * reason. The list is then empty, and must not read as "there are none".
   */
  readonly withheld?: string;
}

export interface RunRequestBody {
  readonly plotId: string;
  readonly parkingInFar: 'COUNTS_TOWARD_FAR' | 'EXCLUDED_FROM_FAR' | 'OPEN_REGULATORY_QUESTION';
  /**
   * The recorded statement this answer came from, when it came from one.
   *
   * Sent only when the answer is the one the statement records and the reader
   * left it as it was pre-filled. Send it with a different treatment and the
   * server refuses: a run may not put its own answer under somebody else's name.
   */
  readonly parkingInFarStatementId?: string;
  readonly unitMix: {
    readonly source: 'USER_SET' | 'ASSUMED';
    readonly entries: readonly {
      readonly typeId: string;
      readonly label: string;
      readonly share: string;
      readonly nsaM2: string;
    }[];
    readonly basis?: string;
  };
  readonly parkingLevelsAvailable: number;
  /**
   * Levels standing on the podium footprint, **the ground floor included**.
   *
   * Omitted, the engine assumes one podium level, in amber. `G+2P+8` is three,
   * not two — send `levels` and let the engine do that arithmetic in one place.
   */
  readonly podiumLevels?: number;
  /**
   * The level schedule: basements, the ground floor, the podium.
   *
   * Sent, it supplies both `parkingLevelsAvailable` and `podiumLevels`, and the
   * run stops calling the placement of the parking an assumption — two integers
   * could never say whether four parking levels are two basements and two podium
   * levels or the other way round.
   */
  readonly levels?: {
    readonly basements: number;
    readonly groundIsParking: boolean;
    readonly podiumAboveGround: number;
    readonly podiumParkingLevels: number;
  };
  /**
   * The core's plan area on a typical level, m².
   *
   * Omitted, the engine assumes 18% of the tower plate, in amber, with a basis
   * and a measured sensitivity. Sent, it is `USER_SET` by the actor.
   *
   * **It subtracts from nothing.** A core is inside GFA and outside saleable
   * area, so the saleable figure sent below already carries it; on a parking
   * level it is inside what the usable fraction deducts. The engine draws it and
   * reconciles it against both, and never charges for it twice.
   */
  readonly coreAreaM2?: string;
  /**
   * Where the core stands: against the plot boundary with this `seq`. Omitted,
   * the engine centres it on the plate and marks that as assumed. Sent, it is
   * `USER_SET` by the actor — the only way the core moves.
   */
  readonly corePosition?: { readonly edgeSeq: number };
  /**
   * How cars climb between parking levels. Omitted, the engine assumes a straight
   * strip and says so; sent, it is `USER_SET` by the actor.
   */
  readonly rampForm?: 'STRAIGHT' | 'U_TURN' | 'LOOP';
  readonly parkingUsableFraction: {
    readonly value: string;
    readonly source: 'DERIVED' | 'ASSUMED';
    readonly basis?: string;
  };
  /**
   * Saleable area, as a share of GFA **or** as an area. Required, with no default.
   *
   * The engine used to take 1.00 implicitly here, which treated every square
   * metre of GFA as saleable and overstated the unit count on every run.
   *
   * EXACTLY ONE OF THE TWO, and the type says so rather than the server saying
   * so afterwards. A reader whose figure is an area — which is the figure a
   * developer's brief actually states — should not have to divide it by a GFA
   * the engine has not computed yet; the engine does that division and publishes
   * both numbers, so whichever one was not typed can still be checked.
   */
  readonly saleableEfficiency: {
    readonly source: 'USER_SET' | 'DERIVED';
    readonly basis?: string;
  } & (
    | { readonly value: string; readonly saleableAreaM2?: undefined }
    | { readonly saleableAreaM2: string; readonly value?: undefined }
  );
  readonly realismDiscount: string;
  readonly useDraftRules: boolean;
}

// ---------------------------------------------------------------------------

export const api = {
  health: (actor: Actor) =>
    call<{ status: string; engineVersion: string; annexVersion: string; annexSigned: boolean }>(
      '/api/health',
      { actor, method: 'GET' },
    ),

  definitions: (actor: Actor) =>
    call<{
      version: string;
      signed: boolean;
      pendingApproval: readonly string[];
      definitions: readonly {
        metricId: string;
        name: string;
        unit: string;
        formulaStatement: string;
        inclusions: readonly string[];
        exclusions: readonly string[];
        approvalStatus: string;
        note?: string;
      }[];
    }>('/api/definitions', { actor, method: 'GET' }),

  rules: (actor: Actor) =>
    call<{ approved: readonly RuleSummary[]; pending: readonly RuleSummary[]; warning: string }>(
      '/api/rules',
      { actor, method: 'GET' },
    ),

  createPlot: (actor: Actor, body: unknown) =>
    call<PlotCreated>('/api/plots', { actor, method: 'POST', body: JSON.stringify(body) }),

  getPlot: (actor: Actor, plotId: string) =>
    call<PlotView>(`/api/plots/${plotId}`, { actor, method: 'GET' }),

  createRun: (actor: Actor, body: RunRequestBody) =>
    call<RunView>('/api/runs', { actor, method: 'POST', body: JSON.stringify(body) }),

  getRun: (actor: Actor, runId: string) =>
    call<RunView>(`/api/runs/${runId}`, { actor, method: 'GET' }),

  provenance: (actor: Actor, runId: string, nodeId: string) =>
    call<ProvTree>(`/api/runs/${runId}/provenance/${nodeId}`, { actor, method: 'GET' }),

  compareParkingInFar: (actor: Actor, body: RunRequestBody) =>
    call<ParkingComparison>('/api/runs/parking-in-far-comparison', {
      actor,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  acknowledgeGate: (actor: Actor, runId: string, gate: string, subjectHash: string) =>
    call<{ gates: Record<string, unknown> }>(`/api/runs/${runId}/gates`, {
      actor,
      method: 'POST',
      body: JSON.stringify({ gate, subjectHash }),
    }),

  statements: (actor: Actor) => call<StatementsView>('/api/statements', { actor }),

  standards: (actor: Actor, plotNumber?: string) =>
    call<StandardsView>(
      `/api/standards${plotNumber ? `?plotNumber=${encodeURIComponent(plotNumber)}` : ''}`,
      { actor },
    ),

  dashboard: (actor: Actor) => call<DashboardView>('/api/dashboard', { actor }),

  listPlots: (actor: Actor) =>
    call<{ total: number; plots: readonly PlotSummary[] }>('/api/plots', { actor }),

  listRuns: (actor: Actor) =>
    call<{ total: number; runs: readonly RunSummary[] }>('/api/runs', { actor }),

  exportRun: (actor: Actor, runId: string) =>
    call<ExportResult>(`/api/runs/${runId}/export`, { actor, method: 'POST' }),

  /**
   * The rendered report, as text.
   *
   * A separate call because it is not JSON and the generic `call` helper parses
   * one. The caller turns it into a Blob and hands the browser a URL — the
   * document is produced by the server and is the same bytes the JSON export
   * describes, so there is no second rendering path to drift.
   */
  exportRunHtml: async (actor: Actor, runId: string, format: 'html' | 'sheets' = 'html'): Promise<string> => {
    const res = await fetch(`/api/runs/${runId}/export?format=${format}`, {
      method: 'POST',
      headers: headers(actor, false),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string; message?: string };
      throw new ApiError(res.status, body.error ?? 'Error', body.message ?? res.statusText);
    }
    return res.text();
  },

  /**
   * A binary export — DXF or XLSX — as a Blob the browser can save.
   *
   * Separate from `exportRun` for the same reason as the HTML one: the generic
   * helper parses JSON, and a spreadsheet is not JSON. The gates are enforced
   * server-side, so a 4xx here is a real refusal and its message is worth
   * showing rather than swallowing.
   */
  exportRunFile: async (
    actor: Actor,
    runId: string,
    format: 'dxf' | 'xlsx' | 'glb',
    /** One sheet of the drawing set, by its stable id. DXF only; omitted, the whole building. */
    sheetId?: string,
  ): Promise<Blob> => {
    const sheet = sheetId ? `&sheet=${encodeURIComponent(sheetId)}` : '';
    const res = await fetch(`/api/runs/${runId}/export?format=${format}${sheet}`, {
      method: 'POST',
      headers: headers(actor, false),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      throw new ApiError(res.status, body.error ?? 'Error', body.message ?? res.statusText);
    }
    return res.blob();
  },

  /**
   * Read an affection plan.
   *
   * The file is sent base64 in a JSON body rather than as multipart — an
   * affection plan is one sheet of about 1.5 MB, and this keeps the contract
   * inspectable with `curl`. It returns what the sheet says *and what it does
   * not*; nothing is persisted, because the point of the review screen is that
   * a person looks before a number enters the system.
   */
  readAffectionPlan: async (actor: Actor, attachment: Attachment): Promise<AffectionPlanRead> =>
    call<AffectionPlanRead>('/api/intake/affection-plan', {
      actor,
      method: 'POST',
      body: JSON.stringify(attachment),
    }),
};

/**
 * The deployment status, as `/api/dashboard` returns it.
 *
 * `readiness` is first in the type for the same reason it is first on the
 * screen. If a future field ever offers a single composite score, this is where
 * to refuse it: no number here summarises the four below, because a summary is
 * something a reader stops at.
 */
export interface DashboardView {
  readonly generatedAt: string;
  readonly engineVersion: string;
  readonly readiness: {
    /** Approved by a *named professional*, not by the development placeholder. */
    readonly rulesApproved: number;
    readonly rulesTotal: number;
    readonly definitionsSigned: number;
    readonly definitionsTotal: number;
    readonly annexVersion: string;
    readonly annexSigned: boolean;
    /** Checks that ran on the most recent run. Dormant is not a pass. */
    readonly invariantsRan: number | null;
    readonly invariantsTotal: number;
    readonly blocking: string;
  };
  readonly volume: {
    readonly plots: number;
    readonly runs: number;
    readonly runsShown: number;
    readonly exported: number;
    readonly reviewed: number;
  };
  readonly governingBands: Record<string, number>;
  readonly assumptionExposure: readonly {
    readonly parameterId: string;
    readonly runs: number;
    readonly maxRelativeEffect: string;
    readonly basis: string;
  }[];
  readonly deferred: readonly {
    readonly ruleId: string;
    readonly parameterId: string;
    readonly isLifeSafety: boolean;
    readonly citation: { readonly instrumentId: string; readonly clauseReference: string };
  }[];
  readonly recentRuns: readonly RunSummary[];
}

export interface RunSummary {
  readonly runId: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly plotId: string;
  readonly plotNumber: string;
  readonly community: string;
  readonly plotAreaM2: string;
  readonly draftRules: boolean;
  readonly governingBand: string;
  readonly governingGfaM2: string;
  readonly levels: string;
  readonly bindingRuleId: string;
  readonly bindingLabel: string;
  readonly assumptionCount: number;
  readonly invariants: {
    readonly ran: number | null;
    readonly total: number;
    readonly dormant: number | null;
    readonly passed: boolean | null;
  };
  readonly lifeSafetyDeferred: number | null;
  /** The export gates signed — G3 and G4, the only gates a stored run can hold. */
  readonly gatesSatisfied: number;
  readonly reviewer: { readonly name: string; readonly at: string } | null;
}

export interface PlotSummary {
  readonly plotId: string;
  readonly plotNumber: string;
  readonly community: string;
  readonly landUse: string;
  readonly shapeClass: string;
  readonly computedAreaM2: string;
  readonly areaMismatch: boolean;
  readonly frontageCount: number;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly runCount: number;
}

export interface ExportResult {
  readonly runId: string;
  /** Hash over the run's inputs and versions — "the same question was asked". */
  readonly fingerprint: string;
  /** Hash over the rendered content — "the same answer came back". §13.4. */
  readonly reportFingerprint: { readonly algorithm: string; readonly digest: string };
  readonly engineVersion: string;
  readonly annexVersion: string;
  /** Non-null while the metric definitions annex is unsigned. `FR-DEF-001 AC4`. */
  readonly annexNotice: string | null;
  readonly ruleSetHash: string;
  readonly draftRules: boolean;
  readonly warning?: string;
  readonly document: unknown;
}

/** Square metres and the exact square feet beside them. */
export interface AreaPair {
  readonly m2: string;
  readonly ft2: string;
}

/** An area the engine traced, with its square feet. */
export interface TracedArea extends AreaPair {
  readonly traced: TracedWire;
}

export interface GfaStatementView {
  readonly plotArea: AreaPair;
  readonly allowed: TracedArea;
  readonly rows: readonly {
    readonly kind: 'RESIDENTIAL' | 'PARKING';
    readonly levelIds: readonly string[];
    readonly count: number;
    readonly perLevel: TracedArea | null;
    readonly area: TracedArea;
  }[];
  readonly proposed: TracedArea;
  readonly remaining: TracedArea;
  readonly partFloorNotPlaced: AreaPair;
}
