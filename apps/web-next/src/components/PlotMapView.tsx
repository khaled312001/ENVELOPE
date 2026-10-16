import { Eye, EyeOff, Hand, Info, Layers, Loader2, MapPinned, MousePointerClick, Move, PenLine, Plus, Ruler, Search, Trash2, Undo2 } from 'lucide-react';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, MapLayerTouchEvent, PointLike } from 'maplibre-gl';
import MAPLIBRE_WORKER_URL from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { type FormEvent, type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  admitVertex,
  assumedPlacement,
  calibrateUnderlay,
  type CalibrationRefusal,
  compareArea,
  fetchFootprint,
  type FootprintRefusal,
  groundToSheetPoint,
  type PlaceHit,
  ringReadout,
  searchPlaces,
  type SheetPoint,
  type UnderlayFit,
  type UnderlayPlacement,
  underlayCorners,
} from '@web/components/PlotMap.js';
import { legBetween, type LngLat } from '@web/geo.js';

import { cn } from '../lib/cn.js';
import { grouped } from '../lib/figures.js';
import { useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/primitives.js';
import {
  deleteCorner,
  EMPTY_TRACE,
  insertCorner,
  type LengthRefusal,
  liveLength,
  type MapTrace,
  parseLength,
  translateBy,
  translateTrace,
  withCornerAt,
  withEdgeLength,
} from './map-trace.js';
import { rasterSheet } from '../lib/sheet-raster.js';
import { hideUnderlay, type Quad, type SheetUnderlay, showUnderlay, UNDERLAY_LONG_SIDE_PX } from './sheet-underlay.js';

export { EMPTY_TRACE, type MapTrace } from './map-trace.js';
export type { SheetUnderlay } from './sheet-underlay.js';

/*
  DRAWING THE PLOT ON THE GROUND.

  The classic studio's map, rebuilt for this one: satellite imagery, a corner per
  click, the first corner clicked again to close, every corner draggable, a
  place search, a building outline picked off OpenStreetMap, and the affection
  plan's own page laid over the imagery and fitted to a printed dimension.

  EVERY NUMBER HERE IS COMPUTED BY THE CLASSIC STUDIO'S OWN FUNCTIONS — the ring
  readout, the area check against the sheet, the calibration, the footprint, the
  search and a boundary set to a typed length are imported from
  `@web/components/PlotMap`, not rewritten. Two front ends that measured one
  trace two ways would sooner or later disagree, and the disagreement would be
  found on a submission. What is new is only the screen around them, and the
  edits in `map-trace.ts`, which measure through the same `legBetween`.

  EVERY EDIT CAN BE UNDONE. A typed length, a moved outline, a deleted or added
  corner, a dragged one, a placed one and a cleared outline each push the trace
  they replaced; Undo takes the last one back.

  NOTHING HERE IS SUBMITTED. "Use this outline" copies the corners into the
  table, as metres on the UTM 40N grid, where the reader classifies every
  boundary and files the plot like any other; the engine measures the area from
  what was filed, never from this trace.
*/

type Tool = 'draw' | 'pan' | 'move' | 'pick';
type Stage = 'sheet-a' | 'ground-a' | 'sheet-b' | 'ground-b' | 'distance';

/* Esri's path is {z}/{y}/{x} — row before column. See the classic map for the warning. */
const ESRI_IMAGERY = 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OSM_RASTER = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
/* The seven emirates, and then the reader says where. A view, not a value: nothing is computed from it. */
const OPENING_VIEW: [number, number] = [54.6, 24.3];
const OPENING_ZOOM = 6.6;
const PLOT_ZOOM = 18;
const CLOSE_PICK_PX = 14;
const FALLBACK_SHEET_WIDTH_M = 200;
/* Close enough that a plot fills a good part of the view. */
const SHEET_ZOOM = 15;
/* One arrow press moves the outline this far on the grid; with Shift, ten times as far. */
const NUDGE_M = 0.5;
/* Undo remembers this many edits. Enough for a session's corrections, not a memory leak. */
const HISTORY = 200;
/* Half a length chip — figure and + — in page pixels, to set it clear of its boundary. */
const LABEL_HALF_W = 40;
const LABEL_HALF_H = 12;

const ID = {
  imagery: 'pm-imagery',
  osm: 'pm-osm',
  shape: 'pm-shape',
  ring: 'pm-ring',
  rubber: 'pm-rubber',
  rubberCase: 'pm-rubber-case',
  points: 'pm-points',
  sheetEdge: 'pm-sheet-edge',
} as const;

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

/** A semantic token's computed value: WebGL cannot read a custom property. `null` leaves the paint out. */
function inkOf(token: string): string | null {
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return v === '' ? null : v;
}

interface EdgeLabel {
  readonly i: number;
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

interface Screen {
  readonly edges: readonly EdgeLabel[];
  readonly corners: readonly { readonly i: number; readonly x: number; readonly y: number }[];
  readonly centre: { readonly x: number; readonly y: number } | null;
}

const NO_SCREEN: Screen = { edges: [], corners: [], centre: null };

const metresText = (m: number): string => `${grouped(m.toFixed(2))} m`;

export function PlotMapView({
  trace,
  onTrace,
  statedAreaM2,
  sheet,
  onUse,
}: {
  readonly trace: MapTrace;
  readonly onTrace: (next: MapTrace) => void;
  /** The area the sheet prints, for the 2% check. Blank is honest. */
  readonly statedAreaM2: string;
  /** The affection plan in use, to lay under the imagery. */
  readonly sheet: SheetUnderlay | null;
  readonly onUse: (trace: MapTrace) => void;
}): JSX.Element {
  const { t, dir } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapState, setMapState] = useState<'pending' | 'ready' | 'unavailable'>('pending');
  const [tilesFailed, setTilesFailed] = useState(false);
  const tilesSeen = useRef(false);

  const [tool, setTool] = useState<Tool>(trace.closed ? 'pan' : 'draw');
  const [streets, setStreets] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<Screen>(NO_SCREEN);

  // Edits: the history Undo walks back, the corner in hand, the boundary being typed.
  const history = useRef<MapTrace[]>([]);
  const [historySize, setHistorySize] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [cornerRefusal, setCornerRefusal] = useState(false);
  const [editing, setEditing] = useState<{ readonly edge: number; readonly text: string; readonly refusal: LengthRefusal | null } | null>(null);
  const [refocusEdge, setRefocusEdge] = useState<number | null>(null);
  // The segment being drawn: where the pointer is, and what it measures from the last corner.
  const pointer = useRef<LngLat | null>(null);
  const rubberShown = useRef(false);
  const [live, setLive] = useState<{ readonly x: number; readonly y: number; readonly text: string } | null>(null);

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<readonly PlaceHit[] | null>(null);

  // The sheet underlay.
  const [underlay, setUnderlay] = useState<{ readonly canvas: HTMLCanvasElement; readonly aspect: number } | null>(null);
  const [underlayState, setUnderlayState] = useState<'idle' | 'drawing' | 'failed'>('idle');
  const [sheetOn, setSheetOn] = useState(true);
  const [zoomedIn, setZoomedIn] = useState(trace.ring.length > 0);
  const [opacity, setOpacity] = useState(60);
  const [placement, setPlacement] = useState<UnderlayPlacement | null>(null);
  const [fit, setFit] = useState<UnderlayFit | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [sheetPicks, setSheetPicks] = useState<readonly SheetPoint[]>([]);
  const [groundPicks, setGroundPicks] = useState<readonly LngLat[]>([]);
  const [distance, setDistance] = useState('');
  const [fitRefusal, setFitRefusal] = useState<CalibrationRefusal | null>(null);

  const aspect = underlay?.aspect ?? 1;

  // The latest state, for handlers the map calls: the map is mounted once and never rebuilt.
  const traceRef = useRef(trace);
  traceRef.current = trace;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const stageRef = useRef(stage);
  stageRef.current = stage;

  /* ── the one way the trace changes, so every change can be undone ──── */

  const commit = useCallback(
    (next: MapTrace) => {
      if (next === traceRef.current) return;
      history.current = [...history.current, traceRef.current].slice(-HISTORY);
      setHistorySize(history.current.length);
      onTrace(next);
    },
    [onTrace],
  );
  /** A drag records the trace it started from once, on its first move, so a click that moved nothing leaves no step. */
  const remember = (): void => {
    history.current = [...history.current, traceRef.current].slice(-HISTORY);
    setHistorySize(history.current.length);
  };

  const undo = (): void => {
    setSelected(null);
    setEditing(null);
    setCornerRefusal(false);
    const previous = history.current[history.current.length - 1];
    if (previous) {
      history.current = history.current.slice(0, -1);
      setHistorySize(history.current.length);
      onTrace(previous);
      setTool(previous.closed ? (tool === 'draw' ? 'pan' : tool) : 'draw');
      return;
    }
    /* Nothing recorded — the map was reopened on a trace drawn before: undo the drawing, reopening it
       or taking its last corner back. A trace placed from the sheet was never drawn, so there is nothing to undo. */
    if (trace.fromSheet) return;
    onTrace(trace.closed ? { ring: trace.ring, closed: false } : { ring: trace.ring.slice(0, -1), closed: false });
  };

  /* ── the map, mounted once ─────────────────────────────────────────── */

  const clickRef = useRef<(p: LngLat, hit: number | null) => void>(() => {});
  const moveRef = useRef<(i: number, p: LngLat) => void>(() => {});
  const hoverRef = useRef<(p: LngLat | null) => void>(() => {});
  const relabelRef = useRef<() => void>(() => {});
  const rememberRef = useRef(remember);
  rememberRef.current = remember;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    void (async () => {
      try {
        const mod = await import('maplibre-gl');
        if (cancelled) return;
        // The bundled worker's real url; maplibre's own guess at a sibling file 404s once Vite hashes it.
        mod.setWorkerUrl(MAPLIBRE_WORKER_URL);
        const ring0 = traceRef.current.ring;
        const first = ring0[0];
        // A whole plot already on the map opens framed, so the reader sees all of it and where it is.
        const frame =
          ring0.length >= 3
            ? {
                bounds: [
                  [Math.min(...ring0.map((p) => p.lng)), Math.min(...ring0.map((p) => p.lat))],
                  [Math.max(...ring0.map((p) => p.lng)), Math.max(...ring0.map((p) => p.lat))],
                ] as [[number, number], [number, number]],
                // Clear of the search and tools above and the readout below, which sit over the map.
                fitBoundsOptions: { padding: { top: 84, bottom: 180, left: 56, right: 56 }, maxZoom: PLOT_ZOOM + 1 },
              }
            : {
                center: first ? ([first.lng, first.lat] as [number, number]) : OPENING_VIEW,
                zoom: first ? PLOT_ZOOM : OPENING_ZOOM,
              };
        map = new mod.Map({
          container: host,
          attributionControl: false,
          maplibreLogo: false,
          locale: { 'Map.Title': t.map.label },
          ...frame,
          // North-up and flat: a bearing cannot be read off a rotated or tilted view.
          pitchWithRotate: false,
          dragRotate: false,
          style: {
            version: 8,
            sources: {
              [ID.imagery]: { type: 'raster', tiles: [ESRI_IMAGERY], tileSize: 256, maxzoom: 19 },
              [ID.osm]: { type: 'raster', tiles: [OSM_RASTER], tileSize: 256, maxzoom: 19 },
            },
            layers: [
              { id: ID.imagery, type: 'raster', source: ID.imagery },
              { id: ID.osm, type: 'raster', source: ID.osm, layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.55 } },
            ],
          },
        });
        mapRef.current = map;
        const m = map;
        // One aborted tile is not a failed basemap: claimed only while no tile has ever drawn.
        m.on('error', () => {
          if (!cancelled && !tilesSeen.current) setTilesFailed(true);
        });
        m.on('data', (e) => {
          if (!cancelled && e.dataType === 'source' && 'tile' in e && e.tile !== undefined) {
            tilesSeen.current = true;
            setTilesFailed(false);
          }
        });
        m.on('load', () => {
          if (cancelled) return;
          const accent = inkOf('--accent');
          const ink = inkOf('--text-primary');
          const plate = inkOf('--surface-panel');
          const uncertain = inkOf('--uncertain');
          for (const id of [ID.shape, ID.ring, ID.rubber, ID.points, ID.sheetEdge]) m.addSource(id, { type: 'geojson', data: EMPTY_FC });
          m.addLayer({ id: ID.shape, type: 'fill', source: ID.shape, paint: { 'fill-opacity': 0.2, ...(accent ? { 'fill-color': accent } : {}) } });
          m.addLayer({
            id: ID.ring,
            type: 'line',
            source: ID.ring,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-width': 3, ...(accent ? { 'line-color': accent } : {}) },
          });
          /* The segment being drawn, pulled taut from the last corner to the pointer, and the one that
             would close the ring from the pointer back to the first corner, fainter. Dashed: they are where
             the next corner would go, not boundaries yet. As heavy as a boundary, over a plate-coloured
             casing, because a 2 px dash on satellite imagery was a line nobody could find. */
          m.addLayer({
            id: ID.rubberCase,
            type: 'line',
            source: ID.rubber,
            layout: { 'line-cap': 'round' },
            paint: {
              'line-width': 6,
              'line-opacity': ['case', ['==', ['get', 'kind'], 'close'], 0.4, 0.85],
              ...(plate ? { 'line-color': plate } : {}),
            },
          });
          m.addLayer({
            id: ID.rubber,
            type: 'line',
            source: ID.rubber,
            paint: {
              'line-width': 3,
              'line-dasharray': [2, 1.5],
              'line-opacity': ['case', ['==', ['get', 'kind'], 'close'], 0.5, 1],
              ...(accent ? { 'line-color': accent } : {}),
            },
          });
          m.addLayer({
            id: ID.points,
            type: 'circle',
            source: ID.points,
            // The first corner is larger: it is the close-the-ring target. The selected one is larger still, and inked.
            paint: {
              'circle-radius': ['case', ['get', 'sel'], 10, ['==', ['get', 'i'], 0], 9, 6],
              'circle-stroke-width': ['case', ['get', 'sel'], 4, 2],
              ...(plate ? { 'circle-color': plate } : {}),
              ...(ink && accent ? { 'circle-stroke-color': ['case', ['get', 'sel'], accent, ink] } : ink ? { 'circle-stroke-color': ink } : {}),
            },
          });
          // The sheet's outline: dashed while it is placed by eye, an assumption, and amber like one.
          m.addLayer({
            id: ID.sheetEdge,
            type: 'line',
            source: ID.sheetEdge,
            paint: { 'line-width': 2, 'line-dasharray': [3, 2], ...(uncertain ? { 'line-color': uncertain } : {}) },
          });
          setMapState('ready');
        });
        m.on('move', () => relabelRef.current());
        m.on('moveend', () => setZoomedIn(m.getZoom() >= SHEET_ZOOM));

        /** The corner under a point on the screen, nearest first; null where there is none. */
        const cornerAt = (pt: PointLike): number | null => {
          if (!m.getLayer(ID.points)) return null;
          const [x, y] = Array.isArray(pt) ? pt : [pt.x, pt.y];
          const found = m.queryRenderedFeatures(
            [
              [x - CLOSE_PICK_PX, y - CLOSE_PICK_PX],
              [x + CLOSE_PICK_PX, y + CLOSE_PICK_PX],
            ],
            { layers: [ID.points] },
          );
          let best: number | null = null;
          let bestD = Infinity;
          for (const f of found) {
            const i: unknown = f.properties?.['i'];
            const c = traceRef.current.ring[typeof i === 'number' ? i : -1];
            if (typeof i !== 'number' || !c) continue;
            const s = m.project([c.lng, c.lat]);
            const d = Math.hypot(s.x - x, s.y - y);
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          }
          return best;
        };
        const restingCursor = (): string => (stageRef.current === null && (toolRef.current === 'pan' || toolRef.current === 'move') ? '' : 'crosshair');

        m.on('click', (e) => clickRef.current({ lng: e.lngLat.lng, lat: e.lngLat.lat }, cornerAt(e.point)));

        // Dragging a corner, or the whole outline: gestures on the layers, no DOM marker, no second stylesheet.
        let dragging: { readonly i: number; moved: boolean } | null = null;
        let shifting: { readonly from: LngLat; readonly base: MapTrace; moved: boolean } | null = null;
        const beginCorner = (e: MapLayerMouseEvent | MapLayerTouchEvent): void => {
          const i = cornerAt(e.point);
          if (i === null || stageRef.current !== null) return;
          e.preventDefault();
          dragging = { i, moved: false };
          m.getCanvas().style.cursor = 'grabbing';
          m.dragPan.disable();
        };
        const beginShift = (e: MapLayerMouseEvent | MapLayerTouchEvent): void => {
          if (toolRef.current !== 'move' || stageRef.current !== null || dragging || cornerAt(e.point) !== null) return;
          // Two fingers inside the outline are a pinch to zoom, not a move.
          if ('points' in e && e.points.length > 1) return;
          e.preventDefault();
          shifting = { from: { lng: e.lngLat.lng, lat: e.lngLat.lat }, base: traceRef.current, moved: false };
          m.getCanvas().style.cursor = 'grabbing';
          m.dragPan.disable();
        };
        const follow = (p: LngLat, at: { x: number; y: number }): void => {
          if (dragging) {
            if (!dragging.moved) {
              rememberRef.current();
              dragging.moved = true;
            }
            moveRef.current(dragging.i, p);
            return;
          }
          if (shifting) {
            if (!shifting.moved) {
              rememberRef.current();
              shifting.moved = true;
            }
            shiftRef.current(shifting.base, shifting.from, p);
            return;
          }
          hoverRef.current(p);
          // What a press here would do, said by the cursor before it is done.
          const overCorner = cornerAt([at.x, at.y]) !== null;
          const overShape =
            toolRef.current === 'move' && stageRef.current === null && m.getLayer(ID.shape) ? m.queryRenderedFeatures([at.x, at.y], { layers: [ID.shape] }).length > 0 : false;
          m.getCanvas().style.cursor = overCorner && stageRef.current === null ? 'grab' : overShape ? 'move' : restingCursor();
        };
        const end = (): void => {
          if (!dragging && !shifting) return;
          dragging = null;
          shifting = null;
          m.getCanvas().style.cursor = restingCursor();
          m.dragPan.enable();
        };
        m.on('mousedown', ID.points, beginCorner);
        m.on('touchstart', ID.points, beginCorner);
        m.on('mousedown', ID.shape, beginShift);
        m.on('touchstart', ID.shape, beginShift);
        m.on('mousemove', (e) => follow({ lng: e.lngLat.lng, lat: e.lngLat.lat }, e.point));
        m.on('touchmove', (e) => {
          if (dragging || shifting) follow({ lng: e.lngLat.lng, lat: e.lngLat.lat }, e.point);
        });
        m.on('mouseup', end);
        m.on('touchend', end);

        /* The segment being drawn follows the pointer through a drag as well. MapLibre stops firing its
           `mousemove` while one of its own gestures runs ("should not be fired when interaction handlers
           (pan, rotate, etc) are active"), so dragging the map mid-segment froze the dashed line and left
           its length where the map used to be — and a finger, which never hovers, got no line at all. The
           pointer is followed on the canvas itself, and re-read on every frame the map moves under it. */
        let screen: { x: number; y: number } | null = null;
        const container = m.getCanvasContainer();
        const under = (): void => {
          if (!screen || dragging || shifting) return;
          const ll = m.unproject([screen.x, screen.y]);
          hoverRef.current({ lng: ll.lng, lat: ll.lat });
        };
        container.addEventListener('pointermove', (e) => {
          const r = container.getBoundingClientRect();
          screen = { x: e.clientX - r.left, y: e.clientY - r.top };
          under();
        });
        m.on('move', under);
        container.addEventListener('pointerleave', () => {
          screen = null;
          hoverRef.current(null);
        });
      } catch {
        // No WebGL is a real state on a site laptop; the table still works.
        if (!cancelled) setMapState('unavailable');
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current = null;
      map?.remove();
    };
    // Mounted once: re-centring on a prop change would move the map out from under a reader mid-trace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── clicks, drags and labels, reading the latest state ─────────────── */

  const shiftRef = useRef<(base: MapTrace, from: LngLat, to: LngLat) => void>(() => {});
  shiftRef.current = (base, from, to) => onTrace(translateTrace(base, from, to));

  clickRef.current = (p, hit) => {
    setCornerRefusal(false);
    if (stage === 'sheet-a' || stage === 'sheet-b') {
      if (!placement) return;
      setSheetPicks((s) => [...s, groundToSheetPoint(placement, p)]);
      setStage(stage === 'sheet-a' ? 'ground-a' : 'ground-b');
      return;
    }
    if (stage === 'ground-a' || stage === 'ground-b') {
      setGroundPicks((g) => [...g, p]);
      setStage(stage === 'ground-a' ? 'sheet-b' : 'distance');
      return;
    }
    if (stage === 'distance') return;
    if (tool === 'pick') {
      setBusy(true);
      setNotice(t.map.footprintBusy);
      void fetchFootprint(p).then((r) => {
        setBusy(false);
        if (r.ring) {
          commit({ ring: r.ring, closed: true });
          setNotice(t.map.footprintNote);
          setTool('move');
        } else {
          setNotice(t.map.footprint[r.refusal as FootprintRefusal]);
        }
      });
      return;
    }
    // A finished outline's corner is picked up to be deleted; while drawing, the first one closes the ring.
    if (hit !== null && (trace.closed || tool !== 'draw')) {
      setSelected(hit);
      return;
    }
    setSelected(null);
    if (tool !== 'draw' || trace.closed) return;
    if (hit === 0 && trace.ring.length >= 3) {
      commit({ ring: trace.ring, closed: true });
      setTool('pan');
      setNotice(null);
      return;
    }
    const admitted = admitVertex(trace.ring, p);
    if (admitted.refusal) {
      setNotice(t.map.outsideZone);
      return;
    }
    setNotice(null);
    commit({ ring: admitted.ring, closed: false });
  };

  moveRef.current = (i, p) => {
    setSelected(i);
    onTrace(withCornerAt(trace, i, p));
  };

  /** Where the pointer is while drawing, and the length of the segment it would end. */
  const updateLive = useCallback(() => {
    const map = mapRef.current;
    const p = pointer.current;
    const rubber = map?.getSource(ID.rubber) as GeoJSONSource | undefined;
    const lengthM = tool === 'draw' && stage === null ? liveLength(trace, p) : null;
    const last = trace.ring[trace.ring.length - 1];
    if (!map || !p || !last || lengthM === null) {
      // Cleared once, not on every move of a pointer that is not drawing.
      if (rubberShown.current) void rubber?.setData(EMPTY_FC);
      rubberShown.current = false;
      setLive(null);
      return;
    }
    rubberShown.current = true;
    const first = trace.ring[0];
    void rubber?.setData({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { kind: 'next' }, geometry: { type: 'LineString', coordinates: [[last.lng, last.lat], [p.lng, p.lat]] } },
        // Back to the first corner once there is a segment to close: two corners and the pointer are a triangle.
        ...(first && trace.ring.length >= 2
          ? [{ type: 'Feature' as const, properties: { kind: 'close' }, geometry: { type: 'LineString' as const, coordinates: [[p.lng, p.lat], [first.lng, first.lat]] } }]
          : []),
      ],
    });
    const at = map.project([(last.lng + p.lng) / 2, (last.lat + p.lat) / 2]);
    setLive({ x: at.x, y: at.y, text: metresText(lengthM) });
  }, [trace, tool, stage]);
  hoverRef.current = (p) => {
    pointer.current = p;
    updateLive();
  };
  useEffect(() => {
    if (mapState === 'ready') updateLive();
  }, [updateLive, mapState]);

  const relabel = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const ring = trace.ring;
    const count = trace.closed ? ring.length : ring.length - 1;
    const corners = ring.map((p, i) => {
      const at = map.project([p.lng, p.lat]);
      return { i, x: at.x, y: at.y };
    });
    const centre =
      trace.closed && ring.length >= 3
        ? map.project([ring.reduce((s, p) => s + p.lng, 0) / ring.length, ring.reduce((s, p) => s + p.lat, 0) / ring.length])
        : null;
    const edges: EdgeLabel[] = [];
    for (let i = 0; i < count; i += 1) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      const p = corners[i]!;
      const q = corners[(i + 1) % corners.length]!;
      let x = (p.x + q.x) / 2;
      let y = (p.y + q.y) / 2;
      /*
        Outside the boundary, as a drafted dimension sits: on the line, a label
        on a short boundary covers both of its corners and a click meant for a
        corner opens the length instead. Pushed clear by its own half-size
        along the outward normal, so it never touches the line it measures.
      */
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      if (centre && len > 0) {
        let nx = (q.y - p.y) / len;
        let ny = -(q.x - p.x) / len;
        if (nx * (x - centre.x) + ny * (y - centre.y) < 0) {
          nx = -nx;
          ny = -ny;
        }
        const clear = 8 + Math.abs(nx) * LABEL_HALF_W + Math.abs(ny) * LABEL_HALF_H;
        x += nx * clear;
        y += ny * clear;
      }
      edges.push({ i, x, y, text: metresText(legBetween(a, b).lengthM) });
    }
    setScreen({ edges, corners, centre: centre ? { x: centre.x, y: centre.y } : null });
  }, [trace]);
  relabelRef.current = () => {
    relabel();
    updateLive();
  };

  /* ── the trace, pushed to the canvas ───────────────────────────────── */

  // A selection or an edit that no longer names a corner or a boundary of this trace is dropped.
  const sel = selected !== null && selected < trace.ring.length ? selected : null;
  const edgeCount = trace.closed ? trace.ring.length : Math.max(0, trace.ring.length - 1);
  const edit = editing && editing.edge < edgeCount ? editing : null;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    const coords = trace.ring.map((p) => [p.lng, p.lat]);
    const line = trace.closed && coords.length >= 3 ? [...coords, coords[0]!] : coords;
    void (map.getSource(ID.ring) as GeoJSONSource | undefined)?.setData(
      line.length >= 2 ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } } : EMPTY_FC,
    );
    void (map.getSource(ID.shape) as GeoJSONSource | undefined)?.setData(
      trace.closed && coords.length >= 3
        ? { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]!]] } }
        : EMPTY_FC,
    );
    void (map.getSource(ID.points) as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: trace.ring.map((p, i) => ({ type: 'Feature', properties: { i, sel: i === sel }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })),
    });
    relabel();
  }, [trace, mapState, relabel, sel]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    map.setLayoutProperty(ID.osm, 'visibility', streets ? 'visible' : 'none');
  }, [streets, mapState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    map.getCanvas().style.cursor = (tool === 'pan' || tool === 'move') && stage === null ? '' : 'crosshair';
  }, [tool, stage, mapState]);

  // A boundary whose length was just typed gets the focus back, so a keyboard reader is where he was.
  useEffect(() => {
    if (refocusEdge === null) return;
    rootRef.current?.querySelector<HTMLButtonElement>(`[data-edge="${refocusEdge}"]`)?.focus();
    setRefocusEdge(null);
  }, [refocusEdge, screen]);

  /* ── the edits ─────────────────────────────────────────────────────── */

  const startLength = (i: number, text: string): void => {
    setSelected(null);
    setEditing({ edge: i, text: text.replace(/\s*m$/, '').replace(/,/g, ''), refusal: null });
  };
  const applyLength = (e: FormEvent): void => {
    e.preventDefault();
    if (!edit) return;
    const typed = parseLength(edit.text);
    if (typed.refusal) {
      setEditing({ ...edit, refusal: typed.refusal });
      return;
    }
    const r = withEdgeLength(trace, edit.edge, typed.lengthM);
    if (r.refusal) {
      setEditing({ ...edit, refusal: r.refusal });
      return;
    }
    commit(r.trace);
    setEditing(null);
    setRefocusEdge(edit.edge);
  };

  /**
   * From the keyboard the focus stays on the corner button at the same place in
   * the Tab order, which now names the next corner — so that corner is the one
   * selected, and Delete pressed again deletes it rather than nothing.
   */
  const removeCorner = (i: number, fromKeyboard = false): void => {
    const r = deleteCorner(trace, i);
    if (r.refusal) {
      setCornerRefusal(true);
      return;
    }
    setCornerRefusal(false);
    setSelected(fromKeyboard ? Math.min(i, r.trace.ring.length - 1) : null);
    commit(r.trace);
  };
  const addCorner = (i: number): void => {
    const next = insertCorner(trace, i);
    if (next === trace) return;
    commit(next);
    // The new corner is the one after the split boundary's start: picked up, ready to drag or delete.
    setSelected(i + 1);
  };
  const nudge = (e: ReactKeyboardEvent): void => {
    const step = e.shiftKey ? NUDGE_M * 10 : NUDGE_M;
    const by: Record<string, readonly [number, number]> = { ArrowUp: [0, step], ArrowDown: [0, -step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    const d = by[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    commit(translateBy(trace, d[0], d[1]));
  };
  const onKeys = (e: ReactKeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel !== null && trace.closed) {
      e.preventDefault();
      removeCorner(sel, e.target instanceof HTMLButtonElement && e.target.getAttribute('aria-describedby') === 'pm-corner-help');
    } else if (e.key === 'Escape' && (sel !== null || cornerRefusal)) {
      setSelected(null);
      setCornerRefusal(false);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
  };

  /* ── the sheet underlay ────────────────────────────────────────────── */

  const regionKey = sheet?.region ? sheet.region.join(',') : 'page';
  useEffect(() => {
    if (!sheet) {
      setUnderlay(null);
      setUnderlayState('idle');
      return;
    }
    let live = true;
    setUnderlayState('drawing');
    void rasterSheet(sheet.pdfBase64, sheet.region, UNDERLAY_LONG_SIDE_PX)
      .then((canvas) => {
        if (!live) return;
        setUnderlay({ canvas, aspect: canvas.height / canvas.width });
        setUnderlayState('idle');
      })
      .catch(() => live && setUnderlayState('failed'));
    return () => {
      live = false;
    };
    // The page and the part of it, not the object carrying them: a re-render is not a new sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.pdfBase64, regionKey]);

  // The opening placement: the middle of the view, at most of its width. An assumption, drawn dashed.
  const placeAtView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const b = map.getBounds();
    let widthM = FALLBACK_SHEET_WIDTH_M;
    try {
      widthM = legBetween({ lng: b.getWest(), lat: c.lat }, { lng: b.getEast(), lat: c.lat }).lengthM * 0.6;
    } catch {
      /* a view straddling the zone edge keeps the fallback */
    }
    setPlacement(assumedPlacement({ lng: c.lng, lat: c.lat }, widthM, aspect));
    setFit(null);
  }, [aspect]);

  // Only once the reader is looking at a plot: a sheet laid over seven emirates would be a speck nobody finds.
  useEffect(() => {
    if (mapState === 'ready' && underlay && !placement && zoomedIn) placeAtView();
  }, [mapState, underlay, placement, placeAtView, zoomedIn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    const edge = map.getSource(ID.sheetEdge) as GeoJSONSource | undefined;
    if (!underlay || !placement || !sheetOn) {
      hideUnderlay(map);
      void edge?.setData(EMPTY_FC);
      return;
    }
    const corners = underlayCorners(placement).map((p) => [p.lng, p.lat] as [number, number]);
    const quad: Quad = [corners[0]!, corners[1]!, corners[2]!, corners[3]!];
    // Over the imagery, under the trace: a corner dropped on the sheet stays visible on top of it.
    showUnderlay(map, underlay.canvas, quad, opacity / 100, ID.shape);
    void edge?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [...corners, corners[0]!] } });
    map.setPaintProperty(ID.sheetEdge, 'line-dasharray', fit ? [1, 0] : [3, 2]);
  }, [underlay, placement, sheetOn, opacity, fit, mapState]);

  const startFit = (): void => {
    setSheetOn(true);
    setSheetPicks([]);
    setGroundPicks([]);
    setDistance('');
    setFitRefusal(null);
    setStage('sheet-a');
  };
  const applyFit = (): void => {
    if (sheetPicks.length < 2 || groundPicks.length < 2) return;
    const r = calibrateUnderlay({
      aspect,
      sheet: [sheetPicks[0]!, sheetPicks[1]!],
      ground: [groundPicks[0]!, groundPicks[1]!],
      statedM: distance,
    });
    if (r.refusal) {
      setFitRefusal(r.refusal);
      return;
    }
    setPlacement(r.fit.placement);
    setFit(r.fit);
    setStage(null);
    setFitRefusal(null);
  };

  /* ── search ────────────────────────────────────────────────────────── */

  const search = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setHits(await searchPlaces(query));
  };
  const go = (hit: PlaceHit): void => {
    mapRef.current?.flyTo({ center: [hit.at.lng, hit.at.lat], zoom: PLOT_ZOOM });
    setHits(null);
    setQuery(hit.label.split(',')[0] ?? hit.label);
  };

  /* ── the readout ───────────────────────────────────────────────────── */

  const readout = useMemo(() => (trace.closed ? ringReadout(trace.ring) : null), [trace]);
  const against = useMemo(() => (trace.closed ? compareArea(trace.ring, statedAreaM2) : null), [trace, statedAreaM2]);

  const how =
    stage !== null
      ? t.map.fitStep[stage]
      : tool === 'pick'
        ? t.map.howPick
        : tool === 'move' && trace.closed
          ? t.map.howMove
          : trace.closed
            ? t.map.howClosed
            : tool === 'draw'
              ? t.map.howStart
              : t.map.howPan;

  const tools: readonly { id: Tool; icon: typeof PenLine; label: string }[] = [
    { id: 'draw', icon: PenLine, label: t.map.draw },
    { id: 'pan', icon: Hand, label: t.map.pan },
    { id: 'move', icon: Move, label: t.map.moveOutline },
    { id: 'pick', icon: MousePointerClick, label: t.map.pick },
  ];

  const editable = stage === null && mapState === 'ready';
  const canEditShape = editable && trace.closed && trace.ring.length >= 3;
  const selectedAt = sel !== null ? screen.corners[sel] : undefined;

  return (
    // The map does not mirror: north does not move with the language. The controls around it do.
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-sunken" onKeyDown={onKeys}>
      <div ref={hostRef} dir="ltr" className="absolute inset-0" aria-describedby="pm-how" />

      {/*
        What sits on the drawing, in page pixels: each boundary's length — a
        button that turns into a box to type it — a + to split it, a focusable
        ring on each corner so Delete reaches a corner from the keyboard, and the
        length of the segment being drawn. The layer lets the pointer through;
        only the controls in it take it.
      */}
      <div dir="ltr" className="pointer-events-none absolute inset-0">
        {screen.edges.map((l) =>
          edit?.edge === l.i ? null : editable ? (
            <span
              key={`leg-${l.i}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-stretch overflow-visible rounded-sm bg-panel/95 text-fg shadow-soft"
              style={{ left: l.x, top: l.y }}
            >
              <button
                type="button"
                data-edge={l.i}
                aria-label={t.map.editLength(l.i, (l.i + 1) % trace.ring.length, l.text)}
                onClick={() => startLength(l.i, l.text)}
                className="figure pointer-events-auto relative cursor-text rounded-sm px-1.5 py-1 text-[11px] underline decoration-dotted decoration-1 underline-offset-2 before:absolute before:-inset-x-1 before:-inset-y-1 before:content-[''] hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                {l.text}
              </button>
              {canEditShape ? (
                <button
                  type="button"
                  aria-label={t.map.addCornerOn(l.i, (l.i + 1) % trace.ring.length)}
                  title={t.map.addCornerOn(l.i, (l.i + 1) % trace.ring.length)}
                  onClick={() => addCorner(l.i)}
                  className="pointer-events-auto relative grid w-7 place-items-center rounded-e-sm border-s border-line text-secondary before:absolute before:-inset-x-0.5 before:-inset-y-1 before:content-[''] hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          ) : (
            <span
              key={`leg-${l.i}`}
              aria-hidden="true"
              className="figure absolute -translate-x-1/2 -translate-y-1/2 rounded-sm bg-panel/90 px-1.5 py-0.5 text-[11px] text-fg shadow-soft"
              style={{ left: l.x, top: l.y }}
            >
              {l.text}
            </span>
          ),
        )}

        {edit
          ? (() => {
              const at = screen.edges.find((l) => l.i === edit.edge);
              if (!at) return null;
              const j = (edit.edge + 1) % trace.ring.length;
              return (
                <form
                  key="length-edit"
                  onSubmit={applyLength}
                  dir={dir}
                  className="pointer-events-auto absolute z-10 grid w-max max-w-64 -translate-x-1/2 -translate-y-5 gap-1"
                  style={{ left: at.x, top: at.y }}
                >
                  <span className="flex items-center gap-1.5 justify-self-start rounded-md border border-accent bg-panel p-1 shadow-lifted" dir="ltr">
                    <Input
                      autoFocus
                      aria-label={t.map.lengthInput(edit.edge, j)}
                      aria-invalid={edit.refusal !== null || undefined}
                      aria-describedby="pm-length-help"
                      inputMode="decimal"
                      value={edit.text}
                      onChange={(e) => setEditing({ ...edit, text: e.target.value, refusal: null })}
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditing(null);
                          setRefocusEdge(edit.edge);
                        }
                      }}
                      onBlur={() => setEditing(null)}
                      className="figure h-8 w-24 px-2 text-[13px]"
                    />
                    <span className="pe-1 text-[12px] text-secondary">m</span>
                  </span>
                  <p
                    id="pm-length-help"
                    role={edit.refusal ? 'alert' : undefined}
                    className={cn('rounded-sm bg-panel/95 px-2 py-1 text-[11.5px] shadow-soft', edit.refusal ? 'text-variance' : 'text-secondary')}
                  >
                    {edit.refusal ? (edit.refusal === 'outside-zone-40' ? t.map.outsideZone : t.map.lengthRefusal[edit.refusal]) : t.map.lengthKeys}
                  </p>
                </form>
              );
            })()
          : null}

        {canEditShape
          ? screen.corners.map((c) => (
              // Not under the pointer — a corner is dragged on the canvas — but on the Tab order, for Delete.
              <button
                key={`corner-${c.i}`}
                type="button"
                tabIndex={0}
                aria-label={t.map.cornerLabel(c.i)}
                aria-describedby="pm-corner-help"
                onFocus={() => setSelected(c.i)}
                className="absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-accent"
                style={{ left: c.x, top: c.y }}
              />
            ))
          : null}
        <span id="pm-corner-help" className="sr-only">
          {t.map.cornerHelp}
        </span>

        {canEditShape && selectedAt ? (
          <div
            dir={dir}
            className="pointer-events-auto absolute z-10 grid w-max max-w-60 gap-1 rounded-md border border-line bg-panel/95 p-1 shadow-lifted backdrop-blur"
            style={{ left: selectedAt.x + 18, top: selectedAt.y - 58 }}
          >
            <Button variant="secondary" size="sm" className="h-9" aria-label={t.map.deleteCornerOf(selectedAt.i)} onClick={() => removeCorner(selectedAt.i)}>
              <Trash2 aria-hidden="true" />
              {t.map.deleteCorner}
            </Button>
            {cornerRefusal ? (
              <p role="alert" className="px-1.5 pb-1 text-[11.5px] text-variance">
                {t.map.tooFewCorners}
              </p>
            ) : null}
          </div>
        ) : null}

        {canEditShape && tool === 'move' && screen.centre ? (
          // The visible handle for moving the outline; the pointer drags the shape itself, the keyboard uses this.
          <button
            type="button"
            aria-label={t.map.moveHandle}
            title={t.map.moveHandle}
            onKeyDown={nudge}
            // Small and see-through: on a villa-sized outline a larger mark would hide the shape it moves.
            className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-accent bg-panel/75 text-accent shadow-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            style={{ left: screen.centre.x, top: screen.centre.y }}
          >
            <Move className="size-4" aria-hidden="true" />
          </button>
        ) : null}

        {live ? (
          <span
            aria-hidden="true"
            className="figure absolute -translate-x-1/2 -translate-y-[140%] rounded-sm border border-accent bg-panel px-1.5 py-0.5 text-[12px] font-medium text-fg shadow-soft"
            style={{ left: live.x, top: live.y }}
          >
            {live.text}
          </span>
        ) : null}
      </div>

      {mapState === 'unavailable' ? (
        <p className="absolute inset-0 grid place-items-center p-8 text-center text-[13px] text-secondary">{t.map.unavailable}</p>
      ) : null}

      {/* ── top: search, tools ── */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start gap-2">
        <form onSubmit={(e) => void search(e)} className="pointer-events-auto relative w-full max-w-xs" role="search">
          <label htmlFor="pm-search" className="sr-only">
            {t.map.search}
          </label>
          <Search className="pointer-events-none absolute start-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-tertiary" aria-hidden="true" />
          <Input
            id="pm-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.map.searchPlaceholder}
            className="h-9 bg-panel/95 ps-8 shadow-soft backdrop-blur"
          />
          {hits ? (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-line bg-panel shadow-lifted">
              {hits.length === 0 ? <li className="px-3 py-2 text-[12.5px] text-secondary">{t.map.noHits}</li> : null}
              {hits.map((h) => (
                <li key={`${h.at.lng},${h.at.lat}`}>
                  <button type="button" onClick={() => go(h)} className="block w-full truncate px-3 py-2 text-start text-[12.5px] text-fg hover:bg-hover">
                    {h.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>

        {/*
          The tools and the sheet's panel are one column: when the search and
          the tools do not fit on one line, the tools wrap below it and the
          panel goes down with them instead of covering them.
        */}
        <div className="ms-auto grid justify-items-end gap-2">
        <div role="toolbar" aria-label={t.plot.view} className="pointer-events-auto flex items-center gap-1 rounded-lg border border-line bg-panel/95 p-1 shadow-soft backdrop-blur">
          {tools.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={tool === id}
              aria-label={label}
              title={label}
              onClick={() => {
                setTool(id);
                setStage(null);
                setSelected(null);
              }}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors',
                tool === id ? 'bg-linear-to-r from-brand-solid to-brand-alt-solid text-on-brand' : 'text-secondary hover:bg-hover hover:text-fg',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
          <span className="mx-0.5 h-5 w-px bg-line" aria-hidden="true" />
          <button
            type="button"
            aria-pressed={streets}
            aria-label={t.map.streets}
            onClick={() => setStreets((s) => !s)}
            className={cn('inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium', streets ? 'bg-accent-subtle text-accent-strong' : 'text-secondary hover:bg-hover hover:text-fg')}
          >
            <Layers className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.map.streets}</span>
          </button>
        </div>

      {/* ── the sheet overlay, when an affection plan is in use ── */}
      {sheet ? (
        <div className="pointer-events-auto grid w-64 gap-2 rounded-lg border border-line bg-panel/95 p-3 text-[12.5px] shadow-soft backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-fg">{t.map.sheet}</p>
            <Button variant="ghost" size="icon" className="size-7" aria-pressed={sheetOn} aria-label={t.map.sheetShow} onClick={() => setSheetOn((s) => !s)}>
              {sheetOn ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            </Button>
          </div>
          {underlayState === 'drawing' ? (
            <p className="flex items-center gap-2 text-secondary" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t.sheet.drawing}
            </p>
          ) : underlayState === 'failed' ? (
            <p className="text-variance" role="alert">
              {t.map.sheetFailed}
            </p>
          ) : null}
          <label className="grid gap-1 text-secondary">
            <span className="flex justify-between">
              {t.map.opacity}
              <span className="figure text-fg">{opacity}%</span>
            </span>
            <input type="range" min={10} max={100} step={5} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="accent-[var(--accent)]" />
          </label>
          {!placement ? (
            <>
              <p className="text-secondary">{t.map.findFirst}</p>
              <Button variant="secondary" size="sm" disabled={!zoomedIn || !underlay} onClick={placeAtView}>
                {t.map.placeHere}
              </Button>
            </>
          ) : fit ? (
            <p className="text-secondary">{t.map.fitted(fit.measuredM, fit.differencePercent)}</p>
          ) : (
            // Placed by eye is an assumption, and is marked as one.
            <p className="rounded-sm border border-dashed border-assumed/70 bg-assumed-surface px-2 py-1.5 text-fg">{t.map.placedByEye}</p>
          )}
          {!placement ? null : stage === 'distance' ? (
            <div className="grid gap-1.5">
              <label htmlFor="pm-distance" className="text-secondary">
                {t.map.distance}
              </label>
              <Input id="pm-distance" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} className="figure h-8" />
              {fitRefusal ? <p className="text-variance">{t.map.refusal[fitRefusal]}</p> : null}
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={applyFit}>
                  {t.map.apply}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setStage(null)}>
                  {t.map.cancel}
                </Button>
              </div>
            </div>
          ) : stage ? (
            <Button variant="ghost" size="sm" onClick={() => setStage(null)}>
              {t.map.cancel}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <Button variant="secondary" size="sm" onClick={startFit}>
                <Ruler aria-hidden="true" />
                {t.map.fit}
              </Button>
              <Button variant="ghost" size="sm" onClick={placeAtView}>
                {t.map.placeHere}
              </Button>
            </div>
          )}
        </div>
      ) : null}
        </div>
      </div>

      {/* ── bottom: what to do, what was drawn, and the one action ── */}
      <div className="absolute inset-x-3 bottom-3 grid gap-2" dir={dir}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid min-w-0 flex-1 gap-1 rounded-lg border border-line bg-panel/95 px-3 py-2 shadow-soft backdrop-blur">
            <p id="pm-how" className="flex items-center gap-2 text-[12.5px] text-fg" role="status">
              {busy ? <Loader2 className="size-4 animate-spin text-accent" aria-hidden="true" /> : null}
              {how}
            </p>
            {notice && stage === null ? <p className="text-[12px] text-secondary">{notice}</p> : null}
            {tilesFailed ? <p className="text-[12px] text-variance">{t.map.tilesFailed}</p> : null}
            {readout?.areaM2 ? (
              <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
                <div className="flex gap-1.5">
                  <dt className="text-secondary">{t.map.area}</dt>
                  <dd className="figure text-fg" dir="ltr">{grouped(readout.areaM2)} m²</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-secondary">{t.map.perimeter}</dt>
                  <dd className="figure text-fg" dir="ltr">{grouped(readout.perimeterM ?? '')} m</dd>
                </div>
                <div className="text-secondary">{t.map.corners(trace.ring.length)}</div>
                {against ? <div className={against.beyondTolerance ? 'text-variance' : 'text-secondary'}>{against.beyondTolerance ? t.map.beyond : t.map.vsSheet(against.differencePercent)}</div> : null}
              </dl>
            ) : trace.ring.length > 0 ? (
              <p className="text-[12px] text-secondary">{t.map.corners(trace.ring.length)}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-line bg-panel/95 p-1 shadow-soft backdrop-blur">
            <Button variant="ghost" size="sm" disabled={historySize === 0 && (trace.ring.length === 0 || trace.fromSheet === true)} onClick={undo}>
              <Undo2 aria-hidden="true" />
              {t.map.undo}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={trace.ring.length === 0}
              onClick={() => {
                commit(EMPTY_TRACE);
                setTool('draw');
                setNotice(null);
                setSelected(null);
              }}
            >
              <Trash2 aria-hidden="true" />
              {t.map.clear}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Credit />
          {trace.fromSheet ? (
            <p className="flex items-center gap-1.5 rounded-md bg-panel/90 px-2.5 py-1.5 text-[12px] text-fg backdrop-blur">
              <MapPinned className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
              {t.map.fromSheet}
            </p>
          ) : trace.closed && trace.ring.length >= 3 ? (
            <div className="flex items-center gap-2">
              <p className="hidden rounded-sm bg-panel/85 px-2 py-0.5 text-[11px] text-secondary backdrop-blur md:block">{t.map.precision}</p>
              <Button variant="brand" size="lg" onClick={() => onUse(trace)}>
                {t.map.use}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/*
  THE IMAGERY'S CREDIT, FOLDED TO ONE MARK. Esri's and OpenStreetMap's terms
  require the attribution to be reachable on the map, so it is not removed —
  it sits behind an ⓘ, the way MapLibre's own compact control carries it, and
  opens on a press or on focus.
*/
function Credit(): JSX.Element {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        aria-label={t.map.creditLabel}
        onClick={() => setOpen((o) => !o)}
        className="grid size-7 place-items-center rounded-full bg-panel/85 text-secondary backdrop-blur hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
      {open ? <p className="rounded-sm bg-panel/85 px-2 py-0.5 text-[10.5px] text-secondary backdrop-blur">{t.map.credit}</p> : null}
    </div>
  );
}
