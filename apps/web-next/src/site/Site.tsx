import { ArrowRight, ArrowUp, Box, ChevronRight, FileStack, Layers, type LucideIcon, Mail, Menu, MessageCircleQuestion, SquareParking, Workflow } from 'lucide-react';
import { useMotionValueEvent, useReducedMotion, useScroll, motion } from 'motion/react';
import { lazy, type ReactNode, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router';

import { Account, BrandEdge, LocaleSwitch, Logo, NavMarker, ThemeToggle } from '../components/Shell.js';
import { cn } from '../lib/cn.js';
import { useLocale } from '../lib/locale.js';
import { Link, NavLink } from '../lib/nav.js';
import { SITE_AR } from '../i18n/site.ar.js';
import { SITE_EN, type SiteDict } from '../i18n/site.en.js';
import { Button } from '../ui/button.js';
import { arrive, EASE, Item, ScrollProgress, Stagger } from '../ui/motion.js';
import { IconTile, toneAt, type Tone } from '../ui/tile.js';
import { Art } from './art.js';
import { CONTACT, WhatsAppButton, WhatsAppGlyph, whatsappHref } from './contact.js';
import { type PagePath, usePageMeta } from './meta.js';

/*
  THE PUBLIC SITE'S FRAME.

  One header, one footer, one hero shape and one call to action, shared by every
  page outside the studio, so the site reads as one publication rather than a
  set of landing pages — and so a change of motion or colour made here reaches
  every page at once.

  The colour is the brand's three tones, blue, violet and cyan, and never green,
  amber or red: those three are provenance classes. The motion moves things and
  never hides them — a section not yet scrolled to is already at full opacity.
*/

export function useSite(): SiteDict {
  return useLocale().locale === 'ar' ? SITE_AR : SITE_EN;
}

// The phone menu's sheet arrives on the first tap, not with the home page.
const Drawer = lazy(() => import('../ui/drawer.js').then((m) => ({ default: m.Drawer })));

const NAV = [
  ['/product', 'product', Box],
  ['/parking', 'parking', SquareParking],
  ['/method', 'method', Workflow],
  ['/exports', 'exports', FileStack],
  ['/faq', 'faq', MessageCircleQuestion],
] as const;

function SiteHeader(): JSX.Element {
  const s = useSite();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  // Mounted from the first open on, so it can animate closed.
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 8));
  const { pathname } = useLocation();
  // A followed link closes the menu.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  const link =
    'group/nav relative rounded-md px-3 py-1.5 text-[13.5px] font-medium text-secondary transition-colors hover:bg-hover hover:text-fg aria-[current=page]:text-fg';
  return (
    <header className={cn('sticky top-0 z-30 border-b bg-base/80 backdrop-blur-md transition-[box-shadow,border-color] duration-300', scrolled ? 'border-line shadow-soft' : 'border-transparent')}>
      <BrandEdge className={cn('transition-opacity duration-300', scrolled ? 'opacity-100' : 'opacity-60')} />
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-2 px-4 sm:px-6">
        <Link to="/" className="me-3 rounded-md p-1 transition-transform duration-300 hover:-translate-y-px" aria-label={t.shell.home}>
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
          <Button asChild variant="brand" size="sm" className="hidden md:inline-flex">
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
              <Stagger onMount gap={0.05} className="grid gap-1">
                {NAV.map(([to, key, icon], i) => (
                  <Item key={to}>
                    <NavLink
                      to={to}
                      className="group flex items-center gap-3 rounded-lg px-2 py-2.5 text-[15px] font-medium text-fg transition-colors hover:bg-hover aria-[current=page]:bg-accent-subtle"
                    >
                      <IconTile icon={icon} tone={toneAt(i)} size="sm" />
                      <span className="flex-1">{s.nav[key]}</span>
                      <ChevronRight
                        className="size-4 text-tertiary transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                        aria-hidden="true"
                      />
                    </NavLink>
                  </Item>
                ))}
              </Stagger>
              <div className="mt-4 grid gap-2 border-t border-line pt-4">
                <Button asChild variant="brand" size="lg">
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
  const reduce = useReducedMotion();
  const cols: readonly { title: string; icon: LucideIcon; links: readonly (readonly [string, string])[] }[] = [
    {
      title: s.footer.product,
      icon: Box,
      links: [
        ['/product', s.footer.overview],
        ['/parking', s.footer.parking],
        ['/exports', s.footer.exports],
        ['/studio?example=1', s.footer.example],
      ],
    },
    {
      title: s.footer.trust,
      icon: Layers,
      links: [
        ['/method', s.footer.method],
        ['/limits', s.footer.limits],
        ['/faq', s.footer.faq],
      ],
    },
    {
      title: s.footer.studio,
      icon: Workflow,
      links: [
        ['/studio', s.footer.start],
        ['/studies', s.footer.studies],
        ['/enter', s.footer.enter],
      ],
    },
  ];
  const heading = 'flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-fg uppercase';
  return (
    <footer className="relative overflow-hidden border-t border-line bg-panel">
      <BrandEdge className="top-0 bottom-auto h-0.5" />
      {/* The engineering grid, faded out toward the text, and two slow lights. Decoration. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="canvas-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_100%_0%,black,transparent_60%)] rtl:[mask-image:radial-gradient(ellipse_at_0%_0%,black,transparent_60%)]" />
        <div className="aurora -end-24 -top-40 size-[380px] bg-brand-alt opacity-[calc(var(--glow-strength)*0.5)]" />
        <div className="aurora -bottom-48 start-1/4 size-[360px] bg-brand-glow opacity-[calc(var(--glow-strength)*0.4)] [animation-delay:-9s]" />
      </div>
      <Stagger className="relative mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]" gap={0.07}>
        <Item className="grid content-start gap-4">
          <Logo />
          <p className="max-w-sm text-[13.5px] leading-relaxed text-secondary">{s.footer.blurb}</p>
          <div className="flex gap-2">
            <a
              href={whatsappHref()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.footer.whatsapp}
              className="tile tile-violet size-9 rounded-lg transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105"
            >
              <WhatsAppGlyph className="size-4" />
            </a>
            <a
              href={`mailto:${CONTACT.email}`}
              aria-label={s.footer.email}
              className="tile tile-blue size-9 rounded-lg transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105"
            >
              <Mail className="size-4" aria-hidden="true" />
            </a>
          </div>
        </Item>
        {cols.map((c, i) => (
          <Item key={c.title}>
            <nav aria-label={c.title} className="grid content-start gap-3">
              <h2 className={heading}>
                <IconTile icon={c.icon} tone={toneAt(i)} size="xs" />
                {c.title}
              </h2>
              <ul className="grid gap-2">
                {c.links.map(([to, label]) => (
                  <li key={to}>
                    <Link to={to} className="group inline-flex items-center gap-1.5 text-[13.5px] text-secondary transition-colors hover:text-accent">
                      <span className="transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">{label}</span>
                      <ArrowRight className="size-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 rtl:-scale-x-100" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Item>
        ))}
        <Item className="grid content-start gap-3">
          <h2 className={heading}>
            <IconTile icon={Mail} tone="cyan" size="xs" />
            {s.footer.contact}
          </h2>
          <ul className="grid gap-2.5">
            <li>
              <a
                href={whatsappHref()}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 text-[13.5px] text-secondary transition-colors hover:text-fg"
              >
                <span className="tile tile-violet grid size-7 rounded-md transition-transform duration-200 group-hover:scale-110">
                  <WhatsAppGlyph className="size-3.5" />
                </span>
                <span className="grid">
                  <span className="text-[11px] text-tertiary">{s.footer.whatsapp}</span>
                  {/* A phone number reads left to right in either language. */}
                  <span dir="ltr" className="figure text-start">
                    {CONTACT.phone}
                  </span>
                </span>
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className="group inline-flex items-center gap-2.5 text-[13.5px] text-secondary transition-colors hover:text-fg">
                <span className="tile tile-blue grid size-7 rounded-md transition-transform duration-200 group-hover:scale-110">
                  <Mail className="size-3.5" aria-hidden="true" />
                </span>
                <span className="grid">
                  <span className="text-[11px] text-tertiary">{s.footer.email}</span>
                  <span dir="ltr" className="text-start">
                    {CONTACT.email}
                  </span>
                </span>
              </a>
            </li>
          </ul>
        </Item>
      </Stagger>
      <div className="relative border-t border-line">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-[12px] text-secondary sm:px-6">
          <span>{s.footer.rights(String(new Date().getFullYear()))}</span>
          <span className="flex flex-wrap items-center gap-4">
            <motion.button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })}
              className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-base px-3 py-1.5 text-[12px] font-medium text-fg transition-colors hover:border-accent hover:text-accent"
              whileHover={reduce ? {} : { y: -2 }}
            >
              <ArrowUp className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
              {s.footer.top}
            </motion.button>
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
      <WhatsAppButton />
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
  icon,
  tone = 'blue',
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede: string;
  /** The page's own name in the breadcrumb; omitted on the home page. */
  readonly crumb?: string;
  readonly aside?: ReactNode;
  /** The page's glyph, on a tile beside the eyebrow. */
  readonly icon?: LucideIcon;
  readonly tone?: Tone;
}): JSX.Element {
  const s = useSite();
  return (
    <section className="relative overflow-hidden border-b border-line">
      <Backdrop />
      <HeroLines />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="aurora -top-40 end-[10%] size-[460px] bg-accent" />
        <div className="aurora -top-20 end-[-6%] size-[340px] bg-brand-alt [animation-delay:-8s]" />
        <div className="aurora -bottom-40 start-[30%] size-[300px] bg-brand-glow opacity-[calc(var(--glow-strength)*0.6)] [animation-delay:-4s]" />
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
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/80 py-1 ps-1 pe-3 shadow-soft backdrop-blur">
              {icon ? <IconTile icon={icon} tone={tone} size="xs" className="rounded-full" /> : <span className="ms-2 size-1.5 rounded-full bg-accent" aria-hidden="true" />}
              <span className="figure text-[11.5px] tracking-[0.14em] text-accent uppercase">{eyebrow}</span>
            </span>
          </Item>
          <Item variants={arrive}>
            <h1 className="heading-display text-[36px] font-light tracking-[-0.03em] text-fg sm:text-[50px]">{title}</h1>
          </Item>
          <Item variants={arrive}>
            <p className="text-[16.5px] leading-relaxed text-secondary">{lede}</p>
          </Item>
        </Stagger>
        {aside ? (
          <motion.div className="relative" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}>
            {aside}
          </motion.div>
        ) : null}
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

/**
 * Two plot outlines drawn in the brand gradient as the hero arrives, then a
 * dash travelling along them. Decoration on the side away from the text; it
 * names no plot and states no figure.
 */
export function HeroLines(): JSX.Element {
  const reduce = useReducedMotion();
  const draw = (delay: number): object =>
    reduce ? {} : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 2.2, ease: EASE, delay } };
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute end-0 top-0 hidden h-full w-[55%] opacity-70 md:block rtl:-scale-x-100"
      viewBox="0 0 600 400"
      preserveAspectRatio="xMaxYMid slice"
      fill="none"
    >
      <defs>
        <linearGradient id="hero-lines" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="0.5" stopColor="var(--brand-alt)" />
          <stop offset="1" stopColor="var(--brand-glow)" />
        </linearGradient>
      </defs>
      <motion.path d="M330 60 L560 40 L590 250 L380 300 Z" stroke="url(#hero-lines)" strokeWidth="1.5" strokeOpacity="0.55" {...draw(0.3)} />
      <motion.path d="M370 100 L530 88 L552 228 L408 262 Z" stroke="url(#hero-lines)" strokeWidth="1" strokeDasharray="4 6" strokeOpacity="0.5" {...draw(0.7)} />
      <path className="dash-flow" d="M330 60 L560 40 L590 250 L380 300 Z" stroke="url(#hero-lines)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="28 900" />
      {[
        [330, 60],
        [560, 40],
        [590, 250],
        [380, 300],
      ].map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r="4"
          fill="var(--surface-panel)"
          stroke="url(#hero-lines)"
          strokeWidth="1.5"
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6 + i * 0.25, type: 'spring', stiffness: 300, damping: 18 }}
        />
      ))}
    </svg>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lede,
  className,
  icon,
  tone = 'blue',
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede?: string;
  readonly className?: string;
  /** A glyph for the section, on a tile in one of the brand's tones. */
  readonly icon?: LucideIcon;
  readonly tone?: Tone;
}): JSX.Element {
  const reduce = useReducedMotion();
  return (
    <Stagger className={`mb-10 grid max-w-2xl gap-3 ${className ?? ''}`}>
      <Item className="flex items-center gap-3">
        {icon ? (
          <span className="relative">
            {/* A ring that breathes out from the tile, once a few seconds. */}
            <span aria-hidden="true" className={cn('tile absolute inset-0 animate-pulse-soft rounded-lg', `tile-${tone}`)} />
            <IconTile icon={icon} tone={tone} size="sm" float className="relative" />
          </span>
        ) : null}
        <span className="grid gap-1.5">
          <p className="figure text-[11.5px] tracking-[0.14em] text-accent uppercase">{eyebrow}</p>
          {/* A short rule that draws itself in under the eyebrow. */}
          <motion.span
            aria-hidden="true"
            className="block h-0.5 w-12 origin-left rounded-full bg-linear-to-r from-accent via-brand-alt to-brand-glow rtl:origin-right"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
          />
        </span>
      </Item>
      <Item>
        <h2 className="heading-section text-[28px] font-light tracking-[-0.02em] text-fg sm:text-[36px]">{title}</h2>
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
export function Band({
  children,
  tinted = false,
  glow,
  className,
}: {
  readonly children: ReactNode;
  readonly tinted?: boolean;
  /** A slow light of one brand tone behind the band, on the side away from where the text starts. */
  readonly glow?: Tone;
  readonly className?: string;
}): JSX.Element {
  const light = glow === 'violet' ? 'bg-brand-alt' : glow === 'cyan' ? 'bg-brand-glow' : 'bg-accent';
  return (
    <section className={cn('relative overflow-hidden', tinted && 'band-tint border-y border-line', className)}>
      {/* A field of dots in the far corner of every band: texture, never under the text it would cross. */}
      <div aria-hidden="true" className="dot-field pointer-events-none absolute -end-10 -top-10 size-72" />
      {glow ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className={`aurora -end-32 top-1/4 size-[420px] opacity-[calc(var(--glow-strength)*0.55)] ${light}`} />
        </div>
      ) : null}
      <div className="relative mx-auto max-w-[1320px] px-4 py-20 sm:px-6">{children}</div>
    </section>
  );
}

function CtaBand(): JSX.Element {
  const s = useSite();
  const reduce = useReducedMotion();
  return (
    <section className="mx-auto max-w-[1320px] px-4 py-20 sm:px-6">
      <motion.div
        className="cta-shine relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-solid via-brand-alt-solid to-brand-glow-solid p-8 shadow-lifted sm:p-12"
        initial={reduce ? false : { y: 24, scale: 0.98 }}
        whileInView={{ y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        {/* White linework, empty on the text's side; mirrored in Arabic so the text keeps its clean half. */}
        <Art name="cta-pattern" alt="" className="pointer-events-none absolute inset-0 size-full max-w-none object-cover rtl:-scale-x-100" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 start-1/3 size-72 rounded-full bg-on-brand/10 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="grid max-w-2xl gap-3">
            {/* Three glass tiles drifting above the title. Decoration. */}
            <div aria-hidden="true" className="mb-2 flex gap-2.5">
              {[Box, Layers, FileStack].map((Icon, i) => (
                <span
                  key={i}
                  className="grid size-10 animate-float place-items-center rounded-xl border border-on-brand/30 bg-on-brand/15 text-on-brand backdrop-blur"
                  style={{ animationDelay: `${-i * 1.6}s` }}
                >
                  <Icon className="size-5" />
                </span>
              ))}
            </div>
            <h2 className="heading-section text-[28px] font-light text-on-brand sm:text-[34px]">{s.cta.title}</h2>
            <p className="text-[15px] leading-relaxed text-on-brand">{s.cta.body}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="primary" className="group bg-on-brand text-brand-solid hover:bg-on-brand/90 active:bg-on-brand/80">
              <Link to="/studio?example=1">
                {s.cta.primary}
                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true" />
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
