import { ArrowRight, ChevronRight, Menu } from 'lucide-react';
import { useReducedMotion, motion } from 'motion/react';
import { type ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router';

import { Account, LocaleSwitch, Logo, RegulatoryStamp, ThemeToggle } from '../components/Shell.js';
import { EngineText, useLocale } from '../lib/locale.js';
import { Link, NavLink } from '../lib/nav.js';
import { SITE_AR } from '../i18n/site.ar.js';
import { SITE_EN, type SiteDict } from '../i18n/site.en.js';
import { Button } from '../ui/button.js';
import { arrive, Item, ScrollProgress, Stagger } from '../ui/motion.js';
import { Drawer } from '../ui/radix.js';
import { Art } from './art.js';
import { type PagePath, usePageMeta } from './meta.js';

/*
  THE PUBLIC SITE'S FRAME.

  One header, one footer, one hero shape and one call to action, shared by every
  page outside the studio, so the site reads as one publication rather than a
  set of landing pages. The regulatory stamp is in the header on wide screens
  and in the footer on every screen: no page of this site is out of its sight.
*/

export function useSite(): SiteDict {
  return useLocale().locale === 'ar' ? SITE_AR : SITE_EN;
}

const NAV = [
  ['/product', 'product'],
  ['/parking', 'parking'],
  ['/method', 'method'],
  ['/exports', 'exports'],
  ['/faq', 'faq'],
] as const;

function SiteHeader(): JSX.Element {
  const s = useSite();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  // A followed link closes the menu.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  const link =
    'rounded-md px-3 py-1.5 text-[13.5px] font-medium text-secondary transition-colors hover:bg-hover hover:text-fg aria-[current=page]:text-fg aria-[current=page]:bg-raised';
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-2 px-4 sm:px-6">
        <Link to="/" className="me-3 rounded-md p-1" aria-label={t.shell.home}>
          <Logo />
        </Link>
        <nav aria-label={s.nav.label} className="hidden items-center gap-0.5 lg:flex">
          {NAV.map(([to, key]) => (
            <NavLink key={to} to={to} className={link}>
              {s.nav[key]}
            </NavLink>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1.5">
          <RegulatoryStamp className="hidden xl:inline-flex" />
          <LocaleSwitch />
          <ThemeToggle />
          <span className="hidden sm:inline-flex">
            <Account />
          </span>
          <Button asChild variant="brand" size="sm" className="hidden md:inline-flex">
            <Link to="/studio">{s.nav.open}</Link>
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={s.nav.menu} aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu aria-hidden="true" />
          </Button>
        </div>
      </div>
      <Drawer open={open} onOpenChange={setOpen} title={<Logo />} closeLabel={s.nav.close}>
        <nav aria-label={s.nav.label} className="grid gap-1 p-4">
          {NAV.map(([to, key]) => (
            <NavLink key={to} to={to} className="flex items-center justify-between rounded-md px-3 py-3 text-[15px] font-medium text-fg hover:bg-hover aria-[current=page]:bg-raised">
              {s.nav[key]}
              <ChevronRight className="size-4 text-tertiary rtl:-scale-x-100" aria-hidden="true" />
            </NavLink>
          ))}
          <div className="mt-4 grid gap-2 border-t border-line pt-4">
            <Button asChild variant="brand" size="lg">
              <Link to="/studio">{s.nav.open}</Link>
            </Button>
            <div className="flex justify-center">
              <Account />
            </div>
            <RegulatoryStamp className="mt-2 justify-self-center" />
          </div>
        </nav>
      </Drawer>
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
  return (
    <footer className="border-t border-line bg-panel">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="grid content-start gap-4">
          <Logo />
          <p className="max-w-sm text-[13.5px] leading-relaxed text-secondary">{s.footer.blurb}</p>
          <RegulatoryStamp className="justify-self-start" />
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title} className="grid content-start gap-3">
            <h2 className="text-[12px] font-semibold tracking-[0.08em] text-fg uppercase">{c.title}</h2>
            <ul className="grid gap-2">
              {c.links.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-[13.5px] text-secondary transition-colors hover:text-fg">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-[12px] text-secondary sm:px-6">
          <span>{s.footer.rights(String(new Date().getFullYear()))}</span>
          <span className="flex flex-wrap items-center gap-4">
            <a href="/" className="hover:text-fg">
              {s.footer.classic}
            </a>
            <EngineText className="not-assessed">REGULATORY VALIDITY: NOT ASSESSED</EngineText>
          </span>
        </div>
      </div>
    </footer>
  );
}

/** Every public page: progress bar, skip link, header, the page, the call, the footer. */
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
      <ScrollProgress />
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
        {cta ? <CtaBand /> : null}
      </main>
      <SiteFooter />
    </div>
  );
}

/** A page's opening: breadcrumb, eyebrow, title, lede, and whatever the page sets beside it. */
export function PageHero({
  eyebrow,
  title,
  lede,
  crumb,
  aside,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede: string;
  /** The page's own name in the breadcrumb; omitted on the home page. */
  readonly crumb?: string;
  readonly aside?: ReactNode;
}): JSX.Element {
  const s = useSite();
  return (
    <section className="relative overflow-hidden border-b border-line">
      <Backdrop />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="aurora -top-40 end-[10%] size-[460px] bg-accent" />
        <div className="aurora -top-20 end-[-6%] size-[340px] bg-brand-alt [animation-delay:-8s]" />
      </div>
      <div className={`relative mx-auto grid max-w-[1320px] gap-10 px-4 pt-10 pb-14 sm:px-6 lg:pt-14 ${aside ? 'lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center' : ''}`}>
        <Stagger onMount gap={0.08} className="grid max-w-3xl content-start gap-5">
          {crumb ? (
            <Item variants={arrive}>
              <nav aria-label={s.crumbs.label}>
                <ol className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-secondary">
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
            </Item>
          ) : null}
          <Item variants={arrive}>
            <p className="figure text-[11.5px] tracking-[0.14em] text-accent uppercase">{eyebrow}</p>
          </Item>
          <Item variants={arrive}>
            <h1 className="text-[36px] leading-[1.08] font-light tracking-[-0.03em] text-fg sm:text-[50px]">{title}</h1>
          </Item>
          <Item variants={arrive}>
            <p className="text-[16.5px] leading-relaxed text-secondary">{lede}</p>
          </Item>
        </Stagger>
        {aside ? <div className="relative">{aside}</div> : null}
      </div>
    </section>
  );
}

/** Survey sheets laid on one table, faded out toward the text. Decoration: it says nothing. */
export function Backdrop({ className }: { readonly className?: string }): JSX.Element {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_20%,black,transparent_75%)] ${className ?? ''}`}>
      <Art name="home-backdrop" alt="" eager className="size-full max-w-none object-cover opacity-80 rtl:-scale-x-100" />
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lede,
  className,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede?: string;
  readonly className?: string;
}): JSX.Element {
  return (
    <Stagger className={`mb-10 grid max-w-2xl gap-3 ${className ?? ''}`}>
      <Item>
        <p className="figure text-[11.5px] tracking-[0.14em] text-accent uppercase">{eyebrow}</p>
      </Item>
      <Item>
        <h2 className="text-[28px] leading-tight font-light tracking-[-0.02em] text-fg sm:text-[36px]">{title}</h2>
      </Item>
      {lede ? (
        <Item>
          <p className="text-[15.5px] leading-relaxed text-secondary">{lede}</p>
        </Item>
      ) : null}
    </Stagger>
  );
}

/** A band of the page; `tinted` alternates the surface so long pages keep their rhythm. */
export function Band({ children, tinted = false, className }: { readonly children: ReactNode; readonly tinted?: boolean; readonly className?: string }): JSX.Element {
  return (
    <section className={`${tinted ? 'border-y border-line bg-panel' : ''} ${className ?? ''}`}>
      <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6">{children}</div>
    </section>
  );
}

function CtaBand(): JSX.Element {
  const s = useSite();
  const reduce = useReducedMotion();
  return (
    <section className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6">
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-solid to-brand-alt-solid p-8 shadow-lifted sm:p-12"
        initial={reduce ? false : { y: 24 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* White linework, empty on the text's side; mirrored in Arabic so the text keeps its clean half. */}
        <Art name="cta-pattern" alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover rtl:-scale-x-100" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 start-1/3 size-72 rounded-full bg-on-brand/10 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="grid max-w-2xl gap-3">
            <h2 className="text-[28px] leading-tight font-light text-on-brand sm:text-[34px]">{s.cta.title}</h2>
            <p className="text-[15px] leading-relaxed text-on-brand">{s.cta.body}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="primary" className="bg-on-brand text-brand-solid hover:bg-on-brand/90 active:bg-on-brand/80">
              <Link to="/studio?example=1">
                {s.cta.primary}
                <ArrowRight className="rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="border border-on-brand/40 text-on-brand hover:bg-on-brand/10 hover:text-on-brand">
              <Link to="/studio">{s.cta.secondary}</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
