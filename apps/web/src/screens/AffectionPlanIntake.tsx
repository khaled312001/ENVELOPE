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

import { Fragment, useRef, useState, type ReactNode } from 'react';

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
import { AR } from '../i18n/intake.ar.js';
import { EN } from '../i18n/intake.en.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';

/**
 * What the sheet and the API said, isolated on the Arabic page and untouched on
 * the English one — whose markup is held byte-identical to what it was before its
 * copy moved into `i18n/intake.en.ts`.
 */
function useVerbatim(): (value: ReactNode) => ReactNode {
  const { locale } = useLocale();
  return (value) => (locale === 'ar' ? <Verbatim>{value}</Verbatim> : value);
}

/**
 * The figures inside this screen's sentences, each named once, because no digit is
 * typed into a dictionary. The typical size is the three real sheets on file
 * (1.2–1.5 MB); the tolerance is `FR-PLT-001 AC2`; the worked example is the
 * wording of a conditional setback as Trakhees prints it.
 */
const TYPICAL_SHEET_MB = '1.5';
const AREA_TOLERANCE = '2%';
const CONDITIONAL_EXAMPLE = '0 m to a solid wall and 4.0 m to a window wall';

/**
 * A failure, kept as the facts rather than as a sentence — so it is written in
 * whichever language is on screen when it renders, not the one that was on screen
 * when the file was dropped.
 */
export type IntakeError =
  | { readonly kind: 'too-large'; readonly name: string; readonly sizeMb: string }
  /** The API's own sentence, or the thrown value's; rendered as it arrived. */
  | { readonly kind: 'reported'; readonly text: string };

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
  const t = useDict(EN, AR);
  const [read, setRead] = useState<AffectionPlanRead | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<IntakeError | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setError(null);
    setRead(null);

    // Checked here as well as on the server. The server's refusal is the one
    // that counts; this one is the one that arrives before a 3 MB upload.
    if (file.size > MAX_BYTES) {
      setError({
        kind: 'too-large',
        name: file.name,
        sizeMb: (file.size / 1024 / 1024).toFixed(1),
      });
      return;
    }

    setBusy(true);
    try {
      setRead(await api.readAffectionPlan(actor, file));
    } catch (e) {
      setError({
        kind: 'reported',
        text:
          e instanceof ApiError
            ? `${e.message}${typeof e.detail === 'string' ? ` ${e.detail}` : ''}`
            : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" aria-labelledby="intake-heading">
      <header className="panel__header">
        <div>
          <h2 id="intake-heading" className="panel__title">
            {t.title}
          </h2>
          <p className="panel__subtitle">{t.subtitle}</p>
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
            <strong>{busy ? t.dropzone.busy : t.dropzone.idle}</strong>
            <span className="fine-print">{t.dropzone.issuedOnly}</span>
          </span>
        </label>
      </div>

      {error ? <IntakeErrorBanner error={error} /> : null}

      {read ? <Reading read={read} onUse={onUse} /> : null}

      <footer className="panel__footer">
        <button type="button" className="button" onClick={onSkip}>
          {t.skip}
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
  const t = useDict(EN, AR);
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
          <span className="value value--absent">{t.notPrinted}</span>
        )}
      </dd>
    </div>
  );
}

/** The three faces of one mass, or a plain statement that a face is unstated. */
function Faces({ face }: { readonly face: SetbackFaceView }): JSX.Element {
  const t = useDict(EN, AR);
  const { locale } = useLocale();
  const entries: readonly [keyof typeof t.faces, SetbackValueView | undefined][] = [
    ['front', face.front],
    ['side', face.side],
    ['rear', face.rear],
  ];
  const stated = entries.filter(([, v]) => v !== undefined);
  if (stated.length === 0) return <span className="value--absent">{t.notStated}</span>;

  return (
    <>
      {stated.map(([name, v], i) => (
        <span key={name}>
          {i > 0 ? t.faceSeparator : ''}
          {t.faces[name]}{' '}
          {v!.kind === 'FIXED' ? (
            <strong>{v!.metres} m</strong>
          ) : (
            <>
              <span className="chip chip--warn">{t.needsDecision}</span>{' '}
              {/* Each option's condition is the sheet's own wording. On the Arabic
                  page each is isolated, so «أو» sits between them and not inside. */}
              {locale === 'ar'
                ? v!.options.map((o, k) => (
                    <Fragment key={k}>
                      {k > 0 ? t.or : ''}
                      <Verbatim>{`${o.metres} m ${o.condition}`}</Verbatim>
                    </Fragment>
                  ))
                : v!.options.map((o) => `${o.metres} m ${o.condition}`).join(t.or)}
            </>
          )}
        </span>
      ))}
    </>
  );
}

/**
 * What was read off one sheet. Exported because it renders only after an upload,
 * which a static render never performs — `app-arabic.test.tsx` feeds it the API's
 * own reading of the real sheets instead.
 */
/**
 * The refusal, written at render from the facts the drop handler stored.
 *
 * Its own component, and exported, because it renders only after a file is dropped
 * — which a static render never does. Lifting it out changes no markup.
 */
export function IntakeErrorBanner({ error }: { readonly error: IntakeError }): JSX.Element {
  const t = useDict(EN, AR);
  const ltr = useVerbatim();
  return (
    <div className="banner banner--danger" role="alert">
      {error.kind === 'too-large' ? (
        <>
          {t.tooLarge.before}
          {ltr(error.name)}
          {t.tooLarge.after(error.sizeMb, TYPICAL_SHEET_MB)}
        </>
      ) : (
        ltr(error.text)
      )}
    </div>
  );
}

export function Reading({
  read,
  onUse,
}: {
  readonly read: AffectionPlanRead;
  readonly onUse: (prefill: Prefill) => void;
}): JSX.Element {
  const t = useDict(EN, AR);
  const ltr = useVerbatim();
  const { locale } = useLocale();
  const f = read.facts;
  const blocked = f.blocking.length > 0;
  const percent = (fraction: string): string => (Number(fraction) * 100).toFixed(0);

  return (
    <div className="reading">
      {/* The reader's own file name, as their file system gave it. */}
      <h3 className="panel__section">{ltr(read.filename)}</h3>

      <dl className="kv kv--grid">
        <Field label={t.fields.plotNumber} traced={f.parcelId} />
        <Field label={t.fields.community} traced={f.community} prose />
        <Field label={t.fields.landUse} traced={f.landUse} prose />
        <Field label={t.fields.plotArea} traced={f.totalAreaSqm} />
        <Field label={t.fields.far} traced={f.far} />
        <Field label={t.fields.gfa} traced={f.gfaSqm} />
        <Field label={t.fields.issued} traced={f.issueDate} />
        <Field label={t.fields.drawingRef} traced={f.drawingRef} />
      </dl>

      {f.height ? (
        <p className="callout callout--ok">
          <strong>{t.height.label}</strong> {ltr(f.height.value.raw)} —{' '}
          {/* Each count is rendered as a child, never stringified. `api/client.ts`
              declares a `groundFloors` that `packages/intake` does not emit, so the
              page has always printed that slot as nothing — a defect to fix at the
              type, not to paper over here with the word "undefined". */}
          {t.height.groundBefore}
          {f.height.value.groundFloors}
          {t.height.groundAfter}
          {t.height.podiumBefore}
          {f.height.value.podiumLevels}
          {t.height.podiumAfter}
          {t.height.typicalBefore}
          {f.height.value.typicalFloors}
          {t.height.typicalAfter}
        </p>
      ) : null}

      {f.setbacks ? (
        <>
          <h4 className="panel__subheading">{t.setbacks.title}</h4>
          <ul className="reason-list">
            <li>
              <strong>{t.setbacks.podium}</strong> — <Faces face={f.setbacks.value.podium} />
            </li>
            <li>
              <strong>{t.setbacks.tower}</strong> — <Faces face={f.setbacks.value.tower} />
            </li>
          </ul>
          <p className="fine-print">
            {t.setbacks.asPrintedBefore}
            {ltr(f.setbacks.value.raw)}
            {t.setbacks.asPrintedAfter}
          </p>
          {f.setbacks.value.requiresDecision ? (
            <div className="banner banner--assumed" role="note">
              <div>
                <strong>{t.setbacks.decision.title}</strong>
                <p>
                  {t.setbacks.decision.before}
                  {ltr(CONDITIONAL_EXAMPLE)}
                  {t.setbacks.decision.after}
                </p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {f.coverage ? (
        <p className="callout">
          <strong>{t.coverage.label}</strong>{' '}
          {f.coverage.value.podium
            ? t.coverage.podium(percent(f.coverage.value.podium))
            : t.coverage.podiumMissing}
          {f.coverage.value.tower ? t.coverage.tower(percent(f.coverage.value.tower)) : ''}
          {t.coverage.end}
        </p>
      ) : null}

      {/*
        The arithmetic on the sheet, re-done. A cross-check that passes is worth
        showing: it is the cheapest evidence available that the read was right,
        and it is the first thing a sceptical reader would do by hand.
      */}
      {f.crossChecks.length > 0 ? (
        <>
          <h4 className="panel__subheading">{t.crossChecks.title}</h4>
          <ul className="reason-list">
            {f.crossChecks.map((c) => (
              <li key={c.name}>
                <span className={c.passed ? 'chip chip--ok' : 'chip chip--danger'}>
                  {c.passed ? t.crossChecks.agrees : t.crossChecks.disagrees}
                </span>{' '}
                {ltr(c.detail)}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {/* Each gap's label and consequence are `packages/intake`'s own words. */}
      {f.missing.length > 0 ? (
        <>
          <h4 className="panel__subheading">
            {t.missingTitle}
            <span className="chip chip--warn">{f.missing.length}</span>
          </h4>
          {/*
            THE FACT AND THE ACTION, BEFORE THE LIST AND BEFORE THE ARGUMENT.

            This heading is the one the client singled out — «وفي حجات موجوده مش
            مفهومه بالنسبالي». Nothing here was wrong; the reader simply met a red
            paragraph about borrowed plot ratios before anyone had said, plainly,
            what the list under the heading was. So the plain sentence comes first,
            the gaps come second in the engine's own words, and the argument sits
            behind a closed disclosure — it earns its place and it does not earn the
            first eyeful.
          */}
          <p className="reading__lead">{t.missingLead}</p>
          <ul className="reason-list reason-list--uncertain">
            {f.missing.map((m) => (
              <li key={m.field}>
                <strong>{ltr(m.label)}</strong> — {ltr(m.consequence)}
              </li>
            ))}
          </ul>
          <details className="disclosure">
            <summary>{t.missingWhySummary}</summary>
            <p>{t.missingWhy}</p>
          </details>
        </>
      ) : null}

      {blocked ? (
        <div className="banner banner--danger" role="alert">
          <strong>{t.blocked.title}</strong>
          {t.blocked.before}
          {locale === 'ar'
            ? f.blocking.map((b, k) => (
                <Fragment key={b.field}>
                  {k > 0 ? t.blocked.labelSeparator : ''}
                  <Verbatim>{b.label}</Verbatim>
                </Fragment>
              ))
            : f.blocking.map((b) => b.label).join(t.blocked.labelSeparator)}
          {t.blocked.after}
        </div>
      ) : null}

      {/* The API's disclaimer, said on every reading and rendered as it wrote it. */}
      <p className="fine-print">{ltr(read.disclaimer)}</p>

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
          {t.use}
        </button>
      </div>
      <div>
        <p className="fine-print">{t.carryOver(AREA_TOLERANCE)}</p>
      </div>
    </div>
  );
}
