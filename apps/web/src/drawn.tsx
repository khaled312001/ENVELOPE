/**
 * The figures, drawn in code.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE EXIST AT ALL.
 *
 * `img.tsx` treats a missing file as silence — a name with no file emits no
 * element and makes no request, which is the right behaviour for a product that
 * does not show you things it cannot support. It is also why nineteen wired
 * slots rendered nothing: the images are commissioned and none has arrived, so
 * the site was a column of prose with no picture on it anywhere.
 *
 * A placeholder box would have been worse than nothing. So each slot gets a
 * DRAWING instead — of the thing the section is about, in the product's own
 * drafting language: hairlines, square corners, one accent, a figure in mono.
 * They are schematics, not illustrations of the idea of software.
 *
 * ---------------------------------------------------------------------------
 * WHAT THEY ARE NOT.
 *
 * **They are not engine output, and they never claim to be.** A drawing here is
 * a diagram of what a step does, the way a manual's diagram is: no figure in any
 * of them is a number this engine computed, and none is presented as one. The
 * numbers that ARE real live on the landing page beside them, come out of
 * `worked-example.json`, and are re-verified by `pnpm example` on every build.
 * The moment a drawing here starts quoting a capacity it would be a number typed
 * by a human on the page that sells traced numbers — which is exactly the defect
 * `pnpm example` exists to catch, in the one place it cannot look.
 *
 * **Amber is not decoration here either.** §13.1 reserves it for uncertainty, so
 * it appears in exactly two of these: the assumptions drawing, whose subject IS
 * an assumed value, and the limits drawing, whose subject is where the answer
 * stops. Everywhere else the emphasis is the accent.
 *
 * A supplied file always wins: `Figure` prefers the real image and falls back to
 * the drawing, so dropping `lp-parking.png` into `assets/img/` replaces this one
 * with no other edit.
 */

import type { JSX } from 'react';

/** One drawing, sized by its own viewBox and scaled by the slot it sits in. */
type Drawing = (props: { readonly title: string }) => JSX.Element;

/*
  ONE FRAME FOR ALL OF THEM.

  `preserveAspectRatio` is left at its default so a drawing letterboxes inside
  whatever box the layout gives it rather than stretching — these are drafting
  schematics and a stretched one reads as a mistake. `role="img"` with a `<title>`
  rather than `aria-hidden`: the alt text for each slot is already written in
  `i18n/imagery.*.ts`, from the brief, so there is a sentence to say.
*/
function Frame({
  title,
  viewBox,
  children,
}: {
  readonly title: string;
  readonly viewBox: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <svg className="drawn" viewBox={viewBox} role="img" aria-label={title}>
      {children}
    </svg>
  );
}

/** A sheet of paper for the schematic to sit on. */
const Sheet = ({ w, h }: { readonly w: number; readonly h: number }): JSX.Element => (
  <rect className="drawn__sheet" x="0.5" y="0.5" width={w - 1} height={h - 1} />
);

// ---------------------------------------------------------------------------
// The landing page's five section figures
// ---------------------------------------------------------------------------

/** Three bands, and the shortest of them binding. §15.3's whole argument, drawn. */
const capacities: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 320 240">
    <Sheet w={320} h={240} />
    {[
      { y: 54, w: 236, label: 'A' },
      { y: 104, w: 264, label: 'B' },
      { y: 154, w: 132, label: 'C', binds: true },
    ].map((b) => (
      <g key={b.label}>
        <text className="drawn__tag" x="28" y={b.y + 21}>
          {b.label}
        </text>
        <rect
          className={b.binds ? 'drawn__bar drawn__bar--binds' : 'drawn__bar'}
          x="48"
          y={b.y}
          width={b.w}
          height="30"
        />
      </g>
    ))}
    {/* The governing band is the SHORTEST, never an average of the three — the
        line is drawn at its end so the eye reads "this one stops first". */}
    <line className="drawn__datum" x1="180" y1="40" x2="180" y2="206" />
    <text className="drawn__note" x="188" y="204">
      governs
    </text>
  </Frame>
);

/** A parking level: bays either side of an aisle, and a ramp landing on it. */
const parking: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 320 240">
    <Sheet w={320} h={240} />
    {[0, 1].map((row) =>
      Array.from({ length: 9 }, (_, i) => (
        <rect
          key={`${row}-${i}`}
          className="drawn__bay"
          x={40 + i * 26}
          y={row === 0 ? 40 : 148}
          width="24"
          height="52"
        />
      )),
    )}
    {/* 6.00 m two-way, Table B.11 — the aisle is the width the engine reserves,
        and the reason a bay count that cannot be laid out is not a bay count. */}
    <rect className="drawn__aisle" x="40" y="92" width="234" height="56" />
    <path className="drawn__ramp" d="M274 92 L300 92 L300 148 L274 148 Z" />
    <path className="drawn__arrow" d="M282 104 L292 120 L282 136" />
    <text className="drawn__note" x="46" y="126">
      aisle
    </text>
  </Frame>
);

/** A figure, and the derivation hanging under it. */
const guarantees: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 320 240">
    <Sheet w={320} h={240} />
    <rect className="drawn__node drawn__node--head" x="100" y="28" width="120" height="34" />
    <text className="drawn__figure" x="160" y="51">
      6 774.194
    </text>
    <path className="drawn__wire" d="M160 62 L160 84 M60 84 L260 84 M60 84 L60 106 M160 84 L160 106 M260 84 L260 106" />
    {[28, 128, 228].map((x) => (
      <rect key={x} className="drawn__node" x={x} y="106" width="64" height="28" />
    ))}
    <path className="drawn__wire" d="M60 134 L60 156 M160 134 L160 156 M260 134 L260 156" />
    {[28, 128, 228].map((x) => (
      <g key={x}>
        <rect className="drawn__node drawn__node--cite" x={x} y="156" width="64" height="24" />
        <line className="drawn__hair" x1={x + 10} y1="168" x2={x + 54} y2="168" />
      </g>
    ))}
    <text className="drawn__note" x="28" y="204">
      every figure reaches a citation
    </text>
  </Frame>
);

/** Five claims, four answered and the fifth refused. §16.5's own order. */
const claims: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 320 240">
    <Sheet w={320} h={240} />
    {[0, 1, 2, 3, 4].map((i) => {
      const y = 36 + i * 36;
      const refused = i === 4;
      return (
        <g key={i}>
          <line className="drawn__hair" x1="28" y1={y + 26} x2="292" y2={y + 26} />
          <rect className="drawn__chip" x="28" y={y} width="16" height="16" />
          {refused ? (
            <path className="drawn__cross" d="M31 3 l10 10 M41 3 l-10 10" transform={`translate(0 ${y})`} />
          ) : (
            <path className="drawn__tick" d="M31 8 l4 5 l7 -9" transform={`translate(0 ${y})`} />
          )}
          <rect className="drawn__rule" x="58" y={y + 4} width={refused ? 150 : 110 + i * 22} height="8" />
        </g>
      );
    })}
    <text className="drawn__note" x="28" y="216">
      regulatory validity — never claimed
    </text>
  </Frame>
);

/** Where the answer stops: the plot, the part that is assessed, and the part that is not. */
const limits: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 320 240">
    <Sheet w={320} h={240} />
    <path className="drawn__plot" d="M36 44 L284 44 L284 150 L200 196 L36 196 Z" />
    <path className="drawn__assessed" d="M62 70 L258 70 L258 142 L192 170 L62 170 Z" />
    {/* The band that is NOT assessed — amber, because that is precisely what it
        is: the edge of what this engine will say. */}
    <path className="drawn__unassessed" d="M36 44 L284 44 L284 150 L200 196 L36 196 Z M62 70 L62 170 L192 170 L258 142 L258 70 Z" />
    <text className="drawn__note" x="36" y="222">
      assessed inside · not assessed outside
    </text>
  </Frame>
);

// ---------------------------------------------------------------------------
// The nine step figures
// ---------------------------------------------------------------------------

/** An affection plan, with the fields that were read picked out. */
const sheet: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 240 160">
    <Sheet w={240} h={160} />
    <rect className="drawn__node" x="20" y="18" width="200" height="22" />
    <line className="drawn__hair" x1="20" y1="54" x2="140" y2="54" />
    <line className="drawn__hair" x1="20" y1="66" x2="118" y2="66" />
    <line className="drawn__hair" x1="20" y1="78" x2="134" y2="78" />
    {[54, 78].map((y) => (
      <rect key={y} className="drawn__read" x="150" y={y - 10} width="64" height="16" />
    ))}
    <rect className="drawn__node drawn__node--cite" x="20" y="96" width="194" height="44" />
    <line className="drawn__hair" x1="32" y1="112" x2="150" y2="112" />
    <line className="drawn__hair" x1="32" y1="124" x2="120" y2="124" />
  </Frame>
);

/** A plot, its boundaries classified, one of them curved. */
const plot: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 240 160">
    <Sheet w={240} h={160} />
    <path className="drawn__plot" d="M40 36 L200 36 L200 112 Q120 142 40 112 Z" />
    <path className="drawn__frontage" d="M40 112 Q120 142 200 112" />
    <line className="drawn__frontage" x1="40" y1="36" x2="200" y2="36" />
    {[
      [40, 36],
      [200, 36],
      [200, 112],
      [40, 112],
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} className="drawn__station" cx={x} cy={y} r="3" />
    ))}
    <text className="drawn__note" x="40" y="26">
      every boundary classified
    </text>
  </Frame>
);

/** Rules, each with the clause it came from. */
const rules: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 240 160">
    <Sheet w={240} h={160} />
    {[0, 1, 2].map((i) => {
      const y = 24 + i * 42;
      return (
        <g key={i}>
          <rect className={i === 0 ? 'drawn__node drawn__node--head' : 'drawn__node'} x="20" y={y} width="200" height="32" />
          <line className="drawn__hair" x1="32" y1={y + 13} x2={140 - i * 18} y2={y + 13} />
          <rect className="drawn__chip drawn__chip--cite" x="32" y={y + 19} width="70" height="7" />
        </g>
      );
    })}
  </Frame>
);

/** An assumption: amber rail, a basis, a measured sensitivity. */
const assumptions: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 240 160">
    <Sheet w={240} h={160} />
    {[0, 1].map((i) => {
      const y = 30 + i * 56;
      return (
        <g key={i}>
          <rect className="drawn__assumed" x="20" y={y} width="200" height="42" />
          <rect className="drawn__assumed-rail" x="20" y={y} width="6" height="42" />
          <line className="drawn__hair" x1="38" y1={y + 15} x2={150 - i * 24} y2={y + 15} />
          <line className="drawn__hair" x1="38" y1={y + 28} x2={120 + i * 30} y2={y + 28} />
        </g>
      );
    })}
  </Frame>
);

/** The envelope: a footprint, floors stacked to a ceiling. */
const capacity: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 240 160">
    <Sheet w={240} h={160} />
    <path className="drawn__glass" d="M64 28 L176 28 L176 122 L64 122 Z" />
    {Array.from({ length: 8 }, (_, i) => (
      <line key={i} className="drawn__floor" x1="64" y1={38 + i * 11} x2="176" y2={38 + i * 11} />
    ))}
    <path className="drawn__ground" d="M36 122 L204 122" />
    <line className="drawn__datum" x1="196" y1="28" x2="196" y2="122" />
    <text className="drawn__note" x="36" y="142">
      height ceiling
    </text>
  </Frame>
);

/** A parking level as the sheet draws it, with a car in each bay. */
const parkingStep: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 240 160">
    <Sheet w={240} h={160} />
    {[0, 1].map((row) =>
      Array.from({ length: 7 }, (_, i) => (
        <g key={`${row}-${i}`}>
          <rect className="drawn__bay" x={26 + i * 26} y={row === 0 ? 26 : 96} width="24" height="38" />
          <rect className="drawn__car" x={30 + i * 26} y={row === 0 ? 32 : 102} width="16" height="26" rx="2" />
        </g>
      )),
    )}
    <rect className="drawn__aisle" x="26" y="64" width="182" height="32" />
  </Frame>
);

/** Checks, and one of them dormant rather than passed. */
const checks: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 240 160">
    <Sheet w={240} h={160} />
    {Array.from({ length: 12 }, (_, i) => {
      const x = 26 + (i % 4) * 50;
      const y = 28 + Math.floor(i / 4) * 40;
      const dormant = i === 5 || i === 10;
      return (
        <g key={i}>
          <rect className={dormant ? 'drawn__node drawn__node--dormant' : 'drawn__node'} x={x} y={y} width="40" height="28" />
          {dormant ? (
            <line className="drawn__hair" x1={x + 12} y1={y + 14} x2={x + 28} y2={y + 14} />
          ) : (
            <path className="drawn__tick" d={`M${x + 13} ${y + 14} l4 5 l9 -11`} />
          )}
        </g>
      );
    })}
  </Frame>
);

/** The evidence: a value, opened. */
const evidence: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 240 160">
    <Sheet w={240} h={160} />
    <rect className="drawn__node drawn__node--head" x="74" y="20" width="92" height="26" />
    <path className="drawn__wire" d="M120 46 L120 62 M50 62 L190 62 M50 62 L50 78 M120 62 L120 78 M190 62 L190 78" />
    {[26, 96, 166].map((x) => (
      <rect key={x} className="drawn__node" x={x} y="78" width="48" height="24" />
    ))}
    <path className="drawn__wire" d="M50 102 L50 118 M120 102 L120 118" />
    {[26, 96].map((x) => (
      <rect key={x} className="drawn__node drawn__node--cite" x={x} y="118" width="48" height="20" />
    ))}
  </Frame>
);

/** What comes out: the five files. */
const exportFiles: Drawing = ({ title }) => (
  <Frame title={title} viewBox="0 0 240 160">
    <Sheet w={240} h={160} />
    {['PDF', 'DXF', 'GLB', 'XLSX', 'JSON'].map((kind, i) => {
      const x = 20 + (i % 3) * 70;
      const y = 26 + Math.floor(i / 3) * 62;
      return (
        <g key={kind}>
          <path className="drawn__file" d={`M${x} ${y} L${x + 40} ${y} L${x + 54} ${y + 14} L${x + 54} ${y + 48} L${x} ${y + 48} Z`} />
          <path className="drawn__fold" d={`M${x + 40} ${y} L${x + 40} ${y + 14} L${x + 54} ${y + 14}`} />
          <text className="drawn__tag" x={x + 8} y={y + 38}>
            {kind}
          </text>
        </g>
      );
    })}
  </Frame>
);

/**
 * The register, by name.
 *
 * Only the slots a drawing can honestly stand in for. The two full-bleed
 * backdrops and the social card are not here: a backdrop is a photograph's job
 * and a schematic stretched behind a fold is decoration, which is the one thing
 * these are not.
 */
export const DRAWINGS: Readonly<Record<string, Drawing>> = {
  'lp-capacities': capacities,
  'lp-parking': parking,
  'lp-guarantees': guarantees,
  'lp-claims': claims,
  'lp-limits': limits,
  'step-0-sheet': sheet,
  'step-1-plot': plot,
  'step-3-rules': rules,
  'step-4-assumptions': assumptions,
  'step-5-capacity': capacity,
  'step-6-parking': parkingStep,
  'step-7-checks': checks,
  'step-8-evidence': evidence,
  'step-9-export': exportFiles,
};

/** Whether a slot has a drawing to fall back on. */
export function hasDrawing(name: string): boolean {
  return name in DRAWINGS;
}

export function Drawn({
  name,
  title,
  className,
}: {
  readonly name: string;
  readonly title: string;
  readonly className?: string | undefined;
}): JSX.Element | null {
  const draw = DRAWINGS[name];
  if (!draw) return null;
  return (
    <span className={className === undefined ? 'drawn-slot' : `drawn-slot ${className}`}>
      {draw({ title })}
    </span>
  );
}
