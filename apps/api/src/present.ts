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
      explanation: explainGoverningBand(capacity),
    },

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

