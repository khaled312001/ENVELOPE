import { ChevronRight, Menu } from 'lucide-react';
import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router';

import { Account, LocaleSwitch, Logo, NavMarker, ThemeToggle } from '../components/Shell.js';
import { cn } from '../lib/cn.js';
import { useLocale } from '../lib/locale.js';
import { Link, NavLink } from '../lib/nav.js';
import { SITE_AR } from '../i18n/site.ar.js';
import { SITE_EN, type SiteDict } from '../i18n/site.en.js';
import { Button } from '../ui/button.js';
import { CONTACT, WhatsAppButton, whatsappHref } from './contact.js';
import { type PagePath, usePageMeta } from './meta.js';

/*
  THE PUBLIC SITE'S FRAME.

  One header, one footer, one page opening and one call to action, shared by
  every page outside the studio, so the site reads as one publication rather
  than a set of landing pages.

  It is plain on purpose (the owner's call, 18 Oct 2026: «شيل بصمه كلود والذكاء
  الاصطناعي من تصميم الموقع»). The frame had a gradient line under the header,
  glows and survey sheets behind every hero, a small tracked-out label and an
  icon on a gradient tile above every heading, a progress bar in three colours
  and a call to action in a violet gradient with glass tiles floating over it.
  Each is a mark of a generated page and none said anything. What is left: the
  ink, one blue for what can be pressed, and the drawings themselves, which are
  the only pictures this product has a right to show.
*/

export function useSite(): SiteDict {
  return useLocale().locale === 'ar' ? SITE_AR : SITE_EN;
}

// The phone menu's sheet arrives on the first tap, not with the home page.
const Drawer = lazy(() => import('../ui/drawer.js').then((m) => ({ default: m.Drawer })));

const NAV = [
  ['/product', 'product'],
  ['/parking', 'parking'],
  ['/method', 'method'],
  ['/exports', 'exports'],
  ['/faq', 'faq'],
] as const;

/** The width every band of the site sets its content to. */
const FRAME = 'mx-auto max-w-[1240px] px-4 sm:px-6';

function SiteHeader(): JSX.Element {
  const s = useSite();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  // Mounted from the first open on, so it can animate closed.
  const [menuLoaded, setMenuLoaded] = useState(false);
  const { pathname } = useLocation();
  // A followed link closes the menu.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  const link =
    'group/nav relative rounded-md px-3 py-1.5 text-[13.5px] font-medium text-secondary transition-colors hover:text-fg aria-[current=page]:text-fg';
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-base">
      <div className={cn(FRAME, 'flex h-14 items-center gap-2')}>
        <Link to="/" className="me-3 rounded-md p-1" aria-label={t.shell.home}>
          <Logo />
        </Link>
        <nav aria-label={s.nav.label} className="hidden items-center gap-0.5 lg:flex">
          {NAV.map(([to, key]) => (
            <NavLink key={to} to={to} className={link}>
              {s.nav[key]}
              <NavMarker />
            </NavLink>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1.5">
          <LocaleSwitch />
          <ThemeToggle />
          <span className="hidden sm:inline-flex">
            <Account />
          </span>
          <Button asChild variant="primary" size="sm" className="hidden md:inline-flex">
            <Link to="/studio">{s.nav.open}</Link>
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={s.nav.menu} aria-expanded={open}
            onClick={() => {
              setMenuLoaded(true);
              setOpen(true);
            }}
          >
            <Menu aria-hidden="true" />
          </Button>
        </div>
      </div>
      {menuLoaded ? (
        <Suspense fallback={null}>
          <Drawer open={open} onOpenChange={setOpen} title={<Logo />} closeLabel={s.nav.close}>
            <nav aria-label={s.nav.label} className="grid gap-1 p-4">
              {NAV.map(([to, key]) => (
                <NavLink
                  key={to}
                  to={to}
                  className="rounded-md px-3 py-3 text-[16px] font-medium text-fg transition-colors hover:bg-hover aria-[current=page]:bg-raised"
                >
                  {s.nav[key]}
                </NavLink>
              ))}
              <div className="mt-4 grid gap-3 border-t border-line pt-4">
                <Button asChild variant="primary" size="lg">
                  <Link to="/studio">{s.nav.open}</Link>
                </Button>
                <div className="flex justify-center">
                  <Account />
                </div>
              </div>
            </nav>
          </Drawer>
        </Suspense>
      ) : null}
    </header>
  );
}

function SiteFooter(): JSX.Element {
  const s = useSite();
  const cols: readonly { title: string; links: readonly (readonly [string, string])[] }[] = [
    {
      title: s.footer.product,
      links: [
        ['/product', s.footer.overview],
        ['/parking', s.footer.parking],
        ['/exports', s.footer.exports],
        ['/studio?example=1', s.footer.example],
      ],
    },
    {
      title: s.footer.trust,
      links: [
        ['/method', s.footer.method],
        ['/limits', s.footer.limits],
        ['/faq', s.footer.faq],
      ],
    },
    {
      title: s.footer.studio,
      links: [
        ['/studio', s.footer.start],
        ['/studies', s.footer.studies],
        ['/enter', s.footer.enter],
      ],
    },
  ];
  const heading = 'text-[13px] font-semibold text-fg';
  const quiet = 'text-[13.5px] text-secondary transition-colors hover:text-fg';
  return (
    <footer className="bg-panel">
      <div className={cn(FRAME, 'grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]')}>
        <div className="grid content-start gap-4">
          <Logo />
          <p className="max-w-sm text-[13.5px] leading-relaxed text-secondary">{s.footer.blurb}</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title} className="grid content-start gap-3">
            <h2 className={heading}>{c.title}</h2>
            <ul className="grid gap-2">
              {c.links.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className={quiet}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="grid content-start gap-3">
          <h2 className={heading}>{s.footer.contact}</h2>
          <ul className="grid gap-3">
            <li className="grid">
              <span className="text-[12px] text-tertiary">{s.footer.whatsapp}</span>
              {/* A phone number reads left to right in either language. */}
              <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" dir="ltr" className={cn(quiet, 'figure text-start')}>
                {CONTACT.phone}
              </a>
            </li>
            <li className="grid">
              <span className="text-[12px] text-tertiary">{s.footer.email}</span>
              <a href={`mailto:${CONTACT.email}`} dir="ltr" className={cn(quiet, 'text-start')}>
                {CONTACT.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className={cn(FRAME, 'flex flex-wrap items-center justify-between gap-3 py-4 text-[12px] text-secondary')}>
          <span>{s.footer.rights(String(new Date().getFullYear()))}</span>
          <button type="button" onClick={() => window.scrollTo({ top: 0 })} className="rounded-md px-2 py-1.5 font-medium text-secondary transition-colors hover:text-fg">
            {s.footer.top}
          </button>
        </div>
      </div>
    </footer>
  );
}

/** Every public page: skip link, header, the page, the call, the footer. */
export function SitePage({ path, children, cta = true }: { readonly path: PagePath; readonly children: ReactNode; readonly cta?: boolean }): JSX.Element {
  const s = useSite();
  usePageMeta(path);
  const { pathname } = useLocation();
  // A new page starts at its top, as a page load would.
  // A block body: in current browsers `scrollTo` returns a promise, and an effect that returns one breaks unmounting.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="flex min-h-full flex-col bg-base">
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-inverse px-3 py-2 text-on-inverse focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {s.nav.skip}
      </a>
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
        {cta ? <CtaBand /> : null}
      </main>
      <SiteFooter />
      <WhatsAppButton />
    </div>
  );
}

/** A page's opening: breadcrumb, title, lede, and whatever the page sets beside it. */
export function PageHero({
  title,
  lede,
  crumb,
  aside,
}: {
  readonly title: string;
  readonly lede: string;
  /** The page's own name in the breadcrumb; omitted on the home page. */
  readonly crumb?: string;
  readonly aside?: ReactNode;
}): JSX.Element {
  const s = useSite();
  return (
    <section>
      <div className={cn(FRAME, 'grid gap-10 pt-10 pb-16 lg:pt-14', aside && 'lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center')}>
        <div className="grid max-w-3xl content-start gap-5">
          {crumb ? (
            <nav aria-label={s.crumbs.label}>
              <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-secondary">
                <li>
                  <Link to="/" className="hover:text-fg">
                    {s.crumbs.home}
                  </Link>
                </li>
                <li aria-hidden="true">
                  <ChevronRight className="size-3.5 rtl:-scale-x-100" />
                </li>
                <li aria-current="page" className="text-fg">
                  {crumb}
                </li>
              </ol>
            </nav>
          ) : null}
          <h1 className="heading-display text-[34px] font-semibold tracking-[-0.025em] text-fg sm:text-[46px]">{title}</h1>
          <p className="text-[17px] leading-relaxed text-fg/80">{lede}</p>
        </div>
        {aside ? <div className="relative">{aside}</div> : null}
      </div>
    </section>
  );
}

export function SectionHead({ title, lede, className }: { readonly title: string; readonly lede?: string; readonly className?: string }): JSX.Element {
  return (
    <div className={cn('mb-10 grid max-w-2xl gap-3', className)}>
      <h2 className="heading-section text-[26px] font-semibold tracking-[-0.02em] text-fg sm:text-[32px]">{title}</h2>
      {lede ? <p className="text-[16px] leading-relaxed text-secondary">{lede}</p> : null}
    </div>
  );
}

/** A band of the page; `tinted` steps the surface so long pages keep their rhythm, with no line between. */
export function Band({ children, tinted = false, className }: { readonly children: ReactNode; readonly tinted?: boolean; readonly className?: string }): JSX.Element {
  return (
    <section className={cn(tinted && 'bg-panel', className)}>
      <div className={cn(FRAME, 'py-20')}>{children}</div>
    </section>
  );
}

function CtaBand(): JSX.Element {
  const s = useSite();
  return (
    <section className={cn(FRAME, 'py-20')}>
      <div className="grid gap-6 rounded-lg bg-inverse p-8 sm:p-12 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="grid max-w-2xl gap-3">
          <h2 className="heading-section text-[26px] font-semibold tracking-[-0.02em] text-on-inverse sm:text-[32px]">{s.cta.title}</h2>
          <p className="text-[16px] leading-relaxed text-on-inverse/85">{s.cta.body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="border-transparent bg-base text-fg hover:bg-raised">
            <Link to="/studio?example=1">{s.cta.primary}</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="border border-on-inverse/40 text-on-inverse hover:bg-on-inverse/10 hover:text-on-inverse">
            <Link to="/studio">{s.cta.secondary}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
