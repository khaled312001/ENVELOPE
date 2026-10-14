import { useState } from 'react';

import { api, ApiError, type Actor, type ExportResult, type RunView } from '../api/client.js';
import { useSheets } from '../components/DrawingSet.js';
import { downloadObject, openDocument, printDocument } from '../documents.js';
import { hashOf } from '../gateHash.js';
import { AR } from '../i18n/app.ar.js';
import { EN } from '../i18n/app.en.js';
import { useDict, useLocale } from '../i18n/locale.js';
import { useVerbatim } from './verbatim.js';

/**
 * The figures inside sentences on this screen, each named once.
 *
 * They are not in the dictionary because no digit is. A3 is the paper the drawing
 * set is composed for; the model file is glTF 2.0 because that is what
 * `@envelope/massing` writes.
 */
const DRAWING_SET_PAPER = 'A3';
const THREE_D = '3D';
const MODEL_FORMAT = 'glTF 2.0';
const LAYER_EXAMPLES = ['ENV-B1-BAY', 'ENV-B1-CAR'] as const;

/** What the export step holds once the report has been prepared. */
export interface ExportDoneState {
  readonly result: ExportResult;
  readonly html: string;
  readonly sheets: string | null;
}

export function ExportPanel({
  actor,
  run,
  gates,
  onAcknowledge,
  onGoToAssumptions,
  onError,
}: {
  readonly actor: Actor;
  readonly run: RunView;
  readonly gates: Record<string, boolean>;
  readonly onAcknowledge: (gate: string, hash: string) => void;
  readonly onGoToAssumptions: () => void;
  readonly onError: (e: ApiError) => void;
}): JSX.Element {
  const t = useDict(EN, AR).export;
  const [done, setDone] = useState<ExportDoneState | null>(null);
  const [busy, setBusy] = useState(false);
  /*
    EVERY IDENTIFIED ACTOR MAY SIGN. This was `Boolean(actor.licence)`, and the
    licence is a number nothing verifies — see the note in `identity.ts`. What
    the panel owes the reader now is the STATE of that field, not a refusal:
    whose name goes on the export, and whether a licence went with it.
  */
  const hasLicence = Boolean(actor.licence);
  const ready =
    Boolean(gates['G3_ASSUMPTIONS_ACKNOWLEDGED']) && Boolean(gates['G4_REVIEWER_NAMED']);

  return (
    <section className="panel" aria-labelledby="export-heading">
      <header className="panel__header">
        <div>
          <h2 id="export-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
        </div>
      </header>

      <ol className="gate-list">
        <li className={gates['G3_ASSUMPTIONS_ACKNOWLEDGED'] ? 'is-done' : undefined}>
          <span className="gate-list__glyph" aria-hidden="true">
            {gates['G3_ASSUMPTIONS_ACKNOWLEDGED'] ? '✓' : '○'}
          </span>
          <div>
            <strong>{t.assumptionsRead}</strong>
            <p>{t.assumptionCount(run.assumptions.length)}</p>
            {/*
              Acknowledged on the register, not here. §20.2 makes the register
              "the moment the user understands this is not magic", and a tick box on
              the export screen would let someone accept a list they never opened.
              What this screen owes them is the way back — an unactionable circle on
              a checklist is a dead end, and that is what it was.
            */}
            {!gates['G3_ASSUMPTIONS_ACKNOWLEDGED'] ? (
              <button type="button" className="link-button" onClick={onGoToAssumptions}>
                {t.readThem}
              </button>
            ) : null}
          </div>
        </li>
        <li className={gates['G4_REVIEWER_NAMED'] ? 'is-done' : undefined}>
          <span className="gate-list__glyph" aria-hidden="true">
            {gates['G4_REVIEWER_NAMED'] ? '✓' : '○'}
          </span>
          <div>
            <strong>{t.signedBy}</strong>
            <p>
              {t.reviewerBefore}
              <PersonName name={actor.name} />
              {t.reviewerAfter}
            </p>
            <p className="note">{hasLicence ? t.withLicence : t.noLicence}</p>
            {!gates['G4_REVIEWER_NAMED'] ? (
              <button
                type="button"
                className="button"
                onClick={() => onAcknowledge('G4_REVIEWER_NAMED', hashOf(run.capacity))}
              >
                {t.sign}
              </button>
            ) : null}
          </div>
        </li>
      </ol>

      <div className="actions">
        <button
          type="button"
          className="button button--primary"
          disabled={!ready || busy}
          onClick={async () => {
            setBusy(true);
            try {
              // The drawing set only when the run has a model to draw; a run stored
              // before it existed would be refused, and that refusal is not a
              // reason to withhold the report.
              const [result, html, sheets] = await Promise.all([
                api.exportRun(actor, run.runId),
                api.exportRunHtml(actor, run.runId),
                run.building ? api.exportRunHtml(actor, run.runId, 'sheets') : Promise.resolve(null),
              ]);
              setDone({ result, html, sheets });
            } catch (e) {
              if (e instanceof ApiError) onError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? t.preparing : t.exportReport}
        </button>
        {!ready ? <p className="fine-print">{t.notReady}</p> : null}
      </div>

      {done ? <ExportDone actor={actor} run={run} done={done} onError={onError} /> : null}
    </section>
  );
}

/**
 * The name a person typed, isolated on the Arabic page.
 *
 * Not `Verbatim`: a name is not an engine string and need not be English, so it
 * gets no `lang`. It gets `<bdi>` — its direction is its own, and a Latin name at
 * the edge of an Arabic sentence would otherwise carry the full stop with it.
 */
function PersonName({ name }: { readonly name: string }): JSX.Element {
  const { locale } = useLocale();
  return locale === 'ar' ? <bdi>{name}</bdi> : <>{name}</>;
}

/**
 * The export step after the report has been prepared: the fixed run, its two
 * fingerprints and every file behind the same two gates.
 *
 * Its own component, and exported, because it renders only after a click — so the
 * copy in it was rendered by nothing but a browser. Lifting it out changes no
 * markup, and `useSheets` moves with it: the sheet list is read only where it is
 * shown.
 */
export function ExportDone({
  actor,
  run,
  done,
  onError,
}: {
  readonly actor: Actor;
  readonly run: RunView;
  readonly done: ExportDoneState;
  readonly onError: (e: ApiError) => void;
}): JSX.Element {
  const t = useDict(EN, AR).export;
  const ltr = useVerbatim();
  const sheets = useSheets(run);

  return (
    <>
      <div className="callout callout--ok">
        <p>
          {t.fixedBefore}
          <code>{run.runId.slice(0, 8)}</code>
          {t.fixedAfter}
        </p>
      </div>

      {/*
        Two artifacts, and two fingerprints beside them.

        §3.4 item 9 promises a report and a JSON export; a screen that said
        "export prepared" and handed over neither had promised and not
        delivered. The fingerprints are printed rather than hidden because
        §13.4's guarantee is only worth something if a reader can check it —
        one covers the question that was asked, the other the answer that came
        back.
      */}
      <dl className="kv">
        <div>
          <dt>{t.runFingerprint}</dt>
          <dd>
            <code>{done.result.fingerprint}</code>
            <span className="muted">{t.runFingerprintNote}</span>
          </dd>
        </div>
        <div>
          <dt>{t.reportFingerprint}</dt>
          <dd>
            <code>{done.result.reportFingerprint.digest.slice(0, 16)}…</code>
            <span className="muted">
              {' '}
              {t.reportFingerprintBefore}
              {ltr(done.result.reportFingerprint.algorithm)}
              {t.reportFingerprintAfter}
            </span>
          </dd>
        </div>
      </dl>

      {done.result.annexNotice ? (
        <div className="banner banner--danger" role="alert">
          <div>
            <strong>{t.annexTitle}</strong>
            <p>{ltr(done.result.annexNotice)}</p>
          </div>
        </div>
      ) : null}

      {/*
        THE PDF. The report is print-first HTML, so the browser is this
        product's PDF writer — `documents.ts` argues why that is a decision and
        not a shortfall. The note under the buttons says so on the page, because
        a reader who expects a file and gets a dialog concludes it is broken.
      */}
      <div className="actions actions--row">
        <button
          type="button"
          className="button"
          onClick={() => openDocument(done.html, 'text/html')}
        >
          {t.openReport}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => printDocument(done.html, 'text/html')}
        >
          {t.printReport}
        </button>
        {done.sheets ? (
          <button
            type="button"
            className="button"
            onClick={() => openDocument(done.sheets!, 'text/html')}
          >
            {t.openDrawingSet(DRAWING_SET_PAPER)}
          </button>
        ) : null}
        {done.sheets ? (
          <button
            type="button"
            className="button"
            onClick={() => printDocument(done.sheets!, 'text/html')}
          >
            {t.printDrawingSet(DRAWING_SET_PAPER)}
          </button>
        ) : null}
        <button
          type="button"
          className="button"
          onClick={() =>
            openDocument(JSON.stringify(done.result.document, null, 2), 'application/json')
          }
        >
          {t.openJson}
        </button>
        {/*
          CAD and Excel, behind the same two gates as the report.

          The client asked for both by name. The temptation is to treat a
          drawing as a lesser artifact that can skip the acknowledgement; it
          is the opposite — a DXF is the output most likely to be x-reffed
          into a submission set and read by someone who never saw the
          assumption register, so it is gated identically and it carries the
          disclaimer inside the file.

          Downloaded rather than opened in a tab: neither format renders in a
          browser, and a tab of binary is a broken feature.
        */}
        <button
          type="button"
          className="button"
          onClick={() => void download(actor, run.runId, 'dxf', onError)}
        >
          {t.downloadDxf}
        </button>
        {run.building ? (
          <button
            type="button"
            className="button"
            onClick={() => void download(actor, run.runId, 'glb', onError)}
          >
            {t.downloadModel(THREE_D)}
          </button>
        ) : null}
        <button
          type="button"
          className="button"
          onClick={() => void download(actor, run.runId, 'xlsx', onError)}
        >
          {t.downloadXlsx}
        </button>
      </div>

      <p className="fine-print">{t.pdfNote}</p>

      <p className="fine-print">
        {t.cad.lead(THREE_D)}
        <code>{LAYER_EXAMPLES[0]}</code>
        {t.cad.between}
        <code>{LAYER_EXAMPLES[1]}</code>
        {t.cad.afterLayers}
        <strong>{t.cad.not}</strong>
        {t.cad.tail}
      </p>
      {run.building ? (
        <p className="fine-print">
          {t.glb.lead(THREE_D)}
          <code>.glb</code>
          {t.glb.tail(THREE_D, MODEL_FORMAT)}
        </p>
      ) : null}

      {/*
        One sheet at a time, behind the same two gates as the whole building.
        A consultant who needs level B2 should not have to take the building
        apart to get it, and a sheet downloaded alone is exactly the sheet on
        screen — flat, framed and titled, at true size in metres.
      */}
      {sheets.length > 0 ? (
        <>
          <h3 className="panel__subheading">{t.oneSheet}</h3>
          <ul className="sheet-downloads">
            {sheets.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => void download(actor, run.runId, 'dxf', onError, s)}
                >
                  {t.sheetBefore}
                  {ltr(s.number)}
                  {t.sheetBetween}
                  {ltr(s.title)}
                  {t.sheetAfter}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

/**
 * Save a binary export.
 *
 * A real download, unlike `openDocument`: a DXF opened in a tab is a wall of
 * group codes and an XLSX is a zip, and both read as a broken feature. The
 * filename comes from the run id so two runs of one plot do not overwrite each
 * other in the Downloads folder — which they did, and the second one silently
 * won.
 */
async function download(
  actor: Actor,
  runId: string,
  format: 'dxf' | 'xlsx' | 'glb',
  onError: (e: ApiError) => void,
  sheet?: { readonly id: string; readonly number: string },
): Promise<void> {
  try {
    const blob = await api.exportRunFile(actor, runId, format, sheet?.id);
    downloadObject(
      URL.createObjectURL(blob),
      `envelope-${runId.slice(0, 8)}${sheet ? `-${sheet.number}` : ''}.${format}`,
    );
  } catch (e) {
    if (e instanceof ApiError) onError(e);
  }
}
