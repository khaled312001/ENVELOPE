/**
 * Step 0 — read the sheet.
 *
 * The one moment in the 30 Aug 2026 meeting where the client reacted to a
 * feature rather than to a number:
 *
 *   Khaled — "أنا لو عملتلك upload box كده، ترفع فيه الفايل ده، وتلقائيًا يستخرج
 *             النص واللي فيه."
 *   Client — "الله الله."                                              — 14:53
 *
 * Three decisions shape this screen, and each of them costs something:
 *
 * 1. **It does not create a plot.** Reading a sheet and creating a record are
 *    separate acts, and the gap between them is where a person looks. An upload
 *    that landed straight in the database would let a mis-read number enter the
 *    system with nobody having seen it — and the whole product is arranged
 *    around somebody having seen it.
 *
 * 2. **A gap is shown as loudly as a value.** `DJAZ1MED12RES011` prints a height
 *    and nothing else: no FAR, no GFA, no setback, no coverage. Borrowing 3.50
 *    from the neighbouring plot is the exact failure this product exists to
 *    prevent, so the missing fields get the amber treatment and the blocking
 *    ones stop the run.
 *
 * 3. **It does not offer width and depth.** The sheet states an area, not a
 *    frontage — and a rectangle inferred from an area is a plot shape nobody
 *    surveyed. The area is carried across as the *stated* area, where the 2%
 *    cross-check can catch a mistyped dimension, and the dimensions stay the
 *    user's to enter.
 */

import { useRef, useState } from 'react';

import {
  api,
  ApiError,
  type Actor,
  type AffectionPlanRead,
  type SetbackFaceView,
  type SetbackValueView,
} from '../api/client.js';
import type { TracedWire } from '../components/TracedValue.js';
import { TracedValue } from '../components/TracedValue.js';

export interface Prefill {
  readonly plotNumber: string;
  readonly community: string;
  readonly statedAreaM2: string;
  /**
   * The podium count, when the sheet states one — `G+2P+8` is two. Carried to
   * step 3 as a pre-filled field the reader confirms, never straight into a run:
   * the parser read it, and the person who confirms it is the one it is recorded
   * against. Absent when the sheet prints no height code at all.
   */
  readonly podiumLevels?: { readonly value: number; readonly raw: string };
}

const MAX_BYTES = 3 * 1024 * 1024;

export function AffectionPlanIntake({
  actor,
  onUse,
  onSkip,
}: {
  readonly actor: Actor;
  readonly onUse: (prefill: Prefill) => void;
  readonly onSkip: () => void;
}): JSX.Element {
  const [read, setRead] = useState<AffectionPlanRead | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setError(null);
    setRead(null);

    // Checked here as well as on the server. The server's refusal is the one
    // that counts; this one is the one that arrives before a 3 MB upload.
    if (file.size > MAX_BYTES) {
      setError(
        `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. Affection plans are ` +
          'single sheets of about 1.5 MB — a file this large is usually a scanned ' +
          'bundle, and a scan has no text to read.',
      );
      return;
    }

    setBusy(true);
    try {
      setRead(await api.readAffectionPlan(actor, file));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? `${e.message}${typeof e.detail === 'string' ? ` ${e.detail}` : ''}`
          : String(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="intake-heading">
      <header className="panel__header">
        <div>
          <h2 id="intake-heading" className="panel__title">
            Read an affection plan
          </h2>
          <p className="panel__subtitle">
            Drop the PDF in. We read the printed values, re-check the sheet&rsquo;s own
            arithmetic, and list what it does not say. Nothing is saved until you have
            looked at it.
          </p>
        </div>
      </header>

      <div
        className={`dropzone${dragging ? ' is-dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handle(e.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          id="affection-plan-file"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => void handle(e.target.files?.[0])}
        />
        <label htmlFor="affection-plan-file" className="dropzone__label">
          <span className="dropzone__glyph" aria-hidden="true">
            ▤
          </span>
          <span className="dropzone__text">
            <strong>{busy ? 'Reading the sheet…' : 'Choose a PDF, or drop one here'}</strong>
            <span className="fine-print">
              The sheet must be the issued PDF. A photograph or a scan has no text on it
              to read, and this does not guess at pixels.
            </span>
          </span>
        </label>
      </div>

      {error ? (
        <div className="banner banner--danger" role="alert">
          {error}
        </div>
      ) : null}

      {read ? <Reading read={read} onUse={onUse} /> : null}

      <footer className="panel__footer">
        <button type="button" className="button" onClick={onSkip}>
          Skip — I&rsquo;ll type the values in
        </button>
      </footer>
    </section>
  );
}

function Field({
  label,
  traced,
  prose,
}: {
  readonly label: string;
  readonly traced: TracedWire | null;
  /** The value is a phrase, not a quantity — let it wrap. */
  readonly prose?: boolean;
}): JSX.Element {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={prose ? 'kv__text' : undefined}>
        {traced ? (
          // No inspect handler: this sheet has not been run, so there is no
          // provenance graph to open yet. The chip still carries the class, and
          // the class is the part that matters here — every field read off an
          // affection plan is DERIVED, because the sheet is a citable instrument.
          <TracedValue traced={traced} onInspect={() => undefined} />
        ) : (
          <span className="value value--absent">not printed on this sheet</span>
        )}
      </dd>
    </div>
  );
}

/** The three faces of one mass, or a plain statement that a face is unstated. */
function Faces({ face }: { readonly face: SetbackFaceView }): JSX.Element {
  const entries: readonly [string, SetbackValueView | undefined][] = [
    ['front', face.front],
    ['side', face.side],
    ['rear', face.rear],
  ];
  const stated = entries.filter(([, v]) => v !== undefined);
  if (stated.length === 0) return <span className="value--absent">not stated</span>;

  return (
    <>
      {stated.map(([name, v], i) => (
        <span key={name}>
          {i > 0 ? ', ' : ''}
          {name}{' '}
          {v!.kind === 'FIXED' ? (
            <strong>{v!.metres} m</strong>
          ) : (
            <>
              <span className="chip chip--warn">needs a decision</span>{' '}
              {v!.options.map((o) => `${o.metres} m ${o.condition}`).join(' or ')}
            </>
          )}
        </span>
      ))}
    </>
  );
}

function Reading({
  read,
  onUse,
}: {
  readonly read: AffectionPlanRead;
  readonly onUse: (prefill: Prefill) => void;
}): JSX.Element {
  const f = read.facts;
  const blocked = f.blocking.length > 0;

  return (
    <div className="reading">
      <h3 className="panel__section">{read.filename}</h3>

      <dl className="kv kv--grid">
        <Field label="Plot number" traced={f.parcelId} />
        <Field label="Community" traced={f.community} prose />
        <Field label="Land use" traced={f.landUse} prose />
        <Field label="Plot area" traced={f.totalAreaSqm} />
        <Field label="FAR" traced={f.far} />
        <Field label="Permitted GFA" traced={f.gfaSqm} />
        <Field label="Issued" traced={f.issueDate} />
        <Field label="Drawing reference" traced={f.drawingRef} />
      </dl>

      {f.height ? (
        <p className="callout callout--ok">
          <strong>Height:</strong> {f.height.value.raw} — {f.height.value.groundFloors} ground,{' '}
          {f.height.value.podiumLevels} podium, {f.height.value.typicalFloors} typical.
        </p>
      ) : null}

      {f.setbacks ? (
        <>
          <h4 className="panel__subheading">Setbacks, as printed</h4>
          <ul className="reason-list">
            <li>
              <strong>Ground floor and podium</strong> — <Faces face={f.setbacks.value.podium} />
            </li>
            <li>
              <strong>Tower</strong> — <Faces face={f.setbacks.value.tower} />
            </li>
          </ul>
          <p className="fine-print">
            As printed: &ldquo;{f.setbacks.value.raw}&rdquo;
          </p>
          {f.setbacks.value.requiresDecision ? (
            <div className="banner banner--assumed" role="note">
              <div>
                <strong>One of these setbacks depends on a decision nobody has made.</strong>
                <p>
                  The sheet states two values for the same face — typically &ldquo;0 m to a
                  solid wall and 4.0 m to a window wall&rdquo;. That is the sheet being
                  precise, not vague: it depends on a façade the applicant has not chosen.
                  Collapsing it to one number would pick the façade for them, so it stays as
                  printed and the run is blocked until someone chooses.
                </p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {f.coverage ? (
        <p className="callout">
          <strong>Coverage:</strong>{' '}
          {f.coverage.value.podium
            ? `podium ${(Number(f.coverage.value.podium) * 100).toFixed(0)}% of plot area`
            : 'podium not stated'}
          {f.coverage.value.tower
            ? `, tower ${(Number(f.coverage.value.tower) * 100).toFixed(0)}%`
            : ''}
          .
        </p>
      ) : null}

      {/*
        The arithmetic on the sheet, re-done. A cross-check that passes is worth
        showing: it is the cheapest evidence available that the read was right,
        and it is the first thing a sceptical reader would do by hand.
      */}
      {f.crossChecks.length > 0 ? (
        <>
          <h4 className="panel__subheading">The sheet&rsquo;s own arithmetic, re-checked</h4>
          <ul className="reason-list">
            {f.crossChecks.map((c) => (
              <li key={c.name}>
                <span className={c.passed ? 'chip chip--ok' : 'chip chip--danger'}>
                  {c.passed ? 'agrees' : 'disagrees'}
                </span>{' '}
                {c.detail}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {f.missing.length > 0 ? (
        <>
          <h4 className="panel__subheading">
            What this sheet does not say
            <span className="chip chip--warn">{f.missing.length}</span>
          </h4>
          <ul className="reason-list reason-list--uncertain">
            {f.missing.map((m) => (
              <li key={m.field}>
                <strong>{m.label}</strong> — {m.consequence}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {blocked ? (
        <div className="banner banner--danger" role="alert">
          <strong>This sheet cannot drive a capacity run.</strong> It omits{' '}
          {f.blocking.map((b) => b.label).join(', ')}. Those are not values this engine
          will supply — a limit borrowed from a neighbouring plot is the precise mistake
          this product exists to prevent. You can still create the plot and enter the
          limits from the governing regulation yourself.
        </div>
      ) : null}

      <p className="fine-print">{read.disclaimer}</p>

      <div className="actions actions--row">
        <button
          type="button"
          className="button button--primary"
          onClick={() =>
            onUse({
              plotNumber: f.parcelId?.value ?? '',
              community: f.community?.value ?? '',
              statedAreaM2: f.totalAreaSqm?.value ?? '',
              ...(f.height
                ? {
                    podiumLevels: {
                      value: f.height.value.podiumLevels,
                      raw: f.height.value.raw,
                    },
                  }
                : {}),
            })
          }
        >
          Use these values
        </button>
      </div>
      <div>
        <p className="fine-print">
          The plot number, community and stated area carry over, and the podium count
          waits for you to confirm it on the rules step. Width and depth do not carry over:
          the sheet gives an area, and a rectangle inferred from an area is a plot shape
          nobody surveyed. Enter the dimensions and the 2% check will compare them against
          the area above.
        </p>
      </div>
    </div>
  );
}
