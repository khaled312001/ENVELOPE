import type { LngLat } from '@web/geo.js';

import type { DraftPlot, EdgeClass, Hierarchy } from './model.js';

/*
  EACH BOUNDARY'S CLASS, SUGGESTED FROM THE SHEET AND THE MAP, AND FILLED IN.

  Eng. Mohamed, 16 Oct 2026: «عاوز التصنيفات دي تلقائي تتحدد بناء على معلومات ملف
  الافكشن بلان وبناء على موقع الخريطه وتلقائي يطلعهم ومع امكانيه تغييرهم».

  Two witnesses, ranked. The sheet is the plot's own instrument: what it prints
  outside a boundary — ROAD, or the neighbouring plot's number — decides the
  class, and the map is not allowed to contradict it. The sheet never ranks a
  road, so the hierarchy comes from the map's road beside that boundary, when
  there is one. Where the sheet is silent, a road the map draws alongside the
  boundary makes it a road. Where both are silent nothing is suggested, because
  "no road on the map" is not evidence of a neighbour — OpenStreetMap is often
  behind a new community.

  A suggestion fills only an EMPTY field, once, and its source is written under
  the boundary, so it is never a value nobody can see the origin of. The reader
  changes it with the same list, and filing the plot is their confirmation —
  the class goes to the API as theirs, as a pre-filled podium count does.
*/

/** One boundary's road on the map, as `/api/geo/roads` sends it. */
export interface RoadBeside {
  readonly seq: number;
  readonly road: {
    readonly osmClass: string;
    readonly hierarchy: Exclude<Hierarchy, ''>;
    readonly name: string | null;
    readonly nameAr: string | null;
    readonly distanceM: number;
  } | null;
}

export type SheetHint = { readonly classification: 'ROAD' | 'ADJACENT_PLOT'; readonly verbatim: string } | null;

export interface EdgeSuggestion {
  readonly classification: Exclude<EdgeClass, ''>;
  readonly roadHierarchy: Hierarchy;
  /** Which witness gave the class: the sheet, the map, or the sheet with the map's rank. */
  readonly from: 'sheet' | 'map' | 'both';
  readonly road: RoadBeside['road'];
}

/** The roads beside a ring's boundaries, or null when the map could not be asked. */
export async function fetchRoadsBeside(ring: readonly LngLat[], fetchImpl: typeof fetch = fetch): Promise<readonly RoadBeside[] | null> {
  const q = ring.map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  try {
    const res = await fetchImpl(`/api/geo/roads?ring=${encodeURIComponent(q)}`, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const body = (await res.json()) as { readonly edges?: readonly RoadBeside[] };
    return body.edges?.length === ring.length ? body.edges : null;
  } catch {
    return null;
  }
}

/** One suggestion per boundary, null where neither witness says anything. */
export function suggestEdges(
  n: number,
  hints: readonly SheetHint[],
  roads: readonly RoadBeside[] | null,
): readonly (EdgeSuggestion | null)[] {
  return Array.from({ length: n }, (_, i) => {
    const hint = hints.length === n ? hints[i] ?? null : null;
    const road = roads && roads.length === n ? roads[i]?.road ?? null : null;
    if (hint) {
      if (hint.classification !== 'ROAD') return { classification: hint.classification, roadHierarchy: '', from: 'sheet', road: null };
      return { classification: 'ROAD', roadHierarchy: road?.hierarchy ?? '', from: road ? 'both' : 'sheet', road };
    }
    return road ? { classification: 'ROAD', roadHierarchy: road.hierarchy, from: 'map', road } : null;
  });
}

/** The key a suggestion is applied under, so each one fills its field once and never again. */
export const suggestionKey = (i: number, s: EdgeSuggestion): string => `${i}|${s.classification}|${s.roadHierarchy}`;

/**
 * The draft with every empty field a suggestion covers filled in — a class, or
 * a road's missing rank — skipping keys already applied. Null when nothing changes.
 */
export function fillFromSuggestions(
  draft: DraftPlot,
  suggestions: readonly (EdgeSuggestion | null)[],
  applied: ReadonlySet<string>,
): { readonly draft: DraftPlot; readonly keys: readonly string[] } | null {
  const keys: string[] = [];
  const edges = draft.edges.map((e, i) => {
    const s = suggestions[i];
    if (!s || applied.has(suggestionKey(i, s))) return e;
    if (e.classification === '') {
      keys.push(suggestionKey(i, s));
      return { ...e, classification: s.classification, roadHierarchy: s.roadHierarchy };
    }
    if (e.classification === 'ROAD' && s.classification === 'ROAD' && e.roadHierarchy === '' && s.roadHierarchy !== '') {
      keys.push(suggestionKey(i, s));
      return { ...e, roadHierarchy: s.roadHierarchy };
    }
    return e;
  });
  return keys.length ? { draft: { ...draft, edges }, keys } : null;
}
