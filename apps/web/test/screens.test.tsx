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

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

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
import type { AffectionPlanRead, PlotView, RunView } from '../src/api/client.js';
import { CapacityBands } from '../src/components/CapacityBands.js';
import { GfaStatement } from '../src/components/GfaStatement.js';
import { StaticLocale } from '../src/i18n/locale.js';
import { expectNoEnglishProse, expectSitewideProhibitions } from './prohibitions.js';
import { DrawingSet, SheetView } from '../src/components/DrawingSet.js';
import { AssumptionRegister } from '../src/components/AssumptionRegister.js';
import { formatTraced } from '../src/components/TracedValue.js';
import { MassingPanel } from '../src/components/MassingPanel.js';
import { ParkingPlan, VehicleAccessPanel } from '../src/components/ParkingPlan.js';
import { StepFooter, type FlowState } from '../src/App.js';
import { Reading } from '../src/screens/AffectionPlanIntake.js';
import { readAffectionPlan } from '../../api/src/intake-route.js';
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

  /*
    ENG. MOHAMED'S POINT 7, KEPT ON THE RESULTS SCREEN.

    The rules step takes the saleable figure as a share of GFA or as an area in
    square metres, and its help text promises the share "beside the answer".
    That promise is kept here or not at all: a conversion the engine performs
    and never shows is a conversion nobody checks, and it moves the unit count.
  */
  it('shows the saleable figure both ways, so the one not typed can be checked', () => {
    const out = html(<CapacityBands capacity={run.capacity} onInspect={() => {}} />);
    expect(out).toContain('Saleable area');
    expect(out).toContain('Saleable share of GFA');
    /*
      Both carry the engine's own unrounded string on the element, which is what
      makes them checkable at all — a rounded figure and its rounded partner can
      look consistent while neither is what the engine computed.
    */
    expect(out).toContain(`data-full="${run.capacity.saleableAreaM2.value}"`);
    expect(out).toContain(`data-full="${run.capacity.saleableEfficiency.value}"`);
  });
});

/*
  THE AREA TABLE A SUBMISSION DRAWING CARRIES, from a real run. It must print the
  engine's figures and nothing else: the residential row's total is the engine's
  product, the proposed total is the engine's sum, and nothing on it is a figure
  this component multiplied.
*/
describe('GfaStatement', () => {
  it('states allowed, proposed and the floors that make it up, as the engine computed them', () => {
    const statement = run.gfaStatement!;
    expect(statement).toBeDefined();
    const out = html(<GfaStatement statement={statement} onInspect={() => {}} />);
    expect(out).toContain('GFA calculation');
    expect(out).toContain('Plot area');
    expect(out).toContain('Gross floor area allowed');
    expect(out).toContain('Total gross floor area proposed');
    expect(out).toContain('Residential floors');
    // Every traced area carries the engine's own unrounded figure on the element.
    for (const traced of [statement.allowed, statement.proposed, statement.rows[0]!.area]) {
      expect(out).toContain(`data-full="${traced.traced.value}"`);
    }
    // Square feet beside every area, as the drawings carry them.
    expect(out).toContain(statement.proposed.ft2);
    expect(out).toContain(`× ${statement.rows[0]!.count}`);
    expectSitewideProhibitions(out, 'GfaStatement');
  });

  it('prints no parking row on a run where parking is excluded from FAR', () => {
    const out = html(<GfaStatement statement={run.gfaStatement!} onInspect={() => {}} />);
    expect(run.capacity.parkingInFarTreatment.value).toBe('EXCLUDED_FROM_FAR');
    expect(out).not.toContain('counted toward FAR');
  });

  it('reads in Arabic, with the figures and level ids left as the engine wrote them', () => {
    const out = renderToStaticMarkup(
      <StaticLocale locale="ar">
        <GfaStatement statement={run.gfaStatement!} onInspect={() => {}} />
      </StaticLocale>,
    );
    expect(out).toContain('حساب إجمالي المساحة الطابقية');
    expect(out).toContain(run.gfaStatement!.proposed.ft2);
    expectNoEnglishProse(out, 'GfaStatement (ar)');
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

  // The unit mix is a list, and on one unbreakable line it squeezed the basis column
  // to a word per line. Each item gets its own line, in a cell that may wrap.
  it('sets a value that is a list one item to a line, in a cell that wraps', () => {
    // The shape `nodeText` gives a list of objects: items joined with "; ".
    const mix = {
      ...run.assumptions[0]!,
      parameterId: 'parking.unit_mix',
      value:
        'typeId 1BED, label 1 bedroom, share 0.5, nsaM2 70, count 40; ' +
        'typeId 2BED, label 2 bedroom, share 0.375, nsaM2 110, count 30; ' +
        'typeId 3BED, label 3 bedroom, share 0.125, nsaM2 160, count 10',
      unit: null,
    };
    const out = html(
      <AssumptionRegister assumptions={[mix]} onInspect={() => {}} onAcknowledge={() => {}} onEdit={() => {}} acknowledged={false} />,
    );
    const items = mix.value.split('; ');
    expect(out.match(/class="value__line"/g)?.length).toBe(items.length);
    expect(out).toContain('class="data-table__text"');
    for (const item of items) expect(out).toContain(item);
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
  const meta = (): { plotNumber: string; community: string; runId: string; issuedAt: string } => ({
    plotNumber: run.plot.plotNumber,
    community: run.plot.community,
    runId: run.runId,
    issuedAt: '2026-09-29T08:00:00.000Z',
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
      // Escaped, as the two assertions below already do it: React escapes an
      // apostrophe to `&#x27;`, and this loop passed only for as long as no
      // engine sentence it reached contained one. The core's placement does.
      expect(out).toContain(p.statement.replace(/'/g, '&#x27;'));
    }
    expect(out).toContain('Not in this model');
    for (const n of model.notModelled) expect(out).toContain(n.replace(/'/g, '&#x27;'));
  });

  /*
    THE CORE — Eng. Mohamed, 2026-09-28, the one thing he called الاهم.

    The panel's first job is to stop a reader concluding that the capacity figure
    above it was reduced by the size of the core. It was not, and could not be
    without being wrong twice: a core is inside GFA, and it is inside the
    saleable efficiency the run was given.
  */
  it('shows the core, and says that nothing above it was reduced for it', () => {
    const out = html(<MassingPanel run={run} onInspect={() => {}} />);
    expect(out).toContain('The core');
    expect(out).toContain('no figure above it is reduced for it');
    expect(out).toContain(`data-full="${run.core!.areaM2.value}"`);
    expect(out).toContain(`data-full="${run.core!.plateShare.value}"`);
  });

  it('prints the engine\u2019s two comparisons word for word, not a rendering of them', () => {
    const out = html(<MassingPanel run={run} onInspect={() => {}} />);
    expect(run.core!.reconciliation).toHaveLength(2);
    for (const line of run.core!.reconciliation) {
      expect(out).toContain(line.replace(/'/g, '&#x27;'));
    }
  });

  it('says the outline is an area rather than a laid-out core', () => {
    const out = html(<MassingPanel run={run} onInspect={() => {}} />);
    expect(out).toContain('no lift, stair, riser or core wall is placed');
  });

  it('draws no core block for a run stored before the engine sized one', () => {
    const { core: _drop, ...stored } = run;
    const out = html(<MassingPanel run={stored} onInspect={() => {}} />);
    expect(out).not.toContain('no figure above it is reduced for it');
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

describe('a traced figure on screen', () => {
  it('is never rounded to a whole number it is not', () => {
    // The affection plan's FAR arrived without a unit and was printed as a count:
    // the sheet's 3.5 read "4" on the screen that exists to show what the sheet says.
    expect(formatTraced('3.5')).toBe('3.5');
    expect(formatTraced('5.0538')).toBe('5.054');
    expect(formatTraced('3.5', 'ratio')).toBe('3.500');
    // Counts stay counts, and areas keep the policy's one place.
    expect(formatTraced('42', 'bays')).toBe('42');
    expect(formatTraced('1365.23', 'm²')).toBe('1,365.2');
  });
});

/**
 * The step footer, which exists because of a reported dead end.
 *
 * `ParametersStep` prints a tick and no button once `G1` is signed, so returning to
 * that step left the reader with nothing to press — and no step had a back control
 * at all. What is asserted here is the two properties that made it a defect rather
 * than a missing nicety: **there is always a way on or a statement that there is
 * none**, and **a closed way on says what would open it**. Neither is visible in a
 * screenshot of a clean run, which is exactly why they need a test.
 */
describe('StepFooter', () => {
  const state = (over: Partial<FlowState> = {}): FlowState => ({
    plot: null,
    confirmed: false,
    run: null,
    ...over,
  });

  it('names the step each button reaches, rather than repeating "Continue"', () => {
    const out = html(<StepFooter step="plot" flow={state({ plot: plotView })} onGo={() => {}} />);
    expect(out).toContain('Back to ');
    expect(out).toContain('Sheet');
    expect(out).toContain('Continue to ');
    expect(out).toContain('Parameters');
  });

  it('opens the way forward once the step ahead has what it needs', () => {
    const out = html(
      <StepFooter step="parameters" flow={state({ plot: plotView, confirmed: true })} onGo={() => {}} />,
    );
    expect(out).toContain('Continue to ');
    expect(out).toContain('Rules');
    expect(out).not.toContain('disabled=""');
  });

  /* THE DEFECT ITSELF. Confirmed plot, reopened step: before the footer existed this
     render carried a tick and nothing else. */
  it('still offers a way on from a step whose gate is already signed', () => {
    const out = html(
      <StepFooter step="parameters" flow={state({ plot: plotView, confirmed: true })} onGo={() => {}} />,
    );
    expect(out).toMatch(/<button[^>]*step-footer__next/);
  });

  it('says what would open a step that is not reachable, rather than dimming a dead end', () => {
    const closed = html(<StepFooter step="parameters" flow={state({ plot: plotView })} onGo={() => {}} />);
    expect(closed).toContain('disabled=""');
    expect(closed).toContain('Confirm the plot first, and this opens.');

    const noPlot = html(<StepFooter step="plot" flow={state()} onGo={() => {}} />);
    expect(noPlot).toContain('Create the plot first, and this opens.');

    const noRun = html(
      <StepFooter step="rules" flow={state({ plot: plotView, confirmed: true })} onGo={() => {}} />,
    );
    expect(noRun).toContain('Run the engine on the rules step first, and this opens.');
  });

  it('shows no back control on the first step and no forward control on the last', () => {
    const first = html(<StepFooter step="intake" flow={state()} onGo={() => {}} />);
    expect(first).not.toContain('step-footer__back');

    const last = html(<StepFooter step="export" flow={state({ plot: plotView, confirmed: true, run })} onGo={() => {}} />);
    expect(last).not.toContain('step-footer__next');
    expect(last).toContain('This is the last step.');
  });

  /* A second `<nav>` on a page needs a name of its own, or a screen reader lists two
     landmarks called the same thing. The strip is "Steps"; this one is not. */
  it('names its own landmark', () => {
    const out = html(<StepFooter step="plot" flow={state({ plot: plotView })} onGo={() => {}} />);
    expect(out).toContain('aria-label="Move between steps"');
    expect(out).not.toContain('aria-label="Steps"');
  });
});

/**
 * The affection-plan reading, rendered against two real sheets.
 *
 * `Reading` is the most involved panel in the intake screen and it had **no render
 * test at all** — not in English, not in the Arabic matrix, which rendered only the
 * empty screen and the error banner. So the panel the client actually complained
 * about was the one panel nothing watched.
 *
 * TWO SHEETS, BECAUSE ONE OF THEM CANNOT EXERCISE IT. The Warsan sheet the user
 * guide is built on is COMPLETE — it prints every limit the parser looks for, so
 * "What this sheet does not say" never renders for it, and a test that used it
 * alone would have passed while asserting nothing. `DJAZ1MED12RES011` prints G+11
 * and no plot ratio, no permitted area, no setback and no coverage; it is the sheet
 * `CLAUDE.md` names as the reason the product exists, and it is the one that makes
 * this panel appear.
 *
 * The facts come from `readAffectionPlan`, the route's own function, serialised the
 * way the route serialises: what is asserted is what the API sends, not a literal
 * someone typed to match it.
 */
describe('the affection-plan reading', () => {
  const SHEETS = {
    complete: 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf',
    incomplete: 'docs/00-source/developer-standards/azizi/Plot DJAZ1MED12RES011-178.pdf',
  } as const;

  const readings: Record<keyof typeof SHEETS, AffectionPlanRead> = {} as never;

  beforeAll(async () => {
    for (const [key, rel] of Object.entries(SHEETS)) {
      const path = fileURLToPath(new URL(`../../../${rel}`, import.meta.url));
      const bytes = new Uint8Array(await readFile(path));
      readings[key as keyof typeof SHEETS] = (await readAffectionPlan(
        bytes,
        rel.split('/').pop() ?? rel,
      )) as AffectionPlanRead;
    }
  }, 120_000);

  it('says nothing is missing when the sheet states everything', () => {
    const read = readings.complete;
    expect(read.facts.missing.length).toBe(0);
    const out = html(<Reading read={read} attachment={null} onUse={() => {}} />);
    // No heading, no lead, no argument — an empty section would be a heading over
    // nothing, which reads as a finding the sheet did not produce.
    expect(out).not.toContain('What this sheet does not say');
    expect(out).not.toContain('These are limits this sheet is silent on.');
  });

  it('names every gap in the engine’s own words', () => {
    const read = readings.incomplete;
    expect(read.facts.missing.length).toBeGreaterThan(0);
    const out = html(<Reading read={read} attachment={null} onUse={() => {}} />);
    expect(out).toContain('What this sheet does not say');
    for (const gap of read.facts.missing) {
      expect(out).toContain(gap.label);
      expect(out).toContain(gap.consequence);
    }
  });

  /*
    THE THREE LAYERS, in order. The client's line was «وفي حجات موجوده مش مفهومه
    بالنسبالي» — the panel was correct and unreadable, because the argument arrived
    before the plain sentence, inside a red banner. Order is the assertion.
  */
  it('states the fact and the action before the argument, and keeps the argument closed', () => {
    const out = html(<Reading read={readings.incomplete} attachment={null} onUse={() => {}} />);
    const lead = out.indexOf('These are limits this sheet is silent on.');
    const why = out.indexOf('Why the engine will not fill a gap in a sheet');
    expect(lead).toBeGreaterThan(-1);
    expect(why).toBeGreaterThan(lead);
    expect(out).toMatch(/<details[^>]*class="disclosure"/);
    expect(out).not.toMatch(/<details[^>]*\sopen[\s>]/);
    // The argument left the alert; an alert is the worst place on the screen for a
    // paragraph, and it is where this one used to live.
    expect(out).not.toMatch(/role="alert"[\s\S]{0,400}borrowed/);
  });

  /* A sheet that cannot drive a run says so, and says what the reader can still do.
     The gap labels inside the banner are the engine's, not the screen's. */
  it('refuses the run on a sheet missing a binding limit, and offers the way round it', () => {
    const read = readings.incomplete;
    expect(read.facts.blocking.length).toBeGreaterThan(0);
    const out = html(<Reading read={read} attachment={null} onUse={() => {}} />);
    expect(out).toContain('This sheet cannot drive a capacity run.');
    expect(out).toContain('You can still create the plot and enter those limits yourself');
    for (const gap of read.facts.blocking) expect(out).toContain(gap.label);
  });

  /* Said on every reading, not only on an incomplete one — and it is the API's
     sentence, so a screen that stopped rendering it would be dropping a disclosure
     rather than editing copy. */
  it('carries the disclaimer the API wrote, verbatim, on both sheets', () => {
    for (const read of [readings.complete, readings.incomplete]) {
      const out = html(<Reading read={read} attachment={null} onUse={() => {}} />);
      expect(read.disclaimer).toContain('REGULATORY VALIDITY: NOT ASSESSED');
      expect(out).toContain(read.disclaimer);
    }
  });
});
