import type { RunRequestBody } from '../api/client.js';

/**
 * Feed an edited assumption back into the request that produced the run.
 *
 * Editing an assumption re-runs the pipeline. §13.4 keeps the original run intact,
 * so the caller creates a new run from what this returns rather than mutating one
 * somebody may already have exported.
 */
export function applyAssumptionEdit(
  body: RunRequestBody,
  parameterId: string,
  value: string,
): RunRequestBody {
  switch (parameterId) {
    case 'parking.usable_fraction':
      return { ...body, parkingUsableFraction: { ...body.parkingUsableFraction, value } };
    case 'capacity.user_realism_discount':
      return { ...body, realismDiscount: value };
    default:
      // An assumption the client does not know how to feed back is left alone
      // rather than silently ignored — the register will still show it, and the
      // gap is visible instead of looking like an edit that did nothing.
      return body;
  }
}
