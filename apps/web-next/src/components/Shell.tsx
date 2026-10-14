import { DropdownMenu } from 'radix-ui';
import { Languages, LogOut, Moon, ShieldOff, Sun, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn.js';
import { useIdentity } from '../lib/identity.js';
import { useLocale } from '../lib/locale.js';
import { Link, NavLink, useNav } from '../lib/nav.js';
import { useTheme } from '../lib/theme.js';
import { Button } from '../ui/button.js';
import { Tip } from '../ui/radix.js';

/** The mark: a plot with its setback taken off. The inner square is the brand blue — never amber. */
export function Logo({ className }: { readonly className?: string }): JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <defs>
          <linearGradient id="logo-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="var(--brand-alt)" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#logo-fill)" />
        <rect x="7" y="7" width="18" height="18" rx="1.5" fill="none" stroke="var(--on-brand)" strokeOpacity="0.9" strokeWidth="1.5" />
        <rect x="11.5" y="11.5" width="9" height="9" rx="1" fill="var(--on-brand)" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
        TOP<span className="text-accent">.ai</span>
      </span>
    </span>
  );
}

/*
  THE STAMP, ON EVERY SCREEN, IN THE CHROME.

  "Regulatory validity: not assessed" is permanent and appears in every output,
  so it is part of the frame rather than of any one page — a reader can never be
  on a screen of figures without it in view. Italic, and an icon, so it is not
  carried by colour.
*/
export function RegulatoryStamp({ className }: { readonly className?: string }): JSX.Element {
  const { t } = useLocale();
  return (
    <Tip content={t.stamp.long}>
      <p
        tabIndex={0}
        className={cn(
          'not-assessed inline-flex items-center gap-1.5 rounded-sm border border-line bg-raised px-2 py-1 text-[11.5px] whitespace-nowrap text-secondary',
          className,
        )}
      >
        <ShieldOff className="size-3.5 shrink-0" aria-hidden="true" />
        <span>{t.stamp.short}</span>
      </p>
    </Tip>
  );
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
          <span className="grid size-6 place-items-center rounded-full border border-strong bg-raised text-[11px] font-semibold text-fg">
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
  const nav = 'rounded-md px-2.5 py-1.5 text-[13px] font-medium text-secondary transition-colors hover:bg-hover hover:text-fg aria-[current=page]:bg-raised aria-[current=page]:text-fg';
  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-base/90 px-3 backdrop-blur sm:px-4">
      <Link to="/" className="me-2 rounded-md p-1" aria-label={t.shell.home}>
        <Logo />
      </Link>
      <span className="hidden rounded-sm border border-accent/40 bg-accent-subtle px-1.5 py-px text-[10.5px] font-semibold tracking-[0.06em] text-accent-strong uppercase md:inline">
        {t.shell.preview}
      </span>
      {actor ? (
        <nav aria-label={t.shell.nav} className="ms-2 hidden items-center gap-0.5 sm:flex">
          <NavLink to="/studies" className={nav}>
            {t.shell.studies}
          </NavLink>
          <NavLink to="/studio" end className={nav}>
            {t.shell.newStudy}
          </NavLink>
        </nav>
      ) : null}
      {children}
      <div className="ms-auto flex items-center gap-1.5">
        <RegulatoryStamp className="hidden lg:inline-flex" />
        <a href="/" className="hidden rounded-md px-2 py-1.5 text-[12.5px] text-secondary hover:bg-hover hover:text-fg md:inline">
          {t.shell.classic}
        </a>
        <LocaleSwitch />
        <ThemeToggle />
        <Account />
      </div>
    </header>
  );
}
