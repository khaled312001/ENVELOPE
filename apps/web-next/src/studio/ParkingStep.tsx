import type { Sheet } from '@envelope/sheets';
import { Check } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import type { AccessCandidateView, RunRequestBody, RunView, VehicleAccessArrangement } from '@web/api/client.js';

import { PlotSketch } from '../components/PlotSketch.js';
import { SheetViewer, useSheets } from '../components/SheetViewer.js';
import { Traced } from '../components/Traced.js';
import { cn } from '../lib/cn.js';
import { grouped } from '../lib/figures.js';
import { EngineNote, EngineText, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Badge, Field, Input, Notice, PanelHeader, Select, Spinner } from '../ui/primitives.js';
import { Segmented } from '../ui/radix.js';
import { assumedFirst, Footer, Heading, More, NextStep, Row } from './parts.js';

export type VehicleAccessBody = NonNullable<RunRequestBody['vehicleAccess']>;

/*
  THE SCREEN THE 30 AUG MEETING WAS ABOUT.

  Every bay, aisle and ramp on these sheets was placed by the engine, and the
  sheet is written by the same function the A3 set and the DXF are. The losses
  are three numbers, never one efficiency: a reader can argue with the reserved
  zone, the cross aisle or the corner a rectangle cannot reach, and not with a
  percentage that hides which.
*/
export function ParkingCanvas({ run, initialKind = 'PARKING' }: { readonly run: RunView; readonly initialKind?: Sheet['kind'] }): JSX.Element {
  const { t } = useLocale();
  const sheets = useSheets(run.building, {
    plotNumber: run.plot.plotNumber,
    community: run.plot.community,
    runId: run.runId,
    issuedAt: run.issuedAt,
    ...(run.gates?.['G4_REVIEWER_NAMED']?.actorName ? { checkedBy: run.gates['G4_REVIEWER_NAMED'].actorName } : {}),
  });
  if (!run.building) return <p className="grid h-full place-items-center p-6 text-center text-secondary">{t.capacity.noModel}</p>;
  return <SheetViewer sheets={sheets} initialKind={initialKind} />;
}

export function ParkingPanel({
  run,
  busy,
  canChoose,
  onPlace,
  onNext,
}: {
  readonly run: RunView;
  readonly busy: boolean;
  readonly canChoose: boolean;
  /** The entrance the reader placed, or null to take the recommendation back. */
  readonly onPlace: (access: VehicleAccessBody | null) => void;
  /** Optional so a caller that does not wire it keeps working; when given, it is the panel's one primary action. */
  readonly onNext?: () => void;
}): JSX.Element {
  const { t } = useLocale();
  const lp = run.levelPlan;
  if (!lp) {
    return (
      <div>
        <PanelHeader title={t.parking.title} />
        <div className="p-4">
          <Notice tone="neutral" title={t.parking.noPlan}>
            {run.levelPlanRefusal ? <EngineText>{run.levelPlanRefusal}</EngineText> : null}
          </Notice>
        </div>
      </div>
    );
  }
  const chosen = lp.access.chosen ?? null;
  const recommended = lp.access.recommended;
  const inUse = chosen ?? recommended;
  // Supply against demand first; how the level was packed folds away — unless any of it was assumed.
  const { shown, folded } = assumedFirst(
    [
      { key: 'required', label: t.parking.required, value: run.parking.totalBays },
      { key: 'perLevel', label: t.parking.baysPerLevel, value: lp.bayCount },
      { key: 'levels', label: t.parking.levelsRequired, value: run.parking.levelsRequired },
      { key: 'perBay', label: t.parking.areaPerBay, value: lp.areaPerBayM2 },
    ],
    [
      { key: 'orientation', label: t.parking.orientation, value: lp.orientation },
      { key: 'module', label: t.parking.module, value: lp.moduleDepthM },
    ],
  );
  return (
    <div>
      <PanelHeader title={t.parking.title} hint={t.parking.hint} />
      <div className="grid grid-cols-1 gap-6 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          {shown.map((f) => (
            <Row key={f.key} label={f.label}>
              <Traced value={f.value} size="lg" />
            </Row>
          ))}
        </dl>

        {/* The level at grade: its own count, and what the drive and the plant cost it, by cause. */}
        {lp.grade ? (
          <section className="grid min-w-0 gap-2" aria-labelledby="grade">
            <Heading id="grade">{t.parking.grade.title}</Heading>
            <p className="text-[12px] text-secondary">{t.parking.grade.hint}</p>
            <dl className="grid grid-cols-2 gap-x-4">
              <Row label={t.parking.grade.bays}>
                <Traced value={lp.grade.bayCount} />
              </Row>
            </dl>
            <ul className="grid gap-0.5 text-[12px] text-fg">
              <li>{t.parking.grade.drive(lp.grade.dropped.drive)}</li>
              <li>{t.parking.grade.plant(lp.grade.dropped.plant)}</li>
            </ul>
            <p className="text-[12px] text-secondary">
              {lp.grade.plantBand ? t.parking.grade.band(lp.grade.plantBand.edgeSeq) : t.parking.grade.noBand}
            </p>
            {lp.grade.notes.length > 0 ? (
              <ul className="grid gap-1 text-[12px] text-secondary">
                {lp.grade.notes.map((n, i) => (
                  <li key={i}>
                    <EngineNote text={n} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <section className="grid min-w-0 gap-2.5" aria-labelledby="access">
          <Heading id="access">{t.parking.access}</Heading>
          {inUse ? (
            <div className="grid gap-1">
              <p className="flex flex-wrap items-center gap-2">
                <Badge tone={chosen ? 'accent' : 'neutral'}>{chosen ? t.parking.chosen : t.parking.recommended}</Badge>
                <span className="text-[14px] font-medium text-fg">{t.parking.onBoundary(inUse.edgeSeq)}</span>
              </p>
              {/* Every opening, signed, from the engine's own figures. */}
              {inUse.openings ? (
                <ul className="grid gap-0.5 text-[12px] text-fg">
                  {inUse.openings.map((o) => (
                    <li key={`${o.role}-${o.edgeSeq}`}>
                      <span className="font-medium">{t.parking.role[o.role]}</span> · <span className="figure !whitespace-normal">{t.parking.openingAt(o.edgeSeq, o.centreOffsetM, o.widthM)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <EngineNote className="text-[12px] leading-relaxed text-secondary" text={inUse.rationale} />
              {chosen && recommended && recommended.edgeSeq !== chosen.edgeSeq ? (
                <p className="text-[12px] text-secondary">{t.parking.recommendedWas(recommended.edgeSeq)}</p>
              ) : null}
            </div>
          ) : (
            <Notice tone="neutral">{t.parking.noAccess}</Notice>
          )}
          {!canChoose ? <p className="text-[12px] text-secondary">{t.parking.cannotChoose}</p> : null}
          {lp.access.candidates.length > 0 ? (
            <EntranceEditor key={run.runId} run={run} busy={busy} canChoose={canChoose} onPlace={onPlace} />
          ) : null}
          <ul className="grid min-w-0 divide-y divide-subtle border-y border-subtle">
            {lp.access.candidates.map((cand: AccessCandidateView) => {
              const isOn = inUse?.edgeSeq === cand.edgeSeq;
              return (
                <li key={cand.edgeSeq} className="flex items-center gap-3 py-2">
                  <span
                    className={cn(
                      'figure grid size-6 shrink-0 place-items-center rounded border text-[11px]',
                      isOn ? 'border-accent text-accent-strong' : 'border-strong text-fg',
                    )}
                  >
                    {cand.edgeSeq}
                  </span>
                  <div className="min-w-0 flex-1 text-[12px]">
                    <p className="text-fg">
                      {t.parking.rank(cand.rank)} · {cand.hierarchy ? t.plot.road[cand.hierarchy as 'LOCAL'] ?? cand.hierarchy : t.parking.noHierarchy}
                    </p>
                    {/* Allowed to wrap: a figure's no-wrap here widened the whole panel past its edge. */}
                    <p className="figure !whitespace-normal text-tertiary">{t.parking.window(cand.usableWindowM, cand.widthM)}</p>
                  </div>
                  {isOn ? (
                    <span className="flex items-center gap-1 text-[12px] text-accent-strong">
                      <Check className="size-3.5" aria-hidden="true" />
                      {t.parking.inUse}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!canChoose || busy}
                      aria-busy={busy || undefined}
                      onClick={() => onPlace({ arrangement: 'TWO_WAY', entry: { edgeSeq: cand.edgeSeq } })}
                    >
                      {busy ? <Spinner /> : null}
                      {t.parking.useThis}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {chosen ? (
            <Button variant="ghost" size="sm" className="justify-self-start" disabled={!canChoose || busy} onClick={() => onPlace(null)}>
              {t.parking.useRecommendation}
            </Button>
          ) : null}
        </section>

        {/* What was not assessed stays in view: a gap is never one click away. */}
        {lp.notAssessed.length > 0 ? (
          <section className="grid gap-1.5" aria-labelledby="na">
            <h3 id="na" className="not-assessed text-[12px] font-medium text-fg">
              {t.parking.notAssessed}
            </h3>
            <ul className="grid gap-1 text-[12px] text-secondary">
              {lp.notAssessed.map((n, i) => (
                <li key={i}>
                  <EngineNote text={n} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div>
          {/* Three losses, never one percentage — folded, not merged. */}
          <More summary={t.parking.losses}>
            <ul className="grid divide-y divide-subtle">
              {(
                [
                  ['reserved', lp.losses.reserved],
                  ['circulation', lp.losses.circulation],
                  ['footprint', lp.losses.footprint],
                ] as const
              ).map(([k, loss]) => (
                <li key={k} className="flex items-baseline justify-between gap-2 py-1.5 text-[12.5px]">
                  <span className="text-fg">{t.parking.loss[k]}</span>
                  <span className="figure text-secondary">{t.parking.lossValue(String(loss.bays), grouped(loss.areaM2))}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11.5px] text-tertiary">{t.parking.standard(lp.standard.bayWidthM, lp.standard.bayLengthM, lp.standard.drivewayWidthM)}</p>
          </More>
          {folded.length > 0 ? (
            <More summary={folded.map((f) => f.label).join(' · ')}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {folded.map((f) => (
                  <Row key={f.key} label={f.label}>
                    <Traced value={f.value} />
                  </Row>
                ))}
              </dl>
            </More>
          ) : null}
          {lp.access.rejected.length > 0 ? (
            <More summary={t.parking.rejected(lp.access.rejected.length)}>
              <ul className="grid gap-1 text-[12px] text-secondary">
                {lp.access.rejected.map((r) => (
                  <li key={r.edgeSeq}>
                    <span className="figure me-1.5 text-tertiary">{r.edgeSeq}</span>
                    <EngineNote text={r.reason} />
                  </li>
                ))}
              </ul>
            </More>
          ) : null}
        </div>

        {onNext ? (
          <Footer>
            <NextStep label={t.studio.step.checks} onClick={onNext} />
          </Footer>
        ) : null}
      </div>
    </div>
  );
}

/*
  THE ENTRANCE, PLACED BY THE READER (Eng. Mohamed, 16 Oct 2026): «انا دوست علي
  ضلع رقم ١ و بعدين بختار ال جزء الي هيكون فيه المدخل». The boundary, the point
  along it, and the arrangement: one two-way opening of 6 m, or an entry and an
  exit of 3 m each, side by side or apart.

  Every bound on the controls is the engine's (`centreRange`), and the engine
  checks the placement again on the run: a figure typed outside the range is
  said here before it is sent, and refused there in a sentence if it is sent
  anyway. The plan shows the entrance the engine drew, never a preview the
  browser worked out — a preview would be geometry nobody computed.
*/
interface Spot {
  readonly edgeSeq: number;
  /** Metres from the boundary's first corner to the opening's centre; empty centres it. */
  readonly at: string;
}

const METRES = /^\d+(\.\d+)?$/;

function EntranceEditor({
  run,
  busy,
  canChoose,
  onPlace,
}: {
  readonly run: RunView;
  readonly busy: boolean;
  readonly canChoose: boolean;
  readonly onPlace: (access: VehicleAccessBody | null) => void;
}): JSX.Element {
  const { t } = useLocale();
  const access = run.levelPlan!.access;
  const cands = access.candidates;
  const chosen = access.chosen ?? null;
  const inUse = chosen ?? access.recommended;
  const model = run.building;
  const sides = model?.plot.edges.length ?? 0;

  const exitOpening = chosen?.openings?.find((o) => o.role === 'EXIT');
  const [arrangement, setArrangement] = useState<VehicleAccessArrangement>(chosen?.arrangement ?? 'TWO_WAY');
  const [entry, setEntry] = useState<Spot>({ edgeSeq: inUse?.edgeSeq ?? cands[0]!.edgeSeq, at: chosen ? chosen.centreOffsetM : '' });
  const [exit, setExit] = useState<Spot>(
    chosen?.arrangement === 'ONE_WAY_SEPARATE' && exitOpening
      ? { edgeSeq: exitOpening.edgeSeq, at: exitOpening.centreOffsetM }
      : { edgeSeq: (cands[1] ?? cands[0])!.edgeSeq, at: '' },
  );
  const [target, setTarget] = useState<'entry' | 'exit'>('entry');
  const [note, setNote] = useState<ReactNode>(null);

  const separate = arrangement === 'ONE_WAY_SEPARATE';
  const gap = separate ? 'threeM' : 'sixM';
  const candOf = (seq: number): AccessCandidateView | undefined => cands.find((c) => c.edgeSeq === seq);
  /** The engine's range for this width; null where it does not fit, undefined on a run stored before ranges. */
  const rangeOf = (seq: number) => {
    const c = candOf(seq);
    return c?.centreRange ? c.centreRange[gap] : undefined;
  };
  const problemOf = (s: Spot): ReactNode => {
    const r = rangeOf(s.edgeSeq);
    if (r === null) return t.parking.tooShortFor;
    const v = s.at.trim();
    if (v === '') return null;
    if (!METRES.test(v)) return t.parking.notNumber;
    if (r && (Number(v) < Number(r.fromM) || Number(v) > Number(r.toM))) return t.parking.outOfRange(r.fromM, r.toM);
    return null;
  };

  const pickAt = (seq: number, fraction: number | null): void => {
    const set = separate && target === 'exit' ? setExit : setEntry;
    const cand = candOf(seq);
    if (!cand) {
      const why = access.rejected.find((r) => r.edgeSeq === seq);
      setNote(
        <>
          {t.parking.notRoad(seq)} {why ? <EngineNote text={why.reason} /> : null}
        </>,
      );
      return;
    }
    const length = model?.plot.edges.find((e) => e.seq === seq)?.lengthMm;
    if (fraction === null || length === undefined) {
      set({ edgeSeq: seq, at: '' });
      setNote(null);
      return;
    }
    // A click is not finer than a decimetre; the field takes any figure typed.
    let v = Math.round((fraction * length) / 100) / 10;
    const r = cand.centreRange?.[gap];
    let moved = false;
    if (r) {
      const lo = Number(r.fromM);
      const hi = Number(r.toM);
      if (v < lo || v > hi) {
        v = v < lo ? lo : hi;
        moved = true;
      }
    }
    const at = v.toFixed(2);
    set({ edgeSeq: seq, at });
    setNote(moved ? t.parking.moved(at) : null);
  };

  const body = (s: Spot) => ({ edgeSeq: s.edgeSeq, ...(s.at.trim() === '' ? {} : { centreOffsetM: s.at.trim() }) });
  const blocked = problemOf(entry) !== null || (separate && problemOf(exit) !== null);
  const roadWords = (c: AccessCandidateView): string =>
    c.hierarchy ? t.plot.road[c.hierarchy as 'LOCAL'] ?? c.hierarchy : t.parking.noHierarchy;

  const spotFields = (what: string, s: Spot, set: (s: Spot) => void): JSX.Element => {
    const c = candOf(s.edgeSeq);
    const r = rangeOf(s.edgeSeq);
    const corners = c?.junctionAt
      ? [c.junctionAt.start ? `P${s.edgeSeq}` : null, c.junctionAt.end ? `P${(s.edgeSeq + 1) % Math.max(sides, 1)}` : null].filter(
          (x): x is string => x !== null,
        )
      : null;
    return (
      <div className="grid gap-2">
        <Field label={t.parking.boundaryOf(what)}>
          {({ id }) => (
            <Select id={id} value={String(s.edgeSeq)} onChange={(e) => set({ edgeSeq: Number(e.target.value), at: '' })}>
              {cands.map((o) => (
                <option key={o.edgeSeq} value={o.edgeSeq}>
                  {t.parking.boundaryOption(o.edgeSeq, (o.edgeSeq + 1) % Math.max(sides, 1), roadWords(o))}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label={t.parking.centre(what, s.edgeSeq)}
          hint={
            <>
              {r ? `${t.parking.range(r.fromM, r.toM, s.edgeSeq)} ` : null}
              {corners ? `${t.parking.rangeWhy(corners)} ` : null}
              {t.parking.centreBlank}
            </>
          }
          error={problemOf(s)}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              dir="ltr"
              inputMode="decimal"
              className="figure"
              value={s.at}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              onChange={(e) => set({ ...s, at: e.target.value })}
            />
          )}
        </Field>
      </div>
    );
  };

  return (
    <div className="grid min-w-0 gap-3 rounded-md border border-line p-3">
      {model ? (
        <div className="grid gap-1.5">
          <div className="aspect-[4/3] w-full rounded-md border border-subtle bg-sunken">
            <PlotSketch
              vertices={model.plot.outline.map((p) => ({ x: String(p.x / 1000), y: String(p.y / 1000) }))}
              edges={model.plot.edges.map((e) => ({ seq: e.seq, classification: e.classification, roadHierarchy: e.roadHierarchy }))}
              label={t.parking.planLabel}
              highlight={separate && target === 'exit' ? exit.edgeSeq : entry.edgeSeq}
              {...(canChoose ? { onPick: (seq: number) => pickAt(seq, null), onPickAt: pickAt, pickLabel: t.parking.pickBoundary } : {})}
              openings={(inUse?.openings ?? (inUse ? [{ ...inUse.opening, role: 'ENTRY_EXIT' as const }] : [])).map((o) => ({
                start: o.start,
                end: o.end,
                role: o.role,
              }))}
            />
          </div>
          <p className="text-[12px] text-secondary">{t.parking.planHint}</p>
          {note ? (
            <p role="status" className="text-[12px] text-fg">
              {note}
            </p>
          ) : null}
        </div>
      ) : null}

      <fieldset className="grid gap-1.5">
        <legend className="mb-1 text-[12.5px] font-medium text-fg">{t.parking.arrangement}</legend>
        {(['TWO_WAY', 'ONE_WAY_PAIR', 'ONE_WAY_SEPARATE'] as const).map((a) => (
          <label
            key={a}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-[13px]',
              arrangement === a ? 'border-accent bg-accent-subtle text-fg' : 'border-line text-fg hover:border-strong',
            )}
          >
            <input
              type="radio"
              name={`arrangement-${run.runId}`}
              value={a}
              checked={arrangement === a}
              onChange={() => {
                setArrangement(a);
                setTarget('entry');
                setNote(null);
              }}
              className="size-4 accent-[var(--accent)]"
            />
            <span className="flex-1">{t.parking.arrangements[a]}</span>
            <span dir="ltr" className="figure text-[12px] text-secondary">
              {t.parking.arrangementWidth[a]}
            </span>
          </label>
        ))}
      </fieldset>

      {separate ? (
        <Segmented
          label={t.parking.placing}
          value={target}
          onChange={setTarget}
          options={[
            { value: 'entry', label: t.parking.entry },
            { value: 'exit', label: t.parking.exit },
          ]}
        />
      ) : null}

      {spotFields(separate ? t.parking.entry : t.parking.entrance, entry, setEntry)}
      {separate ? spotFields(t.parking.exit, exit, setExit) : null}

      <Button
        className="justify-self-start"
        disabled={!canChoose || busy || blocked}
        aria-busy={busy || undefined}
        onClick={() => onPlace({ arrangement, entry: body(entry), ...(separate ? { exit: body(exit) } : {}) })}
      >
        {busy ? <Spinner /> : null}
        {t.parking.place}
      </Button>
    </div>
  );
}
