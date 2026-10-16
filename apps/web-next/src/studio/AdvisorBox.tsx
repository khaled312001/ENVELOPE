import { RotateCw } from 'lucide-react';
import { createContext, type ReactNode, useContext, useEffect, useId, useState } from 'react';

import { type Actor, type AdviseBody, api, ApiError } from '@web/api/client.js';

import { useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { SparkMark } from '../ui/spark.js';

/*
  CLAUDE'S READING OF THE STEP, BESIDE THE FIGURES (Eng. Mohamed, 16 Oct 2026:
  Claude Opus 5.5 as the thinker on every step, going to the Dubai Building Code
  first). It asks only when the reader presses its button, since every call is
  billed, and the server keeps the answer, so asking a step again costs nothing.

  It is text and only text: no figure on the page reads it, and the label says
  so. Where the deployment has no key it is not shown at all, rather than shown
  as a feature that never answers.
*/

interface AdvisorScope {
  readonly actor: Actor;
  readonly enabled: boolean;
}

const Scope = createContext<AdvisorScope | null>(null);

/** Asks the server once whether the analysis is on, and lets every step below use it. */
export function AdvisorProvider({ actor, children }: { readonly actor: Actor; readonly children: ReactNode }): JSX.Element {
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
  return <Scope.Provider value={{ actor, enabled }}>{children}</Scope.Provider>;
}

type State =
  | { readonly kind: 'idle' }
  | { readonly kind: 'asking' }
  | { readonly kind: 'said'; readonly text: string }
  | { readonly kind: 'failed'; readonly message: string };

export function AdvisorBox({ ask }: { readonly ask: Omit<AdviseBody, 'locale'> }): JSX.Element | null {
  const scope = useContext(Scope);
  const { t, locale } = useLocale();
  // A refusal's box and a step's can share a page; one fixed id would label both with the first heading.
  const id = useId();
  const key = JSON.stringify(ask);
  /*
    The question this box is on: the step, and the page's language. Nothing is
    sent until the reader presses the button for THIS question — every call is
    billed (16 Oct 2026: «قلل من استخدام Api كلود اجعله للمستخدم») — and a step
    asked once is answered from the server's cache after that. A different step
    or language is a different question, so the box falls back to the button.
  */
  const question = `${locale}|${key}`;
  const [asked, setAsked] = useState<{ readonly question: string; readonly n: number } | null>(null);
  const [answer, setAnswer] = useState<{ readonly question: string; readonly state: State } | null>(null);
  const state: State = asked?.question !== question ? { kind: 'idle' } : answer?.question === question ? answer.state : { kind: 'asking' };
  const ask_ = (): void => setAsked((a) => ({ question, n: a?.question === question ? a.n + 1 : 1 }));

  useEffect(() => {
    if (!scope?.enabled || !asked || asked.question !== question) return;
    let live = true;
    setAnswer({ question, state: { kind: 'asking' } });
    api
      .advise(scope.actor, { ...(JSON.parse(key) as Omit<AdviseBody, 'locale'>), locale })
      .then((r) => live && setAnswer({ question, state: { kind: 'said', text: r.text } }))
      .catch(
        (e: unknown) =>
          live &&
          setAnswer({ question, state: { kind: 'failed', message: e instanceof ApiError && e.status === 429 ? t.advisor.busy : t.advisor.failed } }),
      );
    return () => {
      live = false;
    };
  }, [scope, asked, question, key, locale, t]);

  if (!scope?.enabled) return null;
  return (
    <section className="grid gap-2 rounded-md border border-line bg-base p-3" data-advisor="" aria-labelledby={id} aria-busy={state.kind === 'asking'}>
      <h3 id={id} className="flex items-center gap-2 text-[12.5px] font-medium text-fg">
        <SparkMark className="text-accent" />
        {t.advisor.title}
      </h3>
      {state.kind === 'idle' ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12.5px] text-secondary">{t.advisor.offer}</p>
          <Button onClick={ask_}>
            <SparkMark className="text-accent" />
            {t.advisor.ask}
          </Button>
        </div>
      ) : state.kind === 'asking' ? (
        <p className="text-[12.5px] text-secondary" role="status">
          {t.advisor.asking}
        </p>
      ) : state.kind === 'said' ? (
        <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-fg">{state.text}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12.5px] text-secondary">{state.message}</p>
          <Button onClick={ask_}>
            <RotateCw aria-hidden="true" />
            {t.advisor.again}
          </Button>
        </div>
      )}
      <p className="text-[11.5px] text-tertiary">{t.advisor.note}</p>
    </section>
  );
}
