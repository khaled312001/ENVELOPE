import type { BuildingModel } from '@envelope/core';
import { composeSheets, type Sheet, sheetSvg } from '@envelope/sheets';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { type PointerEvent as ReactPointerEvent, useMemo, useRef, useState, type WheelEvent as ReactWheelEvent } from 'react';

import { cn } from '../lib/cn.js';
import { engineNote } from '../lib/engine-notes.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Tab, Tabs, TabsList } from '../ui/radix.js';

/*
  THE DRAWING SET, FROM THE SAME DISPLAY LIST AS THE PAPER AND THE DXF.

  `composeSheets` lays the set out from the run's BuildingModel and `sheetSvg`
  writes each sheet — the very function the A3 export calls — so a bay on this
  screen is the bay in the file. The ink reads this app's tokens by name, which
  is how the drawing takes the dark canvas without a second renderer.

  Zoom and pan move the picture, never the model: no figure is measured off it.
*/
export function useSheets(
  model: BuildingModel | undefined,
  meta: { plotNumber: string; community: string; runId: string; issuedAt: string; checkedBy?: string },
): Sheet[] {
  const { plotNumber, community, runId, issuedAt, checkedBy } = meta;
  return useMemo(
    () => (model ? composeSheets(model, { plotNumber, community, runId, issuedAt, ...(checkedBy ? { checkedBy } : {}) }) : []),
    [model, plotNumber, community, runId, issuedAt, checkedBy],
  );
}

export function SheetViewer({
  sheets,
  initialKind,
  className,
}: {
  readonly sheets: readonly Sheet[];
  readonly initialKind?: Sheet['kind'];
  readonly className?: string;
}): JSX.Element {
  const { t, locale } = useLocale();
  const first = sheets.find((s) => s.kind === initialKind) ?? sheets[0];
  const [id, setId] = useState(first?.id ?? '');
  const sheet = sheets.find((s) => s.id === id) ?? first;
  const svg = useMemo(() => (sheet ? sheetSvg(sheet, `nx-${sheet.id}`) : ''), [sheet]);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const clamp = (z: number): number => Math.min(8, Math.max(1, z));
  const reset = (): void => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const onWheel = (e: ReactWheelEvent): void => {
    // React's wheel listener is passive, so this cannot cancel the page's scroll;
    // the studio's canvas does not scroll, which is why it does not need to.
    if (!e.ctrlKey && !e.metaKey && zoom === 1) return;
    setZoom((z) => clamp(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
  };
  const onDown = (e: ReactPointerEvent): void => {
    if (zoom === 1) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onMove = (e: ReactPointerEvent): void => {
    const d = drag.current;
    if (!d) return;
    setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) });
  };

  if (!sheet) return <p className="p-6 text-secondary">{t.sheets.none}</p>;

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2">
        <Tabs
          value={sheet.id}
          onValueChange={(v) => {
            setId(v);
            reset();
          }}
          className="min-w-0 flex-1"
        >
          <TabsList label={t.sheets.label}>
            {sheets.map((s) => (
              <Tab key={s.id} value={s.id}>
                <span className="figure me-1.5 text-tertiary">{s.number}</span>
                {engineNote(s.title, locale) ?? s.title}
              </Tab>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label={t.sheets.zoom}>
          <Button variant="ghost" size="icon" aria-label={t.sheets.zoomOut} onClick={() => setZoom((z) => clamp(z / 1.4))} disabled={zoom <= 1}>
            <Minus aria-hidden="true" />
          </Button>
          <span className="figure w-11 text-center text-[12px] text-secondary" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" aria-label={t.sheets.zoomIn} onClick={() => setZoom((z) => clamp(z * 1.4))} disabled={zoom >= 8}>
            <Plus aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t.sheets.fit} onClick={reset}>
            <Maximize2 aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div
        className={cn('canvas-grid relative min-h-0 flex-1 overflow-hidden', zoom > 1 && 'cursor-grab active:cursor-grabbing')}
        onWheel={onWheel}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <div className="grid h-full place-items-center p-4 sm:p-6">
          <div
            dir="ltr"
            className="sheet-frame w-full max-w-[1400px] rounded-sm border border-line bg-panel shadow-[0_24px_60px_-20px_rgb(0_0_0/0.7)]"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center' }}
            // The SVG string is the one the A3 set prints, written by `sheetSvg` from the engine's model.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>
      {sheet.notes.length > 0 ? (
        <details className="border-t border-line bg-panel px-4 py-2 text-[12px] text-secondary">
          <summary className="cursor-pointer py-1 font-medium text-fg">{t.sheets.notes(sheet.notes.length)}</summary>
          <ul className="grid gap-1 pb-2">
            {sheet.notes.map((n, i) => (
              <li key={i}>
                <EngineText>{n}</EngineText>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
