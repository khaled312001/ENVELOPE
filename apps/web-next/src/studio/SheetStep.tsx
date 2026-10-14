import { CircleAlert, CircleCheck, FileText, FileUp, RefreshCw } from 'lucide-react';
import { type DragEvent, useId, useState } from 'react';

import type { AffectionPlanRead } from '@web/api/client.js';
import type { TracedWire } from '@web/components/TracedValue.js';

import { Traced } from '../components/Traced.js';
import { cn } from '../lib/cn.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Badge, EmptyState, Notice, PanelHeader, Spinner } from '../ui/primitives.js';
import { IconTile } from '../ui/tile.js';
import { Footer, Heading, More, NextStep } from './parts.js';

/*
  STEP 0: THE AFFECTION PLAN.

  Not gated, as in the engine: a plot whose sheet is not to hand is still a plot,
  so "Skip" is always beside the drop zone. What the sheet does NOT print is
  listed, never hidden — DJAZ1MED12RES011 prints G+11 and no FAR, and the gap is
  the finding. "Use this sheet" fills the plot number, the community and the
  stated area, and attaches the PDF so the SERVER reads its limits again when the
  plot is filed; the corners are offered on the plot step, on a button, because
  a coordinate table read off a page is a value somebody should look at first.
*/

export interface SheetState {
  readonly read: AffectionPlanRead;
  readonly attachment: { readonly content: string; readonly filename: string };
}

export function SheetCanvas({ sheet }: { readonly sheet: SheetState | null }): JSX.Element {
  const { t } = useLocale();
  const image = sheet?.read.facts.sitePlan?.image;
  if (!sheet) {
    return (
      <div className="grid h-full place-items-center">
        <EmptyState title={t.sheet.emptyTitle} body={t.sheet.emptyBody} art={<IconTile icon={FileText} tone="blue" size="lg" float />} />
      </div>
    );
  }
  if (!image) {
    return (
      <div className="grid h-full place-items-center">
        <EmptyState title={sheet.read.filename} body={t.sheet.noImage} icon={<FileText className="size-5" aria-hidden="true" />} />
      </div>
    );
  }
  return (
    <div className="grid h-full place-items-center p-6 sm:p-10">
      {/* The sheet's own drawing, on white as it was printed: the page is the document, not the theme. */}
      <img
        src={`data:image/png;base64,${image.pngBase64}`}
        width={image.widthPx}
        height={image.heightPx}
        alt={t.sheet.imageAlt(sheet.read.filename)}
        className="max-h-full w-auto max-w-full rounded-md border border-line bg-white object-contain shadow-lifted"
      />
    </div>
  );
}

const MAX_MB = 3;

export function SheetPanel({
  sheet,
  using,
  busy,
  error,
  onFile,
  onUse,
  onClear,
  onSkip,
  onNext,
}: {
  readonly sheet: SheetState | null;
  readonly using: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onFile: (file: File) => void;
  readonly onUse: () => void;
  readonly onClear: () => void;
  readonly onSkip: () => void;
  readonly onNext: () => void;
}): JSX.Element {
  const { t } = useLocale();
  const read = sheet?.read ?? null;
  const facts = read?.facts;

  return (
    <div>
      <PanelHeader title={t.sheet.title} hint={t.sheet.hint} />
      <div className="grid grid-cols-1 gap-5 p-4">
        {!read ? (
          <Drop busy={busy} onFile={onFile} />
        ) : (
          <>
            <p className="flex min-w-0 flex-wrap items-center gap-2">
              <FileText className="size-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="min-w-0 break-all text-[13px] font-medium text-fg">{read.filename}</span>
              {using ? <Badge tone="accent">{t.sheet.using}</Badge> : null}
            </p>

            {/* What stops the study comes first, and is never folded away. */}
            {facts && facts.blocking.length > 0 ? (
              <Notice title={t.sheet.blocking}>
                <ul className="grid gap-1.5">
                  {facts.blocking.map((b) => (
                    <li key={b.field}>
                      <EngineText className="font-medium">{b.label}</EngineText>
                      {' — '}
                      <EngineText>{b.consequence}</EngineText>
                    </li>
                  ))}
                </ul>
              </Notice>
            ) : null}

            {facts?.setbacks?.value.requiresDecision ? (
              <Notice tone="neutral" title={t.sheet.decide}>
                <EngineText>{facts.setbacks.value.raw}</EngineText>
              </Notice>
            ) : null}

            {facts ? (
              <section aria-labelledby="sheet-read" className="grid gap-2">
                <Heading id="sheet-read">{t.sheet.read}</Heading>
                <dl className="divide-y divide-subtle rounded-md border border-line">
                  {/* Identifiers and words as printed: a plot number grouped into thousands is a different string. */}
                  <Fact label={t.sheet.fields.plotNumber} text={facts.parcelId?.value} mono />
                  <Fact label={t.sheet.fields.community} text={facts.community?.value} />
                  <Fact label={t.sheet.fields.landUse} text={facts.landUse?.value} />
                  <Fact label={t.sheet.fields.area} value={facts.totalAreaSqm} />
                  <Fact label={t.sheet.fields.far} value={facts.far} />
                  <Fact label={t.sheet.fields.gfa} value={facts.gfaSqm} />
                  <Fact label={t.sheet.fields.height} text={facts.height?.value.raw} />
                  <Fact label={t.sheet.fields.setbacks} text={facts.setbacks?.value.raw} />
                  <Fact label={t.sheet.fields.coverage} text={facts.coverage?.value.raw} />
                  <Fact label={t.sheet.fields.issued} text={facts.issueDate?.value} mono />
                </dl>
              </section>
            ) : null}

            {/* A gap is a finding, so it stays open: the sheet that omits a limit does not get one. */}
            {facts && facts.missing.length > 0 ? (
              <section aria-labelledby="sheet-gaps" className="grid gap-2">
                <Heading id="sheet-gaps">{t.sheet.gaps}</Heading>
                <ul className="grid gap-1.5 text-[12.5px]">
                  {facts.missing.map((m) => (
                    <li key={m.field} className="rounded-md border border-line bg-raised px-3 py-2">
                      <EngineText className="block font-medium text-fg">{m.label}</EngineText>
                      <EngineText className="block text-secondary">{m.consequence}</EngineText>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {facts && facts.crossChecks.length > 0 ? (
              <More summary={`${t.sheet.checks} · ${facts.crossChecks.filter((c) => c.passed).length}/${facts.crossChecks.length}`}>
                <ul className="grid gap-2 text-[12.5px]">
                  {facts.crossChecks.map((c) => (
                    <li key={c.name} className="flex gap-2">
                      {c.passed ? (
                        <CircleCheck className="mt-0.5 size-4 shrink-0 text-secondary" aria-label="✓" />
                      ) : (
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-variance" aria-label="!" />
                      )}
                      <span className="min-w-0">
                        <EngineText className="block font-medium text-fg">{c.name}</EngineText>
                        <EngineText className="block text-secondary">{c.detail}</EngineText>
                      </span>
                    </li>
                  ))}
                </ul>
              </More>
            ) : null}

            <EngineText className="block text-[11.5px] leading-relaxed text-tertiary">{read.disclaimer}</EngineText>
          </>
        )}

        {error ? <Notice>{error}</Notice> : null}

        <Footer>
          {read ? (
            <>
              {using ? <NextStep label={t.sheet.toPlot} onClick={onNext} /> : (
                <Button variant="primary" size="lg" className="w-full" onClick={onUse}>
                  {t.sheet.use}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClear}>
                <RefreshCw aria-hidden="true" />
                {t.sheet.another}
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="lg" className="w-full" onClick={onSkip} disabled={busy}>
              {t.sheet.skip}
            </Button>
          )}
        </Footer>
      </div>
    </div>
  );
}

/** One line of what the sheet says: the label, then the traced value or "not printed" — the label never truncates. */
function Fact({
  label,
  value,
  text,
  mono = false,
}: {
  readonly label: string;
  readonly value?: TracedWire | null;
  readonly text?: string | undefined;
  readonly mono?: boolean;
}): JSX.Element {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-baseline gap-3 px-3 py-2">
      <dt className="text-[12px] text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-[13px] text-fg">
        {value ? (
          <Traced value={value} size="sm" />
        ) : text ? (
          <EngineText {...(mono ? { className: 'figure' } : {})}>{text}</EngineText>
        ) : (
          <span className="text-tertiary">{t.sheet.notPrinted}</span>
        )}
      </dd>
    </div>
  );
}

function Drop({ busy, onFile }: { readonly busy: boolean; readonly onFile: (file: File) => void }): JSX.Element {
  const { t } = useLocale();
  const id = useId();
  const [over, setOver] = useState(false);
  const take = (file: File | undefined): void => {
    if (file) onFile(file);
  };
  const drop = (e: DragEvent): void => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files[0]);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={cn(
        'relative grid justify-items-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
        over ? 'border-accent bg-accent-subtle' : 'border-line bg-raised hover:border-accent/60',
      )}
    >
      {busy ? (
        <p className="flex items-center gap-2 text-[13px] text-fg" role="status">
          <Spinner /> {t.sheet.reading}
        </p>
      ) : (
        <>
          <IconTile icon={FileUp} tone="blue" size="md" />
          <label htmlFor={id} className="cursor-pointer text-[14px] font-medium text-fg after:absolute after:inset-0">
            {t.sheet.drop}
          </label>
          <p className="max-w-xs text-[12px] text-secondary">{t.sheet.dropHint}</p>
          <input
            id={id}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              take(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </>
      )}
    </div>
  );
}

export const SHEET_MAX_BYTES = MAX_MB * 1024 * 1024;
