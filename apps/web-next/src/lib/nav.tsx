import { forwardRef, useCallback } from 'react';
import {
  Link as RouterLink,
  type LinkProps,
  Navigate as RouterNavigate,
  type NavigateOptions,
  type NavigateProps,
  useLocation,
  useNavigate,
} from 'react-router';

import { useLocale } from './locale.js';

/*
  The router's links, keeping the reader in their language. Every internal `to`
  in the app is written bare (`/studio`) and goes through here, which puts the
  `/ar` back on it when the page is Arabic. A string `to` only: the app has no
  object-shaped links, and supporting one silently would be a link that drops
  the language the first time somebody writes it.
*/

export const Link = forwardRef<HTMLAnchorElement, LinkProps & { readonly to: string }>(function Link({ to, ...rest }, ref) {
  const { href } = useLocale();
  return <RouterLink ref={ref} to={href(to)} {...rest} />;
});

/*
  Active by the BARE path. Inside the route tree `useLocation` is the stripped
  location (`App` matches on it), so the router's own NavLink would compare
  `/ar/studies` against `/studies` and never mark an Arabic link current.
*/
export const NavLink = forwardRef<
  HTMLAnchorElement,
  Omit<LinkProps, 'to' | 'className'> & { readonly to: string; readonly end?: boolean; readonly className?: string }
>(function NavLink({ to, end = false, ...rest }, ref) {
  const { href } = useLocale();
  const { pathname } = useLocation();
  const current = end ? pathname === to : pathname === to || pathname.startsWith(`${to.replace(/\/$/, '')}/`);
  return <RouterLink ref={ref} to={href(to)} aria-current={current ? 'page' : undefined} {...rest} />;
});

export function Navigate({ to, ...rest }: NavigateProps & { readonly to: string }): JSX.Element {
  const { href } = useLocale();
  return <RouterNavigate to={href(to)} {...rest} />;
}

export function useNav(): (to: string, options?: NavigateOptions) => void {
  const navigate = useNavigate();
  const { href } = useLocale();
  // Stable per language, so it is safe in an effect's dependencies.
  return useCallback((to: string, options?: NavigateOptions) => void navigate(href(to), options), [navigate, href]);
}
