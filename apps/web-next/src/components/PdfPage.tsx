import { FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../lib/locale.js';
import { rasterSheet } from '../lib/sheet-raster.js';
import { EmptyState, Spinner } from '../ui/primitives.js';

/*
  THE SHEET ITSELF, DRAWN IN THE PAGE.

  The browser's own PDF viewer is not available: the site's policy is
  `object-src 'none'`, and an embedded viewer would be a second document
  nobody can style or read aloud. pdf.js draws page one onto a canvas instead
  (`lib/sheet-raster.ts`, which also draws the map's underlay), so what the
  reader checks the read values against is the sheet as issued.

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
    const signal = { cancelled: false };
    setState('loading');
    // The same renderer the map's underlay uses, so the two never draw one sheet two ways.
    rasterSheet(base64, null, LONG_SIDE_PX, undefined, signal)
      .then((drawn) => {
        const canvas = ref.current;
        if (signal.cancelled || !canvas) return;
        canvas.width = drawn.width;
        canvas.height = drawn.height;
        canvas.getContext('2d')?.drawImage(drawn, 0, 0);
        setState('ready');
      })
      .catch(() => !signal.cancelled && setState('failed'));
    return () => {
      signal.cancelled = true;
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
