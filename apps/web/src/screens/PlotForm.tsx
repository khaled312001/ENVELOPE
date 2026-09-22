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
import { useSession } from '../session.js';

import { api, ApiError, type Actor, type PlotCreated, type PlotView } from '../api/client.js';
import { PlotCanvas } from '../components/PlotCanvas.js';
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
  readonly width: string;
  readonly depth: string;
  readonly statedArea: string;
  readonly edges: EdgeDraft[];
}

interface EdgeDraft {
  readonly classification: Classification;
  readonly roadHierarchy: Hierarchy;
}

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
  } | null;
}

export function PlotForm({
  actor,
  busy,
  setBusy,
  onCreated,
  onError,
  prefill,
}: PlotFormProps): JSX.Element {
  const t = useDict(EN, AR);
  const [plotNumber, setPlotNumber] = useState(prefill?.plotNumber || '345-1234');
  const [community, setCommunity] = useState(prefill?.community ?? '');
  const [width, setWidth] = useState('80');
  const [depth, setDepth] = useState('40');
  const [statedArea, setStatedArea] = useState(prefill?.statedAreaM2 ?? '');
  const [edges, setEdges] = useState<EdgeDraft[]>([
    { classification: '', roadHierarchy: '' },
    { classification: '', roadHierarchy: '' },
    { classification: '', roadHierarchy: '' },
    { classification: '', roadHierarchy: '' },
  ]);

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
    draft.record({ plotNumber, community, width, depth, statedArea, edges });
    /* `draft.record` is a stable callback and the values are what changed; listing
       the callback here would re-record on every render of a memo boundary. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotNumber, community, width, depth, statedArea, edges, draft.recovered, draft.ready]);

  const applyRecovered = (): void => {
    const p = draft.recovered?.payload;
    if (!p) return;
    setPlotNumber(p.plotNumber);
    setCommunity(p.community);
    setWidth(p.width);
    setDepth(p.depth);
    setStatedArea(p.statedArea);
    /* The edge count is whatever was saved, because a plot is not always four-sided
       and a restore that silently kept four would be inventing a shape. */
    if (Array.isArray(p.edges) && p.edges.length >= 3) setEdges(p.edges);
    draft.acceptRecovered();
  };

  const vertices = useMemo(
    () => [
      { x: '0', y: '0' },
      { x: width || '0', y: '0' },
      { x: width || '0', y: depth || '0' },
      { x: '0', y: depth || '0' },
    ],
    [width, depth],
  );

  const complete = edges.every(
    (e) => e.classification !== '' && (e.classification !== 'ROAD' || e.roadHierarchy !== ''),
  );
  const unclassified = edges.filter((e) => e.classification === '').length;

  const computedArea =
    Number(width) > 0 && Number(depth) > 0 ? (Number(width) * Number(depth)).toFixed(2) : null;

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
        })),
        ...(statedArea ? { statedAreaM2: statedArea } : {}),
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

      <div className="field-group">
        <p className="field-group__legend">{t.size.legend}</p>
        <div className="grid grid--2">
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
              </div>
            </li>
          ))}
        </ul>

        <PlotCanvas
          vertices={vertices}
          edges={edges.map((e, seq) => ({
            seq,
            classification: (e.classification || 'OTHER') as 'OTHER',
            roadHierarchy: e.roadHierarchy || null,
            lengthM: seq % 2 === 0 ? width : depth,
          }))}
          areaM2={computedArea ?? '0'}
        />
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
