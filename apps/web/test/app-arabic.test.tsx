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
import { scheduleRefusal, type Plot } from '@envelope/core';
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
  CoreArea,
  DeveloperStandardPanel,
  LevelSchedulePanel,
  RuleDisclosure,
  RulesStep,
  SaleableEfficiency,
  StatementNote,
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
/** The core-position props: a two-boundary plot, centred. */
const CORE_POSITION = {
  edges: [
    { seq: 0, classification: 'ROAD', roadHierarchy: 'LOCAL', lengthM: '80.00' },
    { seq: 1, classification: 'ADJACENT_PLOT', roadHierarchy: null, lengthM: '40.00' },
  ],
  position: '',
  onPosition: noop,
} as const;
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

/**
 * The practice statement, shaped as the API serves it.
 *
 * Hand-written rather than read from `@envelope/rules`, and deliberately: this
 * file asserts what the SCREEN says, and a fixture that imported the record
 * would pass on a screen that rendered none of it. The Arabic here is the
 * client's own sentence, which is the one string on this panel that must never
 * be translated, softened or re-ordered.
 */
const STATEMENT = {
  statementId: 'STMT-PARKING-IN-FAR-2026-09-28',
  subject: 'PARKING_IN_FAR',
  value: 'EXCLUDED_FROM_FAR',
  statedBy: { name: 'Eng. Mohamed', role: 'the architect this engine is being built for' },
  statedOn: '2026-09-28',
  source: 'written reply to the Phase 0 walkthrough, 28 September 2026',
  verbatim: 'الباركنج مش بيتحسب في ال FAR دا منفصل',
  translation: 'Parking is not counted in the FAR — it is separate.',
  limits:
    'A practitioner’s statement of how this is treated in the work he has done. It is not a ' +
    'clause of the Dubai Building Code and it has not been checked against one.',
};

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
      <SaleableEfficiency
        standard={undefined}
        efficiency=""
        unit="RATIO"
        valid={false}
        onChange={noop}
        onUnitChange={noop}
      />
    ),
  },
  {
    label: 'the answer on file, offered',
    node: () => <StatementNote statement={STATEMENT} onUse={noop} />,
  },
  {
    label: 'the core, unanswered',
    node: () => <CoreArea area="" valid={true} onChange={noop} {...CORE_POSITION} />,
  },
  {
    label: 'the core, stated',
    node: () => <CoreArea area="180" valid={true} onChange={noop} {...CORE_POSITION} />,
  },
  {
    label: 'the core, refused for being zero or below',
    node: () => <CoreArea area="-1" valid={false} onChange={noop} {...CORE_POSITION} />,
  },
  {
    label: 'the level schedule',
    node: () => (
      <LevelSchedulePanel
        basements="2"
        groundIsParking={true}
        podiumAbove="2"
        podiumParking="1"
        sheetPodiumLevels={null}
        problem=""
        onBasements={noop}
        onGroundIsParking={noop}
        onPodiumAbove={noop}
        onPodiumParking={noop}
      />
    ),
  },
  {
    label: 'the level schedule, read from the sheet',
    node: () => (
      <LevelSchedulePanel
        basements="0"
        groundIsParking={true}
        podiumAbove="2"
        podiumParking="2"
        sheetPodiumLevels={{ value: 2, raw: 'G+2P+8' }}
        problem=""
        onBasements={noop}
        onGroundIsParking={noop}
        onPodiumAbove={noop}
        onPodiumParking={noop}
      />
    ),
  },
  {
    label: 'the level schedule, refused',
    node: () => (
      <LevelSchedulePanel
        basements="0"
        groundIsParking={false}
        podiumAbove="1"
        podiumParking="3"
        sheetPodiumLevels={null}
        problem={
          scheduleRefusal({
            basements: 0,
            groundIsParking: false,
            podiumAboveGround: 1,
            podiumParkingLevels: 3,
          }) ?? ''
        }
        onBasements={noop}
        onGroundIsParking={noop}
        onPodiumAbove={noop}
        onPodiumParking={noop}
      />
    ),
  },
  {
    label: 'the answer on file, taken',
    node: () => <StatementNote statement={STATEMENT} used={true} onUse={noop} />,
  },
  {
    label: 'the saleable figure asked in square metres',
    node: () => (
      <SaleableEfficiency
        standard={undefined}
        efficiency="6000"
        unit="AREA"
        valid={true}
        onChange={noop}
        onUnitChange={noop}
      />
    ),
  },
  {
    label: 'the saleable area, refused for being zero or below',
    node: () => (
      <SaleableEfficiency
        standard={undefined}
        efficiency="-1"
        unit="AREA"
        valid={false}
        onChange={noop}
        onUnitChange={noop}
      />
    ),
  },
  {
    label: 'the saleable-efficiency question, out of range',
    node: () => (
      <SaleableEfficiency
        standard={undefined}
        efficiency="1.4"
        unit="RATIO"
        valid={false}
        onChange={noop}
        onUnitChange={noop}
      />
    ),
  },
  {
    label: 'the saleable-efficiency question, filled from a standard',
    node: () => (
      <SaleableEfficiency
        standard={standards['the general standard']!.standards[0]}
        efficiency="0.93"
        unit="RATIO"
        valid={true}
        onChange={noop}
        onUnitChange={noop}
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
    label: 'the plot drawing, an arterial and an access road',
    node: () => (
      <PlotCanvas
        vertices={SQUARE}
        edges={[
          { seq: 0, classification: 'ROAD', roadHierarchy: 'ARTERIAL', lengthM: '80', setbackM: '4.5' },
          { seq: 1, classification: 'ROAD', roadHierarchy: 'ACCESS', lengthM: '40', setbackM: '7.5' },
          { seq: 2, classification: 'ADJACENT_PLOT', roadHierarchy: null, lengthM: '80' },
          { seq: 3, classification: 'OTHER', roadHierarchy: null, lengthM: '40' },
        ]}
        areaM2="3200"
      />
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
      <SaleableEfficiency
        standard={undefined}
        efficiency="1.4"
        unit="RATIO"
        valid={false}
        onChange={noop}
        onUnitChange={noop}
      />,
    );
    expect(text).toContain(
      'A number above 0 and at most 1. Whatever you enter is recorded as yours.',
    );
    expect(text).toContain(
      'It has to sit above 0 and at most 1. Above 1 would mean the building sells more area than it has.',
    );
  });

  /*
    ENG. MOHAMED'S POINT 7. The figure a developer's brief states is an AREA, and
    this field only took a factor between 0 and 1. Both forms are offered, and
    the screen says which is which rather than leaving a reader to work out that
    "0.93" and "6000" are answers to the same question.
  */
  it('offers the saleable figure in either unit, and says what each is for', () => {
    const text = en(
      <SaleableEfficiency
        standard={undefined}
        efficiency=""
        unit="RATIO"
        valid={false}
        onChange={noop}
        onUnitChange={noop}
      />,
    );
    expect(text).toContain('Enter it as');
    expect(text).toContain('A share of the GFA');
    expect(text).toContain('An area, in square metres');
    expect(text).toContain('a brief stating 93% to 97% of GFA');
  });

  it('asks for square metres, and says what it will divide them by', () => {
    const text = en(
      <SaleableEfficiency
        standard={undefined}
        efficiency="6000"
        unit="AREA"
        valid={true}
        onChange={noop}
        onUnitChange={noop}
      />,
    );
    // The unit is in the label, as it is on the plot form's own area field.
    expect(text).toContain('Saleable area (m²)');
    expect(text).toContain('divides this by the GFA this envelope yields');
    /*
      The share's bound must NOT be shown while an area is being typed. "A number
      above 0 and at most 1" over a box holding 6000 reads as a broken field.
    */
    expect(text).not.toContain('A number above 0 and at most 1');
  });

  it('refuses a non-positive area in the unit the reader is actually using', () => {
    const text = en(
      <SaleableEfficiency
        standard={undefined}
        efficiency="-1"
        unit="AREA"
        valid={false}
        onChange={noop}
        onUnitChange={noop}
      />,
    );
    expect(text).toContain('An area above zero, in square metres.');
    // Never the share's sentence, which names a bound the reader is not under.
    expect(text).not.toContain('Above 1 would mean the building sells more area');
  });

  /*
    FR-DEF-002 FORBIDS A DEFAULT, AND THE SCREEN NOW ARRIVES ANSWERED.

    The difference between those two facts is entirely this panel. Take it away
    and what is left is the hidden default the requirement exists to prevent, so
    each of its four parts is asserted by name: that it is not a regulation, who
    said it, in what words, and where the claim stops.
  */
  it('says whose answer the pre-filled one is, and that it is not a regulation', () => {
    const text = en(<StatementNote statement={STATEMENT} />);
    expect(text).toContain('This is not a regulation.');
    expect(text).toContain('Eng. Mohamed');
    expect(text).toContain('2026-09-28');
    expect(text).toContain('Change it and it becomes your answer, recorded under your name.');
  });

  it('quotes him verbatim, marked as Arabic and right-to-left', () => {
    const out = render('en', <StatementNote statement={STATEMENT} />);
    expect(out).toContain(STATEMENT.verbatim);
    /*
      On the English page the quotation is a right-to-left sentence inside
      left-to-right prose. Without these it is laid out left-to-right, which
      reorders its clauses and its punctuation — and a quotation that has been
      reordered is not a quotation.
    */
    expect(out).toMatch(/lang="ar"/);
    expect(out).toMatch(/dir="rtl"/);
  });

  it('prints where the claim stops, which is the part that makes it usable', () => {
    const text = en(<StatementNote statement={STATEMENT} />);
    expect(text).toContain('not a clause of the Dubai Building Code');
  });

  it('renders nothing when no statement is on file, rather than an empty frame', () => {
    expect(render('en', <StatementNote statement={undefined} />)).toBe('');
  });

  /*
    FR-DEF-002 FORBIDS A DEFAULT, AND A PRE-CHECKED RADIO IS ONE.

    The plan asked for this answer to arrive selected. `scripts/smoke.mjs` says
    in a browser that it may not: a checked option beside an enabled Compute
    button lets a reader click past the largest single lever in the product
    having decided nothing. So it is offered with a button, and taking it is an
    act — which is everything the pre-selection was for, minus the part that
    made it a default.
  */
  it('offers the answer as an act, not as a pre-selection', () => {
    const out = render('en', <StatementNote statement={STATEMENT} onUse={noop} />);
    expect(out).toContain('Use this answer');
    // No control here decides anything on its own.
    expect(out).not.toMatch(/<input/);
  });

  it('stops offering once the answer has been taken, and says whose it now is', () => {
    const text = en(<StatementNote statement={STATEMENT} used={true} onUse={noop} />);
    expect(text).toContain('recorded under his name');
    // A pressed button that would do nothing is not left on the screen.
    expect(render('en', <StatementNote statement={STATEMENT} used={true} onUse={noop} />)).not.toContain(
      'Use this answer',
    );
  });

  /*
    THE LEVEL SCHEDULE — Eng. Mohamed, 2026-09-28.

    The panel's whole job is to stop a person having to do the arithmetic the
    engine got wrong: `G+2P+8` is three levels on the podium footprint and the
    engine drew two. So the two derived figures are asserted here against what
    the entered numbers mean, not against what the panel happens to print.
  */
  it('reads the schedule back as a height code, the way an affection plan prints one', () => {
    const text = en(
      <LevelSchedulePanel
        basements="2"
        groundIsParking={true}
        podiumAbove="2"
        podiumParking="1"
        sheetPodiumLevels={null}
        problem=""
        onBasements={noop}
        onGroundIsParking={noop}
        onPodiumAbove={noop}
        onPodiumParking={noop}
      />,
    );
    expect(text).toContain('2B+G+2P');
    // The tower is left off, because no run has produced one yet.
    expect(text).not.toMatch(/2B\+G\+2P\+\d/);
    expect(text).toContain('This schedule reads');
  });

  it('counts the parking levels the schedule provides, ground floor included', () => {
    const text = en(
      <LevelSchedulePanel
        basements="2"
        groundIsParking={true}
        podiumAbove="2"
        podiumParking="1"
        sheetPodiumLevels={null}
        problem=""
        onBasements={noop}
        onGroundIsParking={noop}
        onPodiumAbove={noop}
        onPodiumParking={noop}
      />,
    );
    // 2 basements + the ground floor + 1 podium level.
    expect(text).toMatch(/Parking levels\s*4/);
  });

  it('asks for the podium levels above the ground floor, and says the ground floor is not one', () => {
    const text = en(
      <LevelSchedulePanel
        basements="0"
        groundIsParking={true}
        podiumAbove="1"
        podiumParking="0"
        sheetPodiumLevels={null}
        problem=""
        onBasements={noop}
        onGroundIsParking={noop}
        onPodiumAbove={noop}
        onPodiumParking={noop}
      />,
    );
    expect(text).toContain('Podium levels above the ground floor');
    expect(text).toContain('The ground floor is not one of them.');
  });

  it('quotes the height code the sheet itself printed, where the plot came with one', () => {
    const text = en(
      <LevelSchedulePanel
        basements="0"
        groundIsParking={true}
        podiumAbove="2"
        podiumParking="2"
        sheetPodiumLevels={{ value: 2, raw: 'G+2P+8' }}
        problem=""
        onBasements={noop}
        onGroundIsParking={noop}
        onPodiumAbove={noop}
        onPodiumParking={noop}
      />,
    );
    expect(text).toContain('Read from the affection plan as');
    expect(text).toContain('G+2P+8');
    // It is offered, never imposed: the run records it under the reader's name.
    expect(text).toContain('Confirm or change it');
  });

  it('prints the refusal the engine wrote, led by a line saying what it is', () => {
    const problem =
      scheduleRefusal({
        basements: 0,
        groundIsParking: false,
        podiumAboveGround: 1,
        podiumParkingLevels: 3,
      }) ?? '';
    expect(problem).not.toBe('');
    const markup = render(
      'en',
      <LevelSchedulePanel
        basements="0"
        groundIsParking={false}
        podiumAbove="1"
        podiumParking="3"
        sheetPodiumLevels={null}
        problem={problem}
        onBasements={noop}
        onGroundIsParking={noop}
        onPodiumAbove={noop}
        onPodiumParking={noop}
      />,
    );
    expect(visibleText(markup)).toContain('This schedule does not describe a building.');
    // The engine's sentence, word for word — not a second rendering of it.
    expect(visibleText(markup)).toContain(problem);
    expect(markup).toContain('role="alert"');
    /*
      BLOCKED, NOT ASSUMED. A refused schedule is not a value at all, and amber
      means one specific thing. `pnpm contrast` polices who may paint it; this
      says the refusal did not ask.
    */
    expect(markup).toContain('data-state="blocked"');
    expect(markup).not.toMatch(/assumed/i);
  });

  /*
    THE CORE — Eng. Mohamed, 2026-09-28, the one thing he called الاهم.

    Three things are asserted and the first is the important one: that the panel
    says the core is NOT subtracted. "The core is in the calculation" reads as
    "the floor area was reduced for it", and a reader who believes that reads the
    capacity figure as wrong by the size of the core.
  */
  it('says the core subtracts from nothing, which is the part a reader gets wrong', () => {
    const text = en(<CoreArea area="" valid={true} onChange={noop} {...CORE_POSITION} />);
    expect(text).toContain('Nothing above is reduced for the core.');
    expect(text).toContain('inside GFA and outside saleable area');
    // And where the comparison does happen, so the sentence is not a dead end.
    expect(text).toContain('on the results screen');
  });

  it('arrives empty, and says what the engine will assume if it stays that way', () => {
    const markup = render('en', <CoreArea area="" valid={true} onChange={noop} {...CORE_POSITION} />);
    // FR-DEF-002's discipline, applied to a field it does not name: a figure in
    // the box on arrival is a default nobody chose.
    expect(markup).toMatch(/id="core-area"[^>]*value=""/);
    const text = visibleText(markup);
    expect(text).toContain('Left empty, the engine takes');
    expect(text).toContain('18%');
    expect(text).toContain('recorded as yours');
  });

  it('refuses a core area that is not a positive number, in words and in state', () => {
    const markup = render('en', <CoreArea area="-1" valid={false} onChange={noop} {...CORE_POSITION} />);
    expect(visibleText(markup)).toContain('A core area is a number greater than zero.');
    expect(markup).toContain('role="alert"');
    // BLOCKED, not ASSUMED: a refused figure is not a value at all.
    expect(markup).toContain('data-state="blocked"');
  });

  /*
    WHERE THE CORE STANDS. Centred is the engine's assumption, so the option that
    says so is the one selected on arrival and it says "assumed" in its own words;
    every boundary of the plot is offered, none is pre-selected, and the help says
    the engine never moves the core to fit more cars.
  */
  it('offers every boundary for the core, arrives centred, and calls centred an assumption', () => {
    const markup = render('en', <CoreArea area="" valid={true} onChange={noop} {...CORE_POSITION} />);
    expect(markup).toMatch(/<select[^>]*id="core-position"/);
    expect(markup).toMatch(/<option value="" selected="">Centred on the tower plate \(assumed\)<\/option>/);
    expect(markup).toContain('Against boundary 1 · road · 80.00 m');
    expect(markup).toContain('Against boundary 2 · neighbouring plot · 40.00 m');
    expect(markup).not.toMatch(/<option value="\d+" selected/);
    expect(visibleText(markup)).toContain('The engine never moves it to fit more cars.');
    const ar = visibleText(render('ar', <CoreArea area="" valid={true} onChange={noop} {...CORE_POSITION} />));
    expect(ar).toContain('في منتصف مسطح البرج (مفترض)');
    expect(ar).toContain('ملاصقة للحد 1 · طريق · 80.00 م');
  });

  it('says nothing about a refusal while the box is empty', () => {
    expect(render('en', <CoreArea area="" valid={true} onChange={noop} {...CORE_POSITION} />)).not.toContain(
      'role="alert"',
    );
  });

  /*
    THE BOUNDARY BANDS — Eng. Mohamed, 2026-09-28: there is a road field and a
    road-type field, and they need a symbol. It was the most consequential field
    on the plot form — it drives the vehicle-access recommendation under B.7.2.1
    — and nothing drew it.
  */
  it('draws a band beside each classified boundary, and none beside an unclassified one', () => {
    const markup = render(
      'en',
      <PlotCanvas vertices={SQUARE} edges={EDGES} areaM2="3200" />,
    );
    // Three of the four fixture edges take a band; the OTHER one does not,
    // because an unclassified edge is a question and a band would answer it.
    const bands = markup.match(/<polygon[^>]*aria-hidden="true"/g) ?? [];
    expect(bands).toHaveLength(3);
  });

  it('ranks the road hierarchy by width, so the ranking is not carried by colour alone', () => {
    const markup = render(
      'en',
      <PlotCanvas
        vertices={SQUARE}
        edges={[
          { seq: 0, classification: 'ROAD', roadHierarchy: 'ARTERIAL', lengthM: '80' },
          { seq: 1, classification: 'ROAD', roadHierarchy: 'ACCESS', lengthM: '40' },
          { seq: 2, classification: 'OTHER', roadHierarchy: null, lengthM: '80' },
          { seq: 3, classification: 'OTHER', roadHierarchy: null, lengthM: '40' },
        ]}
        areaM2="3200"
      />,
    );
    // The two swatches, arterial then access: the key shows the ranking rather
    // than only naming it. 1.4.1, the same ruling that gave each class a dash.
    const heights = [...markup.matchAll(/<rect[^>]*height="([\d.]+)"[^>]*stroke-width="0.4"/g)].map(
      (m) => Number(m[1]),
    );
    expect(heights).toHaveLength(2);
    expect(heights[0]!).toBeGreaterThan(heights[1]!);
  });

  it('says the band ranks rather than measures, wherever one is drawn', () => {
    const text = en(<PlotCanvas vertices={SQUARE} edges={EDGES} areaM2="3200" />);
    expect(text).toContain('not a carriageway width');
    expect(text).toContain('nothing is computed from it');
  });

  it('says nothing about bands on a plot that has none', () => {
    const noBands = EDGES.map((e) => ({ ...e, classification: 'OTHER' as const, roadHierarchy: null }));
    const text = en(<PlotCanvas vertices={SQUARE} edges={noBands} areaM2="3200" />);
    expect(text).not.toContain('not a carriageway width');
  });

  it('quotes the developer’s own range when a standard fills the efficiency', () => {
    const standard = standards['the general standard']!.standards[0]!;
    const text = en(
      <SaleableEfficiency
        standard={standard}
        efficiency="0.93"
        unit="RATIO"
        valid={true}
        onChange={noop}
        onUnitChange={noop}
      />,
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
      'Open the reportSave the report as PDFOpen the drawing set (A3)Save the drawing set as PDF (A3)Open the JSON exportDownload the CAD drawing (DXF)Download the 3D model (glTF)Download the workbook (XLSX)',
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
      /<div class="banner banner--assumed" role="note"><div><strong>هذا ليس لائحة تنظيمية\.<\/strong><p><span dir="ltr" lang="en" class="verbatim">/,
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
    expect(rulesStep).toContain('لا قيمة افتراضية له، ولن يفترض المحرك واحدة.');
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
    expect(canvas).toContain('الحد 1 · طريق (محلي)80 mالارتداد 4.5 m');
    expect(canvas).toContain('الارتداد لم يحسم بعد');
  });
});
