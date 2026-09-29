/**
 * The drawing set, on screen.
 *
 * Every sheet here is composed by `@envelope/sheets` from the engine's
 * `BuildingModel` — the same display list the report prints, the DXF writes and
 * the parity gate counts. This file draws it with React and adds three things:
 * a way to pick a sheet, a way from any drawn element to its derivation, and the
 * sheet's values as real text a keyboard can reach.
 *
 * WHY REACT RATHER THAN THE SVG STRING. `sheetSvg` exists and would render the
 * same picture in one line. It would also make every element unreachable: a bay
 * inside an injected string has no handler, and clicking a bay to see where it
 * came from is the point of drawing it from the engine. So each element is a
 * React node — but its coordinates, its path data and its class names all come
 * from the functions `sheetSvg` itself calls. The only thing the two renderers
 * can differ in is the element that wraps a path, and the parity gate checks
 * that they do not differ in anything else.
 *
 * WHY THE VALUES ARE LISTED BELOW THE DRAWING. A click target inside a drawing is
 * a pointer-only route to a derivation — a hundred bays are not a hundred tab
 * stops anybody wants. So the drawing is one image with a name, and everything
 * the title strip quotes is repeated beneath it as a traced value, in the same
 * ink, where Tab reaches it.
 *
 * The sheet is always left to right, whatever the page's direction: it is a
 * drawing, and a dimension read right to left is a different dimension.
 */

import type { BuildingModel } from '@envelope/core';
import {
  composeSheets,
  fillFor,
  hatchPattern,
  itemClass,
  type ModelItem,
  type PaperItem,
  paperClass,
  pathData,
  ROLE_STYLE,
  SHEET_CSS,
  type Sheet,
  type SheetView,
  type StripFact,
  symbolPathData,
  textPlacement,
} from '@envelope/sheets';
import { type KeyboardEvent, type MouseEvent, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { AR } from '../i18n/drawingSet.ar.js';
import { EN } from '../i18n/drawingSet.en.js';
import { useDict } from '../i18n/locale.js';
import { AR as TRACED_AR } from '../i18n/traced.ar.js';
import { EN as TRACED_EN } from '../i18n/traced.en.js';
import { EngineText } from './TracedValue.js';

/*
  THE CONTROLS ROUND A SHEET ARE COPY AND LIVE IN `i18n/drawingSet.*.ts`. The sheet
  is not: its geometry, number, title, facts and notes come from the display list the
  report prints and the DXF writes, and they render here as the sheet states them in
  both languages — inside `EngineText` where they sit in HTML, and untouched inside
  the SVG, which is the same markup in every language.
*/

/** The slice of a run a drawing needs. */
export interface DrawableRun {
  readonly runId: string;
  readonly plot: { readonly plotNumber: string; readonly community: string };
  readonly building?: BuildingModel;
  /** When the figures were computed. The title block's date, on screen as on paper. */
  readonly issuedAt: string;
  /** The gate record, for the one field of it a title block prints: who signed G4. */
  readonly gates?: Record<string, { readonly actorName: string; readonly at: string }>;
}

/**
 * The run's sheets, composed once per run.
 *
 * Composition is pure and deterministic, so memoising on the run id is safe:
 * the same run always composes the same set, byte for byte.
 */
export function useSheets(run: DrawableRun): readonly Sheet[] {
  const { runId, building, issuedAt } = run;
  const { plotNumber, community } = run.plot;
  // The title block's CHECKED field. The screen reads the G4 signatory out of
  // the same record the export does, so the two title blocks cannot disagree
  // about whether anybody has reviewed the run.
  const checkedBy = run.gates?.['G4_REVIEWER_NAMED']?.actorName;
  return useMemo(
    () =>
      building
        ? composeSheets(building, {
            plotNumber,
            community,
            runId,
            issuedAt,
            ...(checkedBy ? { checkedBy } : {}),
          })
        : [],
    [building, plotNumber, community, runId, issuedAt, checkedBy],
  );
}

/** `useId` returns `:r0:`, and a colon inside `url(#…)` is not an id every renderer resolves. */
const cssId = (raw: string): string => raw.replace(/[^A-Za-z0-9_-]/g, '');

export function DrawingSet({
  run,
  onInspect,
  initialKind = 'PARKING',
}: {
  readonly run: DrawableRun;
  readonly onInspect: (nodeId: string) => void;
  /** Which kind of sheet opens first. The parking step opens on a parking level. */
  readonly initialKind?: Sheet['kind'];
}): JSX.Element {
  const t = useDict(EN, AR);
  const sheets = useSheets(run);
  const base = cssId(useId());
  const [chosen, setChosen] = useState<string | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!run.building) {
    return (
      <p className="muted">{t.stored}</p>
    );
  }
  if (sheets.length === 0) return <p className="muted">{t.none}</p>;

  const fallback = sheets.find((s) => s.kind === initialKind) ?? sheets[0]!;
  const active = sheets.find((s) => s.id === chosen) ?? fallback;
  const activeIndex = sheets.indexOf(active);

  // Roving tabindex with automatic activation (WAI-ARIA tabs): a sheet is cheap
  // to draw, so arrowing to it shows it.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const last = sheets.length - 1;
    const next =
      event.key === 'ArrowRight' ? (activeIndex === last ? 0 : activeIndex + 1)
      : event.key === 'ArrowLeft' ? (activeIndex === 0 ? last : activeIndex - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setChosen(sheets[next]!.id);
    tabs.current[next]?.focus();
  };

  const tabId = (s: Sheet): string => `${base}-tab-${s.id}`;
  const panelId = `${base}-panel`;

  return (
    <div className="sheet-set">
      <div
        className="sheet-set__tabs"
        role="tablist"
        aria-label={t.tabs}
        onKeyDown={onKeyDown}
      >
        {sheets.map((s, i) => {
          const selected = s === active;
          return (
            <button
              key={s.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={tabId(s)}
              className="sheet-tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setChosen(s.id)}
            >
              <span className="sheet-tab__number">
                <EngineText>{s.number}</EngineText>
              </span>
              <span className="sheet-tab__title">
                <EngineText>{s.title}</EngineText>
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(active)} className="sheet-set__panel">
        {/* Keyed, so a new sheet opens fitted rather than at the last one's zoom. */}
        <SheetView key={active.id} sheet={active} idPrefix={`${base}-${active.id}`} onInspect={onInspect} />
        <SheetFacts sheet={active} onInspect={onInspect} />
      </div>
    </div>
  );
}

/**
 * Zoom steps, as multiples of the fitted width.
 *
 * Fitted to a desktop panel an A3 sheet is about 2.7 px per paper millimetre, so a
 * 1.8 mm bay number is five pixels: the sheet can be seen but not read. The
 * figures are listed beneath it as text; the drawing still has to be legible, or
 * it is a picture of a drawing. 3× puts a bay number at about fifteen pixels.
 */
const ZOOMS = [1, 1.5, 2, 3, 4] as const;

/** A layout effect in the browser; a plain one when the screens are rendered in a test. */
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * One sheet, A3 landscape, drawn in paper millimetres.
 *
 * Wide sheets scroll inside their own region on a narrow screen rather than
 * shrinking to a thumbnail: an A3 sheet at phone width puts a 2 mm label at under
 * two pixels, which is a picture of a drawing rather than a drawing.
 */
export function SheetView({
  sheet,
  idPrefix,
  onInspect,
}: {
  readonly sheet: Sheet;
  readonly idPrefix: string;
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const hatchId = `${idPrefix}-hatch`;
  const clipId = `${idPrefix}-clip`;
  const { widthMm: w, heightMm: h } = sheet.paper;
  const v = sheet.viewport;

  const [step, setStep] = useState(0);
  const zoom = ZOOMS[step]!;
  const scroller = useRef<HTMLDivElement>(null);
  // The point at the centre of the view, as fractions of the drawing, taken
  // before a zoom and restored after it — so zooming enlarges what was being
  // looked at rather than sending the reader back to the top-left corner.
  const anchor = useRef<{ x: number; y: number } | null>(null);
  const zoomTo = (next: number): void => {
    const el = scroller.current;
    if (el) {
      anchor.current = {
        x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
        y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
      };
    }
    setStep(Math.max(0, Math.min(ZOOMS.length - 1, next)));
  };
  useBrowserLayoutEffect(() => {
    const el = scroller.current;
    const a = anchor.current;
    if (!el || !a) return;
    el.scrollLeft = a.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = a.y * el.scrollHeight - el.clientHeight / 2;
    anchor.current = null;
  }, [step]);

  // One handler for the whole drawing. Every element drawn from a traced value
  // carries its node; whichever was clicked is the one opened.
  const onClick = (event: MouseEvent<SVGSVGElement>): void => {
    const target = event.target instanceof Element ? event.target.closest('[data-node]') : null;
    const node = target?.getAttribute('data-node');
    if (node) onInspect(node);
  };

  return (
    <figure className="sheet-view">
      <div className="sheet-view__tools" role="group" aria-label={t.zoomGroup(sheet.number)}>
        <button type="button" className="button button--ghost" onClick={() => zoomTo(step - 1)} disabled={step === 0}>
          {t.zoomOut}
        </button>
        <span className="sheet-view__zoom" aria-live="polite">
          {step === 0 ? t.fitted : t.zoomed(String(zoom * 100))}
        </span>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => zoomTo(step + 1)}
          disabled={step === ZOOMS.length - 1}
        >
          {t.zoomIn}
        </button>
        {step > 0 ? (
          <button type="button" className="button button--ghost" onClick={() => zoomTo(0)}>
            {t.fit}
          </button>
        ) : null}
      </div>
      <div
        ref={scroller}
        className={`sheet-view__scroller${step > 0 ? ' is-zoomed' : ''}`}
        role="region"
        aria-label={t.scroller(sheet.number, sheet.title)}
        tabIndex={0}
      >
        <svg
          className="sheet-view__svg"
          style={step > 0 ? { inlineSize: `${zoom * 100}%`, minInlineSize: `${40 * zoom}rem` } : undefined}
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label={t.drawing(sheet.number, sheet.title, `1:${sheet.view.scale}`)}
          onClick={onClick}
        >
          {/* The sheet's own stylesheet, the same string the SVG export embeds.
              A constant of ours, so it is set as HTML rather than escaped as text:
              React escapes the quotes in the font stack otherwise. */}
          <style dangerouslySetInnerHTML={{ __html: SHEET_CSS }} />
          <defs dangerouslySetInnerHTML={{ __html: hatchPattern(hatchId) }} />
          <clipPath id={clipId}>
            <rect x={v.x} y={v.y} width={v.width} height={v.height} />
          </clipPath>
          <g className="sh-model" clipPath={`url(#${clipId})`}>
            {sheet.items.map((item, i) => (
              // Index keys are safe here: a sheet's items are immutable, and the
              // list is replaced whole when the sheet changes.
              <ModelElement key={`${sheet.id}-${i}`} item={item} view={sheet.view} hatchId={hatchId} />
            ))}
          </g>
          <g className="sh-paper">
            {sheet.paperItems.map((item, i) => (
              <PaperElement key={`${sheet.id}-p${i}`} item={item} hatchId={hatchId} />
            ))}
          </g>
        </svg>
      </div>
      <figcaption className="fine-print sheet-view__hint">{t.hint}</figcaption>
    </figure>
  );
}

function ModelElement({
  item,
  view,
  hatchId,
}: {
  readonly item: ModelItem;
  readonly view: SheetView;
  readonly hatchId: string;
}): JSX.Element {
  const cls = itemClass(item);
  if (item.kind === 'shape') {
    const style = ROLE_STYLE[item.role];
    return (
      <path
        className={cls}
        d={pathData(item.points, item.closed, view)}
        strokeWidth={style.strokeMm}
        strokeDasharray={style.dash}
        fill={fillFor(item.role, hatchId)}
        data-bay={item.bay}
        data-node={item.source?.node}
      >
        {item.name ? <title>{item.name}</title> : null}
      </path>
    );
  }
  if (item.kind === 'symbol') {
    return (
      <path
        className={cls}
        d={symbolPathData(item, view)}
        strokeWidth={ROLE_STYLE[item.role].strokeMm}
        data-symbol={item.symbol}
        data-car={item.bay}
      />
    );
  }
  const t = textPlacement(item.at, item.rotationDeg, view);
  return (
    <text
      className={cls}
      x={round2(t.x)}
      y={round2(t.y)}
      fontSize={item.sizeMm}
      textAnchor={item.anchor}
      dominantBaseline="central"
      transform={t.transform}
    >
      {item.value}
    </text>
  );
}

function PaperElement({ item, hatchId }: { readonly item: PaperItem; readonly hatchId: string }): JSX.Element {
  const cls = paperClass(item);
  if (item.kind === 'poly') {
    return (
      <path
        className={cls}
        d={pathData(item.points, item.closed, null)}
        fill={item.swatch ? fillFor(item.swatch.role, hatchId) : undefined}
        strokeDasharray={item.swatch ? ROLE_STYLE[item.swatch.role].dash : undefined}
      />
    );
  }
  return (
    <text
      className={cls}
      x={round2(item.at.x)}
      y={round2(item.at.y)}
      fontSize={item.sizeMm}
      textAnchor={item.anchor}
      fontWeight={item.bold ? 700 : undefined}
      data-field={item.field}
    >
      {item.value}
    </text>
  );
}

/** The same rounding `sheetSvg` writes, so the two renderers place text identically. */
const round2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * What the sheet quotes, as traced values, and what it says in words.
 *
 * The ink matches the strip: an ASSUMED figure is amber here because it is amber
 * there, and the class is spelled out in the button's name so the colour is
 * never the only carrier.
 */
function SheetFacts({
  sheet,
  onInspect,
}: {
  readonly sheet: Sheet;
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  return (
    <div className="sheet-facts">
      <dl className="kv kv--grid">
        {sheet.facts.map((f) => (
          <div key={f.label}>
            <dt>
              <EngineText>{f.label}</EngineText>
            </dt>
            <dd>
              <FactValue fact={f} onInspect={onInspect} />
            </dd>
          </div>
        ))}
      </dl>
      {sheet.notes.length > 0 ? (
        <>
          <h3 className="panel__subheading">{t.notes}</h3>
          <ul className="sheet-facts__notes">
            {sheet.notes.map((n) => (
              <li key={n}>
                <EngineText>{n}</EngineText>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function FactValue({
  fact,
  onInspect,
}: {
  readonly fact: StripFact;
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const classes = useDict(TRACED_EN, TRACED_AR);
  const { node, provenanceClass: cls } = fact;
  // An untraced fact is words — the level's name — not a quantity, so it is not
  // set as one: `.value` never wraps, and at 320px this line then widened the page.
  if (!node || !cls) {
    return (
      <span>
        <EngineText>{fact.value}</EngineText>
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`traced traced--${cls.toLowerCase()}`}
      onClick={() => onInspect(node)}
      aria-label={t.factLabel(fact.label, fact.value, classes.classDescription[cls], classes.inspectAction)}
    >
      <span className="value">{fact.value}</span>
      <span className="traced__marker" aria-hidden="true">
        {cls === 'DERIVED' ? '§' : null}
      </span>
    </button>
  );
}
