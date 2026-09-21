/**
 * Step 8 — evidence.
 *
 * Everything on this screen is a link into the derivation. It is the screen a
 * sceptical reader is sent to when they say "where did that come from", and the
 * measure of whether it works is `P0-S6`: design partners open the provenance
 * tree unprompted in 2 of 3 sessions.
 *
 * The plot drawing is here rather than only on the plot step because the setback
 * strip *is* the evidence for the footprint — the visible gap between the
 * boundary and the shaded area is the same fact the numbers state.
 */

import { useState } from 'react';

import type { PlotView, RunView } from '../api/client.js';
import { PlotCanvas } from '../components/PlotCanvas.js';
import { ProvenanceLegend, TracedValue } from '../components/TracedValue.js';

export function EvidenceStep({
  run,
  plot,
  onInspect,
}: {
  readonly run: RunView;
  readonly plot: PlotView;
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element {
  const [selected, setSelected] = useState<number | null>(null);

  const edges = plot.edges.map((e) => {
    const applied = run.envelope.appliedSetbacks.find((s) => s.seq === e.seq);
    return {
      ...e,
      ...(applied ? { setbackM: applied.setbackM, ruleId: applied.ruleId } : {}),
    };
  });

  return (
    <>
      <ProvenanceLegend />

      <section className="panel" aria-labelledby="evidence-heading">
        <header className="panel__header">
          <div>
            <h2 id="evidence-heading" className="panel__title">
              The plot, with what the rules took off it
            </h2>
            <p className="panel__subtitle">
              The hatched strip is setback. Select an edge to see which rule set it.
            </p>
          </div>
        </header>

        <PlotCanvas
          vertices={plot.vertices}
          edges={edges}
          areaM2={plot.computedAreaM2}
          footprintAreaM2={run.envelope.setbackPermittedFootprint.value}
          onSelectEdge={setSelected}
          selectedEdge={selected}
        />

        {selected !== null ? (
          <SelectedEdge
            edge={edges[selected]}
            onInspect={() => onInspect(run.envelope.setbackPermittedFootprint.node)}
          />
        ) : null}
      </section>

      <section className="panel" aria-labelledby="numbers-heading">
        <header className="panel__header">
          <div>
            <h2 id="numbers-heading" className="panel__title">
              Every number in this run
            </h2>
            <p className="panel__subtitle">
              Each one opens its derivation. None of them resolves to &ldquo;the system
              decided&rdquo;.
            </p>
          </div>
        </header>

        <div className="evidence-grid">
          <EvidenceGroup title="Envelope">
            <EvidenceRow label="Setback-permitted footprint" traced={run.envelope.setbackPermittedFootprint} onInspect={onInspect} />
            <EvidenceRow label="Coverage cap" traced={run.envelope.coverageCap} onInspect={onInspect} />
            <EvidenceRow label="Podium footprint" traced={run.envelope.podiumFootprint} onInspect={onInspect} />
            <EvidenceRow label="Tower plate" traced={run.envelope.towerPlateCap} onInspect={onInspect} />
            <EvidenceRow label="Height ceiling" traced={run.envelope.heightCeilingM} onInspect={onInspect} />
            <EvidenceRow label="Floor to floor" traced={run.envelope.floorToFloorM} onInspect={onInspect} />
            <EvidenceRow label="Levels by height" traced={run.envelope.maxLevelsByHeight} onInspect={onInspect} />
          </EvidenceGroup>

          <EvidenceGroup title="Parking">
            <EvidenceRow label="Resident bays" traced={run.parking.residentBays} onInspect={onInspect} />
            <EvidenceRow label="Visitor bays" traced={run.parking.visitorBays} onInspect={onInspect} />
            <EvidenceRow label="Total bays" traced={run.parking.totalBays} onInspect={onInspect} />
            <EvidenceRow label="Area per bay" traced={run.parking.bayAreaFactorM2} onInspect={onInspect} />
            <EvidenceRow label="Area required" traced={run.parking.requiredAreaM2} onInspect={onInspect} />
            <EvidenceRow label="Units parking can carry" traced={run.parking.supportableUnitCeiling} onInspect={onInspect} />
          </EvidenceGroup>

          <EvidenceGroup title="Capacity">
            <EvidenceRow label="Band A — regulatory" traced={run.capacity.bandA} onInspect={onInspect} />
            <EvidenceRow label="Band B — geometric" traced={run.capacity.bandB} onInspect={onInspect} />
            <EvidenceRow label="Band C — parking" traced={run.capacity.bandC} onInspect={onInspect} />
            <EvidenceRow label="Governing" traced={run.capacity.governingGfa} onInspect={onInspect} />
            <EvidenceRow label="Levels" traced={run.capacity.levels} onInspect={onInspect} />
            <EvidenceRow label="Realism discount" traced={run.capacity.userRealismDiscount} onInspect={onInspect} />
          </EvidenceGroup>
        </div>
      </section>
    </>
  );
}

function EvidenceGroup({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="evidence-group">
      <h3 className="panel__section">{title}</h3>
      <dl className="kv">{children}</dl>
    </div>
  );
}

function EvidenceRow({
  label,
  traced,
  onInspect,
}: {
  readonly label: string;
  readonly traced: Parameters<typeof TracedValue>[0]['traced'];
  readonly onInspect: (n: string) => void;
}): JSX.Element {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <TracedValue traced={traced} onInspect={onInspect} />
      </dd>
    </div>
  );
}

function SelectedEdge({
  edge,
  onInspect,
}: {
  readonly edge: { seq: number; classification: string; setbackM?: string; ruleId?: string } | undefined;
  readonly onInspect: () => void;
}): JSX.Element | null {
  if (!edge) return null;
  return (
    <div className="callout">
      <strong>Edge {edge.seq + 1}</strong> faces{' '}
      {edge.classification.toLowerCase().replace('_', ' ')}.{' '}
      {edge.setbackM ? (
        <>
          The setback of <span className="value">{edge.setbackM} m</span> came from{' '}
          <code>{edge.ruleId}</code>.{' '}
          <button type="button" className="link-button" onClick={onInspect}>
            Show the derivation
          </button>
        </>
      ) : (
        <span className="muted">No setback resolved for this edge.</span>
      )}
    </div>
  );
}
