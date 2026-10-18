import type { LucideIcon } from 'lucide-react';

import { cn } from '../lib/cn.js';

export type Tone = 'blue' | 'violet' | 'cyan';

const TONES: readonly Tone[] = ['blue', 'violet', 'cyan'];

/** The tone for the n-th item of a list, so a row of tiles reads as one family in three colours. */
export function toneAt(i: number): Tone {
  return TONES[i % TONES.length]!;
}

const SIZE = {
  xs: { box: 'size-6 rounded-md', icon: 'size-3.5' },
  sm: { box: 'size-9 rounded-lg', icon: 'size-4.5' },
  md: { box: 'size-11 rounded-xl', icon: 'size-5' },
  lg: { box: 'size-14 rounded-2xl', icon: 'size-6' },
} as const;

/**
 * An icon on a gradient tile in one of the brand's three tones. Decoration:
 * the heading beside it says what it means, so the glyph is hidden from
 * assistive technology. `float` drifts it a few pixels, transform only.
 */
export function IconTile({
  icon: Icon,
  tone = 'blue',
  size = 'md',
  float = false,
  className,
}: {
  readonly icon: LucideIcon;
  readonly tone?: Tone;
  readonly size?: keyof typeof SIZE;
  readonly float?: boolean;
  readonly className?: string;
}): JSX.Element {
  const s = SIZE[size];
  return (
    <span
      className={cn(
        'tile shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0',
        `tile-${tone}`,
        s.box,
        float && 'animate-float',
        className,
      )}
    >
      <Icon className={s.icon} aria-hidden="true" />
    </span>
  );
}
