import { cn } from '../lib/cn.js';

import notFound from '../assets/img/not-found.webp';
import parkingReach from '../assets/img/parking-reach.webp';
import studiesEmpty from '../assets/img/studies-empty.webp';

/*
  THE ILLUSTRATIONS, AND WHAT THEY ARE ALLOWED TO BE.

  Three are left, each a line drawing of something this product actually
  handles: a parking module and the way a car reaches its bays, plot outlines on
  sheets, an empty title block. Line art in mid-tones on a transparent ground,
  so one file serves both themes; none carries a number, a word or amber.

  The rest went on 18 Oct 2026 (the owner's call, «شيل بصمه كلود والذكاء
  الاصطناعي من تصميم الموقع»). The white study models were renders of a building
  nobody computed, and the card drawings — file stacks, dot fields, a tree with
  a gradient square — were the stock pictures of a generated page. The pictures
  this product has a right to show are its own: the building and the drawings the
  engine draws from a real run, which the front page and the studio show live.
*/

const ART = {
  'parking-reach': { src: parkingReach, w: 900, h: 900 },
  'not-found': { src: notFound, w: 960, h: 640 },
  'studies-empty': { src: studiesEmpty, w: 960, h: 640 },
} as const;

export type ArtName = keyof typeof ART;

/**
 * One illustration. `alt` is required and empty means decoration — a caller
 * has to decide which, rather than inherit a description nobody wrote.
 * Width and height are always set, so the page does not move when it loads.
 */
export function Art({
  name,
  alt,
  className,
  eager = false,
}: {
  readonly name: ArtName;
  readonly alt: string;
  readonly className?: string;
  readonly eager?: boolean;
}): JSX.Element {
  const a = ART[name];
  return (
    <img
      src={a.src}
      width={a.w}
      height={a.h}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn('block h-auto max-w-full select-none', className)}
    />
  );
}
