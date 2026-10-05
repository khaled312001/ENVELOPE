/**
 * The wire shape of a run. Serialises the engine's output; computes nothing.
 *
 * Its own module rather than a function inside `server.ts` for one reason worth
 * stating: this is the contract the web app compiles against, and a contract
 * that can only be reached by importing a Fastify instance is a contract nobody
 * can test without starting a server. Here it is a pure function of the
 * engine's output, so a render test can build a real payload — not a fixture
 * that drifts — and put it through the screens.
 *
 * The rule that governs this file: **nothing here computes a number a user will
 * see.** Every figure arrives already `Traced`. A presenter that did arithmetic
 * would be a number with no derivation behind it, which is the one thing the
 * architecture is arranged to prevent.
 */

import {
  ANNEX_VERSION,
  Decimal,
  type Plot,
  toWire,
} from '@envelope/core';
import {
  type buildAssumptionRegister,
  explainGoverningBand,
  type GfaStatement,
  type runPipeline,
} from '@envelope/capacity';
import { SEED_RULES_WARNING } from '@envelope/rules';

import { presentChecks, type RunChecks } from './checks.js';

export const ENGINE_VERSION = '0.1.0';

/** A plot-space point on the wire: metres, three decimals, as strings. */
function point(p: { readonly x: number; readonly y: number }): {
  readonly x: string;
  readonly y: string;
} {
  return {
    x: new Decimal(p.x).div(1000).toFixed(3),
    y: new Decimal(p.y).div(1000).toFixed(3),
  };
}

/**
 * One vehicle-access option.
 *
 * Every option is sent, not only the winner. The client's ask was "tell me the
 * entrance is better from here" — a recommendation he can overrule — and a
 * screen that shows one answer with no alternatives cannot be overruled, only
 * obeyed.
 */
function candidate(c: {
  readonly edgeSeq: number;
  readonly hierarchy: string | undefined;
  readonly usableWindowM: Decimal;
  readonly centreOffsetM: Decimal;
  readonly widthM: Decimal;
  readonly opening: { readonly start: { x: number; y: number }; readonly end: { x: number; y: number } };
  readonly rank: number;
  readonly rationale: string;
}) {
  return {
    edgeSeq: c.edgeSeq,
    hierarchy: c.hierarchy ?? null,
    usableWindowM: c.usableWindowM.toFixed(2),
    centreOffsetM: c.centreOffsetM.toFixed(2),
    widthM: c.widthM.toFixed(2),
    opening: { start: point(c.opening.start), end: point(c.opening.end) },
    rank: c.rank,
    rationale: c.rationale,
  };
}

export function presentRun(
  runId: string,
  plot: Plot,
  output: ReturnType<typeof runPipeline>,
  register: ReturnType<typeof buildAssumptionRegister>,
  elapsedMs: number,
  draftRules: boolean,
  checks: RunChecks,
) {
  const { envelope, parking, capacity, graph, levelPlan } = output;
  return {
    runId,
    engineVersion: ENGINE_VERSION,
    annexVersion: ANNEX_VERSION,
    elapsedMs: Math.round(elapsedMs),
    /** `P0-S5`: full computation under 10 s. Reported so it can be held to. */
    withinRuntimeBudget: elapsedMs < 10_000,
    draftRules,
    ...(draftRules ? { warning: SEED_RULES_WARNING } : {}),

    plot: {
      plotId: plot.plotId,
      plotNumber: plot.plotNumber,
      community: plot.community,
      areaM2: new Decimal(plot.computedAreaMm2).div(1_000_000).toFixed(2),
      shapeClass: plot.shapeClass,
    },

    envelope: {
      setbackPermittedFootprint: toWire(envelope.setbackPermittedFootprint),
      coverageCap: toWire(envelope.coverageCap),
      podiumFootprint: toWire(envelope.podiumFootprint),
      towerPlateCap: toWire(envelope.towerPlateCap),
      heightCeilingM: toWire(envelope.heightCeilingM),
      floorToFloorM: toWire(envelope.floorToFloorM),
      maxLevelsByHeight: toWire(envelope.maxLevelsByHeight),
      /**
       * The envelope as polygons, not only as areas.
       *
       * The massing view and the CAD export both need an outline, and both used
       * to be handed a square metre figure and left to invent a shape from it.
       * An invented shape is a drawing of a building that was never computed.
       */
      podiumOutline: envelope.podiumRing.map(point),
      towerOutline: envelope.plateRing.map(point),
      appliedSetbacks: envelope.appliedSetbacks.map((s) => ({
        seq: s.seq,
        setbackM: s.valueM.toFixed(3),
        ruleId: s.ruleId,
      })),
      bindingConstraints: envelope.bindingConstraints.map((b) => ({
        dimension: b.dimension,
        ruleId: b.ruleId,
        label: b.label,
        value: b.valueM.toFixed(3),
        runnerUp: b.runnerUp
          ? {
              ruleId: b.runnerUp.ruleId,
              label: b.runnerUp.label,
              value: b.runnerUp.valueM.toFixed(3),
              withinOnePercent: b.runnerUp.withinOnePercent,
            }
          : null,
      })),
      /**
       * Surfaced deliberately. §11.7 step 6 requires the iteration history to be
       * part of the provenance graph and the report to state how many iterations
       * were required — and on this product it is also the evidence that the
       * setback circularity was resolved rather than assumed away.
       */
      fixpoint: {
        converged: envelope.fixpointConverged,
        iterations: envelope.fixpointIterations,
        history: envelope.fixpoint.history.map((h) => ({ index: h.index, note: h.note })),
      },
    },

    parking: {
      residentBays: toWire(parking.residentBays),
      visitorBays: toWire(parking.visitorBays),
      totalBays: toWire(parking.totalBays),
      bayAreaFactorM2: toWire(parking.bayAreaFactorM2),
      requiredAreaM2: toWire(parking.requiredAreaM2),
      levelsRequired: toWire(parking.levelsRequired),
      levelsAvailable: toWire(parking.levelsAvailable),
      headroomBays: parking.headroomBays.toFixed(0),
      supportableUnitCeiling: toWire(parking.supportableUnitCeiling),
      podiumImplication: parking.podiumImplication,
    },

    /**
     * The parking level as rectangles, and where the cars get in.
     *
     * Coordinates are metres to three decimals, as strings, matching
     * `/api/plots/:id`. A drawing is a set of numbers a user will look at and
     * measure off, and this codebase does not put those in a `number`.
     *
     * `null` rather than an empty object when the level could not be laid out:
     * a screen that renders an empty plan reads as "no bays", and the reason is
     * in `levelPlanRefusal` where it can be shown instead.
     */
    levelPlan: levelPlan
      ? {
          bayCount: toWire(levelPlan.bayCount),
          areaPerBayM2: toWire(levelPlan.areaPerBayM2),
          deductionsM2: toWire(levelPlan.deductionsM2),
          moduleDepthM: toWire(levelPlan.layout.moduleDepthM),
          usableAreaM2: toWire(levelPlan.layout.usableAreaM2),
          orientation: toWire(levelPlan.layout.orientation),
          /*
            Three losses, never one efficiency. A reader who is short of parking
            needs to know which of the three to argue with, and "84% efficient"
            tells them none of it: the reserved zone is the usable fraction's to
            answer for, the cross aisle is the price of every bay being
            reachable, and the footprint loss belongs to the plot's own shape.
          */
          losses: {
            reserved: {
              areaM2: levelPlan.losses.reserved.areaM2.toFixed(0),
              bays: levelPlan.losses.reserved.bays,
            },
            circulation: {
              areaM2: levelPlan.losses.circulation.areaM2.toFixed(0),
              bays: levelPlan.losses.circulation.bays,
              strandedBays: levelPlan.losses.circulation.strandedBays,
            },
            footprint: {
              areaM2: levelPlan.losses.footprint.areaM2.toFixed(0),
              bays: levelPlan.losses.footprint.bays,
            },
          },
          standard: {
            angle: levelPlan.layout.standard.angle,
            driveway: levelPlan.layout.standard.driveway,
            bayWidthM: levelPlan.layout.standard.bayWidthM,
            bayLengthM: levelPlan.layout.standard.bayLengthM,
            drivewayWidthM: levelPlan.layout.standard.drivewayWidthM,
          },
          podiumRing: levelPlan.podiumRing.map(point),
          packingRect: {
            widthM: levelPlan.packingRect.widthM.toFixed(3),
            depthM: levelPlan.packingRect.depthM.toFixed(3),
            exact: levelPlan.packingRect.exact,
            coveragePct: levelPlan.packingRect.coverage.times(100).toFixed(1),
            outline: levelPlan.packingRect.world.map(point),
          },
          rects: levelPlan.rects.map((r) => ({
            kind: r.kind,
            row: r.row,
            widthM: r.widthM.toFixed(3),
            heightM: r.heightM.toFixed(3),
            outline: r.world.map(point),
          })),
          access: {
            recommended: levelPlan.access.recommended
              ? {
                  ...candidate(levelPlan.access.recommended.value),
                  node: levelPlan.access.recommended.node,
                  provenanceClass: levelPlan.access.recommended.provenanceClass,
                }
              : null,
            candidates: levelPlan.access.candidates.map(candidate),
            rejected: levelPlan.access.rejected.map((r) => ({
              edgeSeq: r.edgeSeq,
              classification: r.classification,
              reason: r.reason,
            })),
          },
          notAssessed: levelPlan.notAssessed,
        }
      : null,
    levelPlanRefusal: output.levelPlanRefusal ?? null,

    /**
     * The envelope as volumes.
     *
     * Sent as footprints and traced heights, not as a mesh. The viewer extrudes;
     * it does not decide how tall anything is. A 3D view is the most persuasive
     * surface in the product, and a massing assembled by the renderer would be a
     * building nobody computed, drawn convincingly.
     */
    massing: {
      totalHeightM: toWire(output.massing.totalHeightM),
      masses: output.massing.masses.map((m) => ({
        id: m.id,
        label: m.label,
        footprint: m.footprint.map(point),
        baseM: toWire(m.baseM),
        heightM: toWire(m.heightM),
        levels: toWire(m.levels),
        note: m.note,
      })),
    },

    /**
     * The run as one building, exactly as the engine assembled it.
     *
     * Passed through, not re-shaped: it is plain JSON by construction (see
     * `BuildingModel` in `@envelope/core`), and every drawing of this run — the
     * sheets, the massing, the DXF — reads it. A presenter that re-shaped it would
     * be a fourth assembly of the same building, and the one most likely to drift.
     * Its geometry is integer millimetres in plot coordinates, unlike the metre
     * strings above; the model's own type says so and every reader converts once.
     */
    building: output.building,

    capacity: {
      bandA: toWire(capacity.regulationLimitedGfa),
      bandB: toWire(capacity.geometryLimitedGfa),
      bandC: toWire(capacity.parkingLimitedGfa),
      governingBand: capacity.governingBand,
      governingGfa: toWire(capacity.governingGfa),
      governingConstraint: {
        ruleId: capacity.governingConstraint.ruleId,
        label: capacity.governingConstraint.label,
        value: capacity.governingConstraint.valueM.toFixed(2),
      },
      headroomToNextM2: capacity.headroomToNextM2.toFixed(2),
      nextBindingBand: capacity.nextBindingBand,
      integerGranularityLossM2: capacity.integerGranularityLossM2.toFixed(2),
      userRealismDiscount: toWire(capacity.userRealismDiscount),
      levels: toWire(capacity.levels),
      /**
       * Saleable area, both ways round — the share and the square metres.
       *
       * BOTH TRAVEL, whichever one was entered. A reader who typed a share sees
       * the square metres it comes to on this envelope; a reader who typed an
       * area sees the share. A conversion done silently is a conversion nobody
       * checks, and this one moves the unit count by the whole of whatever is
       * not saleable.
       */
      saleableEfficiency: toWire(output.saleableEfficiency),
      saleableAreaM2: toWire(output.saleableAreaM2),
      /**
       * `FR-DEF-002`'s blocking question, as a value a reader can click.
       *
       * Band A's formula says which way it went; this says on whose authority.
       * It is the single input that moves capacity most — 15–35% — and until it
       * had a node of its own the answer reached the graph as a `detail` field
       * that no report could cite and no reader could open.
       */
      parkingInFarTreatment: toWire(output.parkingInFarTreatment),
      explanation: explainGoverningBand(capacity),
    },

    /**
     * The core — its area, its share of the plate, and what that share says
     * about the two inputs that already carry it.
     *
     * It is published beside the capacity and not inside it, because it is not
     * a capacity figure: a core is inside GFA and inside the saleable
     * efficiency, so nothing here is subtracted from anything above. The
     * reconciliation is the point of the block.
     */
    core: {
      areaM2: toWire(output.core.areaM2),
      plateShare: toWire(output.core.plateShare),
      placement: toWire(output.core.placement),
      reconciliation: output.core.reconciliation,
    },

    /**
     * The level schedule, and the height code it writes as — `2B+G+3P+35`.
     *
     * Null on a run computed from the two integers, which is every run stored
     * before the schedule existed. A reader of one of those sees a note saying
     * which model it was computed under; the engine never re-interprets it,
     * because re-reading an old answer under a new model changes a number
     * somebody has already been shown.
     */
    levels: output.levelSchedule,

    /**
     * The GFA statement — allowed, proposed, and the floors that make it up, in
     * square metres and square feet, laid out the way a submission drawing's
     * area table is. Every figure is the engine's, the square feet included.
     */
    gfaStatement: presentGfaStatement(output.gfaStatement),

    assumptions: register.map((a) => ({
      nodeId: a.nodeId,
      parameterId: a.parameterId,
      label: a.label,
      value: a.value,
      unit: a.unit ?? null,
      basis: a.basis,
      sensitivity: a.sensitivity,
    })),

    /**
     * The two independent layers, in every payload rather than behind a flag.
     *
     * §3.4 makes the invariant results, the deferred-check list and the
     * five-way claim statement required parts of *every* artifact. A `checks`
     * block a client can forget to request is a disclosure a client will forget
     * to request.
     */
    checks: presentChecks(checks),

    provenance: graph.toJSON(),
  };
}


/** Square metres and the engine's square feet beside them, both to two places. */
function areaPair(m2: Decimal, ft2: Decimal): { readonly m2: string; readonly ft2: string } {
  return { m2: m2.toFixed(2), ft2: ft2.toFixed(2) };
}

function presentGfaStatement(statement: GfaStatement) {
  const { ft2 } = statement;
  return {
    plotArea: areaPair(statement.plotAreaM2, ft2.plotArea),
    allowed: {
      traced: toWire(statement.allowedGfaM2),
      ...areaPair(statement.allowedGfaM2.value, ft2.allowed),
    },
    /*
      THE TWO ALLOWANCES, SEPARATE ON THE WIRE AS THEY ARE IN THE ENGINE.

      Every field but the kind is nullable and each null is its own fact, named in
      `notes`: nobody stated this allowance, or nothing is proposed against it. A
      `?? 0` to keep the shape rectangular would publish "this scheme has used
      none of a ceiling that does not exist", which is a figure nobody computed —
      and the screen has a row for a null and no row for a lie.
    */
    caps: statement.caps.map((c) => ({
      kind: c.kind,
      allowed:
        c.allowedM2 && c.allowedFt2
          ? { traced: toWire(c.allowedM2), ...areaPair(c.allowedM2.value, c.allowedFt2) }
          : null,
      proposed:
        c.proposedM2 && c.proposedFt2
          ? { traced: toWire(c.proposedM2), ...areaPair(c.proposedM2.value, c.proposedFt2) }
          : null,
      remaining:
        c.remainingM2 && c.remainingFt2
          ? { traced: toWire(c.remainingM2), ...areaPair(c.remainingM2.value, c.remainingFt2) }
          : null,
      notes: c.notes,
    })),
    rows: statement.rows.map((r) => ({
      kind: r.kind,
      cap: r.cap,
      levelIds: r.levelIds,
      count: r.count,
      perLevel:
        r.perLevelM2 && r.perLevelFt2
          ? { traced: toWire(r.perLevelM2), ...areaPair(r.perLevelM2.value, r.perLevelFt2) }
          : null,
      /* The count as the graph holds it. `r.count` is beside it for the table's
         "× 3"; this is what makes the row's area a PRODUCT a reader can open. */
      levelCount: r.levelCount ? toWire(r.levelCount) : null,
      area: { traced: toWire(r.areaM2), ...areaPair(r.areaM2.value, r.areaFt2) },
    })),
    /* A floor the table names and does not count. Carried as the engine worded
       it: a reason rephrased here would be a second account of the same floor. */
    omissions: statement.omissions.map((o) => ({ kind: o.kind, cap: o.cap, reason: o.reason })),
    reconciliation: statement.reconciliation,
    proposed: {
      traced: toWire(statement.proposedGfaM2),
      ...areaPair(statement.proposedGfaM2.value, ft2.proposed),
    },
    remaining: {
      traced: toWire(statement.remainingGfaM2),
      ...areaPair(statement.remainingGfaM2.value, ft2.remaining),
    },
    partFloorNotPlaced: areaPair(statement.partFloorNotPlacedM2, ft2.partFloorNotPlaced),
  };
}
