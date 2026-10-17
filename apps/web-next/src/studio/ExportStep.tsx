import { Box, Check, FileCode2, FileJson, FileSpreadsheet, FileText, Layers, Lock, Printer } from 'lucide-react';
import { useState } from 'react';

import { type Actor, api, ApiError, type RunView, type TitleBlockBody } from '@web/api/client.js';
import { printDocument } from '@web/documents.js';
import { hashOf } from '@web/gateHash.js';

import { cn } from '../lib/cn.js';
import { EngineMessage, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Field, Input, Notice, PanelHeader, Spinner } from '../ui/primitives.js';
import { AdvisorBox } from './AdvisorBox.js';
import {
  TITLE_FIELDS,
  TITLE_MAX,
  type TitleBlockForm,
  titleBlockBody,
  type TitleFieldName,
  titleFormOf,
  titleProblem,
} from './model.js';

/*
  EXPORT, BEHIND THE SAME TWO GATES THE SERVER ENFORCES.

  G3 acknowledges the assumptions and G4 names a reviewer; each is signed
  against a hash of what it covers — the same function the current site uses,
  because the server recomputes it and refuses a signature over different
  content. Every file is written by the API, never by this page: the browser
  holds the same model and could write the same bytes, and would then have
  passed the gates only because it said so.
*/

type Format = 'html' | 'sheets' | 'dxf' | 'xlsx' | 'glb' | 'json';

/** What the export step needs to change the title block: the run is recomputed with it, never edited. */
export interface TitleBlockControl {
  /** False when this browser does not hold the request the run was made with. */
  readonly canSave: boolean;
  readonly busy: boolean;
  readonly onSave: (titleBlock: TitleBlockBody | undefined) => void;
}

export function ExportPanel({
  actor,
  run,
  onSigned,
  titleBlock,
}: {
  readonly actor: Actor;
  readonly run: RunView;
  readonly onSigned: () => Promise<void>;
  readonly titleBlock?: TitleBlockControl;
}): JSX.Element {
  const { t, locale, href } = useLocale();
  const gates = run.gates ?? {};
  const g3 = gates['G3_ASSUMPTIONS_ACKNOWLEDGED'];
  const g4 = gates['G4_REVIEWER_NAMED'];
  const open = Boolean(g3 && g4);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sign = async (gate: 'G3_ASSUMPTIONS_ACKNOWLEDGED' | 'G4_REVIEWER_NAMED'): Promise<void> => {
    setBusy(gate);
    setError(null);
    try {
      await api.acknowledgeGate(actor, run.runId, gate, hashOf(gate === 'G3_ASSUMPTIONS_ACKNOWLEDGED' ? run.assumptions : run.capacity));
      await onSigned();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t.exports.failed);
    } finally {
      setBusy(null);
    }
  };

  /*
    The report straight to the print dialog, without opening it: a hidden frame
    holding the report prints itself on the paper its own `@page` names — A4 —
    and "Save as PDF" in that dialog is the PDF. See `apps/web/src/documents.ts`.
  */
  const printReport = async (): Promise<void> => {
    setBusy('print');
    setError(null);
    try {
      printDocument(await api.exportRunHtml(actor, run.runId, 'html', locale), 'text/html');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t.exports.failed);
    } finally {
      setBusy(null);
    }
  };

  const download = async (format: Format): Promise<void> => {
    setBusy(format);
    setError(null);
    try {
      const name = `topai-${run.plot.plotNumber}-${run.runId.slice(0, 8)}`;
      if (format === 'html') {
        // The report opens in its own viewer, with the A4 print button above it (`screens/Report.tsx`).
        window.open(href(`/studio/${run.runId}/report`), '_blank', 'noopener');
        return;
      }
      if (format === 'sheets') {
        // The drawing set is print-first HTML on A3; the browser makes the PDF from it. It stays English.
        const html = await api.exportRunHtml(actor, run.runId, format, locale);
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }
      const blob =
        format === 'json'
          ? new Blob([JSON.stringify(await api.exportRun(actor, run.runId), null, 2)], { type: 'application/json' })
          : await api.exportRunFile(actor, run.runId, format);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t.exports.failed);
    } finally {
      setBusy(null);
    }
  };

  const files: readonly { f: Format; icon: typeof Box; needsModel?: boolean }[] = [
    { f: 'html', icon: FileText },
    { f: 'sheets', icon: Layers, needsModel: true },
    { f: 'dxf', icon: FileCode2, needsModel: true },
    { f: 'glb', icon: Box, needsModel: true },
    { f: 'xlsx', icon: FileSpreadsheet },
    { f: 'json', icon: FileJson },
  ];

  // The one primary action: the first gate still unsigned, or — once both are — the report.
  const nextGate = !g3 ? 'G3_ASSUMPTIONS_ACKNOWLEDGED' : !g4 ? 'G4_REVIEWER_NAMED' : null;
  const [lead, ...rest] = files;

  const gatesBlock = (
    <section className="grid gap-2">
      <ol aria-label={`G3 · G4`} className="grid divide-y divide-subtle border-y border-subtle">
        <Gate
          n="G3"
          title={t.exports.g3}
          body={t.exports.g3Body(run.assumptions.length)}
          signed={g3 ? t.exports.signedBy(g3.actorName) : null}
          action={t.exports.g3Action}
          primary={nextGate === 'G3_ASSUMPTIONS_ACKNOWLEDGED'}
          busy={busy === 'G3_ASSUMPTIONS_ACKNOWLEDGED'}
          onSign={() => void sign('G3_ASSUMPTIONS_ACKNOWLEDGED')}
        />
        <Gate
          n="G4"
          title={t.exports.g4}
          body={actor.licence ? t.exports.g4Body : t.exports.g4NoLicence}
          signed={g4 ? t.exports.signedBy(g4.actorName) : null}
          action={t.exports.g4Action}
          primary={nextGate === 'G4_REVIEWER_NAMED'}
          busy={busy === 'G4_REVIEWER_NAMED'}
          onSign={() => void sign('G4_REVIEWER_NAMED')}
        />
      </ol>
    </section>
  );

  const filesBlock = (
    <section className="grid gap-2" aria-labelledby="files">
      {lead ? (
        <Button
          variant={open ? 'primary' : 'secondary'}
          size="lg"
          className="w-full"
          disabled={!open || busy !== null}
          aria-busy={busy === lead.f || undefined}
          onClick={() => void download(lead.f)}
        >
          {busy === lead.f ? <Spinner /> : <lead.icon aria-hidden="true" />}
          {t.exports.file[lead.f].name}
        </Button>
      ) : null}
      {lead ? <p className="text-[11.5px] text-secondary">{t.exports.file[lead.f].body}</p> : null}
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={!open || busy !== null}
        aria-busy={busy === 'print' || undefined}
        onClick={() => void printReport()}
      >
        {busy === 'print' ? <Spinner /> : <Printer aria-hidden="true" />}
        {t.report.printNow}
      </Button>
      <ul className="grid grid-cols-2 gap-2">
        {rest.map(({ f, icon: Icon, needsModel }) => {
          const unavailable = needsModel && !run.building;
          return (
            <li key={f}>
              <button
                type="button"
                disabled={!open || unavailable || busy !== null}
                aria-busy={busy === f || undefined}
                onClick={() => void download(f)}
                className={cn(
                  'grid min-h-11 w-full gap-0.5 rounded-md border border-line bg-base px-3 py-2 text-start transition-colors duration-150',
                  'hover:border-strong hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40',
                  'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line disabled:hover:bg-base',
                )}
              >
                <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
                  {busy === f ? <Spinner /> : <Icon className="size-4 text-accent" aria-hidden="true" />}
                  {t.exports.file[f].name}
                </span>
                <span className="text-[11.5px] leading-snug text-secondary">{t.exports.file[f].body}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div>
      <PanelHeader title={t.exports.title} hint={t.exports.hint} />
      <div className="grid grid-cols-1 gap-5 p-4">
        {/* The answer: can the files be had now, and if not, what stands in the way. */}
        <p id="files" className="flex items-center gap-2 text-[15px] font-medium text-fg">
          {open ? <Check className="size-4 text-accent-strong" aria-hidden="true" /> : <Lock className="size-4 text-secondary" aria-hidden="true" />}
          {open ? t.exports.files : t.exports.locked}
        </p>
        {error ? (
          <>
            <Notice>
              <EngineMessage text={error} />
            </Notice>
            <AdvisorBox ask={{ step: 'refusal', at: 'export', refusal: error }} edits={false} />
          </>
        ) : null}
        {open ? (
          <>
            {filesBlock}
            {gatesBlock}
          </>
        ) : (
          <>
            {gatesBlock}
            {filesBlock}
          </>
        )}
        {titleBlock ? <TitleBlockDisclosure run={run} control={titleBlock} /> : null}
      </div>
    </div>
  );
}

/*
  THE TITLE BLOCK, A SMALL DISCLOSURE UNDER THE FILES (17 Oct 2026).

  The strip printed NOT STATED in five fields because the run had nowhere to
  hold what the reader calls the job. Closed by default — most exports do not
  need it, and an open form above the files would compete with them. Each field
  is checked here by the server's own rules, so a value the DXF would print as
  "?" is named beside its field before anything is sent. Saving is a new run:
  the stored run is never edited, so its gates are signed again.
*/
export function TitleBlockDisclosure({ run, control }: { readonly run: RunView; readonly control: TitleBlockControl }): JSX.Element {
  const { t } = useLocale();
  const [form, setForm] = useState<TitleBlockForm>(() => titleFormOf(run.titleBlock));
  const problems = TITLE_FIELDS.map((k) => [k, titleProblem(k, form[k])] as const).filter(
    (p): p is readonly [TitleFieldName, NonNullable<ReturnType<typeof titleProblem>>] => p[1] !== undefined,
  );
  const unchanged = TITLE_FIELDS.every((k) => form[k].trim() === (run.titleBlock?.[k] ?? ''));
  const say = (k: TitleFieldName, p: NonNullable<ReturnType<typeof titleProblem>>): string => {
    const label = t.titleBlock.field[k] ?? k;
    return p === 'notLatin' ? t.titleBlock.notLatin(label) : p === 'controlCode' ? t.titleBlock.controlCode(label) : t.titleBlock.tooLong(label, TITLE_MAX[k]);
  };
  return (
    <details className="group rounded-md border border-line bg-base" data-title-block="">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-[13px] font-medium text-fg">{t.titleBlock.title}</summary>
      <div className="grid gap-3 border-t border-subtle p-3">
        <p className="text-[12px] text-secondary">{t.titleBlock.lede}</p>
        <p className="text-[12px] text-secondary">{t.titleBlock.latinOnly}</p>
        {TITLE_FIELDS.map((k) => {
          const problem = problems.find(([f]) => f === k)?.[1];
          return (
            <Field key={k} label={t.titleBlock.field[k] ?? k} error={problem ? say(k, problem) : undefined}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  dir="ltr"
                  value={form[k]}
                  maxLength={TITLE_MAX[k] + 20}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                />
              )}
            </Field>
          );
        })}
        {run.titleBlock ? <p className="text-[12px] text-secondary">{t.titleBlock.statedBy(run.titleBlock.statedBy)}</p> : null}
        {control.canSave ? (
          <>
            <p className="text-[12px] text-secondary">{t.titleBlock.recomputes}</p>
            <Button
              variant="secondary"
              className="justify-self-start"
              disabled={problems.length > 0 || unchanged || control.busy}
              aria-busy={control.busy || undefined}
              onClick={() => control.onSave(titleBlockBody(form))}
            >
              {control.busy ? <Spinner /> : null}
              {t.titleBlock.save}
            </Button>
          </>
        ) : (
          <p className="text-[12px] text-secondary">{t.titleBlock.noRequest}</p>
        )}
      </div>
    </details>
  );
}

function Gate({
  n,
  title,
  body,
  signed,
  action,
  primary,
  busy,
  onSign,
}: {
  readonly n: string;
  readonly title: string;
  readonly body: string;
  readonly signed: string | null;
  readonly action: string;
  /** The gate to sign next carries the panel's primary button; the other waits its turn in a quieter one. */
  readonly primary: boolean;
  readonly busy: boolean;
  readonly onSign: () => void;
}): JSX.Element {
  const label = (
    <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
      <span className="figure rounded border border-strong px-1 text-[10.5px]">{n}</span>
      {title}
    </span>
  );
  // A signed gate is one line: what it was, and who signed it.
  if (signed) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5">
        {label}
        <span className="flex items-center gap-1.5 text-[12px] text-secondary">
          <Check className="size-4 text-accent-strong" aria-hidden="true" />
          {signed}
        </span>
      </li>
    );
  }
  // Unsigned, it states what the signature means before the button that gives it.
  return (
    <li className="grid gap-2 py-3">
      {label}
      <p className="text-[12px] leading-relaxed text-secondary">{body}</p>
      <Button
        size={primary ? 'lg' : 'md'}
        variant={primary ? 'primary' : 'secondary'}
        className={primary ? 'w-full' : 'justify-self-start'}
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={onSign}
      >
        {busy ? <Spinner /> : null}
        {action}
      </Button>
    </li>
  );
}
