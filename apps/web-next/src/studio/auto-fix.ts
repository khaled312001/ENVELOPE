import type { RunRequestBody } from '@web/api/client.js';

/*
  THE AUTOMATIC FIX FOR A REFUSAL — ONLY WHERE THE REFUSAL NAMES THE ANSWER.

  Eng. Mohamed, 16 Oct 2026, under a refusal: a button that picks the right
  thing by itself. The honest version is narrow. A refusal earns a fix here only
  when its own sentence says what would be accepted, so the fix is read off the
  engine's words and is never a search:

  - too many computations: wait the seconds the server names, and send the
    same request again;
  - an entrance centred past where B.7.2.1 lets it stand: move it to the
    nearest point of the range the refusal states, on the same boundary;
  - an entrance on a boundary that cannot take one: withdraw the placement and
    let the engine recommend a side, by the ranking it already publishes;
  - a picked parking option the level cannot lay out: withdraw the pick, so
    the arrangement with the most bays is drawn, as before anyone picked.

  A run refused by its checks gets no button: nothing in a failed invariant
  names a value that would pass, and choosing one would be the engine grading
  its own homework. Each fix is offered, never applied unasked, and what it
  changes is said on the button.
*/

export type AutoFix =
  | { readonly kind: 'retry'; readonly waitS: number; readonly body: RunRequestBody }
  | { readonly kind: 'move-entrance'; readonly toM: string; readonly body: RunRequestBody }
  | { readonly kind: 'engine-entrance'; readonly body: RunRequestBody }
  | { readonly kind: 'most-bays'; readonly body: RunRequestBody };

/** The fix a refusal's own sentence states, for the request it refused; null when it states none. */
export function autoFixFor(message: string, body: RunRequestBody | null): AutoFix | null {
  if (body === null) return null;

  const wait = /^this address has started \d+ computations in the last minute.*?Wait (\d+) seconds/.exec(message);
  if (wait) return { kind: 'retry', waitS: Number(wait[1]), body };

  // A picked parking option this level cannot lay out: withdraw the pick, and the most bays is drawn again.
  if (body.parkingArrangement !== undefined && /^the parking arrangement [A-Z_]+ (is not one this level|places no bay)/.test(message)) {
    const { parkingArrangement: _withdrawn, ...rest } = body;
    return { kind: 'most-bays', body: rest };
  }

  const access = body.vehicleAccess;
  if (!access) return null;

  const range = /^The (vehicle entrance|entry|exit) on .+? is centred ([\d.]+) m from P\d+\. A [\d.]+ m opening on this boundary must be centred between ([\d.]+) m and ([\d.]+) m/.exec(message);
  if (range) {
    const at = Number(range[2]);
    const lo = Number(range[3]);
    const hi = Number(range[4]);
    const toM = (at < lo ? lo : hi).toFixed(2);
    const which = range[1] === 'exit' ? 'exit' : 'entry';
    const placed = which === 'exit' ? access.exit : access.entry;
    if (!placed) return null;
    const moved = { ...placed, centreOffsetM: toM };
    return {
      kind: 'move-entrance',
      toM,
      body: { ...body, vehicleAccess: which === 'exit' ? { ...access, exit: moved } : { ...access, entry: moved } },
    };
  }

  if (/^The (vehicle entrance|entry|exit) was placed on .+?, which cannot take one/.test(message)) {
    const { vehicleAccess: _withdrawn, ...rest } = body;
    return { kind: 'engine-entrance', body: rest };
  }
  return null;
}
