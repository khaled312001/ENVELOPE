import { useQuery } from '@tanstack/react-query';

import { type Actor, api, type StandardsView } from '@web/api/client.js';

import { EngineNote, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Notice } from '../ui/primitives.js';
import { Heading } from './parts.js';

/*
  THE PLOT'S PROJECT BRIEF, OFFERED AND NEVER CHOSEN (17 Oct 2026).

  The API accepted `projectBriefId` and this studio had no way to send one, so a
  plot whose affection plan omits its GFA (6468096, MED12) was refused with a
  sentence naming a brief the reader could not select. This is that selection.

  Three rules hold it. It is a BUTTON, pressed or not, and it opens unpressed on
  every study: a brief chosen for the reader is the default FR-DEF-002 forbids,
  and `pnpm smoke:next` refuses a checked choice beside an enabled Compute
  button. The "not a regulation" line is above the button, in amber, as on the
  classic screen. And every figure is the brief's as printed, with its page, so
  the reader can open the document and check it; nothing is computed here.

  Nothing renders when the deployment withholds developer standards or the file
  holds no brief for this plot: the plot step's blocking list already says what
  would supply the limit, and an empty box would read as "there is none".
*/
export function BriefPicker({
  actor,
  plotNumber,
  value,
  onChange,
  sheetOmitsFar,
}: {
  readonly actor: Actor;
  readonly plotNumber: string;
  /** The chosen brief's id, or '' for none. */
  readonly value: string;
  readonly onChange: (briefId: string) => void;
  /** The plot's own sheet leaves its FAR or GFA open — what a brief can fill. */
  readonly sheetOmitsFar: boolean;
}): JSX.Element | null {
  const standards = useQuery({
    queryKey: ['standards', actor.id, plotNumber],
    queryFn: () => api.standards(actor, plotNumber),
    enabled: plotNumber.trim() !== '',
    staleTime: Infinity,
  });
  const brief = standards.data?.brief ?? null;
  if (!brief || brief.plotNumber !== plotNumber.trim()) return null;
  return <BriefCard brief={brief} value={value} onChange={onChange} sheetOmitsFar={sheetOmitsFar} />;
}

/** The brief itself — split out so a test can render it without a server. */
export function BriefCard({
  brief,
  value,
  onChange,
  sheetOmitsFar,
}: {
  readonly brief: NonNullable<StandardsView['brief']>;
  readonly value: string;
  readonly onChange: (briefId: string) => void;
  readonly sheetOmitsFar: boolean;
}): JSX.Element {
  const { t } = useLocale();
  const chosen = value === brief.briefId;
  const row = (label: string, target: { readonly value: string; readonly citation: { readonly sourcePage: number } }): JSX.Element => (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
      <dt className="text-secondary">{label}</dt>
      <dd className="text-end">
        <bdi className="figure text-fg" dir="ltr">
          {target.value}
        </bdi>
        {target.citation.sourcePage ? (
          <span className="ms-2 text-[11px] text-tertiary">{t.brief.page(String(target.citation.sourcePage))}</span>
        ) : null}
      </dd>
    </div>
  );
  return (
    <section aria-labelledby="rules-brief" className="grid gap-2.5" data-brief={brief.briefId}>
      <Heading id="rules-brief">{t.brief.title}</Heading>
      <Notice tone="assumed">{t.brief.notRegulation}</Notice>
      <dl className="grid gap-1.5 text-[12.5px]">
        {row(t.brief.gfa, brief.gfaM2)}
        {row(t.brief.plotArea, brief.plotAreaM2)}
        {brief.far ? row(t.brief.far, brief.far) : null}
        {row(t.brief.height, brief.heightCode)}
        {brief.levels ? row(t.brief.levels, brief.levels) : null}
      </dl>
      {brief.far ? null : <p className="text-[12px] text-secondary">{t.brief.noFar}</p>}
      {/* Each note is the brief's own caveat on its figure (a conversion, a rounding, a ceiling for every plot). */}
      {[brief.plotAreaM2.note, brief.gfaM2.note, brief.far?.note, brief.heightCode.note, brief.levels?.note]
        .filter((n): n is string => Boolean(n))
        .map((n) => (
        <EngineNote key={n} className="block text-[11.5px] leading-snug text-tertiary" text={n} />
      ))}
      {sheetOmitsFar ? <p className="text-[12px] text-fg">{t.brief.fills}</p> : null}
      <Button
        variant="secondary"
        className="justify-self-start"
        aria-pressed={chosen}
        onClick={() => onChange(chosen ? '' : brief.briefId)}
      >
        {chosen ? t.brief.stop : t.brief.use}
      </Button>
      <p className="text-[12px] text-secondary" role="status">
        {chosen ? t.brief.used : t.brief.notUsed}
      </p>
      {/* Listed, never collapsed: a reader who sees one figure taken from a brief assumes the rest of it was applied too. */}
      {brief.notMechanized.length > 0 ? (
        <div className="grid gap-1 text-[12px]">
          <p className="font-medium text-secondary">{t.brief.notApplied}</p>
          <ul className="grid list-disc gap-1 ps-5 text-secondary">
            {brief.notMechanized.map((n) => (
              <li key={n}>
                <EngineNote text={n} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
