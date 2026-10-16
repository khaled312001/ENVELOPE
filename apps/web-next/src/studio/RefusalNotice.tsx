import { Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { AdviseStudioStep, RunRequestBody } from '@web/api/client.js';

import { EngineMessage, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Notice } from '../ui/primitives.js';
import { AdvisorBox } from './AdvisorBox.js';
import { type AutoFix, autoFixFor } from './auto-fix.js';

/**
 * The engine's refusal in the page's language, with the fix its own sentence
 * names (see `auto-fix.ts`) offered as one button. A retry counts down the
 * seconds the server asked for and can be cancelled; nothing is sent unasked.
 */
export function RefusalNotice({
  message,
  refused,
  onApply,
  at,
  inputs,
}: {
  readonly message: string;
  /** The request the engine refused, when it was a run; null for any other failure. */
  readonly refused: RunRequestBody | null;
  readonly onApply: (body: RunRequestBody) => void;
  /** The step the message is shown on, so Claude's correction can say where to go back to. */
  readonly at: AdviseStudioStep;
  /** What the reader had entered when it failed, for a failure that was not a run (the plot being filed). */
  readonly inputs?: unknown;
}): JSX.Element {
  const { t } = useLocale();
  const fix = autoFixFor(message, refused);
  return (
    <div className="grid gap-3">
      <Notice title={t.studio.refused}>
        <EngineMessage text={message} />
        {fix ? <FixButton key={message} fix={fix} onApply={onApply} /> : null}
      </Notice>
      {/* What the sentence cannot name — which input to change — Claude reads against the code, under every error. Words only. */}
      <AdvisorBox ask={{ step: 'refusal', at, refusal: message, ...((refused ?? inputs) !== undefined ? { request: refused ?? inputs } : {}) }} />
    </div>
  );
}

function FixButton({ fix, onApply }: { readonly fix: AutoFix; readonly onApply: (body: RunRequestBody) => void }): JSX.Element {
  const { t } = useLocale();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      onApply(fix.body);
      return;
    }
    const id = window.setTimeout(() => setLeft(left - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left, fix, onApply]);

  if (fix.kind === 'retry' && left !== null) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] text-secondary" aria-live="polite">
          {t.studio.fix.retrying(left)}
        </span>
        <Button onClick={() => setLeft(null)}>
          {t.studio.fix.cancel}
        </Button>
      </div>
    );
  }
  const label =
    fix.kind === 'retry'
      ? t.studio.fix.retry(fix.waitS)
      : fix.kind === 'move-entrance'
        ? t.studio.fix.moveEntrance(fix.toM)
        : fix.kind === 'most-bays'
          ? t.parking.options.back
          : t.studio.fix.engineEntrance;
  return (
    <Button
      className="mt-2 h-auto min-h-9 whitespace-normal py-1.5 text-start"
      onClick={() => (fix.kind === 'retry' ? setLeft(fix.waitS) : onApply(fix.body))}
    >
      <Wand2 aria-hidden="true" />
      {label}
    </Button>
  );
}
