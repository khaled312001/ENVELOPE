/**
 * The API — PRD §19.1: "one Python FastAPI monolith … api/ thin handlers".
 *
 * Fastify rather than FastAPI (see `CLAUDE.md` for why the stack moved to
 * TypeScript), but the shape is the one the PRD specifies and for the reason it
 * gives: eight services for a team of four pre-PMF is a platform, not a product.
 * Runs execute synchronously and must finish inside 10 s (`P0-S5`).
 *
 * Handlers are thin on purpose. Nothing here computes anything a user will see —
 * every number comes from the engine packages, already traced. A handler that
 * did arithmetic would be a number without provenance, which is the one thing
 * the architecture is arranged to prevent.
 */

import { randomUUID } from 'node:crypto';

import {
  ALL_DEFINITIONS,
  ANNEX_VERSION,
  asMm,
  asMm2,
  Decimal,
  type Mm,
  pendingApproval,
  type Plot,
  ringSpanOf,
  toMm,
  toWire,
  type UnitTypeMix,
} from '@envelope/core';
import {
  analysePlot,
  arcFromBulge,
  assertPhase0Shape,
  bulgeFromRadius,
  geometryCheckBaseline,
  geometryChecksSince,
  initGeometry,
  orientRing,
  outwardBearingDeg,
  type Ring,
} from '@envelope/geometry';
import {
  asOfNow,
  briefFor,
  DEVELOPER_STANDARDS,
  loadSeedRulesForDevelopment,
  PROJECT_BRIEFS,
  resolveMix,
  RuleStore,
  scenariosFor,
  SEED_RULES,
  SEED_RULES_WARNING,
  PRACTICE_STATEMENTS,
  statementById,
  statementFor,
  StatementSubject,
} from '@envelope/rules';
import {
  buildAssumptionRegister,
  compareParkingInFar,
  explainGoverningBand,
  runPipeline,
  type RunInput,
} from '@envelope/capacity';
import {
  fromJson,
  runFingerprint,
  toHtml,
  toJson,
  toJsonString,
  unsignedAnnexNotice,
} from '@envelope/report';
import { writeWorkbook } from '@envelope/exports';
import cors from '@fastify/cors';
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';

import {
  emissionBlockers,
  presentChecks,
  runChecks,
  type RunChecks,
} from './checks.js';
import { EXPORT_GATES, Gate, requireExportGates, subjectHash, type GateRecord } from './gates.js';
import { ENGINE_VERSION, presentRun } from './present.js';
import { buildRunReport } from './report.js';
import { canReview, type Actor } from './identity.js';
import { gateAck, plotInput, runRequest, shareRequest, type RunRequest } from './schemas.js';
import { registerIntakeRoutes } from './intake-route.js';
import {
  AttachmentError,
  bindSheet,
  deserialiseSheet,
  isRefusal,
  readAttachedSheet,
  serialiseSheet,
  type StoredSheet,
  type StoredSheetWire,
} from './instrument.js';
import { runDrawing, runDrawingSet, runGlb, runSheets, type DrawableRun } from './drawing.js';
import { runWorkbookSpec, type ExportableRun } from './workbook.js';
import { SqliteAccountRepository, type AccountRepository } from './account-store.js';
import { normaliseEmail } from './accounts.js';
import { registerAuthRoutes, resolveActor, sessionFrom, type GuestPolicy } from './auth-routes.js';
import {
  activeOrgFor,
  auditInOrg,
  registerOrgRoutes,
  scopeToOrg,
} from './org-routes.js';
import { ANY_ROLE, requirePlotFor, requireRunFor, visibleRuns } from './access.js';
import { createThrottle } from './throttle.js';
import { SqliteRunRepository, type RunRepository, type StoredRun } from './store.js';

const DEV_ACK = 'I understand these rules are not approved';

/**
 * THE ACCOUNT REPOSITORY IS A SECOND, OPTIONAL SEAM.
 *
 * Optional because `identity.ts`'s header path is not being deleted: every test in
 * `apps/api/test` and every step of `scripts/smoke.mjs` drives the engine with
 * `X-Actor-*` headers, and so does any deployment already behind a network
 * boundary. Making accounts mandatory would have been a rewrite of the test suite
 * disguised as a feature.
 *
 * A second parameter and not a field on `RunRepository`, for the reason
 * `account-store.ts` opens with: a run is an immutable record of a computation and
 * an account is a mutable fact about a person, and a route that only needs to read a
 * session has no business being able to reach the run store.
 */
/**
 * How a deployment differs from the test suite. Every field defaults to the
 * behaviour the tests and `scripts/smoke.mjs` were written against, so a caller
 * that passes nothing gets the development server — and the production entry,
 * `main.ts`, has to ask for each difference by name.
 */
export interface BuildOptions {
  /** See `GuestPolicy` in `auth-routes.ts`. Default `open`. */
  readonly guests?: GuestPolicy;
  /**
   * Whether `/api/standards` serves the developer standards on file. Default true.
   * They are a developer's confidential brief; a public deployment passes false
   * unless its operator has decided otherwise.
   */
  readonly developerStandards?: boolean;
  /** Engine computations per client address per minute. Default: no limit. */
  readonly computationsPerMinute?: number | null;
  /**
   * How many proxies in front of this process append to `X-Forwarded-For`, or false.
   * Never `true`: that believes the left-most entry, which the visitor writes.
   */
  readonly trustProxy?: number | false;
  /**
   * The path the web server mounts this application under, e.g. `/api`.
   *
   * Every route is registered with its `/api` prefix. An app server configured
   * with a base URI may hand the application the path with that prefix removed;
   * this puts it back, and leaves a path that already carries it alone, so the
   * routes answer the same whichever the app server does.
   */
  readonly mountedAt?: string;
}

/**
 * Trust the socket peer and the `hops - 1` entries nearest it; `request.ip` is the
 * next one out. Hop 0 is the socket, hop 1 the right-most `X-Forwarded-For` entry.
 */
function trustHops(hops: number): (address: string, hop: number) => boolean {
  return (_address, hop) => hop < hops;
}

export async function build(
  repo: RunRepository = new SqliteRunRepository(),
  accounts: AccountRepository | null = new SqliteAccountRepository(),
  options: BuildOptions = {},
): Promise<FastifyInstance> {
  await initGeometry();

  const guests: GuestPolicy = options.guests ?? 'open';
  const standardsOffered = options.developerStandards ?? true;

  const base = options.mountedAt;
  const serverOptions: FastifyServerOptions = {
    logger: { level: process.env['LOG_LEVEL'] ?? 'info' },
    // A plot with many vertices plus a full provenance graph is not small.
    bodyLimit: 4 * 1024 * 1024,
    // Behind a proxy the socket peer is the proxy. Without this every visitor
    // shares one address, and the throttle below limits the site, not a client.
    //
    // As a function, not a number: Fastify fails a bare hop count closed, because it
    // cannot know the immediate peer is a proxy at all. That is the deployment's to
    // assert, not the framework's — under Passenger this process has no public port,
    // only the web server's socket — and `main.ts` makes the operator state the count.
    trustProxy: options.trustProxy ? trustHops(options.trustProxy) : false,
  };
  if (base) {
    serverOptions.rewriteUrl = (req) => {
      const url = req.url ?? '/';
      if (url === base || url.startsWith(base + '/') || url.startsWith(base + '?')) return url;
      return base + (url.startsWith('/') ? url : '/' + url);
    };
  }
  const app = Fastify(serverOptions);

  /** The actor for a request, under this deployment's guest policy. See `access.ts`. */
  const who = (request: FastifyRequest): Promise<Actor> => resolveActor(accounts, request, guests);

  /** Applied to the routes that start engine work. Off unless configured. */
  const costly =
    options.computationsPerMinute != null
      ? { preHandler: createThrottle(options.computationsPerMinute) }
      : {};

  /**
   * CORS — an allowlist, not a mirror.
   *
   * `origin: true` reflects whatever `Origin` the request carried, which is the
   * setting to reach for when a service authenticates its callers. This one does
   * not: `identity.ts` takes the actor from a header and verifies nothing (read
   * its module comment — the omission is the PRD's, and it is deliberate and
   * disclosed). Reflecting every origin on top of that means any page the user
   * visits can read every run on a deployment it can route to.
   *
   * `CORS_ORIGIN` takes a comma-separated list. The default is the dev server
   * and nothing else, so a deployment that forgets to set it fails closed rather
   * than open.
   */
  const configured = process.env['CORS_ORIGIN'];
  const allowed = (configured ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  /**
   * Any loopback port, when `CORS_ORIGIN` is unset.
   *
   * This used to be a two-entry list pinned to `:5173`, and the failure it
   * produced was disproportionate to the mistake: Vite picks the next free port
   * when 5173 is taken, so a second dev server — or a stale one nobody
   * remembered starting — moved the app to `:5174`, and *every* request then
   * came back **500 Internal Server Error** with a stack trace in the server log
   * and nothing legible in the browser. An hour of "the API is broken" for a
   * port number.
   *
   * Loopback is not a security boundary being relaxed here: a page served from
   * 127.0.0.1 is already running on the developer's own machine. What matters is
   * that a **deployment** never falls into this branch, and it cannot — setting
   * `CORS_ORIGIN` switches to the exact list and nothing else is admitted.
   */
  const isLoopback = (origin: string): boolean => {
    try {
      const { hostname, protocol } = new URL(origin);
      return (
        protocol === 'http:' &&
        (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]')
      );
    } catch {
      return false;
    }
  };

  await app.register(cors, {
    origin: (origin, done) => {
      // A request with no Origin is not a browser cross-origin request — curl,
      // a server-side client, the test harness. Those are allowed through;
      // rejecting them would break every non-browser caller to no benefit.
      if (origin === undefined) return done(null, true);
      if (allowed.length > 0) return done(null, allowed.includes(origin));
      done(null, isLoopback(origin));
    },
    exposedHeaders: ['X-Run-Id'],
  });

  // Every error carries a message a person can act on. The engine's errors are
  // already written that way — they name the rule, the gate or the missing
  // declaration — so they are passed through rather than flattened into a 500.
  app.setErrorHandler((raw, request, reply) => {
    const error = raw as Error & {
      statusCode?: number;
      detail?: unknown;
      gate?: string;
    };
    const name = error.name || 'Error';

    // A schema rejection is the caller being told what the product will not
    // guess about — a 400 with the message, not a 500 with a stack. The
    // messages in `schemas.ts` are written to be read by a person.
    if (name === 'ZodError') {
      const issues = (error as unknown as { issues: { path: (string | number)[]; message: string }[] })
        .issues;
      reply.status(400).send({
        error: 'ValidationError',
        message: issues.map((i) => `${i.path.join('.') || '(body)'}: ${i.message}`).join('; '),
        issues: issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }

    const status =
      name === 'UnidentifiedActorError' ? 401
      : name === 'GateNotSatisfiedError' || name === 'GateStaleError' ? 409
      : name === 'RunBlockedError' || name === 'EnvelopeHaltedError' || name === 'ParkingHaltedError' ? 422
      : name === 'EmissionBlockedError' ? 422
      : name === 'UnsupportedShapeError' || name === 'DegenerateGeometryError' ? 422
      : name === 'UnapprovedRuleError' || name === 'RuleIntegrityError' ? 409
      : error.statusCode ?? 500;

    if (status >= 500) request.log.error({ err: error }, 'unhandled');
    reply.status(status).send({
      error: name,
      message: error.message,
      ...(('detail' in error && error.detail) ? { detail: error.detail } : {}),
      ...(('gate' in error && error.gate) ? { gate: error.gate } : {}),
    });
  });

  // ---------------------------------------------------------------------
  // Reference data
  // ---------------------------------------------------------------------

  app.get('/api/health', async () => ({
    status: 'ok',
    engineVersion: ENGINE_VERSION,
    annexVersion: ANNEX_VERSION,
    annexSigned: pendingApproval().length === 0,
  }));

  registerIntakeRoutes(app, costly);
  if (accounts) registerAuthRoutes(app, accounts);
  if (accounts) registerOrgRoutes(app, accounts);

  /**
   * The metric definitions annex — `FR-DEF-001 AC4`: every report cites the
   * version used, so the client must be able to show what that version says.
   */
  app.get('/api/definitions', async () => ({
    version: ANNEX_VERSION,
    signed: pendingApproval().length === 0,
    pendingApproval: pendingApproval().map((d) => d.metricId),
    definitions: ALL_DEFINITIONS,
  }));

  /**
   * The rule base, including what is *not* approved.
   *
   * Pending rules are returned deliberately. A rule base that showed only its
   * approved rules would let coverage look complete when it is not, and §3.4
   * item 4 requires "rules considered and excluded with reasons" to reach the
   * user.
   */
  app.get('/api/rules', async () => {
    const store = new RuleStore().add(...SEED_RULES);
    return {
      approved: [],
      pending: store.pending().map((r) => ({
        ruleId: r.ruleId,
        parameterId: r.parameterId,
        ruleClass: r.ruleClass,
        status: r.status,
        mechanization: r.mechanization,
        isLifeSafety: r.isLifeSafety,
        citation: r.citation,
        note: r.note,
      })),
      warning:
        'No rule in this deployment is approved. A licensed architect must author ' +
        'and approve every rule before the engine can produce an assessment. ' +
        SEED_RULES_WARNING,
    };
  });

  /**
   * Practice statements — the third kind of instrument, and the weakest.
   *
   * Its own endpoint for the same reason `/api/standards` is: a regulation, a
   * developer's brief and a practitioner's recorded reply are three different
   * kinds of thing, and the separation has to survive the wire or it will not
   * survive the screen. Merging any two of these lists is the first step to
   * showing them in the same ink.
   *
   * Served on every deployment. Unlike a developer's brief this is not anybody's
   * confidential commercial expectation — it is a sentence the client asked us
   * to act on, and the whole point of recording it is that a reader can see it.
   *
   * `disclaimer` travels with the list rather than being left to the client to
   * add, because a client that forgets it ships a practitioner's opinion looking
   * like a regulation.
   */
  app.get('/api/statements', async (request) => {
    await who(request);
    const parking = statementFor(StatementSubject.PARKING_IN_FAR);
    return {
      statements: PRACTICE_STATEMENTS.map((s) => ({
        statementId: s.statementId,
        subject: s.subject,
        value: s.value,
        statedBy: s.statedBy,
        statedOn: s.statedOn,
        source: s.source,
        verbatim: s.verbatim,
        translation: s.translation,
        limits: s.limits,
      })),
      /** The one the rules step pre-fills from, named so a client need not search. */
      parkingInFar: parking ? parking.statementId : null,
      disclaimer:
        'A practice statement is what a named practitioner says the practice is. It is ' +
        'not a clause of any code and it has not been checked against one. REGULATORY ' +
        'VALIDITY: NOT ASSESSED.',
    };
  });

  // ---------------------------------------------------------------------
  // Plots — step 1 of the §20.1 flow
  // ---------------------------------------------------------------------

  /**
   * Developer standards and project briefs.
   *
   * Served as their own endpoint rather than folded into `/api/rules`, because
   * they are a different kind of instrument and the separation has to survive
   * the wire. A regulation says what may be built; a developer standard says
   * what this client will pay for. Merging the two lists would be the first
   * step to showing them in the same ink.
   *
   * `plotNumber` narrows the scenarios to that plot's brief when the file holds
   * one — plot 5180178 is studios only, and offering the general 80/18/2 mix
   * beside it would let someone run a mix the brief excludes.
   */
  app.get('/api/standards', async (request) => {
    await who(request);
    if (!standardsOffered) {
      /*
        WITHHELD, AND SAID SO. A developer's brief is that developer's confidential
        commercial expectation; a deployment the public can reach does not serve it
        unless whoever runs the deployment decides to (`DEVELOPER_STANDARDS=on`).
        An empty list with no reason would read as "there are none".
      */
      return {
        standards: [],
        brief: null,
        withheld:
          'Developer standards are not offered on this deployment. They are a ' +
          "developer's commercial brief, shared with us in confidence; enter the unit " +
          'mix and the saleable efficiency yourself.',
        disclaimer:
          'A developer standard is a commercial brief, not a regulation. REGULATORY ' +
          'VALIDITY: NOT ASSESSED.',
      };
    }
    const plotNumber = (request.query as { plotNumber?: string }).plotNumber ?? '';
    const brief = plotNumber ? briefFor(PROJECT_BRIEFS, plotNumber) : undefined;

    return {
      standards: DEVELOPER_STANDARDS.map((standard) => {
        const scenarios = scenariosFor(standard, brief);
        return {
          standardId: standard.standardId,
          developer: standard.developer,
          title: standard.title,
          citation: standard.citation,
          notMechanized: standard.notMechanized,
          targets: {
            saleableEfficiencyMin: standard.targets.saleableEfficiencyMin,
            saleableEfficiencyMax: standard.targets.saleableEfficiencyMax,
            parkingAreaPerBayM2: standard.targets.parkingAreaPerBayM2,
            parkingOverage: standard.targets.parkingOverage,
            amenityShareMin: standard.targets.amenityShareMin,
            amenityShareMax: standard.targets.amenityShareMax,
          },
          scenarios: scenarios.map((scenario) => {
            /*
              Resolved here, on the server, and for one reason: the ft²-to-m²
              conversion and the maxima-as-areas decision are arithmetic on a
              cited value, and this codebase does not do arithmetic on the
              client. The browser receives areas, not a table and a factor.
            */
            const resolved = resolveMix(
              standard,
              scenario.scenarioId,
              'TOWER',
              brief?.scenarios,
            );
            return {
              scenarioId: scenario.scenarioId,
              label: scenario.label,
              fromBrief: scenario.fromBrief,
              citation: scenario.citation,
              ...(scenario.rangeNote ? { rangeNote: scenario.rangeNote } : {}),
              basis: resolved.basis,
              entries: resolved.entries.map((e) => ({
                typeId: e.typeId,
                label: e.label,
                share: e.share.toString(),
                nsaM2: e.nsaM2.toFixed(2),
                derivation: e.derivation,
              })),
            };
          }),
        };
      }),
      brief: brief
        ? {
            briefId: brief.briefId,
            plotNumber: brief.plotNumber,
            citation: brief.citation,
            plotAreaM2: brief.plotAreaM2,
            gfaM2: brief.gfaM2,
            far: brief.far,
            heightCode: brief.heightCode,
            landUse: brief.landUse,
            notMechanized: brief.notMechanized,
          }
        : null,
      /*
        Said on every response, not only where a standard is selected. A reader
        who has just seen a unit count derived from a developer's brief is
        exactly the reader most likely to take it for a limit.
      */
      disclaimer:
        'A developer standard is a commercial brief, not a regulation. It constrains ' +
        'what this client will build; it says nothing about what the authority permits, ' +
        'and no value here is a compliance statement. REGULATORY VALIDITY: NOT ASSESSED.',
    };
  });

  app.post('/api/plots', costly, async (request, reply) => {
    const actor = await who(request);
    const body = plotInput.parse(request.body);

    /*
      THE RING IS STORED COUNTER-CLOCKWISE, AND THE EDGES COME WITH IT.

      `outwardBearingDeg` assumes a counter-clockwise ring and nothing enforced
      it, so a plot walked the other way stored every outward normal pointing
      inward — the setback on the wrong side of each edge, and the vehicle
      entrance offered on the boundary furthest from the road. It never happened
      because the only client emitted one rectangle, counter-clockwise, every
      time; a traverse entered by hand is the first input that can walk either
      way. `orientRing` carries each edge's classification to wherever its
      boundary landed, which is the part a reversal gets wrong on its own.
    */
    const oriented = orientRing(
      body.vertices.map((v) => ({ x: toMm(v.x) as Mm, y: toMm(v.y) as Mm })),
    );
    const corners: Ring = oriented.ring;
    const boundaries = inputEdgesByRingIndex(body.edges, oriented.order);

    /*
      A CURVED BOUNDARY IS RESOLVED HERE AND NOWHERE ELSE.

      The sheet states a radius and a side; the engine stores a bulge. Both
      describe the same arc, but only one of them survives a reversal without
      thinking: reversing the ring reverses the way every boundary is walked,
      and "bows to the right" is a statement about that walk. So the side is
      flipped with the ring, before the bulge exists, rather than the bulge's
      sign being flipped afterwards by somebody who remembers to.

      `bulgeFromRadius` refuses a radius too small to span its own boundary, in
      those words, and the handler turns it into a 422.
    */
    const bulges = boundaries.map((edge, seq) => {
      if (!edge.arc) return undefined;
      const start = corners[seq]!;
      const end = corners[(seq + 1) % corners.length]!;
      const chordMm = new Decimal(Math.hypot(end.x - start.x, end.y - start.y));
      const bulgesRight = oriented.reversed ? !edge.arc.bulgesRight : edge.arc.bulgesRight;
      return bulgeFromRadius(chordMm, new Decimal(edge.arc.radiusM).times(1000), bulgesRight);
    });

    const geometry = analysePlot(corners, bulges);
    // The polygon, with every curve tessellated. One shape for the offset
    // kernel, the drawings, the DXF and the 3D view — never a curve on screen
    // and a chord in the file.
    const ring: Ring = geometry.ring;

    // §14.1, enforced at the data layer rather than by convention.
    assertPhase0Shape(geometry.shapeClass);

    /*
      THE SHEET IS READ HERE, BY THIS SERVER, OR NOT AT ALL.

      Parsed before the plot is built so an unreadable upload fails the request
      rather than storing a plot whose sheet silently did not attach. A sheet that
      merely omits every limit is NOT an error — it is a valid document and a
      normal answer, and the plot is stored with what little it said.
    */
    let sheet: StoredSheet | undefined;
    if (body.affectionPlan) {
      try {
        const read = await readAttachedSheet(body.affectionPlan);
        sheet = {
          limits: read.limits,
          parcelId: read.parcelId ?? null,
          issuedOn: read.issuedOn,
          documentUri: read.documentUri,
        };
      } catch (error) {
        if (error instanceof AttachmentError) {
          return reply.code(error.statusCode).send({ error: error.message, detail: error.detail });
        }
        throw error;
      }
    }

    const stated = body.statedAreaM2 ? new Decimal(body.statedAreaM2) : undefined;
    // `FR-PLT-001 AC2` blocks at a 2% deviation. Reported rather than thrown, so
    // the UI can show both numbers and let the user decide which is wrong —
    // the affection plan is not automatically right.
    const areaMismatch =
      stated !== undefined &&
      stated.minus(geometry.areaM2).abs().div(stated).gt('0.02');

    const plot: Plot = {
      plotId: randomUUID(),
      tenantId: actor.id,
      plotNumber: body.plotNumber,
      community: body.community,
      landUse: 'RESIDENTIAL_MULTI',
      ring,
      edges: boundaries.map((e, seq) => {
        const start = corners[seq]!;
        const end = corners[(seq + 1) % corners.length]!;
        const span = geometry.spans[seq]!;
        const bulge = bulges[seq];
        const arc = bulge === undefined ? undefined : arcFromBulge(start, end, bulge);
        return {
          seq,
          start,
          end,
          classification: e.classification,
          ...(e.roadHierarchy ? { roadHierarchy: e.roadHierarchy } : {}),
          lengthMm: asMm(Math.round(Math.hypot(end.x - start.x, end.y - start.y))),
          bearingDeg: outwardBearingDeg(start, end),
          ...(arc === undefined
            ? {}
            : {
                arc: {
                  bulge: bulge!,
                  radiusMm: asMm(Math.round(arc.radiusMm.toNumber())),
                  sweepDeg: arc.sweepDeg,
                  arcLengthMm: asMm(Math.round(arc.arcLengthMm.toNumber())),
                },
              }),
          ringFrom: span.from,
          ringSpan: span.count,
        };
      }),
      shapeClass: geometry.shapeClass,
      statedAreaM2: stated,
      computedAreaMm2: geometry.areaMm2,
      areaMismatch,
      principalAxisDeg: geometry.principalAxisDeg,
      mbrWidthMm: geometry.mbr.widthMm,
      mbrDepthMm: geometry.mbr.depthMm,
      convexityRatio: geometry.convexityRatio,
      frontageCount: body.edges.filter((e) => e.classification === 'ROAD').length,
    };

    await repo.insertPlot({
      plotId: plot.plotId,
      tenantId: actor.id,
      plotNumber: plot.plotNumber,
      community: plot.community,
      landUse: plot.landUse,
      createdAt: new Date().toISOString(),
      createdByActorId: actor.id,
      createdByActorName: actor.name,
      computedAreaM2: geometry.areaM2.toFixed(2),
      areaMismatch,
      frontageCount: plot.frontageCount,
      shapeClass: plot.shapeClass,
      plot: serialisePlot(plot, sheet),
    });
    /*
      WHICH WORKSPACE THIS PLOT BELONGS TO, recorded beside the plot rather than
      on it. `StoredScope` argues the table; what matters here is that the record
      is written at creation and never inferred afterwards — a plot whose
      organisation is worked out later from who happens to be a member now is a
      plot whose access changes when a membership does.
    */
    await scopeToOrg(accounts, await activeOrgFor(accounts, request, actor), 'plot', plot.plotId);
    reply.status(201);
    return {
      plotId: plot.plotId,
      shapeClass: plot.shapeClass,
      computedAreaM2: geometry.areaM2.toFixed(2),
      statedAreaM2: stated?.toFixed(2) ?? null,
      areaMismatch,
      areaMismatchMessage: areaMismatch
        ? `The area computed from the boundary (${geometry.areaM2.toFixed(2)} m²) differs ` +
          `from the stated area (${stated!.toFixed(2)} m²) by more than 2%. Confirm which ` +
          `is correct before continuing — the affection plan is not automatically right, ` +
          `and neither is a traced boundary.`
        : null,
      principalAxisDeg: geometry.principalAxisDeg.toFixed(2),
      convexityRatio: geometry.convexityRatio.toFixed(4),
      mbr: {
        widthM: new Decimal(geometry.mbr.widthMm).div(1000).toFixed(3),
        depthM: new Decimal(geometry.mbr.depthMm).div(1000).toFixed(3),
      },
      frontageCount: plot.frontageCount,
      gateSubjectHash: subjectHash({ plot: body }),
      /*
        WHAT THE SHEET SAID, ANSWERED HERE RATHER THAN AT THE RUN.

        The reader attaches the document on this screen, so this is where they
        find out whether it was read and what it will bind. Reported through the
        same function the run uses, so the two cannot describe one sheet
        differently — and it is bound against this plot's number here too, which
        is how a sheet for the wrong parcel is caught at upload rather than three
        steps later.
      */
      sheet: sheetReport(sheet ? bindSheet(sheet, plot.plotNumber, actor.name) : undefined),
    };
  });

  /**
   * The reader's plots, newest first.
   *
   * This said "no tenant filter … disclosed, not patched" for as long as the API
   * had no identity to filter by. The filter is `created_by_actor_id`, applied in
   * the query — see `access.ts` for the rule and why it breaks nothing `G4` needs.
   */
  app.get('/api/plots', async (request) => {
    const actor = await who(request);
    const limit = Math.min(Number((request.query as { limit?: string }).limit ?? 100), 500);
    const plots = await repo.listPlotsByActor(actor.id, limit);
    return {
      total: plots.length,
      plots: await Promise.all(
        plots.map(async (p) => ({
        plotId: p.plotId,
        plotNumber: p.plotNumber,
        community: p.community,
        landUse: p.landUse,
        shapeClass: p.shapeClass,
        computedAreaM2: p.computedAreaM2,
        areaMismatch: p.areaMismatch,
        frontageCount: p.frontageCount,
        createdAt: p.createdAt,
        createdBy: p.createdByActorName,
        runCount: (await repo.listByPlot(p.plotId)).length,
        })),
      ),
    };
  });

  app.get('/api/plots/:plotId', async (request) => {
    const { plotId } = request.params as { plotId: string };
    await requirePlotFor(repo, accounts, plotId, await who(request), 'read');
    const plot = await loadPlot(repo, plotId);
    return {
      plotId: plot.plotId,
      plotNumber: plot.plotNumber,
      community: plot.community,
      landUse: plot.landUse,
      shapeClass: plot.shapeClass,
      vertices: plot.ring.map((p) => ({
        x: new Decimal(p.x).div(1000).toFixed(3),
        y: new Decimal(p.y).div(1000).toFixed(3),
      })),
      edges: plot.edges.map((e) => {
        /*
          THE SPAN TRAVELS WITH THE BOUNDARY.

          `vertices` above is the ring, and a curved boundary is one entry here
          and many vertices there. A client that paired the two lists by index
          would draw every classification, every band and every setback label
          one boundary out from the moment a plot had a curve in it — and the
          plot would still be exactly the right shape.
        */
        const span = ringSpanOf(e);
        return {
          seq: e.seq,
          classification: e.classification,
          roadHierarchy: e.roadHierarchy ?? null,
          lengthM: new Decimal(e.lengthMm).div(1000).toFixed(3),
          bearingDeg: e.bearingDeg.toFixed(2),
          ringFrom: span.from,
          ringSpan: span.count,
          /* The figures an affection plan prints for a curve, so a reader can
             check the plot against the document rather than against a radius
             they typed into a box three steps ago. */
          arc: e.arc
            ? {
                radiusM: new Decimal(e.arc.radiusMm).div(1000).toFixed(3),
                arcLengthM: new Decimal(e.arc.arcLengthMm).div(1000).toFixed(3),
                sweepDeg: e.arc.sweepDeg.toFixed(2),
                bulgesRight: e.arc.bulge.isPositive(),
              }
            : null,
        };
      }),
      computedAreaM2: new Decimal(plot.computedAreaMm2).div(1_000_000).toFixed(2),
      areaMismatch: plot.areaMismatch,
    };
  });

  // ---------------------------------------------------------------------
  // Runs — steps 5–8
  // ---------------------------------------------------------------------

  app.post('/api/runs', costly, async (request, reply) => {
    const actor = await who(request);
    const body = runRequest.parse(request.body);

    await requirePlotFor(repo, accounts, body.plotId, actor, 'write');
    const plot = await loadPlot(repo, body.plotId);

    const store = new RuleStore().add(
      ...(body.useDraftRules ? loadSeedRulesForDevelopment(DEV_ACK) : SEED_RULES),
    );
    const asOf = asOfNow(new Date().toISOString().slice(0, 10));
    const rules = store.load(asOf);

    /*
      THE PLOT'S OWN SHEET, APPLIED — THE HIGHEST-SEVERITY DEFECT IN THE PLAN.

      Until this line the affection plan was read at intake, shown on screen, and
      dropped before the engine saw it: the Warsan plot ran on the seed FAR of
      5.00 while its own sheet printed 3.5. §11.5 step 1 gives a plot-specific
      instrument precedence, so appending these to the rule set is all it takes —
      `resolveParameter` does the rest and records the seed rule as superseded.

      A refusal is NOT a failure. The run proceeds on the general rules exactly as
      it did before, and `sheet` in the response names the document that was set
      aside and why — a sheet that is attached and quietly ignored is worse than
      no sheet at all.
    */
    const stored = await loadSheet(repo, body.plotId);
    const bound = stored ? bindSheet(stored, plot.plotNumber, actor.name) : undefined;
    const instrumentRules = bound && !isRefusal(bound) ? bound.rules : [];

    const input = runInputFrom(body, plot, [...rules, ...instrumentRules], actor);

    // The baseline must be taken immediately before the run and read
    // immediately after, with no await between: the geometry counters are
    // process-wide, and an await here would fold a concurrent request's
    // polygons into this run's evidence. `runPipeline` is synchronous, which is
    // what makes the difference exact.
    const geometryBaseline = geometryCheckBaseline();
    const started = performance.now();
    const output = runPipeline(input);
    const elapsedMs = performance.now() - started;
    const geometry = geometryChecksSince(geometryBaseline);

    const register = buildAssumptionRegister(input, output);
    const runId = randomUUID();
    const ruleSetHash = store.contentHash(asOf);

    // --- The two independent layers -------------------------------------
    //
    // Run before anything is persisted or returned. §12.3 and §16.1 both make
    // failure block emission rather than warn, so a run that fails a check does
    // not become a stored artifact with a caveat attached — it does not become
    // an artifact.
    const checks = runChecks({
      runId,
      plot,
      input,
      output,
      engineVersion: ENGINE_VERSION,
      ruleSetHash,
      geometry,
      validatedAt: new Date().toISOString(),
    });

    const blockers = emissionBlockers(checks);
    if (blockers.length > 0) throw new EmissionBlockedError(blockers, checks);

    const payload = presentRun(
      runId,
      plot,
      output,
      register,
      elapsedMs,
      body.useDraftRules,
      checks,
    );

    // --- The §3.4 artifact, built now and stored -------------------------
    //
    // `toJsonString` calls `assertEmittable`, so the report's own gate runs
    // here rather than at export: an annex-version mismatch, an undeclared area
    // term or a tampered render hint stops the run from being *persisted*, not
    // merely from being downloaded. A stored artifact that cannot be rendered
    // is a defect a user meets weeks later, holding a run id.
    const report = buildRunReport({
      runId,
      plot,
      input,
      output,
      checks,
      register,
      /*
        The rules the run ACTUALLY resolved against, instrument included. §3.4
        item 4 wants "rules considered and excluded with reasons", and a report
        that listed only the library would omit the one record that beat it.

        `ruleSetHash` is the library's hash and stays that: it identifies which
        version of the rule base was loaded. What the sheet added is identified
        by `sheet` on the payload, which names the document and its issue date.
      */
      rules: [...rules, ...instrumentRules],
      ruleSetHash,
      engineVersion: ENGINE_VERSION,
      draftRules: body.useDraftRules,
      producedAt: new Date().toISOString(),
      structuredInputs: body as unknown as Record<string, unknown>,
      reviewer: null,
    });
    const reportJson = toJsonString(report);

    /*
      ONE timestamp, stored and returned.
      The title block prints the date the run was computed, and the screen draws
      the same title block the PDF prints. Two `new Date()` calls a millisecond
      apart would put two dates on one run, and the day they straddled midnight
      the screen and the paper would disagree about which day the figures are.
    */
    const createdAt = new Date().toISOString();
    await repo.insert({
      runId,
      tenantId: actor.id,
      plotId: plot.plotId,
      parentRunId: null,
      createdAt,
      createdByActorId: actor.id,
      createdByActorName: actor.name,
      engineVersion: ENGINE_VERSION,
      annexVersion: ANNEX_VERSION,
      ruleSetHash,
      input: JSON.stringify(body),
      output: JSON.stringify(payload),
      report: reportJson,
      fingerprint: subjectHash({ body, engine: ENGINE_VERSION, annex: ANNEX_VERSION }),
      draftRules: body.useDraftRules,
      gates: JSON.stringify({}),
    });

    const workspace = await activeOrgFor(accounts, request, actor);
    await scopeToOrg(accounts, workspace, 'run', runId);
    /*
      §24.4 asks for an audit trail of who did what. A run computed inside a
      workspace is the first entry in it — and the plot number is recorded, not
      re-read later, because a log that resolves its own subjects at read time
      shows what is true now rather than what happened.
    */
    await auditInOrg(accounts, workspace, actor, 'run.created', runId, {
      plotId: plot.plotId,
      plotNumber: plot.plotNumber,
      draftRules: body.useDraftRules,
    });

    reply.header('X-Run-Id', runId).status(201);
    return { ...payload, sheet: sheetReport(bound), issuedAt: createdAt };
  });

  /**
   * Every run, newest first, summarised.
   *
   * Summarised from the *stored* payload rather than recomputed. A list view
   * that re-executes the engine to fill a column is a list view whose numbers
   * can disagree with the run they name — and on this product the whole
   * proposition is that a number and its derivation travel together.
   */
  app.get('/api/runs', async (request) => {
    const actor = await who(request);
    const limit = Math.min(Number((request.query as { limit?: string }).limit ?? 50), 200);
    const visible = await visibleRuns(repo, accounts, actor, limit);
    return {
      total: visible.length,
      runs: visible.map(({ run }) => summariseRun(run)),
    };
  });

  /**
   * WHAT THIS ACCOUNT HAS DONE — authored, and shared with them.
   *
   * THE AUTHORIZATION IS THE POINT OF THIS ROUTE, and it was the first one in the
   * product to have any. `CLAUDE.md` disclosed the gap plainly: "no authorization at
   * all: any identified actor can read, gate and export any run", and recorded that
   * per-author scoping was CONSIDERED AND REJECTED, because G4 is signed by a reviewer
   * who is deliberately not the author and an ownership check would break the one flow
   * the gate exists for.
   *
   * That reasoning is correct, and it rules out ownership ALONE rather than
   * authorization. The answer is ownership PLUS an explicit grant: a run is reachable
   * by the account that authored it and by every account the author has shared it
   * with. A share carries a role, and a `reviewer` share is what makes G4 possible
   * under isolation — the author names who will sign, that person can see the run, and
   * "the signer is not the author" stops being a hope and becomes a row.
   *
   * It was the first route with that rule. Every run and plot route now applies the
   * same one, from `access.ts`, and this route differs only in requiring a session:
   * drafts and shares are kept against accounts, which a guest does not have.
   */
  app.get('/api/work', async (request, reply) => {
    if (!accounts) return reply.code(501).send({ error: 'this deployment has no account store' });
    const session = await sessionFrom(accounts, request);
    if (!session) {
      return reply.code(401).send({
        error:
          'your work is kept against an account. Sign in, and every run you author is listed here.',
      });
    }

    const authored = await repo.listRunsByActor(session.accountId, 100);

    /* Shared runs are resolved BY ID rather than by scanning every run for a match:
       the grant table already knows exactly which ones, and a scan would read other
       accounts’ rows in order to discard them. */
    const shares = await accounts.listSharesForAccount(session.accountId);
    const shared = await repo.getMany(shares.map((sh) => sh.runId));
    const roleOf = new Map(shares.map((sh) => [sh.runId, sh.role]));

    const openDrafts = await accounts.listDrafts(session.accountId);

    return {
      account: { accountId: session.accountId, name: session.name, email: session.email },
      authored: authored.map((r) => summariseRun(r)),
      shared: shared.map((r) => ({
        ...summariseRun(r),
        sharedRole: roleOf.get(r.runId) ?? 'reader',
      })),
      drafts: openDrafts.map((d) => ({ draftKey: d.draftKey, updatedAt: d.updatedAt })),
    };
  });

  /**
   * Share a run with another account, by email, in a named role.
   *
   * ONLY THE AUTHOR MAY SHARE. There is no "anyone with the link": a link that grants
   * access is a credential that travels through a mail client, and this product exists
   * to record who saw what.
   *
   * THE RESPONSE DOES NOT SAY WHETHER THE EMAIL MATCHED AN ACCOUNT. Sharing is an
   * authenticated route so the exposure is smaller than on sign-in, but an author who
   * can enumerate the customer list one address at a time is still an author who can
   * enumerate the customer list.
   */
  app.post<{ Params: { runId: string } }>('/api/runs/:runId/share', async (request, reply) => {
    if (!accounts) return reply.code(501).send({ error: 'this deployment has no account store' });
    const session = await sessionFrom(accounts, request);
    if (!session) return reply.code(401).send({ error: 'sign in to share a run' });

    // 404 to anyone the run was not shared with, 403 to a reviewer or reader —
    // the same rule as every other run route, from `access.ts`.
    const { run } = await requireRunFor(repo, accounts, request.params.runId, session, ['author']);

    const body = shareRequest.parse(request.body);
    const target = await accounts.getAccountByEmail(normaliseEmail(body.email));
    if (target && target.accountId !== session.accountId) {
      await accounts.grantShare({
        runId: run.runId,
        accountId: target.accountId,
        role: body.role,
        grantedByAccountId: session.accountId,
        grantedAt: new Date().toISOString(),
      });
    }
    return reply.send({ shared: true });
  });
  /**
   * The state of the deployment, in the numbers that decide whether anything
   * here may be relied on.
   *
   * Deliberately not a "health score". Every figure is a count of something
   * countable, and the three that matter most — approved rules, signed
   * definitions, invariants that ran — are the ones a dashboard would normally
   * bury because they all currently read zero, zero, and ten of eighteen.
   * Burying them is how a demonstration becomes a claim.
   */
  app.get('/api/dashboard', async (request) => {
    // The deployment's own figures — rules, definitions, checks — are the same for
    // everyone. Run-derived ones are the reader's runs: an exposure ranking built
    // from other people's runs would publish the basis strings they typed.
    const runs = (await visibleRuns(repo, accounts, await who(request), 200)).map((v) => v.run);
    const summaries = runs.map(summariseRun);

    const governing = { REGULATORY: 0, GEOMETRIC: 0, PARKING: 0 } as Record<string, number>;
    for (const r of summaries) {
      if (r.governingBand) governing[r.governingBand] = (governing[r.governingBand] ?? 0) + 1;
    }

    // Assumption exposure across every run: which assumed inputs actually move
    // the answer, ranked by the largest effect any single run measured.
    const exposure = new Map<
      string,
      { parameterId: string; runs: number; maxRelativeEffect: string; basis: string }
    >();
    for (const run of runs) {
      const payload = JSON.parse(run.output) as {
        assumptions?: {
          parameterId: string;
          basis: string;
          sensitivity: { relativeEffect: string } | null;
        }[];
      };
      for (const a of payload.assumptions ?? []) {
        const effect = a.sensitivity?.relativeEffect ?? '0';
        const held = exposure.get(a.parameterId);
        if (!held) {
          exposure.set(a.parameterId, {
            parameterId: a.parameterId,
            runs: 1,
            maxRelativeEffect: effect,
            basis: a.basis,
          });
        } else {
          held.runs += 1;
          if (new Decimal(effect).gt(held.maxRelativeEffect)) held.maxRelativeEffect = effect;
        }
      }
    }

    /**
     * Read from `SEED_RULES`, not from `loadSeedRulesForDevelopment`.
     *
     * The dev loader exists so a demo can run at all: `RuleStore` refuses to
     * load an unapproved rule, so it stamps every seed record
     * `APPROVED / DEVELOPMENT-ONLY-NOT-A-REAL-APPROVER`. Counting `status ===
     * 'APPROVED'` over *that* set reported 13 of 13 rules approved on a
     * deployment where the real number is zero — a dashboard measuring its own
     * escape hatch and calling it readiness. `FR-RUL-001 AC2` requires the
     * approver to be "a qualified human", so that is what is counted.
     */
    const approvedByAHuman = (r: { approvedBy: string | null; status: string }): boolean =>
      r.status === 'APPROVED' &&
      r.approvedBy !== null &&
      !r.approvedBy.startsWith('DEVELOPMENT-ONLY');

    const rules = SEED_RULES;
    const pending = pendingApproval();

    const latest = summaries[0];

    return {
      generatedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,

      /**
       * The three readiness facts, first and unqualified.
       *
       * `FR-DEF-001 AC4` gates every area term on a signed annex and
       * `FR-RUL-001` gates every rule on a named approver. Both are unmet. A
       * dashboard that led with "12 runs this week" while these read zero would
       * be measuring activity and calling it progress.
       */
      readiness: {
        rulesApproved: rules.filter(approvedByAHuman).length,
        rulesTotal: rules.length,
        definitionsSigned: ALL_DEFINITIONS.length - pending.length,
        definitionsTotal: ALL_DEFINITIONS.length,
        annexVersion: ANNEX_VERSION,
        annexSigned: pending.length === 0,
        /** Ten of eighteen on a Phase 0 artifact. See open-questions.md Q26. */
        invariantsRan: latest?.invariants.ran ?? null,
        invariantsTotal: latest?.invariants.total ?? 18,
        blocking:
          'No rule in this deployment is approved and the metric definitions annex is ' +
          'unsigned. Every figure below is an engine demonstration. None of it is a ' +
          'capacity assessment and none of it may be quoted to a third party.',
      },

      volume: {
        plots: await repo.countPlots(),
        runs: await repo.countRuns(),
        runsShown: summaries.length,
        exported: summaries.filter((r) => r.gatesSatisfied === EXPORT_GATES.length).length,
        reviewed: summaries.filter((r) => r.reviewer !== null).length,
      },

      /** Which limit binds, across the portfolio. §15.2 — this is where to push. */
      governingBands: governing,

      assumptionExposure: [...exposure.values()].sort((a, b) =>
        new Decimal(b.maxRelativeEffect).comparedTo(a.maxRelativeEffect),
      ),

      deferred: (() => {
        const seen = new Map<
          string,
          { ruleId: string; parameterId: string; isLifeSafety: boolean; citation: unknown }
        >();
        for (const r of rules) {
          if (r.ruleClass === 'DEFERRED' || r.ruleClass === 'EVALUATIVE_ONLY') {
            seen.set(r.ruleId, {
              ruleId: r.ruleId,
              parameterId: r.parameterId,
              isLifeSafety: r.isLifeSafety,
              citation: r.citation,
            });
          }
        }
        return [...seen.values()];
      })(),

      recentRuns: summaries.slice(0, 12),
    };
  });

  app.get('/api/runs/:runId', async (request) => {
    const { runId } = request.params as { runId: string };
    const { run, role } = await requireRunFor(repo, accounts, runId, await who(request), ANY_ROLE);
    // `access` tells the screen which actions to offer. The server enforces them
    // regardless; this only stops it offering a button that would answer 403.
    /*
      `issuedAt` is added here rather than inside `presentRun`: the engine does
      not know when its output was stored, and a title block's date is a fact
      about the record, not a figure out of the computation.
    */
    return {
      ...JSON.parse(run.output),
      gates: JSON.parse(run.gates),
      access: role,
      issuedAt: run.createdAt,
    };
  });

  /**
   * The click-through derivation of any single value — §20.2's "interaction that
   * converts a skeptical architect". Every number in the UI links here.
   */
  app.get('/api/runs/:runId/provenance/:nodeId', async (request) => {
    const { runId, nodeId } = request.params as { runId: string; nodeId: string };
    const { run } = await requireRunFor(repo, accounts, runId, await who(request), ANY_ROLE);
    const payload = JSON.parse(run.output) as { provenance: { nodes: unknown[]; edges: unknown[] } };
    const tree = buildTree(payload.provenance, nodeId);
    if (!tree) throw Object.assign(new Error('node not found in this run'), { statusCode: 404 });
    return tree;
  });

  /** `FR-DEF-002 AC4` — one click, both treatments, side by side. */
  app.post('/api/runs/parking-in-far-comparison', costly, async (request) => {
    const actor = await who(request);
    const body = runRequest.parse(request.body);
    await requirePlotFor(repo, accounts, body.plotId, actor, 'write');
    const plot = await loadPlot(repo, body.plotId);

    const store = new RuleStore().add(
      ...(body.useDraftRules ? loadSeedRulesForDevelopment(DEV_ACK) : SEED_RULES),
    );
    const rules = store.load(asOfNow(new Date().toISOString().slice(0, 10)));

    const cmp = compareParkingInFar({
      ...runInputFrom(body, plot, rules, actor),
      parkingInFar: 'EXCLUDED_FROM_FAR',
    });

    const side = (r: typeof cmp.countsTowardFar) =>
      r instanceof Error
        ? { error: r.message }
        : {
            regulatoryGfaM2: r.capacity.regulationLimitedGfa.value.toFixed(2),
            governingGfaM2: r.capacity.governingGfa.value.toFixed(2),
            governingBand: r.capacity.governingBand,
          };

    return {
      countsTowardFar: side(cmp.countsTowardFar),
      excludedFromFar: side(cmp.excludedFromFar),
      regulatorySpreadM2: cmp.regulatorySpreadM2?.toFixed(2) ?? null,
      governingSpreadM2: cmp.spreadM2?.toFixed(2) ?? null,
      governingSpreadRelative: cmp.spreadRelative?.toFixed(6) ?? null,
      verdict: cmp.verdict,
    };
  });

  // ---------------------------------------------------------------------
  // Gates — §21.1
  // ---------------------------------------------------------------------

  app.post('/api/runs/:runId/gates', async (request) => {
    const actor = await who(request);
    const body = gateAck.parse(request.body);
    /*
      G1–G3 acknowledge the author's own inputs, so only the author gives them.
      G4 is the reviewer's signature — the one act a `reviewer` share exists for.
    */
    const { run } = await requireRunFor(
      repo,
      accounts,
      (request.params as { runId: string }).runId,
      actor,
      body.gate === Gate.G4_REVIEWER_NAMED ? ['author', 'reviewer'] : ['author'],
    );

    if (body.gate === Gate.G4_REVIEWER_NAMED && !canReview(actor)) {
      throw Object.assign(
        new Error(
          'G4 requires a named reviewer who asserts a professional licence. Send ' +
            'X-Actor-Licence. The system cannot verify a licence — it records that a ' +
            'person put theirs next to this export, which is the standard a signed ' +
            'drawing meets.',
        ),
        { statusCode: 403 },
      );
    }

    const gates: GateRecord = JSON.parse(run.gates);
    gates[body.gate] = {
      gate: body.gate,
      actorId: actor.id,
      actorName: actor.name,
      at: new Date().toISOString(),
      ...(actor.licence ? { licence: actor.licence } : {}),
      subjectHash: body.subjectHash,
    };
    await repo.recordGate(run.runId, JSON.stringify(gates));
    /*
      A GATE IS THE ONE THING §24.4 NAMES OUTRIGHT — "who approved what". The
      licence is recorded here as it is everywhere else: as an assertion, with
      `licenceAsserted` rather than `licenceVerified`, because nothing in this
      product verifies one and a log that implied otherwise would be the lie the
      whole claim statement exists to refuse.
    */
    await auditInOrg(
      accounts,
      await activeOrgFor(accounts, request, actor),
      actor,
      'gate.signed',
      run.runId,
      { gate: body.gate, licenceAsserted: actor.licence ?? null },
    );
    return { gates };
  });

  /**
   * Export — blocked until G3 and G4 are satisfied against the *current* content.
   *
   * The subject hashes are recomputed here rather than trusted from the client,
   * because a gate acknowledged against different content is not an
   * acknowledgement of this one.
   */
  app.post('/api/runs/:runId/export', costly, async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const { run } = await requireRunFor(repo, accounts, runId, await who(request), ANY_ROLE);
    const payload = JSON.parse(run.output) as Record<string, unknown>;
    const gates: GateRecord = JSON.parse(run.gates);

    requireExportGates(gates, {
      [Gate.G1_PLOT_CONFIRMED]: subjectHash(payload['plot']),
      [Gate.G2_RULES_ACKNOWLEDGED]: subjectHash(payload['rules']),
      [Gate.G3_ASSUMPTIONS_ACKNOWLEDGED]: subjectHash(payload['assumptions']),
      [Gate.G4_REVIEWER_NAMED]: subjectHash(payload['capacity']),
    });

    const g4 = gates[Gate.G4_REVIEWER_NAMED]!;

    /*
      THE RUN, AS SOMETHING DRAWABLE.

      A title block's issue date and its checked-by are facts ABOUT the run, not
      figures out of it, so they are put on here at the composition root — the
      date off the stored row and the name off the gate record. Never off the
      clock: a sheet downloaded six months after its run must still say when the
      figures were produced, and re-dating an unchanged drawing on every download
      is the one thing a dated title block is relied on not to do.
    */
    const drawable = {
      ...payload,
      issuedAt: run.createdAt,
      checkedBy: g4.actorName,
    } as unknown as DrawableRun;

    /**
     * The stored report, re-imported and stamped with the reviewer.
     *
     * `fromJson` is the inverse of `toJsonString` **with teeth**: it re-runs
     * `assertEmittable` on the way in, so a row edited in the database — an
     * invariant flipped from FAIL to PASS, a render hint softened, a regulatory
     * claim raised above NEVER_CLAIMED — cannot be rendered back out. That is
     * the reason the round trip exists at all rather than serving the stored
     * string straight through.
     *
     * The reviewer is the only field added here, because it is the only field
     * that is not known when the run executes: G4 happens later, by a different
     * person, and §21.1 makes their name part of the artifact rather than part
     * of the computation.
     */
    const stored = fromJson(JSON.parse(run.report));
    const reviewed = {
      ...stored,
      reviewer: {
        id: g4.actorId,
        name: g4.actorName,
        role: g4.licence ?? 'named reviewer (no licence asserted)',
        acknowledgedAt: g4.at,
      },
    };

    const format = (request.query as { format?: string }).format ?? 'json';
    if (format === 'html') {
      reply.header('content-type', 'text/html; charset=utf-8');
      return toHtml(reviewed, { sheets: runSheets(drawable) });
    }

    // The drawing set: every sheet, A3, one to a page. Its own document rather
    // than pages inside the A4 report — see `drawingsSection` in the report.
    if (format === 'sheets') {
      reply.header('content-type', 'text/html; charset=utf-8');
      return runDrawingSet(drawable);
    }

    /**
     * CAD and Excel, behind the same gates as the PDF.
     *
     * The client asked for both by name — "اوتوكاد او ريفيت او pdf او اكسل" —
     * and the temptation is to treat a drawing as a lesser artifact that can
     * skip the acknowledgement. It is the opposite: a DXF is the output most
     * likely to be x-reffed into a submission set and read by someone who never
     * saw the assumption register. So it is gated identically and it carries the
     * disclaimer inside the file.
     *
     * Revit is deliberately absent. IFC round-tripping is a body of work this
     * phase has not quoted, and the client himself disclaimed knowledge of the
     * format in the meeting; shipping a badly-shaped IFC would be worse than
     * shipping none.
     */
    if (format === 'dxf') {
      // No `sheet`: the whole building, every level at its elevation, in 3D.
      // With one: that sheet alone, flat, at true size — the file an architect
      // x-refs into his own drawing.
      const sheet = (request.query as { sheet?: string }).sheet;
      const drawing = runDrawing(drawable, sheet);
      reply.header('content-type', 'application/dxf');
      reply.header('content-disposition', `attachment; filename="${drawing.name}.dxf"`);
      return drawing.dxf;
    }

    // The massing as glTF binary, for any 3D viewer. Same gates, same model, and the
    // two sentences travel in the file's own metadata (`extras`).
    if (format === 'glb') {
      const glb = await runGlb(drawable);
      reply.header('content-type', 'model/gltf-binary');
      reply.header('content-disposition', `attachment; filename="${glb.name}.glb"`);
      return reply.send(glb.bytes);
    }

    if (format === 'xlsx') {
      const bytes = await writeWorkbook(
        runWorkbookSpec(payload as unknown as ExportableRun, new Date().toISOString()),
      );
      reply.header(
        'content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      reply.header(
        'content-disposition',
        `attachment; filename="envelope-${run.runId}.xlsx"`,
      );
      return reply.send(Buffer.from(bytes));
    }

    return {
      runId: run.runId,
      /**
       * Two fingerprints, and they answer different questions.
       *
       * `fingerprint` is the run's — a hash over its inputs and versions, which
       * is what makes "the same question was asked twice" checkable.
       * `reportFingerprint` is `@envelope/report`'s, over the rendered content,
       * which is what makes "the same answer came back" checkable. A run that
       * reproduces its inputs but not its output is exactly the failure §13.4
       * is written to catch, and one hash cannot report it.
       */
      fingerprint: run.fingerprint,
      reportFingerprint: runFingerprint(reviewed),
      engineVersion: run.engineVersion,
      annexVersion: run.annexVersion,
      annexNotice: unsignedAnnexNotice(),
      ruleSetHash: run.ruleSetHash,
      reviewer: g4,
      draftRules: run.draftRules,
      ...(run.draftRules ? { warning: SEED_RULES_WARNING } : {}),
      document: toJson(reviewed),
      payload,
    };
  });

  return app;
}

/**
 * Raised when a run fails a check that blocks emission.
 *
 * The whole checks block travels with it. A 422 that said only "blocked" would
 * make the user's next move a support ticket; carrying the per-check statements
 * means the screen can show which invariant failed, on what numbers, and by how
 * much.
 */
class EmissionBlockedError extends Error {
  override readonly name = 'EmissionBlockedError';
  readonly detail: { readonly checks: ReturnType<typeof presentChecks> };
  constructor(reasons: readonly string[], checks: RunChecks) {
    super(
      `this run may not be emitted: ${reasons.length} finding(s) block it. ` +
        `${reasons.join(' | ')} PRD §12.3 and §16.1 — a failed check blocks emission, ` +
        `never a warning and never a configurable severity.`,
    );
    this.detail = { checks: presentChecks(checks) };
  }
}

/**
 * A `Plot` on its way to and from the database.
 *
 * Written field by field, in both directions, rather than as a spread over the
 * parsed JSON. That is deliberate and it is the second attempt: the first
 * version spread `raw as Plot` and restored the three top-level `Decimal`s by
 * name, which missed `edges[].bearingDeg` — every plot read back from storage
 * then blew up on `.toFixed is not a function`, in a handler, at request time.
 *
 * Constructing the object explicitly means the type checker is the thing that
 * notices. Add a `Decimal` to `Plot` and this file stops compiling, which is
 * where a serialisation gap should surface — not in a 500 an hour later.
 */

/** JSON has no decimal type, so every `Decimal` crosses as its exact string. */
interface PlotWire {
  readonly plotId: string;
  readonly tenantId: string;
  readonly plotNumber: string;
  readonly community: string;
  readonly landUse: string;
  readonly ring: readonly { readonly x: number; readonly y: number }[];
  readonly edges: readonly {
    readonly seq: number;
    readonly start: { readonly x: number; readonly y: number };
    readonly end: { readonly x: number; readonly y: number };
    readonly classification: string;
    readonly roadHierarchy?: string;
    readonly lengthMm: number;
    readonly bearingDeg: string;
    /*
      THE CURVE AND ITS SPAN TRAVEL WITH THE ROW.

      A plot is stored as this blob and read back from it, and a field the
      serialiser drops is a field the engine never sees again. Left out, a
      curved plot came back with the right ring and every boundary spanning one
      vertex of it — which put each frontage's setback on the wrong piece of the
      curve and then failed the offset, three layers from the omission. A row
      written before curves existed has neither field, and `ringSpanOf` reads
      that as the straight plot it is.
    */
    readonly arc?: {
      readonly bulge: string;
      readonly radiusMm: number;
      readonly sweepDeg: string;
      readonly arcLengthMm: number;
    };
    readonly ringFrom?: number;
    readonly ringSpan?: number;
  }[];
  readonly shapeClass: string;
  readonly statedAreaM2: string | null;
  readonly computedAreaMm2: number;
  readonly areaMismatch: boolean;
  readonly principalAxisDeg: string;
  readonly mbrWidthMm: number;
  readonly mbrDepthMm: number;
  readonly convexityRatio: string;
  readonly frontageCount: number;
  /**
   * The plot's own affection plan, as this server read it.
   *
   * A sibling of the plot rather than a field on `Plot`, which is a core domain
   * type that travels into `geometry` and `capacity` — neither of which has any
   * business knowing an instrument exists. It lives in the blob the repository
   * already stores, so there is no migration and a row written before this
   * existed simply has no sheet, which is the correct reading of it.
   */
  readonly sheet?: StoredSheetWire;
}

/**
 * The submitted edges, in the order the STORED ring walks them.
 *
 * `orientRing` may have reversed the ring, which renumbers its edges; this puts
 * each classification back on the boundary it was given for. The schema has
 * already established that `seq` is a permutation of `0..n-1`, so every slot is
 * filled exactly once and the non-null assertion below is the schema's
 * guarantee rather than a hope.
 */
function inputEdgesByRingIndex<T extends { readonly seq: number }>(
  edges: readonly T[],
  order: readonly number[],
): readonly T[] {
  const placed = new Array<T | undefined>(edges.length);
  for (const edge of edges) placed[order[edge.seq]!] = edge;
  return placed.map((e) => e!);
}

function serialisePlot(plot: Plot, sheet: StoredSheet | undefined): string {
  const wire: PlotWire = {
    plotId: plot.plotId,
    tenantId: plot.tenantId,
    plotNumber: plot.plotNumber,
    community: plot.community,
    landUse: plot.landUse,
    ring: plot.ring.map((p) => ({ x: p.x as number, y: p.y as number })),
    edges: plot.edges.map((e) => ({
      seq: e.seq,
      start: { x: e.start.x as number, y: e.start.y as number },
      end: { x: e.end.x as number, y: e.end.y as number },
      classification: e.classification,
      ...(e.roadHierarchy ? { roadHierarchy: e.roadHierarchy } : {}),
      lengthMm: e.lengthMm as number,
      bearingDeg: e.bearingDeg.toString(),
      ...(e.arc
        ? {
            arc: {
              bulge: e.arc.bulge.toString(),
              radiusMm: e.arc.radiusMm as number,
              sweepDeg: e.arc.sweepDeg.toString(),
              arcLengthMm: e.arc.arcLengthMm as number,
            },
          }
        : {}),
      ...(e.ringFrom === undefined ? {} : { ringFrom: e.ringFrom }),
      ...(e.ringSpan === undefined ? {} : { ringSpan: e.ringSpan }),
    })),
    shapeClass: plot.shapeClass,
    statedAreaM2: plot.statedAreaM2?.toString() ?? null,
    computedAreaMm2: plot.computedAreaMm2 as number,
    areaMismatch: plot.areaMismatch,
    principalAxisDeg: plot.principalAxisDeg.toString(),
    mbrWidthMm: plot.mbrWidthMm as number,
    mbrDepthMm: plot.mbrDepthMm as number,
    convexityRatio: plot.convexityRatio.toString(),
    frontageCount: plot.frontageCount,
    ...(sheet ? { sheet: serialiseSheet(sheet) } : {}),
  };
  return JSON.stringify(wire);
}

/**
 * Read a plot back, or 404.
 *
 * The integer-millimetre brands are re-asserted on the way in. They are a
 * compile-time device — JSON carries plain numbers — and the values were
 * produced by the kernel on the 1 mm grid, so re-asserting is restoring a fact
 * rather than claiming one. `asMm`/`asMm2` do exactly that and nothing else.
 */
/**
 * THE ONE PLACE A RUN REQUEST BECOMES A `RunInput`.
 *
 * There were two, written out field by field in `/api/runs` and in the
 * parking-in-FAR comparison, and they had already drifted in the way two copies
 * of one mapping do: when the podium level count was added to the request, only
 * one of them would have learned it, and the comparison would have compared a
 * run the reader never asked for. The comparison now spreads this and overrides
 * the single field it exists to vary.
 *
 * `podiumLevels` is passed only when the request carries it. Absent, the engine
 * records the podium as ASSUMED with its own basis string — which is the honest
 * state when nobody entered it, and was, until this function, the ONLY state:
 * the affection plan's `G+2P+8` was read at intake and then dropped here.
 */
/**
 * The statement a run was answered with, checked against what it actually says.
 *
 * Two refusals, and the second is the one that matters. An id nobody holds is an
 * obvious client error. An id whose recorded answer is **not** the answer being
 * sent is an attribution attack in miniature: it would put the sender's own
 * treatment under a named practitioner's name, in a provenance tree built to be
 * trusted. Both are refused at the boundary rather than reconciled.
 */
function statementOn(body: RunRequest): RunInput['parkingInFarStatement'] {
  if (body.parkingInFarStatementId === undefined) return undefined;
  const stmt = statementById(body.parkingInFarStatementId);
  if (!stmt) {
    throw Object.assign(
      new Error(
        `no statement on file with id "${body.parkingInFarStatementId}". A run may cite a ` +
          'recorded statement or answer for itself, not both and not neither.',
      ),
      { statusCode: 400 },
    );
  }
  if (stmt.value !== body.parkingInFar) {
    throw Object.assign(
      new Error(
        `statement "${stmt.statementId}" records "${stmt.value}", and this run sends ` +
          `"${body.parkingInFar}". A run may not put its own answer under somebody ` +
          'else’s name. Send the answer the statement records, or send no statement.',
      ),
      { statusCode: 400 },
    );
  }
  return {
    statementId: stmt.statementId,
    statedBy: stmt.statedBy.name,
    statedOn: stmt.statedOn,
    verbatim: stmt.verbatim,
  };
}

function runInputFrom(
  body: RunRequest,
  plot: Plot,
  rules: RunInput['rules'],
  actor: Actor,
): RunInput {
  /*
    THE ATTRIBUTION IS RESOLVED HERE, at the composition root, never in the
    engine. `@envelope/capacity` takes the quotation as data; giving it a lookup
    would make the engine's answer depend on a table it does not own.
  */
  const statement = statementOn(body);
  return {
    plot,
    rules,
    actor: { id: actor.id, name: actor.name },
    parkingInFar: body.parkingInFar,
    ...(statement ? { parkingInFarStatement: statement } : {}),
    unitMix: {
      source: body.unitMix.source,
      entries: body.unitMix.entries.map(
        (e): UnitTypeMix => ({
          typeId: e.typeId,
          label: e.label,
          share: new Decimal(e.share),
          nsaM2: new Decimal(e.nsaM2),
        }),
      ),
      ...(body.unitMix.basis !== undefined ? { basis: body.unitMix.basis } : {}),
    },
    parkingLevelsAvailable: body.parkingLevelsAvailable,
    /*
      The core. Absent is a real state — the engine assumes 18% of the tower
      plate and declares it — so this is spread rather than defaulted here.
    */
    ...(body.coreAreaM2 === undefined ? {} : { coreAreaM2: new Decimal(body.coreAreaM2) }),
    parkingUsableFraction: {
      value: new Decimal(body.parkingUsableFraction.value),
      source: body.parkingUsableFraction.source,
      ...(body.parkingUsableFraction.basis !== undefined
        ? { basis: body.parkingUsableFraction.basis }
        : {}),
    },
    /*
      EXACTLY ONE ARM, and the schema has already refused a body carrying both or
      neither. The ternary is on the AREA rather than on the ratio because an
      absent ratio is the newer case and reads more clearly as the exception.
    */
    saleableEfficiency:
      body.saleableEfficiency.saleableAreaM2 !== undefined
        ? {
            saleableAreaM2: new Decimal(body.saleableEfficiency.saleableAreaM2),
            source: body.saleableEfficiency.source,
            ...(body.saleableEfficiency.basis ? { basis: body.saleableEfficiency.basis } : {}),
            actor,
          }
        : {
            value: new Decimal(body.saleableEfficiency.value!),
            source: body.saleableEfficiency.source,
            ...(body.saleableEfficiency.basis ? { basis: body.saleableEfficiency.basis } : {}),
            actor,
          },
    realismDiscount: new Decimal(body.realismDiscount),
    ...(body.podiumLevels !== undefined ? { podiumLevels: body.podiumLevels } : {}),
    /*
      STATED BEATS DERIVED. A schedule says the same two numbers with the rest of
      the building attached, so the engine takes it and computes both from it —
      and, because it now knows where the parking sits, stops calling the
      placement an assumption.
    */
    ...(body.levels ? { levelSchedule: body.levels } : {}),
  };
}

/**
 * The plot's stored affection plan, if it has one.
 *
 * Separate from `loadPlot` because `Plot` does not carry it and must not: the
 * engine resolves rules and knows nothing about instruments. This reads the same
 * blob and takes the sibling field.
 */
/**
 * What the plot's sheet did to this run, for the screen and the reader.
 *
 * Three states and all three are said out loud: no sheet attached, a sheet that
 * was refused and why, or a sheet that bound — with every limit it bound AND
 * every limit it did not. The last half is the one that matters: a response
 * listing four rules from a sheet that states six would understate the
 * instrument while looking complete.
 */
function sheetReport(
  bound: ReturnType<typeof bindSheet> | undefined,
): {
  readonly attached: boolean;
  readonly documentUri: string | null;
  readonly issuedOn: string | null;
  readonly refused: string | null;
  readonly bound: readonly { readonly parameterId: string; readonly value: string; readonly unit: string; readonly clause: string }[];
  readonly notBound: readonly { readonly field: string; readonly stated: string; readonly reason: string }[];
} {
  if (!bound) {
    return {
      attached: false,
      documentUri: null,
      issuedOn: null,
      refused: null,
      bound: [],
      notBound: [],
    };
  }
  if (isRefusal(bound)) {
    return {
      attached: true,
      documentUri: bound.documentUri,
      issuedOn: null,
      refused: bound.reason,
      bound: [],
      notBound: [],
    };
  }
  return {
    attached: true,
    documentUri: bound.documentUri,
    issuedOn: bound.issuedOn,
    refused: null,
    bound: bound.rules.map((r) => ({
      parameterId: r.parameterId,
      value: String(r.evaluatorArgs['value']),
      unit: r.unit,
      clause: r.citation.sourceTextVerbatim,
    })),
    notBound: bound.notBound,
  };
}

async function loadSheet(repo: RunRepository, plotId: string): Promise<StoredSheet | undefined> {
  const stored = await repo.getPlot(plotId);
  if (!stored) return undefined;
  const w = JSON.parse(stored.plot) as PlotWire;
  return w.sheet ? deserialiseSheet(w.sheet) : undefined;
}

async function loadPlot(repo: RunRepository, plotId: string): Promise<Plot> {
  const stored = await repo.getPlot(plotId);
  if (!stored) throw Object.assign(new Error('plot not found'), { statusCode: 404 });
  const w = JSON.parse(stored.plot) as PlotWire;
  return {
    plotId: w.plotId,
    tenantId: w.tenantId,
    plotNumber: w.plotNumber,
    community: w.community,
    landUse: w.landUse as Plot['landUse'],
    ring: w.ring.map((p) => ({ x: asMm(p.x), y: asMm(p.y) })),
    edges: w.edges.map((e) => ({
      seq: e.seq,
      start: { x: asMm(e.start.x), y: asMm(e.start.y) },
      end: { x: asMm(e.end.x), y: asMm(e.end.y) },
      classification: e.classification as Plot['edges'][number]['classification'],
      ...(e.roadHierarchy
        ? { roadHierarchy: e.roadHierarchy as NonNullable<Plot['edges'][number]['roadHierarchy']> }
        : {}),
      lengthMm: asMm(e.lengthMm),
      bearingDeg: new Decimal(e.bearingDeg),
      ...(e.arc
        ? {
            arc: {
              bulge: new Decimal(e.arc.bulge),
              radiusMm: asMm(e.arc.radiusMm),
              sweepDeg: new Decimal(e.arc.sweepDeg),
              arcLengthMm: asMm(e.arc.arcLengthMm),
            },
          }
        : {}),
      ...(e.ringFrom === undefined ? {} : { ringFrom: e.ringFrom }),
      ...(e.ringSpan === undefined ? {} : { ringSpan: e.ringSpan }),
    })),
    shapeClass: w.shapeClass as Plot['shapeClass'],
    statedAreaM2: w.statedAreaM2 === null ? undefined : new Decimal(w.statedAreaM2),
    computedAreaMm2: asMm2(w.computedAreaMm2),
    areaMismatch: w.areaMismatch,
    principalAxisDeg: new Decimal(w.principalAxisDeg),
    mbrWidthMm: asMm(w.mbrWidthMm),
    mbrDepthMm: asMm(w.mbrDepthMm),
    convexityRatio: new Decimal(w.convexityRatio),
    frontageCount: w.frontageCount,
  };
}

/**
 * One row of a run list.
 *
 * Read off the stored payload, never recomputed — see the note on
 * `GET /api/runs`. `invariants.ran` is carried rather than `passed` because a
 * list that showed a green tick per run would be reporting "nothing failed" as
 * "everything was checked", which is the one conflation this product exists to
 * refuse.
 */
function summariseRun(run: StoredRun) {
  const payload = JSON.parse(run.output) as {
    plot: { plotNumber: string; community: string; areaM2: string };
    capacity: {
      governingBand: string;
      governingGfa: { value: string };
      levels: { value: string };
      governingConstraint: { ruleId: string; label: string };
    };
    checks?: {
      invariants: { ran: number; total: number; passed: boolean; dormant: string[] };
      validation: { summary: { hardViolated: number; deferredDeclared: number; lifeSafetyDeferred: number } };
    };
    assumptions: { parameterId: string }[];
  };
  const gates = JSON.parse(run.gates) as GateRecord;
  const reviewer = gates[Gate.G4_REVIEWER_NAMED] ?? null;

  return {
    runId: run.runId,
    createdAt: run.createdAt,
    createdBy: run.createdByActorName,
    plotId: run.plotId,
    plotNumber: payload.plot.plotNumber,
    community: payload.plot.community,
    plotAreaM2: payload.plot.areaM2,
    draftRules: run.draftRules,
    governingBand: payload.capacity.governingBand,
    governingGfaM2: payload.capacity.governingGfa.value,
    levels: payload.capacity.levels.value,
    bindingRuleId: payload.capacity.governingConstraint.ruleId,
    bindingLabel: payload.capacity.governingConstraint.label,
    assumptionCount: payload.assumptions.length,
    invariants: {
      ran: payload.checks?.invariants.ran ?? null,
      total: payload.checks?.invariants.total ?? 18,
      dormant: payload.checks?.invariants.dormant.length ?? null,
      passed: payload.checks?.invariants.passed ?? null,
    },
    lifeSafetyDeferred: payload.checks?.validation.summary.lifeSafetyDeferred ?? null,
    /*
      THE EXPORT GATES, OUT OF THE EXPORT GATES — NOT OUT OF FOUR.

      G1 and G2 are given before a run exists: they gate its computation, so they
      are never stored against it. A stored run can only ever hold G3 and G4, and
      this used to be read as "n of 4": every list said "2 of 4" for a run that was
      fully signed, and the readiness page counted runs with four gates as exported,
      which no run can have — so that figure could never leave zero.
    */
    gatesSatisfied: EXPORT_GATES.filter((g) => gates[g] !== undefined).length,
    reviewer: reviewer ? { name: reviewer.actorName, at: reviewer.at } : null,
  };
}

interface WireGraph {
  nodes: { id: string; [k: string]: unknown }[];
  edges: { from: string; to: string; kind: string; attrs?: unknown }[];
}

/** Walk the persisted graph into the tree the click-through UI renders. */
function buildTree(graph: unknown, rootId: string, seen = new Set<string>()): unknown {
  const g = graph as WireGraph;
  const node = g.nodes.find((n) => n.id === rootId);
  if (!node || seen.has(rootId)) return node ? { node, edges: [] } : undefined;
  const next = new Set(seen).add(rootId);
  return {
    node,
    edges: g.edges
      .filter((e) => e.from === rootId)
      .map((e) => ({ kind: e.kind, attrs: e.attrs ?? null, child: buildTree(g, e.to, next) })),
  };
}

