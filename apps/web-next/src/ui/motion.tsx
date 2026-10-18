import { motion, type MotionProps, useReducedMotion, useScroll, useSpring, type Variants } from 'motion/react';
import { type HTMLAttributes, type PointerEvent, type ReactNode, useCallback } from 'react';

import { cn } from '../lib/cn.js';

/*
  THE MOTION VOCABULARY — four moves, used everywhere, so the product moves like
  one thing rather than like a collection of effects.

  1. Rise: content arrives 16px low and settles, on a long ease-out.
  2. Stagger: a list arrives one item after another, 50ms apart.
  3. Draw: a line is drawn along its length (the plot, the connectors).
  4. Follow: a light tracks the pointer across a card.

  Every one respects `prefers-reduced-motion` — through MotionConfig at the root
  and the CSS guard in styles.css — and NONE of them animates a figure's value.
  A number counting up from zero shows, for half a second, numbers the engine
  never produced; a figure arrives whole or not at all.

  Scroll reveals move content and never hide it: anything not yet in view is
  already at full opacity, offset only, so a full-page screenshot and a printout
  carry every section.
*/

export const EASE = [0.22, 1, 0.36, 1] as const;

export const rise: Variants = {
  hidden: { y: 16 },
  shown: { y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** Arrival on mount — the page's first frame, where a fade is safe because nothing is off-screen. */
export const arrive: Variants = {
  hidden: { y: 18, opacity: 0, filter: 'blur(6px)' },
  shown: { y: 0, opacity: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease: EASE } },
};

export function Stagger({
  children,
  className,
  gap = 0.05,
  onMount = false,
  as = 'div',
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly gap?: number;
  /** Animate when mounted rather than when scrolled into view. */
  readonly onMount?: boolean;
  readonly as?: 'div' | 'ul' | 'ol' | 'dl';
}): JSX.Element {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  const trigger: MotionProps = onMount ? { animate: 'shown' } : { whileInView: 'shown', viewport: { once: true, margin: '-60px' } };
  return (
    <Comp
      className={className}
      initial={reduce ? false : 'hidden'}
      {...trigger}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </Comp>
  );
}

export function Item({
  children,
  className,
  as = 'div',
  variants = rise,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly as?: 'div' | 'li' | 'article' | 'section';
  readonly variants?: Variants;
}): JSX.Element {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={variants}>
      {children}
    </Comp>
  );
}

/** The pointer handler behind `.spotlight`, for an element that is not a plain div (a card that is a link). */
export function followPointer(e: PointerEvent<HTMLElement>): void {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

/** A card the light follows. The tint is drawn behind the content, never over it. */
export function Spotlight({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  const move = useCallback((e: PointerEvent<HTMLDivElement>) => followPointer(e), []);
  return (
    <div className={cn('spotlight', className)} onPointerMove={move} {...rest}>
      {children}
    </div>
  );
}

/** A thin bar across the top of a long page: how far down it the reader is. */
export function ScrollProgress(): JSX.Element {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-linear-to-r from-accent via-brand-alt to-brand-glow rtl:origin-right"
      style={{ scaleX }}
    />
  );
}
