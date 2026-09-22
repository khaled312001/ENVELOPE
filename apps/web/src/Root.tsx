/**
 * The application shell: one route record, one identity, one theme, one engine.
 *
 * Every public page is reachable without signing in — they are the pages that
 * explain what the product refuses to claim, and putting a name prompt in front of
 * that would be absurd. Only `/app` asks for a name, because every `USER_SET` value
 * carries the name of whoever entered it and there is no anonymous mode.
 */

import { useCallback, useEffect, useState } from 'react';

import { EngineApp, Header, useTheme } from './App.js';
import { LanguageToggle, useLocale, useT } from './i18n/locale.js';
import { useSession } from './session.js';
import type { Actor } from './api/client.js';
import { SiteChrome, UntranslatedNotice } from './components/SiteChrome.js';
import { NOT_FOUND_PAGE, PAGES } from './pages.js';
import { NOT_FOUND, useRouter, type Href } from './router.js';

/**
 * THE PAGE CONTRACT. Every page component takes exactly this and nothing else.
 *
 * It is the single thing that keeps six independently written pages from
 * colliding: a page cannot reach for a router, an identity or a theme of its own,
 * so there is no second `useTheme` to desynchronise and no second place a route can
 * be decided. A page that needs something not in here needs a conversation, not a
 * prop.
 */
export interface PageProps {
  readonly navigate: (to: Href) => void;
  readonly actor: Actor | null;
  readonly setActor: (a: Actor | null) => void;
  /** The live query string. See `useRouter` for why it is state and not a read. */
  readonly search: string;
}

export type PageComponent = (p: PageProps) => JSX.Element;

export default function Root(): JSX.Element {
  const { route, search, navigate } = useRouter();

  /**
   * THE ONLY `useTheme()` IN THE APPLICATION.
   *
   * There were three, and they desynchronised exactly as three copies of one fact
   * do: toggling on `/dashboard` left the engine's toggle holding the old value, so
   * its first click on `/app` set the theme to what it already was and appeared to
   * do nothing. One owner, passed down.
   */
  const [theme, toggleTheme] = useTheme();
  const { state: sessionState, account: session } = useSession();

  const [actor, setActorState] = useState<Actor | null>(() => {
    try {
      const saved = localStorage.getItem('envelope.actor');
      return saved ? (JSON.parse(saved) as Actor) : null;
    } catch {
      // A blocked or corrupt store is a reason to ask again, not to fail to render.
      return null;
    }
  });

  /**
   * Set or clear the identity, and mirror it to storage in the same call.
   *
   * One function, so "signed in" and "remembered" cannot disagree. They did: the
   * engine wrote to `localStorage` and set its own state while this component's
   * copy stayed null, so the status page asked for a name the browser already had.
   *
   * The key stays `envelope.actor`. TOP.ai is the public name; ENVELOPE is the
   * engine, and renaming a storage key would sign every returning reader out for a
   * change that is a wordmark rather than a migration.
   */
  const setActor = useCallback((next: Actor | null) => {
    try {
      if (next) localStorage.setItem('envelope.actor', JSON.stringify(next));
      else localStorage.removeItem('envelope.actor');
    } catch {
      /* the session still works, it just will not be remembered */
    }
    setActorState(next);
  }, []);

  /**
   * A SIGNED-IN READER IS ALREADY IDENTIFIED, AND ASKING AGAIN CONTRADICTS THE
   * SERVER.
   *
   * `resolveActor` on the API prefers a SESSION over the `X-Actor-*` headers, and
   * says why: a session is proof and a header is an assertion, so the proof wins.
   * Which means that for a signed-in reader the name typed into the antechamber was
   * already being ignored on every request — the client was asking for a fact the
   * server had decided not to listen to. Two identities for one person, and the one
   * the reader typed was the one that did not count.
   *
   * It also broke a feature outright: the draft form never rendered for a returning
   * signed-in reader, because `/app` shows the antechamber until an actor exists, so
   * "what you typed is still here" could not be shown to the only people it is kept
   * for. Found by driving it, not by reading it.
   *
   * IT ADOPTS AND NEVER OVERRIDES. A reader who signed in and then deliberately
   * entered a different name for a run keeps that name: the effect only fires when
   * there is no actor at all. And it does not run on sign-OUT — clearing the actor
   * there would discard a name somebody typed without an account, which is a
   * supported way to use this product.
   */
  useEffect(() => {
    if (sessionState !== 'signed-in' || !session || actor !== null) return;
    setActor({
      id: session.accountId,
      name: session.name,
      ...(session.licence ? { licence: session.licence } : {}),
    });
  }, [sessionState, session, actor, setActor]);

  /**
   * THE ENGINE LATCH.
   *
   * Neither obvious answer is right. Keeping the old early return for `/` unmounts
   * `EngineApp` on the first click home, which throws away the plot, the run and
   * the acknowledged gates — and the site promises, in words, that a reader can
   * re-read the claim statement mid-run without losing the run. Deleting the early
   * return makes every public page mount the engine and build a WebGL scene nobody
   * asked for, on the ninety-second first impression.
   *
   * So: false until the first navigation to `/app`, true forever after. Before that
   * first visit there is no run to lose and the public pages carry no engine; after
   * it, the hidden div renders on every route and the run survives every public
   * navigation, which is the case the promise was made for.
   */
  const [engineMounted, setEngineMounted] = useState(false);
  useEffect(() => {
    if (route === '/app') setEngineMounted(true);
  }, [route]);

  const t = useT();
  const { locale } = useLocale();
  const spec = route === NOT_FOUND ? NOT_FOUND_PAGE : PAGES[route];
  const engineIsEnglish = locale === 'ar' && PAGES['/app'].arabic !== 'translated';

  /**
   * ONE title effect, from the route record.
   *
   * Every route used to report "ENVELOPE — development capacity", which is wrong in
   * a tab strip and wrong in a bookmark.
   *
   * IT FOLLOWS THE LOCALE, and that is not decoration: the tab strip and the
   * bookmark are the two places a reader meets this site when it is not on screen,
   * and an Arabic reader with eight tabs open would have every one of them in a
   * language they switched away from. The route record's English title stays the
   * fallback for a route the dictionary has not reached.
   */
  const title =
    route === NOT_FOUND ? t.notFound.title : (t.routes[route]?.title ?? spec.title);
  useEffect(() => {
    document.title = title;
  }, [title]);

  const pageProps: PageProps = { navigate, actor, setActor, search };

  // `/app` is the one route behind the name prompt, and the antechamber renders
  // INSIDE the chrome rather than replacing the page: a screen with no nav and no
  // colophon is a dead end, and this is the first screen behind every public CTA.
  const showEngine = route === '/app' && actor !== null;

  const themeToggle = (
    <button
      type="button"
      className="button button--sm"
      onClick={toggleTheme}
      aria-pressed={theme === 'dark'}
    >
      <span aria-hidden="true">{theme === 'light' ? '◐' : '◑'}</span>
      {/*
        THE WHOLE ACCESSIBLE NAME OF THIS CONTROL, and therefore a string that has
        to come from the dictionary. The glyph is `aria-hidden`, so a reader who
        cannot see it hears only this — and while it was typed here it was heard in
        English on the Arabic page, one button away from a language switch that
        announces itself correctly.
      */}
      <span className="sr-only">
        {theme === 'light' ? t.themeToggle.toDark : t.themeToggle.toLight}
      </span>
    </button>
  );

  /*
    THE ENGINE RENDERS INSIDE THE CHROME, not instead of it.

    It used to be a separate document: its own header, its own nav, its own footer,
    and no skip link at all. So a reader who clicked "Run a plot" left the site and
    entered a different product, and could not re-read the claim statement without
    losing the run. The site nav is present on every step now, which is the promise
    the latch below exists to make true.

    `hidden` rather than a conditional render, so the run survives a route change. It
    is cheap: the engine holds one run and nothing in it polls.
  */
  return (
    <SiteChrome
      route={route}
      navigate={navigate}
      tool={
        <>
          <LanguageToggle />
          {themeToggle}
        </>
      }
      /*
        RENDERED ONLY WHEN THERE IS SOMETHING IN IT. `Header` shows the actor badge
        and the "Change" button, and both are gated on `actor`; with the theme
        toggle moved into the nav, a public page's header row was empty markup
        painting an empty band across the top of every page.
      */
      {...(actor
        ? {
            aside: (
              <Header
                actor={actor}
                run={null}
                navigate={navigate}
                onSignOut={() => setActor(null)}
              />
            ),
          }
        : {})}
    >
      {engineMounted ? (
        /*
          WHILE `/app` WAS `partial`, THE ENGINE WAS WHERE ITS ENGLISH BEGAN, so this
          subtree — and only this one — was marked as the English it contained when
          the page was Arabic, with the notice here rather than in `SiteChrome`
          because only this component knows where the boundary is.

          It reads the route record rather than assuming either answer. The ten
          steps are translated now and the record says so; hard-coding "English"
          here would have gone on wrapping an Arabic engine in `lang="en"` — every
          Arabic sentence read aloud in an English voice — for as long as nobody
          looked, which is the same drift the record exists to end.
        */
        <div
          hidden={!showEngine}
          {...(engineIsEnglish ? { dir: 'ltr' as const, lang: 'en' } : {})}
        >
          {engineIsEnglish ? <UntranslatedNotice /> : null}
          <EngineApp navigate={navigate} actor={actor} setActor={setActor} search={search} />
        </div>
      ) : null}
      {showEngine ? null : <spec.component {...pageProps} />}
    </SiteChrome>
  );
}
