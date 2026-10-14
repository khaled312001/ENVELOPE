/**
 * A screen loaded the first time it is needed, and not before.
 *
 * ---------------------------------------------------------------------------
 * WHY NOT `React.lazy`.
 *
 * Every screen used to be imported by `pages.tsx`, so a visitor opening the
 * landing page downloaded the engine, the drawing set, the settings page and
 * both languages of all of them: a 1,049 KB entry chunk for a page that shows
 * one worked example. Splitting is the fix and `React.lazy` is the usual tool,
 * but it has one property this codebase cannot accept: a lazy component can
 * only be rendered asynchronously. The page tests render through `PAGES` with
 * `renderToStaticMarkup`, which is synchronous, and they are the tests that
 * hold every route to the site's prohibitions. A loader that made them render
 * a fallback would make them pass on an empty page.
 *
 * So this is `React.lazy` with a door left open: `preload()` resolves the
 * module ahead of time, after which the component renders synchronously like
 * any other. The browser never calls it and gets the split; a test calls
 * `preloadPages()` in `beforeAll` and gets the page.
 *
 * In the browser the first render waits through `use()` on a promise held in
 * this closure — one promise per screen for the life of the document, which is
 * what `use()` requires of the thing it is handed.
 *
 * `use()` IS CALLED ON EVERY RENDER, never only while loading. The first
 * version skipped it once the module had arrived, and React 19 refuses that —
 * a hook that suspended on one render and was absent on the next — with an
 * error on every lazy page; `pnpm smoke` caught it on its first walk. So the
 * promise is marked fulfilled the moment it settles (`status` and `value`, the
 * convention React reads off any thenable it is handed), and `use()` on a
 * fulfilled promise returns at once — in the browser after the first load, and
 * in a test after `preload()`, with no suspension in either.
 */

import { use } from 'react';

type Component<P> = (props: P) => JSX.Element;

export interface LazyPage<P extends object> {
  (props: P): JSX.Element;
  /** Fetch and evaluate the module now. Idempotent; the same promise every call. */
  readonly preload: () => Promise<void>;
}

export function lazyPage<P extends object>(load: () => Promise<Component<P>>): LazyPage<P> {
  let pending: (Promise<Component<P>> & { status?: string; value?: Component<P> }) | null = null;
  const loaded = (): Promise<Component<P>> => {
    if (pending === null) {
      const promise: Promise<Component<P>> & { status?: string; value?: Component<P> } = load().then(
        (component) => {
          promise.status = 'fulfilled';
          promise.value = component;
          return component;
        },
      );
      pending = promise;
    }
    return pending;
  };

  function Page(props: P): JSX.Element {
    const Loaded = use(loaded());
    return <Loaded {...props} />;
  }
  return Object.assign(Page, { preload: () => loaded().then(() => undefined) });
}
