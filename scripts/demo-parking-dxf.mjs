/**
 * End-to-end demo: a real affection plan in, a CAD drawing out.
 *
 * Reads `IC1-CTYL-16_011` — the Trakhees sheet walked through in the 30 Aug 2026
 * meeting — lays out a podium parking level to Dubai Building Code Table B.11,
 * and writes a DXF that opens in AutoCAD.
 *
 * The point is not the picture. It is that every dimension in the drawing came
 * from either the sheet or a cited clause, and the one number that came from
 * neither (the deduction for cores and plant) is declared as an assumption with
 * a basis, exactly as it would be on screen.
 *
 * Run: `node scripts/demo-parking-dxf.mjs`
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Decimal, ProvenanceGraph, Tracer } from '../packages/core/dist/index.js';
import {
  layoutParkingLevel,
  placeVehicleAccess,
  RectKind,
} from '../packages/capacity/dist/index.js';
import { parseAffectionPlan, blockingGaps } from '../packages/intake/dist/index.js';
import { Aci, layerName, writeDxf } from '../packages/exports/dist/index.js';

const ROOT = new URL('..', import.meta.url);
const SHEET = 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf';

const tracer = new Tracer(new ProvenanceGraph());

// --- 1. read the sheet ------------------------------------------------------
const bytes = new Uint8Array(await readFile(fileURLToPath(new URL(SHEET, ROOT))));
const facts = await parseAffectionPlan(bytes, { documentUri: SHEET, tracer });

const blocking = blockingGaps(facts);
if (blocking.length > 0) {
  console.error('Refusing to compute. The sheet does not state:');
  for (const gap of blocking) console.error(`  - ${gap.label}: ${gap.consequence}`);
  process.exit(1);
}

console.log('Affection plan read:');
console.log(`  plot area   ${facts.totalAreaSqm.value} m²`);
console.log(`  FAR         ${facts.far.value}`);
console.log(`  GFA         ${facts.gfaSqm.value} m²`);
console.log(`  height      ${facts.height.value.raw}  ` +
  `(${facts.height.value.podiumLevels} podium + ${facts.height.value.typicalFloors} typical)`);
for (const c of facts.crossChecks) {
  console.log(`  check       ${c.passed ? 'OK ' : 'FAIL'} ${c.name} — ${c.detail}`);
}

// --- 2. the podium footprint -----------------------------------------------
// Coverage on this sheet is 100% of the plot for ground and podium, so the
// parking level is the plot. The plot is treated as a rectangle of the stated
// area at the frontage the sheet dimensions — the layout engine only accepts
// rectangles, and says so rather than approximating a polygon it cannot pack.
const areaM2 = facts.totalAreaSqm.value;
const widthM = new Decimal('50.85');            // frontage read off the sheet
const depthM = areaM2.div(widthM);

const layout = layoutParkingLevel({
  tracer,
  footprint: { widthM, depthM },
  structuralGridM: new Decimal('8'),
  includeRamp: true,
  deductions: {
    areaM2: areaM2.times('0.12'),
    source: 'ASSUMED',
    basis:
      '12% of the level for cores, ramp landing, plant and refuse — the mid-point of ' +
      'what the client\'s own podium drawings show. Not governed by a cited rule, so ' +
      'it is declared: the bay count moves roughly in proportion to it.',
  },
});

console.log('\nParking layout:');
console.log(`  footprint   ${widthM} × ${depthM.toFixed(2)} m`);
console.log(`  standard    ${layout.standard.angle} / ${layout.standard.driveway} — ` +
  `${layout.standard.bayWidthM} × ${layout.standard.bayLengthM} m bays, ` +
  `${layout.standard.drivewayWidthM} m aisle`);
console.log(`  module      ${layout.moduleDepthM.value} m`);
console.log(`  bays        ${layout.bayCount.value}`);
// The developer's own area-per-bay target is a confidential commercial figure in
// their brief, so it is not printed beside the achieved number where the output
// could be pasted into anything. It lives in `packages/rules/src/standards/`,
// with the page and bounding box it was transcribed from.
console.log(`  efficiency  ${layout.areaPerBayM2.value} m²/bay`);
for (const n of layout.notes) console.log(`  note        ${n}`);

// --- 3. where the vehicle access goes ---------------------------------------
// The sheet gives an "Access Side" but not the road hierarchy, so the frontages
// are declared here the way the user would declare them on screen: south is the
// street the plot addresses, north and the two sides are neighbours.
const mm = (v) => Math.round(Number(v) * 1000);
const corners = [[0, 0], [Number(widthM), 0], [Number(widthM), Number(depthM)], [0, Number(depthM)]];
const edgeAt = (seq, classification, roadHierarchy) => {
  const a = corners[seq];
  const b = corners[(seq + 1) % 4];
  return {
    seq,
    start: { x: mm(a[0]), y: mm(a[1]) },
    end: { x: mm(b[0]), y: mm(b[1]) },
    classification,
    ...(roadHierarchy ? { roadHierarchy } : {}),
    lengthMm: mm(Math.hypot(b[0] - a[0], b[1] - a[1])),
    bearingDeg: new Decimal(0),
  };
};

const access = placeVehicleAccess({
  tracer,
  plot: { plotId: 'demo', plotNumber: facts.parcelId?.value ?? '', community: 'WARSAN 1' },
  edges: [
    edgeAt(0, 'ROAD', 'LOCAL'),
    edgeAt(1, 'ADJACENT_PLOT'),
    edgeAt(2, 'ADJACENT_PLOT'),
    edgeAt(3, 'ADJACENT_PLOT'),
  ],
});

console.log('');
console.log('Vehicle access:');
if (access.recommended) {
  const a = access.recommended.value;
  console.log(`  edge        ${a.edgeSeq} (${a.hierarchy})`);
  console.log(`  opening     ${a.widthM} m wide, centred ${a.centreOffsetM.toFixed(2)} m along`);
  console.log(`  window      ${a.usableWindowM.toFixed(2)} m clear of both corners`);
  console.log(`  why         ${a.rationale}`);
} else {
  console.log('  none possible on the declared frontages');
}
for (const r of access.rejected) console.log(`  rejected    edge ${r.edgeSeq}: ${r.reason}`);
for (const n of access.notAssessed) console.log(`  NOT ASSESSED ${n}`);

// --- 4. draw it -------------------------------------------------------------
// The engine's rectangles, each on its own layer so a reviewer can switch them
// off, in the same `ENV-<level>-<ROLE>` scheme the product's own drawings use.
// Nothing is drawn that the engine did not place: the driveway is the two points
// of the opening on the boundary, not a throat invented to make it visible.
const at = (x, y) => ({ x: mm(x), y: mm(y) });
const rectPoints = (r) => [
  at(r.x, r.y),
  at(r.x.plus(r.width), r.y),
  at(r.x.plus(r.width), r.y.plus(r.height)),
  at(r.x, r.y.plus(r.height)),
];
const ROLE_OF = {
  [RectKind.BAY]: 'bay',
  [RectKind.ACCESSIBLE_BAY]: 'bay-accessible',
  [RectKind.AISLE]: 'aisle',
  [RectKind.RAMP]: 'ramp',
  [RectKind.OBSTRUCTION]: 'reserved',
};
const COLOUR_OF = {
  plot: Aci.WHITE, bay: Aci.GREEN, 'bay-accessible': Aci.BLUE, aisle: Aci.GREY,
  // The ramp's position is not assessed, and the deduction behind the reserved
  // zone is ASSUMED — so the one gets grey and the other gets amber.
  ramp: Aci.GREY, reserved: Aci.AMBER, access: Aci.CYAN, annotation: Aci.WHITE,
};
const layer = (role) => layerName('P1', role);

const entities = [
  { kind: 'polyline', layer: layer('plot'), points: corners.map(([x, y]) => at(x, y)), closed: true, z: 0 },
  ...layout.rects.map((r) => ({
    kind: 'polyline', layer: layer(ROLE_OF[r.kind]), points: rectPoints(r), closed: true, z: 0,
  })),
];
if (access.recommended) {
  const o = access.recommended.value.opening;
  entities.push({ kind: 'polyline', layer: layer('access'), points: [o.start, o.end], closed: false, z: 0 });
}
const note = (y, value) => ({
  kind: 'text', layer: layer('annotation'), at: at(0, y), z: 0, heightM: 0.8, rotationDeg: 0, align: 'start', value,
});
entities.push(
  note(depthM.plus(3.4), `Plot ${facts.parcelId?.value ?? ''} - ${areaM2} sq.m - FAR ${facts.far.value}`),
  note(depthM.plus(2), `Parking: ${layout.bayCount.value} bays at ${layout.areaPerBayM2.value} sq.m/bay`),
  note(-2, 'NOT FOR CONSTRUCTION'),
  note(-3.4, 'REGULATORY VALIDITY: NOT ASSESSED'),
);

const used = [...new Set(entities.map((e) => e.layer))];
const out = writeDxf({
  layers: used.map((name) => ({ name, color: COLOUR_OF[name.slice('ENV-P1-'.length).toLowerCase()] ?? Aci.WHITE })),
  blocks: [],
  entities,
});

const dst = fileURLToPath(new URL('docs/04-delivery/demo-parking-warsan.dxf', ROOT));
await writeFile(dst, out, 'ascii');
console.log(`\nWrote ${dst}`);
console.log(`  ${(out.length / 1024).toFixed(0)} KB, ${entities.length} entities on ${used.length} layers`);
