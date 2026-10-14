import { Plus, Trash2 } from 'lucide-react';
import { RadioGroup } from 'radix-ui';
import type { ReactNode } from 'react';

import type { ParkingComparison, RunRequestBody } from '@web/api/client.js';

import { cn } from '../lib/cn.js';
import { grouped } from '../lib/figures.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Badge, Field, Input, PanelHeader, Spinner } from '../ui/primitives.js';
import { Segmented } from '../ui/radix.js';
import { DEFAULT_MIX_BASIS, type RulesForm, rulesProblems } from './model.js';

/*
  THE QUESTIONS THE ENGINE WILL NOT ANSWER FOR THE READER.

  Four cards, each a question with no default. Parking-in-FAR is a radio group
  that opens EMPTY — `pnpm smoke` on the current site refuses a checked radio
  beside an enabled Compute button, and the same rule holds here: the button
  stays disabled until the reader has answered, and the count of answers is
  shown above it so the reason is never a mystery.
*/
export function RulesPanel({
  form,
  onChange,
  busy,
  onCompute,
  onCompare,
  comparison,
  hasRun,
}: {
  readonly form: RulesForm;
  readonly onChange: (next: RulesForm) => void;
  readonly busy: boolean;
  readonly onCompute: () => void;
  /** "I don't know yet": no capacity is computed, and both answers are priced instead. */
  readonly onCompare: () => void;
  readonly comparison: ParkingComparison | null;
  readonly hasRun: boolean;
}): JSX.Element {
  const { t } = useLocale();
  const problems = rulesProblems(form);
  const answered = [!problems.parkingInFar, !problems.saleable, !problems.levels, !problems.mix].filter(Boolean).length;
  const set = (patch: Partial<RulesForm>): void => onChange({ ...form, ...patch });

  return (
    <div>
      <PanelHeader title={t.rules.title} hint={t.rules.hint} />
      <div className="grid grid-cols-1 gap-3 p-4">
        <Card n={1} title={t.rules.farTitle} done={!problems.parkingInFar} note={t.rules.farNote}>
          <RadioGroup.Root
            aria-label={t.rules.farTitle}
            value={form.parkingInFar}
            onValueChange={(v) => set({ parkingInFar: v as RunRequestBody['parkingInFar'] })}
            className="grid gap-1.5"
          >
            {(['COUNTS_TOWARD_FAR', 'EXCLUDED_FROM_FAR', 'OPEN_REGULATORY_QUESTION'] as const).map((o) => (
              <label
                key={o}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-[13px] transition-colors',
                  form.parkingInFar === o ? 'border-accent/60 bg-accent-subtle/50 text-fg' : 'border-line text-secondary hover:border-strong hover:text-fg',
                )}
              >
                <RadioGroup.Item
                  value={o}
                  className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-strong data-[state=checked]:border-accent"
                >
                  <RadioGroup.Indicator className="size-2 rounded-full bg-accent" />
                </RadioGroup.Item>
                <span className="grid gap-0.5">
                  <span className="font-medium text-fg">{t.rules.far[o].label}</span>
                  <span className="text-[12px] text-secondary">{t.rules.far[o].detail}</span>
                </span>
              </label>
            ))}
          </RadioGroup.Root>
        </Card>

        <Card n={2} title={t.rules.saleableTitle} done={!problems.saleable} note={t.rules.saleableNote}>
          <Segmented
            label={t.rules.saleableUnit}
            value={form.saleableUnit}
            onChange={(v) => set({ saleableUnit: v, saleable: '' })}
            options={[
              { value: 'RATIO', label: t.rules.asShare },
              { value: 'AREA', label: t.rules.asArea },
            ]}
            className="w-full"
          />
          <Field
            label={form.saleableUnit === 'RATIO' ? t.rules.shareLabel : t.rules.areaLabel}
            error={problems.saleable === 'format' ? t.rules.notDecimal : problems.saleable === 'range' ? (form.saleableUnit === 'RATIO' ? t.rules.shareRange : t.rules.areaRange) : undefined}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                inputMode="decimal"
                value={form.saleable}
                onChange={(e) => set({ saleable: e.target.value })}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className="figure"
              />
            )}
          </Field>
        </Card>

        <Card n={3} title={t.rules.levelsTitle} done={!problems.levels} note={t.rules.levelsNote}>
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

        <Card n={4} title={t.rules.mixTitle} done={!problems.mix} note={form.mixSource === 'ASSUMED' ? undefined : t.rules.mixYours}>
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

        <div className="sticky bottom-0 -mx-4 grid gap-2 border-t border-line bg-panel/95 px-4 py-3 backdrop-blur">
          <p className="text-[12px] text-secondary" role="status">
            {t.rules.answered(answered)}
          </p>
          {comparison ? (
            <dl className="grid grid-cols-2 gap-2 rounded-md border border-line bg-base p-2.5 text-[12px]">
              <div>
                <dt className="text-secondary">{t.rules.ifCounts}</dt>
                <dd className="figure text-[14px] text-fg">
                  {comparison.countsTowardFar.governingGfaM2 ? `${grouped(comparison.countsTowardFar.governingGfaM2)} m²` : <EngineText>{comparison.countsTowardFar.error}</EngineText>}
                </dd>
              </div>
              <div>
                <dt className="text-secondary">{t.rules.ifExcluded}</dt>
                <dd className="figure text-[14px] text-fg">
                  {comparison.excludedFromFar.governingGfaM2 ? `${grouped(comparison.excludedFromFar.governingGfaM2)} m²` : <EngineText>{comparison.excludedFromFar.error}</EngineText>}
                </dd>
              </div>
              {comparison.governingSpreadM2 !== null ? <p className="col-span-2 text-secondary">{t.rules.spread(grouped(comparison.governingSpreadM2))}</p> : null}
              <EngineText className="col-span-2 block text-secondary">{comparison.verdict}</EngineText>
            </dl>
          ) : null}
          {form.parkingInFar === 'OPEN_REGULATORY_QUESTION' ? (
            <Button variant="primary" size="lg" disabled={answered < 4 || Boolean(problems.coreArea) || busy} aria-busy={busy || undefined} onClick={onCompare}>
              {busy ? <Spinner /> : null}
              {t.rules.price}
            </Button>
          ) : (
            <Button variant="primary" size="lg" disabled={answered < 4 || Boolean(problems.coreArea) || busy} aria-busy={busy || undefined} onClick={onCompute}>
              {busy ? <Spinner /> : null}
              {hasRun ? t.rules.recompute : t.rules.compute}
            </Button>
          )}
        </div>
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
    <section className={cn('grid gap-3 rounded-lg border p-3.5', done ? 'border-line bg-base' : 'border-strong bg-base')} aria-labelledby={`q${n}`}>
      <header className="flex items-start justify-between gap-2">
        <h3 id={`q${n}`} className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
          <span className="figure grid size-5 place-items-center rounded border border-line text-[10.5px] text-secondary">{n}</span>
          {title}
        </h3>
        <span className={cn('text-[11px] font-medium', done ? 'text-accent-strong' : 'text-secondary')}>{done ? t.rules.answeredOne : t.rules.unanswered}</span>
      </header>
      {note ? <p className="-mt-1 text-[12px] leading-relaxed text-secondary">{note}</p> : null}
      {children}
    </section>
  );
}

function Small({ label, value, onChange }: { readonly label: string; readonly value: string; readonly onChange: (v: string) => void }): JSX.Element {
  return (
    <Field label={label}>
      {({ id }) => <Input id={id} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} className="figure" />}
    </Field>
  );
}
