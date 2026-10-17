import { X } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import type { LevelPlanView, VehicleAccessArrangement } from '@web/api/client.js';

import type { SketchPin } from '../components/PlotSketch.js';
import { EngineNote } from '../lib/engine-text.js';
import { useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Segmented } from '../ui/radix.js';
import type { VehicleAccessBody } from './ParkingStep.js';

/*
  THE ENTRANCE, PLACED ON THE PLAN (Eng. Mohamed, 16 Oct 2026: «من هنا قصدي»,
  over a screenshot of the plot step's plan with boundary 0 selected and a mark
  near its corner with boundary 5). Not in a side panel: on the drawing, at the
  point along the boundary where the entrance goes.

  The click is read as a fraction of the boundary and turned into metres from its
  first corner with the length the ENGINE computed — so nothing is placed on a
  plot that is not filed yet, whose lengths nobody has measured. The point is
  what the reader asked for; whether B.7.2.1 allows it is the engine's to say,
  on the run, in a sentence. Where a run already exists its ranges are known, and
  a point outside one is moved to the nearest allowed point and said so — the same
  rule the parking step's editor follows.
*/

export interface PlanEdge {
  readonly seq: number;
  readonly classification: string;
  /** The engine's length, metres. Absent before the plot is filed. */
  readonly lengthM?: string;
}

interface Spot {
  readonly edgeSeq: number;
  /** Metres from the boundary's first corner to the opening's centre. */
  readonly at: string;
}

interface Draft {
  readonly from: string;
  readonly arrangement: VehicleAccessArrangement;
  readonly target: 'entry' | 'exit';
  readonly entry: Spot | null;
  readonly exit: Spot | null;
}

const fromBody = (b: VehicleAccessBody | null): Draft => {
  const spot = (s: { edgeSeq: number; centreOffsetM?: string } | undefined): Spot | null =>
    s && s.centreOffsetM !== undefined ? { edgeSeq: s.edgeSeq, at: s.centreOffsetM } : null;
  return {
    from: JSON.stringify(b),
    arrangement: b?.arrangement ?? 'TWO_WAY',
    target: 'entry',
    entry: spot(b?.entry),
    exit: spot(b?.exit),
  };
};

const toBody = (d: Draft): VehicleAccessBody | null => {
  if (!d.entry) return null;
  const entry = { edgeSeq: d.entry.edgeSeq, centreOffsetM: d.entry.at };
  if (d.arrangement !== 'ONE_WAY_SEPARATE') return { arrangement: d.arrangement, entry };
  return d.exit ? { arrangement: d.arrangement, entry, exit: { edgeSeq: d.exit.edgeSeq, centreOffsetM: d.exit.at } } : null;
};

export interface EntranceTool {
  /** The pins to draw, the placement handler for the plan, and the card. */
  readonly pins: readonly SketchPin[];
  readonly onPickAt: (seq: number, fraction: number) => void;
  readonly card: ReactNode;
}

export function useEntranceOnPlan({
  entrance,
  onEntrance,
  edges,
  access,
  recomputes,
  onDone,
}: {
  readonly entrance: VehicleAccessBody | null;
  readonly onEntrance: (next: VehicleAccessBody | null) => void;
  readonly edges: readonly PlanEdge[];
  /** The run's access analysis, when a run exists: the ranges a point is held to. */
  readonly access: LevelPlanView['access'] | null;
  /** Whether placing computes the study again (a run exists) or travels with the first run. */
  readonly recomputes: boolean;
  readonly onDone: () => void;
}): EntranceTool {
  const { t } = useLocale();
  const [draft, setDraft] = useState<Draft>(() => fromBody(entrance));
  const [note, setNote] = useState<ReactNode>(null);
  // A placement that came back from the run (or was taken back) replaces what was being drawn.
  const key = JSON.stringify(entrance);
  const d = draft.from === key ? draft : fromBody(entrance);
  if (d !== draft) setDraft(d);

  const lengthOf = (seq: number): number | null => {
    const v = Number(edges.find((e) => e.seq === seq)?.lengthM);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const separate = d.arrangement === 'ONE_WAY_SEPARATE';

  const commit = (next: Draft): void => {
    setDraft(next);
    const body = toBody(next);
    if (body) onEntrance(body);
  };

  const onPickAt = (seq: number, fraction: number): void => {
    const edge = edges.find((e) => e.seq === seq);
    const length = lengthOf(seq);
    if (length === null) {
      setNote(t.plot.entrance.needsFile);
      return;
    }
    if (edge?.classification !== 'ROAD') {
      setNote(t.plot.entrance.notRoad(seq));
      return;
    }
    let v = Math.round(fraction * length * 10) / 10;
    let moved = false;
    if (access) {
      const cand = access.candidates.find((c) => c.edgeSeq === seq);
      if (!cand) {
        const why = access.rejected.find((r) => r.edgeSeq === seq);
        setNote(
          <>
            {t.parking.notRoad(seq)} {why ? <EngineNote text={why.reason} /> : null}
          </>,
        );
        return;
      }
      const r = cand.centreRange?.[separate ? 'threeM' : 'sixM'];
      if (r === null) {
        setNote(t.parking.tooShortFor);
        return;
      }
      if (r) {
        const lo = Number(r.fromM);
        const hi = Number(r.toM);
        if (v < lo || v > hi) {
          v = v < lo ? lo : hi;
          moved = true;
        }
      }
    }
    const at = v.toFixed(2);
    const spot: Spot = { edgeSeq: seq, at };
    if (!separate) {
      commit({ ...d, entry: spot, exit: null });
      setNote(moved ? t.parking.moved(at) : null);
      return;
    }
    const placed = d.target === 'entry' ? { ...d, entry: spot } : { ...d, exit: spot };
    const other = d.target === 'entry' ? placed.exit : placed.entry;
    if (other) {
      commit(placed);
      setNote(moved ? t.parking.moved(at) : null);
    } else {
      setDraft({ ...placed, target: d.target === 'entry' ? 'exit' : 'entry' });
      setNote(
        <>
          {moved ? `${t.parking.moved(at)} ` : null}
          {d.target === 'entry' ? t.plot.entrance.exitNext : t.plot.entrance.entryNext}
        </>,
      );
    }
  };

  const setArrangement = (a: VehicleAccessArrangement): void => {
    const next: Draft = { ...d, arrangement: a, target: 'entry' };
    if (a !== 'ONE_WAY_SEPARATE') {
      if (next.entry) commit(next);
      else setDraft(next);
      setNote(null);
      return;
    }
    if (next.entry && next.exit) {
      commit(next);
      setNote(null);
    } else {
      setDraft({ ...next, target: next.entry ? 'exit' : 'entry' });
      setNote(next.entry ? t.plot.entrance.exitNext : null);
    }
  };

  const pinOf = (s: Spot | null, role: SketchPin['role']): SketchPin[] => {
    const length = s ? lengthOf(s.edgeSeq) : null;
    if (!s || length === null) return [];
    return [{ seq: s.edgeSeq, at: Math.min(1, Math.max(0, Number(s.at) / length)), role, label: t.plot.entrance.pin[role] }];
  };
  const pins = separate ? [...pinOf(d.entry, 'ENTRY'), ...pinOf(d.exit, 'EXIT')] : pinOf(d.entry, 'ENTRY_EXIT');

  const line = (what: string, s: Spot | null): ReactNode =>
    s ? <li>{t.plot.entrance.at(what, s.edgeSeq, s.at)}</li> : null;

  /*
    A strip between the toolbar and the drawing, never a card over it: the point
    the reader wants is as often as not by a corner, and a card laid over the plan
    hid exactly that corner on the first try.
  */
  const card = (
    <section
      aria-labelledby="entrance-card"
      onKeyDown={(ev) => {
        if (ev.key === 'Escape') onDone();
      }}
      className="grid gap-2 border-b border-line bg-panel px-4 py-2.5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="entrance-card" className="me-1 text-[13px] font-medium text-fg">
          {t.plot.entrance.title}
        </h3>
        <div role="group" aria-label={t.parking.arrangement} className="flex flex-wrap gap-1.5">
          {(['TWO_WAY', 'ONE_WAY_PAIR', 'ONE_WAY_SEPARATE'] as const).map((a, k) => (
            <Button
              key={a}
              size="sm"
              variant={d.arrangement === a ? 'accent' : 'secondary'}
              aria-pressed={d.arrangement === a}
              autoFocus={k === 0}
              onClick={() => setArrangement(a)}
            >
              {t.parking.arrangements[a]}
              <span dir="ltr" className="figure text-[11.5px] opacity-80">
                {t.parking.arrangementWidth[a]}
              </span>
            </Button>
          ))}
        </div>
        {separate ? (
          <Segmented
            label={t.parking.placing}
            value={d.target}
            onChange={(v) => setDraft({ ...d, target: v })}
            options={[
              { value: 'entry', label: t.parking.entry },
              { value: 'exit', label: t.parking.exit },
            ]}
          />
        ) : null}
        <span className="ms-auto flex items-center gap-1">
          {entrance ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNote(null);
                onEntrance(null);
              }}
            >
              {t.plot.entrance.remove}
            </Button>
          ) : null}
          <Button variant="ghost" size="icon" className="size-8" aria-label={t.plot.entrance.done} onClick={onDone}>
            <X aria-hidden="true" />
          </Button>
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px]">
        {d.entry || d.exit ? (
          <ul className="flex flex-wrap gap-x-4 font-medium text-fg">
            {separate ? (
              <>
                {line(t.parking.entry, d.entry)}
                {line(t.parking.exit, d.exit)}
              </>
            ) : (
              line(t.parking.entrance, d.entry)
            )}
          </ul>
        ) : (
          <p className="text-secondary">{t.plot.entrance.none}</p>
        )}
        <p role="status" className={note ? 'text-fg' : 'text-secondary'}>
          {note ?? t.plot.entrance.hint}
        </p>
        <p className="text-tertiary">{recomputes ? t.plot.entrance.recomputes : t.plot.entrance.sent}</p>
      </div>
    </section>
  );

  return { pins, onPickAt, card };
}
