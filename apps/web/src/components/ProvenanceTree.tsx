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

import { useDict } from '../i18n/locale.js';
import { AR } from '../i18n/provenanceTree.ar.js';
import { EN } from '../i18n/provenanceTree.en.js';
import { AR as TRACED_AR } from '../i18n/traced.ar.js';
import { EN as TRACED_EN } from '../i18n/traced.en.js';
import { EngineText } from './TracedValue.js';

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
  const t = useDict(EN, AR);
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
      aria-label={t.title}
    >
      <header className="provenance-panel__header">
        <h2 className="provenance-panel__title">{t.title}</h2>
        <button
          ref={closeRef}
          type="button"
          className="button button--ghost button--icon"
          onClick={onClose}
          aria-label={t.close}
        >
          ✕
        </button>
      </header>

      <div className="provenance-panel__body">
        {loading ? (
          <p className="muted">{t.loading}</p>
        ) : tree ? (
          <Branch tree={tree} depth={0} relation={null} />
        ) : (
          <p className="muted">{t.none}</p>
        )}
      </div>

      <footer className="provenance-panel__footer">
        <p className="fine-print">{t.footer}</p>
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
  const t = useDict(EN, AR);
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
            aria-label={open ? t.collapse(node.label) : t.expand(node.label)}
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
              relation={(t.edges as Readonly<Record<string, string>>)[e.kind] ?? e.kind}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One node, as the engine recorded it. Every string here but a chip is the engine's
 * — a formula, a rule id, a clause quoted from its instrument, a basis, a name — and
 * is wrapped in `EngineText`, which marks it `Verbatim` on an Arabic page and
 * leaves it bare on an English one.
 */
function NodeSummary({ node }: { readonly node: ProvNode }): JSX.Element {
  const t = useDict(EN, AR);
  const classes = useDict(TRACED_EN, TRACED_AR);
  switch (node.kind) {
    case 'VALUE':
      return (
        <span>
          <strong className="value">
            <EngineText>{node.value}</EngineText>
            {node.unit ? <span className="value__unit">{node.unit}</span> : null}
          </strong>{' '}
          <span className="muted">
            <EngineText>{node.parameterId}</EngineText>
          </span>
          {node.provenanceClass ? (
            <span className={`chip chip--${node.provenanceClass.toLowerCase()}`}>
              {classes.classChip(node.provenanceClass)}
            </span>
          ) : null}
        </span>
      );

    case 'COMPUTATION':
      return <code className="prov-formula">{node.formula ?? node.label}</code>;

    case 'RULE':
      return (
        <span>
          <strong>
            <EngineText>{node.ruleId ?? node.label}</EngineText>
          </strong>
          {node.citation ? (
            <span className="muted">
              {' — '}
              <EngineText>
                {node.citation.instrumentId} {node.citation.clauseReference}
              </EngineText>
            </span>
          ) : null}
        </span>
      );

    case 'SOURCE_CLAUSE':
      return node.citation ? (
        <figure className="prov-clause">
          <blockquote>
            <EngineText>{node.citation.sourceTextVerbatim}</EngineText>
          </blockquote>
          {/* The citation, page included, is the instrument's reference and is set as
              one: a clause number with its page in another language is a reference
              nobody can look up. */}
          <figcaption>
            <EngineText>
              {node.citation.instrumentId} v{node.citation.instrumentVersion},{' '}
              {node.citation.clauseReference}
              {node.citation.sourcePage > 0 ? `, p.${node.citation.sourcePage}` : null}
            </EngineText>
          </figcaption>
        </figure>
      ) : (
        <span>
          <EngineText>{node.label}</EngineText>
        </span>
      );

    case 'ASSUMPTION':
      return (
        <span>
          <strong className="prov-assumption">
            <EngineText>{node.label}</EngineText>
          </strong>
          {node.value ? (
            <>
              {' = '}
              <span className="value">
                <EngineText>{node.value}</EngineText>
              </span>
            </>
          ) : null}
          <span className="chip chip--assumed">{t.assumed}</span>
        </span>
      );

    case 'BASIS':
      // The sentence a user reads when they ask "why did you assume that?".
      // If it is empty or vague, the assumption should not have been made.
      return (
        <span className="prov-basis">
          <EngineText>{node.label}</EngineText>
        </span>
      );

    case 'USER':
      return (
        <span>
          <span className="badge-user">
            <EngineText>{node.label}</EngineText>
          </span>
        </span>
      );

    case 'CONSTRAINT':
      return (
        <span>
          <EngineText>{node.label}</EngineText>
          {node.detail?.['binding'] === true ? (
            <span className="chip chip--binding">{t.binding}</span>
          ) : null}
        </span>
      );

    default:
      return (
        <span>
          <EngineText>{node.label}</EngineText>
        </span>
      );
  }
}
