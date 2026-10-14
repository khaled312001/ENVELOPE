import { Eye, EyeOff, Hand, Layers, Loader2, MousePointerClick, PenLine, Ruler, Search, Trash2, Undo2 } from 'lucide-react';
import type { GeoJSONSource, ImageSource, Map as MapLibreMap, MapLayerMouseEvent, MapLayerTouchEvent } from 'maplibre-gl';
import MAPLIBRE_WORKER_URL from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

/*
  DRAWING THE PLOT ON THE GROUND.

  The classic studio's map, rebuilt for this one: satellite imagery, a corner per
  click, the first corner clicked again to close, every corner draggable, a
  place search, a building outline picked off OpenStreetMap, and the affection
  plan's own site plan laid over the imagery and fitted to a printed dimension.

  EVERY NUMBER HERE IS COMPUTED BY THE CLASSIC STUDIO'S OWN FUNCTIONS — the ring
  readout, the area check against the sheet, the calibration, the footprint and
  the search are imported from `@web/components/PlotMap`, not rewritten. Two
  front ends that measured one trace two ways would sooner or later disagree,
  and the disagreement would be found on a submission. What is new is only the
  screen around them.

  NOTHING HERE IS SUBMITTED. "Use this outline" copies the corners into the
  table, as metres on the UTM 40N grid, where the reader classifies every
  boundary and files the plot like any other; the engine measures the area from
  what was filed, never from this trace.
*/

export interface MapTrace {
  readonly ring: readonly LngLat[];
  readonly closed: boolean;
}

export const EMPTY_TRACE: MapTrace = { ring: [], closed: false };

export interface SheetImage {
  readonly pngBase64: string;
  readonly widthPx: number;
  readonly heightPx: number;
}

type Tool = 'draw' | 'pan' | 'pick';
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

const ID = {
  imagery: 'pm-imagery',
  osm: 'pm-osm',
  shape: 'pm-shape',
  ring: 'pm-ring',
  points: 'pm-points',
  sheet: 'pm-sheet',
  sheetEdge: 'pm-sheet-edge',
} as const;

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

/** A semantic token's computed value: WebGL cannot read a custom property. `null` leaves the paint out. */
function inkOf(token: string): string | null {
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return v === '' ? null : v;
}

/** The sheet, flattened onto white so its transparent ground does not show the imagery through the drawing. */
async function flatten(pngBase64: string): Promise<string> {
  const img = new Image();
  img.src = `data:image/png;base64,${pngBase64}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.src;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

interface Label {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

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
  readonly sheet: SheetImage | null;
  readonly onUse: (ring: readonly LngLat[]) => void;
}): JSX.Element {
  const { t, dir } = useLocale();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapState, setMapState] = useState<'pending' | 'ready' | 'unavailable'>('pending');
  const [tilesFailed, setTilesFailed] = useState(false);
  const tilesSeen = useRef(false);

  const [tool, setTool] = useState<Tool>(trace.closed ? 'pan' : 'draw');
  const [streets, setStreets] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [labels, setLabels] = useState<readonly Label[]>([]);

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<readonly PlaceHit[] | null>(null);

  // The sheet underlay.
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
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

  const aspect = sheet ? sheet.heightPx / sheet.widthPx : 1;

  /* ── the map, mounted once ─────────────────────────────────────────── */

  // Handlers the map calls read the latest state through refs, so the map is never rebuilt.
  const clickRef = useRef<(p: LngLat, onFirst: boolean) => void>(() => {});
  const moveRef = useRef<(i: number, p: LngLat) => void>(() => {});
  const relabelRef = useRef<() => void>(() => {});

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
        const first = trace.ring[0];
        map = new mod.Map({
          container: host,
          attributionControl: false,
          maplibreLogo: false,
          locale: { 'Map.Title': t.map.label },
          center: first ? [first.lng, first.lat] : OPENING_VIEW,
          zoom: first ? PLOT_ZOOM : OPENING_ZOOM,
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
        // One aborted tile is not a failed basemap: claimed only while no tile has ever drawn.
        map.on('error', () => {
          if (!cancelled && !tilesSeen.current) setTilesFailed(true);
        });
        map.on('data', (e) => {
          if (!cancelled && e.dataType === 'source' && 'tile' in e && e.tile !== undefined) {
            tilesSeen.current = true;
            setTilesFailed(false);
          }
        });
        map.on('load', () => {
          if (cancelled || !map) return;
          const accent = inkOf('--accent');
          const ink = inkOf('--text-primary');
          const plate = inkOf('--surface-panel');
          const uncertain = inkOf('--uncertain');
          for (const id of [ID.shape, ID.ring, ID.points, ID.sheetEdge]) map.addSource(id, { type: 'geojson', data: EMPTY_FC });
          map.addLayer({ id: ID.shape, type: 'fill', source: ID.shape, paint: { 'fill-opacity': 0.2, ...(accent ? { 'fill-color': accent } : {}) } });
          map.addLayer({
            id: ID.ring,
            type: 'line',
            source: ID.ring,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-width': 3, ...(accent ? { 'line-color': accent } : {}) },
          });
          map.addLayer({
            id: ID.points,
            type: 'circle',
            source: ID.points,
            // The first corner is larger: it is the close-the-ring target.
            paint: {
              'circle-radius': ['case', ['==', ['get', 'i'], 0], 9, 6],
              'circle-stroke-width': 2,
              ...(plate ? { 'circle-color': plate } : {}),
              ...(ink ? { 'circle-stroke-color': ink } : {}),
            },
          });
          // The sheet's outline: dashed while it is placed by eye, an assumption, and amber like one.
          map.addLayer({
            id: ID.sheetEdge,
            type: 'line',
            source: ID.sheetEdge,
            paint: { 'line-width': 2, 'line-dasharray': [3, 2], ...(uncertain ? { 'line-color': uncertain } : {}) },
          });
          setMapState('ready');
        });
        map.on('move', () => relabelRef.current());
        map.on('moveend', () => {
          if (map) setZoomedIn(map.getZoom() >= SHEET_ZOOM);
        });
        map.on('click', (e) => {
          const box: [[number, number], [number, number]] = [
            [e.point.x - CLOSE_PICK_PX, e.point.y - CLOSE_PICK_PX],
            [e.point.x + CLOSE_PICK_PX, e.point.y + CLOSE_PICK_PX],
          ];
          const found = map && map.getLayer(ID.points) ? map.queryRenderedFeatures(box, { layers: [ID.points] }) : [];
          clickRef.current({ lng: e.lngLat.lng, lat: e.lngLat.lat }, found.some((f) => f.properties?.['i'] === 0));
        });
        // Dragging a corner, as a gesture on the circle layer: no DOM marker, no second stylesheet.
        let dragging: number | null = null;
        const begin = (e: MapLayerMouseEvent | MapLayerTouchEvent): void => {
          const i: unknown = e.features?.[0]?.properties?.['i'];
          if (typeof i !== 'number' || !map) return;
          dragging = i;
          map.getCanvas().style.cursor = 'grabbing';
          map.dragPan.disable();
        };
        const end = (): void => {
          if (dragging === null || !map) return;
          dragging = null;
          map.getCanvas().style.cursor = '';
          map.dragPan.enable();
        };
        map.on('mousedown', ID.points, begin);
        map.on('touchstart', ID.points, begin);
        map.on('mousemove', (e) => {
          if (dragging !== null) moveRef.current(dragging, { lng: e.lngLat.lng, lat: e.lngLat.lat });
        });
        map.on('touchmove', (e) => {
          if (dragging !== null) moveRef.current(dragging, { lng: e.lngLat.lng, lat: e.lngLat.lat });
        });
        map.on('mouseup', end);
        map.on('touchend', end);
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

  clickRef.current = (p, onFirst) => {
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
          onTrace({ ring: r.ring, closed: true });
          setNotice(t.map.footprintNote);
          setTool('pan');
        } else {
          setNotice(t.map.footprint[r.refusal as FootprintRefusal]);
        }
      });
      return;
    }
    if (tool !== 'draw' || trace.closed) return;
    if (onFirst && trace.ring.length >= 3) {
      onTrace({ ring: trace.ring, closed: true });
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
    onTrace({ ring: admitted.ring, closed: false });
  };

  moveRef.current = (i, p) => {
    const admitted = admitVertex([], p);
    if (admitted.refusal) return;
    onTrace({ ring: trace.ring.map((q, j) => (j === i ? p : q)), closed: trace.closed });
  };

  const relabel = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const ring = trace.ring;
    const count = trace.closed ? ring.length : ring.length - 1;
    const next: Label[] = [];
    for (let i = 0; i < count; i += 1) {
      const a = ring[i]!;
      const b = ring[(i + 1) % ring.length]!;
      const at = map.project([(a.lng + b.lng) / 2, (a.lat + b.lat) / 2]);
      next.push({ id: `leg-${i}`, x: at.x, y: at.y, text: `${grouped(legBetween(a, b).lengthM.toFixed(2))} m` });
    }
    setLabels(next);
  }, [trace]);
  relabelRef.current = relabel;

  /* ── the trace, pushed to the canvas ───────────────────────────────── */

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
      features: trace.ring.map((p, i) => ({ type: 'Feature', properties: { i }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })),
    });
    relabel();
  }, [trace, mapState, relabel]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    map.setLayoutProperty(ID.osm, 'visibility', streets ? 'visible' : 'none');
  }, [streets, mapState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    map.getCanvas().style.cursor = tool === 'pan' && stage === null ? '' : 'crosshair';
  }, [tool, stage, mapState]);

  /* ── the sheet underlay ────────────────────────────────────────────── */

  useEffect(() => {
    if (!sheet) {
      setSheetUrl(null);
      return;
    }
    let live = true;
    void flatten(sheet.pngBase64)
      .then((url) => live && setSheetUrl(url))
      .catch(() => live && setSheetUrl(`data:image/png;base64,${sheet.pngBase64}`));
    return () => {
      live = false;
    };
  }, [sheet]);

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
    if (mapState === 'ready' && sheetUrl && !placement && zoomedIn) placeAtView();
  }, [mapState, sheetUrl, placement, placeAtView, zoomedIn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    const existing = map.getSource(ID.sheet);
    const edge = map.getSource(ID.sheetEdge) as GeoJSONSource | undefined;
    if (!sheetUrl || !placement || !sheetOn) {
      if (map.getLayer(ID.sheet)) map.removeLayer(ID.sheet);
      if (existing) map.removeSource(ID.sheet);
      void edge?.setData(EMPTY_FC);
      return;
    }
    const corners = underlayCorners(placement).map((p) => [p.lng, p.lat] as [number, number]);
    const quad = [corners[0]!, corners[1]!, corners[2]!, corners[3]!] as [[number, number], [number, number], [number, number], [number, number]];
    if (!existing) {
      map.addSource(ID.sheet, { type: 'image', url: sheetUrl, coordinates: quad });
      // Over the imagery, under the trace: a corner dropped on the sheet stays visible on top of it.
      map.addLayer({ id: ID.sheet, type: 'raster', source: ID.sheet, paint: { 'raster-opacity': opacity / 100, 'raster-fade-duration': 0 } }, ID.shape);
    } else {
      (existing as ImageSource).setCoordinates(quad);
      map.setPaintProperty(ID.sheet, 'raster-opacity', opacity / 100);
    }
    void edge?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [...corners, corners[0]!] } });
    map.setPaintProperty(ID.sheetEdge, 'line-dasharray', fit ? [1, 0] : [3, 2]);
  }, [sheetUrl, placement, sheetOn, opacity, fit, mapState]);

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

  const search = async (e: React.FormEvent): Promise<void> => {
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
    stage !== null ? t.map.fitStep[stage] : tool === 'pick' ? t.map.howPick : trace.closed ? t.map.howClosed : tool === 'draw' ? t.map.howStart : t.map.howPan;

  const tools: readonly { id: Tool; icon: typeof PenLine; label: string }[] = [
    { id: 'draw', icon: PenLine, label: t.map.draw },
    { id: 'pan', icon: Hand, label: t.map.pan },
    { id: 'pick', icon: MousePointerClick, label: t.map.pick },
  ];

  return (
    // The map does not mirror: north does not move with the language. The controls around it do.
    <div className="relative h-full w-full overflow-hidden bg-sunken">
      <div ref={hostRef} dir="ltr" className="absolute inset-0" aria-describedby="pm-how" />

      {/* Lengths along each boundary, from the classic studio's own measure. */}
      <div aria-hidden="true" dir="ltr" className="pointer-events-none absolute inset-0">
        {labels.map((l) => (
          <span
            key={l.id}
            className="figure absolute -translate-x-1/2 -translate-y-1/2 rounded-sm bg-panel/90 px-1.5 py-0.5 text-[11px] text-fg shadow-soft"
            style={{ left: l.x, top: l.y }}
          >
            {l.text}
          </span>
        ))}
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

        <div role="toolbar" aria-label={t.plot.view} className="pointer-events-auto ms-auto flex items-center gap-1 rounded-lg border border-line bg-panel/95 p-1 shadow-soft backdrop-blur">
          {tools.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={tool === id}
              onClick={() => {
                setTool(id);
                setStage(null);
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
            onClick={() => setStreets((s) => !s)}
            className={cn('inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium', streets ? 'bg-accent-subtle text-accent-strong' : 'text-secondary hover:bg-hover hover:text-fg')}
          >
            <Layers className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t.map.streets}</span>
          </button>
        </div>
      </div>

      {/* ── the sheet overlay, when the affection plan carried a site plan ── */}
      {sheet ? (
        <div className="absolute end-3 top-16 grid w-64 gap-2 rounded-lg border border-line bg-panel/95 p-3 text-[12.5px] shadow-soft backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-fg">{t.map.sheet}</p>
            <Button variant="ghost" size="icon" className="size-7" aria-pressed={sheetOn} aria-label={t.map.sheetShow} onClick={() => setSheetOn((s) => !s)}>
              {sheetOn ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            </Button>
          </div>
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
              <Button variant="secondary" size="sm" disabled={!zoomedIn} onClick={placeAtView}>
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
            <Button
              variant="ghost"
              size="sm"
              disabled={trace.ring.length === 0}
              onClick={() => onTrace(trace.closed ? { ring: trace.ring, closed: false } : { ring: trace.ring.slice(0, -1), closed: false })}
            >
              <Undo2 aria-hidden="true" />
              {t.map.undo}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={trace.ring.length === 0}
              onClick={() => {
                onTrace({ ring: [], closed: false });
                setTool('draw');
                setNotice(null);
              }}
            >
              <Trash2 aria-hidden="true" />
              {t.map.clear}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="rounded-sm bg-panel/85 px-2 py-0.5 text-[10.5px] text-secondary backdrop-blur">{t.map.credit}</p>
          {trace.closed && trace.ring.length >= 3 ? (
            <div className="flex items-center gap-2">
              <p className="hidden rounded-sm bg-panel/85 px-2 py-0.5 text-[11px] text-secondary backdrop-blur md:block">{t.map.precision}</p>
              <Button variant="brand" size="lg" onClick={() => onUse(trace.ring)}>
                {t.map.use}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
