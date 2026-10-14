import { Box, Check, FileCode2, FileJson, FileSpreadsheet, FileText, Layers, Lock } from 'lucide-react';
import { useState } from 'react';

import { type Actor, api, ApiError, type RunView } from '@web/api/client.js';
import { hashOf } from '@web/gateHash.js';

import { cn } from '../lib/cn.js';
import { useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Notice, PanelHeader, Spinner } from '../ui/primitives.js';

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

export function ExportPanel({ actor, run, onSigned }: { readonly actor: Actor; readonly run: RunView; readonly onSigned: () => Promise<void> }): JSX.Element {
  const { t } = useLocale();
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

  const download = async (format: Format): Promise<void> => {
    setBusy(format);
    setError(null);
    try {
      const name = `topai-${run.plot.plotNumber}-${run.runId.slice(0, 8)}`;
      if (format === 'html' || format === 'sheets') {
        // The report is print-first HTML; the browser makes the PDF from it, and says so.
        const html = await api.exportRunHtml(actor, run.runId, format);
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
        {error ? <Notice>{error}</Notice> : null}
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
      </div>
    </div>
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
