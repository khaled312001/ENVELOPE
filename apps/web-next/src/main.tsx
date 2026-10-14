import './styles.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router';

import { TopBar } from './components/Shell.js';
import { IdentityProvider, useIdentity } from './lib/identity.js';
import { applyLocale, LocaleProvider, useLocale } from './lib/locale.js';
import { Enter } from './screens/Enter.js';
import { Landing } from './screens/Landing.js';
import { Button } from './ui/button.js';
import { EmptyState, Spinner } from './ui/primitives.js';

// The studio carries the drawing set and the engine views; the landing page should not wait for them.
const Studio = lazy(() => import('./screens/Studio.js').then((m) => ({ default: m.Studio })));
const Studies = lazy(() => import('./screens/Studies.js').then((m) => ({ default: m.Studies })));
import { TooltipProvider } from './ui/radix.js';

// Before React renders anything: the page's direction, so an Arabic reload lays out right to left from its first paint.
try {
  applyLocale(localStorage.getItem('envelope.locale') === 'ar' ? 'ar' : 'en');
} catch {
  /* left to right, English */
}

const queries = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/** A screen that files work needs somebody to file it under; without one, ask, then come back. */
function Gated({ children }: { readonly children: (actor: NonNullable<ReturnType<typeof useIdentity>['actor']>) => JSX.Element }): JSX.Element {
  const { actor } = useIdentity();
  const location = useLocation();
  if (!actor) return <Navigate to={`/enter?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return (
    <Suspense
      fallback={
        <p className="grid h-dvh place-items-center text-secondary">
          <Spinner />
        </p>
      }
    >
      {children(actor)}
    </Suspense>
  );
}

function NotFound(): JSX.Element {
  const { t } = useLocale();
  return (
    <div className="flex min-h-full flex-col bg-base">
      <TopBar />
      <main className="canvas-grid grid flex-1 place-items-center">
        <EmptyState
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

function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/enter" element={<Enter />} />
      <Route path="/studies" element={<Gated>{(actor) => <Studies actor={actor} />}</Gated>} />
      <Route path="/studio" element={<Gated>{(actor) => <Studio actor={actor} />}</Gated>} />
      <Route path="/studio/:runId" element={<Gated>{(actor) => <Studio actor={actor} />}</Gated>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queries}>
      <LocaleProvider>
        <IdentityProvider>
          <MotionConfig reducedMotion="user">
            <TooltipProvider delayDuration={300}>
              <BrowserRouter basename="/next">
                <App />
              </BrowserRouter>
            </TooltipProvider>
          </MotionConfig>
        </IdentityProvider>
      </LocaleProvider>
    </QueryClientProvider>
  </StrictMode>,
);
