/**
 * THE ENGINE'S LATER STEPS AND ITS SHARED COMPONENTS, IN ARABIC, AGAINST A REAL RUN.
 *
 * Step 7 (Checks), step 8 (Evidence), and the components every engine screen and the
 * public pages draw from: the traced value — where the amber ASSUMED treatment lives —
 * the assumption register, the capacity bands, the derivation tree, the massing panel
 * and its 3D viewer, the parking plan and the drawing set.
 *
 * Rendered from the engine, not from a fixture: three real runs (a rectangle, a
 * skewed plot whose podium is not a rectangle, and a rectangle given its podium split)
 * go through the pipeline, the checks and the presenter exactly as the API sends them,
 * so an Arabic label that only works on the one shape somebody tried fails here.
 *
 * FOUR THINGS ARE HELD, AND EACH IS A FAILURE NO ENGLISH TEST CAN SEE:
 *
 * 1. NO ENGLISH PROSE outside `Verbatim` (`expectNoEnglishProse`), and the site's
 *    prohibitions over the Arabic page as over the English one.
 * 2. THE AMBER TREATMENT SURVIVES THE LANGUAGE. Wherever the English render carries
 *    it, the Arabic carries it too, element for element — a translation that dropped
 *    a class would tone amber down in the language nobody on the team reads.
 * 3. THE DRAWING DOES NOT CHANGE WITH THE LANGUAGE. Every `<svg>` a component draws
 *    is compared between the two renders and must be identical, attribute for
 *    attribute and path for path, bar one: the root's `aria-label`, which is the
 *    drawing's accessible NAME, is copy and is read in the reader's language. The
 *    geometry, the in-drawing text and the sheet's own notes are the engine's.
 * 4. THE ENGINE'S WORDS ARE NOT TRANSLATED. A basis, a placement statement, a
 *    validator's sentence, a sheet's notes: each is found verbatim in the Arabic
 *    render, and none of it is in the text an Arabic reader is read as Arabic.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import { buildAssumptionRegister, runPipeline, type RunInput } from '@envelope/capacity';
import type { Plot } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { composeSheets } from '@envelope/sheets';

import { runChecks } from '../../api/src/checks.js';
import { ENGINE_VERSION, presentRun } from '../../api/src/present.js';
import { plotOf, RECT_80x40, runInput, SKEWED } from '../../../test-support/pipeline.js';
import type { PlotView, RunView } from '../src/api/client.js';
import { AssumptionRegister } from '../src/components/AssumptionRegister.js';
import { BuildingViewer } from '../src/components/BuildingViewer.js';
import { CapacityBands } from '../src/components/CapacityBands.js';
import { DrawingSet, SheetView } from '../src/components/DrawingSet.js';
import { MassingPanel } from '../src/components/MassingPanel.js';
import { ModelFigure } from '../src/components/ModelFigure.js';
import { ParkingPlan, VehicleAccessPanel } from '../src/components/ParkingPlan.js';
import { ProvenanceTree, type ProvTree } from '../src/components/ProvenanceTree.js';
import { NotAssessed, ProvenanceLegend, TracedValue, type TracedWire } from '../src/components/TracedValue.js';
import { WorkedExampleModel } from '../src/components/WorkedExampleModel.js';
import { StaticLocale } from '../src/i18n/locale.js';
import { ChecksStep } from '../src/screens/ChecksStep.js';
import { UnitMixSummary } from '../src/screens/RulesStep.js';
import { EvidenceStep } from '../src/screens/EvidenceStep.js';
import {
  arabicReadingText,
  expectAssumedTreatmentPresent,
  expectNoBannedVocabulary,
  expectNoComplianceClaim,
  expectNoCountInHeadings,
  expectNoEnglishProse,
  expectNoInventedNumber,
  expectSitewideProhibitions,
} from './prohibitions.js';

/* -------------------------------------------------------------------------
 * The runs, as the API presents them.
 * ---------------------------------------------------------------------- */

function present(input: RunInput): RunView {
  const output = runPipeline(input);
  const checks = runChecks({
    runId: 'r1',
    plot: input.plot,
    input,
    output,
    engineVersion: ENGINE_VERSION,
    ruleSetHash: 'test',
    geometry: { areasRecomputed: 3, areaDisagreements: 0 },
    validatedAt: '2026-08-30T00:00:00.000Z',
  });
  return presentRun('r1', input.plot, output, buildAssumptionRegister(input, output), 12, true, checks) as unknown as RunView;
}

function plotViewOf(plot: Plot): PlotView {
  return {
    plotId: plot.plotId,
    plotNumber: plot.plotNumber,
    community: plot.community,
    shapeClass: plot.shapeClass,
    computedAreaM2: '3200.00',
    statedAreaM2: '3200.00',
    areaMismatch: false,
    vertices: plot.ring.map((p) => ({ x: String(p.x / 1000), y: String(p.y / 1000) })),
    edges: plot.edges.map((e) => ({
      seq: e.seq,
      classification: e.classification,
      roadHierarchy: e.roadHierarchy,
      lengthM: String(e.lengthMm / 1000),
    })),
  } as unknown as PlotView;
}

interface WireGraph {
  nodes: { id: string; [k: string]: unknown }[];
  edges: { from: string; to: string; kind: string }[];
}

/** The tree the API's `/provenance/:node` route returns, walked the way it walks it. */
function treeOf(graph: WireGraph, rootId: string, seen = new Set<string>()): ProvTree {
  const node = graph.nodes.find((n) => n.id === rootId)!;
  if (seen.has(rootId)) return { node: node as unknown as ProvTree['node'], edges: [] };
  const next = new Set(seen).add(rootId);
  return {
    node: node as unknown as ProvTree['node'],
    edges: graph.edges
      .filter((e) => e.from === rootId && graph.nodes.some((n) => n.id === e.to))
      .map((e) => ({ kind: e.kind, child: treeOf(graph, e.to, next) })),
  };
}

let rect: RunView;
let skewed: RunView;
let podium: RunView;
let rectPlot: PlotView;
let skewedPlot: PlotView;

beforeAll(async () => {
  await initGeometry();
  rect = present(runInput(RECT_80x40));
  skewed = present(runInput(SKEWED));
  podium = present(runInput(RECT_80x40, { podiumLevels: 2 }));
  rectPlot = plotViewOf(plotOf(RECT_80x40));
  skewedPlot = plotViewOf(plotOf(SKEWED));
});

const noop = (): void => {};

/**
 * Every variant of every component in this surface, by name — each step and panel
 * on each run, each state a panel has, a derivation tree rooted at every kind of node
 * the graph holds, and a traced value of every class.
 */
function variants(): Record<string, JSX.Element> {
  const out: Record<string, JSX.Element> = {};
  const runs = { rect, skewed, podium } as const;
  for (const [name, run] of Object.entries(runs)) {
    const plot = name === 'skewed' ? skewedPlot : rectPlot;
    out[`checks/${name}`] = <ChecksStep run={run} />;
    out[`evidence/${name}`] = <EvidenceStep run={run} plot={plot} onInspect={noop} />;
    out[`register/${name}`] = (
      <AssumptionRegister assumptions={run.assumptions} acknowledged={false} onAcknowledge={noop} onEdit={noop} onInspect={noop} />
    );
    out[`register-ack/${name}`] = (
      <AssumptionRegister assumptions={run.assumptions} acknowledged onAcknowledge={noop} onEdit={noop} onInspect={noop} />
    );
    out[`bands/${name}`] = <CapacityBands capacity={run.capacity} onInspect={noop} />;
    run.assumptions.forEach((a, i) => {
      out[`bands-assumption-${i}/${name}`] = (
        <CapacityBands capacity={run.capacity} onInspect={noop} governingAssumption={a} />
      );
    });
    out[`massing/${name}`] = <MassingPanel run={run} onInspect={noop} />;
    if (run.building) {
      out[`viewer/${name}`] = <BuildingViewer model={run.building} onInspect={noop} />;
      out[`viewer-noinspect/${name}`] = <BuildingViewer model={run.building} />;
      out[`viewer-figure/${name}`] = <BuildingViewer model={run.building} variant="figure" />;
      out[`viewer-figure-level/${name}`] = (
        <BuildingViewer model={run.building} variant="figure" focusLevelId={run.building.levels[0]!.id} />
      );
      out[`model-figure/${name}`] = <ModelFigure model={run.building} />;
      const sheets = composeSheets(run.building, { plotNumber: run.plot.plotNumber, community: run.plot.community, runId: run.runId });
      for (const s of sheets) out[`sheet-${s.id}/${name}`] = <SheetView sheet={s} idPrefix="t" onInspect={noop} />;
      for (const kind of ['PARKING', 'SITE', 'TYPICAL', 'SECTION'] as const) {
        out[`drawing-set-${kind}/${name}`] = <DrawingSet run={run} onInspect={noop} initialKind={kind} />;
      }
    }
    if (run.levelPlan) {
      out[`parking/${name}`] = <ParkingPlan levelPlan={run.levelPlan} plotVertices={plot.vertices} onInspect={noop} />;
      out[`parking-noplot/${name}`] = <ParkingPlan levelPlan={run.levelPlan} onInspect={noop} />;
      out[`parking-nofigure/${name}`] = <ParkingPlan levelPlan={run.levelPlan} onInspect={noop} figure={false} />;
      out[`access/${name}`] = <VehicleAccessPanel levelPlan={run.levelPlan} onInspect={noop} />;
    }
    const graph = (run as unknown as { provenance: WireGraph }).provenance;
    const roots = [
      run.capacity.governingGfa.node,
      run.capacity.bandA.node,
      run.capacity.bandC.node,
      ...run.assumptions.map((a) => a.nodeId),
    ];
    roots.forEach((root, i) => {
      out[`tree-${i}/${name}`] = <ProvenanceTree tree={treeOf(graph, root)} loading={false} onClose={noop} />;
    });
    // One tree rooted at the first node of every kind the graph holds, so a rule, a
    // source clause, a user and a constraint are each drawn open at least once.
    const kinds = [...new Set(graph.nodes.map((n) => String(n['kind'])))].sort();
    for (const kind of kinds) {
      const first = graph.nodes.find((n) => n['kind'] === kind)!;
      out[`tree-kind-${kind}/${name}`] = <ProvenanceTree tree={treeOf(graph, first.id)} loading={false} onClose={noop} />;
    }
  }
  const { building: _drop, ...stored } = rect;
  out['massing/stored'] = <MassingPanel run={stored} onInspect={noop} />;
  out['drawing-set/stored'] = <DrawingSet run={stored} onInspect={noop} />;
  out['register/empty'] = (
    <AssumptionRegister assumptions={[]} acknowledged={false} onAcknowledge={noop} onEdit={noop} onInspect={noop} />
  );
  out['tree/loading'] = <ProvenanceTree tree={null} loading onClose={noop} />;
  out['tree/none'] = <ProvenanceTree tree={null} loading={false} onClose={noop} />;
  /*
    THE UNIT MIX, BOTH CLASSES. The assumed one is the variant that matters: it
    is the only place in the flow where an ASSUMED value is disclosed BEFORE the
    run rather than in the register after it, and the amber has to survive the
    translation there as it does everywhere else.
  */
  out['mix/assumed'] = (
    <UnitMixSummary
      mix={{
        source: 'ASSUMED',
        entries: [
          { typeId: '1BED', label: '1 bedroom', share: '0.5', nsaM2: '70' },
          { typeId: '2BED', label: '2 bedroom', share: '0.5', nsaM2: '110' },
        ],
        basis: 'a generic Dubai apartment mix, used because no developer standard was selected',
      }}
    />
  );
  out['mix/user-set'] = (
    <UnitMixSummary
      mix={{
        source: 'USER_SET',
        entries: [{ typeId: '1BED', label: '1 bedroom', share: '1', nsaM2: '70' }],
        basis: 'the unit mix recorded with the worked example',
      }}
    />
  );
  out['legend'] = <ProvenanceLegend />;
  out['not-assessed'] = <NotAssessed reason="No rule is loaded for this." />;
  out['worked-example'] = <WorkedExampleModel />;
  const wire = (cls: TracedWire['provenanceClass'], unit?: string): TracedWire => ({
    value: '1234.5678',
    node: 'n1',
    parameterId: 'parking.bay_area_factor',
    provenanceClass: cls,
    renderHint: '',
    ...(unit ? { unit } : {}),
  });
  for (const cls of ['DERIVED', 'ASSUMED', 'USER_SET', 'OBSERVED', 'TRADEOFF', 'VARIANCE'] as const) {
    out[`traced-${cls}`] = <TracedValue traced={wire(cls, 'm²')} onInspect={noop} />;
    out[`traced-edit-${cls}`] = <TracedValue traced={wire(cls)} onInspect={noop} onEdit={noop} actorName="Test Architect" />;
    out[`traced-display-${cls}`] = <TracedValue traced={wire(cls, 'ratio')} onInspect={noop} size="display" />;
  }
  return out;
}

const inEnglish = (node: JSX.Element): string =>
  renderToStaticMarkup(<StaticLocale locale="en">{node}</StaticLocale>);
const inArabic = (node: JSX.Element): string =>
  renderToStaticMarkup(<StaticLocale locale="ar">{node}</StaticLocale>);

/** Both renders of every variant, taken once. */
function renders(): { readonly key: string; readonly en: string; readonly ar: string; readonly bare: string }[] {
  return Object.entries(variants()).map(([key, node]) => ({
    key,
    en: inEnglish(node),
    ar: inArabic(node),
    bare: renderToStaticMarkup(node),
  }));
}

/** How React writes a string into markup, so an engine string can be found in it. */
const escaped = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

/* -------------------------------------------------------------------------
 * 1. Arabic, and nothing in English that is not the engine's.
 * ---------------------------------------------------------------------- */

describe('the Arabic render of every component in this surface', () => {
  it('is produced for every variant, and English stays the default', () => {
    const all = renders();
    // An empty list would make every assertion below pass.
    expect(all.length).toBeGreaterThan(100);
    for (const r of all) {
      // No provider is English — the tests elsewhere mount these bare — and an
      // explicit English provider changes nothing.
      expect(r.en, r.key).toBe(r.bare);
    }
  });

  it('leaves no English prose outside Verbatim', () => {
    for (const r of renders()) expectNoEnglishProse(r.ar, r.key);
  });

  it('carries no Arabic-Indic digit: a traced value is byte-identical to what the engine produced', () => {
    for (const r of renders()) expect(r.ar, r.key).not.toMatch(/[٠-٩۰-۹]/);
  });

  it('answers to the site-wide prohibitions', () => {
    for (const r of renders()) {
      if (!r.key.startsWith('checks/')) {
        expectSitewideProhibitions(r.ar, r.key);
        continue;
      }
      /*
        THE ONE EXCEPTION, AND IT IS THE ENGLISH SCREEN'S, NOT THE TRANSLATION'S.

        Step 7's deferred-rules heading carries its count in a chip inside the <h3>
        — "Applicable, and not assessed [4]" — and so does the English render, which
        this pass may not change. The words of the heading are still held: with the
        count chips removed, no digit and no number word may remain in any heading.
      */
      expectNoComplianceClaim(r.ar, r.key);
      expectNoInventedNumber(r.ar, r.key);
      expectNoBannedVocabulary(r.ar, r.key);
      expectNoCountInHeadings(r.ar.replace(/<span class="chip[^"]*">[^<]*<\/span>/g, ''), r.key);
    }
  });

  it('never calls an output compliant, invalid or non-compliant, and never says «افتراضي»', () => {
    for (const r of renders()) {
      const text = arabicReadingText(r.ar);
      expect(text, r.key).not.toMatch(/غير صالح|غير مطابق|افتراضي/);
      // «مطابقة» appears on this surface once, negated.
      for (const m of text.matchAll(/[؀-ۿ]*مطابق[؀-ۿ]*/gu)) {
        const before = text.slice(Math.max(0, (m.index ?? 0) - 12), m.index);
        expect(before, `${r.key}: «${m[0]}» unnegated`).toMatch(/(ليس|ليست|لا|غير|وليس)\s*$/u);
      }
    }
  });
});

/* -------------------------------------------------------------------------
 * 2. Amber, in both languages, element for element.
 * ---------------------------------------------------------------------- */

describe('the ASSUMED treatment', () => {
  const count = (markup: string, pattern: RegExp): number => (markup.match(pattern) ?? []).length;

  it('is rendered in Arabic wherever it is rendered in English, and as often', () => {
    let seen = 0;
    for (const r of renders()) {
      for (const pattern of [/data-state="assumed"/g, /traced--assumed/g, /chip--assumed/g, /banner--assumed/g]) {
        expect(count(r.ar, pattern), `${r.key} ${pattern}`).toBe(count(r.en, pattern));
      }
      if (/data-state="assumed"|traced--assumed|margin-tally/.test(r.en)) {
        expectAssumedTreatmentPresent(r.ar, r.key);
        seen += 1;
      }
    }
    expect(seen, 'no variant carried the treatment, so nothing was checked').toBeGreaterThan(10);
  });

  it('says «مُفترَض — لك أن تُعدِّله» where the English says an assumption can be edited', () => {
    const traced = inArabic(
      <TracedValue
        traced={{ value: '32', node: 'n1', parameterId: 'parking.bay_area_factor', provenanceClass: 'ASSUMED', renderHint: '', unit: 'm²/bay' }}
        onInspect={noop}
        onEdit={noop}
      />,
    );
    expect(traced).toContain('class="traced traced--assumed"');
    expect(traced).toContain('مُفترَض — لا تحكمه قاعدة. لك أن تُعدِّله.');
    expect(traced).toContain('<span class="sr-only"> (مُفترَض)</span>');
    // The pencil marker is the stylesheet's, on the same element in both languages.
    expect(traced).toContain('<span class="traced__marker" aria-hidden="true"></span>');
    // The parameter id and the figure are the engine's, and are not translated.
    expect(traced).toMatch(/aria-label="parking\.bay_area_factor: 32 m²\/bay\./);

    const legend = inArabic(<ProvenanceLegend />);
    expect(legend).toContain('مُفترَض — لك أن تُعدِّله');
    expect(legend).toContain('من قاعدة مُستشهَد بها');
    expect(legend).toContain('أنت أدخلته');
    expect(legend).toContain('لم يُقيَّم');
  });
});

/* -------------------------------------------------------------------------
 * 3. The drawing is the same drawing in both languages.
 * ---------------------------------------------------------------------- */

describe('the drawings', () => {
  /**
   * Every `<svg>` in a render, with the root's accessible name taken out. None of
   * these components nests one drawing inside another, so a lazy match is exact.
   */
  const drawings = (markup: string): string[] =>
    [...markup.matchAll(/<svg\b[\s\S]*?<\/svg>/g)]
      .map((m) => m[0])
      /*
        Step 8 embeds the plot figure from step 1 (`PlotCanvas`). That figure is not
        a sheet: it is not composed from the display list, and its edge labels are
        hand-written words, which its own translation localises. It is held by that
        screen's tests, not by this one.
      */
      .filter((svg) => !/^<svg\b[^>]*class="plot-svg"/.test(svg))
      .map((svg) => svg.replace(/^<svg\b([^>]*?) aria-label="[^"]*"/, '<svg$1'));

  it('are identical in English and Arabic, geometry, in-drawing text and all', () => {
    let compared = 0;
    for (const r of renders()) {
      const en = drawings(r.en);
      expect(drawings(r.ar), r.key).toEqual(en);
      compared += en.length;
    }
    expect(compared, 'no drawing was compared').toBeGreaterThan(30);
  });

  it('carry, in Arabic, exactly the bays the engine placed, car for car', () => {
    for (const run of [rect, skewed, podium]) {
      const sheets = composeSheets(run.building!, { plotNumber: run.plot.plotNumber, community: run.plot.community, runId: run.runId });
      for (const sheet of sheets.filter((s) => s.kind === 'PARKING')) {
        const bays = Number(run.building!.levels.find((l) => l.id === sheet.levelId)!.parking!.bayCount.value);
        const markup = inArabic(<SheetView sheet={sheet} idPrefix="t" onInspect={noop} />);
        expect(markup.split(' data-car="').length - 1, sheet.id).toBe(bays);
        expect(markup.split(' data-bay="').length - 1, sheet.id).toBe(bays);
        // The two sentences on the sheet are the sheet's, in the language it prints.
        expect(markup).toContain('NOT FOR CONSTRUCTION');
        expect(markup).toContain('REGULATORY VALIDITY: NOT ASSESSED');
      }
    }
  });

  it('name themselves in Arabic, because a name is copy and the drawing is not', () => {
    const plan = inArabic(<ParkingPlan levelPlan={rect.levelPlan!} onInspect={noop} />);
    expect(plan).toMatch(/aria-label="المواقف الموزّعة: \d+،/);
    const sheet = composeSheets(rect.building!, { plotNumber: rect.plot.plotNumber, community: rect.plot.community, runId: rect.runId })[0]!;
    const view = inArabic(<SheetView sheet={sheet} idPrefix="t" onInspect={noop} />);
    expect(view).toContain(`${sheet.number} ${escaped(sheet.title)}، مرسومة بمقياس 1:${sheet.view.scale}.`);
  });
});

/* -------------------------------------------------------------------------
 * 4. The engine's words, verbatim.
 * ---------------------------------------------------------------------- */

describe("the engine's own words", () => {
  const verbatim = (markup: string, text: string, label: string): void => {
    expect(markup, `${label}: "${text.slice(0, 60)}" is missing`).toContain(escaped(text));
    // And an Arabic reader's screen reader is told it is English.
    expect(arabicReadingText(markup), `${label}: "${text.slice(0, 60)}" is read as Arabic copy`).not.toContain(text);
  };

  it('Checks: every claim detail, both notices and every deferred rule, as the validator wrote them', () => {
    for (const run of [rect, skewed, podium]) {
      const markup = inArabic(<ChecksStep run={run} />);
      const v = run.checks.validation;
      for (const claim of Object.values(v.claims)) verbatim(markup, claim.detail, 'claim');
      verbatim(markup, v.selfConsistencyNotice, 'self-consistency notice');
      verbatim(markup, v.independenceLimit, 'independence limit');
      verbatim(markup, run.checks.invariants.dormantNote, 'dormant note');
      for (const o of v.outcomes.filter((x) => x.category === 'DEFERRED')) {
        const id = String(o.ruleId);
        expect(markup).toContain(id);
        const said = o.reason ?? o.statement;
        expect(said, `${id} says nothing`).toBeDefined();
        verbatim(markup, said!, id);
      }
    }
  });

  it('Checks: the five claims in §16.5’s order, regulatory validity never claimed, and nothing not assessed called a verdict', () => {
    const markup = inArabic(<ChecksStep run={rect} />);
    const order = [
      'الاتّساق الذاتي',
      'تغطية القواعد',
      'الصلاحية الهندسية',
      'الاتّفاق مع الحكم المهني',
      'الصلاحية التنظيمية',
    ].map((t) => markup.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(markup).toContain('claim--never');
    expect(markup).toContain('لا يُدَّعى إطلاقًا');
    expect(markup).toContain('لم يُقيَّم');
    expect(markup).toContain('لا تُحتسب اجتيازات');
    const { ran, total } = rect.checks.invariants;
    expect(markup).toContain(`${ran} من ${total}`);
    expect(markup).not.toContain(`${total} من ${total}`);
  });

  it('the register: every label, parameter id and basis', () => {
    for (const run of [rect, skewed, podium]) {
      const markup = inArabic(
        <AssumptionRegister assumptions={run.assumptions} acknowledged={false} onAcknowledge={noop} onEdit={noop} onInspect={noop} />,
      );
      for (const a of run.assumptions) {
        verbatim(markup, a.basis, a.parameterId);
        verbatim(markup, a.parameterId, a.parameterId);
      }
    }
  });

  it('the massing panel: every placement statement, every line of what the model leaves out, every level name', () => {
    for (const run of [rect, skewed, podium]) {
      const markup = inArabic(<MassingPanel run={run} onInspect={noop} />);
      for (const p of run.building!.placements) verbatim(markup, p.statement, p.subject);
      for (const n of run.building!.notModelled) verbatim(markup, n, 'notModelled');
      for (const l of run.building!.levels) expect(markup).toContain(`>${escaped(l.name)}</span>`);
      for (const r of run.building!.ramps) expect(markup).toContain(`المنحدر ${r.id}`);
    }
  });

  it('the drawing set: each sheet’s facts and notes as the sheet states them', () => {
    for (const run of [rect, skewed, podium]) {
      const sheets = composeSheets(run.building!, { plotNumber: run.plot.plotNumber, community: run.plot.community, runId: run.runId });
      const first = sheets.find((s) => s.kind === 'PARKING')!;
      const markup = inArabic(<DrawingSet run={run} onInspect={noop} />);
      for (const f of first.facts) expect(markup).toContain(`<dt><span dir="ltr" lang="en" class="verbatim">${escaped(f.label)}</span></dt>`);
      for (const n of first.notes) verbatim(markup, n, first.id);
    }
  });

  it('the derivation tree: a clause is quoted in its instrument’s words, never translated', () => {
    const graph = (rect as unknown as { provenance: WireGraph }).provenance;
    const clause = graph.nodes.find((n) => n['kind'] === 'SOURCE_CLAUSE')!;
    const citation = clause['citation'] as { sourceTextVerbatim: string };
    const markup = inArabic(<ProvenanceTree tree={treeOf(graph, clause.id)} loading={false} onClose={noop} />);
    verbatim(markup, citation.sourceTextVerbatim, 'clause');
    expect(markup).toContain('من أين جاء هذا الرقم');
  });

  it('the parking plan and access panel: clauses cited, rationales and refusals as written', () => {
    for (const run of [rect, skewed, podium]) {
      const plan = inArabic(<ParkingPlan levelPlan={run.levelPlan!} onInspect={noop} />);
      expect(plan).toContain('<span dir="ltr" lang="en" class="verbatim">B.7.2.2</span>');
      expect(plan).toContain('لم تُقيَّم');
      const access = inArabic(<VehicleAccessPanel levelPlan={run.levelPlan!} onInspect={noop} />);
      for (const r of run.levelPlan!.access.rejected) verbatim(access, r.reason, `frontage ${r.edgeSeq}`);
      for (const n of run.levelPlan!.notAssessed) verbatim(access, n, 'not assessed');
    }
  });
});
