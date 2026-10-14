import { DropdownMenu } from 'radix-ui';
import { FolderOpen, Languages, LogOut, Moon, Plus, Sun, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

import logoDark from '../assets/img/logo-dark.webp';
import logoLight from '../assets/img/logo-light.webp';
import { cn } from '../lib/cn.js';
import { useIdentity } from '../lib/identity.js';
import { useLocale } from '../lib/locale.js';
import { Link, NavLink, useNav } from '../lib/nav.js';
import { useTheme } from '../lib/theme.js';
import { Button } from '../ui/button.js';
import { Tip } from '../ui/radix.js';

/**
 * The delivered logo, as delivered: the wordmark's letterforms are the brand's
 * and a font of ours would only approximate them. Lifted off its white ground
 * into two files, because the grey ink that reads on the light page vanishes
 * on the dark one; the blue-violet plate is the same in both — never amber.
 * The theme is an attribute, not a media query, so the swap is a class.
 */
export function Logo({ className }: { readonly className?: string }): JSX.Element {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <img src={logoLight} width={545} height={96} alt="Plotlogic.dev" className="h-7 w-auto dark:hidden" />
      <img src={logoDark} width={545} height={96} alt="Plotlogic.dev" className="hidden h-7 w-auto dark:block" />
    </span>
  );
}

/*
  NO STAMP IN THE CHROME — the owner's call of 14 Oct 2026. The chip that sat in
  every header, hero and footer is gone from the frame. What it said is still
  said where a figure is handed over: the five-way claim statement on the home
  page and in the study's checks, and every exported file, which the engine
  stamps and these screens do not touch.
*/

/** A thin brand gradient along the bottom edge of a bar, drifting slowly. Decoration. */
export function BrandEdge({ className }: { readonly className?: string }): JSX.Element {
  return <span aria-hidden="true" className={cn('brand-edge pointer-events-none absolute inset-x-0 bottom-0 h-px', className)} />;
}

export function ThemeToggle(): JSX.Element {
  const { theme, toggle } = useTheme();
  const { t } = useLocale();
  const dark = theme === 'dark';
  return (
    <Tip content={dark ? t.shell.toLight : t.shell.toDark}>
      <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? t.shell.toLight : t.shell.toDark} aria-pressed={dark} className="overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            className="grid place-items-center"
            initial={{ y: 14, rotate: -90, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -14, rotate: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
          >
            {dark ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
          </motion.span>
        </AnimatePresence>
      </Button>
    </Tip>
  );
}

export function LocaleSwitch(): JSX.Element {
  const { locale, setLocale, t } = useLocale();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
      lang={locale === 'ar' ? 'en' : 'ar'}
      aria-label={t.shell.switchLanguage}
    >
      <Languages aria-hidden="true" />
      {locale === 'ar' ? 'English' : 'العربية'}
    </Button>
  );
}

export function Account(): JSX.Element {
  const { actor, signOut, session } = useIdentity();
  const { t } = useLocale();
  const navigate = useNav();
  if (!actor) {
    return (
      <Button asChild variant="primary" size="sm">
        <Link to="/enter">{t.shell.enter}</Link>
      </Button>
    );
  }
  const guest = actor.id.startsWith('guest-');
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="sm" aria-label={t.shell.accountMenu(actor.name)}>
          <span className="tile tile-violet size-6 rounded-full text-[11px] font-semibold">
            {actor.name.trim().slice(0, 1).toUpperCase() || <UserRound aria-hidden="true" />}
          </span>
          <span className="hidden max-w-[10rem] truncate sm:inline">{actor.name}</span>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-56 rounded-md border border-line bg-raised p-1 text-[13px] text-fg shadow-2xl"
        >
          <div className="px-2.5 py-2">
            <p className="font-medium">{actor.name}</p>
            <p className="text-[12px] text-secondary">{guest ? t.shell.guest : session === 'signed-in' ? t.shell.signedIn : t.shell.named}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item
            onSelect={() => {
              void signOut().then(() => navigate('/'));
            }}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-secondary outline-none data-[highlighted]:bg-hover data-[highlighted]:text-fg"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {t.shell.signOut}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function TopBar({ children }: { readonly children?: ReactNode }): JSX.Element {
  const { t } = useLocale();
  const { actor } = useIdentity();
  const nav =
    'group/nav relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-secondary transition-colors hover:bg-hover hover:text-fg aria-[current=page]:text-fg';
  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-base/90 px-3 backdrop-blur sm:px-4">
      <BrandEdge />
      <Link to="/" className="me-2 rounded-md p-1 transition-transform duration-300 hover:-translate-y-px" aria-label={t.shell.home}>
        <Logo />
      </Link>
      {actor ? (
        <nav aria-label={t.shell.nav} className="ms-2 hidden items-center gap-0.5 sm:flex">
          <NavLink to="/studies" className={nav}>
            <FolderOpen className="size-3.5 text-accent" aria-hidden="true" />
            {t.shell.studies}
            <NavMarker />
          </NavLink>
          <NavLink to="/studio" end className={nav}>
            <Plus className="size-3.5 text-brand-alt" aria-hidden="true" />
            {t.shell.newStudy}
            <NavMarker />
          </NavLink>
        </nav>
      ) : null}
      {children}
      <div className="ms-auto flex items-center gap-1.5">
        {/* The previous studio, still served whole at /app for whatever this one does not do yet. */}
        <a href="/app" className="hidden rounded-md px-2 py-1.5 text-[12.5px] text-secondary hover:bg-hover hover:text-fg md:inline">
          {t.shell.classic}
        </a>
        <LocaleSwitch />
        <ThemeToggle />
        <Account />
      </div>
    </header>
  );
}

/**
 * The underline under the current page's link, in the brand gradient. Drawn by
 * CSS from `aria-current` on the parent link, so it needs no state of its own.
 */
export function NavMarker(): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-2.5 -bottom-px h-0.5 origin-center scale-x-0 rounded-full bg-linear-to-r from-accent via-brand-alt to-brand-glow transition-transform duration-300 ease-out group-hover/nav:scale-x-50 group-aria-[current=page]/nav:scale-x-100"
    />
  );
}
