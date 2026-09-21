/**
 * The provenance graph — PRD §13.2.
 *
 * A bounded, per-run, append-only DAG. Every emitted value is a `VALUE` node
 * whose derivation can be walked back to the rules, inputs and assumptions that
 * produced it. This is the structure behind the interaction §20.2 calls the one
 * that "converts a skeptical architect": every number on screen is a link.
 *
 * Deliberately not a graph database (PRD §19.2). One run's graph is small — a
 * few hundred nodes — and is only ever queried by root.
 */

import type { EdgeKind, NodeKind, ProvenanceClass } from './classes.js';

declare const NODE_ID: unique symbol;
export type NodeId = string & { readonly [NODE_ID]: true };

/** A citation into a regulatory instrument. Every field is required by Principle 9. */
export interface Citation {
  readonly instrumentId: string;
  readonly instrumentVersion: string;
  readonly clauseReference: string;
  readonly documentUri: string;
  readonly sourcePage: number;
  /** `[x0, y0, x1, y1]` in PDF user space — lets the UI highlight the clause. */
  readonly sourceBbox: readonly [number, number, number, number];
  readonly sourceTextVerbatim: string;
}

export interface ProvenanceNode {
  readonly id: NodeId;
  readonly kind: NodeKind;
  /** Stable dotted identifier, e.g. `capacity.gfa_permitted`, `setback.road`. */
  readonly parameterId?: string;
  /** Human label for the provenance tree. */
  readonly label: string;
  /** Present on VALUE nodes only. Serialized form of the value. */
  readonly value?: string;
  readonly unit?: string;
  /** Present on VALUE nodes only. Non-nullable there — that is `M-PRV`. */
  readonly provenanceClass?: ProvenanceClass;
  /** Present on COMPUTATION nodes: the formula, written the way a human reads it. */
  readonly formula?: string;
  /** Present on RULE nodes. */
  readonly ruleId?: string;
  readonly citation?: Citation;
  /** Free-form detail rendered in the tree's expanded state. */
  readonly detail?: Readonly<Record<string, unknown>>;
}

export interface ProvenanceEdge {
  readonly from: NodeId;
  readonly to: NodeId;
  readonly kind: EdgeKind;
  /** e.g. the measured effect on governing capacity for a `sensitiveTo` edge. */
  readonly attrs?: Readonly<Record<string, unknown>>;
}

export interface DerivationTree {
  readonly node: ProvenanceNode;
  readonly edges: readonly { readonly kind: EdgeKind; readonly child: DerivationTree }[];
}

/**
 * Append-only provenance store for a single run.
 *
 * Ids are deterministic (`n0`, `n1`, …) rather than random, because PRD §13.4
 * requires the deterministic portion of the pipeline to re-execute
 * byte-identically from persisted inputs — a UUID would break that on the first
 * re-run.
 */
export class ProvenanceGraph {
  readonly #nodes = new Map<NodeId, ProvenanceNode>();
  readonly #edges: ProvenanceEdge[] = [];
  /** Adjacency from a node to its outgoing edges, for O(1) tree walks. */
  readonly #out = new Map<NodeId, ProvenanceEdge[]>();
  #counter = 0;

  addNode(node: Omit<ProvenanceNode, 'id'>): NodeId {
    const id = `n${this.#counter++}` as NodeId;
    this.#nodes.set(id, { ...node, id });
    return id;
  }

  addEdge(
    from: NodeId,
    kind: EdgeKind,
    to: NodeId,
    attrs?: Readonly<Record<string, unknown>>,
  ): void {
    if (!this.#nodes.has(from)) throw new Error(`provenance: unknown source node ${from}`);
    if (!this.#nodes.has(to)) throw new Error(`provenance: unknown target node ${to}`);
    const edge: ProvenanceEdge = attrs ? { from, to, kind, attrs } : { from, to, kind };
    this.#edges.push(edge);
    const bucket = this.#out.get(from);
    if (bucket) bucket.push(edge);
    else this.#out.set(from, [edge]);
  }

  node(id: NodeId): ProvenanceNode {
    const n = this.#nodes.get(id);
    if (!n) throw new Error(`provenance: unknown node ${id}`);
    return n;
  }

  get nodes(): readonly ProvenanceNode[] {
    return [...this.#nodes.values()];
  }

  get edges(): readonly ProvenanceEdge[] {
    return this.#edges;
  }

  /** Outgoing edges of a node, in insertion order. */
  outgoing(id: NodeId): readonly ProvenanceEdge[] {
    return this.#out.get(id) ?? [];
  }

  /**
   * The full derivation of a value, as a tree ready for the click-through UI.
   *
   * Cycles cannot occur in a well-formed run, but a `seen` set is carried anyway:
   * a bug that produced one should render a truncated tree, not hang the browser.
   */
  derivationOf(id: NodeId, seen: ReadonlySet<NodeId> = new Set()): DerivationTree {
    const node = this.node(id);
    if (seen.has(id)) return { node, edges: [] };
    const nextSeen = new Set(seen).add(id);
    return {
      node,
      edges: this.outgoing(id).map((e) => ({
        kind: e.kind,
        child: this.derivationOf(e.to, nextSeen),
      })),
    };
  }

  /** Every node reachable from a root, for the CI provenance assertions (§13.3). */
  reachableFrom(id: NodeId): ReadonlySet<NodeId> {
    const seen = new Set<NodeId>();
    const stack: NodeId[] = [id];
    while (stack.length) {
      const current = stack.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      for (const e of this.outgoing(current)) stack.push(e.to);
    }
    return seen;
  }

  /** Whether a node of the given kind appears anywhere below `id`. */
  hasKindBelow(id: NodeId, kind: NodeKind): boolean {
    for (const n of this.reachableFrom(id)) {
      if (n !== id && this.node(n).kind === kind) return true;
    }
    return false;
  }

  toJSON(): { nodes: readonly ProvenanceNode[]; edges: readonly ProvenanceEdge[] } {
    return { nodes: this.nodes, edges: this.edges };
  }
}
