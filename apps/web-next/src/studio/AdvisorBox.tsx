import { Check, RotateCw } from 'lucide-react';
import { createContext, type ReactNode, useContext, useEffect, useId, useState } from 'react';

import { type Actor, type AdviseBody, type AdviseStudioStep, type AdvisorEdit, api, ApiError } from '@web/api/client.js';

import { useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { SparkMark } from '../ui/spark.js';
import { acceptable, describeField, describeValue } from './advisor-edits.js';

/*
  CLAUDE'S READING OF THE STEP, BESIDE THE FIGURES (Eng. Mohamed, 16 Oct 2026:
  Claude Opus 5.5 as the thinker on every step, going to the Dubai Building Code
  first). It asks only when the reader presses its button, since every call is
  billed, and the server keeps the answer, so asking a step again costs nothing.

  It is on every step — the ones before a run read the reader's own inputs — and
  under every error the studio shows, as guide and corrector. Its text changes
  no figure. It may also come back with edits to the reader's inputs, each on a
  clause of the code (see `advisor-edits.ts`); an edit is a proposal until the
  reader presses Apply, and then it is the reader's input, counted only when
  the reader computes again. Where the deployment has no key the box is not
  shown at all, rather than shown as a feature that never answers.
*/

interface AdvisorScope {
  readonly actor: Actor;
  readonly enabled: boolean;
  /** The inputs Claude may propose to change, with their values now. */
  readonly fields: Readonly<Record<string, string>>;
  /** Writes the edits the reader applied into the inputs; returns the step where they take effect. */
  readonly apply: (edits: readonly AdvisorEdit[]) => AdviseStudioStep;
  readonly goTo: (step: AdviseStudioStep) => void;
}

const Scope = createContext<AdvisorScope | null>(null);

/** Asks the server once whether the analysis is on, and lets every step below use it. */
export function AdvisorProvider({
  actor,
  fields,
  apply,
  goTo,
  children,
}: Omit<AdvisorScope, 'enabled'> & { readonly children: ReactNode }): JSX.Element {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let live = true;
    api
      .advisorStatus(actor)
      .then((s) => live && setEnabled(s.enabled))
      .catch(() => live && setEnabled(false));
    return () => {
      live = false;
    };
  }, [actor]);
  return <Scope.Provider value={{ actor, enabled, fields, apply, goTo }}>{children}</Scope.Provider>;
}

type State =
  | { readonly kind: 'said'; readonly text: string; readonly edits: readonly AdvisorEdit[] }
  | { readonly kind: 'failed'; readonly message: string };

/**
 * The question as sent: the affection plan's picture and PDF ride beside its facts
 * on the sheet step, and neither is a figure a reader of the code needs, so they
 * never leave the page — and a long string is cut, as the server would cut it.
 */
const UNSENT = new Set(['pngBase64', 'attachment', 'sitePlan', 'onPage', 'content']);
const asSent = (key: string, value: unknown): unknown =>
  UNSENT.has(key) ? undefined : typeof value === 'string' && value.length > 2000 ? `${value.slice(0, 2000)}…` : value;

export function AdvisorBox({
  ask,
  edits: offersEdits = true,
}: {
  readonly ask: Omit<AdviseBody, 'locale' | 'editable'>;
  /** False where there is nothing of the reader's to change: the sheet as printed, the signatures. */
  readonly edits?: boolean;
}): JSX.Element | null {
  const scope = useContext(Scope);
  const { t, locale } = useLocale();
  // A refusal's box and a step's can share a page; one fixed id would label both with the first heading.
  const id = useId();
  const error = ask.step === 'refusal';
  /*
    The question this box is on: the step, its inputs, the page's language.
    Nothing is sent until the reader presses the button — every call is billed
    (16 Oct 2026: «قلل من استخدام Api كلود اجعله للمستخدم») — and a question
    asked once is answered from the server's cache after that. An answer stays
    on screen when the inputs change under it (an edit applied, a field typed),
    said to be about the inputs as they were, with the button to ask again.
  */
  const fields = offersEdits && scope ? scope.fields : null;
  const body = JSON.stringify({ ...ask, ...(fields ? { editable: fields } : {}) }, asSent);
  const question = `${locale}|${body}`;
  const [asked, setAsked] = useState<{ readonly question: string; readonly body: string; readonly n: number } | null>(null);
  const [answer, setAnswer] = useState<{ readonly question: string; readonly n: number; readonly state: State } | null>(null);
  const [applied, setApplied] = useState<{ readonly n: number; readonly fields: readonly string[]; readonly at: AdviseStudioStep } | null>(null);
  const ask_ = (): void => setAsked((a) => ({ question, body, n: (a?.n ?? 0) + 1 }));

  useEffect(() => {
    if (!scope?.enabled || !asked) return;
    let live = true;
    api
      .advise(scope.actor, { ...(JSON.parse(asked.body) as Omit<AdviseBody, 'locale'>), locale })
      .then((r) => live && setAnswer({ question: asked.question, n: asked.n, state: { kind: 'said', text: r.text, edits: r.edits ?? [] } }))
      .catch(
        (e: unknown) =>
          live &&
          setAnswer({
            question: asked.question,
            n: asked.n,
            state: { kind: 'failed', message: e instanceof ApiError && e.status === 429 ? t.advisor.busy : t.advisor.failed },
          }),
      );
    return () => {
      live = false;
    };
    // Sent once per press: `asked` changes only then. The page's language travels in the question it carries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked]);

  if (!scope?.enabled) return null;
  const asking = asked !== null && answer?.n !== asked.n;
  // An answer in another language is not shown: the reader switched, and asks again in theirs.
  const shown = !asking && answer && answer.question.startsWith(`${locale}|`) ? answer : null;
  const stale = shown !== null && shown.question !== question;
  const appliedHere = applied && shown && applied.n === shown.n ? applied : null;

  const applyEdits = (edits: readonly AdvisorEdit[]): void => {
    if (!shown || edits.length === 0) return;
    const at = scope.apply(edits);
    setApplied({ n: shown.n, fields: [...(appliedHere?.fields ?? []), ...edits.map((e) => e.field)], at });
  };

  return (
    <section className="grid gap-2 rounded-md border border-line bg-base p-3" data-advisor="" aria-labelledby={id} aria-busy={asking}>
      <h3 id={id} className="flex items-center gap-2 text-[12.5px] font-medium text-fg">
        <SparkMark className="text-accent" />
        {t.advisor.title}
      </h3>
      {asking ? (
        <p className="text-[12.5px] text-secondary" role="status">
          {t.advisor.asking}
        </p>
      ) : !shown ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12.5px] text-secondary">{error ? t.advisor.offerError : t.advisor.offer}</p>
          <Button onClick={ask_}>
            <SparkMark className="text-accent" />
            {error ? t.advisor.askError : t.advisor.ask}
          </Button>
        </div>
      ) : shown.state.kind === 'failed' ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12.5px] text-secondary">{shown.state.message}</p>
          <Button onClick={ask_}>
            <RotateCw aria-hidden="true" />
            {t.advisor.again}
          </Button>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-fg">{shown.state.text}</p>
          {fields ? (
            <Proposals
              edits={shown.state.edits}
              fields={fields}
              applied={appliedHere?.fields ?? []}
              onApply={applyEdits}
            />
          ) : null}
          {appliedHere ? (
            <div className="flex flex-wrap items-center gap-2" role="status">
              <p className="text-[12px] text-secondary">{t.advisor.appliedNote(t.studio.step[appliedHere.at])}</p>
              <Button onClick={() => scope.goTo(appliedHere.at)}>{t.advisor.goTo(t.studio.step[appliedHere.at])}</Button>
            </div>
          ) : null}
          {stale ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[12px] text-secondary">{t.advisor.stale}</p>
              <Button onClick={ask_}>
                <RotateCw aria-hidden="true" />
                {t.advisor.again}
              </Button>
            </div>
          ) : null}
        </>
      )}
      <p className="text-[11.5px] text-tertiary">{t.advisor.note}</p>
    </section>
  );
}

/**
 * Each proposal as the field, its value now, the value proposed, and the clause
 * it rests on — and an Apply button. Nothing is applied by looking at it.
 */
function Proposals({
  edits,
  fields,
  applied,
  onApply,
}: {
  readonly edits: readonly AdvisorEdit[];
  readonly fields: Readonly<Record<string, string>>;
  readonly applied: readonly string[];
  readonly onApply: (edits: readonly AdvisorEdit[]) => void;
}): JSX.Element | null {
  const { t } = useLocale();
  const isApplied = (e: AdvisorEdit): boolean => applied.includes(e.field);
  // A proposal the reader has since overtaken by typing the field is not offered over their answer.
  const open = edits.filter((e) => !isApplied(e) && acceptable(e, fields));
  const listed = edits.filter((e) => isApplied(e) || acceptable(e, fields));
  if (listed.length === 0) return null;
  return (
    <section className="grid gap-2 border-t border-line pt-2" aria-label={t.advisor.proposed}>
      <h4 className="text-[12px] font-medium text-fg">{t.advisor.proposed}</h4>
      <ul className="grid gap-2">
        {listed.map((e) => (
          <li key={e.field} className="grid gap-1 rounded-md border border-line bg-panel p-2.5">
            <span className="text-[12px] font-medium text-fg">{describeField(t, e.field)}</span>
            <span className="text-[12px] text-secondary">
              {/* Once applied, the value now IS the proposal; the arrow from it to itself would say nothing. */}
              {isApplied(e) ? null : (
                <>
                  <span className="figure">{describeValue(t, e.field, fields[e.field] ?? '')}</span>
                  {' → '}
                </>
              )}
              <span className="figure text-fg">{describeValue(t, e.field, e.value)}</span>
            </span>
            <span className="text-[11.5px] leading-relaxed text-secondary">
              <span className="figure">{e.clause}</span> · {e.why}
            </span>
            {isApplied(e) ? (
              <span className="flex items-center gap-1.5 text-[12px] text-secondary">
                <Check className="size-3.5 text-accent-strong" aria-hidden="true" />
                {t.advisor.applied}
              </span>
            ) : (
              <Button className="justify-self-start" onClick={() => onApply([e])}>
                {t.advisor.apply}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {open.length > 1 ? (
        <Button className="justify-self-start" onClick={() => onApply(open)}>
          {t.advisor.applyAll(open.length)}
        </Button>
      ) : null}
    </section>
  );
}
