import type { PlotCreated, RunView, SheetFace, SheetSetback } from '@web/api/client.js';

import { cn } from '../lib/cn.js';
import { EngineNote, useLocale } from '../lib/locale.js';
import { Input } from '../ui/primitives.js';
import type { EdgeClass } from './model.js';
import { Heading } from './parts.js';

/*
  WHAT THE FILED SHEET SAYS OF ONE KIND OF BOUNDARY, ITS TWO ROWS APART (17 Oct 2026).

  The plot step read `bound` for `setback.<class>`, which was the sheet's PODIUM
  row: on Warsan 6211383 every boundary said "Tower setback, as the affection
  plan states: 0 m" over a sheet whose tower row prints 3 m from the neighbours.
  It now reads the API's per-class resolution, `sheet.setbacks` — the engine's
  own `resolveParameter` over the sheet's rules for this plot — so a front that
  binds only on a one-road plot is a question on a two-road one here exactly as
  it is in the run. A response without it shows the typed field, as before any
  sheet.

  Kept out of `PlotStep.tsx` so a test can render it without the map and the PDF
  rasteriser that file reaches.
*/

/** Is a typed tower setback a number of metres? Blank is allowed: the rule then governs. */
export const isMetres = (s: string): boolean => s.trim() === '' || /^\d+(\.\d+)?$/.test(s.trim());

/*
  THE BOUNDARY FIRST, THEN ITS CLASS. A per-side table (the DDA's) binds side 1 at
  5 m and side 2 at 7 m though both are neighbours; read by class, every
  neighbour would show whichever figure resolved first. `bySeq` is the API's
  per-boundary resolution, and the class is only the fallback for a sheet that
  states its setbacks by kind of boundary.
*/
const sheetSetbacksOf = (
  created: PlotCreated | null,
  cls: Exclude<EdgeClass, ''>,
  seq: number,
): { readonly tower: SheetSetback | undefined; readonly podium: SheetSetback | undefined } => {
  const s = created?.sheet.setbacks;
  return {
    tower: s?.bySeq?.tower[String(seq)] ?? s?.tower[cls],
    podium: s?.bySeq?.podium[String(seq)] ?? s?.podium[cls],
  };
};

/** "front 0 m; side 3 m" — faces in the page's language; a condition is the sheet's wording, kept as printed. */
const facesText = (faces: readonly SheetFace[], face: Readonly<Record<string, string>>, notStated: string): string =>
  faces
    .map((f) => {
      const [word = '', ...rest] = f.face.split(' ');
      const named = [face[word] ?? word, ...rest].join(' ');
      return `${named} ${f.metres === null ? notStated : `${f.metres} m`}`;
    })
    .join('; ');

/**
 * WHAT THE SHEET STATES AND THE RUN DOES NOT APPLY. The API returned this from
 * the day the binder existed and no screen of this site showed it, so a sheet
 * stating six limits read as one stating four. A list, never collapsed: an
 * omission a reader must open to find is still an omission. Nothing when the
 * sheet left nothing out.
 */
export function NotBoundList({ sheet }: { readonly sheet: PlotCreated['sheet'] }): JSX.Element | null {
  const { t } = useLocale();
  if (!sheet.attached || sheet.notBound.length === 0) return null;
  return (
    <section aria-labelledby="plot-not-bound" className="grid gap-2">
      <Heading id="plot-not-bound">{t.plot.notBound.title}</Heading>
      <p className="text-[12px] text-secondary">{t.plot.notBound.lede}</p>
      <ul className="grid gap-1.5 text-[12.5px]">
        {sheet.notBound.map((n) => (
          // Keyed by field AND the sheet's words: two parking uses, or two sides, share no field but may share a reason.
          <li key={`${n.field}|${n.stated}`} className="rounded-md border border-line bg-raised px-3 py-2">
            <EngineNote className="block font-medium text-fg" text={n.field} />
            {/* The sheet's own words, as printed. */}
            <bdi className="figure block text-[11.5px] text-tertiary" dir="ltr">
              {n.stated}
            </bdi>
            <EngineNote className="block text-secondary" text={n.reason} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * WHAT THE SHEET LEAVES OPEN THAT STOPS THE RUN (17 Oct 2026). The run on such a
 * plot is refused at the server in a sentence; this says it on the plot step,
 * before the reader fills four more steps to meet it. Nothing when the sheet
 * states every limit a run needs, and nothing for a response older than the field.
 */
export function SheetBlockingList({ sheet }: { readonly sheet: PlotCreated['sheet'] }): JSX.Element | null {
  const { t } = useLocale();
  const blocking = sheet.blocking ?? [];
  if (!sheet.attached || blocking.length === 0) return null;
  return (
    <section aria-labelledby="plot-sheet-blocking" className="grid gap-2" data-sheet-blocking="">
      <Heading id="plot-sheet-blocking">{t.plot.sheetBlocking.title}</Heading>
      <p className="text-[12px] text-secondary">{t.plot.sheetBlocking.lede}</p>
      <ul className="grid gap-1.5 text-[12.5px]">
        {blocking.map((b) => (
          <li key={b.field} className="rounded-md border border-line bg-raised px-3 py-2">
            <EngineNote className="block font-medium text-fg" text={b.label} />
            <EngineNote className="block text-secondary" text={b.consequence} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * WHAT THE LAST COMPUTATION DID WITH THE SHEET (17 Oct 2026): the general rules'
 * placeholder limits it did not load because the plot has its own affection
 * plan, and what a project brief the reader chose bound. Both were on the run's
 * sheet report from the day the binder learned them, and no screen showed them,
 * so a run on a brief read exactly like a run on the sheet. Listed, never
 * collapsed; nothing at all for a run that set nothing aside and named no brief.
 */
export function RunSheetLists({ sheet }: { readonly sheet: RunView['sheet'] | null | undefined }): JSX.Element | null {
  const { t } = useLocale();
  const placeholders = sheet?.placeholdersNotApplied ?? [];
  const brief = sheet?.briefBound ?? [];
  if (placeholders.length === 0 && brief.length === 0) return null;
  return (
    <>
      {brief.length > 0 ? (
        <section aria-labelledby="plot-brief-bound" className="grid gap-2" data-brief-bound="">
          <Heading id="plot-brief-bound">{t.runSheet.briefTitle}</Heading>
          <p className="text-[12px] text-secondary">{t.runSheet.briefLede}</p>
          <ul className="grid gap-1.5 text-[12.5px]">
            {brief.map((b) => (
              <li key={b.parameterId} className="rounded-md border border-line bg-raised px-3 py-2">
                <span className="flex items-baseline justify-between gap-3">
                  <EngineNote className="font-medium text-fg" text={b.parameterId} />
                  <bdi className="figure text-fg" dir="ltr">
                    {b.value}
                  </bdi>
                </span>
                <EngineNote className="block text-[11.5px] leading-snug text-secondary" text={b.clause} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {placeholders.length > 0 ? (
        <section aria-labelledby="plot-placeholders" className="grid gap-2" data-placeholders="">
          <Heading id="plot-placeholders">{t.runSheet.placeholdersTitle}</Heading>
          <p className="text-[12px] text-secondary">{t.runSheet.placeholdersLede}</p>
          <ul className="grid gap-1.5 text-[12.5px]">
            {placeholders.map((p) => (
              <li key={p.ruleId} className="flex items-baseline justify-between gap-3 rounded-md border border-line bg-raised px-3 py-2">
                <EngineNote className="text-fg" text={p.parameterId} />
                <bdi className="figure text-[11.5px] text-tertiary" dir="ltr">
                  {p.ruleId} · {p.value} {p.unit}
                </bdi>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/**
 * The tower setback for one boundary: the sheet's tower figure where it states
 * one, a typed field everywhere else (with the faces listed where the sheet
 * states it by face), and the podium's figure beneath, labelled as the podium's.
 */
export function TowerSetbackField({
  created,
  cls,
  seq,
  value,
  onChange,
  inline,
}: {
  readonly created: PlotCreated | null;
  readonly cls: Exclude<EdgeClass, ''>;
  readonly seq: number;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** The corner list lays the label and the field side by side; the editor stacks them. */
  readonly inline: boolean;
}): JSX.Element {
  const { t } = useLocale();
  const { tower, podium } = sheetSetbacksOf(created, cls, seq);
  const faces = (f: readonly SheetFace[]): string => facesText(f, t.plot.face, t.plot.faceNotStated);
  const text = inline ? 'text-[11.5px]' : 'text-[12px]';
  const podiumLine = podium ? (
    <p className={cn(text, 'text-tertiary')} data-sheet-row="podium">
      {podium.kind === 'FIXED' ? (
        <>
          {t.plot.podiumFromSheet} <span className="figure">{podium.metres} m</span>
        </>
      ) : podium.kind === 'BY_FACADE' ? (
        t.plot.podiumByFacade(faces(podium.faces))
      ) : (
        t.plot.podiumByFace(faces(podium.faces))
      )}
    </p>
  ) : null;
  if (tower?.kind === 'FIXED') {
    return (
      <>
        <p className={cn(text, 'text-secondary')} data-sheet-row="tower">
          {t.plot.towerSetbackFromSheet} <span className="figure text-fg">{tower.metres} m</span>
        </p>
        {podiumLine}
      </>
    );
  }
  // "The podium reaches this boundary" is the label's claim; it is only true where the sheet does not set the podium back.
  const podiumOnBoundary = podium === undefined || (podium.kind === 'FIXED' && Number(podium.metres) === 0);
  return (
    <>
      <label
        className={cn('grid gap-1 text-secondary', text, inline && 'grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-2')}
      >
        <span>{podiumOnBoundary ? t.plot.towerSetback : t.plot.towerSetbackOnly}</span>
        <Input
          aria-label={t.plot.towerSetbackOf(seq)}
          inputMode="decimal"
          placeholder={t.plot.towerSetbackBlank}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
          aria-invalid={isMetres(value) ? undefined : true}
          className={cn('figure h-8 px-2', !inline && 'w-32')}
          dir="ltr"
        />
      </label>
      {tower ? (
        <p className={cn(text, 'text-secondary')} data-sheet-row="tower">
          {t.plot.towerByFace(faces(tower.faces))}
        </p>
      ) : null}
      {podiumLine}
    </>
  );
}
