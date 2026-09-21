/**
 * Developer standards and project briefs — the second kind of instrument.
 *
 * A regulation says what may be built. A developer standard says what *this
 * client will pay for*, and the two are not the same document, not written by
 * the same body, and must never be shown in the same ink. The client made this
 * the centre of the ask on 30 Aug 2026:
 *
 *   "كل ال developers الكبيره هنا عامله واحد زيه علشان اي شركه استشاريه تمشي
 *    عليه ويكون الشغل كلو واحد. الشطاره بس ف انك تعرف توصل لعدد الوحدات الي
 *    المطور بيسعالها فكل قطعه ارض من ال RFP"
 *
 * — the skill is reaching the unit count the developer prices for.
 *
 * **These are deliberately not `RuleRecord`s.** A `RuleRecord` is resolvable by
 * `resolveParameter` and can bind the envelope; a developer standard must never
 * do either. Azizi's 340 ft² studio cap is a commercial preference, and a plot
 * whose envelope was cut by one would be reporting a *client's brief* as a legal
 * limit. Separate type, separate module, no path between them — the same
 * argument as `invariants` not importing `capacity`, at a smaller scale.
 *
 * What they may legitimately do is fill the inputs a run has no other source
 * for: the unit mix, the saleable-area efficiency, the parking overage. Each
 * carries its own citation to the page and box it was read from, and is
 * `USER_SET` in the provenance graph — because choosing to build to a
 * developer's brief is a decision a person made, not a rule anyone imposed.
 */

import type { Citation } from '@envelope/core';

/**
 * A unit-area cap, as the standard states it: in square feet, as a maximum.
 *
 * Square feet because that is the unit the document is written in, and
 * converting on the way in would put a rounded metric number where the
 * verbatim source text should be. The conversion happens once, at the point of
 * use, with a formula in the provenance graph.
 */
export interface UnitAreaCap {
  readonly typeId: string;
  readonly label: string;
  /** Where in the building. Podium and tower caps differ, sometimes sharply. */
  readonly position: 'TOWER' | 'PODIUM';
  /**
   * Sub-variants within one type, each with the share of that type it applies
   * to. Azizi's 1-bedroom is 80% at 650 ft² and 20% at 680 ft² — one type, two
   * caps, and averaging them without saying so would lose the reason (a half
   * bathroom).
   */
  readonly variants: readonly {
    readonly maxAreaFt2: string;
    readonly shareOfType: string;
    readonly note?: string;
  }[];
  readonly citation: Citation;
}

/** One named mix — "best case", "worst case". Shares must total exactly 1. */
export interface MixScenario {
  readonly scenarioId: string;
  readonly label: string;
  readonly entries: readonly { readonly typeId: string; readonly share: string }[];
  readonly citation: Citation;
  /**
   * Where the document states a range and this record uses one end of it.
   *
   * Azizi's best case reads "80-85%" for studios against 18% and 2% for the
   * other two — only the low end totals 100%. Using it is the arithmetic the
   * document implies, but it is still a choice, and a choice made silently is
   * the kind this product exists to refuse.
   */
  readonly rangeNote?: string;
}

/** A stated target with a citation. Not a limit; a thing to be measured against. */
export interface Target {
  readonly value: string;
  readonly citation: Citation;
  readonly note?: string;
}

export interface DeveloperTargets {
  /**
   * Saleable area over GFA. "GFA achievement is critical. Expectations are
   * between 93%-97% (SA / GFA)".
   *
   * The most consequential number in the whole document, and the one the engine
   * had been quietly assuming was 1.00: units = GFA ÷ area-per-unit only holds
   * if every square metre of GFA is saleable, and none of it is — cores,
   * corridors, walls, plant and amenities are all inside GFA and none of them
   * sells. Assuming 1.00 overstated the unit count by 3–7% on every run.
   */
  readonly saleableEfficiencyMin: Target;
  readonly saleableEfficiencyMax: Target;
  /** Balcony area as a share of the unit's sellable area. */
  readonly balconyShareTarget: Target;
  readonly balconyShareMax: Target;
  /** "Car park minimum efficiency should achieve: 37.5 m2 per car". */
  readonly parkingAreaPerBayM2: Target;
  /** "Parking count to be 5% more than the minimum required." */
  readonly parkingOverage: Target;
  readonly amenityShareMin: Target;
  readonly amenityShareMax: Target;
  /** Ground-floor retail: the authority limit, or this share of ground BUA. */
  readonly retailGroundFloorShare: Target;
}

export interface DeveloperStandard {
  readonly standardId: string;
  readonly developer: string;
  readonly title: string;
  /** The document as a whole. Individual figures carry their own citations. */
  readonly citation: Citation;
  readonly unitAreas: readonly UnitAreaCap[];
  readonly scenarios: readonly MixScenario[];
  readonly targets: DeveloperTargets;
  /**
   * What the document asks for that this engine does not mechanize.
   *
   * Published, not omitted, for the same reason the deferred-check list is:
   * a reader who sees a unit count computed from this standard will otherwise
   * assume the rest of the standard was applied too.
   */
  readonly notMechanized: readonly string[];
}

/**
 * One plot's brief — a standard, narrowed to a site.
 *
 * The reason this type exists separately is `DJAZ1MED12RES011`. Its affection
 * plan prints `G+11` and **no FAR and no GFA**, so `blockingGaps()` stops the
 * run — correctly, because borrowing 3.50 from the neighbouring plot is the
 * precise failure this product exists to prevent. The brief for that same plot
 * prints `FAR 5` and `Total GFA 11,829.35 sqm`, and 5 × 2,365.87 = 11,829.35
 * exactly.
 *
 * So the brief is not a convenience. It is the second instrument that unblocks a
 * plot the first one could not answer for — and it is a *different* instrument,
 * issued by a developer's consultant rather than by Trakhees, which is why the
 * values it supplies are marked as coming from it and not from the sheet.
 */
export interface ProjectBrief {
  readonly briefId: string;
  readonly plotNumber: string;
  /** The developer standard this brief inherits its targets from. */
  readonly standardId: string;
  readonly citation: Citation;
  readonly plotAreaM2: Target;
  readonly gfaM2: Target;
  readonly far: Target;
  readonly heightCode: Target;
  readonly landUse: Target;
  /** Overrides the standard's scenarios for this plot. */
  readonly scenarios: readonly MixScenario[];
  readonly notMechanized: readonly string[];
}
