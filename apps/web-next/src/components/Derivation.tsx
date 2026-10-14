import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { api, type Actor } from '@web/api/client.js';
import type { ProvTree } from '@web/components/ProvenanceTree.js';

import { cn } from '../lib/cn.js';
import { grouped } from '../lib/figures.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Notice, Spinner } from '../ui/primitives.js';
import { Drawer } from '../ui/radix.js';
import { ClassMark } from './Traced.js';

/*
  THE DERIVATION, AS THE ENGINE WROTE IT.

  Every label, formula and basis string below is the engine's own and is shown
  verbatim — on an Arabic page inside a left-to-right English span — because a
  translated basis would be a second version of a piece of evidence that nobody
  issued. The tree is fetched from the API, never rebuilt here.
*/
export function DerivationDrawer({
  actor,
  runId,
  nodeId,
  onClose,
}: {
  readonly actor: Actor;
  readonly runId: string;
  readonly nodeId: string | null;
  readonly onClose: () => void;
}): JSX.Element {
  const { t } = useLocale();
  const tree = useQuery({
    queryKey: ['provenance', runId, nodeId],
    queryFn: () => api.provenance(actor, runId, nodeId!),
    enabled: nodeId !== null,
    staleTime: Infinity,
  });
  return (
    <Drawer
      open={nodeId !== null}
      onOpenChange={(open) => !open && onClose()}
      title={t.derivation.title}
      description={t.derivation.description}
      closeLabel={t.common.close}
    >
      {tree.isPending ? (
        <p className="flex items-center gap-2 text-secondary">
          <Spinner /> {t.derivation.loading}
        </p>
      ) : tree.isError ? (
        <Notice>{(tree.error as Error).message}</Notice>
      ) : tree.data ? (
        <ol className="grid gap-1">
          <Branch tree={tree.data} depth={0} />
        </ol>
      ) : null}
    </Drawer>
  );
}

function Branch({ tree, depth, kind }: { readonly tree: ProvTree; readonly depth: number; readonly kind?: string }): JSX.Element {
  const { t } = useLocale();
  const [open, setOpen] = useState(depth < 2);
  const n = tree.node;
  const hasChildren = tree.edges.length > 0;
  return (
    <li className={cn(depth > 0 && 'ms-3 border-s border-subtle ps-3')}>
      <div className={cn('rounded-md border px-3 py-2', depth === 0 ? 'border-line bg-raised' : 'border-transparent hover:bg-hover')}>
        <div className="flex items-start gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? t.derivation.collapse : t.derivation.expand}
              className="mt-0.5 grid size-5 shrink-0 place-items-center rounded text-secondary hover:bg-hover hover:text-fg"
            >
              <ChevronRight className={cn('size-3.5 transition-transform duration-150 rtl:-scale-x-100', open && 'rotate-90 rtl:rotate-90')} aria-hidden="true" />
            </button>
          ) : (
            <span className="size-5 shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {kind ? <span className="figure text-[10.5px] tracking-[0.06em] text-tertiary uppercase">{kind.replace(/_/g, ' ')}</span> : null}
              <EngineText className="text-[13px] font-medium text-fg">{n.label}</EngineText>
              {n.provenanceClass ? <ClassMark cls={n.provenanceClass} /> : null}
            </div>
            {n.value !== undefined ? (
              <p className="figure mt-1 text-[13px] text-fg">
                {grouped(n.value)}
                {n.unit ? <span className="ms-1 text-secondary">{n.unit}</span> : null}
              </p>
            ) : null}
            {n.formula ? (
              <p dir="ltr" className="figure mt-1 text-start text-[12px] whitespace-pre-wrap text-secondary">
                {n.formula}
              </p>
            ) : null}
            {n.ruleId ? <p className="figure mt-1 text-[11.5px] text-tertiary">{n.ruleId}</p> : null}
            {n.citation ? (
              <blockquote className="mt-2 border-s-2 border-derived/50 ps-2.5 text-[12px] text-secondary">
                <p className="figure text-[11px] text-tertiary">
                  {n.citation.instrumentId} · {n.citation.clauseReference} · p.{n.citation.sourcePage}
                </p>
                <EngineText className="mt-0.5 block">“{n.citation.sourceTextVerbatim}”</EngineText>
              </blockquote>
            ) : null}
          </div>
        </div>
      </div>
      {hasChildren && open ? (
        <ol className="mt-1 grid gap-1">
          {tree.edges.map((e, i) => (
            <Branch key={`${e.child.node.id}-${i}`} tree={e.child} depth={depth + 1} kind={e.kind} />
          ))}
        </ol>
      ) : null}
    </li>
  );
}
