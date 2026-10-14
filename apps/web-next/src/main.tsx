import './styles.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';

import { TopBar } from './components/Shell.js';
import { IdentityProvider, useIdentity } from './lib/identity.js';
import { applyLocale, bareLocation, localeOf, localised, LocaleProvider, remembered, useLocale } from './lib/locale.js';
import { Link, Navigate } from './lib/nav.js';
import { applyTheme, ThemeProvider } from './lib/theme.js';
import { Landing } from './screens/Landing.js';
import { Art } from './site/art.js';
import { usePageMeta } from './site/meta.js';
import { Button } from './ui/button.js';
import { EmptyState, Spinner } from './ui/primitives.js';
import { TooltipProvider } from './ui/radix.js';

// The studio carries the drawing set and the engine views; the public pages should not wait for them.
const Studio = lazy(() => import('./screens/Studio.js').then((m) => ({ default: m.Studio })));
const Studies = lazy(() => import('./screens/Studies.js').then((m) => ({ default: m.Studies })));
const Product = lazy(() => import('./screens/site/Product.js').then((m) => ({ default: m.Product })));
const Parking = lazy(() => import('./screens/site/Parking.js').then((m) => ({ default: m.Parking })));
const Method = lazy(() => import('./screens/site/Method.js').then((m) => ({ default: m.Method })));
const Exports = lazy(() => import('./screens/site/Exports.js').then((m) => ({ default: m.Exports })));
const Limits = lazy(() => import('./screens/site/Limits.js').then((m) => ({ default: m.Limits })));
const Faq = lazy(() => import('./screens/site/Faq.js').then((m) => ({ default: m.Faq })));
// The home page is the one screen in the entry chunk; sign-in waits until somebody signs in.
const Enter = lazy(() => import('./screens/Enter.js').then((m) => ({ default: m.Enter })));

// The site is served at the root. Kept as a constant so the arithmetic below reads the same if it ever moves again.
const BASE = '';

/*
  Before React renders anything: the page's direction and its theme, so the
  first frame is already right. The language is the address's; a reader who
  last chose Arabic and arrives at an English address is sent to the Arabic one
  — once, on arrival, and never a crawler, which keeps no storage.
*/
{
  const path = window.location.pathname.slice(BASE.length) || '/';
  if (localeOf(path) === 'en' && remembered() === 'ar') {
    window.history.replaceState(null, '', BASE + localised(path, 'ar') + window.location.search + window.location.hash);
  }
  applyLocale(localeOf(window.location.pathname.slice(BASE.length) || '/'));
}
applyTheme();

const queries = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function Loading(): JSX.Element {
  return (
    <p className="grid h-dvh place-items-center text-secondary">
      <Spinner />
    </p>
  );
}

/** A working screen: kept out of search results, and named for the tab. */
function Working({ title, children }: { readonly title: string; readonly children: JSX.Element }): JSX.Element {
  usePageMeta(null, title);
  return children;
}

/** A screen that files work needs somebody to file it under; without one, ask, then come back. */
function Gated({ children }: { readonly children: (actor: NonNullable<ReturnType<typeof useIdentity>['actor']>) => JSX.Element }): JSX.Element {
  const { actor } = useIdentity();
  const location = useLocation();
  if (!actor) return <Navigate to={`/enter?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <Suspense fallback={<Loading />}>{children(actor)}</Suspense>;
}

function NotFound(): JSX.Element {
  const { t } = useLocale();
  usePageMeta(null, t.notFound.title);
  return (
    <div className="flex min-h-full flex-col bg-base">
      <TopBar />
      <main className="canvas-grid grid flex-1 place-items-center">
        <EmptyState
          art={<Art name="not-found" alt="" eager className="w-72 max-w-full" />}
          title={t.notFound.title}
          body={t.notFound.body}
          action={
            <Button asChild variant="primary">
              <Link to="/">{t.notFound.home}</Link>
            </Button>
          }
        />
      </main>
    </div>
  );
}

/*
  ONE ROUTE TREE FOR BOTH LANGUAGES. The tree matches the address without its
  `/ar`, so `/ar/studio` and `/studio` are the same element — switching
  language re-renders the screen instead of remounting it.
*/
function App(): JSX.Element {
  const location = useLocation();
  const { t } = useLocale();
  return (
    <Suspense fallback={<Loading />}>
      <Routes location={bareLocation(location)}>
        <Route path="/" element={<Landing />} />
        <Route path="/product" element={<Product />} />
        <Route path="/parking" element={<Parking />} />
        <Route path="/method" element={<Method />} />
        <Route path="/exports" element={<Exports />} />
        <Route path="/limits" element={<Limits />} />
        <Route path="/faq" element={<Faq />} />
        <Route
          path="/enter"
          element={
            <Working title={t.shell.enter}>
              <Enter />
            </Working>
          }
        />
        <Route path="/studies" element={<Working title={t.shell.studies}><Gated>{(actor) => <Studies actor={actor} />}</Gated></Working>} />
        <Route path="/studio" element={<Working title={t.shell.newStudy}><Gated>{(actor) => <Studio actor={actor} />}</Gated></Working>} />
        <Route path="/studio/:runId" element={<Working title={t.shell.studies}><Gated>{(actor) => <Studio actor={actor} />}</Gated></Working>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queries}>
      <BrowserRouter basename={BASE}>
        <ThemeProvider>
          <LocaleProvider>
            <IdentityProvider>
              <MotionConfig reducedMotion="user">
                <TooltipProvider delayDuration={300}>
                  <App />
                </TooltipProvider>
              </MotionConfig>
            </IdentityProvider>
          </LocaleProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
