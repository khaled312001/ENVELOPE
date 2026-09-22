/**
 * The screens, rendered against a real run.
 *
 * Not against a fixture. The payload below comes out of the actual engine and
 * the actual presenter, so a field the API stops sending breaks this test
 * rather than silently rendering `undefined` in front of a user. A fixture
 * would have frozen the shape at the moment it was captured, which is the same
 * shape a stale fixture keeps proving is fine long after it stopped being true.
 *
 * What is asserted is almost entirely **honesty**, not layout. Whether a panel
 * is 16 or 24 pixels from its heading is a design review's job. Whether the
 * screen that reports eighteen checks says how many *ran*, whether the
 * not-assessed rows are present rather than filtered away, and whether
 * "REGULATORY VALIDITY / NEVER CLAIMED" survives a refactor — those are
 * regressions that look like nothing on screen and undo the product.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  asMm,
  Decimal,
  type Plot,
  type PlotEdge,
  toMm,
  type UnitTypeMix,
} from '@envelope/core';
import { analysePlot, initGeometry, outwardBearingDeg, type Ring } from '@envelope/geometry';
import { asOfNow, loadSeedRulesForDevelopment, RuleStore } from '@envelope/rules';
import { buildAssumptionRegister, runPipeline, type RunInput } from '@envelope/capacity';
import { composeSheets, sheetSvg } from '@envelope/sheets';

import { runChecks } from '../../api/src/checks.js';
import { ENGINE_VERSION, presentRun } from '../../api/src/present.js';
import type { PlotView, RunView } from '../src/api/client.js';
import { CapacityBands } from '../src/components/CapacityBands.js';
import { DrawingSet, SheetView } from '../src/components/DrawingSet.js';
import { AssumptionRegister } from '../src/components/AssumptionRegister.js';
import { MassingPanel } from '../src/components/MassingPanel.js';
import { ParkingPlan, VehicleAccessPanel } from '../src/components/ParkingPlan.js';
import { ChecksStep } from '../src/screens/ChecksStep.js';
import { EvidenceStep } from '../src/screens/EvidenceStep.js';

const DEV_ACK = 'I understand these rules are not approved';

/** Plot edges built from the ring, so their endpoints are the ring's. */
function edgesOf(
  ring: Ring,
  specs: readonly {
    readonly classification: PlotEdge['classification'];
    readonly roadHierarchy?: PlotEdge['roadHierarchy'];
  }[],
): readonly PlotEdge[] {
  return specs.map((spec, i) => {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    return {
      seq: i,
      start: a,
      end: b,
      classification: spec.classification,
      ...(spec.roadHierarchy ? { roadHierarchy: spec.roadHierarchy } : {}),
      lengthMm: asMm(Math.round(Math.hypot(b.x - a.x, b.y - a.y))),
      bearingDeg: outwardBearingDeg(a, b),
    };
  });
}

let run: RunView;
let plotView: PlotView;

beforeAll(async () => {
  await initGeometry();

  const ring: Ring = [
    { x: toMm(0), y: toMm(0) },
    { x: toMm(80), y: toMm(0) },
    { x: toMm(80), y: toMm(40) },
    { x: toMm(0), y: toMm(40) },
  ];
  const analysis = analysePlot(ring);
  const plot: Plot = {
    plotId: 'p1',
    tenantId: 't1',
    plotNumber: '345-1234',
    community: 'TEST',
    landUse: 'RESIDENTIAL_MULTI',
    ring,
    /*
      Edges with real endpoints, because they are read as geometry.

      They used to carry only a length and a classification, and the omission
      was invisible: `apps/web/tsconfig.json` includes `src/**` and not
      `test/**`, so this object was never checked against `Plot`. It went
      unnoticed until the vehicle-access placement started reading
      `edge.start.x` and got `undefined`. `tsconfig.tests.json` now covers this
      directory for exactly that reason.
    */
    edges: edgesOf(ring, [
      { classification: 'ROAD', roadHierarchy: 'LOCAL' },
      { classification: 'ADJACENT_PLOT' },
      { classification: 'ROAD', roadHierarchy: 'COLLECTOR' },
      { classification: 'ADJACENT_PLOT' },
    ]),
    shapeClass: analysis.shapeClass,
    statedAreaM2: new Decimal('3200'),
    computedAreaMm2: analysis.areaMm2,
    areaMismatch: false,
    principalAxisDeg: analysis.principalAxisDeg,
    mbrWidthMm: analysis.mbr.widthMm,
    mbrDepthMm: analysis.mbr.depthMm,
    convexityRatio: analysis.convexityRatio,
    frontageCount: 2,
  };

  const store = new RuleStore().add(...loadSeedRulesForDevelopment(DEV_ACK));
  const asOf = asOfNow('2026-08-30');
  const rules = store.load(asOf);

  const input: RunInput = {
    plot,
    rules,
    actor: { id: 'u1', name: 'Test Architect' },
    parkingInFar: 'EXCLUDED_FROM_FAR',
    unitMix: {
      source: 'USER_SET',
      entries: [
        { typeId: '1BED', label: '1 bedroom', share: new Decimal('0.5'), nsaM2: new Decimal('70') },
        { typeId: '2BED', label: '2 bedroom', share: new Decimal('0.375'), nsaM2: new Decimal('110') },
        { typeId: '3BED', label: '3 bedroom', share: new Decimal('0.125'), nsaM2: new Decimal('160') },
      ] satisfies UnitTypeMix[],
    },
    parkingLevelsAvailable: 2,
    // The midpoint of the range the project brief on file states, so the screens
    // render a run whose unit count reflects a real building rather than one
    // where every square metre of GFA is an apartment. The range itself and the
    // developer's name stay out of the basis string — see `api.test.ts`.
    saleableEfficiency: {
      value: new Decimal('0.95'),
      source: 'USER_SET',
      basis: 'the midpoint of the saleable-to-GFA range in the project brief on file',
    },
    parkingUsableFraction: {
      value: new Decimal('0.85'),
      source: 'ASSUMED',
      basis: 'the usable fraction of a parking level after cores, ramps and plant',
    },
    realismDiscount: new Decimal('1.00'),
  };

  const output = runPipeline(input);
  const checks = runChecks({
    runId: 'r1',
    plot,
    input,
    output,
    engineVersion: ENGINE_VERSION,
    ruleSetHash: store.contentHash(asOf),
    geometry: { areasRecomputed: 3, areaDisagreements: 0 },
    validatedAt: '2026-08-30T00:00:00.000Z',
  });

  run = presentRun(
    'r1',
    plot,
    output,
    buildAssumptionRegister(input, output),
    12,
    true,
    checks,
  ) as unknown as RunView;

  plotView = {
    plotId: plot.plotId,
    plotNumber: plot.plotNumber,
    community: plot.community,
    shapeClass: plot.shapeClass,
    computedAreaM2: '3200.00',
    statedAreaM2: '3200.00',
    areaMismatch: false,
    vertices: ring.map((p) => ({ x: String(p.x / 1000), y: String(p.y / 1000) })),
    edges: plot.edges.map((e) => ({
      seq: e.seq,
      classification: e.classification,
      roadHierarchy: e.roadHierarchy,
      lengthM: String(e.lengthMm / 1000),
    })),
  } as unknown as PlotView;
});

const html = (node: JSX.Element): string => renderToStaticMarkup(node);

describe('ChecksStep', () => {
  it('renders all five §16.5 claims, in order', () => {
    const out = html(<ChecksStep run={run} />);
    const order = [
      'Self-consistency',
      'Rule coverage',
      'Geometric validity',
      'Professional agreement',
      'Regulatory validity',
    ].map((t) => out.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('says regulatory validity is never claimed', () => {
    const out = html(<ChecksStep run={run} />);
    expect(out).toContain('Never claimed');
    expect(out).toContain('claim--never');
    // The words a reader takes away. If a refactor ever softens this into
    // "pending" or "not yet assessed", the product has started implying that
    // one day it might claim it.
    expect(out).toMatch(/never claimed/i);
    expect(out).not.toMatch(/regulatory\s+validity[^<]*\bsupported\b/i);
  });

  it('never reports the dormant checks as passes', () => {
    const out = html(<ChecksStep run={run} />);
    const { ran, total, dormant } = run.checks.invariants;
    expect(dormant.length).toBeGreaterThan(0);
    expect(ran).toBeLessThan(total);
    expect(out).toContain(`${ran} of ${total} checks in the catalogue ran`);
    expect(out).toContain('not counted as passes');
    // The forbidden sentence: a ratio that invites the reader to fill in the
    // remainder as passes.
    expect(out).not.toContain(`${total} of ${total}`);
    expect(out).not.toMatch(/all 18 invariants/i);
  });

  it('offers the not-assessed checks rather than hiding them', () => {
    const out = html(<ChecksStep run={run} />);
    expect(out).toContain('checks that had nothing to check');
    expect(out).toContain(run.checks.invariants.dormantNote);
  });

  it('prints the independence limit and the self-consistency notice', () => {
    const out = html(<ChecksStep run={run} />);
    // React escapes `"` to `&quot;` on the way into markup, and both strings
    // quote the PRD. Compare on the escaped form rather than loosening the
    // assertion — the exact wording is the disclosure.
    const escaped = (t: string): string => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    expect(out).toContain(escaped(run.checks.validation.selfConsistencyNotice));
    expect(out).toContain(escaped(run.checks.validation.independenceLimit));
    expect(out).toContain('Implementation independence is not semantic independence');
  });

  it('shows every deferred check, and marks the life-safety one', () => {
    const out = html(<ChecksStep run={run} />);
    const deferred = run.checks.validation.outcomes.filter((o) => o.category === 'DEFERRED');
    expect(deferred.length).toBeGreaterThan(0);
    for (const d of deferred) expect(out).toContain(d.ruleId);
    if (run.checks.validation.summary.lifeSafetyDeferred > 0) {
      expect(out).toContain('life safety');
    }
  });

  it('renders the validator’s own sentences, not the designer’s', () => {
    const out = html(<ChecksStep run={run} />);
    for (const key of ['selfConsistency', 'ruleCoverage', 'regulatoryValidity'] as const) {
      const detail = run.checks.validation.claims[key].detail;
      // The detail is escaped on the way into HTML, so compare on a distinctive
      // fragment that carries no markup-sensitive characters.
      expect(out).toContain(detail.split('.')[0]!.replace(/["'&<>]/g, ''));
    }
  });
});

describe('CapacityBands', () => {
  it('names the governing band and never invents a fourth', () => {
    const out = html(<CapacityBands capacity={run.capacity} onInspect={() => {}} />);
    // §15.1's three questions, each with its own field and its own derivation.
    expect(out).toContain('Regulatory capacity');
    expect(out).toContain('Geometric capacity');
    expect(out).toContain('Parking capacity');
    expect(out).toContain('Governing capacity');
    expect(out).toContain('band--governing');
    expect((out.match(/class="band[ "]/g) ?? []).length).toBe(3);
    // §15.3 — the field does not exist, and neither does the word.
    expect(out).not.toMatch(/\brealistic\b/i);
    expect(out).not.toMatch(/\bexpected capacity\b/i);
    expect(out).not.toMatch(/\blikely\b/i);
  });
});

describe('AssumptionRegister', () => {
  it('shows every assumption with its basis', () => {
    const out = html(
      <AssumptionRegister
        assumptions={run.assumptions}
        onInspect={() => {}}
        onAcknowledge={() => {}}
        onEdit={() => {}}
        acknowledged={false}
      />,
    );
    expect(run.assumptions.length).toBeGreaterThan(0);
    for (const a of run.assumptions) {
      expect(out).toContain(a.parameterId);
      // "If you cannot write why, you do not have an assumption."
      expect(a.basis.length).toBeGreaterThan(20);
    }
  });
});

describe('EvidenceStep', () => {
  it('renders every traced value with a provenance class', () => {
    const out = html(<EvidenceStep run={run} plot={plotView} onInspect={() => {}} />);
    expect(out).toContain('Setback-permitted footprint');
    expect(out).toContain('Band A — regulatory');
    // The amber treatment is the load-bearing one: §13.1 calls it "the most
    // important UI decision in the product".
    expect(out).toMatch(/AMBER|assumed|uncertain/i);
  });
});

/**
 * The parking level, on screen.
 *
 * The client's own priority, so the assertions are about the two ways a plan
 * view can lie: by drawing shapes the engine did not place, and by drawing a
 * shape whose compliance is unknown as though it were checked.
 */
describe('ParkingPlan', () => {
  it('draws one polygon for every rectangle the engine placed', () => {
    expect(run.levelPlanRefusal).toBeNull();
    expect(run.levelPlan).not.toBeNull();
    const out = html(
      <ParkingPlan
        levelPlan={run.levelPlan!}
        plotVertices={plotView.vertices}
        onInspect={() => {}}
      />,
    );
    // Podium + every placed rect + the plot outline. Counting the polygons is
    // the only assertion that catches a drawing quietly losing half its bays.
    const polygons = out.split('<polygon').length - 1;
    expect(polygons).toBe(run.levelPlan!.rects.length + 2);
  });

  it('says the ramp is plan area only, and cites the clause it did not check', () => {
    const out = html(
      <ParkingPlan levelPlan={run.levelPlan!} onInspect={() => {}} />,
    );
    expect(out).toContain('plan area only');
    expect(out).toContain('B.7.2.2');
    // Amber and a hatch. Colour alone fails 1.4.1 and fails in greyscale print.
    expect(out).toContain('ramp-hatch');
  });

  it('describes the whole figure for a reader who cannot see it', () => {
    const out = html(<ParkingPlan levelPlan={run.levelPlan!} onInspect={() => {}} />);
    expect(out).toMatch(/aria-label="[^"]*bays laid out/);
  });

  it('leaves the drawing to the drawing set when asked, and keeps the figures', () => {
    // One level drawn by two renderers is two chances to disagree.
    const out = html(<ParkingPlan levelPlan={run.levelPlan!} onInspect={() => {}} figure={false} />);
    expect(out).not.toContain('<svg');
    expect(out).toContain('Bays laid out');
    expect(out).toContain('Module depth');
  });
});

/**
 * The drawing set is the same display list the SVG export, the DXF and the report
 * draw. Two ways it could lie on screen: by drawing something the export does not
 * (a second renderer that has drifted), and by leaving a value on the sheet that a
 * keyboard cannot reach.
 */
describe('DrawingSet', () => {
  const meta = (): { plotNumber: string; community: string; runId: string } => ({
    plotNumber: run.plot.plotNumber,
    community: run.plot.community,
    runId: run.runId,
  });
  /** Every `d` attribute, in document order. The geometry, and nothing else. */
  const paths = (markup: string): string[] => [...markup.matchAll(/\sd="([^"]*)"/g)].map((m) => m[1]!);

  it('has one tab per sheet the engine composed, and opens on a parking level', () => {
    const sheets = composeSheets(run.building!, meta());
    const out = html(<DrawingSet run={run} onInspect={() => {}} />);
    expect(out.split('role="tab"').length - 1).toBe(sheets.length);
    const first = sheets.find((s) => s.kind === 'PARKING')!;
    expect(out).toMatch(new RegExp(`aria-selected="true"[^>]*>(?:<[^>]+>)*${first.number}<`));
  });

  it('draws what the SVG export draws, path for path, with a car in every bay the engine placed', () => {
    for (const sheet of composeSheets(run.building!, meta())) {
      const react = html(<SheetView sheet={sheet} idPrefix="t" onInspect={() => {}} />);
      const svg = sheetSvg(sheet, 't');
      expect(paths(react), sheet.id).toEqual(paths(svg));
      const level = run.building!.levels.find((l) => l.id === sheet.levelId);
      if (sheet.kind === 'PARKING') {
        const bays = Number(level!.parking!.bayCount.value);
        expect(bays).toBeGreaterThan(0);
        expect(react.split('data-car=').length - 1).toBe(bays);
        expect(react.split('data-bay=').length - 1).toBe(bays);
      }
    }
  });

  it('lists every traced value the title strip quotes as a button, in its own ink', () => {
    const sheet = composeSheets(run.building!, meta()).find((s) => s.kind === 'PARKING')!;
    const traced = sheet.facts.filter((f) => f.node && f.provenanceClass);
    expect(traced.length).toBeGreaterThan(0);
    const out = html(<DrawingSet run={run} onInspect={() => {}} />);
    for (const f of traced) {
      expect(out).toContain(`class="traced traced--${f.provenanceClass!.toLowerCase()}" aria-label="${f.label}: ${f.value}.`);
    }
  });

  it('keeps the two sentences on the sheet itself', () => {
    const out = html(<DrawingSet run={run} onInspect={() => {}} />);
    expect(out).toContain('NOT FOR CONSTRUCTION');
    expect(out).toContain('REGULATORY VALIDITY: NOT ASSESSED');
  });

  it('says why a run stored before the building model has no drawing, rather than drawing one', () => {
    const { building: _omitted, ...old } = run;
    const out = html(<DrawingSet run={old} onInspect={() => {}} />);
    expect(out).toContain('computed before drawings were made from the building model');
    expect(out).not.toContain('<svg');
  });
});

describe('VehicleAccessPanel', () => {
  it('names the refused frontages and what was not assessed', () => {
    const out = html(<VehicleAccessPanel levelPlan={run.levelPlan!} onInspect={() => {}} />);
    expect(out).toContain('Refused, and why');
    expect(out).toContain('Not assessed');
    // The T-junction residue needs a road network no affection plan carries. It
    // is reported rather than quietly dropped, and that is the whole point.
    expect(out).toMatch(/junction/i);
  });

  it('offers the alternatives rather than only the winner', () => {
    // "Tell me the entrance is better from here" is advice. A panel showing one
    // answer with no alternatives cannot be overruled, only obeyed.
    const out = html(<VehicleAccessPanel levelPlan={run.levelPlan!} onInspect={() => {}} />);
    expect(out).toContain('Alternatives');
  });
});

describe('MassingPanel', () => {
  it('draws the podium amber when nobody has entered a podium level count', () => {
    const out = html(
      <MassingPanel run={run} onInspect={() => {}} />,
    );
    // The 3D view is the most persuasive surface in the product. A massing whose
    // split between podium and tower rests on an assumption must say so in
    // words, not only in a colour a print or a colour-blind reader will lose.
    expect(out).toContain('rests on an assumption');
    expect(out).toContain('banner--assumed');
  });

  it('lists every volume with the height it was extruded to', () => {
    const out = html(
      <MassingPanel run={run} onInspect={() => {}} />,
    );
    for (const m of run.massing.masses) expect(out).toContain(m.label);
    expect(out).toContain(run.massing.totalHeightM.value);
  });

  it('lists every level of the 3D view in a table a screen reader can read', () => {
    const model = run.building!;
    const out = html(<MassingPanel run={run} onInspect={() => {}} />);
    // The table is the canvas's equivalent: every level, its traced floor level and,
    // on a parking level, the engine's own bay count.
    for (const level of model.levels) {
      const unplaced = level.placed ? '' : ' · permitted, not placed';
      expect(out).toContain(`${level.id} <span class="muted">· ${level.name}${unplaced}</span>`);
    }
    expect(out).toContain(model.drawnBays.value);
    expect(out).toContain('Every level and ramp in the 3D view');
    // The ramp is painted in the view, so it is in the table too, with its gradient.
    for (const r of model.ramps) expect(out).toContain(`Ramp ${r.id}`);
  });

  it('says in words where the engine placed each part, and what the model leaves out', () => {
    const model = run.building!;
    const out = html(<MassingPanel run={run} onInspect={() => {}} />);
    for (const p of model.placements.filter((x) => x.source.provenanceClass === 'ASSUMED')) {
      expect(out).toContain(p.statement);
    }
    expect(out).toContain('Not in this model');
    for (const n of model.notModelled) expect(out).toContain(n.replace(/'/g, '&#x27;'));
  });

  it("says how much of the stack is the answer's, and does not draw the rest as if it were", () => {
    const model = run.building!;
    const out = html(<MassingPanel run={run} onInspect={() => {}} />);
    const answer = model.placements.find((p) => p.subject === 'answer')!;
    expect(out).toContain(answer.statement.replace(/'/g, '&#x27;'));
    expect(model.levels.some((l) => !l.placed)).toBe(true);
    expect(out).toContain('The solid levels are the answer.');
  });

  it('refuses to stand up a run stored before the building model existed', () => {
    const { building: _drop, ...stored } = run;
    const out = html(<MassingPanel run={stored} onInspect={() => {}} />);
    expect(out).toContain('no 3D view of it');
    expect(out).not.toContain('massing-viewer');
  });

  it('never claims the height ceiling was checked for anything but planning', () => {
    const out = html(
      <MassingPanel run={run} onInspect={() => {}} />,
    );
    expect(out).toMatch(/planning limit, not a structural or aviation one/);
  });
});
