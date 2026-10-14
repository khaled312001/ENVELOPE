import { FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import PDF_WORKER_URL from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

import { useLocale } from '../lib/locale.js';
import { EmptyState, Spinner } from '../ui/primitives.js';

/*
  THE SHEET ITSELF, DRAWN IN THE PAGE.

  The browser's own PDF viewer is not available: the site's policy is
  `object-src 'none'`, and an embedded viewer would be a second document
  nobody can style or read aloud. pdf.js draws page one onto a canvas instead,
  so what the reader checks the read values against is the sheet as issued.

  The legacy build, because the modern one calls `Map.getOrInsertComputed`
  with no fallback and a browser a year old does not have it. WebAssembly
  stays off: the policy grants no `wasm-unsafe-eval`, and pdf.js's own
  JavaScript decoders draw a sheet like this one without it.

  Loaded with the sheet step and not before: pdf.js is the second-heaviest
  thing the studio can load.
*/

/** The longer side of the drawn page, in device pixels — enough to read a dimension at a zoom. */
const LONG_SIDE_PX = 2400;

export function PdfPage({ base64, label }: { readonly base64: string; readonly label: string }): JSX.Element {
  const { t } = useLocale();
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | null = null;
    setState('loading');
    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const task = pdfjs.getDocument({ data: bytes, useWasm: false });
        destroy = () => void task.destroy();
        const doc = await task.promise;
        const page = await doc.getPage(1);
        const canvas = ref.current;
        if (cancelled || !canvas) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: LONG_SIDE_PX / Math.max(base.width, base.height) });
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        await page.render({ canvas, viewport }).promise;
        if (!cancelled) setState('ready');
      } catch {
        if (!cancelled) setState('failed');
      }
    })();
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [base64]);

  if (state === 'failed') {
    return <EmptyState title={label} body={t.sheet.noPreview} icon={<FileText className="size-5" aria-hidden="true" />} />;
  }
  return (
    <>
      {state === 'loading' ? (
        <p className="absolute inset-0 flex items-center justify-center gap-2 text-[13px] text-secondary" role="status">
          <Spinner /> {t.sheet.drawing}
        </p>
      ) : null}
      {/* On white as it was printed: the page is the document, not the theme. */}
      <canvas
        ref={ref}
        role="img"
        aria-label={t.sheet.imageAlt(label)}
        className={
          state === 'ready'
            ? 'h-auto max-h-full w-auto max-w-full rounded-md border border-line bg-white shadow-lifted'
            : 'invisible size-0'
        }
      />
    </>
  );
}
