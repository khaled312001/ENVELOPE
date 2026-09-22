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
import { AR } from '../i18n/evidence.ar.js';
import { EN } from '../i18n/evidence.en.js';
import { useDict } from '../i18n/locale.js';

export function EvidenceStep({
  run,
  plot,
  onInspect,
}: {
  readonly run: RunView;
  readonly plot: PlotView;
  readonly onInspect: (nodeId: string) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const r = t.rows;
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
              {t.plot.title}
            </h2>
            <p className="panel__subtitle">{t.plot.subtitle}</p>
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
              {t.numbers.title}
            </h2>
            <p className="panel__subtitle">{t.numbers.subtitle}</p>
          </div>
        </header>

        <div className="evidence-grid">
          <EvidenceGroup title={t.groups.envelope}>
            <EvidenceRow label={r.setbackFootprint} traced={run.envelope.setbackPermittedFootprint} onInspect={onInspect} />
            <EvidenceRow label={r.coverageCap} traced={run.envelope.coverageCap} onInspect={onInspect} />
            <EvidenceRow label={r.podiumFootprint} traced={run.envelope.podiumFootprint} onInspect={onInspect} />
            <EvidenceRow label={r.towerPlate} traced={run.envelope.towerPlateCap} onInspect={onInspect} />
            <EvidenceRow label={r.heightCeiling} traced={run.envelope.heightCeilingM} onInspect={onInspect} />
            <EvidenceRow label={r.floorToFloor} traced={run.envelope.floorToFloorM} onInspect={onInspect} />
            <EvidenceRow label={r.levelsByHeight} traced={run.envelope.maxLevelsByHeight} onInspect={onInspect} />
          </EvidenceGroup>

          <EvidenceGroup title={t.groups.parking}>
            <EvidenceRow label={r.residentBays} traced={run.parking.residentBays} onInspect={onInspect} />
            <EvidenceRow label={r.visitorBays} traced={run.parking.visitorBays} onInspect={onInspect} />
            <EvidenceRow label={r.totalBays} traced={run.parking.totalBays} onInspect={onInspect} />
            <EvidenceRow label={r.areaPerBay} traced={run.parking.bayAreaFactorM2} onInspect={onInspect} />
            <EvidenceRow label={r.areaRequired} traced={run.parking.requiredAreaM2} onInspect={onInspect} />
            <EvidenceRow label={r.unitsParkingCarries} traced={run.parking.supportableUnitCeiling} onInspect={onInspect} />
          </EvidenceGroup>

          <EvidenceGroup title={t.groups.capacity}>
            <EvidenceRow label={r.bandA} traced={run.capacity.bandA} onInspect={onInspect} />
            <EvidenceRow label={r.bandB} traced={run.capacity.bandB} onInspect={onInspect} />
            <EvidenceRow label={r.bandC} traced={run.capacity.bandC} onInspect={onInspect} />
            <EvidenceRow label={r.governing} traced={run.capacity.governingGfa} onInspect={onInspect} />
            <EvidenceRow label={r.levels} traced={run.capacity.levels} onInspect={onInspect} />
            <EvidenceRow label={r.realismDiscount} traced={run.capacity.userRealismDiscount} onInspect={onInspect} />
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
  const t = useDict(EN, AR).edge;
  if (!edge) return null;
  return (
    <div className="callout">
      <strong>
        {t.edge}
        {edge.seq + 1}
      </strong>
      {t.faces(edge.classification)}
      {edge.setbackM ? (
        <>
          {t.setbackBefore}
          <span className="value">{edge.setbackM} m</span>
          {t.setbackMid}
          <code>{edge.ruleId}</code>
          {t.setbackAfter}
          <button type="button" className="link-button" onClick={onInspect}>
            {t.showDerivation}
          </button>
        </>
      ) : (
        <span className="muted">{t.noSetback}</span>
      )}
    </div>
  );
}
