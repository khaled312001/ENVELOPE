import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';

import { type Actor, api, ApiError } from '@web/api/client.js';
import { downloadObject } from '@web/documents.js';

import { TopBar } from '../components/Shell.js';
import { EngineMessage, useLocale } from '../lib/locale.js';
import { Link } from '../lib/nav.js';
import { Button } from '../ui/button.js';
import { Notice, Spinner } from '../ui/primitives.js';

/*
  THE STUDY REPORT, WITH A BUTTON THAT PRINTS IT ON A4 (16 Oct 2026: «زر للطباعه
  PDF A4»).

  The report is the API's document, written in the reader's language, and it
  carries no script — `apps/api/test/api.test.ts` holds every export to that,
  because a document a user may forward is not a place to run code. So the
  button cannot live inside it. It lives here, above it, and prints the FRAME:
  printing raises the dialog on the frame's own document, so it is the report's
  `@page` rules — A4 portrait for the text, A4 landscape for each drawing, the
  running footer with the stamp — that decide the paper, never this page's.
  The browser writes the PDF; a second writer on the server would lay the same
  report out twice and the two would drift (see `apps/web/src/documents.ts`).

  The frame is sandboxed without scripts. `allow-same-origin` lets this page
  reach it to print; `allow-modals` is what a print dialog needs.
*/

type State =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly html: string }
  | { readonly kind: 'failed'; readonly message: string };

export function Report({ actor }: { readonly actor: Actor }): JSX.Element {
  const { runId = '' } = useParams();
  const { t, locale } = useLocale();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let live = true;
    setState({ kind: 'loading' });
    setLoaded(false);
    api
      .exportRunHtml(actor, runId, 'html', locale)
      .then((html) => live && setState({ kind: 'ready', html }))
      .catch((e: unknown) => live && setState({ kind: 'failed', message: e instanceof ApiError ? e.message : t.report.failed }));
    return () => {
      live = false;
    };
  }, [actor, runId, locale, t]);

  const print = (): void => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    w.focus();
    w.print();
  };
  const download = (): void => {
    if (state.kind !== 'ready') return;
    downloadObject(URL.createObjectURL(new Blob([state.html], { type: 'text/html' })), `plotlogic-study-${runId.slice(0, 8)}-${locale}.html`);
  };

  return (
    <div className="flex h-dvh flex-col bg-base">
      <TopBar />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-panel px-4 py-3">
        <Button asChild variant="ghost">
          <Link to={`/studio/${runId}`}>
            <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
            {t.report.back}
          </Link>
        </Button>
        {/* A line of its own on a phone, where beside the back link it was squeezed to a word a line. */}
        <div className="order-1 min-w-0 basis-full sm:order-none sm:basis-0 sm:flex-1">
          <h1 className="text-[15px] font-medium text-fg">{t.report.title}</h1>
          <p className="text-[12px] text-secondary">{t.report.hint}</p>
        </div>
        <div className="order-2 flex flex-wrap items-center gap-2 sm:order-none">
          <Button variant="secondary" onClick={download} disabled={state.kind !== 'ready'}>
            <Download aria-hidden="true" />
            {t.report.download}
          </Button>
          <Button variant="primary" size="lg" onClick={print} disabled={state.kind !== 'ready' || !loaded} aria-busy={state.kind === 'loading' || undefined}>
            {state.kind === 'loading' ? <Spinner /> : <Printer aria-hidden="true" />}
            {t.report.print}
          </Button>
        </div>
      </div>
      <main className="relative min-h-0 flex-1 bg-raised" aria-label={t.report.title}>
        {state.kind === 'loading' ? (
          <p className="grid h-full place-items-center text-[13px] text-secondary" role="status">
            <span className="flex items-center gap-2">
              <Spinner />
              {t.report.loading}
            </span>
          </p>
        ) : state.kind === 'failed' ? (
          <div className="mx-auto max-w-xl p-6">
            <Notice title={t.report.failedTitle}>
              <EngineMessage text={state.message} />
            </Notice>
          </div>
        ) : (
          <iframe
            ref={frame}
            title={t.report.frame}
            srcDoc={state.html}
            sandbox="allow-same-origin allow-modals"
            onLoad={() => setLoaded(true)}
            className="block h-full w-full border-0"
          />
        )}
      </main>
    </div>
  );
}
