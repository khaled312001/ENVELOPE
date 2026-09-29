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

import { useDict } from './i18n/locale.js';
import { AR as IMAGERY_AR } from './i18n/imagery.ar.js';
import { EN as IMAGERY_EN } from './i18n/imagery.en.js';
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

/**
 * THE TWENTY-FIVE, AS A CLOSED UNION.
 *
 * `docs/06-plan/image-prompts.md` is the commission: what will be drawn, at what
 * size, and what a screen reader says instead. This union is that list, and
 * `imagery.test.ts` holds it to the file - a name here that the brief does not
 * commission is a slot no file ever lands in, and the page would go on rendering
 * nothing with every gate green.
 *
 * It is closed on purpose. `Figure` takes an `ImageName`, so a call site cannot
 * name an image nobody briefed and nobody described.
 */
export type ImageName =
  | 'og-cover'
  | 'mark'
  | 'lp-capacities'
  | 'lp-parking'
  | 'lp-guarantees'
  | 'lp-claims'
  | 'lp-limits'
  | 'lp-hero-backdrop'
  | 'step-0-sheet'
  | 'step-1-plot'
  | 'step-3-rules'
  | 'step-4-assumptions'
  | 'step-5-capacity'
  | 'step-6-parking'
  | 'step-7-checks'
  | 'step-8-evidence'
  | 'step-9-export'
  | 'auth-panel'
  | 'empty-projects'
  | 'empty-members'
  | 'empty-shared'
  | 'dashboard-backdrop'
  | 'state-not-here'
  | 'state-refused'
  | 'guide-cover';

/**
 * The size each file is drawn at, so the box does not reflow when it loads.
 *
 * From the brief, and checked against it. These are the INTRINSIC dimensions,
 * not a layout: the stylesheet decides how much room a figure gets, and these
 * two numbers only tell the browser the ratio to hold while it waits.
 */
export const IMAGE_SIZE: Readonly<Record<ImageName, readonly [number, number]>> = {
  'og-cover': [1200, 630],
  'mark': [64, 64],
  'lp-capacities': [640, 480],
  'lp-parking': [640, 480],
  'lp-guarantees': [640, 480],
  'lp-claims': [640, 480],
  'lp-limits': [640, 480],
  'lp-hero-backdrop': [1920, 900],
  'step-0-sheet': [480, 320],
  'step-1-plot': [480, 320],
  'step-3-rules': [480, 320],
  'step-4-assumptions': [480, 320],
  'step-5-capacity': [480, 320],
  'step-6-parking': [480, 320],
  'step-7-checks': [480, 320],
  'step-8-evidence': [480, 320],
  'step-9-export': [480, 320],
  'auth-panel': [960, 1200],
  'empty-projects': [400, 280],
  'empty-members': [400, 280],
  'empty-shared': [400, 280],
  'dashboard-backdrop': [1600, 400],
  'state-not-here': [480, 320],
  'state-refused': [480, 320],
  'guide-cover': [2480, 3508],
};

/**
 * A commissioned image, with the description the brief wrote for it.
 *
 * This is the call site for every one of the twenty-five that a page renders.
 * `Illustration` is the lower layer and still takes an explicit `alt`, for the
 * two cases this cannot serve: an image outside the commission, and a test.
 *
 * Nothing here is conditional on the file existing, and nothing needs to be.
 * `Illustration` returns `null` when it does not - no element, no request. Use
 * `hasImage` beside this only where the LAYOUT changes shape, which is a
 * different question from whether to render.
 */
export function Figure({
  name,
  className,
}: {
  readonly name: ImageName;
  readonly className?: string | undefined;
}): JSX.Element | null {
  const alt = useDict(IMAGERY_EN, IMAGERY_AR);
  const [width, height] = IMAGE_SIZE[name];
  return (
    <Illustration
      name={name}
      alt={alt[name]}
      width={width}
      height={height}
      {...(className === undefined ? {} : { className })}
    />
  );
}
