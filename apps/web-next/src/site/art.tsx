import { SITE_AR } from '../i18n/site.ar.js';
import { SITE_EN } from '../i18n/site.en.js';
import { cn } from '../lib/cn.js';
import { useLocale } from '../lib/locale.js';

import cardExports from '../assets/img/card-exports.webp';
import cardFaq from '../assets/img/card-faq.webp';
import cardLimits from '../assets/img/card-limits.webp';
import cardMethod from '../assets/img/card-method.webp';
import cardParking from '../assets/img/card-parking.webp';
import cardProduct from '../assets/img/card-product.webp';
import ctaPattern from '../assets/img/cta-pattern.webp';
import enterPanel from '../assets/img/enter-panel.webp';
import exportsModel from '../assets/img/exports-model.webp';
import homeBackdrop from '../assets/img/home-backdrop.webp';
import methodChain from '../assets/img/method-chain.webp';
import notFound from '../assets/img/not-found.webp';
import parkingReach from '../assets/img/parking-reach.webp';
import sectionModel from '../assets/img/parking-section-model.webp';
import productFlow from '../assets/img/product-flow.webp';
import studiesEmpty from '../assets/img/studies-empty.webp';

/*
  THE ILLUSTRATIONS, AND WHAT THEY ARE ALLOWED TO BE.

  Line art drawn in mid-tones that read on both themes (measured against both
  page backgrounds when the briefs were written), on a transparent ground, so
  one file serves light and dark. None of them carries a number, a word or
  amber: a figure in a picture is a figure the engine did not produce, and
  amber is reserved for ASSUMED values.

  The three white models are photographs of nothing the engine computed, so
  wherever one stands near the engine's own drawings it says so beneath it.
  The hero, the 3D view and the parking plan are never pictures — they are the
  engine's model, drawn live.
*/

const ART = {
  'card-product': { src: cardProduct, w: 800, h: 500 },
  'card-parking': { src: cardParking, w: 800, h: 500 },
  'card-method': { src: cardMethod, w: 800, h: 500 },
  'card-exports': { src: cardExports, w: 800, h: 500 },
  'card-limits': { src: cardLimits, w: 800, h: 500 },
  'card-faq': { src: cardFaq, w: 800, h: 500 },
  'home-backdrop': { src: homeBackdrop, w: 1280, h: 853 },
  'cta-pattern': { src: ctaPattern, w: 1280, h: 853 },
  'product-flow': { src: productFlow, w: 1600, h: 560 },
  'parking-reach': { src: parkingReach, w: 900, h: 900 },
  'method-chain': { src: methodChain, w: 1200, h: 800 },
  'not-found': { src: notFound, w: 960, h: 640 },
  'studies-empty': { src: studiesEmpty, w: 960, h: 640 },
  'parking-section-model': { src: sectionModel, w: 1536, h: 1024 },
  'exports-model': { src: exportsModel, w: 1536, h: 1024 },
  'enter-panel': { src: enterPanel, w: 1024, h: 1536 },
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

/**
 * A white study model in a frame, with the sentence that says it is a picture.
 * The studio sweep is part of the image, so it reads as a photograph on either theme.
 */
export function Illustration({
  name,
  alt,
  className,
  eager = false,
}: {
  readonly name: Extract<ArtName, 'parking-section-model' | 'exports-model' | 'enter-panel'>;
  readonly alt: string;
  readonly className?: string;
  readonly eager?: boolean;
}): JSX.Element {
  const { locale } = useLocale();
  const s = locale === 'ar' ? SITE_AR : SITE_EN;
  return (
    <figure className={cn('grid gap-2', className)}>
      <div className="overflow-hidden rounded-xl border border-line shadow-soft">
        <Art name={name} alt={alt} eager={eager} className="w-full" />
      </div>
      <figcaption className="text-[12px] text-secondary">{s.art.illustration}</figcaption>
    </figure>
  );
}

/** The URL alone, for a CSS background. */
export function artUrl(name: ArtName): string {
  return ART[name].src;
}
