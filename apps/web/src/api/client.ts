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
  /**
   * The sheet's setbacks for this plot by boundary class, the TOWER row and the
   * PODIUM row apart (17 Oct 2026). Absent from a response older than that and
   * null where no plot was in hand; a screen reads "as the affection plan
   * states" off `tower` only, never off `podium`.
   */
  readonly setbacks?: SheetSetbacks | null;
  /**
   * What the sheet leaves open that stops a run on this plot until an instrument
   * fills it (17 Oct 2026). Absent from an older response.
   */
  readonly blocking?: readonly { readonly field: string; readonly label: string; readonly consequence: string }[];
  /** Seed placeholders a run on this plot did not load, because the plot has its own sheet. */
  readonly placeholdersNotApplied?: readonly {
    readonly ruleId: string;
    readonly parameterId: string;
    readonly value: string;
    readonly unit: string;
    readonly reason: string;
  }[];
  /** What a project brief the run named bound — a developer's document, not a regulation. */
  readonly briefBound?: readonly {
    readonly parameterId: string;
    readonly value: string;
    readonly unit: string;
    readonly clause: string;
  }[];
}

/** One face a sheet states a setback for — "front", "side", or a face with the sheet's condition. */
export interface SheetFace {
  readonly face: string;
  readonly metres: string | null;
}

/** A class's setback as the sheet states it: one figure, or a choice it leaves to the reader. */
export type SheetSetback =
  | { readonly kind: 'FIXED'; readonly metres: string; readonly clause: string }
  | { readonly kind: 'BY_FACE' | 'BY_FACADE'; readonly faces: readonly SheetFace[]; readonly clause: string };

export interface SheetSetbacks {
  readonly tower: Readonly<Record<string, SheetSetback>>;
  readonly podium: Readonly<Record<string, SheetSetback>>;
  /**
   * The same per boundary, keyed by `seq` (17 Oct 2026): a per-side table binds a
   * boundary, not its class, so the plot step reads this first.
   */
  readonly bySeq?: {
    readonly tower: Readonly<Record<string, SheetSetback>>;
    readonly podium: Readonly<Record<string, SheetSetback>>;
  };
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
  /**
   * What the plot's sheet did for THIS run (17 Oct 2026): the placeholders it did
   * not load and what a named brief bound. Absent on a run stored before.
   */
  readonly sheet?: SheetReport;
  /** The title block's words as stored with the run, and who stated them. Absent when none were. */
  readonly titleBlock?: TitleBlockBody & { readonly statedBy: string };
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
    /** Demand of the PROBE — the largest scheme the envelope allows — not of the reported answer. */
    readonly totalBays: TracedWire;
    /** What the reported capacity needs. Absent on a run stored before it was published. */
    readonly demandAtGoverning?: TracedWire;
    /** What the parking levels hold, as laid out. Absent on a run stored before it was published. */
    readonly providedBays?: TracedWire;
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
  /*
    The four below arrived on 16 Oct 2026, when the reader began placing the
    entrance along a boundary. Optional because a run stored before then does not
    carry them — and a screen that read them as present would place nothing there.
  */
  /** Where on the boundary B.7.2.1 lets an opening stand, metres from its first corner. */
  readonly window?: { readonly fromM: string; readonly toM: string };
  /** Whether each end of the boundary is a road junction, so the 15 m applies there. */
  readonly junctionAt?: { readonly start: boolean; readonly end: boolean };
  /** Where an opening's centre may stand: a 6 m gap, or a 3 m lane alone. Null where it does not fit. */
  readonly centreRange?: {
    readonly sixM: { readonly fromM: string; readonly toM: string } | null;
    readonly threeM: { readonly fromM: string; readonly toM: string } | null;
  };
  readonly arrangement?: VehicleAccessArrangement;
  readonly openings?: readonly AccessOpeningView[];
  readonly rank: number;
  readonly rationale: string;
}

export type VehicleAccessArrangement = 'TWO_WAY' | 'ONE_WAY_PAIR' | 'ONE_WAY_SEPARATE';

/** One gap in the boundary, and which way its cars cross it. */
export interface AccessOpeningView {
  readonly role: 'ENTRY_EXIT' | 'ENTRY' | 'EXIT';
  readonly edgeSeq: number;
  readonly centreOffsetM: string;
  readonly widthM: string;
  readonly start: WirePoint;
  readonly end: WirePoint;
}

/** Where a reader put one opening: a boundary, and its centre in metres from that boundary's first corner. */
export interface OpeningPlacementBody {
  readonly edgeSeq: number;
  readonly centreOffsetM?: string;
}

/**
 * The parking level, as rectangles.
 *
 * This is the screen the 30 Aug 2026 meeting was about. Every rectangle here was
 * placed by the engine; the drawing code below adds a colour and nothing else.
 */
export type ParkingArrangementId = 'WIDTH' | 'DEPTH' | 'PERIMETER' | 'SLOPED' | 'FIELD_WIDTH' | 'FIELD_DEPTH';

export interface LevelPlanView {
  readonly bayCount: TracedWire;
  readonly areaPerBayM2: TracedWire;
  readonly deductionsM2: TracedWire;
  readonly moduleDepthM: TracedWire;
  readonly usableAreaM2: TracedWire;
  /** Which way round the runs were laid, of the two the engine packed. */
  readonly orientation: TracedWire;
  /**
   * The arrangement laid out, and every one the level was packed in with its
   * count — the options a reader may pick from. Optional: runs stored before
   * 16 Oct 2026 carry neither.
   */
  readonly arrangement?: ParkingArrangementId;
  /**
   * Every turn between perpendicular aisles, checked at Table B.9's curved-ramp
   * radius and lane — both assumed, since the code states none for an aisle.
   * Optional: runs stored before 16 Oct 2026 carry none.
   */
  readonly turning?: {
    readonly innerRadiusM: TracedWire;
    readonly laneM: TracedWire;
    readonly fitting: TracedWire;
    readonly total: number;
  };
  readonly arrangements?: readonly {
    readonly id: ParkingArrangementId;
    readonly bayCount: number;
    readonly refusal?: string;
  }[];
  /**
   * The bays set aside on the level the street reaches: accessible ones under
   * DBC C.6.4 with their access aisles, and preferred ones under B.7.2.6.2.
   * Optional: runs stored before 16 Oct 2026 carry none.
   */
  readonly accessible?: {
    readonly onGrade: boolean;
    /**
     * Which level holds them: the ground floor where it parks, else the first
     * basement, else P1. Optional: runs stored before it existed carry `onGrade` only.
     */
    readonly level?: 'GROUND' | 'FIRST_BASEMENT' | 'FIRST_PODIUM';
    /** True where the level is the sloped ring above B.7.2.3.1's 2%, so none was placed. */
    readonly slopeBlocked?: boolean;
    readonly required: TracedWire;
    readonly placed: TracedWire;
    readonly vans: number;
    readonly lost: number;
    readonly bayCount: TracedWire;
    readonly farthestM: TracedWire | null;
    readonly preferred: { readonly required: TracedWire; readonly placed: number } | null;
    readonly notes: readonly string[];
  };
  /** Bays on each dead-end stretch of driveway, B.7.2.3.3 ¶8 (eight advised). Optional likewise. */
  readonly deadEnds?: readonly number[];
  /** Three separate losses, in bays and in square metres. Never one efficiency. */
  readonly losses: {
    readonly reserved: { readonly areaM2: string; readonly bays: number };
    readonly circulation: {
      readonly areaM2: string;
      readonly bays: number;
      readonly strandedBays: number;
      /** Of `bays`, those a ring's drive from the slab edge crosses. Absent on runs stored before 17 Oct 2026. */
      readonly entryDriveBays?: number;
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
    /** Optional: absent on runs stored before a choice could be made. */
    readonly chosen?: (AccessCandidateView & { readonly node: string }) | null;
    readonly candidates: readonly AccessCandidateView[];
    readonly rejected: readonly {
      readonly edgeSeq: number;
      readonly classification: string;
      readonly reason: string;
    }[];
  };
  readonly notAssessed: readonly string[];
  /**
   * The level at grade, where it parks: the drive from the entrance and the
   * substation's band on the road, and the bays each gave up. Optional: absent on
   * runs stored before 16 Oct 2026; null where the ground floor does not park.
   */
  readonly grade?: {
    readonly bayCount: TracedWire;
    readonly dropped: { readonly drive: number; readonly plant: number };
    readonly drives: readonly {
      readonly label: string;
      readonly role: 'ENTRY_EXIT' | 'ENTRY' | 'EXIT';
      readonly edgeSeq: number;
      readonly depthM: string;
    }[];
    readonly plantBand: { readonly edgeSeq: number; readonly outline: readonly WirePoint[] } | null;
    readonly notes: readonly string[];
  } | null;
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

/** Where a sheet's drawing sits on its grid: page points (y up) to grid metres. Mirrors `PagePlacement` in `@envelope/intake`. */
export interface SheetOnPage {
  readonly ax: number;
  readonly bx: number;
  readonly cx: number;
  readonly ay: number;
  readonly by: number;
  readonly cy: number;
  readonly plotBoxPt: readonly [number, number, number, number];
  readonly pageBoxPt: readonly [number, number, number, number];
  /** The drawing's own frame round the plot; no crop goes past it. */
  readonly frameBoxPt: readonly [number, number, number, number];
  readonly residualM: number;
  readonly basis: string;
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
    /**
     * What the sheet says about its boundaries, and what it does not.
     *
     * OPTIONAL ON THE WIRE, AND THAT IS NOT CAUTION. A reading taken before this
     * field existed — stored in a tab, restored from an autosaved draft, or
     * replayed by a test fixture — has no `edges`, and a required field would make
     * the screen throw on it. `packages/intake` types it as REQUIRED, because a
     * sheet parsed now always has one, even if every list in it is empty: "the
     * sheet supports no proposal" and "nobody asked" are different facts and the
     * empty object is how the first one is said.
     *
     * `classification` is a structured `Traced` rather than a `TracedWire`: the
     * route's `present` passes this subtree through whole — it is JSON-safe by
     * construction, with no `Decimal` anywhere in it — so there is no
     * `renderHint`, and the panel marks the class with the product's own chip.
     */
    readonly edges?: {
      readonly proposals: readonly {
        readonly role: 'FRONT' | 'SIDE' | 'REAR';
        readonly classification: {
          readonly value: string;
          readonly node: string;
          readonly parameterId: string;
          readonly provenanceClass: string;
        };
        readonly basedOn: readonly string[];
        readonly evidence: readonly {
          readonly verbatim: string;
          readonly page: number;
          readonly bbox: readonly [number, number, number, number];
          readonly label: string;
          readonly mass?: string;
        }[];
        /**
         * Prose on both fields. `effect` is NOT the assumption register's
         * `relativeEffect`, which is a decimal string this screen formats as a
         * percentage — the names are kept apart so the two cannot be crossed.
         */
        readonly sensitivity: {
          readonly perturbation: string;
          readonly effect: string;
        };
      }[];
      readonly missing: readonly {
        readonly field: string;
        readonly label: string;
        readonly consequence: string;
      }[];
      readonly roadLabels: readonly {
        readonly verbatim: string;
        readonly page: number;
        readonly bbox: readonly [number, number, number, number];
        readonly label: string;
      }[];
      readonly accessSide?: {
        readonly value: string;
        readonly provenanceClass: string;
      };
    };
    /**
     * The sheet's own site plan, and the plot's shape read off it.
     *
     * `pngBase64` is the picture as a file, for the map underlay — the whole
     * reason the extractor encodes rather than hands back pixels. `lengthM` is
     * absent on every leg when the sheet prints no total area: the drawing says
     * "Scale: NTS", so there is then nothing to scale it by and the angles
     * stand alone. Prose on both sensitivity fields, as on `edges`.
     */
    readonly sitePlan?: {
      readonly image?: {
        readonly pngBase64: string;
        readonly widthPx: number;
        readonly heightPx: number;
        readonly boxPt: readonly [number, number, number, number];
      };
      readonly outline?: {
        readonly legs: {
          readonly value: readonly {
            readonly index: number;
            readonly lengthM?: string;
            readonly bearingDeg: string;
            readonly lengthPx: string;
          }[];
          readonly node: string;
          readonly parameterId: string;
          readonly provenanceClass: string;
        };
        readonly areaM2?: string;
        readonly fit: {
          readonly residualPx: string;
          readonly pixelM?: string;
          readonly fillOfHull: string;
        };
        readonly sensitivity: {
          readonly perturbation: string;
          readonly effect: string;
        };
        readonly notModelled: readonly string[];
      };
      readonly refusals: readonly string[];
    };
    /**
     * The plot as its surveyor wrote it down, when the sheet prints a
     * coordinate table.
     *
     * NOT a second `sitePlan.outline`, and the difference is the whole point:
     * that one is a polygon fitted to a raster and published `ASSUMED`, this is
     * plane trigonometry on printed eastings and northings and is `DERIVED`. The
     * ring is only sent when its shoelace area reproduces the sheet's own
     * printed plot area, so a misread table never reaches this field.
     */
    readonly survey?: {
      readonly system: {
        readonly value: string;
        readonly node: string;
        readonly parameterId: string;
        readonly provenanceClass: string;
      };
      readonly points: {
        readonly value: readonly {
          readonly id: string;
          readonly east: string;
          readonly north: string;
        }[];
        readonly node: string;
        readonly parameterId: string;
        readonly provenanceClass: string;
      };
      readonly legs: {
        readonly value: readonly {
          readonly lengthM: string;
          readonly bearingDeg: string;
        }[];
        readonly node: string;
        readonly parameterId: string;
        readonly provenanceClass: string;
      };
      readonly areaM2: {
        readonly value: string;
        readonly provenanceClass: string;
      } | null;
      /**
       * Page points (y up) to grid metres, `e = ax·x + bx·y + cx`, `n = ay·x + by·y + cy`,
       * when the drawn plot matched the table. It places the sheet under the map and
       * changes no figure. See `packages/intake/src/on-page.ts`.
       */
      readonly onPage?: SheetOnPage;
      readonly notModelled: readonly string[];
    };
    /**
     * The plot off a vector drawing with a printed grid — the Municipality's
     * sheet, which prints no coordinate table. The same shape as `survey`, sent
     * on the same condition (its ring reproduces the printed area), except that
     * `system` is ASSUMED: the sheet does not name its grid. `edgeHints` is one
     * entry per boundary in ring order, null where nothing is labelled outside
     * it — a suggestion for the edge class, never an answer.
     */
    readonly drawn?: NonNullable<AffectionPlanRead['facts']['survey']> & {
      readonly onPage: SheetOnPage;
      readonly edgeHints: readonly ({
        readonly classification: 'ROAD' | 'ADJACENT_PLOT';
        readonly verbatim: string;
        readonly distanceM: string;
      } | null)[];
    };
    /** The sheet's own parking row, verbatim (the Municipality's sheet has one). */
    readonly parkingRequirement?: TracedWire | null;
    /** The developer's own plot number, where the sheet prints one beside the parcel id (17 Oct 2026). */
    readonly developerPlotNo?: TracedWire | null;
    /** The date the sheet stops being valid, as printed. */
    readonly expiryDate?: TracedWire | null;
    /**
     * The DDA's per-side setback table: the rows as printed and how each side was
     * placed on a surveyed boundary, or why none was. Its cells are plain JSON.
     */
    readonly sideSetbacks?: { readonly value: { readonly raw: string; readonly placement: string } } | null;
    /** `LAND USE / GFA SPLIT`, line by line, as printed. */
    readonly landUseSplit?: { readonly value: readonly { readonly use: string; readonly areaM2: string }[] } | null;
    /** Road labels no numbered side claims, as printed, with the sentence that says they are placed on nothing. */
    readonly unplacedRoads?: { readonly value: readonly string[]; readonly note: string } | null;
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
    /** Absent where the brief prints no FAR (plot 6468096's does not). */
    readonly far?: StandardTarget;
    readonly heightCode: StandardTarget;
    readonly landUse: StandardTarget;
    /** The level schedule the brief states, as printed. Information only; nothing binds it. */
    readonly levels?: StandardTarget;
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
  /** The podium statement's id: basements, ground and podium on the boundary where the sheet is silent. */
  readonly podiumSetbackStatementId?: string;
  /** The column-gap statement's id: a clear gap after every three bays, the gap the statement records. */
  readonly columnGapStatementId?: string;
  /** Tower setbacks typed by the reader, by edge, metres. USER_SET. */
  readonly typedSetbacks?: readonly { readonly edgeSeq: number; readonly metres: string }[];
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
   * The edge the reader chose for the vehicle entrance, from 0. Omitted, the
   * drawings show the B.7.2.1 recommendation; sent, they show this, `USER_SET`,
   * with the recommendation reported beside it.
   */
  readonly chosenAccessEdgeSeq?: number;
  /** The parking arrangement the reader picked from a run's `levelPlan.arrangements`. USER_SET. */
  readonly parkingArrangement?: ParkingArrangementId;
  /**
   * The entrance the reader placed: one two-way opening, or an entry and an
   * exit side by side or apart, each at a point along its boundary. Never sent
   * with `chosenAccessEdgeSeq` — the server refuses two answers to one question.
   */
  readonly vehicleAccess?: {
    readonly arrangement: VehicleAccessArrangement;
    readonly entry: OpeningPlacementBody;
    readonly exit?: OpeningPlacementBody;
  };
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
    /** ASSUMED needs a basis and a ratio; see `SaleableEfficiencyInput`. */
    readonly source: 'USER_SET' | 'DERIVED' | 'ASSUMED';
    readonly basis?: string;
  } & (
    | { readonly value: string; readonly saleableAreaM2?: undefined }
    | { readonly saleableAreaM2: string; readonly value?: undefined }
  );
  readonly realismDiscount: string;
  readonly useDraftRules: boolean;
  /**
   * The project brief the reader chose for this plot, by its id (17 Oct 2026).
   * Offered, never pre-selected: absent, nothing is taken from any brief. The
   * server refuses an id that is not this plot's, in a sentence.
   */
  readonly projectBriefId?: string;
  /**
   * The title block's words. Every field optional and none defaulted; printable
   * ASCII only, because they print in the DXF. Absent fields print NOT STATED.
   */
  readonly titleBlock?: TitleBlockBody;
}

/** What the reader calls the job, for the drawings' title block. */
export interface TitleBlockBody {
  readonly projectName?: string;
  readonly client?: string;
  readonly consultant?: string;
  readonly description?: string;
  readonly status?: string;
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
  exportRunHtml: async (
    actor: Actor,
    runId: string,
    format: 'html' | 'sheets' | 'audit' = 'html',
    /** The language the study report is written in; the drawing set and the audit are English. */
    lang: 'en' | 'ar' = 'en',
  ): Promise<string> => {
    const res = await fetch(`/api/runs/${runId}/export?format=${format}&lang=${lang}`, {
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

  /** Whether Claude's reading of a step is switched on for this deployment. */
  advisorStatus: (actor: Actor): Promise<{ readonly enabled: boolean }> =>
    call<{ readonly enabled: boolean }>('/api/advisor', { actor, method: 'GET' }),

  /** Claude's reading of one step against the Dubai Building Code. Text beside the figures; it changes none of them. */
  advise: (actor: Actor, body: AdviseBody): Promise<AdviseResult> =>
    call<AdviseResult>('/api/advise', { actor, method: 'POST', body: JSON.stringify(body) }),
};

export type AdviseStudioStep = 'sheet' | 'plot' | 'rules' | 'capacity' | 'parking' | 'checks' | 'export';

export interface AdviseBody {
  /** A studio step, or `refusal` for any error shown on one (`at` says which). */
  readonly step: AdviseStudioStep | 'refusal';
  readonly locale: 'ar' | 'en';
  readonly runId?: string;
  readonly at?: AdviseStudioStep;
  /** The inputs Claude may propose to change, with their values now; absent, it proposes nothing. */
  readonly editable?: Readonly<Record<string, string>>;
  readonly refusal?: string;
  readonly request?: unknown;
}

/** A change Claude proposes to one input, on a clause of the code. The reader applies it, or does not. */
export interface AdvisorEdit {
  readonly field: string;
  readonly value: string;
  readonly clause: string;
  readonly why: string;
}

export interface AdviseResult {
  readonly text: string;
  /** Proposals only; absent on a deployment that predates them. */
  readonly edits?: readonly AdvisorEdit[];
  readonly model: string;
  readonly consulted: readonly string[];
}

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
  /** The plot ring and setback line off the stored model, in mm; `null` before it existed. */
  readonly outline?: {
    readonly plot: readonly (readonly [number, number])[];
    readonly setback: readonly (readonly [number, number])[];
  } | null;
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

/** What a row of the schedule is. Seven, because a drawing's table has seven. */
export type GfaRowKindView =
  | 'GROUND'
  | 'PODIUM'
  | 'TYPICAL'
  | 'UNPLACED'
  | 'PARKING'
  | 'COMMERCIAL'
  | 'ROOF';

/** Which allowance a row draws on. Two, capped separately and summed at the end. */
export type GfaCapKindView = 'RESIDENTIAL' | 'COMMERCIAL';

/**
 * The area table, as the client's own drawings print one.
 *
 * `docs/03-analysis/client-drawings-2026-10-05.md` §4 is the specification — his
 * worked scheme, transcribed. Three things in it are why this type is wider than
 * a list of areas: a row is a GROUP of identical levels printed as "625.55 × 3",
 * commercial and residential are capped separately and meet on the ground floor,
 * and a floor the table names without counting is a ROW rather than an absence.
 * `packages/report/src/json.ts`'s `GfaStatementSection` carries the argument in
 * full; this is the same shape in the run view's units.
 */
export interface GfaStatementView {
  readonly plotArea: AreaPair;
  readonly allowed: TracedArea;
  /** Residential first. A null is a stated absence, never a zero. */
  readonly caps: readonly {
    readonly kind: GfaCapKindView;
    readonly allowed: TracedArea | null;
    readonly proposed: TracedArea | null;
    readonly remaining: TracedArea | null;
    readonly notes: readonly string[];
  }[];
  readonly rows: readonly {
    readonly kind: GfaRowKindView;
    readonly cap: GfaCapKindView;
    readonly levelIds: readonly string[];
    readonly count: number;
    readonly perLevel: TracedArea | null;
    /** The count as an operand of `area`, so the product is openable. */
    readonly levelCount: TracedWire | null;
    readonly area: TracedArea;
  }[];
  /** Floors named and not counted — the roof's stair head, a part floor. */
  readonly omissions: readonly {
    readonly kind: GfaRowKindView;
    readonly cap: GfaCapKindView;
    readonly reason: string;
  }[];
  /** What the uniform-plate model does not model. Moves no figure. */
  readonly reconciliation: readonly string[];
  readonly proposed: TracedArea;
  readonly remaining: TracedArea;
  readonly partFloorNotPlaced: AreaPair;
}
