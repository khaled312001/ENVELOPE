/**
 * API contract tests.
 *
 * Weighted toward what the API must *refuse*. A capacity engine that answers
 * when it should have stopped is worse than one that does not answer, because
 * the number reaches a spreadsheet and the refusal would have reached a person.
 */

import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { emissionBlockers } from '../src/checks.js';
import { subjectHash } from '../src/gates.js';
import { build } from '../src/server.js';
import { SqliteRunRepository } from '../src/store.js';

const ACTOR = { 'x-actor-id': 'u1', 'x-actor-name': 'Test Architect' };
const REVIEWER = { ...ACTOR, 'x-actor-licence': 'DM-12345' };

const SQUARE_80x40 = {
  plotNumber: '345-1234',
  community: 'TEST',
  landUse: 'RESIDENTIAL_MULTI' as const,
  vertices: [
    { x: '0', y: '0' },
    { x: '80', y: '0' },
    { x: '80', y: '40' },
    { x: '0', y: '40' },
  ],
  edges: [
    { seq: 0, classification: 'ROAD' as const, roadHierarchy: 'LOCAL' as const },
    { seq: 1, classification: 'ADJACENT_PLOT' as const },
    { seq: 2, classification: 'ROAD' as const, roadHierarchy: 'LOCAL' as const },
    { seq: 3, classification: 'ADJACENT_PLOT' as const },
  ],
};

const RUN_BODY = {
  parkingInFar: 'EXCLUDED_FROM_FAR' as const,
  unitMix: {
    source: 'USER_SET' as const,
    entries: [
      { typeId: '1BED', label: '1 bedroom', share: '0.5', nsaM2: '70' },
      { typeId: '2BED', label: '2 bedroom', share: '0.375', nsaM2: '110' },
      { typeId: '3BED', label: '3 bedroom', share: '0.125', nsaM2: '160' },
    ],
  },
  parkingLevelsAvailable: 2,
  parkingUsableFraction: {
    value: '0.85',
    source: 'ASSUMED' as const,
    basis: 'the usable fraction of a parking level after cores, ramps and plant',
  },
  // Required, with no default. The engine used to take 1.00 implicitly here and
  // report more units than any building holds; 0.93 is the conservative end of
  // the range the project brief on file states. The range itself and the name of
  // the developer who set it are that developer's confidential commercial
  // expectation, so neither is written into a basis string: this fixture is the
  // input to the published worked example, and a basis string travels with it.
  saleableEfficiency: {
    value: '0.93',
    source: 'USER_SET' as const,
    basis: 'the conservative end of the saleable-to-GFA range in the project brief on file',
  },
  realismDiscount: '1.00',
  useDraftRules: true,
};

let app: FastifyInstance;
let repo: SqliteRunRepository;

// The suite exercises refusals, so the server logs a wall of 4xx that is not a
// signal. Silence it here rather than in `build()`, which would silence it in
// production too.
process.env['LOG_LEVEL'] = 'silent';

beforeAll(async () => {
  repo = new SqliteRunRepository();
  app = await build(repo);
  await app.ready();
});

afterAll(async () => {
  await app.close();
  repo.close();
});

async function createPlot() {
  const res = await app.inject({
    method: 'POST',
    url: '/api/plots',
    headers: ACTOR,
    payload: SQUARE_80x40,
  });
  expect(res.statusCode).toBe(201);
  return res.json() as { plotId: string; gateSubjectHash: string; computedAreaM2: string };
}

describe('identity — every value is attributed to a person', () => {
  it('refuses an unattributed request rather than defaulting to a system user', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/plots', payload: SQUARE_80x40 });
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toMatch(/named person/);
  });
});

describe('the annex gates everything', () => {
  it('reports that the annex is unsigned — FR-DEF-001 AC4', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/definitions' });
    const body = res.json();
    expect(body.signed).toBe(false);
    expect(body.pendingApproval.length).toBeGreaterThan(0);
    expect(body.definitions.length).toBeGreaterThanOrEqual(10);
  });
});

describe('the rule base is honest about being unapproved', () => {
  it('returns no approved rules and says why', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/rules' });
    const body = res.json();
    expect(body.approved).toEqual([]);
    expect(body.pending.length).toBeGreaterThan(0);
    expect(body.warning).toMatch(/licensed architect must author/);
  });
});

describe('plot intake — FR-PLT-001', () => {
  it('accepts a rectilinear plot and derives its geometry exactly', async () => {
    const plot = await createPlot();
    expect(plot.computedAreaM2).toBe('3200.00');
  });

  it('refuses an edge with no classification — AC3 forbids a default', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/plots',
      headers: ACTOR,
      payload: {
        ...SQUARE_80x40,
        edges: [{ seq: 0 }, ...SQUARE_80x40.edges.slice(1)],
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/edges\.0\.classification/);
  });

  it('refuses a ROAD edge with no hierarchy — the setback table is keyed on it', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/plots',
      headers: ACTOR,
      payload: {
        ...SQUARE_80x40,
        edges: [{ seq: 0, classification: 'ROAD' }, ...SQUARE_80x40.edges.slice(1)],
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('flags a >2% mismatch between stated and computed area — AC2', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/plots',
      headers: ACTOR,
      payload: { ...SQUARE_80x40, statedAreaM2: '3500' },
    });
    const body = res.json();
    expect(body.areaMismatch).toBe(true);
    expect(body.areaMismatchMessage).toMatch(/not automatically right/);
  });

  it('refuses a self-intersecting plot by naming the Phase 0 restriction — §14.1', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/plots',
      headers: ACTOR,
      payload: {
        ...SQUARE_80x40,
        vertices: [
          { x: '0', y: '0' },
          { x: '40', y: '40' },
          { x: '40', y: '0' },
          { x: '0', y: '40' },
        ],
      },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().message).toMatch(/not approximated — it is refused/);
  });
});

describe('runs', () => {
  it('computes three bands and names the governing one', async () => {
    const plot = await createPlot();
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: plot.plotId },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();

    expect(body.capacity.bandA.value).toBeTruthy();
    expect(body.capacity.bandB.value).toBeTruthy();
    expect(body.capacity.bandC.value).toBeTruthy();
    expect(['REGULATORY', 'GEOMETRIC', 'PARKING']).toContain(body.capacity.governingBand);
    expect(body.capacity.explanation).toMatch(/limits this plot/);

    // P0-S5: full computation under 10 s.
    expect(body.withinRuntimeBudget).toBe(true);

    // Every wire value carries its class and its render hint, so the frontend
    // cannot drift from the engine on how an assumption looks.
    expect(body.capacity.governingGfa.provenanceClass).toBeTruthy();
    expect(body.capacity.governingGfa.renderHint).toBeTruthy();

    // §11.7 step 6 — the report states how many iterations were required.
    expect(body.envelope.fixpoint.converged).toBe(true);
    expect(body.envelope.fixpoint.iterations).toBeGreaterThanOrEqual(1);

    // Built on draft rules, so it must say so.
    expect(body.draftRules).toBe(true);
    expect(body.warning).toMatch(/not a capacity assessment/);
  });

  it('carries the podium count to the engine instead of assuming it', async () => {
    // The affection plan's G+2P+8 was read at intake and then dropped at the
    // composition root, so every massing showed one podium level, in amber,
    // whatever the sheet said. Sent, it is the reader's value; omitted, it is
    // still an assumption with a basis — and both halves are asserted, because a
    // fix that made the field required would have traded a dropped input for a
    // hidden default.
    const plot = await createPlot();
    const podium = (body: { massing: { masses: { id: string; levels: { value: string; provenanceClass: string } }[] } }) =>
      body.massing.masses.find((m) => m.id === 'podium')!.levels;

    const sent = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: plot.plotId, podiumLevels: 2 },
    });
    expect(sent.statusCode).toBe(201);
    expect(podium(sent.json())).toMatchObject({ value: '2', provenanceClass: 'USER_SET' });

    const omitted = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: plot.plotId },
    });
    expect(podium(omitted.json())).toMatchObject({ value: '1', provenanceClass: 'ASSUMED' });
  });

  it('sends the building model every drawing reads, and it reaches the graph it came with', async () => {
    // The sheets, the massing and the DXF are drawn from this and nothing else. A
    // run response without it would leave the web to reassemble a building from
    // area figures, which is the defect the model exists to end.
    const plot = await createPlot();
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: plot.plotId, podiumLevels: 2 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.building.schema).toBe('envelope.building/1');
    expect(body.building.levels.length).toBeGreaterThan(0);
    expect(body.building.sections.length).toBeGreaterThan(0);

    const nodes = new Set((body.provenance.nodes as { id: string }[]).map((n) => n.id));
    expect(nodes.has(body.building.drawnBays.node)).toBe(true);
    for (const level of body.building.levels as { outlineSource: { node: string } }[]) {
      expect(nodes.has(level.outlineSource.node)).toBe(true);
    }
  });

  it('blocks while parking-in-FAR is open — FR-DEF-002', async () => {
    const plot = await createPlot();
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: plot.plotId, parkingInFar: 'OPEN_REGULATORY_QUESTION' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().message).toMatch(/15–35%/);
    expect(res.json().gate).toBe('G2:parking-in-FAR');
  });

  it('refuses an ASSUMED unit mix with no basis at the schema boundary', async () => {
    const plot = await createPlot();
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: {
        ...RUN_BODY,
        plotId: plot.plotId,
        unitMix: { ...RUN_BODY.unitMix, source: 'ASSUMED' },
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('serves the derivation of any single value — §20.2 click-through', async () => {
    const plot = await createPlot();
    const run = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();

    const nodeId = run.capacity.governingGfa.node;
    const res = await app.inject({
      method: 'GET',
      url: `/api/runs/${run.runId}/provenance/${nodeId}`,
      headers: ACTOR,
    });
    expect(res.statusCode).toBe(200);
    const tree = res.json();
    expect(tree.node.id).toBe(nodeId);
    expect(tree.edges.length).toBeGreaterThan(0);
    // The derivation must reach a rule, not stop at an opaque computation.
    const flatten = (t: { node: { kind: string }; edges: { child: unknown }[] }): string[] => [
      t.node.kind,
      ...t.edges.flatMap((e) => flatten(e.child as never)),
    ];
    expect(flatten(tree)).toContain('RULE');
  });

  it('is reproducible — the same run twice has the same fingerprint', async () => {
    const plot = await createPlot();
    const payload = { ...RUN_BODY, plotId: plot.plotId };
    const a = (await app.inject({ method: 'POST', url: '/api/runs', headers: ACTOR, payload })).json();
    const b = (await app.inject({ method: 'POST', url: '/api/runs', headers: ACTOR, payload })).json();
    expect(a.capacity.governingGfa.value).toBe(b.capacity.governingGfa.value);
    expect(JSON.stringify(a.provenance)).toBe(JSON.stringify(b.provenance));
  });
});

describe('gates — §21.1, enforced server-side', () => {
  it('refuses export before G3 and G4', async () => {
    const plot = await createPlot();
    const run = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export`,
      headers: ACTOR,
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toMatch(/non-skippable/);
  });

  it('refuses G4 from an actor with no asserted licence', async () => {
    const plot = await createPlot();
    const run = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/gates`,
      headers: ACTOR,
      payload: { gate: 'G4_REVIEWER_NAMED', subjectHash: 'whatever' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().message).toMatch(/asserts a professional licence/);
  });

  it('refuses an acknowledgement given against different content', async () => {
    const plot = await createPlot();
    const run = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();

    // Acknowledge with a hash that does not match the run's assumptions.
    await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/gates`,
      headers: ACTOR,
      payload: { gate: 'G3_ASSUMPTIONS_ACKNOWLEDGED', subjectHash: 'stale-hash' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/gates`,
      headers: REVIEWER,
      payload: { gate: 'G4_REVIEWER_NAMED', subjectHash: 'stale-hash' },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export`,
      headers: REVIEWER,
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('GateStaleError');
  });
});

describe('parking-in-FAR comparison — FR-DEF-002 AC4', () => {
  it('returns both treatments and a verdict', async () => {
    const plot = await createPlot();
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs/parking-in-far-comparison',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: plot.plotId },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Number(body.regulatorySpreadM2)).toBeGreaterThan(0);
    expect(body.verdict.length).toBeGreaterThan(40);
  });
});

describe('the two independent layers reach every payload — §3.4', () => {
  it('carries the invariant results, the deferred list and the five claims', async () => {
    const plot = await createPlot();
    const run = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();

    const { invariants, validation } = run.checks;

    expect(invariants.results).toHaveLength(18);
    expect(invariants.passed).toBe(true);
    // Dormant is not pass. If these two ever become equal, either Phase 0 has
    // started generating a unit schedule or someone has fed the checker a
    // synthesised one, and the difference matters (see `checks.ts`).
    expect(invariants.ran).toBeLessThan(invariants.total);
    expect(invariants.dormant.length).toBeGreaterThan(0);

    expect(validation.summary.hardViolated).toBe(0);
    expect(validation.summary.deferredDeclared).toBeGreaterThan(0);
    expect(validation.emissionBlocked).toEqual([]);
    expect(validation.claims.regulatoryValidity.status).toBe('NEVER_CLAIMED');
  });

  it('counts only the checks that ran when it states self-consistency', async () => {
    const plot = await createPlot();
    const run = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();

    const { invariants, validation } = run.checks;
    // "18 invariant(s) run" on a run where eight had nothing to check is the
    // §24.1 checkbox this codebase exists to refuse. The claim must quote the
    // number that ran.
    expect(validation.claims.selfConsistency.detail).toContain(
      `${invariants.ran} invariant(s) run`,
    );
    expect(validation.claims.selfConsistency.detail).not.toContain('18 invariant(s) run');
  });

  it('never lets a validator claim regulatory validity', async () => {
    const plot = await createPlot();
    const run = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();
    const claims = run.checks.validation.claims;
    expect(claims.regulatoryValidity.detail).toMatch(/never claimed/i);
    expect(claims.professionalAgreement.status).toBe('NOT_ASSESSED');
    // Self-consistency may be SUPPORTED. It may never be described as compliance.
    expect(run.checks.validation.selfConsistencyNotice).toMatch(/not compliance/i);
  });
});

/**
 * CORS, and the port that cost an hour.
 *
 * The allowlist used to be pinned to `:5173`. Vite takes the next free port
 * when that one is busy, so a second dev server moved the app to `:5174` and
 * every request came back **500** with a stack trace in the log and nothing
 * legible in the browser. A misconfigured origin is a request to refuse, never
 * a server fault, and on a developer's own loopback it is not even that.
 */
describe('cross-origin requests', () => {
  it('accepts a loopback origin on any port when none is configured', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { ...ACTOR, origin: 'http://localhost:5174' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5174');
  });

});

describe('export — the §3.4 artifact', () => {
  const openGates = async (runId: string, payload: Record<string, unknown>) => {
    const hashes = {
      G1_PLOT_CONFIRMED: subjectHash(payload['plot']),
      G2_RULES_ACKNOWLEDGED: subjectHash(payload['rules']),
      G3_ASSUMPTIONS_ACKNOWLEDGED: subjectHash(payload['assumptions']),
      G4_REVIEWER_NAMED: subjectHash(payload['capacity']),
    };
    for (const [gate, hash] of Object.entries(hashes)) {
      await app.inject({
        method: 'POST',
        url: `/api/runs/${runId}/gates`,
        headers: gate === 'G4_REVIEWER_NAMED' ? REVIEWER : ACTOR,
        payload: { gate, subjectHash: hash },
      });
    }
  };

  it('counts a run signed at both export gates as cleared, as the engine signs it', async () => {
    // The engine gives G1 and G2 before the run exists and never stores them, so a
    // run it signs holds G3 and G4 only. Counted out of four, that run read "2 of 4"
    // on every list and the readiness page's cleared-for-export figure stayed at zero.
    const plot = await createPlot();
    const run = (
      await app.inject({ method: 'POST', url: '/api/runs', headers: ACTOR, payload: { ...RUN_BODY, plotId: plot.plotId } })
    ).json();
    const before = (await app.inject({ method: 'GET', url: '/api/dashboard', headers: ACTOR })).json();
    for (const [gate, subject, who] of [
      ['G3_ASSUMPTIONS_ACKNOWLEDGED', 'assumptions', ACTOR],
      ['G4_REVIEWER_NAMED', 'capacity', REVIEWER],
    ] as const) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/runs/${run.runId}/gates`,
        headers: who,
        payload: { gate, subjectHash: subjectHash(run[subject]) },
      });
      expect(res.statusCode, gate).toBe(200);
    }
    const after = (await app.inject({ method: 'GET', url: '/api/dashboard', headers: ACTOR })).json();
    expect(after.volume.exported).toBe(before.volume.exported + 1);
    const row = (after.recentRuns as { runId: string; gatesSatisfied: number }[]).find((r) => r.runId === run.runId);
    expect(row?.gatesSatisfied).toBe(2);
  });

  it('returns a complete document once every gate is satisfied', async () => {
    const plot = await createPlot();
    const run = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();
    await openGates(run.runId, run);

    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export`,
      headers: REVIEWER,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // The draft-rules banner sorts first in the canonical serialisation on
    // purpose: a consumer that reads nothing else still sees it.
    expect(Object.keys(body.document)[0]).toBe('SEED_RULES_WARNING');

    const doc = body.document.run;
    expect(doc.claim.regulatoryValidity.status).toBe('NEVER_CLAIMED');
    expect(doc.reviewer.name).toBe('Test Architect');
    expect(doc.invariants).toHaveLength(18);
    // Dormant maps to NOT_ASSESSED, never to PASS and never to omission.
    expect(doc.invariants.filter((i: { status: string }) => i.status === 'NOT_ASSESSED').length)
      .toBeGreaterThan(0);
    expect(doc.deferredChecks.length).toBeGreaterThan(0);
    expect(doc.rules.excluded.length).toBeGreaterThan(0);
    expect(doc.assumptions.every((a: { basis: string }) => a.basis.length > 20)).toBe(true);
    expect(body.annexNotice).toMatch(/NOT SIGNED/);
  });

  it('renders HTML that carries the claim statement and the draft warning', async () => {
    const plot = await createPlot();
    const run = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();
    await openGates(run.runId, run);

    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export?format=html`,
      headers: REVIEWER,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    const html = res.body;
    expect(html).toMatch(/REGULATORY VALIDITY/i);
    expect(html).toMatch(/DRAFT rules with placeholder citations/);
    expect(html).toMatch(/NOT SIGNED/);
    expect(html).toMatch(/@media\s+print/);
  });

  it('produces the same bytes twice — §13.4', async () => {
    const plot = await createPlot();
    const run = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: ACTOR,
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();
    await openGates(run.runId, run);

    const once = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export`,
      headers: REVIEWER,
    });
    const twice = await app.inject({
      method: 'POST',
      url: `/api/runs/${run.runId}/export`,
      headers: REVIEWER,
    });
    // `producedAt` is deliberately outside the fingerprint: two renders of one
    // run are one run.
    expect(once.json().reportFingerprint.digest).toBe(twice.json().reportFingerprint.digest);
    expect(once.json().fingerprint).toBe(twice.json().fingerprint);
  });
});

describe('a failed check blocks emission — §12.3, §16.1', () => {
  /**
   * The wiring, tested directly.
   *
   * The engine cannot currently be driven into an invariant failure through the
   * HTTP surface, which is the point of the engine — so the composition is
   * tested where it lives. What must hold is that a FAIL from either layer
   * reaches the caller as a blocker carrying its numbers, and that the two
   * layers' lists are unioned rather than one shadowing the other.
   */
  it('turns an invariant FAIL into a blocker that states the measurement', () => {
    const blockers = emissionBlockers({
      invariants: {
        passed: false,
        dormant: [],
        results: [
          {
            id: 'INV-13',
            statement: 'Parking bays ≥ computed demand',
            status: 'FAIL',
            tolerance: 'exact',
            observed: '101',
            expected: '≥ 281',
            detail: '101 provided against 281 required; headroom -180 bay(s).',
          },
        ],
      },
      validation: {
        emissionBlocked: [
          '1 invariant(s) failed (INV-13).',
          'coverage.max@R-X: UNIT_MISMATCH.',
        ],
      },
    } as never);

    expect(blockers).toHaveLength(2);
    expect(blockers[0]).toContain('INV-13 FAILED');
    expect(blockers[0]).toContain('101');
    expect(blockers[0]).toContain('≥ 281');
    // The validator's own summary line is dropped in favour of the per-check
    // statement above; the encoding defect it also found is kept.
    expect(blockers.some((b) => b.includes('UNIT_MISMATCH'))).toBe(true);
    expect(blockers.some((b) => b.startsWith('1 invariant(s) failed'))).toBe(false);
  });
});

describe('security', () => {
  it('escapes every user-controlled string in the exported HTML', async () => {
    const XSS = '<script>alert(1)</script>';
    const plot = (
      await app.inject({
        method: 'POST',
        url: '/api/plots',
        headers: ACTOR,
        payload: { ...SQUARE_80x40, plotNumber: XSS, community: '"><svg onload=alert(2)>' },
      })
    ).json();

    const run = (
      await app.inject({
        method: 'POST',
        url: '/api/runs',
        headers: { ...ACTOR, 'x-actor-name': XSS },
        payload: { ...RUN_BODY, plotId: plot.plotId },
      })
    ).json();

    for (const [gate, key] of [
      ['G1_PLOT_CONFIRMED', 'plot'],
      ['G2_RULES_ACKNOWLEDGED', 'rules'],
      ['G3_ASSUMPTIONS_ACKNOWLEDGED', 'assumptions'],
      ['G4_REVIEWER_NAMED', 'capacity'],
    ] as const) {
      await app.inject({
        method: 'POST',
        url: `/api/runs/${run.runId}/gates`,
        headers: gate === 'G4_REVIEWER_NAMED' ? REVIEWER : ACTOR,
        payload: { gate, subjectHash: subjectHash(run[key]) },
      });
    }

    const html = (
      await app.inject({
        method: 'POST',
        url: `/api/runs/${run.runId}/export?format=html`,
        headers: REVIEWER,
      })
    ).body;

    // The payload must reach the document — otherwise this test proves nothing —
    // and every occurrence of it must be inert.
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<svg onload');
    // No script element and no inline handler anywhere in the report.
    expect(html).not.toMatch(/<script[\s>]/);
    expect(html).not.toMatch(/\son\w+\s*=\s*["']/);
  });

  it('rejects a cross-origin request from an origin that is not allowlisted', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: 'https://not-your-app.example' },
    });
    /*
      The property that protects the user is the **absence of the allow
      header** — `origin: true` would have returned it with the attacker's
      origin reflected back, and the browser would then have handed over the
      response. Without it the browser blocks the read.

      This used to assert a 500 as well, and that was the wrong half of the
      behaviour to pin down. A misconfigured origin is a request to refuse, not
      a server fault, and the 500 made an ordinary mistake unreadable: when Vite
      fell back from port 5173 to 5174, every call came back "Internal Server
      Error" with a stack trace in the log and nothing legible in the browser.
    */
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.statusCode).toBeLessThan(500);
  });

  it('allows the dev origin and a caller with no Origin at all', async () => {
    for (const headers of [{ origin: 'http://localhost:5173' }, {}]) {
      const res = await app.inject({ method: 'GET', url: '/api/health', headers });
      expect(res.statusCode).toBe(200);
    }
  });
});

describe('plots survive a restart — the dashboard reads real history', () => {
  it('reads a plot back with every Decimal intact', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/plots',
        headers: ACTOR,
        payload: { ...SQUARE_80x40, statedAreaM2: '3200' },
      })
    ).json();

    // Straight back out of storage, through the JSON round trip.
    const res = await app.inject({
      method: 'GET',
      url: `/api/plots/${created.plotId}`,
      headers: ACTOR,
    });
    expect(res.statusCode).toBe(200);
    const view = res.json();

    // `bearingDeg` is a Decimal per edge, and it is the one an earlier version
    // of the serialiser lost — every read then threw `.toFixed is not a
    // function` inside the handler.
    expect(view.edges).toHaveLength(4);
    for (const e of view.edges) {
      expect(typeof e.bearingDeg).toBe('string');
      expect(Number.isNaN(Number(e.bearingDeg))).toBe(false);
      expect(typeof e.lengthM).toBe('string');
    }
    expect(view.computedAreaM2).toBe('3200.00');

    // And a run against the reloaded plot must still compute.
    const run = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: created.plotId },
    });
    expect(run.statusCode).toBe(201);
  });

  it('lists plots and runs, newest first', async () => {
    const plot = await createPlot();
    await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: plot.plotId },
    });

    const plots = (await app.inject({ method: 'GET', url: '/api/plots', headers: ACTOR })).json();
    expect(plots.total).toBeGreaterThan(0);
    expect(plots.plots[0].plotId).toBe(plot.plotId);
    expect(plots.plots[0].runCount).toBeGreaterThan(0);

    const runs = (await app.inject({ method: 'GET', url: '/api/runs', headers: ACTOR })).json();
    expect(runs.total).toBeGreaterThan(0);
    const row = runs.runs[0];
    expect(row.governingBand).toMatch(/REGULATORY|GEOMETRIC|PARKING/);
    // The list carries how many checks *ran*, not a green tick. A tick would be
    // reporting "nothing failed" as "everything was checked".
    expect(row.invariants.ran).toBeLessThan(row.invariants.total);
    expect(row.draftRules).toBe(true);
  });

  it('needs a named actor for every list', async () => {
    for (const url of ['/api/plots', '/api/runs', '/api/dashboard']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, url).toBe(401);
    }
  });
});

describe('the dashboard leads with what is not ready', () => {
  it('reports zero approved rules and an unsigned annex, unqualified', async () => {
    const plot = await createPlot();
    await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: plot.plotId },
    });

    const d = (await app.inject({ method: 'GET', url: '/api/dashboard', headers: ACTOR })).json();

    // These three are the point of the screen. If any of them ever silently
    // becomes a percentage or a score, the dashboard has started measuring
    // activity instead of readiness.
    expect(d.readiness.rulesApproved).toBe(0);
    expect(d.readiness.rulesTotal).toBeGreaterThan(0);
    expect(d.readiness.annexSigned).toBe(false);
    expect(d.readiness.definitionsSigned).toBeLessThan(d.readiness.definitionsTotal);
    expect(d.readiness.invariantsRan).toBeLessThan(d.readiness.invariantsTotal);
    expect(d.readiness.blocking).toMatch(/no rule in this deployment is approved/i);
    expect(d.readiness.blocking).toMatch(/may be quoted to a third party/i);

    expect(d.volume.plots).toBeGreaterThan(0);
    expect(d.volume.runs).toBeGreaterThan(0);
    expect(Object.values(d.governingBands).some((n) => Number(n) > 0)).toBe(true);
  });

  it('ranks assumption exposure by the largest effect any run measured', async () => {
    const plot = await createPlot();
    await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: ACTOR,
      payload: { ...RUN_BODY, plotId: plot.plotId },
    });

    const d = (await app.inject({ method: 'GET', url: '/api/dashboard', headers: ACTOR })).json();
    expect(d.assumptionExposure.length).toBeGreaterThan(0);
    const effects = d.assumptionExposure.map((a: { maxRelativeEffect: string }) =>
      Number(a.maxRelativeEffect),
    );
    expect([...effects].sort((a: number, b: number) => b - a)).toEqual(effects);
    for (const a of d.assumptionExposure) expect(a.basis.length).toBeGreaterThan(20);
  });

  it('names every deferred rule, and flags the life-safety one', async () => {
    const d = (await app.inject({ method: 'GET', url: '/api/dashboard', headers: ACTOR })).json();
    expect(d.deferred.length).toBeGreaterThan(0);
    expect(d.deferred.some((r: { isLifeSafety: boolean }) => r.isLifeSafety)).toBe(true);
    for (const r of d.deferred) expect(r.citation).toBeTruthy();
  });
});
