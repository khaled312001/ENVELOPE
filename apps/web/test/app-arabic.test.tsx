/**
 * THE ENGINE SURFACE AT `/app`, IN ARABIC, AGAINST REAL ENGINE OUTPUT.
 *
 * The shell and steps 0–6 and 9 as `App.tsx` writes them, the four step screens
 * (the affection-plan reading, the plot form, the plot confirmation, the rules) and
 * the plot drawing's words. Rendered from the engine rather than from fixtures: a
 * rectangle and a skewed plot go through the pipeline, the checks and the presenter
 * exactly as the API sends them; three real affection plans go through the real
 * intake route; the rules and the developer standards come from the real API, once
 * with the standards served and once withheld.
 *
 * Several states render only after an effect or a click — a step hint, a refused
 * upload, an out-of-range efficiency, the comparison, the export once prepared. Each
 * is its own exported component for that reason, so the copy in it is rendered here
 * rather than by nothing but a browser.
 *
 * FIVE THINGS ARE HELD:
 *
 * 1. NO ENGLISH PROSE outside `Verbatim`, and the site's prohibitions over every
 *    Arabic render as over the English one.
 * 2. THE FIGURES DO NOT CHANGE WITH THE LANGUAGE. Every number a reader sees in the
 *    English render is in the Arabic one: a plot area, a setback, a governing
 *    capacity, a gate's run id. A translation that re-typed a figure, or dropped
 *    the sentence carrying it, fails here.
 * 3. THE AMBER TREATMENT SURVIVES THE LANGUAGE, element for element — the same
 *    count of every amber-bearing class in both renders.
 * 4. THE DRAWING DOES NOT CHANGE WITH THE LANGUAGE. The plot's `<svg>` is identical
 *    in both renders bar its spoken `aria-label`s, which are copy.
 * 5. THE ENGLISH IS WHAT IT WAS. The states no earlier test reached are pinned
 *    against the sentences they carried inline before the copy moved into
 *    dictionaries.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  buildAssumptionRegister,
  compareParkingInFar,
  runPipeline,
  type RunInput,
} from '@envelope/capacity';
import type { Plot } from '@envelope/core';
import { initGeometry } from '@envelope/geometry';

import { runChecks } from '../../api/src/checks.js';
import { ENGINE_VERSION, presentRun } from '../../api/src/present.js';
import { build } from '../../api/src/server.js';
import { RECT_80x40, runInput, SKEWED } from '../../../test-support/pipeline.js';
import {
  ApiError,
  type AffectionPlanRead,
  type ExportResult,
  type ParkingComparison,
  type PlotView,
  type RuleSummary,
  type RunView,
  type StandardsView,
} from '../src/api/client.js';
import {
  EngineApp,
  EnvelopePanel,
  ErrorBanner,
  ExportDone,
  ExportPanel,
  Header,
  ParkingPanel,
  ParkingStep,
  StepHintBanner,
} from '../src/App.js';
import { PlotCanvas, type PlotEdgeView } from '../src/components/PlotCanvas.js';
import { StaticLocale, type Locale } from '../src/i18n/locale.js';
import {
  AffectionPlanIntake,
  IntakeErrorBanner,
  Reading,
} from '../src/screens/AffectionPlanIntake.js';
import { ParametersStep } from '../src/screens/ParametersStep.js';
import { PlotForm } from '../src/screens/PlotForm.js';
import {
  ComparisonResult,
  DeveloperStandardPanel,
  RuleDisclosure,
  RulesStep,
  SaleableEfficiency,
} from '../src/screens/RulesStep.js';
import { WORKED_EXAMPLE } from '../src/demo.js';
import {
  arabicReadingText,
  expectNoBannedVocabulary,
  expectNoComplianceClaim,
  expectNoEnglishProse,
  expectNoInventedNumber,
  expectSitewideProhibitions,
} from './prohibitions.js';

process.env['LOG_LEVEL'] = 'silent';

/* -------------------------------------------------------------------------
 * The engine's answers, as the API presents them.
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
  return presentRun(
    'r1',
    input.plot,
    output,
    buildAssumptionRegister(input, output),
    12,
    true,
    checks,
  ) as unknown as RunView;
}

function plotViewOf(plot: Plot): PlotView {
  return {
    plotId: plot.plotId,
    plotNumber: plot.plotNumber,
    community: plot.community,
    landUse: plot.landUse,
    shapeClass: plot.shapeClass,
    computedAreaM2: '3200.00',
    areaMismatch: false,
    vertices: plot.ring.map((p) => ({ x: String(p.x / 1000), y: String(p.y / 1000) })),
    edges: plot.edges.map((e) => ({
      seq: e.seq,
      classification: e.classification,
      roadHierarchy: e.roadHierarchy ?? null,
      lengthM: String(e.lengthMm / 1000),
    })),
  } as unknown as PlotView;
}

/*
  The three real sheets on file, uploaded under names with no digit in them: the
  reading puts the filename in an <h3>, and a filename is not what the heading rule
  is about.
*/
const SHEETS = {
  warsan: 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf',
  med: 'docs/00-source/developer-standards/azizi/Plot DJAZ1MED12RES011-178.pdf',
  tre: 'docs/00-source/developer-standards/azizi/Plot DJAZ1TRE10RES022-196.pdf',
} as const;
const REPO = new URL('../../../', import.meta.url);
const HEADERS = { 'x-actor-id': 'u-test', 'x-actor-name': 'Test Reviewer' };

let run: RunView;
let skewRun: RunView;
let plotView: PlotView;
let comparison: ParkingComparison;
let rules: { pending: readonly RuleSummary[]; warning: string };
const reads: Record<string, AffectionPlanRead> = {};
const standards: Record<string, StandardsView> = {};

beforeAll(async () => {
  await initGeometry();
  const input = runInput(RECT_80x40);
  run = present(input);
  skewRun = present(runInput(SKEWED));
  plotView = plotViewOf(input.plot);

  // The comparison as `/api/runs/parking-in-far-comparison` shapes it.
  const cmp = compareParkingInFar({ ...input, parkingInFar: 'EXCLUDED_FROM_FAR' });
  const side = (r: typeof cmp.countsTowardFar): { governingGfaM2?: string; error?: string } =>
    r instanceof Error
      ? { error: r.message }
      : { governingGfaM2: r.capacity.governingGfa.value.toFixed(2) };
  comparison = {
    countsTowardFar: side(cmp.countsTowardFar),
    excludedFromFar: side(cmp.excludedFromFar),
    regulatorySpreadM2: cmp.regulatorySpreadM2?.toFixed(2) ?? null,
    governingSpreadM2: cmp.spreadM2?.toFixed(2) ?? null,
    verdict: cmp.verdict,
  };

  const app = await build();
  for (const [key, path] of Object.entries(SHEETS)) {
    const bytes = readFileSync(fileURLToPath(new URL(path, REPO)));
    const res = await app.inject({
      method: 'POST',
      url: '/api/intake/affection-plan',
      headers: HEADERS,
      payload: { content: bytes.toString('base64'), filename: `${key}.pdf` },
    });
    reads[key] = res.json() as AffectionPlanRead;
  }
  rules = (await app.inject({ method: 'GET', url: '/api/rules', headers: HEADERS })).json();
  for (const plotNumber of ['', '5180178', '5180196']) {
    standards[plotNumber === '' ? 'the general standard' : `the brief for ${plotNumber}`] = (
      await app.inject({
        method: 'GET',
        url: `/api/standards?plotNumber=${plotNumber}`,
        headers: HEADERS,
      })
    ).json();
  }
  await app.close();

  const withheld = await build(undefined, undefined, { developerStandards: false });
  standards['withheld by the deployment'] = (
    await withheld.inject({ method: 'GET', url: '/api/standards', headers: HEADERS })
  ).json();
  await withheld.close();
}, 60_000);

/* -------------------------------------------------------------------------
 * The renders.
 * ---------------------------------------------------------------------- */

const noop = (): void => {};
const ACTOR = { id: 'a', name: 'A Person' };
const LICENSED = { id: 'b', name: 'B Person', licence: 'L-1' };

/** An export as `/api/runs/:id/export` returns it; the digests are opaque. */
const EXPORTED: ExportResult = {
  runId: 'r1',
  fingerprint: 'f0e1d2c3b4a59687',
  reportFingerprint: { algorithm: 'SHA-256', digest: 'a1b2c3d4e5f60718293a4b5c6d7e8f90' },
  engineVersion: ENGINE_VERSION,
  annexVersion: 'unsigned',
  annexNotice: 'The metric definitions annex has not been signed by a named reviewer.',
  ruleSetHash: 'test',
  draftRules: true,
  document: {},
};

/** Two edges resolved, two not; one road with a hierarchy the dictionary names. */
const SQUARE = [
  { x: '0', y: '0' },
  { x: '80', y: '0' },
  { x: '80', y: '40' },
  { x: '0', y: '40' },
];
const EDGES: readonly PlotEdgeView[] = [
  { seq: 0, classification: 'ROAD', roadHierarchy: 'LOCAL', lengthM: '80', setbackM: '4.5' },
  { seq: 1, classification: 'ADJACENT_PLOT', roadHierarchy: null, lengthM: '40', setbackM: '7.5' },
  { seq: 2, classification: 'OPEN_SPACE', roadHierarchy: null, lengthM: '80' },
  { seq: 3, classification: 'OTHER', roadHierarchy: null, lengthM: '40' },
];

interface Case {
  readonly label: string;
  readonly node: () => JSX.Element;
  /**
   * A count inside an <h3> that the English page has always carried — a chip beside
   * the heading's words. The English markup is held byte-identical, so the chip is
   * not moved here; it is named, and the other three prohibitions still run.
   */
  readonly countInHeading?: string;
  /** Why this render has no Arabic in it at all — nothing but engine text, or no text. */
  readonly noCopy?: string;
}

const CASES: readonly Case[] = [
  // --- The shell ------------------------------------------------------------
  {
    label: 'the engine, at step 0',
    node: () => <EngineApp navigate={noop} actor={ACTOR} setActor={noop} search="" />,
  },
  {
    label: 'a step that does not exist',
    node: () => <StepHintBanner hint={{ kind: 'unknown', wanted: 'notastep' }} />,
  },
  {
    label: 'a step not yet reachable',
    node: () => <StepHintBanner hint={{ kind: 'locked', step: 'parking' }} />,
  },
  {
    label: 'the header, with a run',
    node: () => <Header actor={ACTOR} run={run} navigate={noop} onSignOut={noop} />,
  },
  {
    label: 'the header, signed out',
    node: () => <Header actor={null} run={null} navigate={noop} onSignOut={noop} />,
    noCopy: 'signed out and with no run, the header holds only the theme toggle Root passes in',
  },
  {
    label: 'a run blocked at a gate',
    node: () => (
      <ErrorBanner
        error={new ApiError(422, 'blocked', 'Parking-in-FAR is not declared.', undefined, 'G2')}
        onDismiss={noop}
      />
    ),
  },
  {
    label: 'a request that failed',
    node: () => (
      <ErrorBanner error={new ApiError(500, 'x', 'The server could not complete it.')} onDismiss={noop} />
    ),
  },

  // --- Step 0 -----------------------------------------------------------------
  {
    label: 'the affection-plan drop zone',
    node: () => <AffectionPlanIntake actor={ACTOR} onUse={noop} onSkip={noop} />,
  },
  {
    label: 'a sheet too large to read',
    node: () => (
      <IntakeErrorBanner error={{ kind: 'too-large', name: 'bundle.pdf', sizeMb: '4.2' }} />
    ),
  },
  {
    label: 'a sheet the API refused',
    node: () => (
      <IntakeErrorBanner
        error={{ kind: 'reported', text: 'This PDF has no text layer to read.' }}
      />
    ),
    noCopy: 'the banner is the API’s own sentence, isolated and untranslated',
  },
  ...Object.keys(SHEETS).map(
    (key): Case => ({
      label: `the reading of ${key}.pdf`,
      node: () => <Reading read={reads[key]!} attachment={null} onUse={noop} />,
    }),
  ),

  // --- Step 1 -----------------------------------------------------------------
  {
    label: 'the plot form, empty',
    node: () => (
      <PlotForm actor={ACTOR} busy={false} setBusy={noop} onCreated={noop} onError={noop} />
    ),
    countInHeading: 'the unclassified-edge chip beside "Edges"',
  },
  {
    label: 'the plot form, carried from a sheet and saving',
    node: () => (
      <PlotForm
        actor={ACTOR}
        busy={true}
        setBusy={noop}
        onCreated={noop}
        onError={noop}
        prefill={{ plotNumber: '6457', community: 'Warsan First', statedAreaM2: '1365.23' }}
      />
    ),
    countInHeading: 'the unclassified-edge chip beside "Edges"',
  },

  // --- Step 2 -----------------------------------------------------------------
  {
    label: 'the plot, to confirm',
    node: () => <ParametersStep plot={plotView} confirmed={false} onConfirm={noop} />,
  },
  {
    label: 'the plot, confirmed with its areas disagreeing',
    node: () => (
      <ParametersStep plot={{ ...plotView, areaMismatch: true }} confirmed={true} onConfirm={noop} />
    ),
  },

  // --- Step 3 -----------------------------------------------------------------
  {
    label: 'the rules step',
    node: () => (
      <RulesStep
        actor={ACTOR}
        plot={plotView}
        sheetPodiumLevels={null}
        demo={null}
        busy={false}
        onRun={noop}
        onError={noop}
      />
    ),
  },
  {
    label: 'the rules step, podium read from the sheet, computing',
    node: () => (
      <RulesStep
        actor={ACTOR}
        plot={plotView}
        sheetPodiumLevels={{ value: 2, raw: 'G+2P+8' }}
        demo={null}
        busy={true}
        onRun={noop}
        onError={noop}
      />
    ),
  },
  {
    /*
      The rules step as `?demo=worked-example` hands it over: three questions
      that have no default anywhere in this screen are answered, and the mix
      the run will use is on screen instead of being posted unseen.
    */
    label: 'the rules step, filled from the worked example',
    node: () => (
      <RulesStep
        actor={ACTOR}
        plot={plotView}
        sheetPodiumLevels={null}
        demo={WORKED_EXAMPLE.run}
        busy={false}
        onRun={noop}
        onError={noop}
      />
    ),
  },
  {
    label: 'the rule disclosure',
    node: () => <RuleDisclosure rules={rules} />,
    countInHeading: 'the rule-count chip beside each group heading',
  },
  { label: 'the rule disclosure, loading', node: () => <RuleDisclosure rules={null} /> },
  {
    label: 'the parking-in-FAR comparison',
    node: () => <ComparisonResult comparison={comparison} />,
  },
  {
    label: 'the saleable-efficiency question, unanswered',
    node: () => (
      <SaleableEfficiency standard={undefined} efficiency="" valid={false} onChange={noop} />
    ),
  },
  {
    label: 'the saleable-efficiency question, out of range',
    node: () => (
      <SaleableEfficiency standard={undefined} efficiency="1.4" valid={false} onChange={noop} />
    ),
  },
  {
    label: 'the saleable-efficiency question, filled from a standard',
    node: () => (
      <SaleableEfficiency
        standard={standards['the general standard']!.standards[0]}
        efficiency="0.93"
        valid={true}
        onChange={noop}
      />
    ),
  },
  ...['the general standard', 'the brief for 5180178', 'the brief for 5180196', 'withheld by the deployment'].flatMap(
    (key): Case[] => [
      {
        label: `the developer standard, ${key}`,
        node: () => (
          <DeveloperStandardPanel standards={standards[key]!} scenarioId="" onChoose={noop} />
        ),
      },
      {
        label: `the developer standard, ${key}, a scenario chosen`,
        node: () => (
          <DeveloperStandardPanel
            standards={standards[key]!}
            scenarioId={standards[key]!.standards[0]?.scenarios[0]?.scenarioId ?? ''}
            onChoose={noop}
          />
        ),
      },
    ],
  ),

  // --- Steps 4–6 --------------------------------------------------------------
  { label: 'the envelope', node: () => <EnvelopePanel run={run} onInspect={noop} /> },
  {
    label: 'the envelope of a skewed plot',
    node: () => <EnvelopePanel run={skewRun} onInspect={noop} />,
  },
  { label: 'the parking figures', node: () => <ParkingPanel run={run} onInspect={noop} /> },
  {
    label: 'the parking step, no level plan, with the engine’s reason',
    node: () => (
      <ParkingStep
        run={{ ...run, levelPlan: null, levelPlanRefusal: 'The podium is too small to lay out.' }}
        plot={plotView}
        onInspect={noop}
      />
    ),
  },
  {
    label: 'the parking step, no level plan, no reason given',
    node: () => (
      <ParkingStep
        run={{ ...run, levelPlan: null, levelPlanRefusal: null }}
        plot={plotView}
        onInspect={noop}
      />
    ),
  },

  // --- Step 9 -----------------------------------------------------------------
  {
    label: 'the export, no licence',
    node: () => (
      <ExportPanel
        actor={ACTOR}
        run={run}
        gates={{}}
        onAcknowledge={noop}
        onGoToAssumptions={noop}
        onError={noop}
      />
    ),
  },
  {
    label: 'the export, licensed',
    node: () => (
      <ExportPanel
        actor={LICENSED}
        run={run}
        gates={{}}
        onAcknowledge={noop}
        onGoToAssumptions={noop}
        onError={noop}
      />
    ),
  },
  {
    label: 'the export, both gates signed',
    node: () => (
      <ExportPanel
        actor={LICENSED}
        run={run}
        gates={{ G3_ASSUMPTIONS_ACKNOWLEDGED: true, G4_REVIEWER_NAMED: true }}
        onAcknowledge={noop}
        onGoToAssumptions={noop}
        onError={noop}
      />
    ),
  },
  {
    label: 'the export, prepared',
    node: () => (
      <ExportDone
        actor={LICENSED}
        run={run}
        done={{ result: EXPORTED, html: '<p></p>', sheets: '<p></p>' }}
        onError={noop}
      />
    ),
  },

  // --- The plot drawing's words ---------------------------------------------
  {
    label: 'the plot drawing, selectable',
    node: () => (
      <PlotCanvas
        vertices={SQUARE}
        edges={EDGES}
        areaM2="3200"
        footprintAreaM2="1917.5"
        onSelectEdge={noop}
        selectedEdge={1}
      />
    ),
  },
  {
    label: 'the plot drawing, every setback resolved',
    node: () => (
      <PlotCanvas vertices={SQUARE} edges={EDGES.map((e) => ({ ...e, setbackM: '5' }))} areaM2="3200" />
    ),
  },
  {
    label: 'the plot drawing, nothing to draw',
    node: () => <PlotCanvas vertices={[]} edges={[]} areaM2="0" />,
  },
];

const render = (locale: Locale, node: JSX.Element): string =>
  renderToStaticMarkup(<StaticLocale locale={locale}>{node}</StaticLocale>);

/** What a reader sees: tags gone, entities read, whitespace as a browser lays it. */
function visibleText(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every figure in the visible text, sorted — the multiset a translation must keep. */
const figures = (markup: string): string[] =>
  [...visibleText(markup).matchAll(/\d+(?:[.,]\d+)*/g)].map((m) => m[0]).sort();

/**
 * THE FIGURES A TRANSLATION MAY DROP, and only these: a digit that is part of an
 * English word rather than a quantity. "3D" is «ثلاثي الأبعاد» — the 3 was never a
 * figure on the English page either.
 */
const NOT_FIGURES: Readonly<Record<string, readonly string[]>> = {
  'the export, prepared': ['3', '3', '3', '3', '3'],
};

/** Every class through which amber — or its warning neighbour — reaches a page. */
const AMBER =
  /banner--assumed|traced--assumed|data-state="assumed"|callout--warn|reason-list--uncertain|chip--warn|choice--assumed/g;
const amberCount = (markup: string): number => (markup.match(AMBER) ?? []).length;

/** The drawing, without its spoken names. */
const drawings = (markup: string): string[] =>
  [...markup.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map((m) =>
    m[0].replace(/\saria-label="[^"]*"/g, ''),
  );

describe('the engine surface in Arabic', () => {
  for (const c of CASES) {
    describe(c.label, () => {
      it('carries no English prose and nothing a page may not say', () => {
        const ar = render('ar', c.node());
        expect(ar, 'the Arabic render is empty').not.toBe('');
        if (c.noCopy) {
          expect(arabicReadingText(ar).trim(), `${c.label}: ${c.noCopy}`).not.toMatch(/[A-Za-z]/);
        } else {
          expect(arabicReadingText(ar), 'the Arabic render has no Arabic in it').toMatch(
            /[؀-ۿ]/,
          );
        }
        expectNoEnglishProse(ar, `${c.label} (ar)`);
        if (c.countInHeading) {
          expectNoComplianceClaim(ar, `${c.label} (ar)`);
          expectNoInventedNumber(ar, `${c.label} (ar)`);
          expectNoBannedVocabulary(ar, `${c.label} (ar)`);
        } else {
          expectSitewideProhibitions(ar, `${c.label} (ar)`);
        }
      });

      it('shows every figure the English page shows', () => {
        const en = figures(render('en', c.node()));
        const ar = figures(render('ar', c.node()));
        const dropped = [...en];
        for (const f of ar) {
          const k = dropped.indexOf(f);
          if (k >= 0) dropped.splice(k, 1);
        }
        expect(dropped, `${c.label}: figures on the English page missing from the Arabic`).toEqual(
          NOT_FIGURES[c.label] ?? [],
        );
      });

      it('keeps the amber treatment and the drawing as they are', () => {
        const en = render('en', c.node());
        const ar = render('ar', c.node());
        expect(amberCount(ar), `${c.label}: amber-bearing classes`).toBe(amberCount(en));
        expect(drawings(ar), `${c.label}: the drawing`).toEqual(drawings(en));
      });
    });
  }
});

/* -------------------------------------------------------------------------
 * The English, pinned where no earlier test reached it.
 * ---------------------------------------------------------------------- */

describe('the English copy, as it was written inline', () => {
  const en = (node: JSX.Element): string => visibleText(render('en', node));

  it('names the steps when a ?step= is not one of them', () => {
    expect(en(<StepHintBanner hint={{ kind: 'unknown', wanted: 'notastep' }} />)).toBe(
      'There is no step called “notastep”. The steps are: ' +
        'intake, plot, parameters, rules, assumptions, capacity, parking, checks, evidence, export.',
    );
    expect(en(<StepHintBanner hint={{ kind: 'locked', step: 'parking' }} />)).toMatch(
      /^“.+” opens once the steps before it have something to read\.$/,
    );
  });

  it('refuses a sheet too large to read, with its size', () => {
    expect(
      en(<IntakeErrorBanner error={{ kind: 'too-large', name: 'bundle.pdf', sizeMb: '4.2' }} />),
    ).toBe(
      'bundle.pdf is 4.2 MB. Affection plans are single sheets of about 1.5 MB — a file this ' +
        'large is usually a scanned bundle, and a scan has no text to read.',
    );
  });

  it('says what is wrong with an out-of-range efficiency, and why', () => {
    const text = en(
      <SaleableEfficiency standard={undefined} efficiency="1.4" valid={false} onChange={noop} />,
    );
    expect(text).toContain(
      'A number above 0 and at most 1. Whatever you enter is recorded as yours.',
    );
    expect(text).toContain(
      'It has to sit above 0 and at most 1. Above 1 would mean the building sells more area than it has.',
    );
  });

  it('quotes the developer’s own range when a standard fills the efficiency', () => {
    const standard = standards['the general standard']!.standards[0]!;
    const text = en(
      <SaleableEfficiency standard={standard} efficiency="0.93" valid={true} onChange={noop} />,
    );
    expect(text).toContain(
      `${standard.developer} states ${standard.targets.saleableEfficiencyMin.value} to ` +
        `${standard.targets.saleableEfficiencyMax.value} — ` +
        `"${standard.targets.saleableEfficiencyMin.citation.sourceTextVerbatim}". ` +
        'Whatever you enter is recorded as yours.',
    );
  });

  it('labels the two sides of the comparison', () => {
    const text = en(<ComparisonResult comparison={comparison} />);
    expect(text).toContain('If it counts');
    expect(text).toContain('If it is excluded');
    expect(text).toContain(comparison.verdict);
  });

  it('writes the prepared export as it did before', () => {
    const text = en(
      <ExportDone
        actor={LICENSED}
        run={run}
        done={{ result: EXPORTED, html: '<p></p>', sheets: '<p></p>' }}
        onError={noop}
      />,
    );
    for (const sentence of [
      `Run ${run.runId.slice(0, 8)} is fixed as it stands. Editing an assumption from here creates a new run and leaves this one untouched.`,
      'Run fingerprint',
      ' — the inputs, versions and rule set',
      `Report fingerprint${EXPORTED.reportFingerprint.digest.slice(0, 16)}… — SHA-256 over the content`,
      'The metric definitions annex is not signed.',
      'Open the reportOpen the drawing set (A3)Open the JSON exportDownload the CAD drawing (DXF)Download the 3D model (glTF)Download the workbook (XLSX)',
      'The CAD drawing is the whole building: every parking level at its own height with a car in every bay, the ramps as slopes between levels, and the massing stood up as 3D faces. Each level has its own layers — ENV-B1-BAY, ENV-B1-CAR — so a reviewer can switch off one level, or one kind of thing on it. Revit and IFC are not included: round-tripping IFC is a body of work this phase has not quoted, and a badly-shaped one would be worse than none.',
      'The 3D model is the capacity step’s 3D view as a .glb file: binary glTF 2.0, with no extension a reader is required to support. It is in metres, measured from the middle of the plot, with a node for each level and its cars. It carries the same two sentences in its metadata, because a 3D file has no title block to print them in.',
      'One sheet at a time',
    ]) {
      expect(text).toContain(sentence);
    }
    expect(text).toMatch(/Download [^:]+: .+ \(DXF\)/);
  });

  it('speaks the plot drawing as it did before', () => {
    const markup = render(
      'en',
      <PlotCanvas
        vertices={SQUARE}
        edges={EDGES}
        areaM2="3200"
        footprintAreaM2="1917.5"
        onSelectEdge={noop}
        selectedEdge={1}
      />,
    );
    expect(markup).toContain(
      'aria-label="Plot of 3200 square metres with 4 edges. ' +
        'Edge 1, Road, 80 metres, setback 4.5 metres. ' +
        'Edge 2, Neighbouring plot, 40 metres, setback 7.5 metres. ' +
        'Edge 3, Open space, 80 metres. Edge 4, Other, 40 metres. ' +
        'Buildable footprint 1917.5 square metres. ' +
        'Drawn to a graphic scale, grid north up, grid interval 10 metres."',
    );
    expect(markup).toContain('aria-label="Edge 2: Neighbouring plot, 40 metres, setback 7.5 metres"');
    expect(visibleText(markup)).toContain('Edge 1 · Road (local)80 msetback 4.5 m');
    expect(visibleText(markup)).toContain('Edge 3 · Open space80 msetback not yet resolved');
  });
});

/* -------------------------------------------------------------------------
 * The sentences a reader of the Arabic page must be given, in Arabic.
 * ---------------------------------------------------------------------- */

describe('the Arabic copy that carries the product’s refusals', () => {
  const ar = (node: JSX.Element): string => render('ar', node);

  it('keeps the developer-standard notice amber, and says it is not a regulation', () => {
    const markup = ar(
      <DeveloperStandardPanel
        standards={standards['the general standard']!}
        scenarioId=""
        onChoose={noop}
      />,
    );
    // The API's disclaimer beneath it is the API's, and stays as it was sent.
    expect(markup).toMatch(
      /<div class="banner banner--assumed" role="note"><div><strong>هذا ليس لائحةً تنظيمية\.<\/strong><p><span dir="ltr" lang="en" class="verbatim">/,
    );
    expect(visibleText(markup)).toContain(standards['the general standard']!.disclaimer);
  });

  it('refuses a default for parking-in-FAR and for saleable efficiency, in words', () => {
    const rulesStep = arabicReadingText(
      ar(
        <RulesStep
          actor={ACTOR}
          plot={plotView}
          sheetPodiumLevels={null}
          demo={null}
          busy={false}
          onRun={noop}
          onError={noop}
        />,
      ),
    );
    expect(rulesStep).toContain('لا قيمة افتراضية، ولن يفترض المحرّك واحدة.');
    expect(rulesStep).toContain('لا قيمة افتراضية هنا');
  });

  it('keeps the rule records and the basis strings the engine is sent in English', () => {
    const markup = ar(<RuleDisclosure rules={rules} />);
    for (const r of rules.pending.slice(0, 3)) {
      expect(markup).toContain(`<code>${r.ruleId}</code>`);
    }
    expect(markup).toContain(
      `<p><span dir="ltr" lang="en" class="verbatim">${rules.warning.slice(0, 20)}`,
    );
  });

  it('writes a figure in the Arabic sentence exactly as the English one does', () => {
    const params = visibleText(ar(<ParametersStep plot={plotView} confirmed={false} onConfirm={noop} />));
    expect(params).toContain('3200.00');
    const canvas = visibleText(
      ar(<PlotCanvas vertices={SQUARE} edges={EDGES} areaM2="3200" footprintAreaM2="1917.5" />),
    );
    expect(canvas).toContain('الضلع 1 · طريق (محلّي)80 mالارتداد 4.5 m');
    expect(canvas).toContain('لم يُحسَم الارتداد بعد');
  });
});
