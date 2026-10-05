/**
 * Step 1 — the plot.
 *
 * **Dimensions first, not a basemap.** `FR-PLT-001` offers "form entry + manual
 * polygon drawing on a basemap" and `AC2` then blocks when the computed and
 * stated areas differ by more than 2%. Those two requirements fight each other:
 * an architect holds an affection plan with dimensions and bearings, not survey
 * coordinates, and hand-tracing a plot on a satellite tile routinely lands 2–5%
 * off — so the PRD's primary input method routinely trips the PRD's primary
 * input validation. See `docs/03-analysis/open-questions.md` Q23.
 *
 * So this form takes the numbers that are actually on the document. A basemap
 * trace is a later addition for the cases that need georeferencing, not the way
 * in.
 *
 * **Edge classification has no default.** `AC3`. Every edge starts unset and the
 * form will not submit until each one is answered, because a wrong default
 * setback is a wrong footprint and nobody would ever see it happen.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { useAutosave } from '../useAutosave.js';
import { type LegArc, rectangleLegs, walkTraverse } from '../traverse.js';
import { useSession } from '../session.js';

import {
  api,
  ApiError,
  type Actor,
  type Attachment,
  type PlotCreated,
  type PlotView,
} from '../api/client.js';
import { PlotCanvas } from '../components/PlotCanvas.js';
import { PlotMap } from '../components/PlotMap.js';
import { AR } from '../i18n/plotForm.ar.js';
import { EN } from '../i18n/plotForm.en.js';
import { useDict } from '../i18n/locale.js';

/**
 * `FR-PLT-001 AC2`'s tolerance between the computed and the stated area. Named here
 * rather than typed into a sentence, because no digit is typed into a dictionary.
 */
const AREA_TOLERANCE = '2%';

type Classification = 'ROAD' | 'ADJACENT_PLOT' | 'OPEN_SPACE' | 'OTHER' | '';
type Hierarchy = 'ARTERIAL' | 'COLLECTOR' | 'LOCAL' | 'ACCESS' | '';

/**
 * WHAT IS KEPT WHEN THE TAB CLOSES.
 *
 * Exactly the form’s own fields and nothing derived. `vertices`, `computedArea` and
 * `complete` are all computed from these, and storing a computed value would create
 * a second copy that can disagree with the inputs it came from — in the one place
 * where the product’s whole claim is that a number and its derivation travel
 * together.
 */
interface PlotDraft {
  readonly plotNumber: string;
  readonly community: string;
  readonly shape: Shape;
  readonly width: string;
  readonly depth: string;
  readonly statedArea: string;
  readonly edges: EdgeDraft[];
}

/**
 * HOW THE SHAPE IS ENTERED, and it is a mode rather than a replacement.
 *
 * A rectangle is a shortcut and it is the right one for the plots that are
 * rectangles. It is not a model of a plot: the client's second point was that
 * real ones carry several dimensions, fractions and curves. So the rectangle
 * stays and the traverse is the other way in — the boundaries as the affection
 * plan states them, a length and a direction each, with the corners computed.
 *
 * A boundary may curve, which is the rest of the same answer. The corners do
 * not move: the length and the bearing stay the chord's, and a radius and a
 * side say how the boundary leaves that chord between them. That is how an
 * affection plan states a curve, and it is the only description of one that
 * survives being read off a document rather than dragged on a screen.
 *
 * A THIRD WAY IN, AND IT IS A TRACING SURFACE RATHER THAN A FOURTH MODEL.
 *
 * `'map'` draws the boundary on satellite imagery with the affection plan laid
 * over it, and hands the result to the traverse above — the legs land in the same
 * boxes a typed traverse uses, editable, and the mode flips to `'edges'` on the
 * handoff. That is deliberate and it is the answer to the fight in this file's
 * header: `AC2` blocks on a 2% area disagreement, a hand-trace lands 2–5% off, so
 * a traced figure must arrive as something a reader SEES and OVERTYPES. It never
 * becomes the authoritative number by arriving.
 */
type Shape = 'rectangle' | 'edges' | 'map';

interface EdgeDraft {
  readonly classification: Classification;
  readonly roadHierarchy: Hierarchy;
  /** Traverse mode only. Metres, as typed; blank in rectangle mode. */
  readonly lengthM: string;
  /** Traverse mode only. Degrees clockwise from north, along the boundary. */
  readonly bearingDeg: string;
  /**
   * Which way the boundary bows, walking it in the direction of its bearing.
   * Blank means straight, which every boundary is until a reader says otherwise.
   */
  readonly curve: '' | 'right' | 'left';
  /** Metres, as typed. Read only when `curve` is set. */
  readonly radiusM: string;
}

/** The four blank boundaries a form with no demo behind it opens on. */
const BLANK_EDGE: EdgeDraft = {
  classification: '',
  roadHierarchy: '',
  lengthM: '',
  bearingDeg: '',
  curve: '',
  radiusM: '',
};

/**
 * A draft written before boundaries could curve has neither field.
 *
 * Restoring it as-is would put `undefined` into a select's `value` and make the
 * control uncontrolled halfway through a session, which React warns about and a
 * reader experiences as a box that stops responding.
 */
const asEdgeDraft = (e: EdgeDraft): EdgeDraft => ({ ...BLANK_EDGE, ...e });

export interface PlotFormProps {
  readonly actor: Actor;
  readonly busy: boolean;
  readonly setBusy: (b: boolean) => void;
  readonly onCreated: (created: PlotCreated, view: PlotView) => void;
  readonly onError: (e: ApiError) => void;
  /**
   * Values carried over from a read affection plan.
   *
   * Three fields, and deliberately not five. The sheet states an area but not a
   * frontage, so width and depth are left blank — a rectangle inferred from an
   * area is a plot shape nobody surveyed, and it would then pass the 2% check
   * against the very area it was computed from. Carrying the area across as the
   * *stated* area is what makes that check able to catch a mistyped dimension.
   */
  readonly prefill?: {
    readonly plotNumber: string;
    readonly community: string;
    readonly statedAreaM2: string;
    /** The sheet itself, carried through so the SERVER reads its limits. */
    readonly attachment?: Attachment;
    /**
     * THE BOUNDARY READINGS — four fields now, and the fourth is the reason the
     * paragraph above needed amending rather than contradicting.
     *
     * The client's complaint on 5 Oct was that after reading a sheet, step 1 still
     * showed "4 STILL UNCLASSIFIED" with four empty selects:
     * *«المفروض القراءات تطلع كاملة من الرسمة بتاعت الافكشن بلان»*. It was right,
     * and the reason was a vocabulary gap: `packages/intake` reads setbacks per
     * FACE — front, rear, side — and this form asks a classification per BOUNDARY,
     * and nothing crossed between them.
     *
     * What the sheet states and what it does not are different things, and this
     * field keeps them apart. It states a reading per face. It does NOT state
     * which boundary of this plot is the front — no affection plan does; the
     * drawing shows it to a person and the text does not say it. So the readings
     * arrive as PROPOSALS against a face, the form asks the one question the sheet
     * cannot answer, and the reading applies to whichever boundary the reader says
     * holds that face. A boundary nobody answers for stays unanswered, because
     * `AC3` has no default and a document does not create one.
     */
    readonly edges?: {
      readonly proposals: readonly {
        readonly role: 'FRONT' | 'SIDE' | 'REAR';
        readonly classification: {
          readonly value: string;
          readonly provenanceClass: string;
        };
        readonly evidence: readonly { readonly page: number }[];
      }[];
      readonly missing: readonly { readonly label: string }[];
    };
  } | null;
  /**
   * The worked example, when the reader arrived by `?demo=worked-example`.
   *
   * A SECOND PROP RATHER THAN A WIDER `prefill`, because the two carry values of
   * different kinds and the difference is the one this form is careful about.
   * `prefill` comes from a *sheet*, which states an area and no frontage — hence
   * the paragraph above refusing to infer a rectangle from it. A demo carries a
   * shape that was surveyed, entered and run; it is the input of a run whose
   * output is printed on the landing page. Folding it into `prefill` would have
   * meant either deleting that refusal or writing an exception inside it, and an
   * exception inside a rule is how the rule stops being read.
   *
   * It is applied at mount, to the same initial state a reader would have typed.
   * Nothing here is locked: the banner above the form says where the values came
   * from, and every field stays editable.
   */
  readonly demo?: {
    readonly plotNumber: string;
    readonly community: string;
    readonly widthM: string;
    readonly depthM: string;
    readonly edges: readonly {
      readonly classification: string;
      readonly roadHierarchy: string;
    }[];
  } | null;
}

/**
 * One line under a radius: what it draws, or why it cannot.
 *
 * A refusal is the same sentence the engine would send back as a 422, said
 * before the request rather than after it — the form already knows the chord,
 * so there is nothing to learn from a round trip except a delay.
 */
function arcNote(t: typeof EN, arc: LegArc | null | undefined): string {
  if (!arc) return '';
  if (arc.refusal === 'radius-too-small') return t.traverse.radiusTooSmall;
  if (arc.refusal === 'too-gentle') return t.traverse.curveTooGentle;
  if (arc.refusal === 'no-radius') return t.traverse.radiusHelp;
  return t.traverse.arcNote(arc.arcLengthM, arc.riseM, arc.sweepDeg);
}

export function PlotForm({
  actor,
  busy,
  setBusy,
  onCreated,
  onError,
  prefill,
  demo,
}: PlotFormProps): JSX.Element {
  const t = useDict(EN, AR);
  const [plotNumber, setPlotNumber] = useState(
    prefill?.plotNumber || demo?.plotNumber || '345-1234',
  );
  const [community, setCommunity] = useState(prefill?.community ?? demo?.community ?? '');
  const [width, setWidth] = useState(demo?.widthM ?? '80');
  const [depth, setDepth] = useState(demo?.depthM ?? '40');
  const [statedArea, setStatedArea] = useState(prefill?.statedAreaM2 ?? '');
  const [edges, setEdges] = useState<EdgeDraft[]>(
    /*
      THE DEMO'S EDGES, OR FOUR UNCLASSIFIED ONES.

      Unclassified is the honest default and the form refuses to submit on it —
      which is the check the smoke walk exercises by name. The demo is the one case
      where somebody did classify them: two roads of different rank and two
      neighbours, which is what makes the worked example's access recommendation
      say anything at all. The cast is safe by the same test that makes the
      submission safe: an unrecognised string lands in the select as no selection,
      and the form still refuses.
    */
    demo
      ? demo.edges.map((e) => ({
          ...BLANK_EDGE,
          classification: e.classification as Classification,
          roadHierarchy: e.roadHierarchy as Hierarchy,
        }))
      : [BLANK_EDGE, BLANK_EDGE, BLANK_EDGE, BLANK_EDGE],
  );
  const [shape, setShape] = useState<Shape>('rectangle');

  /*
    SWITCHING TO EDGE ENTRY SEEDS THE BOXES WITH THE RECTANGLE THAT WAS THERE.

    An empty table is a form that has thrown away what the reader already typed
    and asks them to type it again. Seeding is not a hidden default: the four
    numbers are the four they entered, and every one of them is on screen and
    editable the moment they arrive. The banner above the table says where they
    came from.

    Switching BACK leaves the traverse alone. The width and depth are still in
    their own state, and a reader who flips modes to look at something should not
    lose the boundaries they typed by doing it.
  */
  /*
    A NEW BOUNDARY IS BLANK, and it is added at the end of the walk.

    Not a copy of the last one: a duplicated length and bearing is a plot a
    reader did not enter, sitting in the boxes looking entered. Blank makes the
    traverse unusable until it is filled, which is the correct state for a
    boundary nobody has described yet.
  */
  const addEdge = (): void => setEdges((prev) => [...prev, BLANK_EDGE]);

  const toEdges = (): void => {
    const legs = rectangleLegs(width, depth);
    setEdges((prev) =>
      prev.map((edge, i) => ({
        ...edge,
        lengthM: edge.lengthM || legs[i]?.lengthM || '',
        bearingDeg: edge.bearingDeg || legs[i]?.bearingDeg || '',
      })),
    );
    setShape('edges');
  };

  /*
    WHICH BOUNDARY HOLDS WHICH FACE — the reader's answer, not the sheet's.

    Kept per boundary index rather than on `EdgeDraft`, and deliberately OUT of
    the autosaved draft: it is not a field of the plot. It is the key that joins
    the sheet's per-face readings to the boundaries on screen, and a restored
    draft taken against a different sheet would be joining on a key from another
    document. The classification it applies IS saved, because that is the answer.
  */
  const [roles, setRoles] = useState<readonly ('' | 'FRONT' | 'SIDE' | 'REAR')[]>([]);
  const proposals = prefill?.edges?.proposals ?? null;

  const assignRole = (i: number, role: '' | 'FRONT' | 'SIDE' | 'REAR'): void => {
    setRoles((prev) => {
      const next = [...prev];
      while (next.length <= i) next.push('');
      next[i] = role;
      return next;
    });
    /*
      CLEARING A ROLE CLEARS WHAT IT APPLIED. Leaving the classification behind
      would leave an answer on screen whose stated reason the reader has just
      withdrawn — an answer with no author, which is the one thing this form has
      no state for.
    */
    const found = role === '' ? undefined : proposals?.find((p) => p.role === role);
    const value = (found?.classification.value ?? '') as Classification;
    setEdges((prev) =>
      prev.map((e, j) =>
        j === i ? { ...e, classification: value, roadHierarchy: value === 'ROAD' ? e.roadHierarchy : '' } : e,
      ),
    );
  };

  /*
    THE TRACE ARRIVES IN THE BOXES, AND IT OVERWRITES.

    Unlike `toEdges`, which preserves anything already typed, a handoff from the
    map replaces the lengths and bearings: the reader drew a shape and pressed a
    button meaning "use this", and keeping a stale typed length under a new trace
    would show a traverse that is neither. The classifications are untouched — a
    photograph cannot know whether a boundary faces a road.

    A trace of more boundaries than the form holds grows the list; of fewer, the
    surplus boundaries keep their classification and lose their geometry, which
    makes the traverse unusable and visibly so rather than quietly short.
  */
  const [traced, setTraced] = useState(0);
  const applyTrace = (legs: readonly { readonly lengthM: string; readonly bearingDeg: string }[]): void => {
    setEdges((prev) => {
      const next = legs.map((leg, i) => ({
        ...(prev[i] ?? BLANK_EDGE),
        lengthM: leg.lengthM,
        bearingDeg: leg.bearingDeg,
        /* A traced boundary is a chord. A curve is read off a document, not off a
           tile, so a trace never asserts one. */
        curve: '' as const,
        radiusM: '',
      }));
      return next.length >= 3 ? next : [...prev];
    });
    setTraced(legs.length);
    setShape('edges');
  };

  /*
    AUTOSAVE, AND THE ONE DECISION IN IT THAT MATTERS.

    A recovered draft is OFFERED and never applied. Overwriting what somebody is
    typing now with what they typed yesterday is losing work in the name of saving
    it, and the reader is the only party who knows which of the two they wanted.
    So the banner sits above the form, the form stays as it is until the button is
    pressed, and declining is a real answer that removes both copies.

    `enabled` is the session, not a preference. A draft is private data; storing a
    half-entered plot against a name anybody can assert in a header would be handing
    it to the next person who asserts that name. Signed out, `useAutosave` still
    keeps the local mirror — so a closed tab is survivable without an account, on
    that machine only — and reports `local-only` rather than claiming a save.
  */
  const { state: sessionState } = useSession();
  const draft = useAutosave<PlotDraft>('plot-form', {
    enabled: sessionState === 'signed-in',
  });

  /*
    TWO GUARDS, AND THE FIRST ONE IS A BUG THIS CODE SHIPPED WITH FOR AN HOUR.

    WITHOUT `settled`, THE EFFECT RUNS ON MOUNT and records the component’s own
    defaults — plot number 345-1234, width 80, depth 40, four unclassified edges.
    So merely OPENING the form overwrote the draft it exists to offer. The banner
    still appeared, because the load and the first record race and the load usually
    won; pressing "Restore it" then restored the defaults over the defaults and
    looked like a button that did nothing.

    It is invisible in a code review — every line is right — and it took four
    seconds to see in a browser: type a value, open a second tab, press restore,
    watch the field not change.

    THE SECOND GUARD holds while a recovered draft is still on offer. The values in
    the form at that moment are not the reader’s intent, they are defaults, and
    writing them would answer the question the banner is asking.
  */
  const settled = useRef(false);
  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    /* `ready` and not just `recovered`: until the lookup answers, "no draft" and
       "not asked yet" are the same value, and recording during that window is what
       overwrote the draft while its own banner was on screen. */
    if (!draft.ready || draft.recovered) return;
    draft.record({ plotNumber, community, shape, width, depth, statedArea, edges });
    /* `draft.record` is a stable callback and the values are what changed; listing
       the callback here would re-record on every render of a memo boundary. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotNumber, community, shape, width, depth, statedArea, edges, draft.recovered, draft.ready]);

  const applyRecovered = (): void => {
    const p = draft.recovered?.payload;
    if (!p) return;
    setPlotNumber(p.plotNumber);
    setCommunity(p.community);
    setWidth(p.width);
    setDepth(p.depth);
    setStatedArea(p.statedArea);
    /* A draft written before this form had two modes has no `shape`; it was a
       rectangle, because that is all there was. */
    setShape(p.shape === 'edges' ? 'edges' : 'rectangle');
    /* The edge count is whatever was saved, because a plot is not always four-sided
       and a restore that silently kept four would be inventing a shape. */
    if (Array.isArray(p.edges) && p.edges.length >= 3) setEdges(p.edges.map(asEdgeDraft));
    draft.acceptRecovered();
  };

  /*
    THE WALK IS COMPUTED WHATEVER THE MODE, because the panel under the table
    reports on it and a reader switching modes should not see it appear blank for
    a frame. It costs four sines.
  */
  const walk = useMemo(
    () =>
      walkTraverse(
        edges.map((e) => ({
          lengthM: e.lengthM,
          bearingDeg: e.bearingDeg,
          curve: e.curve,
          radiusM: e.radiusM,
        })),
      ),
    [edges],
  );

  const vertices = useMemo(
    () =>
      shape === 'edges'
        ? walk.corners
        : [
            { x: '0', y: '0' },
            { x: width || '0', y: '0' },
            { x: width || '0', y: depth || '0' },
            { x: '0', y: depth || '0' },
          ],
    [shape, walk, width, depth],
  );

  const classified = edges.every(
    (e) => e.classification !== '' && (e.classification !== 'ROAD' || e.roadHierarchy !== ''),
  );
  /* In edge mode the shape itself can be incomplete, and a traverse that cannot
     be walked has no corners to send.

     `'map'` is never complete: the handoff is what flips the mode, so being in it
     means no trace has been accepted yet. Submitting from the map would send the
     rectangle still sitting in the width and depth boxes behind it. */
  const complete = classified && (shape === 'rectangle' || (shape === 'edges' && walk.usable));
  const unclassified = edges.filter((e) => e.classification === '').length;

  const computedArea =
    shape === 'edges'
      ? walk.usable
        ? walk.areaM2
        : null
      : Number(width) > 0 && Number(depth) > 0
        ? (Number(width) * Number(depth)).toFixed(2)
        : null;

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await api.createPlot(actor, {
        plotNumber,
        community,
        landUse: 'RESIDENTIAL_MULTI',
        vertices,
        edges: edges.map((d, seq) => ({
          seq,
          classification: d.classification,
          ...(d.classification === 'ROAD' ? { roadHierarchy: d.roadHierarchy } : {}),
          /*
            THE CURVE IS SENT AS THE SHEET STATES IT — a radius and a side — and
            the server turns it into the bulge it stores. Sending the bulge from
            here would mean the browser had decided what shape the boundary is,
            and the browser is the one party in this exchange whose arithmetic
            nothing re-checks.

            Only in traverse mode, and only where the curve resolves: a radius
            too small to span its own boundary already has the form refusing to
            submit, and sending it anyway would trade a sentence on the screen
            for a 422 from the API.
          */
          ...(shape === 'edges' && d.curve !== '' && walk.arcs[seq]?.refusal === null
            ? { arc: { radiusM: d.radiusM, bulgesRight: d.curve === 'right' } }
            : {}),
        })),
        ...(statedArea ? { statedAreaM2: statedArea } : {}),
        /*
          THE SHEET, IF STEP 0 READ ONE — the bytes, not the numbers off them.

          This is what makes the affection plan's own FAR bind the run instead of
          being displayed and dropped. The server parses it again and builds the
          rules from what IT read, so the citation on every one of them names a
          box in a document this browser did not vouch for.
        */
        ...(prefill?.attachment ? { affectionPlan: prefill.attachment } : {}),
      });
      const view = await api.getPlot(actor, created.plotId);
      /* It is a plot now, with an id and a record of its own. Leaving the draft
         behind would offer to restore a form the reader has already finished. */
      draft.discard();
      onCreated(created, view);
    } catch (err) {
      if (err instanceof ApiError) onError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel" onSubmit={submit}>
      {draft.recovered ? (
        <div className="callout pf-draft" role="status">
          <div className="callout__body">
            <strong>{t.draft.title}</strong>
            {t.draft.savedBefore}
            <span className="value">{draft.recovered.updatedAt.slice(0, 16).replace('T', ' ')}</span>
            {t.draft.savedAfter}
          </div>
          <div className="pf-draft__actions">
            <button type="button" className="button button--sm" onClick={applyRecovered}>
              {t.draft.restore}
            </button>
            <button type="button" className="button button--sm" onClick={draft.discard}>
              {t.draft.discard}
            </button>
          </div>
        </div>
      ) : null}

      {/* The save state is reported and never celebrated. "Saved" is a fact; a tick
          that appears and fades is a claim the reader cannot check afterwards. */}
      <p className="pf-draft__state muted" aria-live="polite">
        {draft.state === 'saving' ? t.save.saving : null}
        {draft.state === 'saved' && draft.savedAt ? t.save.saved(draft.savedAt.slice(11, 16)) : null}
        {draft.state === 'local-only' ? t.save.localOnly : null}
        {draft.state === 'error' ? t.save.error : null}
      </p>
      <header className="panel__header">
        <div>
          <h2 className="panel__title">{t.title}</h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      {prefill ? (
        <div className="callout callout--ok">
          <strong>{t.carried.title}</strong>
          {t.carried.body(AREA_TOLERANCE)}
        </div>
      ) : null}

      {/* WHAT THE SHEET LEFT OUT, SAID WHERE THE READINGS ARE OFFERED. A panel
          that lists what a document states and stays silent about what it omits
          reads as a complete reading — the `DJAZ1MED12RES011` failure, in a
          different field. */}
      {prefill?.edges && prefill.edges.missing.length > 0 ? (
        <p className="fine-print">{t.roles.missing}</p>
      ) : null}

      <div className="field-group">
        <p className="field-group__legend">{t.which.legend}</p>
        <div className="grid grid--2">
        <div className="field">
          <label htmlFor="plot-number">{t.which.plotNumber}</label>
          <input
            id="plot-number"
            className="input"
            value={plotNumber}
            onChange={(e) => setPlotNumber(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="community">{t.which.community}</label>
          <input
            id="community"
            className="input"
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            placeholder={t.which.communityPlaceholder}
            required
          />
          <p className="field__help">{t.which.communityHelp}</p>
        </div>
        </div>
      </div>

      <fieldset className="field-group pf-shape">
        <legend className="field-group__legend">{t.shape.legend}</legend>
        {/* A radio pair rather than a segmented button: these are two answers to
            one question, the reader can be on only one of them, and a radio group
            is the control a screen reader already knows how to say that about. */}
        <div className="pf-shape__choices">
          <label className="pf-shape__choice">
            <input
              type="radio"
              name="plot-shape"
              value="rectangle"
              checked={shape === 'rectangle'}
              onChange={() => setShape('rectangle')}
            />
            <span>
              <strong>{t.shape.rectangle}</strong>
              <span className="field__help">{t.shape.rectangleHelp}</span>
            </span>
          </label>
          <label className="pf-shape__choice">
            <input
              type="radio"
              name="plot-shape"
              value="edges"
              checked={shape === 'edges'}
              onChange={toEdges}
            />
            <span>
              <strong>{t.shape.edges}</strong>
              <span className="field__help">{t.shape.edgesHelp}</span>
            </span>
          </label>
          <label className="pf-shape__choice">
            <input
              type="radio"
              name="plot-shape"
              value="map"
              checked={shape === 'map'}
              onChange={() => setShape('map')}
            />
            <span>
              <strong>{t.shape.map}</strong>
              <span className="field__help">{t.shape.mapHelp}</span>
            </span>
          </label>
        </div>
      </fieldset>

      {/*
        THE TRACER, AND IT IS LOADED ONLY WHEN IT IS ASKED FOR.

        maplibre and its GL context are the heaviest thing in this bundle and the
        plots that are rectangles never need them, so the component mounts on the
        mode rather than on the page. Unmounting on the way out is also what
        releases the context: a browser caps how many live WebGL contexts a
        document may hold, and a map left mounted behind a hidden panel spends one
        of them for a reader who went back to typing.
      */}
      {shape === 'map' ? (
        <PlotMap
          onTraced={applyTrace}
          busy={busy}
          {...(statedArea ? { statedAreaM2: statedArea } : {})}
        />
      ) : null}

      {traced > 0 && shape === 'edges' ? (
        <div className="callout" role="status">
          <div className="callout__body">{t.shape.traced(String(traced))}</div>
        </div>
      ) : null}

      <div className="field-group">
        <p className="field-group__legend">{t.size.legend}</p>
        <div className="grid grid--2">
        {shape === 'rectangle' ? (
        <>
        <div className="field">
          <label htmlFor="width">{t.size.width}</label>
          <input
            id="width"
            className="input input--num"
            inputMode="decimal"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="depth">{t.size.depth}</label>
          <input
            id="depth"
            className="input input--num"
            inputMode="decimal"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            required
          />
        </div>
        </>
        ) : null}

        <div className="field">
          <label htmlFor="stated-area">
            {t.size.stated}
            <span className="muted">{t.size.optional}</span>
          </label>
          <input
            id="stated-area"
            className="input input--num"
            inputMode="decimal"
            value={statedArea}
            onChange={(e) => setStatedArea(e.target.value)}
            placeholder={computedArea ?? ''}
          />
          <p className="field__help">{t.size.statedHelp(AREA_TOLERANCE)}</p>
        </div>

        {computedArea ? (
          <div className="field field--readout">
            <span className="field__readout-label">{t.size.computed}</span>
            <span className="value field__readout-value">
              {computedArea}
              <span className="value__unit">m²</span>
            </span>
          </div>
        ) : null}
        </div>
      </div>

      <h3 className="panel__section">
        {t.edges.title}
        {unclassified > 0 ? (
          <span className="chip chip--warn">{t.edges.unclassified(String(unclassified))}</span>
        ) : (
          <span className="chip chip--ok">{t.edges.allClassified}</span>
        )}
      </h3>

      <div className="grid grid--2">
        <ul className="edge-list">
          {edges.map((edge, i) => (
            <li key={i} className={edge.classification === '' ? 'edge-list__item is-unset' : 'edge-list__item'}>
              <span className="edge-list__num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="edge-list__controls">
                {shape === 'edges' ? (
                  <>
                    <div className="field field--compact">
                      <label htmlFor={`edge-${i}-length`}>{t.traverse.length}</label>
                      <input
                        id={`edge-${i}-length`}
                        className="input input--num"
                        inputMode="decimal"
                        value={edge.lengthM}
                        onChange={(e) =>
                          setEdges((prev) =>
                            prev.map((p, j) => (j === i ? { ...p, lengthM: e.target.value } : p)),
                          )
                        }
                        required
                      />
                    </div>
                    <div className="field field--compact">
                      <label htmlFor={`edge-${i}-bearing`}>{t.traverse.bearing}</label>
                      <input
                        id={`edge-${i}-bearing`}
                        className="input input--num"
                        inputMode="decimal"
                        value={edge.bearingDeg}
                        onChange={(e) =>
                          setEdges((prev) =>
                            prev.map((p, j) =>
                              j === i ? { ...p, bearingDeg: e.target.value } : p,
                            ),
                          )
                        }
                        required
                      />
                      {i === 0 ? <p className="field__help">{t.traverse.bearingHelp}</p> : null}
                    </div>
                    {/*
                      THE SIDE IS A WORD, NOT A SIGN.

                      `bulge = tan(sweep / 4)` is what the engine stores and what
                      a DXF file carries, and its sign is the side. A sign is
                      also the thing a reader inverts without noticing, and an
                      inverted curve is a plot that is the right size and the
                      wrong shape — which passes the area check. So the question
                      is asked the way somebody standing on the boundary would
                      answer it, and the conversion happens on the server.
                    */}
                    <div className="field field--compact">
                      <label htmlFor={`edge-${i}-curve`}>{t.traverse.curve}</label>
                      <select
                        id={`edge-${i}-curve`}
                        className="input"
                        value={edge.curve}
                        onChange={(e) =>
                          setEdges((prev) =>
                            prev.map((p, j) =>
                              j === i
                                ? {
                                    ...p,
                                    curve: e.target.value as EdgeDraft['curve'],
                                    radiusM: e.target.value === '' ? '' : p.radiusM,
                                  }
                                : p,
                            ),
                          )
                        }
                      >
                        <option value="">{t.traverse.straight}</option>
                        <option value="right">{t.traverse.bowsRight}</option>
                        <option value="left">{t.traverse.bowsLeft}</option>
                      </select>
                      {i === 0 ? <p className="field__help">{t.traverse.curveHelp}</p> : null}
                    </div>
                    {edge.curve === '' ? null : (
                      <div className="field field--compact">
                        <label htmlFor={`edge-${i}-radius`}>{t.traverse.radius}</label>
                        <input
                          id={`edge-${i}-radius`}
                          className="input input--num"
                          inputMode="decimal"
                          value={edge.radiusM}
                          onChange={(e) =>
                            setEdges((prev) =>
                              prev.map((p, j) =>
                                j === i ? { ...p, radiusM: e.target.value } : p,
                              ),
                            )
                          }
                          required
                        />
                        {/*
                          WHAT THE RADIUS IMPLIES, BESIDE IT.

                          The sheet prints the arc's length; this form asks for
                          the radius, so the arc length is the figure a reader
                          checks one against the other. Printed to the millimetre
                          next to the box rather than left for the plot summary,
                          because a mistyped radius is cheapest to catch in the
                          second it was mistyped.
                        */}
                        <p className="field__help" role="status">
                          {arcNote(t, walk.arcs[i])}
                        </p>
                      </div>
                    )}
                  </>
                ) : null}
                {/*
                  THE SHEET'S READING, APPLIED BY THE ONE ANSWER IT CANNOT GIVE.

                  Above the classification, not instead of it: the select below
                  stays, stays required, and stays editable, so a reader who
                  disagrees with the sheet overrules it in the control they would
                  have used anyway. This row only fills that control, and says
                  where the value came from while it is filled.
                */}
                {proposals ? (
                  <div className="field field--compact pf-role">
                    <label htmlFor={`edge-${i}-role`}>{t.roles.which(String(i + 1))}</label>
                    <select
                      id={`edge-${i}-role`}
                      className="input"
                      value={roles[i] ?? ''}
                      onChange={(e) =>
                        assignRole(i, e.target.value as '' | 'FRONT' | 'SIDE' | 'REAR')
                      }
                    >
                      <option value="">{t.roles.choose}</option>
                      {proposals.map((p) => (
                        <option key={p.role} value={p.role}>
                          {t.roles[p.role]}
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const r = roles[i];
                      const p = r ? proposals.find((q) => q.role === r) : undefined;
                      if (!p) return i === 0 ? <p className="field__help">{t.roles.help}</p> : null;
                      return (
                        /* THE WORD TRAVELS WITH THE INK. §13.1, and
                           `parking-page.test.tsx` asserts the rule by name for its
                           own page: amber without the word beside it teaches a
                           reader a colour instead of a fact, and a reader who
                           cannot separate the hues is taught nothing at all. */
                        <p className="field__help" data-state="assumed">
                          <span className="chip">{t.roles.assumed}</span>
                          {t.roles.appliesBefore}
                          <span className="value">{p.classification.value}</span>
                          {t.roles.appliesAfter}
                          {p.evidence[0] ? ` ${t.roles.evidence(String(p.evidence[0].page))}` : ''}
                        </p>
                      );
                    })()}
                  </div>
                ) : null}

                <div className="field field--compact">
                  <label htmlFor={`edge-${i}-class`}>{t.edges.faces(String(i + 1))}</label>
                  <select
                    id={`edge-${i}-class`}
                    className="input"
                    value={edge.classification}
                    onChange={(e) =>
                      setEdges((prev) =>
                        prev.map((p, j) =>
                          j === i
                            ? {
                                ...p,
                                classification: e.target.value as Classification,
                                roadHierarchy:
                                  e.target.value === 'ROAD' ? p.roadHierarchy : '',
                              }
                            : p,
                        ),
                      )
                    }
                    required
                  >
                    <option value="">{t.edges.choose}</option>
                    <option value="ROAD">{t.edges.classes.ROAD}</option>
                    <option value="ADJACENT_PLOT">{t.edges.classes.ADJACENT_PLOT}</option>
                    <option value="OPEN_SPACE">{t.edges.classes.OPEN_SPACE}</option>
                    <option value="OTHER">{t.edges.classes.OTHER}</option>
                  </select>
                </div>

                {edge.classification === 'ROAD' ? (
                  <div className="field field--compact">
                    <label htmlFor={`edge-${i}-road`}>{t.edges.roadType}</label>
                    <select
                      id={`edge-${i}-road`}
                      className="input"
                      value={edge.roadHierarchy}
                      onChange={(e) =>
                        setEdges((prev) =>
                          prev.map((p, j) =>
                            j === i ? { ...p, roadHierarchy: e.target.value as Hierarchy } : p,
                          ),
                        )
                      }
                      required
                    >
                      <option value="">{t.edges.choose}</option>
                      <option value="ARTERIAL">{t.edges.hierarchy.ARTERIAL}</option>
                      <option value="COLLECTOR">{t.edges.hierarchy.COLLECTOR}</option>
                      <option value="LOCAL">{t.edges.hierarchy.LOCAL}</option>
                      <option value="ACCESS">{t.edges.hierarchy.ACCESS}</option>
                    </select>
                    <p className="field__help">{t.edges.roadHelp}</p>
                  </div>
                ) : null}
                {shape === 'edges' && edges.length > 3 ? (
                  /*
                    THE ACCESSIBLE NAME NAMES THE BOUNDARY, and the visible word
                    is inside it, which is what 2.5.3 requires: five buttons
                    reading "Remove" are five identical rows in a screen reader's
                    control list, and the one that removes boundary 4 is not
                    findable among them.
                  */
                  <button
                    type="button"
                    className="button button--sm edge-list__remove"
                    aria-label={t.traverse.removeEdge(String(i + 1))}
                    onClick={() => setEdges((prev) => prev.filter((_, j) => j !== i))}
                  >
                    {t.traverse.remove}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <PlotCanvas
          /*
            THE DRAWING STROKES THE RING; THE FORM SUBMITS THE CORNERS.

            They are the same list until a boundary curves, and then the drawing
            has to hold the pieces the curve was broken into while the request
            still carries the two surveyed corners and a radius. Sending the
            pieces would be this browser deciding the shape of the boundary and
            the server agreeing with it.
          */
          vertices={shape === 'edges' ? walk.drawnRing : vertices}
          edges={edges.map((e, seq) => ({
            seq,
            classification: (e.classification || 'OTHER') as 'OTHER',
            roadHierarchy: e.roadHierarchy || null,
            /*
              THE LENGTH DRAWN, NOT THE LENGTH TYPED. They differ on the last
              boundary of a traverse that does not close, and labelling the
              drawing with the typed figure would put a number on a line that is
              not that long.
            */
            lengthM:
              shape === 'edges'
                ? (walk.drawnLengthsM[seq] ?? e.lengthM)
                : seq % 2 === 0
                  ? width
                  : depth,
            /* The legend quotes the curve, and only once the radius resolves —
               a half-typed one would flick figures in and out on every
               keystroke. The shape itself comes from `drawnRing` above. */
            ...(shape === 'edges' && e.curve !== '' && walk.arcs[seq]?.refusal === null
              ? {
                  arc: {
                    radiusM: e.radiusM,
                    arcLengthM: walk.arcs[seq]!.arcLengthM,
                    sweepDeg: walk.arcs[seq]!.sweepDeg,
                    bulgesRight: e.curve === 'right',
                  },
                }
              : {}),
            ...(shape === 'edges' && walk.spans[seq]
              ? { ringFrom: walk.spans[seq]!.from, ringSpan: walk.spans[seq]!.count }
              : {}),
          }))}
          areaM2={computedArea ?? '0'}
        />
      </div>

      <div className="pf-traverse">
        {shape === 'edges' ? (
          <>
            <button type="button" className="button button--sm" onClick={addEdge}>
              {t.traverse.add}
            </button>
            {/*
              THE CLOSURE, REPORTED AND NEVER ADJUSTED.

              Every survey package offers to distribute a misclose across the
              legs, which changes numbers a person typed to make a figure look
              clean. `walkTraverse` does not, and this is where the consequence
              is said in words: the ring closes the last boundary back to the
              first corner, so that boundary is drawn at a length nobody
              entered. Stating the residue without stating that would be
              showing the arithmetic and hiding what was done with it.

              `role="status"` rather than an alert: a traverse in progress does
              not close, and a reader typing the second of five boundaries is
              not making a mistake.
            */}
            <p className="pf-traverse__closure" role="status">
              {!walk.usable
                ? edges.length < 3
                  ? t.traverse.tooFew
                  : t.traverse.unusable
                : walk.closureRatio === null
                  ? t.traverse.closes
                  : t.traverse.misclose(walk.miscloseM, walk.closureRatio)}
            </p>
            {walk.usable && walk.closureRatio !== null ? (
              <p className="pf-traverse__consequence">
                {t.traverse.lastLeg(walk.lastLegM, edges[edges.length - 1]?.lengthM ?? '')}
              </p>
            ) : null}
          </>
        ) : null}
        </div>


      <footer className="panel__footer">
        <button type="submit" className="button button--primary" disabled={!complete || busy}>
          {busy ? t.submit.busy : t.submit.idle}
        </button>
        {!complete ? (
          <p className="fine-print">{t.submit.incomplete}</p>
        ) : null}
      </footer>
    </form>
  );
}
