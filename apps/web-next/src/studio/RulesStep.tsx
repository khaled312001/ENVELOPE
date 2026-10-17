import { CircleCheck, Minus, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Badge, Field, Input, PanelHeader, Spinner } from '../ui/primitives.js';
import { Segmented } from '../ui/radix.js';
import { DEFAULT_MIX_BASIS, type RulesForm, rulesProblems, SALEABLE_ASSUMED, stepCount } from './model.js';
import { Footer } from './parts.js';

/*
  THE QUESTIONS THE ENGINE WILL NOT ANSWER FOR THE READER.

  Two, since 16 Oct 2026: what the building is made of, and the unit mix.
  Parking-in-FAR and the saleable share stopped being asked that day at Eng.
  Mohamed's word; the one sent in their place that is an assumption is shown
  above the questions in amber, and the run carries the rest by id. The
  Compute button stays disabled until both are answered, and the count of
  answers is shown above it so the reason is never a mystery.
*/
export function RulesPanel({
  form,
  onChange,
  busy,
  onCompute,
  hasRun,
  brief = null,
}: {
  readonly form: RulesForm;
  readonly onChange: (next: RulesForm) => void;
  readonly busy: boolean;
  readonly onCompute: () => void;
  readonly hasRun: boolean;
  /** The plot's project brief, offered (see `BriefPicker`); null where none is on file or served. */
  readonly brief?: ReactNode;
}): JSX.Element {
  const { t } = useLocale();
  const problems = rulesProblems(form);
  const answered = [!problems.levels, !problems.mix].filter(Boolean).length;
  const set = (patch: Partial<RulesForm>): void => onChange({ ...form, ...patch });

  return (
    <div>
      <PanelHeader title={t.rules.title} hint={t.rules.hint} />
      <div className="grid grid-cols-1 gap-5 p-4">
        {/*
          Not questions any more (Eng. Mohamed, 16 Oct 2026). On 16 Oct he also
          asked that what the run is sent in their place — parking outside FAR,
          the column gap — not be spelled out on this step: the studio works to
          the Dubai Building Code without narrating its sources. Both still go
          with the run under his statement's id, and the report and the drawings
          still name them. The amber assumption stays: §13.1.
        */}
        <ul className="grid gap-1.5 text-[12px] leading-snug">
          <li className="flex items-start gap-2 rounded-md border border-dashed border-assumed/70 bg-assumed-surface px-3 py-2 text-fg">
            <Badge tone="assumed" className="shrink-0">
              {t.classLabel.ASSUMED}
            </Badge>
            <span>{t.rules.saleableFixed(SALEABLE_ASSUMED)}</span>
          </li>
        </ul>

        {/* Before the questions: where the plot's sheet omits its GFA, this is what can supply it. */}
        {brief}

        <Card n={1} title={t.rules.levelsTitle} done={!problems.levels} note={t.rules.levelsNote}>
          <div className="grid grid-cols-2 gap-3">
            <Small label={t.rules.basements} value={form.basements} onChange={(v) => set({ basements: v })} />
            <div className="grid gap-1.5">
              <span className="text-[12.5px] font-medium text-fg" id="ground-parking">
                {t.rules.groundParking}
              </span>
              <Segmented
                label={t.rules.groundParking}
                value={form.groundIsParking}
                onChange={(v) => set({ groundIsParking: v })}
                options={[
                  { value: 'yes', label: t.common.yes },
                  { value: 'no', label: t.common.no },
                ]}
              />
            </div>
            <Small label={t.rules.podiumAbove} value={form.podiumAboveGround} onChange={(v) => set({ podiumAboveGround: v })} />
            <Small label={t.rules.podiumParking} value={form.podiumParkingLevels} onChange={(v) => set({ podiumParkingLevels: v })} />
          </div>
          {problems.levels === 'format' ? <p className="text-[12px] text-variance">{t.rules.wholeNumbers}</p> : null}
          {problems.levels === 'podium' ? <p className="text-[12px] text-variance">{t.rules.podiumTooMany}</p> : null}
          <Field label={t.rules.core} hint={t.rules.coreHint} error={problems.coreArea ? t.rules.notDecimal : undefined}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                inputMode="decimal"
                value={form.coreArea}
                onChange={(e) => set({ coreArea: e.target.value })}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className="figure"
              />
            )}
          </Field>
        </Card>

        <Card n={2} title={t.rules.mixTitle} done={!problems.mix} note={form.mixSource === 'ASSUMED' ? undefined : t.rules.mixYours}>
          {form.mixSource === 'ASSUMED' ? (
            <div className="grid gap-1.5 rounded-md border border-dashed border-assumed/70 bg-assumed-surface p-2.5 text-[12px] text-fg">
              <Badge tone="assumed" className="justify-self-start">
                {t.classLabel.ASSUMED}
              </Badge>
              <EngineText className="leading-relaxed text-secondary">{DEFAULT_MIX_BASIS}</EngineText>
            </div>
          ) : null}
          <table className="w-full text-[12.5px]">
            <thead className="text-secondary">
              <tr>
                <th scope="col" className="pb-1 text-start font-medium">{t.rules.mixType}</th>
                <th scope="col" className="pb-1 text-start font-medium">{t.rules.mixShare}</th>
                <th scope="col" className="pb-1 text-start font-medium">{t.rules.mixArea}</th>
                <th scope="col" className="w-9">
                  <span className="sr-only">{t.plot.remove}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {form.mix.map((m, i) => {
                const edit = (patch: Partial<typeof m>): void =>
                  set({ mix: form.mix.map((x, j) => (j === i ? { ...x, ...patch } : x)), mixSource: 'USER_SET' });
                return (
                  <tr key={i}>
                    <td className="py-0.5 pe-1">
                      <Input aria-label={t.rules.mixTypeOf(i + 1)} value={m.label} onChange={(e) => edit({ label: e.target.value })} className={cn('h-8 px-2', form.mixSource === 'ASSUMED' && 'text-assumed')} />
                    </td>
                    <td className="py-0.5 pe-1">
                      <Input aria-label={t.rules.mixShareOf(i + 1)} inputMode="decimal" value={m.share} onChange={(e) => edit({ share: e.target.value })} className={cn('figure h-8 px-2', form.mixSource === 'ASSUMED' && 'text-assumed')} />
                    </td>
                    <td className="py-0.5 pe-1">
                      <Input aria-label={t.rules.mixAreaOf(i + 1)} inputMode="decimal" value={m.nsaM2} onChange={(e) => edit({ nsaM2: e.target.value })} className={cn('figure h-8 px-2', form.mixSource === 'ASSUMED' && 'text-assumed')} />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={t.rules.mixRemove(i + 1)}
                        disabled={form.mix.length <= 1}
                        onClick={() => set({ mix: form.mix.filter((_, j) => j !== i), mixSource: 'USER_SET' })}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={() => set({ mix: [...form.mix, { typeId: '', label: '', share: '', nsaM2: '' }], mixSource: 'USER_SET' })}
          >
            <Plus aria-hidden="true" />
            {t.rules.mixAdd}
          </Button>
          {problems.mix ? <p className="text-[12px] text-variance">{t.rules.mixIncomplete}</p> : null}
        </Card>

        <Footer>
          <p className="text-[12px] text-secondary" role="status">
            {t.rules.answered(answered)}
          </p>
          <Button variant="primary" size="lg" className="w-full" disabled={answered < 2 || Boolean(problems.coreArea) || busy} aria-busy={busy || undefined} onClick={onCompute}>
            {busy ? <Spinner /> : null}
            {hasRun ? t.rules.recompute : t.rules.compute}
          </Button>
        </Footer>
      </div>
    </div>
  );
}

function Card({
  n,
  title,
  done,
  note,
  children,
}: {
  readonly n: number;
  readonly title: string;
  readonly done: boolean;
  readonly note?: string | undefined;
  readonly children: ReactNode;
}): JSX.Element {
  const { t } = useLocale();
  return (
    // Divided rather than boxed: four questions read as one form, and the tick says which are done.
    <section className="grid gap-3 border-t border-subtle pt-5 first:border-t-0 first:pt-0" aria-labelledby={`q${n}`}>
      <header className="grid gap-1">
        <h3 id={`q${n}`} className="flex items-center gap-2 text-[14px] font-semibold text-fg">
          {done ? (
            <CircleCheck className="size-5 shrink-0 text-accent-strong" aria-hidden="true" />
          ) : (
            <span className="figure grid size-5 shrink-0 place-items-center rounded-full border border-strong text-[10.5px] text-secondary" aria-hidden="true">
              {n}
            </span>
          )}
          {title}
          <span className="sr-only"> ({done ? t.rules.answeredOne : t.rules.unanswered})</span>
        </h3>
        {note ? <p className="ps-7 text-[12px] leading-snug text-secondary">{note}</p> : null}
      </header>
      {children}
    </section>
  );
}

/** A whole-number field with − and + beside it. The input stays typeable; the buttons step it by one, never below 0. */
function Small({ label, value, onChange }: { readonly label: string; readonly value: string; readonly onChange: (v: string) => void }): JSX.Element {
  const { t } = useLocale();
  return (
    <Field label={label}>
      {({ id }) => (
        <div className="flex items-stretch gap-1">
          <Button variant="ghost" size="icon" className="size-9 shrink-0 border border-line" aria-label={t.rules.decrease(label)} disabled={value.trim() === '0'} onClick={() => onChange(stepCount(value, -1))}>
            <Minus aria-hidden="true" />
          </Button>
          <Input id={id} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} className="figure min-w-0 text-center" />
          <Button variant="ghost" size="icon" className="size-9 shrink-0 border border-line" aria-label={t.rules.increase(label)} onClick={() => onChange(stepCount(value, 1))}>
            <Plus aria-hidden="true" />
          </Button>
        </div>
      )}
    </Field>
  );
}
