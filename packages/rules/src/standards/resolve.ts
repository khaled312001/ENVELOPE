/**
 * A developer standard, turned into run inputs.
 *
 * Three conversions happen here and each one is a place a number could quietly
 * become something it is not:
 *
 * 1. **Square feet to square metres.** The documents are written in ft²;
 *    the engine works in m². The factor is exact (0.09290304), so this is a
 *    conversion and not an approximation — but it is arithmetic on a cited
 *    value, so it is reported with its formula rather than pre-baked into the
 *    transcription, where the verbatim source text belongs.
 *
 * 2. **A maximum, used as an area.** The standard says "Max — Maximum means no
 *    unit to cross this area Strictly". It gives no typical area at all. Using
 *    the cap as the unit's area is therefore an assumption, and it errs
 *    *conservatively*: larger units mean fewer of them, so the unit count comes
 *    out low rather than high. That direction is deliberate and it is stated on
 *    every mix this returns.
 *
 * 3. **Variants inside a type, averaged.** Azizi's tower 1-bedroom is 80% at
 *    650 ft² and 20% at 680 ft². One weighted area per type is what the engine
 *    consumes; the sub-shares and the reason for them (a half bathroom) travel
 *    in the note so the average can be unpicked.
 *
 * What this module refuses to do is normalise. A scenario whose shares do not
 * total exactly 1 is a transcription error or a document that means something
 * this code has not understood, and silently scaling it to fit would hide both.
 */

import { Decimal, type Citation } from '@envelope/core';

import type { DeveloperStandard, MixScenario, ProjectBrief } from './types.js';

/** Exact. 1 ft = 0.3048 m by definition, so 1 ft² = 0.09290304 m². */
export const SQ_FT_TO_SQ_M = '0.09290304';

export class StandardResolutionError extends Error {
  override readonly name = 'StandardResolutionError';
}

/** One unit type, as the engine consumes it. */
export interface ResolvedMixEntry {
  readonly typeId: string;
  readonly label: string;
  readonly share: Decimal;
  readonly nsaM2: Decimal;
  /** How the area was arrived at, in one sentence a reviewer can check. */
  readonly derivation: string;
  readonly citations: readonly Citation[];
}

export interface ResolvedMix {
  readonly standardId: string;
  readonly scenarioId: string;
  readonly label: string;
  readonly position: 'TOWER' | 'PODIUM';
  readonly entries: readonly ResolvedMixEntry[];
  /**
   * The basis string this mix must carry into the run.
   *
   * Not decorative. `RunInput.unitMix` with `source: 'USER_SET'` records who
   * chose it; this records *what they chose*, including the two things a reader
   * would otherwise have to know already: that these are maxima, and that a
   * range was resolved to one end.
   */
  readonly basis: string;
  readonly citations: readonly Citation[];
}

function scenarioOf(
  scenarios: readonly MixScenario[],
  scenarioId: string,
): MixScenario {
  const found = scenarios.find((s) => s.scenarioId === scenarioId);
  if (!found) {
    throw new StandardResolutionError(
      `no scenario ${scenarioId}. Available: ${scenarios.map((s) => s.scenarioId).join(', ')}`,
    );
  }
  return found;
}

/**
 * Resolve one scenario into unit-mix entries.
 *
 * @param position which caps to apply. Podium and tower caps differ — Azizi's
 * podium studio is 500 ft² against a tower studio at 340 — and a run that mixed
 * them would report an area no floor of the building has.
 */
export function resolveMix(
  standard: DeveloperStandard,
  scenarioId: string,
  position: 'TOWER' | 'PODIUM' = 'TOWER',
  briefScenarios?: readonly MixScenario[],
): ResolvedMix {
  const scenario = scenarioOf(
    briefScenarios && briefScenarios.length > 0 ? briefScenarios : standard.scenarios,
    scenarioId,
  );

  const total = scenario.entries.reduce((s, e) => s.plus(e.share), new Decimal(0));
  if (!total.equals(1)) {
    throw new StandardResolutionError(
      `scenario ${scenarioId} shares total ${total.toString()}, not 1. This is not ` +
        'normalised here: a mix that does not add up is a transcription error or a ' +
        'document meaning something this code has not understood, and scaling it to ' +
        'fit would hide both.',
    );
  }

  const factor = new Decimal(SQ_FT_TO_SQ_M);
  const citations: Citation[] = [scenario.citation];

  const entries = scenario.entries.map((entry): ResolvedMixEntry => {
    const cap = standard.unitAreas.find(
      (u) => u.typeId === entry.typeId && u.position === position,
    );
    if (!cap) {
      throw new StandardResolutionError(
        `${standard.standardId} states no ${position.toLowerCase()} area cap for ` +
          `${entry.typeId}, but scenario ${scenarioId} allocates ${entry.share} of the ` +
          'mix to it. The gap is in the standard, not in this run — obtain the cap ' +
          'rather than substituting one.',
      );
    }
    citations.push(cap.citation);

    const variantTotal = cap.variants.reduce((s, v) => s.plus(v.shareOfType), new Decimal(0));
    if (!variantTotal.equals(1)) {
      throw new StandardResolutionError(
        `${entry.typeId} (${position}) variant shares total ${variantTotal.toString()}, not 1.`,
      );
    }

    const ft2 = cap.variants.reduce(
      (s, v) => s.plus(new Decimal(v.maxAreaFt2).times(v.shareOfType)),
      new Decimal(0),
    );
    const m2 = ft2.times(factor).toDecimalPlaces(3);

    const parts = cap.variants
      .map((v) => `${new Decimal(v.shareOfType).times(100).toFixed(0)}% at ${v.maxAreaFt2} ft²`)
      .join(', ');
    const notes = cap.variants.filter((v) => v.note).map((v) => v.note!);

    return {
      typeId: entry.typeId,
      label: cap.label,
      share: new Decimal(entry.share),
      nsaM2: m2,
      derivation:
        `${cap.label}, ${position.toLowerCase()}: ${parts} → ${ft2.toFixed(1)} ft² ` +
        `× ${SQ_FT_TO_SQ_M} = ${m2.toFixed(2)} m². These are maxima, used as areas — ` +
        `the standard states no typical area, and a maximum understates the unit ` +
        `count rather than overstating it.` +
        (notes.length > 0 ? ` ${notes.join(' ')}` : ''),
      citations: [cap.citation],
    };
  });

  const basis =
    `${standard.developer} — ${scenario.label}. Unit areas are the ` +
    `${position.toLowerCase()} maxima from ${standard.title}, used as areas because ` +
    `the standard states no typical area; that understates the unit count rather ` +
    `than overstating it.` +
    (scenario.rangeNote ? ` ${scenario.rangeNote}` : '') +
    ' This is a developer brief, not a regulation: it constrains what this client ' +
    'will build, never what the authority permits.';

  return {
    standardId: standard.standardId,
    scenarioId: scenario.scenarioId,
    label: scenario.label,
    position,
    entries,
    basis,
    citations,
  };
}

/**
 * Every scenario a plot can be run against — the standard's, plus its brief's.
 *
 * A brief's scenarios come first and, where the ids collide, win. Plot 5180178
 * narrows the general 80/18/2 mix to studios only, and the general mix does not
 * apply to it: a screen offering both without saying which governs would let a
 * user run the wrong one and never learn.
 */
export function scenariosFor(
  standard: DeveloperStandard,
  brief?: ProjectBrief,
): readonly (MixScenario & { readonly fromBrief: boolean })[] {
  const fromBrief = (brief?.scenarios ?? []).map((s) => ({ ...s, fromBrief: true }));
  if (fromBrief.length > 0) return fromBrief;
  return standard.scenarios.map((s) => ({ ...s, fromBrief: false }));
}

/** The brief for a plot, if the file holds one. */
export function briefFor(
  briefs: readonly ProjectBrief[],
  plotNumber: string,
): ProjectBrief | undefined {
  const trimmed = plotNumber.trim();
  return briefs.find((b) => b.plotNumber === trimmed);
}
