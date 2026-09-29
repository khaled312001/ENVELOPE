/**
 * The site's imagery, and what happens while there is none.
 *
 * ---------------------------------------------------------------------------
 * THE PROBLEM THIS SOLVES FIRST.
 *
 * `docs/06-plan/image-prompts.md` specifies twenty-five images. None of them
 * exist yet — they are commissioned, not drawn here — and the pages that will
 * carry them are being built now. The obvious arrangement is an `<img>` pointing
 * at `/img/auth-panel.png` and a shrug about the 404 until the file lands, and it
 * is wrong twice over: a missing image paints the browser's broken-file glyph on
 * a product whose whole proposition is that it does not show you things it cannot
 * support, and the request itself logs a console error, which `pnpm smoke` counts
 * as a failure on every route that carries one.
 *
 * So ABSENCE IS THE DEFAULT AND IT IS SILENT. The set of images that exist is read
 * from the filesystem by `import.meta.glob`, at build time, from
 * `src/assets/img/`. A name with no file emits no element and makes no request.
 * When a file is dropped into that directory it appears; nothing else changes, no
 * manifest is edited, and there is no list that can disagree with the directory.
 *
 * `public/` would have been the other choice and is wrong for everything except
 * the social card: files there are copied verbatim and never inspected, so a glob
 * cannot see them and absence goes back to being a 404. `og-cover.png` is the one
 * exception and stays in `public/`, because a `<meta property="og:image">` needs a
 * stable, unhashed URL that a scraper can fetch.
 *
 * ---------------------------------------------------------------------------
 * THE DARK VARIANT IS CHOSEN IN REACT, NOT IN CSS OR IN `<picture>`.
 *
 * `<picture>` can only switch on a media query, and this site's theme is
 * `data-theme` on `<html>` — a reader who chose dark on a machine set to light
 * would get the light image, and the one place that is most visible is a
 * full-bleed decorative panel. Rendering both and hiding one in CSS fetches both.
 *
 * So the theme is read in React. `Root` owns the only `useTheme()` there is and
 * publishes it through `PageTheme`, which this component reads; one request, the
 * correct file, no flash. The prop is kept and overrides the context, because two
 * call sites need it: a component rendering a preview of the OTHER theme, and a
 * test that renders one illustration with no provider around it.
 *
 * ---------------------------------------------------------------------------
 * ALT TEXT IS REQUIRED AND MAY BE EMPTY, which is not the same as optional.
 *
 * `alt` is a required prop with no default. An image with no `alt` attribute is
 * announced by its filename; an image with `alt=""` is skipped, which is correct
 * for the decorative ones and is what `image-prompts.md` specifies for #18, #8
 * and #22. Making the prop required forces the decision at the call site, which
 * is the only place that knows the answer.
 */

import { usePageTheme } from './page-theme.js';

/*
  EAGER, AND `?url` RATHER THAN AN IMPORT OF THE MODULE.

  Eager because the set has to be known synchronously — a lazy glob returns
  loaders, and deciding whether to render an element cannot be asynchronous. `?url`
  because these are files to point at, not modules to execute; Vite hashes them
  and returns the served path.
*/
const FILES = import.meta.glob('./assets/img/*.{svg,png,avif,webp,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Readonly<Record<string, string>>;

/** `./assets/img/auth-panel-dark.png` → `auth-panel-dark`. */
const BY_NAME: ReadonlyMap<string, string> = new Map(
  Object.entries(FILES).map(([path, url]) => [
    (path.split('/').pop() ?? '').replace(/\.[^.]+$/, ''),
    url,
  ]),
);

/**
 * The URL for an image, preferring the dark variant when the page is dark.
 *
 * Falls back to the light file rather than to nothing: `image-prompts.md` marks
 * only some images `dark: yes`, and an image with no dark variant is meant to be
 * used in both — its palette is already neutral. A missing light file returns
 * undefined, and the caller renders nothing.
 */
export function imageUrl(name: string, theme: 'light' | 'dark'): string | undefined {
  if (theme === 'dark') {
    const dark = BY_NAME.get(`${name}-dark`);
    if (dark) return dark;
  }
  return BY_NAME.get(name);
}

/** Whether an image exists, for a layout that changes shape without one. */
export function hasImage(name: string): boolean {
  return BY_NAME.has(name);
}

export function Illustration({
  name,
  alt,
  theme,
  className,
  width,
  height,
}: {
  /** The filename without its extension, as `image-prompts.md` names it. */
  readonly name: string;
  /** Required, and `''` for a decorative image. See the docblock. */
  readonly alt: string;
  /** Defaults to the page's theme. Pass one only to override it — see the docblock. */
  readonly theme?: 'light' | 'dark' | undefined;
  readonly className?: string | undefined;
  /** The intrinsic size from `image-prompts.md`, so the box does not reflow on load. */
  readonly width?: number | undefined;
  readonly height?: number | undefined;
}): JSX.Element | null {
  const page = usePageTheme();
  const src = imageUrl(name, theme ?? page);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      {...(width === undefined ? {} : { width })}
      {...(height === undefined ? {} : { height })}
      /*
        `alt=""` alone is enough for most assistive technology, and
        `aria-hidden` on top of it is belt and braces for the ones that announce a
        decorative image anyway. It is applied only when the alt IS empty: an
        `aria-hidden` image with real alt text is a described image nobody can
        reach.
      */
      {...(alt === '' ? { 'aria-hidden': true as const } : {})}
      /*
        Decoding off the main thread and loading lazily: every image in this
        product is either decorative or explanatory, and none of them is the thing
        a reader came for. `fetchpriority` is left alone — the browser's default
        for a lazy image is already low.
      */
      loading="lazy"
      decoding="async"
    />
  );
}
