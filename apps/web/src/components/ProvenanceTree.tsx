/**
 * The click-through derivation tree.
 *
 * §20.2 names three moments that carry the product. This is the third, and the
 * one it calls "the interaction that converts a skeptical architect": every
 * number is a link, and following it lands on the clause that produced it.
 *
 * The design rule for this panel: **a reader must be able to stop at any depth
 * and still have learned something true.** So each level states the relationship
 * in words ("computed as", "using the rule", "cited in") rather than showing a
 * graph the reader has to interpret. The underlying structure is a DAG; the
 * presentation is a sentence that keeps indenting.
 */

import { useEffect, useRef, useState } from 'react';

export interface Citation {
  readonly instrumentId: string;
  readonly instrumentVersion: string;
  readonly clauseReference: string;
  readonly documentUri: string;
  readonly sourcePage: number;
  readonly sourceTextVerbatim: string;
}

export interface ProvNode {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly parameterId?: string;
  readonly value?: string;
  readonly unit?: string;
  readonly provenanceClass?: string;
  readonly formula?: string;
  readonly ruleId?: string;
  readonly citation?: Citation;
  readonly detail?: Record<string, unknown>;
}

export interface ProvTree {
  readonly node: ProvNode;
  readonly edges: readonly { readonly kind: string; readonly child: ProvTree }[];
}

/** How each edge kind reads in a sentence. */
const EDGE_PHRASE: Readonly<Record<string, string>> = {
  derivedFrom: 'computed as',
  uses: 'using',
  citedIn: 'cited in',
  enteredBy: 'entered by',
  justifiedBy: 'because',
  boundedBy: 'bounded by',
  sourcedFrom: 'from',
  sensitiveTo: 'sensitive to',
  supersededBy: 'superseded by',
};

const KIND_ICON: Readonly<Record<string, string>> = {
  VALUE: '=',
  COMPUTATION: 'ƒ',
  RULE: '§',
  SOURCE_CLAUSE: '❝',
  INPUT: '⌨',
  USER: '◍',
  ASSUMPTION: '✎',
  BASIS: '·',
  CONSTRAINT: '⊣',
  VARIANCE: '⚠',
};

export interface ProvenanceTreeProps {
  readonly tree: ProvTree | null;
  readonly loading: boolean;
  readonly onClose: () => void;
}

export function ProvenanceTree({ tree, loading, onClose }: ProvenanceTreeProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus moves into the panel when it opens and Escape closes it. A panel that
  // opens without moving focus is invisible to a keyboard user.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside
      ref={panelRef}
      className="provenance-panel"
      role="dialog"
      aria-modal="false"
      aria-label="Where this number came from"
    >
      <header className="provenance-panel__header">
        <h2 className="provenance-panel__title">Where this number came from</h2>
        <button
          ref={closeRef}
          type="button"
          className="button button--ghost button--icon"
          onClick={onClose}
          aria-label="Close derivation"
        >
          ✕
        </button>
      </header>

      <div className="provenance-panel__body">
        {loading ? (
          <p className="muted">Loading the derivation…</p>
        ) : tree ? (
          <Branch tree={tree} depth={0} relation={null} />
        ) : (
          <p className="muted">No derivation was recorded for this value.</p>
        )}
      </div>

      <footer className="provenance-panel__footer">
        <p className="fine-print">
          Every value in this run resolves to a rule, an assumption, or a person. Nothing
          resolves to &ldquo;the system decided&rdquo;.
        </p>
      </footer>
    </aside>
  );
}

function Branch({
  tree,
  depth,
  relation,
}: {
  readonly tree: ProvTree;
  readonly depth: number;
  readonly relation: string | null;
}): JSX.Element {
  // Deep branches start collapsed. The first two levels answer most questions;
  // expanding further is a deliberate act, not a wall of text on arrival.
  const [open, setOpen] = useState(depth < 2);
  const { node } = tree;
  const hasChildren = tree.edges.length > 0;

  return (
    <div className="prov-branch" style={{ '--depth': depth } as React.CSSProperties}>
      <div className="prov-branch__row">
        {hasChildren ? (
          <button
            type="button"
            className="prov-branch__toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? `Collapse ${node.label}` : `Expand ${node.label}`}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="prov-branch__toggle prov-branch__toggle--leaf" aria-hidden="true">
            ·
          </span>
        )}

        <span className="prov-branch__icon" aria-hidden="true">
          {KIND_ICON[node.kind] ?? '·'}
        </span>

        <div className="prov-branch__content">
          {relation ? <span className="prov-branch__relation">{relation}</span> : null}
          <NodeSummary node={node} />
        </div>
      </div>

      {open && hasChildren ? (
        <div className="prov-branch__children">
          {tree.edges.map((e, i) => (
            <Branch
              key={`${e.child.node.id}-${i}`}
              tree={e.child}
              depth={depth + 1}
              relation={EDGE_PHRASE[e.kind] ?? e.kind}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NodeSummary({ node }: { readonly node: ProvNode }): JSX.Element {
  switch (node.kind) {
    case 'VALUE':
      return (
        <span>
          <strong className="value">
            {node.value}
            {node.unit ? <span className="value__unit">{node.unit}</span> : null}
          </strong>{' '}
          <span className="muted">{node.parameterId}</span>
          {node.provenanceClass ? (
            <span className={`chip chip--${node.provenanceClass.toLowerCase()}`}>
              {node.provenanceClass.replace('_', ' ').toLowerCase()}
            </span>
          ) : null}
        </span>
      );

    case 'COMPUTATION':
      return <code className="prov-formula">{node.formula ?? node.label}</code>;

    case 'RULE':
      return (
        <span>
          <strong>{node.ruleId ?? node.label}</strong>
          {node.citation ? (
            <span className="muted">
              {' '}
              — {node.citation.instrumentId} {node.citation.clauseReference}
            </span>
          ) : null}
        </span>
      );

    case 'SOURCE_CLAUSE':
      return node.citation ? (
        <figure className="prov-clause">
          <blockquote>{node.citation.sourceTextVerbatim}</blockquote>
          <figcaption>
            {node.citation.instrumentId} v{node.citation.instrumentVersion},{' '}
            {node.citation.clauseReference}
            {node.citation.sourcePage > 0 ? `, p.${node.citation.sourcePage}` : null}
          </figcaption>
        </figure>
      ) : (
        <span>{node.label}</span>
      );

    case 'ASSUMPTION':
      return (
        <span>
          <strong className="prov-assumption">{node.label}</strong>
          {node.value ? (
            <>
              {' = '}
              <span className="value">{node.value}</span>
            </>
          ) : null}
          <span className="chip chip--assumed">assumed</span>
        </span>
      );

    case 'BASIS':
      // The sentence a user reads when they ask "why did you assume that?".
      // If it is empty or vague, the assumption should not have been made.
      return <span className="prov-basis">{node.label}</span>;

    case 'USER':
      return (
        <span>
          <span className="badge-user">{node.label}</span>
        </span>
      );

    case 'CONSTRAINT':
      return (
        <span>
          {node.label}
          {node.detail?.['binding'] === true ? (
            <span className="chip chip--binding">binding</span>
          ) : null}
        </span>
      );

    default:
      return <span>{node.label}</span>;
  }
}
