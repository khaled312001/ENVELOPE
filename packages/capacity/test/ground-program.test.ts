/**
 * The indicative ground-floor program in the reserved strip.
 *
 * At risk: rooms outside the strip, rooms squeezed into a strip too short for
 * them, and a program drawn without the assumption it rests on.
 *
 * ---------------------------------------------------------------------------
 * AND, SINCE SECTION 11 OF THE DEWA 2017 REGULATIONS WAS TRANSCRIBED:
 *
 * The substation stopped being a typical figure and started being read off a
 * cited instrument, which creates four new ways to be wrong — each of which has
 * a test here **by name**, because this file previously asserted the opposite of
 * three of them and a removal that leaves no test behind is an absence rather
 * than a decision:
 *
 * 1. The area could silently stop matching §11.4.1's table. It is checked at
 *    one, two and four transformers, including the +10 m² step at four that no
 *    linear fit reaches.
 * 2. The area could be published `DERIVED` while reaching no clause. It is
 *    walked to a RULE and a SOURCE_CLAUSE in the graph.
 * 3. The assumed transformer count could become a hidden default — a `1` with no
 *    basis, which is the exact shape of failure "no hidden defaults" exists to
 *    catch. It is checked to be ASSUMED, to carry a basis, and for that basis to
 *    state the direction of the error.
 * 4. A strip too shallow for §11.4.1's minimum width could draw the room
 *    undersized instead of refusing it. It is checked to refuse, with both
 *    figures in the sentence.
 *
 * The old assertion that `GROUND_PROGRAM_BASIS` claims nothing is cited is
 * inverted here rather than deleted: the basis string is the one field this
 * product's trust lives in, and a stale claim in it is a lie.
 */

import {
  asMm,
  EdgeClassification,
  ProvenanceClass,
  ProvenanceGraph,
  Tracer,
  type Mm,
  type PlotEdge,
  type Point,
} from '@envelope/core';
import { initGeometry } from '@envelope/geometry';
import { SINGLE_ROOM_SUBSTATION_M2, singleRoomSubstationAreaM2 } from '@envelope/rules';
import { beforeAll, describe, expect, it } from 'vitest';

import { RECT_120x80, runInput } from '../../../test-support/pipeline.js';
import {
  GROUND_PROGRAM_BASIS,
  GROUND_PROGRAM_NOT_MODELLED,
  layoutGroundProgram,
  runPipeline,
  type GroundProgram,
} from '../src/index.js';

beforeAll(async () => {
  await initGeometry();
});

const graph = (): ProvenanceGraph => new ProvenanceGraph();
const tracer = (g: ProvenanceGraph = graph()): Tracer => new Tracer(g);
const rect = (x0: number, y0: number, w: number, d: number) => [
  { x: asMm(x0), y: asMm(y0) },
  { x: asMm(x0 + w), y: asMm(y0) },
  { x: asMm(x0 + w), y: asMm(y0 + d) },
  { x: asMm(x0), y: asMm(y0 + d) },
];

const pt = (x: number, y: number): Point => ({ x: asMm(x), y: asMm(y) });

/**
 * A boundary, classified. Only the four fields this code reads are real — the
 * bearing and the length are not consulted by the placement, which ranks the
 * strip's two ends against the segment itself.
 */
const edge = (
  seq: number,
  classification: PlotEdge['classification'],
  start: Point,
  end: Point,
): PlotEdge =>
  ({
    seq,
    start,
    end,
    classification,
    lengthMm: asMm(Math.round(Math.hypot(end.x - start.x, end.y - start.y))),
  }) as unknown as PlotEdge;

const laidOut = (p: GroundProgram): Extract<GroundProgram, { kind: 'LAID_OUT' }> => {
  if (p.kind !== 'LAID_OUT') throw new Error(`not laid out: ${p.reason}`);
  return p;
};

const widthOf = (room: { readonly outline: readonly { readonly x: Mm; readonly y: Mm }[] }): number =>
  Math.round(Math.hypot(room.outline[1]!.x - room.outline[0]!.x, room.outline[1]!.y - room.outline[0]!.y));

describe('a strip long enough for the whole program', () => {
  const program = laidOut(
    layoutGroundProgram({ tracer: tracer(), zone: rect(0, 0, 50_000, 6_000) }),
  );

  it('lays every room inside the strip', () => {
    expect(program.notPlaced).toEqual([]);
    expect(program.rooms.map((r) => r.name)).toContain('ENTRANCE LOBBY');
    expect(program.rooms.map((r) => r.name)).toContain('SUBSTATION');
    for (const room of program.rooms) {
      for (const p of room.outline) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(50_000);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(6_000);
      }
    }
  });

  it('draws no two rooms over each other', () => {
    // The program is laid from both ends now — the substation from the road end
    // and the typical rooms from the other — so overlap is a new failure mode
    // that the single-cursor version could not have had.
    const spans = program.rooms
      .map((r) => {
        const xs = r.outline.map((p) => p.x);
        return { lo: Math.min(...xs), hi: Math.max(...xs) };
      })
      .sort((a, b) => a.lo - b.lo);
    for (let i = 1; i < spans.length; i++) {
      expect(spans[i]!.lo).toBeGreaterThanOrEqual(spans[i - 1]!.hi);
    }
  });

  it('rests on one assumption, so the whole program still draws in the assumed ink', () => {
    // Citing ONE room's area does not make the program a services design. Every
    // renderer inks all nine rooms from this node; if it stopped being ASSUMED
    // the drawing would leave amber and tell a reader the opposite of the truth.
    expect(program.program.provenanceClass).toBe(ProvenanceClass.ASSUMED);
  });
});

describe('the ground-program basis string', () => {
  it('no longer claims the substation is a typical figure', () => {
    // The assertion this replaces was `toMatch(/not figures from a DEWA/)`, and
    // it became false the day Section 11 was transcribed.
    expect(GROUND_PROGRAM_BASIS).not.toMatch(/not figures from a DEWA/);
    expect(GROUND_PROGRAM_BASIS).not.toMatch(/no room is sized/);
  });

  it('names the clauses that now size and place the substation', () => {
    expect(GROUND_PROGRAM_BASIS).toMatch(/§11\.4\.1/);
    expect(GROUND_PROGRAM_BASIS).toMatch(/§11\.3\.1/);
    expect(GROUND_PROGRAM_BASIS).toMatch(/DEWA Regulations for Electrical Installations 2017/);
  });

  it('still says the other rooms are typical widths, the LV room among them', () => {
    expect(GROUND_PROGRAM_BASIS).toMatch(/typical figure: Section 11 states no LV room area/);
    expect(GROUND_PROGRAM_BASIS).toMatch(/Every other room is a typical width/);
    expect(GROUND_PROGRAM_BASIS).toMatch(/no DEWA, Civil Defence or municipality requirement/);
  });

  it('names every typical room it draws, at the width it draws it', () => {
    // The guard on the thing this change made possible: the widths in the basis
    // are interpolated from the same table the rooms are drawn from, so a width
    // changed in one place cannot go on being described by the other. A room
    // added to the program and left out of its own basis is the same defect.
    const program = laidOut(
      layoutGroundProgram({ tracer: tracer(), zone: rect(0, 0, 90_000, 7_000) }),
    );
    for (const room of program.rooms) {
      if (room.name === 'SUBSTATION') continue; // sized by §11.4.1, not by a width
      const metres = widthOf(room) / 1000;
      // The LV room is described in its own sentence, because it is the one room
      // with a cited POSITION and an uncited width and the basis has to say both.
      const expected =
        room.name === 'LV ROOM' ? `its own ${metres} m width` : `${room.name} ${metres} m`;
      expect(GROUND_PROGRAM_BASIS, `${room.name} is not in its own basis`).toContain(expected);
    }
  });

  it('still says no room is ventilated, access-checked, height-checked or routed', () => {
    expect(GROUND_PROGRAM_BASIS).toMatch(/§11\.5\.1 is PARTIALLY MECHANIZED/);
    expect(GROUND_PROGRAM_BASIS).toMatch(/DEWA_NOT_MECHANIZED/);
    expect(GROUND_PROGRAM_BASIS).toMatch(/REGULATORY VALIDITY: NOT ASSESSED/);
  });

  it('says the same thing in the note drawn under the program', () => {
    expect(GROUND_PROGRAM_NOT_MODELLED).toMatch(/§11\.4\.1 and §11\.3\.1/);
    expect(GROUND_PROGRAM_NOT_MODELLED).toMatch(/typical width that no requirement on file/);
    expect(GROUND_PROGRAM_NOT_MODELLED).toMatch(/REGULATORY VALIDITY: NOT ASSESSED/);
  });
});

describe('the substation area, against §11.4.1 itself', () => {
  /*
    A 7 m strip, because that is the deepest the program draws and 6.1 m — the
    minimum width for two transformers — does not fit a 6 m one. The case where
    it does not fit has its own test below.
  */
  const sized = (transformers: number) =>
    laidOut(
      layoutGroundProgram({
        tracer: tracer(),
        zone: rect(0, 0, 90_000, 7_000),
        substation: { transformers },
      }),
    ).substation!;

  it('is 33 m² for one transformer', () => {
    expect(sized(1).requiredAreaM2.value.toNumber()).toBe(SINGLE_ROOM_SUBSTATION_M2.one);
    expect(sized(1).requiredAreaM2.value.toNumber()).toBe(33);
  });

  it('is 55 m² for two — not 33 + 25, which the table does not say', () => {
    expect(sized(2).requiredAreaM2.value.toNumber()).toBe(SINGLE_ROOM_SUBSTATION_M2.two);
    expect(sized(2).requiredAreaM2.value.toNumber()).toBe(55);
    expect(sized(2).requiredAreaM2.value.toNumber()).not.toBe(58);
  });

  it('is 115 m² for four, which is the +10 m² step no linear fit reaches', () => {
    // 55 + 25 × 2 = 105, and four and above take 10 m² more for the additional
    // equipment. A reader who fitted a line through the table gets 105 here.
    expect(sized(4).requiredAreaM2.value.toNumber()).toBe(115);
    expect(sized(4).requiredAreaM2.value.toNumber()).not.toBe(105);
  });

  it('equals the instrument module for every count the table covers', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      expect(sized(n).requiredAreaM2.value.toNumber()).toBe(singleRoomSubstationAreaM2(n));
    }
  });

  it('draws a rectangle no smaller than the cited area, never one shaved under it', () => {
    for (const n of [1, 2, 4]) {
      const s = sized(n);
      expect(s.drawn, `${n} transformer(s) were not drawn`).toBeDefined();
      expect(s.drawn!.areaM2.value.gte(s.requiredAreaM2.value)).toBe(true);
    }
  });

  it('carries §11.4.1\'s minimum width where the table states one, and none where it does not', () => {
    expect(sized(1).minWidthM?.value.toNumber()).toBe(4.57);
    expect(sized(2).minWidthM?.value.toNumber()).toBe(6.1);
    // The transcription tabulates a width for one and for two and for nothing
    // else. Extrapolating 6.1 m to a four-transformer room would be inventing a
    // regulation, so the field is absent and `notAssessed` carries the residue.
    expect(sized(4).minWidthM).toBeUndefined();
  });
});

describe('§13.3 — the derived substation figures reach a cited clause', () => {
  it('walks the area and the minimum width to a RULE and a SOURCE_CLAUSE', () => {
    const g = graph();
    const program = laidOut(
      layoutGroundProgram({
        tracer: tracer(g),
        zone: rect(0, 0, 90_000, 7_000),
        substation: { transformers: 2 },
      }),
    );
    const s = program.substation!;
    for (const [label, traced] of [
      ['required area', s.requiredAreaM2],
      ['minimum width', s.minWidthM!],
    ] as const) {
      expect(traced.provenanceClass, `${label} is not DERIVED`).toBe(ProvenanceClass.DERIVED);
      expect(g.hasKindBelow(traced.node, 'RULE'), `${label} reaches no RULE`).toBe(true);
      expect(
        g.hasKindBelow(traced.node, 'SOURCE_CLAUSE'),
        `${label} reaches no SOURCE_CLAUSE`,
      ).toBe(true);
    }
  });

  it('keeps the assumed count reachable from the derived area', () => {
    // The whole argument for publishing a DERIVED area over an ASSUMED count is
    // that the count is one hop away and amber. If that hop breaks, the area is
    // a number claiming more than it has.
    const g = graph();
    const s = laidOut(
      layoutGroundProgram({ tracer: tracer(g), zone: rect(0, 0, 90_000, 7_000) }),
    ).substation!;
    expect(g.hasKindBelow(s.requiredAreaM2.node, 'ASSUMPTION')).toBe(true);
  });
});

describe('the transformer count, which nobody stated', () => {
  const s = laidOut(
    layoutGroundProgram({ tracer: tracer(), zone: rect(0, 0, 90_000, 7_000) }),
  ).substation!;

  it('is ASSUMED, not a silently chosen number', () => {
    expect(s.transformers.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    expect(s.transformers.value).toBe(1);
  });

  it('carries a basis that says why one, and which way the error runs', () => {
    const g = graph();
    const assumed = laidOut(
      layoutGroundProgram({ tracer: tracer(g), zone: rect(0, 0, 90_000, 7_000) }),
    ).substation!;
    const basis = [...g.reachableFrom(assumed.transformers.node)]
      .map((id) => g.node(id).label)
      .join(' | ');
    expect(basis).toMatch(/smallest count the clause tabulates/);
    // "errs LOW" is the sentence that matters. An assumption whose direction is
    // unstated is a number a reader cannot argue with.
    expect(basis).toMatch(/errs LOW/);
    expect(basis).toMatch(/55 m²/);
  });

  it('is USER_SET when a named person entered it', () => {
    const s2 = laidOut(
      layoutGroundProgram({
        tracer: tracer(),
        zone: rect(0, 0, 90_000, 7_000),
        substation: { transformers: 2, actor: { id: 'u1', name: 'Eng. Mohamed' } },
      }),
    ).substation!;
    expect(s2.transformers.provenanceClass).toBe(ProvenanceClass.USER_SET);
    expect(s2.requiredAreaM2.value.toNumber()).toBe(55);
  });

  it('refuses a count that is not a count rather than answering it', () => {
    for (const bad of [0, -1, 1.5]) {
      expect(() =>
        layoutGroundProgram({
          tracer: tracer(),
          zone: rect(0, 0, 90_000, 7_000),
          substation: { transformers: bad },
        }),
      ).toThrow(/transformer count/);
    }
  });
});

describe('a strip too shallow for §11.4.1\'s minimum width', () => {
  /*
    6.0 m deep against a 6.1 m minimum width for two transformers. The room's
    area would fit — 55 m² in a 90 m strip is 9.17 m along it — and that is
    exactly the trap: a 55 m² room 6.0 m wide meets the area record and fails
    the regulation, which is what the record's own note says.
  */
  const program = laidOut(
    layoutGroundProgram({
      tracer: tracer(),
      zone: rect(0, 0, 90_000, 6_000),
      substation: { transformers: 2 },
    }),
  );

  it('reports the substation as not placed rather than drawing it undersized', () => {
    expect(program.rooms.map((r) => r.name)).not.toContain('SUBSTATION');
    expect(program.notPlaced).toContain('SUBSTATION');
    expect(program.substation!.drawn).toBeUndefined();
  });

  it('names both figures in the refusal, so a reader can argue with it', () => {
    const reason = program.refused.find((r) => r.name === 'SUBSTATION')!.reason;
    expect(reason).toMatch(/55 m²/);
    expect(reason).toMatch(/6\.1 m/);
    expect(reason).toMatch(/6\.00 m deep/);
    expect(reason).toMatch(/not drawn rather than drawn undersized/);
  });

  it('still publishes the cited area, because that is the reason it was refused', () => {
    expect(program.substation!.requiredAreaM2.value.toNumber()).toBe(55);
    expect(program.substation!.requiredAreaM2.provenanceClass).toBe(ProvenanceClass.DERIVED);
  });

  it('does not draw the LV room beside a substation that is not there', () => {
    // §11.2.3 states an adjacency and nothing else. An LV room drawn elsewhere
    // in the strip would be a typical figure in a typical place with a clause
    // about adjacency pinned to it.
    expect(program.rooms.map((r) => r.name)).not.toContain('LV ROOM');
    expect(program.refused.find((r) => r.name === 'LV ROOM')!.reason).toMatch(/§11\.2\.3/);
  });

  it('still lays the typical rooms, which no clause refused', () => {
    expect(program.rooms.map((r) => r.name)).toContain('ENTRANCE LOBBY');
    expect(program.rooms.map((r) => r.name)).toContain('GENERATOR ROOM');
  });

  it('draws a one-transformer substation in the same strip, whose width is 4.57 m', () => {
    // The refusal above must be about the width and not about the depth cap in
    // general — a 4.57 m minimum fits a 6 m strip and the room is drawn.
    const ok = laidOut(
      layoutGroundProgram({
        tracer: tracer(),
        zone: rect(0, 0, 90_000, 6_000),
        substation: { transformers: 1 },
      }),
    );
    expect(ok.rooms.map((r) => r.name)).toContain('SUBSTATION');
    expect(ok.substation!.drawn!.areaM2.value.toNumber()).toBeGreaterThanOrEqual(33);
  });
});

describe('§11.3.1 — the substation is laid toward a road', () => {
  const strip = rect(20_000, 20_000, 60_000, 7_000);

  it('goes to the end nearest a ROAD boundary, and says which one', () => {
    // The road is off the strip's FAR end (x = 100_000); the near end is at
    // x = 20_000. The old convention would have laid from the near end.
    const program = laidOut(
      layoutGroundProgram({
        tracer: tracer(),
        zone: strip,
        edges: [
          edge(0, EdgeClassification.ADJACENT_PLOT, pt(0, 0), pt(0, 100_000)),
          edge(1, EdgeClassification.ROAD, pt(120_000, 0), pt(120_000, 100_000)),
        ],
      }),
    );
    const sub = program.rooms.find((r) => r.name === 'SUBSTATION')!;
    const xs = sub.outline.map((p) => p.x);
    expect(Math.max(...xs)).toBe(80_000);
    expect(program.substation!.drawn!.placement.provenanceClass).toBe(ProvenanceClass.DERIVED);
    expect(program.substation!.drawn!.placement.value).toMatch(/boundary 1/);
  });

  it('goes to the other end when the road is at the other end', () => {
    const program = laidOut(
      layoutGroundProgram({
        tracer: tracer(),
        zone: strip,
        edges: [
          edge(0, EdgeClassification.ROAD, pt(0, 0), pt(0, 100_000)),
          edge(1, EdgeClassification.ADJACENT_PLOT, pt(120_000, 0), pt(120_000, 100_000)),
        ],
      }),
    );
    const xs = program.rooms.find((r) => r.name === 'SUBSTATION')!.outline.map((p) => p.x);
    expect(Math.min(...xs)).toBe(20_000);
  });

  it('puts the LV room immediately beside it, which is §11.2.3', () => {
    const program = laidOut(
      layoutGroundProgram({
        tracer: tracer(),
        zone: strip,
        edges: [edge(0, EdgeClassification.ROAD, pt(120_000, 0), pt(120_000, 100_000))],
      }),
    );
    const sub = program.rooms.find((r) => r.name === 'SUBSTATION')!;
    const lv = program.rooms.find((r) => r.name === 'LV ROOM')!;
    const subLo = Math.min(...sub.outline.map((p) => p.x));
    const lvHi = Math.max(...lv.outline.map((p) => p.x));
    expect(lvHi).toBe(subLo);
  });

  it('ignores a boundary that is not a road — which is the arrangement §11.3.1 forbids', () => {
    const program = laidOut(
      layoutGroundProgram({
        tracer: tracer(),
        zone: strip,
        edges: [edge(0, EdgeClassification.ADJACENT_PLOT, pt(120_000, 0), pt(120_000, 100_000))],
      }),
    );
    expect(program.substation!.drawn!.placement.provenanceClass).toBe(ProvenanceClass.ASSUMED);
  });

  it('assumes the position, amber and in words, when no boundary is classified ROAD', () => {
    const g = graph();
    const program = laidOut(layoutGroundProgram({ tracer: tracer(g), zone: strip }));
    const placement = program.substation!.drawn!.placement;
    expect(placement.provenanceClass).toBe(ProvenanceClass.ASSUMED);
    expect(g.hasKindBelow(placement.node, 'ASSUMPTION')).toBe(true);
    expect(program.notAssessed.join(' ')).toMatch(/Whether the substation is on a road at all/);
  });

  it('picks the same end however the boundaries are ordered', () => {
    // §13.4 — the deterministic part of the pipeline must re-execute identically
    // from persisted inputs, and `Plot.edges` is persisted as a list. Two roads
    // equidistant from the two ends is the case where an under-specified
    // comparison would answer by iteration order; the lower sequence must win
    // both times. A ranking that is reproducible only by luck is not reproducible.
    const west = edge(0, EdgeClassification.ROAD, pt(0, 0), pt(0, 100_000));
    const east = edge(1, EdgeClassification.ROAD, pt(100_000, 0), pt(100_000, 100_000));
    const endOf = (edges: readonly PlotEdge[]) => {
      const xs = laidOut(layoutGroundProgram({ tracer: tracer(), zone: strip, edges }))
        .rooms.find((r) => r.name === 'SUBSTATION')!
        .outline.map((p) => p.x);
      return Math.min(...xs);
    };
    expect(endOf([west, east])).toBe(endOf([east, west]));
    expect(endOf([west, east])).toBe(20_000); // boundary 0, the lower sequence
  });

  it('breaks a tie between the strip\'s own two ends the same way every time', () => {
    // One road, parallel to the strip, equidistant from both of its ends.
    const parallel = edge(0, EdgeClassification.ROAD, pt(20_000, 0), pt(80_000, 0));
    const first = laidOut(
      layoutGroundProgram({ tracer: tracer(), zone: strip, edges: [parallel] }),
    );
    const again = laidOut(
      layoutGroundProgram({ tracer: tracer(), zone: strip, edges: [parallel] }),
    );
    const xs = (p: typeof first) =>
      p.rooms.find((r) => r.name === 'SUBSTATION')!.outline.map((q) => q.x);
    expect(xs(first)).toEqual(xs(again));
    expect(Math.min(...xs(first))).toBe(20_000);
  });

  it('says the room is near the road and not against it, where a road IS known', () => {
    // The reserved strip sits inside the podium behind the setback. Claiming
    // §11.3.1 is MET would be claiming a frontage this engine does not place.
    const program = laidOut(
      layoutGroundProgram({
        tracer: tracer(),
        zone: strip,
        edges: [edge(0, EdgeClassification.ROAD, pt(120_000, 0), pt(120_000, 100_000))],
      }),
    );
    expect(program.notAssessed.join(' ')).toMatch(/is near the road, not against it/);
  });
});

describe('what the program does not check', () => {
  const program = laidOut(
    layoutGroundProgram({ tracer: tracer(), zone: rect(0, 0, 90_000, 7_000) }),
  );

  it('publishes the clauses dewa-2017.ts deliberately left out, from that list itself', () => {
    const text = program.notAssessed.join(' | ');
    // Built from DEWA_NOT_MECHANIZED rather than re-typed from it, so a clause
    // that gets encoded stops being published as absent on the same commit.
    expect(text).toMatch(/11\.3\.2 — sikka width/);
    expect(text).toMatch(/11\.7 — transformer transport ramp/);
    expect(text).toMatch(/11\.2\.4 — no wet area above a substation/);
  });

  it('names ventilation, clear height and the LV panel ownership condition', () => {
    const text = program.notAssessed.join(' | ');
    expect(text).toMatch(/§11\.5\.1/);
    expect(text).toMatch(/§11\.2\.5/);
    expect(text).toMatch(/§11\.2\.3/);
    expect(text).toMatch(/R-DEWA-11\.2\.3-LV-ROOM-ADJACENT/);
  });

  it('never claims compliance', () => {
    expect(program.notAssessed.join(' | ')).toMatch(/REGULATORY VALIDITY: NOT ASSESSED/);
  });
});

describe('a short strip', () => {
  it('lays what fits and names the rest, rather than squeezing it', () => {
    const program = laidOut(
      layoutGroundProgram({ tracer: tracer(), zone: rect(0, 0, 20_000, 6_000) }),
    );
    expect(program.notPlaced.length).toBeGreaterThan(0);
    expect(program.refused.every((r) => r.reason.length > 0)).toBe(true);
    const width = program.rooms.reduce((t, r) => t + widthOf(r), 0);
    expect(width).toBeLessThanOrEqual(20_000);
  });

  it('drops a typical figure before it drops the room a clause sized', () => {
    // 5.5 m of substation + 5 m of LV room fits a 12 m strip; an entrance lobby
    // at 6 m does not. The cited room must not be the one that loses.
    const program = laidOut(
      layoutGroundProgram({ tracer: tracer(), zone: rect(0, 0, 12_000, 6_000) }),
    );
    expect(program.rooms.map((r) => r.name)).toContain('SUBSTATION');
    expect(program.notPlaced).toContain('ENTRANCE LOBBY');
  });
});

describe('a deep strip', () => {
  it('keeps rooms no deeper than 7 m, on the side away from the core', () => {
    const program = laidOut(
      layoutGroundProgram({
        tracer: tracer(),
        zone: rect(0, 0, 90_000, 16_000),
        towards: { x: 45_000, y: 40_000 },
      }),
    );
    for (const room of program.rooms) {
      const ys = room.outline.map((p) => p.y);
      expect(Math.max(...ys) - Math.min(...ys)).toBe(7_000);
      expect(Math.max(...ys)).toBeLessThanOrEqual(7_000);
    }
  });
});

describe('a strip too shallow', () => {
  it('holds no room, and says why', () => {
    const program = layoutGroundProgram({ tracer: tracer(), zone: rect(0, 0, 50_000, 2_000) });
    expect(program.kind).toBe('NOT_LAID_OUT');
  });
});

describe('in a run', () => {
  it('draws the rooms on the parking level at grade only', () => {
    const out = runPipeline(runInput(RECT_120x80));
    const ground = out.building.levels.find((l) => l.parking && l.elevationMm === 0);
    expect(out.building.groundRooms?.levelId).toBe(ground?.id);
    expect(out.building.groundRooms?.source.provenanceClass).toBe(ProvenanceClass.ASSUMED);
  });
});
